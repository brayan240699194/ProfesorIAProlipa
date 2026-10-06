/* =========================================================================
   MASCOTA VIRTUAL — lectura en voz alta (js/pet/lectura.js)
   -------------------------------------------------------------------------
   La mascota lee la actividad: el botón 🔊 (junto a ⋯ y –) ofrece
   👆 Párrafo (se toca el párrafo, la pregunta o la imagen) o 📄 Todo.
   Este archivo es solo el "motor" de la lectura; mascota.js pone los
   botones, la voz (la misma voz natural de la mascota) y mueve su boca.
   - Lee por párrafos completos (entonación natural) y prepara el siguiente
     mientras suena el actual; si la voz natural tarda o no hay cupo, ese
     párrafo lo lee la voz del dispositivo.
   - Karaoke sobre el texto real (CSS Custom Highlight API: no cambia el HTML).
   - Los espacios para completar se leen como "espacio en blanco" (o lo que
     ya escribió el estudiante) y las imágenes, por su descripción (alt).
   window.MascotaLectura.crear({ voz, alEstado, alBoca, alAviso, antes }) →
     { parrafo(), todo(), pausar(), seguir(), detener(), estado() }
     voz(texto) → Promise<url de audio | null> (null = voz del dispositivo)
     alEstado('quieto' | 'eligiendo' | 'cargando' | 'leyendo' | 'pausa')
     alBoca(nivel 0..1, hablando) · alAviso(texto) · antes() = calla otras voces
     alSenalar(() => DOMRect | null) · la oración que se está leyendo (null = ya no)
     letrasParte() · maxEspera(): tamaño de cada parte y espera de la voz (opcionales)
   ========================================================================= */
