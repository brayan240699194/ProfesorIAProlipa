/* =========================================================================
   BIOSALTO — prompt y validación de las preguntas (js/biosalto/reglas.js)
   -------------------------------------------------------------------------
   Preguntas de respuesta de UNA SOLA PALABRA, corta y obvia, para decirla por
   el micrófono. Lo comparten el navegador (biosalto.js, con clave local) y el
   servidor intermedio (js/entrevista/servidor/nucleo.mjs →
   /api/biosalto/preguntas). Define globalThis.BioSaltoReglas.
   ========================================================================= */
(function (g) {
  'use strict';
  var texto = function (v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); };
  var entre = function (v, min, max, def) { return Math.min(max, Math.max(min, Math.round(Number(v)) || def)); };

  // Correos, teléfonos o cédulas: no se envían a la IA.
  function tieneDatosPersonales(t) { return /\S+@\S+\.\S+/.test(t) || /\d{7,}/.test(String(t).replace(/[\s.-]/g, '')); }

  // Minúsculas, sin tildes ni signos: para comparar lo que dijo el estudiante.
  function normalizar(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function sistema(d) {
    return [
      'Eres un docente de ' + d.libro + ' que prepara un juego de voz para ' + d.publico + ' (Ecuador).',
      'Una gallina salta de una montaña a otra si el estudiante DICE en voz alta la respuesta correcta por el micrófono.',
      'Reglas:',
      '- Español neutro, claro y correcto. Solo contenido de ' + d.libro + ' aceptado y verificable.',
      '- Pregunta de máximo 14 palabras, clara y directa.',
      '- La respuesta es UNA SOLA PALABRA (sin artículo), fácil de pronunciar y de reconocer por el micrófono.',
      '- La respuesta debe ser OBVIA: una palabra corta (máximo 10 letras) y muy conocida, que un estudiante de colegio diría enseguida aunque no haya estudiado mucho.',
      '  Buenas (ejemplo en Biología; usa palabras así de tu materia): célula, núcleo, corazón, sangre, oxígeno, agua, sol, planta, hoja, raíz, ADN, gen, proteína, energía, calor, hueso, músculo, boca, estómago, virus, bacteria, animal, especie.',
      '  Malas (NO uses): desnaturalización, catalizador, sustrato, taxonomía, eucariota, nomenclatura, nombres de personas (Linneo, Darwin), términos técnicos poco usados.',
      '- Prefiere preguntas que casi se responden solas: completar una frase conocida ("Las enzimas son un tipo de…"), la función más famosa ("¿Qué órgano bombea la sangre?") o una comparación sencilla ("¿Cuál es el cerebro de la célula?").',
      '- Nivel básico: facilísimo, de conocimiento general. Intermedio: fácil, lo central del tema. Avanzado: un poco más del tema, pero igual con respuesta corta y conocida.',
      '- Sin números, nombres propios, palabras compuestas ni palabras en otro idioma. Una sigla muy conocida (ADN) sí vale.',
      '- La respuesta NO puede aparecer escrita en la pregunta.',
      '- "aceptadas": de 0 a 4 variantes también válidas de UNA palabra (singular/plural, sinónimo exacto, sigla común).',
      '- "pista": ayuda FUERTE de máximo 10 palabras (para qué sirve, dónde está o con qué se compara) que NO diga la respuesta.',
      '- "emoji": uno que represente la respuesta.',
      '- "explicacion": por qué esa es la respuesta, en máximo 18 palabras.',
      '- Si el tema no es apropiado para el colegio, haz las preguntas sobre lo básico de ' + d.libro + '.',
      '- Nada violento, sexual, de drogas ni de política.',
      'Responde SOLO con JSON: {"tema":"…","preguntas":[{"pregunta":"…","respuesta":"…","aceptadas":["…"],"pista":"…","emoji":"…","explicacion":"…"}]}',
    ].join('\n');
  }
  function usuario(d) {
    // Se piden algunas de más: el código descarta las de respuesta larga o difícil.
    var t = 'Tema: «' + d.tema + '». Nivel: ' + d.nivel + '. Crea ' + (d.cantidad + 3) + ' preguntas distintas y fáciles, de la más fácil a la menos fácil, cada una con respuesta obvia de una sola palabra corta.';
    if (d.contexto) {
      t += '\nBasa las preguntas en los conceptos de ' + d.libro + ' de esta actividad del libro (y en lo básico de ese mismo tema). No preguntes por las instrucciones, los materiales ni el formato de la actividad.' +
        '\nTexto de la actividad: «' + d.contexto + '»';
    }
    return t;
  }

  // Datos que llegan del navegador → datos limpios.
  function datos(e) {
    e = e && typeof e === 'object' ? e : {};
    return {
      tema: texto(e.tema, 80) || 'Lo básico de ' + (texto(e.libro, 80) || 'la materia'),
      cantidad: entre(e.cantidad, 3, 10, 5),
      nivel: ['básico', 'intermedio', 'avanzado'].indexOf(e.nivel) >= 0 ? e.nivel : 'intermedio',
      // La materia: la que detecta la actividad (js/materia.js) o la de config.js.
      libro: texto(e.libro, 80) || 'la materia de la actividad (dedúcela del tema)',
      publico: texto(e.publico, 100) || 'estudiantes de bachillerato',
      contexto: texto(e.contexto, 2500),
    };
  }

  var unaPalabra = function (p) { return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,20}$/.test(p); };

  // Respuesta de la IA (texto JSON u objeto) → { tema, preguntas } o null.
  function normalizarRespuesta(r, cantidad) {
    if (typeof r === 'string') {
      var m = /\{[\s\S]*\}/.exec(r);
      try { r = JSON.parse(m ? m[0] : r); } catch (e) { return null; }
    }
    if (!r || !Array.isArray(r.preguntas)) return null;
    var lista = [];
    r.preguntas.forEach(function (p) {
      if (!p) return;
      var pregunta = texto(p.pregunta, 140);
      var respuesta = texto(p.respuesta, 20).replace(/[.,;:¡!¿?"«»]/g, '');
      if (!pregunta || !unaPalabra(respuesta)) return;
      // Fácil de decir: máximo 11 letras y no un nombre propio (sí siglas como ADN).
      if (respuesta.length > 11 || /^[A-ZÁÉÍÓÚÑ][a-záéíóúüñ]/.test(respuesta)) return;
      // La respuesta no puede estar escrita en la pregunta.
      if ((' ' + normalizar(pregunta) + ' ').indexOf(' ' + normalizar(respuesta) + ' ') >= 0) return;
      var aceptadas = (Array.isArray(p.aceptadas) ? p.aceptadas : []).map(function (a) { return texto(a, 20).replace(/[.,;:¡!¿?"«»]/g, ''); })
        .filter(function (a) { return unaPalabra(a) && normalizar(a) !== normalizar(respuesta); }).slice(0, 4);
      lista.push({ pregunta: pregunta, respuesta: respuesta, aceptadas: aceptadas, pista: texto(p.pista, 80), emoji: texto(p.emoji, 8), explicacion: texto(p.explicacion, 180) });
    });
    if (lista.length < 2) return null;
    return { tema: texto(r.tema, 80), preguntas: lista.slice(0, cantidad || 10) };
  }

  // Para transcribir la voz con Gemini cuando el navegador no tiene dictado.
  var TRANSCRIBIR = 'Transcribe exactamente lo que dice la persona en este audio, en español. Es la respuesta corta (normalmente una palabra) a una pregunta del colegio. Responde solo con lo que dijo, sin comillas ni explicaciones. Si no hay voz o no se entiende, responde vacío.';

  g.BioSaltoReglas = { texto: texto, datos: datos, sistema: sistema, usuario: usuario, normalizar: normalizar, normalizarRespuesta: normalizarRespuesta, tieneDatosPersonales: tieneDatosPersonales, TRANSCRIBIR: TRANSCRIBIR };
})(typeof window !== 'undefined' ? window : globalThis);
