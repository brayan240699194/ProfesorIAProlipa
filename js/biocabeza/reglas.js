/* =========================================================================
   BIOCABEZA — prompt y validación de las preguntas (js/biocabeza/reglas.js)
   -------------------------------------------------------------------------
   Lo comparten el navegador (biocabeza.js, con clave local) y el servidor
   intermedio (js/entrevista/servidor/nucleo.mjs → /api/biocabeza/preguntas).
   Define globalThis.BioCabezaReglas.
   ========================================================================= */
(function (g) {
  'use strict';
  var texto = function (v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); };
  var entre = function (v, min, max, def) { return Math.min(max, Math.max(min, Math.round(Number(v)) || def)); };

  // Correos, teléfonos o cédulas: no se envían a la IA.
  function tieneDatosPersonales(t) { return /\S+@\S+\.\S+/.test(t) || /\d{7,}/.test(String(t).replace(/[\s.-]/g, '')); }

  function sistema(d) {
    return [
      'Eres un docente de ' + d.libro + ' que prepara un juego de preguntas para ' + d.publico + ' (Ecuador).',
      'El juego se juega con la cabeza frente a la cámara: cada pregunta tiene TRES opciones muy cortas que flotan en pantalla.',
      'Reglas:',
      '- Escribe en español neutro, claro y correcto. Sin datos inventados: solo contenido de ' + d.libro + ' aceptado y verificable.',
      '- Preguntas conceptuales (no de memorizar fechas), de máximo 14 palabras. Pueden usar metáforas ("¿Cuál es el cerebro de la célula?").',
      '- Exactamente 3 opciones por pregunta, de 1 a 3 palabras (máximo 22 caracteres cada una). Una sola correcta; las otras dos plausibles pero claramente incorrectas para quien sabe el tema.',
      '- Que la opción correcta no sea siempre la misma posición.',
      '- Cada opción lleva un emoji que la represente.',
      '- "explicacion": por qué la correcta es correcta, en máximo 20 palabras.',
      '- Si el tema no es apropiado para el colegio, haz las preguntas sobre lo básico de ' + d.libro + '.',
      '- Nada violento, sexual, de drogas ni de política.',
      'Responde SOLO con JSON: {"tema":"…","preguntas":[{"pregunta":"…","opciones":[{"texto":"…","emoji":"…"},{"texto":"…","emoji":"…"},{"texto":"…","emoji":"…"}],"correcta":0,"explicacion":"…"}]}',
    ].join('\n');
  }
  // Con "contexto" (texto de la actividad abierta, desde el botón Juego del
  // menú) las preguntas salen de ese contenido.
  function usuario(d) {
    var t = 'Tema: «' + d.tema + '». Nivel: ' + d.nivel + '. Crea ' + d.cantidad + ' preguntas distintas, de la más fácil a la más difícil.';
    if (d.contexto) {
      t += '\nBasa las preguntas en los conceptos de ' + d.libro + ' de esta actividad del libro (y en lo básico de ese mismo tema). No preguntes por las instrucciones, los materiales ni el formato de la actividad.' +
        '\nTexto de la actividad: «' + d.contexto + '»';
    }
    return t;
  }

  // Datos que llegan del navegador (o de la página) → datos limpios.
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

  // Respuesta de la IA (texto JSON u objeto) → { tema, preguntas } o null.
  function normalizar(r, cantidad) {
    if (typeof r === 'string') {
      var m = /\{[\s\S]*\}/.exec(r);
      try { r = JSON.parse(m ? m[0] : r); } catch (e) { return null; }
    }
    if (!r || !Array.isArray(r.preguntas)) return null;
    var lista = [];
    r.preguntas.forEach(function (p) {
      if (!p || !Array.isArray(p.opciones) || p.opciones.length !== 3) return;
      var ops = p.opciones.map(function (o) {
        return typeof o === 'string' ? { texto: texto(o, 26), emoji: '' } : { texto: texto(o && o.texto, 26), emoji: texto(o && o.emoji, 8) };
      });
      var c = Number(p.correcta);
      var pregunta = texto(p.pregunta, 140);
      if (!pregunta || ops.some(function (o) { return !o.texto; }) || !(c >= 0 && c <= 2)) return;
      lista.push({ pregunta: pregunta, opciones: ops, correcta: c, explicacion: texto(p.explicacion, 180) });
    });
    if (lista.length < 2) return null;
    return { tema: texto(r.tema, 80), preguntas: lista.slice(0, cantidad || 10) };
  }

  g.BioCabezaReglas = { texto: texto, datos: datos, sistema: sistema, usuario: usuario, normalizar: normalizar, tieneDatosPersonales: tieneDatosPersonales };
})(typeof window !== 'undefined' ? window : globalThis);
