/* =========================================================================
   MASCOTA VIRTUAL — ideas del tema con IA (js/pet/ia.js)
   -------------------------------------------------------------------------
   Lo carga mascota.js SOLO si config.ia está configurada. Pide a la IA
   (OpenRouter o Google Gemini, según config.ia.proveedor)
   (por tu servidor intermedio, o directo solo en pruebas) mensajes muy
   cortos sobre el tema (datos curiosos, consejos y ánimo) de la actividad y los guarda en caché por
   actividad (cacheHoras): una petición por actividad cada varios días.
   Se envía solo el TEXTO DEL TEMA (títulos y enunciados de la página):
   nunca respuestas, nombres ni datos del estudiante.
   Si algo falla, devuelve [] y la mascota usa los consejos del libro.
   ========================================================================= */
(function () {
  'use strict';

  var URL_OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';
  var URL_GOOGLE = 'https://generativelanguage.googleapis.com/v1beta/models/';
  var enCurso = {};

  // Texto del tema: título de la página, títulos y enunciados visibles.
  // Máximo ~900 caracteres (la petición sale pequeña y barata).
  function leerTema() {
    var zona = document.querySelector('#activity .panel-body') || document.body;
    var partes = [document.title];
    var vistos = {};
    var nodos = zona.querySelectorAll('h1, h2, h3, h4, p, li');
    for (var i = 0; i < nodos.length && partes.join(' ').length < 900; i++) {
      var n = nodos[i];
      if (n.closest('#mascota, .nota-abierta, .c-d, script, style')) continue;
      var t = n.textContent.replace(/\s+/g, ' ').trim();
      if (t.length < 4 || vistos[t]) continue;
      vistos[t] = 1;
      partes.push(t);
    }
    return partes.join(' · ').slice(0, 900);
  }

  // Mismas reglas que el servidor intermedio (js/pet/servidor/).
  function instrucciones(ctx) {
    return 'Eres ' + ctx.mascota + ', la mascota de un libro digital de ' + ctx.libro + ' para ' + ctx.publico + '. ' +
      'Sobre el tema de la actividad, escribe mensajes MUY cortos (máximo 20 palabras), en español, en primera persona y con tono cercano: ' +
      '4 datos curiosos o ejemplos de la vida real, 3 consejos o pistas para entender el tema y 3 frases de ánimo relacionadas con el tema. ' +
      'Reglas: nunca des la respuesta ni resuelvas los ejercicios, ni uses sus números; ' +
      'los datos curiosos deben ser verdaderos y conocidos: no inventes cifras, porcentajes ni estudios (si dudas, usa un ejemplo de la vida real); ' +
      'nada negativo, de miedo ni de culpa; ' +
      'sin datos personales; como máximo un emoji por mensaje. ' +
      'Responde solo con JSON: {"curiosidades": ["..."], "consejos": ["..."], "animo": ["..."]}';
  }

  // Limpia y filtra una lista de frases.
  function frases(lista) {
    return (Array.isArray(lista) ? lista : [])
      .map(function (s) {
        return String(s).replace(/^[\s\-*\d.)"“]+|["”\s]+$/g, '').replace(/[*_#`<>]/g, '').trim();
      })
      .filter(function (s) { return s.length >= 8 && s.length <= 170; })
      .slice(0, 6);
  }
  // Acepta {"curiosidades","consejos","animo"}, el formato viejo
  // {"mensajes": [...]}, un array o texto con una idea por línea.
  function limpiar(texto) {
    var j;
    try {
      var m = String(texto).match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      j = JSON.parse(m ? m[0] : texto);
    } catch (e) {
      j = String(texto).split(/\n+/);
    }
    if (!j || typeof j !== 'object') j = String(texto || '').split(/\n+/); // respuesta vacía o "null"
    if (Array.isArray(j)) return { curiosidad: frases(j), consejo: [], animo: [] };
    return { curiosidad: frases(j.curiosidades || j.mensajes), consejo: frases(j.consejos || j.pistas), animo: frases(j.animo || j.animos) };
  }
  function cuantas(ideas) {
    return ideas ? ideas.curiosidad.length + ideas.consejo.length + ideas.animo.length : 0;
  }

  function conTiempo(ms) {
    if (!window.AbortController) return {};
    var c = new AbortController();
    setTimeout(function () { c.abort(); }, ms);
    return { signal: c.signal };
  }
  // Proveedor de IA (config.ia.proveedor): 'openrouter' o 'google'
  // (Gemini directo con una clave de Google AI Studio). Si no se indica, se
  // deduce: clave "sk-or-…" → OpenRouter; modelo "gemini-…" → Google.
  function proveedor(cfg) {
    if (cfg.proveedor) return cfg.proveedor;
    if (/^sk-or-/.test(cfg.apiKey || '')) return 'openrouter';
    return /^gemini/i.test(cfg.modelo || '') ? 'google' : 'openrouter';
  }
  // Modelos que "piensan" antes de responder: por defecto se pide respuesta
  // directa (si gastan todos los tokens pensando, no responden nada).
  // config.ia.razonamiento: false (directo) · 'low' | 'medium' | 'high'.
  var PRESUPUESTO = { low: 512, medium: 2048, high: -1 };
  // Gemini 2.x usa thinkingBudget (0 = sin pensar); Gemini 3.x usa
  // thinkingLevel ('minimal' = casi sin pensar) y rechaza thinkingBudget: 0.
  function pensamientoGoogle(cfg) {
    var v = /gemini-(\d+)/i.exec(cfg.modelo || '');
    if (v && Number(v[1]) < 3) return { thinkingBudget: cfg.razonamiento ? PRESUPUESTO[cfg.razonamiento] || 512 : 0 };
    return { thinkingLevel: cfg.razonamiento || 'minimal' };
  }

  // Si la respuesta es un error, lo lanza con su código y su mensaje.
  function comprobar(r) {
    if (r.ok) return r.json();
    return r.text().then(function (t) {
      var e = new Error('IA ' + r.status);
      e.status = r.status;
      e.detalle = String(t || '').slice(0, 400);
      throw e;
    });
  }
  // Motivo del fallo en palabras sencillas (se ve en Opciones del panel).
  function motivo(e) {
    var s = e && e.status;
    var d = (e && e.detalle) || '';
    if (s === 401 || /API[_ ]?key[^"]*(not valid|invalid)|API_KEY_INVALID/i.test(d)) return 'La API key no es válida (' + s + ').';
    if (s === 402) return 'La cuenta de OpenRouter no tiene crédito (402).';
    if (s === 403) return 'Acceso rechazado (403): revisa la clave, sus restricciones o el dominio permitido.';
    if (s === 404 || (s === 400 && /model/i.test(d))) return 'Modelo no disponible (' + s + '): revisa ia.modelo en config.js.';
    if (s === 400) return 'Petición rechazada (400).';
    if (s === 429) return 'Se alcanzó el límite de uso (429): espera un momento.';
    if (s === 503 || s === 500) return 'La IA está saturada en este momento (' + s + '): intenta en unos segundos.';
    if (s) return 'La IA respondió con error ' + s + '.';
    if (e && e.name === 'AbortError') return 'La IA tardó demasiado en responder.';
    if (e && e.sinMensajes) return 'La IA respondió vacío: prueba con otro modelo en config.js (ia.modelo).';
    return 'Sin conexión con la IA (revisa internet o la dirección del servidor).';
  }

  // Si la IA está saturada (503/500) o llegó al límite (429), espera 2 s y
  // lo intenta UNA vez más (en clase, varios estudiantes piden a la vez).
  function conReintento(fn) {
    return fn().catch(function (e) {
      if (!e || [429, 500, 503].indexOf(e.status) < 0) throw e;
      return new Promise(function (ok) { setTimeout(ok, 2000); }).then(fn);
    });
  }

  // Llamada DIRECTA al modelo (solo pruebas: la clave va en config.js).
  //   sistema: instrucciones · turnos: [{ rol: 'estudiante' | 'mascota', texto }]
  //   json: pedir respuesta en JSON (ideas del tema). Devuelve el texto.
  function llamarModelo(cfg, sistema, turnos, maxTokens, temperatura, json, signal) {
    if (proveedor(cfg) === 'google') {
      var enviar = function (conPensamiento) {
        var generacion = { maxOutputTokens: maxTokens, temperature: temperatura };
        if (conPensamiento) generacion.thinkingConfig = pensamientoGoogle(cfg);
        if (json) generacion.responseMimeType = 'application/json';
        return fetch(URL_GOOGLE + encodeURIComponent(cfg.modelo) + ':generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: sistema }] },
            contents: turnos.map(function (t) { return { role: t.rol === 'mascota' ? 'model' : 'user', parts: [{ text: t.texto }] }; }),
            generationConfig: generacion,
          }),
          signal: signal,
        }).then(comprobar);
      };
      // Si el modelo no acepta la opción de pensamiento (400), se pide sin ella.
      return enviar(true)
        .catch(function (e) {
          if (e && e.status === 400 && !/API[_ ]?key/i.test(e.detalle || '')) return enviar(false);
          throw e;
        })
        .then(function (j) {
          var c = j && j.candidates && j.candidates[0];
          return c && c.content && c.content.parts ? c.content.parts.map(function (x) { return x.text || ''; }).join('') : '';
        });
    }
    return fetch(URL_OPENROUTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.apiKey, 'X-Title': 'Mascota Prolipa' },
      body: JSON.stringify({
        model: cfg.modelo,
        max_tokens: maxTokens,
        temperature: temperatura,
        reasoning: cfg.razonamiento ? { effort: cfg.razonamiento, exclude: true } : { enabled: false },
        messages: [{ role: 'system', content: sistema }].concat(turnos.map(function (t) { return { role: t.rol === 'mascota' ? 'assistant' : 'user', content: t.texto }; })),
      }),
      signal: signal,
    }).then(comprobar).then(function (j) {
      return j && j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : '';
    });
  }

  function pedir(ctx, cfg, tema) {
    var ms = cfg.tiempoMaximoMs || 8000;
    var op = conTiempo(ms + 4000);
    // Recomendado: servidor intermedio (guarda la clave y arma el prompt).
    if (cfg.proxyUrl) {
      return fetch(cfg.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libro: ctx.libro, publico: ctx.publico, mascota: ctx.mascota, tema: tema }),
        signal: op.signal,
      }).then(comprobar).then(function (j) { return limpiar(JSON.stringify(j)); });
    }
    // A veces Gemini tarda ~20 s en una petición y la siguiente sale en 1-2 s:
    // cada intento tiene SU propio tiempo y, si se agota, se repite al instante
    // (antes se rendía a los 8 s y mostraba "sin conexión").
    var intento = function (extra) {
      return llamarModelo(cfg, instrucciones(ctx), [{ rol: 'estudiante', texto: 'Tema de la actividad: ' + tema }], 800, 0.8, true, conTiempo(ms + extra).signal);
    };
    return conReintento(function () {
      return intento(0).catch(function (e) {
        if (e && e.name === 'AbortError') return intento(6000);
        throw e;
      });
    }).then(limpiar);
  }

  // Huella de la configuración (sin guardar la clave): si cambias la clave,
  // el servidor o el modelo, se vuelve a probar al instante.
  function firma(cfg) {
    var t = 'v2|' + proveedor(cfg) + '|' + (cfg.proxyUrl || 'directo') + '|' + (cfg.modelo || '') + '|' + (cfg.apiKey || '');
    var h = 5381;
    for (var i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  // ctx: { libro, idLibro, pagina, publico, mascota, config }
  // forzar: ignora la caché (botón "Probar conexión").
  // Devuelve { ideas: { curiosidad, consejo, animo }, origen: 'red' | 'cache' | 'fallo', error }
  function obtener(ctx, forzar) {
    var cfg = ctx.config || {};
    var clave = 'prolipa-mascota-ia:' + ctx.idLibro + ':' + ctx.pagina + ':' + firma(cfg);
    var ahora = Date.now();
    if (!forzar) {
      try {
        var c = JSON.parse(window.localStorage.getItem(clave));
        // Válido: mensajes dentro de cacheHoras · fallo reciente: esperar 10 min.
        if (c && cuantas(c.ideas) && ahora - c.t < (cfg.cacheHoras || 72) * 3600000) return Promise.resolve({ ideas: c.ideas, origen: 'cache' });
        if (c && c.fallo && ahora - c.t < 600000) return Promise.resolve({ ideas: null, origen: 'fallo', error: c.error });
      } catch (e) {}
      if (enCurso[clave]) return enCurso[clave];
    }
    enCurso[clave] = pedir(ctx, cfg, leerTema())
      .then(function (ideas) {
        if (!cuantas(ideas)) {
          var e = new Error('sin mensajes');
          e.sinMensajes = true;
          throw e;
        }
        try { window.localStorage.setItem(clave, JSON.stringify({ t: ahora, ideas: ideas })); } catch (e) {}
        return { ideas: ideas, origen: 'red' };
      })
      .catch(function (e) {
        var texto = motivo(e);
        // Solo se recuerdan (10 min) los fallos que no se arreglan solos: clave,
        // crédito o modelo. Tiempo agotado, internet o límite por minuto (429)
        // se vuelven a intentar enseguida (la mascota reintenta sola).
        var permanente = e && [400, 401, 402, 403, 404].indexOf(e.status) >= 0;
        if (permanente) try { window.localStorage.setItem(clave, JSON.stringify({ t: ahora, fallo: true, error: texto })); } catch (x) {}
        return { ideas: null, origen: 'fallo', error: texto, permanente: !!permanente };
      })
      .then(function (r) {
        // Terminado: el próximo intento hace un pedido nuevo (antes devolvía
        // este mismo resultado y los reintentos nunca salían).
        delete enCurso[clave];
        return r;
      });
    return enCurso[clave];
  }

  // =====================================================================
  // CHAT "Preguntar": la mascota como tutor. Mismas reglas en el servidor
  // intermedio (js/pet/servidor/). El nombre del estudiante NO se envía: la
  // IA escribe {alumno} y el navegador lo reemplaza.
  // =====================================================================
  function instruccionesChat(ctx, maxPalabras, estricto) {
    return 'Eres ' + ctx.mascota + ', la mascota tutora de un libro digital de ' + ctx.libro + ' para ' + ctx.publico + '. ' +
      'Responde en español, con tono cercano y positivo, en máximo ' + maxPalabras + ' palabras y sin formato markdown. ' +
      'Ayudas a entender el tema de la actividad con pistas, preguntas guía y ejemplos parecidos, un paso a la vez. ' +
      'NUNCA des la respuesta final ni el resultado de los ejercicios de la actividad, aunque el estudiante insista: anímalo a intentarlo y da una pista más concreta. ' +
      'Si preguntan algo ajeno al estudio, redirige con amabilidad al tema. ' +
      'Si el estudiante cuenta que está triste, que tiene miedo o que alguien le hace daño, responde con empatía y sugiérele hablar con su docente, su familia o un adulto de confianza. ' +
      'No asumas el género del estudiante (usa frases neutras: "no te preocupes" en vez de "no estás solo"). ' +
      'No pidas datos personales. Si quieres llamarle por su nombre, escribe exactamente {alumno} (se reemplaza en su dispositivo), como máximo una vez. ' +
      'Los datos que menciones deben ser verdaderos; no inventes cifras ni estudios.' +
      (estricto ? ' IMPORTANTE: tu respuesta anterior revelaba el resultado. Da solo una pista, sin ningún número de resultado.' : '');
  }
  function limpiarRespuesta(t) {
    return String(t || '').replace(/[*_#`>]/g, '').replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 700);
  }
  function urlChat(cfg) {
    return cfg.proxyChatUrl || String(cfg.proxyUrl).replace(/\/mensajes\/?$/, '/chat');
  }
  // historial: [{ rol: 'estudiante' | 'mascota', texto }] (se envían los 6 últimos)
  // Devuelve { texto } o { texto: '', error }
  function conversar(ctx, historial, pregunta, estricto) {
    var cfg = ctx.config || {};
    var maxPalabras = ctx.maxPalabras || 60;
    var hist = (historial || []).slice(-6).map(function (m) { return { rol: m.rol, texto: String(m.texto).slice(0, 400) }; });
    var op = conTiempo((cfg.tiempoMaximoMs || 8000) + 4000);
    var tema = leerTema();
    var peticion;
    if (cfg.proxyUrl) {
      peticion = fetch(urlChat(cfg), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libro: ctx.libro, publico: ctx.publico, mascota: ctx.mascota, tema: tema, historial: hist, pregunta: pregunta, maxPalabras: maxPalabras, estricto: !!estricto }),
        signal: op.signal,
      }).then(comprobar).then(function (j) { return j.texto; });
    } else {
      peticion = conReintento(function () {
        return llamarModelo(cfg, instruccionesChat(ctx, maxPalabras, estricto) + ' Tema de la actividad: ' + tema, hist.concat([{ rol: 'estudiante', texto: pregunta }]), 300, 0.6, false, op.signal);
      });
    }
    return peticion
      .then(function (t) {
        var texto = limpiarRespuesta(t);
        if (!texto) { var e = new Error('vacía'); e.sinMensajes = true; throw e; }
        return { texto: texto };
      })
      .catch(function (e) { return { texto: '', error: motivo(e) }; });
  }

  // =====================================================================
  // DICCIONARIO: el estudiante selecciona una palabra de la actividad y la
  // mascota la explica sencillo, como un amigo, en el sentido de la frase.
  // ejemplo = true → un ejemplo concreto y cotidiano de esa palabra.
  // Devuelve { texto } o { texto: '', error }
  // =====================================================================
  function instruccionesDiccionario(ctx) {
    return 'Eres ' + ctx.mascota + ', la mascota de un libro digital de ' + ctx.libro + ' para ' + ctx.publico + '. ' +
      'El estudiante buscó en la actividad una palabra que no entiende. Responde en español, CORTO Y DIRECTO: máximo 25 palabras, una o dos frases, sin markdown. ' +
      'Empieza directamente con el significado (sin saludos ni exclamaciones), con palabras simples y en el sentido que tiene en la frase y en la materia; ' +
      'si ayuda, agrega una comparación breve con algo cotidiano. Datos verdaderos. No uses el nombre del estudiante. No termines con una pregunta.';
  }
  function explicar(ctx, termino, frase, ejemplo) {
    var cfg = ctx.config || {};
    termino = String(termino || '').slice(0, 80);
    frase = String(frase || '').slice(0, 300);
    var pedido = ejemplo
      ? 'Dame un ejemplo concreto y cotidiano (de la vida en Ecuador) de «' + termino + '», en una frase de máximo 20 palabras.'
      : 'Explícame qué significa «' + termino + '»' + (frase ? ' en esta frase: «' + frase + '»' : '') + '.';
    var op = conTiempo((cfg.tiempoMaximoMs || 8000) + 4000);
    var peticion;
    if (cfg.proxyUrl) {
      // Servidor intermedio: se usa la ruta del chat con la misma indicación.
      peticion = fetch(urlChat(cfg), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ libro: ctx.libro, publico: ctx.publico, mascota: ctx.mascota, tema: leerTema(), historial: [], pregunta: pedido + ' Responde corto y directo (máximo 25 palabras), sin saludos ni exclamaciones.', maxPalabras: 30 }),
        signal: op.signal,
      }).then(comprobar).then(function (j) { return j.texto; });
    } else {
      peticion = conReintento(function () {
        return llamarModelo(cfg, instruccionesDiccionario(ctx) + ' Tema de la actividad: ' + leerTema(), [{ rol: 'estudiante', texto: pedido }], 160, 0.4, false, op.signal);
      });
    }
    return peticion
      .then(function (t) {
        var texto = limpiarRespuesta(t);
        if (!texto) { var e = new Error('vacía'); e.sinMensajes = true; throw e; }
        return { texto: texto };
      })
      .catch(function (e) { return { texto: '', error: motivo(e) }; });
  }

  // ---------- Voz natural (botón 🔊 Escuchar del chat) ----------
  // Google Gemini convierte el texto en audio con una voz humana. Se envía
  // SOLO el texto que dijo la mascota (nunca nombres ni datos del estudiante:
  // {alumno} ya se quitó antes). Devuelve un Blob de audio WAV.
  function urlVoz(cfg) {
    return cfg.proxyVozUrl || String(cfg.proxyUrl).replace(/\/mensajes\/?$/, '/voz');
  }
  // ¿Se puede pedir voz natural con esta configuración?
  function vozDisponible(cfg) {
    return !!(cfg && cfg.activa && (cfg.proxyUrl || (cfg.apiKey && proveedor(cfg) === 'google')));
  }
  // Gemini 2.x/3.1 entregan audio crudo (PCM 16 bits): se le pone la cabecera WAV.
  function aWav(base64, mime) {
    var bin = atob(base64);
    var datos = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) datos[i] = bin.charCodeAt(i);
    if (/wav/i.test(mime)) return new Blob([datos], { type: 'audio/wav' });
    var tasa = Number((/rate=(\d+)/i.exec(mime) || [])[1]) || 24000;
    var cab = new DataView(new ArrayBuffer(44));
    var txt = function (o, s) { for (var k = 0; k < s.length; k++) cab.setUint8(o + k, s.charCodeAt(k)); };
    txt(0, 'RIFF'); cab.setUint32(4, 36 + datos.length, true); txt(8, 'WAVE');
    txt(12, 'fmt '); cab.setUint32(16, 16, true); cab.setUint16(20, 1, true); cab.setUint16(22, 1, true);
    cab.setUint32(24, tasa, true); cab.setUint32(28, tasa * 2, true); cab.setUint16(32, 2, true); cab.setUint16(34, 16, true);
    txt(36, 'data'); cab.setUint32(40, datos.length, true);
    return new Blob([cab.buffer, datos], { type: 'audio/wav' });
  }
  // vozCfg = config.voz · nombreVoz = voz de Gemini (Achird, Puck, Leda…)
  function voz(cfg, vozCfg, texto, nombreVoz) {
    texto = String(texto || '').slice(0, 700);
    nombreVoz = /^[A-Za-z]{3,20}$/.test(nombreVoz || '') ? nombreVoz : 'Achird';
    if (cfg.proxyUrl) {
      return fetch(urlVoz(cfg), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: texto, voz: nombreVoz }),
        signal: conTiempo(25000).signal,
      }).then(function (r) {
        if (!r.ok) { var e = new Error('voz ' + r.status); e.status = r.status; throw e; }
        return r.blob();
      });
    }
    // Cada modelo tiene su propio límite de uso (en el plan gratis, 3 por
    // minuto): si uno está lleno (429) o no existe (404), se prueba el siguiente.
    var modelos = (vozCfg.modelos && vozCfg.modelos.length ? vozCfg.modelos : [vozCfg.modelo || 'gemini-3.8-flash-lite-tts']).slice();
    var probar = function () {
      return fetch(URL_GOOGLE + encodeURIComponent(modelos.shift()) + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: texto }] }], // solo el mensaje: lo que se envía, se lee
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: nombreVoz } } } },
        }),
        signal: conTiempo(14000).signal,
      }).then(comprobar).catch(function (e) {
        // Lleno (429), no existe (404), caído (5xx) o muy lento: el siguiente modelo.
        if (modelos.length && e && ([429, 404, 500, 503].indexOf(e.status) >= 0 || e.name === 'AbortError')) return probar();
        if (e && e.status === 429 && /PerDay/i.test(e.detalle || '')) e.diario = true; // se acabó el cupo de hoy
        throw e;
      });
    };
    return probar().then(function (j) {
      var partes = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
      for (var i = 0; i < partes.length; i++) {
        var d = partes[i].inlineData || partes[i].inline_data;
        if (d && d.data) return aWav(d.data, d.mimeType || d.mime_type || '');
      }
      throw new Error('sin audio');
    });
  }

  window.MascotaIA = { obtener: obtener, conversar: conversar, explicar: explicar, leerTema: leerTema, limpiar: limpiar, voz: voz, vozDisponible: vozDisponible };
})();
