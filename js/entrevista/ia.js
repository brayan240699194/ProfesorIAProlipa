/* =========================================================================
   ENTREVISTA A UN PERSONAJE CON IA — capa de IA (js/entrevista/ia.js)
   -------------------------------------------------------------------------
   La carga entrevista.js SOLO cuando el estudiante abre la entrevista.
   Expone window.EntrevistaIA:
     iniciar(config)
     conversar(datos, historial, pregunta)   → { texto, pizarra, siguientes } | { error }
     cerrar(datos, historial)                → { despedida, aprendizajes… } | { error }
     hablar(texto, { voz, genero, alEstado }) · precargar(texto, voz) · callar() · desbloquear() · hayVoz()
     Microfono(opciones) · leerPagina(max)
   Dos modos (config.ia), siempre con Google Gemini:
     - directo (pruebas): el navegador llama a Gemini con la clave;
     - servidor (publicado): proxyUrl + /api/entrevista/…, /api/voz,
       /api/transcribir. El servidor guarda la clave y arma los prompts.
   ========================================================================= */
(function () {
  'use strict';
  var URL_GOOGLE = 'https://generativelanguage.googleapis.com/v1beta/models/';
  var C = null;
  var R = window.EntrevistaReglas;

  function configurada() {
    var ia = (C && C.ia) || {};
    return !!(ia.activa !== false && (ia.proxyUrl || ia.apiKey));
  }
  function modoServidor() { return !!(C && C.ia.proxyUrl); }
  function base() { return String(C.ia.proxyUrl).replace(/\/+$/, '').replace(/\/api$/, ''); }

  // ---------- Llamadas ----------
  function conTiempo(ms) {
    if (!window.AbortController) return {};
    var c = new AbortController();
    setTimeout(function () { c.abort(); }, ms);
    return { signal: c.signal };
  }
  // Gemini 2.x usa thinkingBudget (0 = sin pensar); Gemini 3.x usa
  // thinkingLevel y rechaza thinkingBudget: 0.
  function pensamientoGoogle(modelo) {
    var v = /gemini-(\d+)/i.exec(modelo || '');
    if (v && Number(v[1]) < 3) return { thinkingBudget: 0 };
    return { thinkingLevel: 'minimal' };
  }
  function comprobar(r) {
    if (r.ok) return r.json();
    return r.text().then(function (t) {
      var e = new Error('IA ' + r.status);
      e.status = r.status;
      e.detalle = String(t || '').slice(0, 400);
      throw e;
    });
  }
  // Motivo del fallo en palabras sencillas.
  function motivo(e) {
    var s = e && e.status;
    var d = (e && e.detalle) || '';
    if (s === 401 || /API[_ ]?key[^"]*(not valid|invalid)|API_KEY_INVALID/i.test(d)) return 'La clave de la IA no es válida (' + s + ').';
    if (s === 402) return 'La cuenta de la IA no tiene crédito (402).';
    if (s === 403) return 'Acceso rechazado (403): revisa la clave o el dominio permitido.';
    if (s === 404 || (s === 400 && /model/i.test(d))) return 'Modelo no disponible (' + s + '): revisa ia.modelo en js/entrevista/config.js.';
    if (s === 400) return 'Petición rechazada (400).';
    if (s === 429) return 'Hay muchas preguntas a la vez (429): espera un momento e inténtalo de nuevo.';
    if (s === 500 || s === 502 || s === 503) return 'La IA está saturada en este momento (' + s + '): intenta en unos segundos.';
    if (s === 504) return 'La IA tardó demasiado en responder.';
    if (s) return 'La IA respondió con error ' + s + '.';
    if (e && e.name === 'AbortError') return 'La IA tardó demasiado en responder.';
    if (e && e.sinRespuesta) return 'La IA respondió vacío. Inténtalo de nuevo.';
    return 'Sin conexión con la IA (revisa internet o la dirección del servidor).';
  }
  // UN reintento: si tardó demasiado (a veces Gemini se demora en una
  // petición y la siguiente sale en 1-2 s), al instante; si está saturada
  // (503/500) o en el límite (429), tras 2 s.
  function conReintento(fn) {
    return fn().catch(function (e) {
      if (e && e.name === 'AbortError') return fn();
      if (!e || [429, 500, 503].indexOf(e.status) < 0) throw e;
      return new Promise(function (ok) { setTimeout(ok, 2000); }).then(fn);
    });
  }
  // Llamada DIRECTA a Gemini (solo pruebas: la clave queda en el navegador).
  //   turnos: [{ rol: 'personaje' | 'estudiante', texto }]
  function modelo(sistema, turnos, op) {
    op = op || {};
    var cfg = C.ia;
    var tiempo = op.ms || cfg.tiempoMaximoMs || 15000;
    var enviar = function (conPensamiento) {
      var gen = { maxOutputTokens: op.maxTokens || 400, temperature: op.temperatura == null ? 0.7 : op.temperatura };
      if (conPensamiento) gen.thinkingConfig = pensamientoGoogle(cfg.modelo);
      if (op.json) gen.responseMimeType = 'application/json';
      return fetch(URL_GOOGLE + encodeURIComponent(cfg.modelo) + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sistema }] },
          contents: turnos.map(function (t) { return { role: t.rol === 'personaje' ? 'model' : 'user', parts: [{ text: t.texto }] }; }),
          generationConfig: gen,
        }),
        signal: conTiempo(tiempo).signal,
      }).then(comprobar);
    };
    return conReintento(function () {
      // Si el modelo no acepta la opción de pensamiento (400), se pide sin ella.
      return enviar(true).catch(function (e) {
        if (e && e.status === 400 && !/API[_ ]?key/i.test(e.detalle || '')) return enviar(false);
        throw e;
      });
    }).then(textoDe);
  }
  // Texto de una respuesta de Gemini (sin las partes de "pensamiento").
  function textoDe(j) {
    var c = j && j.candidates && j.candidates[0];
    return c && c.content && c.content.parts ? c.content.parts.map(function (x) { return x.thought ? '' : x.text || ''; }).join('').trim() : '';
  }
  function servidor(ruta, cuerpo, ms) {
    return fetch(base() + ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: conTiempo(ms || (C.ia.tiempoMaximoMs || 15000) + 3000).signal,
    }).then(comprobar);
  }

  // Texto de la página: título, títulos y enunciados (sin el bot).
  function leerPagina(max) {
    max = max || 1200;
    var zona = document.querySelector('#activity .panel-body') || document.body;
    var partes = [document.title];
    var vistos = {};
    var nodos = zona.querySelectorAll('h1, h2, h3, h4, p, li');
    for (var i = 0; i < nodos.length && partes.join(' ').length < max; i++) {
      var n = nodos[i];
      if (n.closest('#entrevista-ia, .nota-abierta, .c-d, script, style')) continue;
      var t = n.textContent.replace(/\s+/g, ' ').trim();
      if (t.length < 4 || vistos[t]) continue;
      vistos[t] = 1;
      partes.push(t);
    }
    return partes.join(' · ').slice(0, max);
  }

  // =====================================================================
  // TAREAS DE LA ENTREVISTA
  // datos: { personaje, libro, publico, tema, maxPalabras }
  // =====================================================================
  // → { texto, pizarra: [ideas clave], siguientes: [2 preguntas] } | { error }
  function conversar(datos, historial, pregunta) {
    var d = { personaje: R.personaje(datos.personaje), libro: datos.libro, publico: datos.publico, tema: datos.tema, maxPalabras: datos.maxPalabras };
    var n = (C.entrevista && C.entrevista.historialTurnos) || 8;
    var hist = (historial || []).slice(-n).map(function (m) { return { rol: m.rol, texto: String(m.texto).slice(0, 600) }; });
    // Gemini pide que la conversación empiece con un turno del estudiante.
    while (hist.length && hist[0].rol !== 'estudiante') hist.shift();
    var peticion = modoServidor()
      ? conReintento(function () { return servidor('/api/entrevista/chat', { datos: datos, historial: hist, pregunta: pregunta }); })
      : modelo(R.chat(d), hist.concat([{ rol: 'estudiante', texto: pregunta }]), { maxTokens: 600, temperatura: 0.7, json: true });
    return peticion.then(function (t) {
      var r = R.normalizarRespuesta(t, d.maxPalabras);
      if (!r.texto) { var e = new Error('vacía'); e.sinRespuesta = true; throw e; }
      return r;
    }).catch(function (e) { return { texto: '', error: motivo(e) }; });
  }

  function cerrar(datos, historial) {
    var d = { personaje: R.personaje(datos.personaje), libro: datos.libro, publico: datos.publico, tema: datos.tema };
    var hist = (historial || []).slice(-30);
    var peticion;
    if (modoServidor()) peticion = servidor('/api/entrevista/cierre', { datos: datos, historial: hist }, 30000).then(function (j) { return R.normalizarCierre(j); });
    else {
      var p = R.cierre(d, hist);
      var pedir = function () {
        return modelo(p.sistema, [{ rol: 'estudiante', texto: p.usuario }], { json: true, maxTokens: 900, temperatura: 0.4, ms: 30000 }).then(R.normalizarCierre);
      };
      peticion = pedir().then(function (r) { return r || pedir(); });
    }
    return peticion.then(function (r) {
      if (!r) { var e = new Error('vacía'); e.sinRespuesta = true; throw e; }
      return r;
    }).catch(function (e) { return { error: motivo(e) }; });
  }

  // =====================================================================
  // VOZ DEL PERSONAJE
  // 1) Natural (Gemini TTS): cadena de modelos; si uno se llena, el siguiente.
  // 2) Respaldo: la voz del dispositivo (Web Speech API).
  // =====================================================================
  var VOZ = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function' ? window.speechSynthesis : null;
  var AUDIO = typeof window.Audio === 'function' ? new Audio() : null;
  var SILENCIO = 'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
  var turnoVoz = 0, audioListo = false, vozIAPausa = 0;
  var agotados = {}; // modelo de voz → hasta cuándo no tiene cupo
  var audios = {}, ordenAudios = [];

  function vozNaturalDisponible() {
    return !!(C && C.voz.motor !== 'dispositivo' && AUDIO && configurada() && Date.now() >= vozIAPausa);
  }
  function hayVoz() { return !!VOZ || vozNaturalDisponible(); }
  // Voces del dispositivo según el género del personaje (por el nombre de la
  // voz: Windows, Android, macOS e iOS las nombran como personas).
  var FEMENINA = /(helena|sabina|laura|elvira|paloma|dalia|elena|paulina|m[oó]nica|sof[ií]a|luc[ií]a|camila|valentina|marisol|ximena|catalina|salom[eé]|paola|pilar|esperanza|pen[eé]lope|isabela|soledad|larissa|renata|beatriz|irene|gabriela|andrea|elsa|carla|amalia|marta|female|mujer|woman)/i;
  var MASCULINA = /(pablo|ra[uú]l|jorge|[aá]lvaro|diego|gerardo|carlos|juan|enrique|miguel|andr[eé]s|gonzalo|tom[aá]s|lorenzo|federico|alonso|jos[eé]|mario|rodrigo|emilio|sergio|dar[ií]o|sebasti[aá]n|male|hombre|\bman\b)/i;
  var vocesPorGenero = {};
  function elegirVoz(genero) {
    if (!VOZ) return null;
    var voces = VOZ.getVoices().filter(function (v) { return /^es([-_]|$)/i.test(v.lang); });
    if (!voces.length) return null;
    var orden = ['es-ec', 'es-419', 'es-us', 'es-mx', 'es-co', 'es-pe'];
    var igual = genero === 'femenino' ? FEMENINA : genero === 'masculino' ? MASCULINA : null;
    var otro = genero === 'femenino' ? MASCULINA : genero === 'masculino' ? FEMENINA : null;
    function puntos(v) {
      var i = orden.indexOf(v.lang.toLowerCase().replace('_', '-'));
      return (igual && igual.test(v.name) ? 80 : 0) - (otro && otro.test(v.name) ? 80 : 0) +
        (/natural|neural|enhanced|premium|mejorad|siri/i.test(v.name) ? 40 : 0) + (/online|google/i.test(v.name) ? 10 : 0) + (i < 0 ? 0 : 20 - i);
    }
    var v = voces.sort(function (a, b) { return puntos(b) - puntos(a); })[0];
    // ¿Coincide el género? Si no se sabe, el tono se ajusta un poco.
    return { voz: v, seguro: !igual || igual.test(v.name) };
  }
  function vozPara(genero) {
    var k = genero || 'neutro';
    if (!vocesPorGenero[k]) vocesPorGenero[k] = elegirVoz(genero);
    return vocesPorGenero[k];
  }
  if (VOZ && VOZ.addEventListener) VOZ.addEventListener('voiceschanged', function () { vocesPorGenero = {}; });
  window.addEventListener('pagehide', function () { callar(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) callar(); });

  // Sin emojis; "Dr." y "Dra." se leen completos.
  function textoParaVoz(t) {
    return String(t)
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
      .replace(/\bDr\.\s/g, 'doctor ').replace(/\bDra\.\s/g, 'doctora ')
      .replace(/\s+/g, ' ').trim();
  }
  // iPhone/iPad solo dejan sonar audio si empieza con un toque: llamar
  // desbloquear() dentro de un clic del estudiante.
  function desbloquear() {
    if (AUDIO && !audioListo) {
      audioListo = true;
      try { AUDIO.src = SILENCIO; var pr = AUDIO.play(); if (pr && pr.catch) pr.catch(function () { audioListo = false; }); } catch (e) { audioListo = false; }
    }
    if (VOZ) try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; VOZ.speak(u); } catch (e) {}
  }
  function callar() {
    turnoVoz++;
    if (VOZ) try { VOZ.cancel(); } catch (e) {}
    if (AUDIO) try { AUDIO.pause(); } catch (e) {}
  }
  function cabeceraWav(bytes, tasa) {
    var cab = new DataView(new ArrayBuffer(44));
    var txt = function (o, s) { for (var k = 0; k < s.length; k++) cab.setUint8(o + k, s.charCodeAt(k)); };
    txt(0, 'RIFF'); cab.setUint32(4, 36 + bytes, true); txt(8, 'WAVE');
    txt(12, 'fmt '); cab.setUint32(16, 16, true); cab.setUint16(20, 1, true); cab.setUint16(22, 1, true);
    cab.setUint32(24, tasa, true); cab.setUint32(28, tasa * 2, true); cab.setUint16(32, 2, true); cab.setUint16(34, 16, true);
    txt(36, 'data'); cab.setUint32(40, bytes, true);
    return cab.buffer;
  }
  // Algunos modelos de voz entregan audio crudo (PCM 16 bits): se le pone la cabecera WAV.
  function aWav(base64, mime) {
    var bin = atob(base64);
    var datos = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) datos[i] = bin.charCodeAt(i);
    if (/wav/i.test(mime)) return new Blob([datos], { type: 'audio/wav' });
    var tasa = Number((/rate=(\d+)/i.exec(mime) || [])[1]) || 24000;
    return new Blob([cabeceraWav(datos.length, tasa), datos], { type: 'audio/wav' });
  }
  // Texto → Blob WAV. Se envía SOLO el texto a leer: los modelos de voz
  // leen todo lo que reciben (si se agrega "lee con voz cálida", lo dicen).
  function pedirVoz(texto, nombreVoz) {
    texto = String(texto || '').slice(0, 1000);
    if (modoServidor()) {
      return fetch(base() + '/api/voz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: texto, voz: nombreVoz }),
        signal: conTiempo(20000).signal,
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.audio) { var e = new Error('voz ' + r.status); e.status = r.status || 502; e.diario = !!j.diario; throw e; }
          return aWav(j.audio, j.mime || '');
        });
      });
    }
    // Se saltan los modelos que ya se quedaron sin cupo (1 min o 1 h).
    var modelos = (C.voz.modelos && C.voz.modelos.length ? C.voz.modelos : ['gemini-3.8-flash-lite-tts']).filter(function (m) { return !(agotados[m] > Date.now()); });
    if (!modelos.length) { var sin = new Error('voz sin cupo'); sin.status = 429; sin.diario = true; return Promise.reject(sin); }
    var probar = function () {
      var modelo = modelos.shift();
      return fetch(URL_GOOGLE + encodeURIComponent(modelo) + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': C.ia.apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: texto }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: nombreVoz } } } },
        }),
        signal: conTiempo(25000).signal,
      }).then(comprobar).catch(function (e) {
        if (e && e.status === 429) {
          e.diario = /PerDay/i.test(e.detalle || '');
          agotados[modelo] = Date.now() + (e.diario ? 60 : 1) * 60000;
        }
        if (modelos.length && e && ([429, 404, 500, 503].indexOf(e.status) >= 0 || e.name === 'AbortError')) return probar();
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
  function audioNatural(t, nombreVoz) {
    var k = nombreVoz + '|' + t;
    if (audios[k]) return Promise.resolve(audios[k]);
    return pedirVoz(t, nombreVoz).then(function (blob) {
      var url = URL.createObjectURL(blob);
      audios[k] = url;
      ordenAudios.push(k);
      if (ordenAudios.length > 30) { var viejo = ordenAudios.shift(); URL.revokeObjectURL(audios[viejo]); delete audios[viejo]; }
      return url;
    });
  }
  // Habla y resuelve la Promesa al terminar (o al ser interrumpida).
  //   op: { voz: 'Leda', genero: 'femenino', alEstado: function ('preparando' | 'hablando' | 'listo') }
  // Para que la voz empiece rápido: la primera frase se pide aparte (sale en
  // ~1 s) y suena mientras se genera el resto, en paralelo.
  function partir(t) {
    if (C.voz.porPartes === false) return [t];
    var m = /^[\s\S]{15,160}?[.!?…](?=\s|$)/.exec(t);
    if (!m || t.length - m[0].length < 15) return [t];
    return [m[0].trim(), t.slice(m[0].length).trim()];
  }
  // Prepara el audio con anticipación (por ejemplo, el saludo) sin sonar.
  function precargar(texto, nombreVoz) {
    var t = textoParaVoz(texto);
    if (!t || !vozNaturalDisponible()) return;
    partir(t).forEach(function (p) { audioNatural(p, nombreVoz).catch(function () {}); });
  }
  function hablar(texto, op) {
    op = op || {};
    callar();
    var t = textoParaVoz(texto);
    var avisar = op.alEstado || function () {};
    if (!t) return Promise.resolve();
    var mio = turnoVoz;
    var nombreVoz = /^[A-Za-z]{3,20}$/.test(op.voz || '') ? op.voz : 'Puck';
    return new Promise(function (ok) {
      var listo = false, dispositivo = false;
      var fin = function () { if (listo) return; listo = true; avisar('listo'); ok(); };
      // Pasa a la voz del dispositivo (inmediata) desde la parte "desde".
      var usarDispositivo = function (desde) {
        if (dispositivo || mio !== turnoVoz) return;
        dispositivo = true;
        vozDispositivo(desde, mio, avisar, fin, op.genero);
      };
      if (!vozNaturalDisponible()) return usarDispositivo(t);
      desbloquear();
      avisar('preparando');
      var partes = partir(t);
      var audios = partes.map(function (p) { var a = audioNatural(p, nombreVoz); a.catch(function () {}); return a; });
      // Si la voz natural tarda demasiado, no se hace esperar al estudiante.
      var plazo = setTimeout(function () { usarDispositivo(t); }, Number(C.voz.maxEsperaMs) || 2500);
      var tocar = function (i) {
        audios[i].then(function (url) {
          if (dispositivo || mio !== turnoVoz) return;
          clearTimeout(plazo);
          AUDIO.onended = function () { if (i + 1 < partes.length) tocar(i + 1); else fin(); };
          AUDIO.onerror = fin;
          AUDIO.onpause = function () { if (mio !== turnoVoz) fin(); };
          AUDIO.src = url;
          avisar('hablando');
          var pr = AUDIO.play();
          if (pr && pr.catch) pr.catch(function (e) {
            if (mio !== turnoVoz) return fin();
            if (e && e.name === 'NotAllowedError') return usarDispositivo(partes.slice(i).join(' '));
            fin();
          });
        }).catch(function (e) {
          // Límite de uso, clave o modelo con problemas: un rato con la voz del
          // dispositivo (se anota aunque esta respuesta ya no esté sonando).
          if (e && e.status) vozIAPausa = Date.now() + (e.diario ? 60 : e.status === 429 ? 1 : 30) * 60000;
          if (mio !== turnoVoz) return fin();
          clearTimeout(plazo);
          usarDispositivo(partes.slice(i).join(' '));
        });
      };
      tocar(0);
    });
  }
  // Chrome corta las frases largas de algunas voces (~15 s): se lee en tramos
  // de varias oraciones (hasta ~220 letras), no oración por oración, para que
  // no suene entrecortado.
  function vozDispositivo(t, mio, avisar, fin, genero) {
    if (!VOZ) return fin();
    var elegida = vozPara(genero);
    var oraciones = t.match(/[^.!?¿¡]*[.!?]+["»”]?|[^.!?]+$/g) || [t];
    var frases = [];
    oraciones.forEach(function (o) {
      var ult = frases.length - 1;
      if (ult >= 0 && (frases[ult] + o).length <= 220) frases[ult] += ' ' + o.trim();
      else frases.push(o.trim());
    });
    var i = 0;
    avisar('hablando');
    var siguiente = function () {
      if (mio !== turnoVoz) return fin();
      var f = (frases[i++] || '').trim();
      if (!f) return i < frases.length ? siguiente() : fin();
      var u = new SpeechSynthesisUtterance(f);
      u.lang = elegida ? elegida.voz.lang : 'es-ES';
      if (elegida) u.voice = elegida.voz;
      u.rate = 1;
      // Sin una voz del género del personaje, se acerca con el tono.
      u.pitch = elegida && !elegida.seguro ? (genero === 'femenino' ? 1.3 : 0.8) : 1;
      u.onend = function () { i < frases.length ? siguiente() : fin(); };
      u.onerror = fin;
      try { VOZ.resume(); VOZ.speak(u); } catch (e) { fin(); }
    };
    // Chrome a veces ignora speak() justo después de cancel(): una pausa corta lo evita.
    setTimeout(siguiente, 60);
  }

  // =====================================================================
  // TRANSCRIPCIÓN (respaldo del micrófono): WAV → texto con Gemini
  // =====================================================================
  function blobABase64(blob) {
    return new Promise(function (ok, falla) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(',')[1] || ''); };
      r.onerror = falla;
      r.readAsDataURL(blob);
    });
  }
  function transcribir(blob) {
    return blobABase64(blob).then(function (b64) {
      if (modoServidor()) return conReintento(function () { return servidor('/api/transcribir', { audio: b64, mime: 'audio/wav' }, 8000); }).then(function (j) { return j.texto || ''; });
      return conReintento(function () {
        return fetch(URL_GOOGLE + encodeURIComponent(C.ia.modelo) + ':generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': C.ia.apiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: R.TRANSCRIBIR }, { inlineData: { mimeType: 'audio/wav', data: b64 } }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 600, thinkingConfig: pensamientoGoogle(C.ia.modelo) },
          }),
          signal: conTiempo(8000).signal,
        }).then(comprobar);
      }).then(textoDe);
    }).then(function (t) {
      return R.texto(String(t).replace(/^["“]|["”]$/g, ''), 1000);
    });
  }

  // =====================================================================
  // MICRÓFONO — voz del estudiante → texto
  //   modo 'navegador': Web Speech API (texto en vivo, gratis).
  //   modo 'grabacion': graba WAV (16 kHz) y lo transcribe Gemini.
  // opciones: { alTexto(texto, enVivo), alEstado(estado, info), alNivel(0..1) }
  //   estados: 'escuchando' {segundos, max} · 'transcribiendo' · 'listo' {auto} ·
  //            'error' {mensaje}
  //   Si el dictado del navegador no se puede usar, pasa solo a grabación.
  // =====================================================================
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var AC = window.AudioContext || window.webkitAudioContext;
  // Mensaje según la causa real (no se consulta el permiso por adelantado:
  // en un archivo local o dentro de un iframe el navegador responde
  // "bloqueado" aunque el estudiante ya lo haya permitido).
  function mensajeMicrofono(err) {
    var nombre = (err && (err.name || err.error)) || '';
    if (/NotFound|DevicesNotFound|audio-capture/i.test(nombre)) return 'No se encontró un micrófono en este equipo. Escribe tu pregunta.';
    if (/NotReadable|TrackStart/i.test(nombre)) return 'Otro programa está usando el micrófono. Ciérralo y vuelve a intentarlo, o escribe tu pregunta.';
    if (location.protocol === 'file:') {
      if (window.console) console.warn('Entrevista: micrófono no disponible al abrir el libro como archivo (file://). Ábrelo desde un servidor (http://localhost o https).');
      return 'El micrófono no funciona al abrir el libro como archivo. Ábrelo desde el servidor del libro, o escribe tu pregunta.';
    }
    if (window.self !== window.top && window.console) console.warn('Entrevista: si el libro está dentro de un iframe, este debe tener allow="microphone; autoplay".');
    return 'No hay permiso para usar el micrófono. Toca el candado 🔒 junto a la dirección de la página, permite el micrófono y vuelve a intentarlo, o escribe tu pregunta.';
  }

  function puedeGrabar() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && AC) && configurada();
  }
  function modoMicrofono() {
    var motor = (C && C.microfono.motor) || 'auto';
    if (motor === 'ninguno') return null;
    if (motor === 'grabacion') return puedeGrabar() ? 'grabacion' : null;
    if (SR) return 'navegador';
    if (motor === 'navegador') return null;
    return puedeGrabar() ? 'grabacion' : null;
  }

  function Microfono(op) {
    this.op = op || {};
    this.modo = modoMicrofono();
    this.activo = false;
    this.texto = '';
  }
  Microfono.prototype._estado = function (e, info) { if (this.op.alEstado) this.op.alEstado(e, info || {}); };
  Microfono.prototype._parar = function () { this.activo = false; clearInterval(this.reloj); };
  // Un toque = una pregunta: escucha y, al callar el estudiante, termina sola.
  Microfono.prototype.iniciar = function () {
    if (this.activo || !this.modo) return;
    callar(); // que el personaje no se escuche a sí mismo
    this.activo = true;
    this.texto = '';
    this.segundos = 0;
    var self = this;
    var max = (C && C.microfono.maxSegundos) || 30;
    clearInterval(this.reloj);
    this.reloj = setInterval(function () {
      self.segundos++;
      self._estado('escuchando', { segundos: self.segundos, max: max });
      if (self.segundos >= max) self.detener();
    }, 1000);
    this._estado('escuchando', { segundos: 0, max: max });
    if (this.modo === 'navegador') this._iniciarNavegador();
    else this._iniciarGrabacion();
  };
  // Detiene y resuelve con el texto final (también avisa 'listo').
  Microfono.prototype.detener = function () {
    var self = this;
    clearInterval(this.reloj);
    if (!this.activo) return Promise.resolve(this.texto);
    this.activo = false;
    if (this.rec) return this._detenerNavegador();
    return this._detenerGrabacion().then(function (t) { self.texto = t; return t; });
  };

  // ---------- Web Speech API ----------
  // UNA sola sesión por toque, sin reinicios automáticos (cada reinicio puede
  // volver a pedir permiso). Al callar el estudiante, el navegador termina la
  // sesión y la pregunta queda lista; si no habló, avisa "No te escuché".
  Microfono.prototype._iniciarNavegador = function () {
    var self = this;
    var arrancar = function () {
      var rec = new SR();
      rec.lang = (C && C.microfono.idioma) || 'es-EC';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.continuous = false; // una frase (y el modo continuo repite frases en Android)
      var vivo = '';
      rec.onresult = function (e) {
        var finales = '';
        vivo = '';
        for (var i = 0; i < e.results.length; i++) {
          var t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finales += t + ' ';
          else vivo += t;
        }
        self.texto = finales.replace(/\s+/g, ' ').trim();
        if (self.op.alTexto) self.op.alTexto((self.texto + ' ' + vivo).trim(), true);
      };
      rec.onerror = function (e) {
        var err = e.error;
        if (err === 'no-speech' || err === 'aborted') return;
        self.rec = null;
        // El dictado del navegador no se puede usar aquí (archivo local, iframe,
        // Brave, sin internet…): se pasa SOLO, sin otro toque, a grabar la voz
        // y transcribirla con la IA. Desde ahora se usa siempre ese modo.
        if (self.activo && puedeGrabar()) {
          self.modo = 'grabacion';
          return self._iniciarGrabacion();
        }
        self._parar();
        self._estado('error', { mensaje: mensajeMicrofono(e) });
      };
      rec.onend = function () {
        // Si se cortó con texto aún "en vivo" (sin confirmar), se usa igual.
        if (!self.texto && vivo) self.texto = vivo.trim();
        if (self.activo && self.rec === rec) {
          self._parar();
          self.rec = null;
          self._estado('listo', { auto: true });
        }
        if (self.alTerminarRec) self.alTerminarRec();
      };
      self.rec = rec;
      try { rec.start(); } catch (x) {
        self.rec = null;
        if (puedeGrabar()) { self.modo = 'grabacion'; return self._iniciarGrabacion(); }
        self._parar();
        self._estado('error', { mensaje: mensajeMicrofono(x) });
      }
    };
    arrancar();
  };
  Microfono.prototype._detenerNavegador = function () {
    var self = this;
    var rec = this.rec;
    return new Promise(function (ok) {
      var listo = false;
      var terminar = function () {
        if (listo) return;
        listo = true;
        self.alTerminarRec = null;
        self.rec = null;
        self._estado('listo');
        ok(self.texto);
      };
      self.alTerminarRec = terminar;
      try { rec.stop(); } catch (e) { terminar(); }
      setTimeout(terminar, 1500); // por si el navegador no avisa el final
    });
  };

  // ---------- Grabación + transcripción ----------
  // Termina sola: tras hablar, 1,3 s de silencio; si no habla en 8 s, se
  // detiene sin enviar nada.
  var UMBRAL_VOZ = 0.035, SILENCIO_MS = 1300, ESPERA_MS = 8000;
  Microfono.prototype._iniciarGrabacion = function () {
    var self = this;
    this.trozos = [];
    var inicio = Date.now(), hablo = false, ultimaVoz = 0;
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } }).then(function (stream) {
      if (!self.activo) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      var ctx = new AC();
      var fuente = ctx.createMediaStreamSource(stream);
      var proc = ctx.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = function (e) {
        if (!self.activo) return;
        var d = e.inputBuffer.getChannelData(0);
        self.trozos.push(new Float32Array(d));
        var s = 0;
        for (var i = 0; i < d.length; i += 16) s += d[i] * d[i];
        var nivel = Math.sqrt(s / (d.length / 16));
        if (self.op.alNivel) self.op.alNivel(Math.min(1, nivel * 4));
        var ahora = Date.now();
        if (nivel > UMBRAL_VOZ) { hablo = true; ultimaVoz = ahora; }
        if ((hablo && ahora - ultimaVoz > SILENCIO_MS) || (!hablo && ahora - inicio > ESPERA_MS)) self.detener();
      };
      fuente.connect(proc);
      proc.connect(ctx.destination); // sin esto Chrome no procesa (la salida es silencio)
      self.grab = { stream: stream, ctx: ctx, fuente: fuente, proc: proc };
    }).catch(function (err) {
      self._parar();
      self._estado('error', { mensaje: mensajeMicrofono(err) });
    });
  };
  Microfono.prototype._detenerGrabacion = function () {
    var g = this.grab;
    var self = this;
    this.grab = null;
    if (!g) { this._estado('listo'); return Promise.resolve(''); }
    try { g.fuente.disconnect(); g.proc.disconnect(); } catch (e) {}
    g.stream.getTracks().forEach(function (t) { t.stop(); });
    var tasa = g.ctx.sampleRate;
    try { g.ctx.close(); } catch (e) {}
    var wav = codificarWav(this.trozos, tasa, 16000);
    this.trozos = [];
    if (!wav) { this._estado('listo'); return Promise.resolve(''); }
    this._estado('transcribiendo');
    return transcribir(wav).then(function (t) {
      self.texto = t;
      if (self.op.alTexto) self.op.alTexto(t, false);
      self._estado('listo');
      return t;
    }).catch(function (e) {
      self._estado('error', { mensaje: 'No se pudo convertir tu voz en texto: ' + motivo(e) + ' Puedes escribir tu pregunta.' });
      return '';
    });
  };
  // Float32 a la tasa del equipo → WAV PCM 16 bits mono a 16 kHz (lo acepta
  // Gemini en todos los navegadores; ~32 KB por segundo).
  function codificarWav(trozos, tasaOrigen, tasa) {
    var total = 0, i;
    for (i = 0; i < trozos.length; i++) total += trozos[i].length;
    if (total < tasaOrigen * 0.6) return null; // menos de medio segundo
    var paso = tasaOrigen / tasa;
    var n = Math.floor(total / paso);
    var pcm = new Int16Array(n);
    var todo = new Float32Array(total), o = 0;
    for (i = 0; i < trozos.length; i++) { todo.set(trozos[i], o); o += trozos[i].length; }
    for (i = 0; i < n; i++) {
      var ini = Math.floor(i * paso), fin = Math.min(total, Math.floor((i + 1) * paso)), s = 0;
      for (var k = ini; k < fin; k++) s += todo[k];
      var v = Math.max(-1, Math.min(1, s / Math.max(1, fin - ini)));
      pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    return new Blob([cabeceraWav(pcm.length * 2, tasa), pcm.buffer], { type: 'audio/wav' });
  }

  window.EntrevistaIA = {
    iniciar: function (config) { C = config; },
    leerPagina: leerPagina,
    conversar: conversar,
    cerrar: cerrar,
    hablar: hablar,
    precargar: precargar,
    callar: callar,
    desbloquear: desbloquear,
    hayVoz: hayVoz,
    Microfono: Microfono,
  };
})();
