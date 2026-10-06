/* =========================================================================
   MASCOTA VIRTUAL — voz natural en el propio dispositivo (js/pet/voz-local.js)
   -------------------------------------------------------------------------
   Voces neuronales de Piper (código abierto) que se generan EN EL NAVEGADOR
   con la librería vits-web (licencia MIT): gratis, sin límites, sin clave y,
   una vez descargada la voz, sin internet.
   - La voz se descarga UNA sola vez (≈ 60-80 MB) y queda guardada en el
     dispositivo (almacenamiento privado del navegador, OPFS).
   - Cada frase se genera en un hilo aparte (no traba la página): en una
     computadora, ≈ 3 s por frase.
   - Se usa de a una frase por vez: mientras suena una, se prepara la siguiente.
   window.MascotaVozLocal:
     soportada()          ¿el navegador puede? (WebAssembly, Worker, OPFS)
     lista()              ¿la voz ya está descargada y lista?
     preparar(alAvance)   descarga la voz (una vez); alAvance(0..1)
     guardada()           → Promise<bool>: ¿ya está descargada? (no descarga)
     sintetizar(texto)    → Promise<url de audio WAV>
     frases(texto)        divide un texto en frases cortas
   ========================================================================= */
(function (g) {
  'use strict';
  if (g.MascotaVozLocal) return;
  var LIB = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm';
  var voz = 'es_MX-claude-high';
  var tts = null, estado = 'nada', preparando = null, cola = Promise.resolve();
  var cache = {}, orden = [];

  function soportada() {
    try { return !!(g.WebAssembly && g.Worker && navigator.storage && navigator.storage.getDirectory && g.isSecureContext !== false); } catch (e) { return false; }
  }
  function libreria() {
    if (!tts) tts = import(LIB);
    return tts;
  }
  // Descarga la voz (si no está) y la deja lista. Se llama una sola vez.
  function preparar(alAvance) {
    if (preparando) return preparando;
    if (!soportada()) return Promise.reject(new Error('navegador sin soporte'));
    estado = 'preparando';
    preparando = libreria().then(function (t) {
      return t.stored().then(function (guardadas) {
        if (guardadas.indexOf(voz) >= 0) return;
        return t.download(voz, function (p) { if (alAvance && p && p.total) alAvance(Math.min(1, p.loaded / p.total)); });
      }).then(function () {
        // Primera frase de "calentamiento": carga el modelo en memoria.
        return t.predict({ text: 'Hola.', voiceId: voz });
      });
    }).then(function () { estado = 'lista'; }, function (e) { estado = 'error'; preparando = null; throw e; });
    return preparando;
  }
  // Una frase → URL de un WAV. Las frases se generan de a una (en fila).
  function sintetizar(texto) {
    texto = String(texto || '').replace(/\s+/g, ' ').trim().slice(0, 600);
    if (!texto) return Promise.reject(new Error('vacío'));
    if (cache[texto]) return Promise.resolve(cache[texto]);
    var p = cola.then(function () {
      return libreria().then(function (t) { return t.predict({ text: texto, voiceId: voz }); });
    }).then(function (wav) {
      var url = URL.createObjectURL(wav);
      cache[texto] = url; orden.push(texto);
      if (orden.length > 40) { var viejo = orden.shift(); URL.revokeObjectURL(cache[viejo]); delete cache[viejo]; }
      return url;
    });
    cola = p.catch(function () {});
    return p;
  }
  // Divide en frases (punto, ¿?, ¡!, dos puntos); junta las muy cortas y parte las muy largas por comas.
  function frases(texto) {
    var partes = String(texto || '').match(/[^.!?…:;]+[.!?…:;]+["»”)]*\s*|[^.!?…:;]+$/g) || [];
    var r = [];
    partes.forEach(function (f) {
      f = f.trim();
      if (!f) return;
      if (r.length && (r[r.length - 1].length < 25 || f.length < 12)) r[r.length - 1] += ' ' + f;
      else if (f.length > 220) f.split(/(?<=,)\s+/).forEach(function (x) { if (r.length && r[r.length - 1].length + x.length < 200 && !/[.!?…:;]$/.test(r[r.length - 1])) r[r.length - 1] += ' ' + x; else r.push(x); });
      else r.push(f);
    });
    return r;
  }

  g.MascotaVozLocal = {
    soportada: soportada,
    lista: function () { return estado === 'lista'; },
    estado: function () { return estado; },
    preparar: preparar,
    // ¿Ya está descargada en este dispositivo? (sin descargar nada)
    guardada: function () { if (!soportada()) return Promise.resolve(false); return libreria().then(function (t) { return t.stored(); }).then(function (l) { return l.indexOf(voz) >= 0; }, function () { return false; }); },
    sintetizar: sintetizar,
    frases: frases,
    // Elige la voz (ids de Piper en español: es_MX-claude-high, es_MX-ald-medium,
    // es_ES-davefx-medium, es_ES-sharvard-medium, es_ES-carlfm-x_low…). Antes de preparar().
    usar: function (id) { if (id && estado === 'nada') voz = id; },
    voz: function () { return voz; },
  };
})(window);