(function (g) {
  'use strict';
  if (g.MascotaLectura) return;
  var MS_LETRA = 68; // voz del dispositivo sin aviso de palabras: tiempo estimado por letra
  var LETRAS_PARTE = 480; // cada audio: un párrafo o hasta ~480 letras (menos audios = menos cupo de voz natural)
  var MAX_ESPERA = 3000; // si la voz natural tarda más, esa parte la lee el dispositivo
  var MOVIMIENTO = !(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- Del texto de la página a "fichas" ----------
  var OCULTO = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|svg|CANVAS|VIDEO|AUDIO|IFRAME|BUTTON|OPTION)$/i;
  var BLOQUE = /^(P|DIV|LI|UL|OL|H[1-6]|TD|TH|TR|TABLE|SECTION|ARTICLE|BLOCKQUOTE|FIGURE|FIGCAPTION|HEADER|FOOTER|LABEL|DT|DD|BR|HR)$/;
  var URL_RE = /^(https?:\/\/|www\.)\S+$|^[\w-]+\.(com|org|net|ec|lat|ly|io|edu)(\/\S*)?$/i;
  var zona = function () { return document.querySelector('#activity .panel-body') || document.getElementById('activity'); };
  function visible(el) {
    for (var e = el; e && e !== document.body; e = e.parentElement) {
      if (e.id === 'mascota' || e.hidden || e.classList.contains('infoAyuda') || e.getAttribute('aria-hidden') === 'true') return false;
    }
    var s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden';
  }
  function fichasDe(rango) {
    var fichas = [], cont = rango.commonAncestorContainer;
    var cortar = function () { if (fichas.length && fichas[fichas.length - 1].tipo !== 'corte') fichas.push({ tipo: 'corte' }); };
    var caminar = function (n) {
      if (n.nodeType === 3) {
        if (!rango.intersectsNode(n)) return;
        var t = n.textContent, ini = n === rango.startContainer ? rango.startOffset : 0, fin = n === rango.endContainer ? rango.endOffset : t.length;
        var re = /\S+/g, m;
        while ((m = re.exec(t))) {
          var a = m.index, b = a + m[0].length;
          if (b <= ini || a >= fin) continue;
          var s = Math.max(a, ini), e = Math.min(b, fin), palabra = t.slice(s, e);
          fichas.push({ tipo: 'palabra', nodo: n, ini: s, fin: e, texto: palabra, decir: URL_RE.test(palabra) ? 'el enlace' : palabra });
        }
        return;
      }
      if (n.nodeType !== 1 || OCULTO.test(n.tagName) || !rango.intersectsNode(n) || !visible(n)) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName)) {
        if (/^(hidden|button|submit|checkbox|radio|file)$/i.test(n.type || '')) return;
        var v = (n.value || '').trim();
        fichas.push({ tipo: 'campo', el: n, texto: v, decir: v || 'espacio en blanco' });
        return;
      }
      if (n.tagName === 'IMG') {
        var alt = (n.getAttribute('alt') || '').trim();
        if (alt.length > 15) { cortar(); fichas.push({ tipo: 'imagen', el: n, texto: alt, decir: 'En la imagen: ' + alt + (/[.!?]$/.test(alt) ? '' : '.') }); cortar(); }
        return;
      }
      var bloque = BLOQUE.test(n.tagName);
      if (bloque) cortar();
      n.childNodes.forEach(caminar);
      if (bloque) cortar();
    };
    if (cont.nodeType === 3) caminar(cont);
    else if (OCULTO.test(cont.tagName) || !visible(cont)) return [];
    else cont.childNodes.forEach(caminar);
    return fichas;
  }
  // Fichas → partes que se leen de una vez (la primera, solo la primera oración: empieza rápido).
  function partesDe(fichas, LETRAS_PARTE) {
    var partes = [], actual, oracion = [];
    var nueva = function () { actual = { fichas: [], decir: '', oraciones: [] }; };
    var cerrar = function () { if (actual && /[\p{L}\p{N}]/u.test(actual.decir)) partes.push(actual); nueva(); };
    var finOracion = function () { if (oracion.length) actual.oraciones.push(oracion); oracion = []; };
    nueva();
    fichas.forEach(function (f) {
      if (f.tipo === 'corte') { finOracion(); cerrar(); return; }
      if (f.tipo === 'imagen') { finOracion(); cerrar(); }
      if (actual.decir) actual.decir += ' ';
      f.pos = actual.decir.length;
      actual.decir += f.decir;
      actual.fichas.push(f);
      oracion.push(f);
      var fin = f.tipo === 'imagen' || (f.tipo === 'palabra' && /[.!?…:;]["»”)\]]*$/.test(f.texto) && !/^(\d+|[a-z])\.$/i.test(f.texto));
      if (fin) { finOracion(); if (f.tipo === 'imagen' || actual.decir.length >= LETRAS_PARTE || partes.length === 0) cerrar(); }
      else if (actual.decir.length >= LETRAS_PARTE * 1.4) { finOracion(); cerrar(); }
    });
    finOracion(); cerrar();
    partes.forEach(function (p) {
      var total = 0;
      p.fichas.forEach(function (f) { f.peso = f.decir.length + 1 + (/[,;:]$/.test(f.decir) ? 4 : 0) + (/[.!?…]$/.test(f.decir) ? 9 : 0); f.acum = total; total += f.peso; });
      p.pesoTotal = total;
    });
    return partes.slice(0, 80);
  }

  // ---------- Resaltado sobre la página ----------
  var HL = g.CSS && CSS.highlights && g.Highlight ? { oracion: new Highlight(), palabra: new Highlight() } : null;
  if (HL) { CSS.highlights.set('mascota-oracion', HL.oracion); CSS.highlights.set('mascota-palabra', HL.palabra); }
  var marcados = [], oracionActual = null, fichaActual = null;
  var alSenalar = null; // mascota.js: la mascota señala la oración que se lee
  function rangoDe(f) { var r = document.createRange(); r.setStart(f.nodo, f.ini); r.setEnd(f.nodo, f.fin); return r; }
  function mostrarEnPantalla(el, ya) {
    if (!el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect();
    if (ya || r.top < 60 || r.bottom > innerHeight - 130) el.scrollIntoView({ block: 'center', behavior: MOVIMIENTO ? 'smooth' : 'auto' });
  }
  function resaltarOracion(o) {
    if (o === oracionActual) return;
    oracionActual = o;
    if (HL) HL.oracion.clear();
    marcados.forEach(function (e) { e.classList.remove('mascota-marca'); }); marcados = [];
    if (!o) { if (alSenalar) alSenalar(null); return; }
    var pal = o.filter(function (f) { return f.tipo === 'palabra'; });
    var r = null;
    if (pal.length) { r = document.createRange(); r.setStart(pal[0].nodo, pal[0].ini); r.setEnd(pal[pal.length - 1].nodo, pal[pal.length - 1].fin); if (HL) HL.oracion.add(r); }
    o.forEach(function (f) { if (f.el) { f.el.classList.add('mascota-marca'); marcados.push(f.el); } });
    mostrarEnPantalla(o[0].el || o[0].nodo.parentElement);
    // Dónde está la oración (la primera línea), para que la mascota la señale.
    var el = o[0].el;
    if (alSenalar) alSenalar(function () {
      if (!r) return el ? el.getBoundingClientRect() : null;
      // Toda la primera línea (getClientRects da un trozo por palabra en negrita, enlace…).
      var l = [].slice.call(r.getClientRects()).filter(function (q) { return q.width > 0; });
      if (!l.length) return r.getBoundingClientRect();
      var top = l[0].top, linea = l.filter(function (q) { return Math.abs(q.top - top) < 6; });
      var izq = Math.min.apply(null, linea.map(function (q) { return q.left; })), der = Math.max.apply(null, linea.map(function (q) { return q.right; }));
      return { left: izq, right: der, top: l[0].top, bottom: l[0].bottom, width: der - izq, height: l[0].height };
    });
  }
  function resaltarPalabra(f) {
    if (f === fichaActual) return;
    fichaActual = f;
    if (HL) HL.palabra.clear();
    if (!f || f.tipo !== 'palabra') return;
    if (HL) HL.palabra.add(rangoDe(f));
    var r = rangoDe(f).getBoundingClientRect();
    if (r.bottom > innerHeight - 130 || r.top < 60) mostrarEnPantalla(f.nodo.parentElement, true);
  }
  function limpiar() { resaltarOracion(null); resaltarPalabra(null); }
  function marcar(parte, f) {
    if (!f) return;
    resaltarPalabra(f);
    resaltarOracion(parte.oraciones.find(function (o) { return o.indexOf(f) >= 0; }) || null);
  }
  function fichaEnProporcion(parte, p) {
    var meta = Math.max(0, Math.min(0.999, p)) * parte.pesoTotal, f = parte.fichas[0];
    for (var i = 0; i < parte.fichas.length; i++) { if (parte.fichas[i].acum <= meta) f = parte.fichas[i]; else break; }
    return f;
  }
  function fichaEnPosicion(parte, pos) {
    var f = parte.fichas[0];
    for (var i = 0; i < parte.fichas.length; i++) { if (parte.fichas[i].pos <= pos) f = parte.fichas[i]; else break; }
    return f;
  }

  function estilos() {
    if (document.getElementById('mascota-lectura-estilos')) return;
    var s = document.createElement('style');
    s.id = 'mascota-lectura-estilos';
    s.textContent = '::highlight(mascota-oracion){background-color:rgba(253,230,138,.4)}' +
      '::highlight(mascota-palabra){background-color:#fde047;color:#0f172a}' +
      '.mascota-marca{outline:3px solid #facc15!important;outline-offset:3px;border-radius:6px}' +
      'html.mascota-eligiendo #activity .panel-body,html.mascota-eligiendo #activity .panel-body *{cursor:pointer!important}' +
      '.mascota-sobre{outline:3px dashed #38bdf8!important;outline-offset:4px;border-radius:8px;background-color:rgba(56,189,248,.08)!important}';
    document.head.appendChild(s);
  }

  // ---------- Voz del dispositivo (respaldo) ----------
  var voces = [];
  function cargarVoces() {
    if (!g.speechSynthesis) return;
    var p = function (v) { return (/natural|neural|enhanced|premium|mejorad|siri/i.test(v.name) ? 60 : 0) + (/online|google/i.test(v.name) ? 20 : 0) + (/es[-_](MX|US|419|EC|CO|PE)/i.test(v.lang) ? 10 : 0); };
    voces = speechSynthesis.getVoices().filter(function (v) { return /^es([-_]|$)/i.test(v.lang); }).sort(function (a, b) { return p(b) - p(a); });
  }

  g.MascotaLectura = {
    crear: function (o) {
      estilos();
      alSenalar = o.alSenalar || null;
      cargarVoces();
      if (g.speechSynthesis && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', cargarVoces);
      var r = { partes: [], i: 0, estado: 'quieto', natural: false, audios: {}, turno: 0, pausadoEn: null };
      var audio = null, analizador = null, muestras = null, ctx = null, sobre = null, bucleBoca = 0;
      var poner = function (e) { r.estado = e; if (o.alEstado) o.alEstado(e); };
      // Se llama dentro de un toque: así el celular deja sonar el audio.
      function prepararAudio() {
        if (!audio) {
          audio = new Audio();
          audio.preservesPitch = true;
          try {
            ctx = new (g.AudioContext || g.webkitAudioContext)();
            var fuente = ctx.createMediaElementSource(audio);
            analizador = ctx.createAnalyser(); analizador.fftSize = 512;
            muestras = new Uint8Array(analizador.fftSize);
            fuente.connect(analizador); analizador.connect(ctx.destination);
          } catch (e) { analizador = null; }
        }
        if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
      }
      // Boca: con voz natural, el volumen real del audio; con la del dispositivo, el ritmo de las palabras.
      var hablando = false, ultimaPalabra = 0;
      function animarBoca() {
        cancelAnimationFrame(bucleBoca);
        var paso = function () {
          var nivel = 0;
          if (hablando) {
            if (r.natural && analizador) {
              analizador.getByteTimeDomainData(muestras);
              var s = 0; for (var k = 0; k < muestras.length; k++) { var v = (muestras[k] - 128) / 128; s += v * v; }
              nivel = Math.min(1, Math.sqrt(s / muestras.length) * 5);
            } else {
              var t = (performance.now() - ultimaPalabra) / 160;
              nivel = t < 1 ? Math.sin(t * Math.PI) * 0.8 : 0.1;
            }
          }
          if (o.alBoca) o.alBoca(nivel, hablando);
          if (r.estado === 'leyendo' || r.estado === 'cargando') bucleBoca = requestAnimationFrame(paso);
          else if (o.alBoca) o.alBoca(0, false);
        };
        bucleBoca = requestAnimationFrame(paso);
      }
      function pedir(i) {
        var p = r.partes[i];
        if (!p || !o.voz) return null;
        if (!(i in r.audios)) r.audios[i] = Promise.resolve().then(function () { return o.voz(p.decir); }).catch(function () { return null; });
        return r.audios[i];
      }
      function leerRango(rango) {
        prepararAudio();
        var partes = partesDe(fichasDe(rango), o.letrasParte ? o.letrasParte() : LETRAS_PARTE);
        if (!partes.length) { if (o.alAviso) o.alAviso('No encontré texto ahí. Prueba con otro párrafo.'); return; }
        detener(true);
        if (o.antes) o.antes();
        r.partes = partes; r.i = 0; r.audios = {}; r.turno++;
        poner('cargando');
        animarBoca();
        pedir(0); pedir(1);
        leerParte();
      }
      function leerParte() {
        var mio = r.turno;
        if (r.estado !== 'leyendo' && r.estado !== 'cargando') return;
        if (r.i >= r.partes.length) return fin();
        var parte = r.partes[r.i];
        var pedido = pedir(r.i);
        pedir(r.i + 1); pedir(r.i + 2); // las siguientes se preparan mientras suena esta
        var espera = pedido ? Promise.race([pedido, new Promise(function (ok) { setTimeout(function () { ok(null); }, o.maxEspera ? o.maxEspera() : MAX_ESPERA); })]) : Promise.resolve(null);
        espera.then(function (url) {
          if (mio !== r.turno) return;
          poner('leyendo');
          return (url ? sonarNatural(parte, url) : sonarDispositivo(parte)).then(function (bien) {
            if (!bien || mio !== r.turno || r.estado !== 'leyendo') return;
            r.i++;
            leerParte();
          });
        });
      }
      function sonarNatural(parte, url) {
        return new Promise(function (ok) {
          var mio = r.turno, terminado = false, reloj = 0;
          r.natural = true;
          if (audio.src !== url) audio.src = url; // al seguir tras una pausa, el mismo audio continúa
          var acabar = function (bien) { if (terminado) return; terminado = true; hablando = false; audio.onended = audio.onerror = null; cancelAnimationFrame(reloj); ok(bien && mio === r.turno); };
          var seguir = function () {
            if (terminado) return;
            if (mio !== r.turno) return acabar(false);
            if (audio.duration && !audio.paused) marcar(parte, fichaEnProporcion(parte, (audio.currentTime - 0.12) / Math.max(0.3, audio.duration - 0.35)));
            reloj = requestAnimationFrame(seguir);
          };
          audio.onended = function () { acabar(true); };
          audio.onerror = function () { acabar(false); };
          hablando = true;
          var pr = audio.play();
          (pr && pr.then ? pr : Promise.resolve()).then(function () { reloj = requestAnimationFrame(seguir); }).catch(function () { acabar(false); });
        });
      }
      function sonarDispositivo(parte) {
        return new Promise(function (ok) {
          var mio = r.turno, terminado = false, avisa = false, reloj = 0;
          r.natural = false;
          var acabar = function (bien) { if (terminado) return; terminado = true; clearTimeout(reloj); hablando = false; ok(bien && mio === r.turno); };
          var tocar = function (f) { if (f) { marcar(parte, f); ultimaPalabra = performance.now(); } };
          if (!g.speechSynthesis) {
            hablando = true;
            var k = 0;
            var paso = function () { if (mio !== r.turno) return acabar(false); var f = parte.fichas[k++]; if (!f) return acabar(true); tocar(f); reloj = setTimeout(paso, (f.decir.length + 1.5) * MS_LETRA); };
            return paso();
          }
          speechSynthesis.cancel();
          var u = new SpeechSynthesisUtterance(parte.decir);
          if (voces[0]) u.voice = voces[0];
          u.lang = voces[0] ? voces[0].lang : 'es-ES';
          u.rate = 0.96; u.pitch = 1.04;
          // Si la voz no avisa cada palabra, el karaoke avanza con el tiempo estimado.
          var porTiempo = function (k) { if (avisa || terminado) return; var f = parte.fichas[k]; if (!f) return; tocar(f); reloj = setTimeout(function () { porTiempo(k + 1); }, (f.decir.length + 1.5) * MS_LETRA / u.rate); };
          u.onstart = function () { hablando = true; porTiempo(0); };
          u.onboundary = function (e) { if (e.name && e.name !== 'word') return; if (!avisa) { avisa = true; clearTimeout(reloj); } tocar(fichaEnPosicion(parte, e.charIndex)); };
          u.onend = function () { acabar(true); };
          u.onerror = function () { acabar(false); };
          setTimeout(function () { acabar(true); }, parte.decir.length * MS_LETRA * 2.4 / u.rate + 5000);
          setTimeout(function () { if (mio === r.turno) try { speechSynthesis.resume(); speechSynthesis.speak(u); } catch (e) { acabar(false); } }, 60);
        });
      }
      function fin() { detener(true); r.partes = []; poner('quieto'); }
      function detener(silencioso) {
        r.turno++;
        hablando = false;
        if (audio) audio.pause();
        if (g.speechSynthesis && (r.estado === 'leyendo' || r.estado === 'cargando')) speechSynthesis.cancel();
        r.audios = {};
        limpiar();
        elegir(false, true);
        if (!silencioso) poner('quieto');
      }
      function pausar() {
        if (r.estado !== 'leyendo' && r.estado !== 'cargando') return;
        r.turno++;
        hablando = false;
        if (r.natural && audio && !audio.paused) { audio.pause(); r.pausadoEn = audio.currentTime; }
        else { r.pausadoEn = null; if (g.speechSynthesis) speechSynthesis.cancel(); }
        poner('pausa');
      }
      function seguir() {
        if (r.estado !== 'pausa') return;
        prepararAudio();
        r.turno++;
        poner('leyendo');
        animarBoca();
        if (r.natural && r.pausadoEn != null && audio.src) {
          var mio = r.turno;
          audio.currentTime = r.pausadoEn;
          sonarNatural(r.partes[r.i], audio.src).then(function (bien) { if (bien && mio === r.turno && r.estado === 'leyendo') { r.i++; leerParte(); } });
        } else leerParte();
      }
      // ---------- 👆 Párrafo: tocar lo que se quiere escuchar ----------
      function bloqueBajo(el) {
        var z = zona();
        if (!el || !z || el === z || !z.contains(el) || (el.closest && el.closest('#mascota'))) return null;
        if (el.tagName === 'IMG') return (el.getAttribute('alt') || '').length > 15 ? el : null;
        var b = el.closest('p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, figcaption, label, dd');
        if (b && z.contains(b)) return b;
        var d = el.closest('div');
        return d && d !== z && z.contains(d) && d.textContent.trim().length > 2 ? d : null;
      }
      // Lo que hay bajo el dedo a cualquier profundidad (a veces una capa transparente queda encima).
      function bloqueEn(e) {
        var pila = document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY) : [e.target];
        for (var i = 0; i < pila.length; i++) { var b = bloqueBajo(pila[i]); if (b) return b; }
        var z = zona();
        if (z) { var imgs = z.querySelectorAll('img[alt]'); for (var k = 0; k < imgs.length; k++) { var q = imgs[k].getBoundingClientRect(); if (e.clientX >= q.left && e.clientX <= q.right && e.clientY >= q.top && e.clientY <= q.bottom && bloqueBajo(imgs[k])) return imgs[k]; } }
        return null;
      }
      var eligiendo = false;
      function elegir(si, silencioso) {
        eligiendo = si;
        document.documentElement.classList.toggle('mascota-eligiendo', si);
        if (!si && sobre) { sobre.classList.remove('mascota-sobre'); sobre = null; }
        if (!silencioso) poner(si ? 'eligiendo' : 'quieto');
      }
      document.addEventListener('mousemove', function (e) {
        if (!eligiendo) return;
        var b = bloqueEn(e);
        if (b === sobre) return;
        if (sobre) sobre.classList.remove('mascota-sobre');
        sobre = b;
        if (b) b.classList.add('mascota-sobre');
      }, true);
      document.addEventListener('click', function (e) {
        if (!eligiendo || (e.target.closest && e.target.closest('#mascota'))) return;
        var b = bloqueEn(e);
        e.preventDefault(); e.stopPropagation();
        elegir(false, true);
        if (!b) { poner('quieto'); return; }
        var rg = document.createRange();
        rg.selectNode(b);
        leerRango(rg);
      }, true);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && (eligiendo || r.estado !== 'quieto')) { if (eligiendo) elegir(false); else detener(); } });
      document.addEventListener('visibilitychange', function () { if (document.hidden) pausar(); });
      g.addEventListener('pagehide', function () { detener(true); });
      return {
        parrafo: function () { prepararAudio(); if (r.estado === 'leyendo' || r.estado === 'cargando' || r.estado === 'pausa') detener(true); elegir(true); },
        todo: function () { var z = zona(); if (!z) return; elegir(false, true); var rg = document.createRange(); rg.selectNodeContents(z); leerRango(rg); },
        pausar: pausar, seguir: seguir,
        detener: function () { detener(); },
        cancelarEleccion: function () { elegir(false); },
        estado: function () { return r.estado; },
      };
    },
  };
})(window);
