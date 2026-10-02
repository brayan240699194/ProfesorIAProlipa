/* =========================================================================
   ENTREVISTA A UN PERSONAJE CON IA — js/entrevista/entrevista.js (entrada)
   -------------------------------------------------------------------------
   Un personaje de la ciencia (recreación con IA: Charles Darwin, Rosalind
   Franklin…) vive abajo a la derecha de cada actividad. Al tocarlo se abre
   un aula: el personaje, de cuerpo entero, da la clase junto a una pizarra
   donde anota las ideas clave mientras explica. El estudiante pregunta por
   voz (micrófono) o escribiendo, y el personaje responde hablando. Al
   terminar, se despide y deja un resumen de la clase.

   Activación automática: js/toolbar-tooltips.js lo inyecta en todas las
   actividades. A mano:
     <script src="js/entrevista/entrevista.js?v=14" defer></script>
   (opcional data-config="js/entrevista/otra-config.js").
   Carga config.js (fresco), personajes.js y reglas.js; ia.js solo al abrir.
   Una actividad puede pedir un personaje: <body data-entrevista-personaje="franklin">
   ========================================================================= */
(function () {
  'use strict';
  if (window.__entrevistaProlipa) return;
  window.__entrevistaProlipa = true;

  var script = document.currentScript;
  var src = script ? script.src : '';
  var carpeta = src.split('?')[0].replace(/[^/]*$/, '');
  var version = src.indexOf('?') >= 0 ? '?' + src.split('?')[1] : '';
  var configAtributo = script && script.getAttribute('data-config');

  function cargar(url) {
    return new Promise(function (ok, falla) {
      var s = document.createElement('script');
      s.src = url;
      s.async = false;
      s.onload = ok;
      s.onerror = function () { falla(new Error('Entrevista: no se pudo cargar ' + url)); };
      document.head.appendChild(s);
    });
  }
  var cargas = [cargar(carpeta + 'personajes.js' + version), cargar(carpeta + 'reglas.js' + version)];
  if (!window.ENTREVISTA_CONFIG || configAtributo) cargas.unshift(cargar((configAtributo || carpeta + 'config.js') + '?t=' + Date.now()));
  // Clave de pruebas (js/entrevista/config.local.js, no se sube a git): se
  // busca SOLO en tu computadora (archivo, localhost o red local) o por el
  // túnel de puertos de VS Code (*.devtunnels.ms, para probar desde otro
  // dispositivo). Publicado (GitHub Pages) nunca se pide: se usa el servidor
  // de config.js (proxyUrl).
  var enLocal = location.protocol === 'file:' || /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(location.hostname) || /\.devtunnels\.ms$/.test(location.hostname);
  function cargarSecretos() {
    var ia = (window.ENTREVISTA_CONFIG && window.ENTREVISTA_CONFIG.ia) || {};
    if (!enLocal || window.ENTREVISTA_SECRETOS || ia.activa === false) return Promise.resolve();
    return cargar(carpeta + 'config.local.js?t=' + Date.now()).catch(function () {});
  }
  function aplicarSecretos() {
    var S = enLocal && window.ENTREVISTA_SECRETOS, C = window.ENTREVISTA_CONFIG;
    if (!S || !S.ia || !C) return;
    C.ia = C.ia || {};
    // Con clave local se llama directo a Gemini (no hace falta el servidor),
    // salvo que config.local.js indique su propio proxyUrl.
    if (S.ia.apiKey && S.ia.proxyUrl == null) C.ia.proxyUrl = '';
    for (var k in S.ia) if (S.ia[k] !== '' && S.ia[k] != null) C.ia[k] = S.ia[k];
  }
  Promise.all(cargas).then(cargarSecretos).then(function () {
    aplicarSecretos();
    var ia = (window.ENTREVISTA_CONFIG && window.ENTREVISTA_CONFIG.ia) || {};
    if (!enLocal && !ia.proxyUrl && ia.activa !== false && window.console) console.warn('Entrevista: falta la dirección del servidor intermedio en js/entrevista/config.js (ia.proxyUrl). Sin ella, la IA no funciona publicada. Ver js/entrevista/README.md → "Publicar en GitHub Pages".');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
  }).catch(function (err) { if (window.console) console.warn(err); });

  // ---------- Utilidades ----------
  function almacen(tipo) { try { return window[tipo] || null; } catch (e) { return null; } }
  var LS = almacen('localStorage'), SS = almacen('sessionStorage');
  function leer(st, k) { try { return st ? JSON.parse(st.getItem(k)) : null; } catch (e) { return null; } }
  function guardar(st, k, v) { try { if (st) st.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function borrar(st, k) { try { if (st) st.removeItem(k); } catch (e) {} }
  function el(tag, clase, texto) {
    var e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  }
  var FOCO = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-600';
  var MOVIMIENTO = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function estilos() {
    // Letra de tiza para la pizarra (si no carga, usa una cursiva del equipo).
    var f = document.createElement('link');
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap';
    document.head.appendChild(f);
    var s = document.createElement('style');
    s.id = 'entrevista-ia-estilos';
    s.textContent =
      '#entrevista-ia [data-parte]{transform-box:fill-box}' +
      '#entrevista-ia [data-parte=ojos]{transform-origin:50% 50%}' +
      // Articulaciones: hombro, codo, cadera y cuello (personajes.js).
      '#entrevista-ia [data-parte=cabeza]{transform-origin:50% 100%;transition:transform .5s ease}' +
      '#entrevista-ia [data-parte=brazo]{transform-origin:80% 4%;transition:transform .6s cubic-bezier(.35,1.2,.5,1)}' +
      '#entrevista-ia [data-parte=antebrazo]{transform-origin:50% 4%;transition:transform .55s ease}' +
      '#entrevista-ia [data-parte=brazo-libre]{transform-origin:20% 4%;transition:transform .6s cubic-bezier(.35,1.2,.5,1)}' +
      '#entrevista-ia [data-parte=antebrazo-libre]{transform-origin:50% 4%;transition:transform .55s ease}' +
      '#entrevista-ia [data-parte^=pierna]{transform-origin:50% 0%;transition:transform .7s ease}' +
      '#entrevista-ia [data-parte=superior]{transform-origin:50% 100%;transition:transform .8s ease}' +
      '#entrevista-ia .ent-figura{transition:transform .9s ease-in-out}' +
      '.ent-tiza{font-family:Caveat,"Segoe Print","Comic Sans MS",cursive;font-weight:700;color:#fff;text-shadow:0 0 2px rgba(255,255,255,.35)}' +
      // misEstilos.css fuerza li { color: #333 !important }: en la pizarra, tiza blanca.
      '#entrevista-ia .ent-tiza li,#entrevista-ia .ent-tiza li span{color:#fff!important;font-style:normal}' +
      '.ent-pizarra{background:radial-gradient(ellipse at 30% 20%,#2f5a45,#1d3b2c 70%);box-shadow:inset 0 0 18px rgba(0,0,0,.45)}' +
      '.ent-aula{background:linear-gradient(#f3ece1,#e9dfcf 78%,#c9b293 78%,#b89c79)}' +
      '@keyframes ent-flota{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}' +
      '@keyframes ent-pulso{0%{box-shadow:0 0 0 0 var(--ent-color)}100%{box-shadow:0 0 0 14px rgba(0,0,0,0)}}' +
      '@keyframes ent-mic{0%{box-shadow:0 0 0 0 rgba(220,38,38,.55)}100%{box-shadow:0 0 0 14px rgba(220,38,38,0)}}' +
      '@keyframes ent-salto{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}' +
      '@keyframes ent-entra{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}' +
      '.ent-flota{animation:ent-flota 3.2s ease-in-out infinite}' +
      '.ent-habla{animation:ent-pulso 1.2s ease-out infinite}' +
      '.ent-mic-on{animation:ent-mic 1.2s ease-out infinite}' +
      '.ent-puntos span{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:currentColor;animation:ent-salto 1s infinite}' +
      '.ent-puntos span:nth-child(2){animation-delay:.15s}.ent-puntos span:nth-child(3){animation-delay:.3s}' +
      '.ent-entra{animation:ent-entra .22s ease-out}' +
      '@media (prefers-reduced-motion:reduce){#entrevista-ia *{animation:none!important;transition:none!important}}' +
      '@media print{#entrevista-ia{display:none!important}}';
    document.head.appendChild(s);
  }

  function iniciar() {
    var C = window.ENTREVISTA_CONFIG;
    if (!C || !C.personajes || document.getElementById('entrevista-ia')) return;
    C.ia = C.ia || {};
    C.libro = C.libro || {};
    C.entrevista = C.entrevista || {};
    C.voz = C.voz || {};
    C.microfono = C.microfono || {};
    C.mensajes = C.mensajes || {};
    var E = C.entrevista;
    if (E.activo === false) return;
    var Dib = window.EntrevistaPersonajes;
    var R = window.EntrevistaReglas;
    var idLibro = C.libro.id || 'libro';
    var pagina = location.pathname.split('/').pop() || 'index';
    var maxPreguntas = Number(E.maxPreguntas) || 15;
    var maxCaracteres = Number(E.maxCaracteres) || 300;
    var CLAVE_PREF = 'prolipa-entrevista:' + idLibro;
    var prefs = leer(LS, CLAVE_PREF) || {};
    if (typeof prefs.voz !== 'boolean') prefs.voz = C.voz.leerRespuestas !== false;
    var tituloClase = (document.title || 'La clase de hoy').split(/[:·|–-]/)[0].trim().slice(0, 48);

    // ---------- Personaje ----------
    var forzado = document.body.getAttribute('data-entrevista-personaje');
    function elegibles() { return (C.elegibles || Object.keys(C.personajes)).filter(function (k) { return C.personajes[k]; }); }
    function elegirPersonaje() {
      if (forzado && C.personajes[forzado]) return forzado;
      if (prefs.personaje && C.personajes[prefs.personaje] && elegibles().indexOf(prefs.personaje) >= 0) return prefs.personaje;
      return C.personajes[C.personaje] ? C.personaje : Object.keys(C.personajes)[0];
    }
    var idP = elegirPersonaje();
    var P = C.personajes[idP];

    // ---------- Sesión de la clase (por actividad y personaje) ----------
    var ses;
    function claveSes() { return 'prolipa-entrevista-ses:' + idLibro + ':' + pagina + ':' + idP; }
    function cargarSes() {
      ses = leer(SS, claveSes()) || {};
      ses.historial = Array.isArray(ses.historial) ? ses.historial : [];
      ses.preguntas = Number(ses.preguntas) || 0;
    }
    function guardarSes() { guardar(SS, claveSes(), ses); }
    cargarSes();

    var IA = null; // window.EntrevistaIA, al abrir
    var cargaIA = null;
    function prepararIA() {
      if (IA) return Promise.resolve(IA);
      cargaIA = cargaIA || cargar(carpeta + 'ia.js' + version).then(function () {
        IA = window.EntrevistaIA;
        IA.iniciar(C);
        return IA;
      });
      return cargaIA;
    }
    function iaConfigurada() { return !!(C.ia.activa !== false && (C.ia.proxyUrl || C.ia.apiKey)); }

    estilos();
    var raiz = el('div', 'print:hidden');
    raiz.id = 'entrevista-ia';
    document.body.appendChild(raiz);

    // =================================================================
    // ANIMACIÓN DE LOS DIBUJOS (botón, cabecera y aula)
    // =================================================================
    var figuras = [];
    var PARTES = { brazo: 'brazo', ante: 'antebrazo', libre: 'brazo-libre', anteLibre: 'antebrazo-libre', piernaI: 'pierna-izq', piernaD: 'pierna-der', superior: 'superior', cabeza: 'cabeza' };
    function registrar(contenedor) {
      var svg = contenedor.querySelector('svg');
      if (!svg) return;
      var f = {
        svg: svg,
        ojos: svg.querySelector('[data-parte=ojos]'),
        bocaA: svg.querySelector('[data-parte=boca-abierta]'),
        bocaC: svg.querySelector('[data-parte=boca-cerrada]'),
      };
      for (var k in PARTES) f[k] = svg.querySelector('[data-parte="' + PARTES[k] + '"]');
      figuras.push(f);
    }
    function vivas() {
      figuras = figuras.filter(function (f) { return document.contains(f.svg); });
      return figuras;
    }
    // Postura: grados por articulación; las que no se nombran vuelven a 0.
    function pose(p) {
      p = p || {};
      vivas().forEach(function (f) {
        for (var k in PARTES) if (f[k]) f[k].style.transform = p[k] ? 'rotate(' + p[k] + 'deg)' : '';
      });
    }
    function parpadear() {
      if (MOVIMIENTO) vivas().forEach(function (f) {
        if (f.ojos && f.ojos.animate) f.ojos.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.1)' }, { transform: 'scaleY(1)' }], { duration: 170 });
      });
      setTimeout(parpadear, 2500 + Math.random() * 3500);
    }
    setTimeout(parpadear, 1800);
    var relojBoca = null, finBoca = null;
    function boca(abierta) {
      vivas().forEach(function (f) {
        if (f.bocaA) f.bocaA.setAttribute('opacity', abierta ? '1' : '0');
        if (f.bocaC) f.bocaC.setAttribute('opacity', abierta ? '0' : '1');
      });
    }
    // Mueve la boca mientras habla; ms = por cuánto tiempo (sin voz).
    function moverBoca(on, ms) {
      clearInterval(relojBoca);
      clearTimeout(finBoca);
      if (!on || !MOVIMIENTO) return boca(false);
      var abierta = false;
      relojBoca = setInterval(function () { abierta = !abierta && Math.random() > 0.2; boca(abierta); }, 120 + Math.random() * 60);
      if (ms) finBoca = setTimeout(function () { moverBoca(false); }, ms);
    }

    // ---------- Cuerpo: posturas según lo que hace ----------
    // Gestos de explicar: manos al frente, como un profesor.
    var GESTOS = [
      { libre: -8, anteLibre: 70 },
      { libre: -12, anteLibre: 100, cabeza: 2 },
      { brazo: 8, ante: -70, libre: -6, anteLibre: 40 },
      { brazo: 10, ante: -95, cabeza: -2 },
      { libre: -18, anteLibre: -12, cabeza: -2 },
      { brazo: 6, ante: -60, libre: -8, anteLibre: 65 },
      { piernaD: 3, superior: -1, libre: -10, anteLibre: 85 },
    ];
    var modo = 'reposo', modoBase = 'reposo', relojCuerpo = null, escribiendo = false;
    function animar(m) {
      modo = m;
      clearTimeout(relojCuerpo);
      if (!MOVIMIENTO) return pose({});
      siguientePose();
    }
    function siguientePose() {
      var espera;
      if (modo === 'hablando') {
        pose(GESTOS[Math.floor(Math.random() * GESTOS.length)]);
        espera = 900 + Math.random() * 800;
      } else if (modo === 'escribiendo') {
        // Brazo arriba y la mano se mueve un poco: está escribiendo con la tiza.
        pose({ brazo: 62 + Math.random() * 8, ante: 2 + Math.random() * 12, piernaI: -2, superior: 1 });
        espera = 230;
      } else if (modo === 'escuchando') {
        pose({ cabeza: -6, libre: 12, anteLibre: 150 }); // mano al mentón
        espera = 5000;
      } else if (modo === 'pensando') {
        pose({ cabeza: 4, libre: 10, anteLibre: 140, piernaI: -2, superior: 1 });
        espera = 5000;
      } else {
        // En reposo: cambia el peso de un pie al otro y mira alrededor.
        var r = Math.random();
        pose(r < 0.32 ? { piernaD: 4, piernaI: -1.5, superior: -1.3 }
          : r < 0.6 ? { piernaI: -4, piernaD: 1.5, superior: 1.3 }
            : r < 0.72 ? { cabeza: 3 }
              : r < 0.84 ? { libre: -8, anteLibre: 60 }
                : {});
        espera = 2400 + Math.random() * 2600;
      }
      relojCuerpo = setTimeout(siguientePose, espera);
    }
    // El estado de base (hablar, escuchar…) espera si está escribiendo.
    function cambiarModo(m) {
      modoBase = m;
      if (!escribiendo) animar(m);
    }
    // Camina hasta dx píxeles (negativo = hacia la pizarra) moviendo las piernas.
    function caminar(dx, alLlegar) {
      var dur = MOVIMIENTO ? 900 : 0;
      figura.style.transform = dx ? 'translateX(' + dx + 'px)' : '';
      if (MOVIMIENTO) vivas().forEach(function (f) {
        var paso = function (g) { return [{ transform: 'rotate(0)' }, { transform: 'rotate(' + g + 'deg)' }, { transform: 'rotate(' + -g + 'deg)' }, { transform: 'rotate(0)' }]; };
        if (f.piernaI && f.piernaI.animate) f.piernaI.animate(paso(9), { duration: 450, iterations: 2 });
        if (f.piernaD && f.piernaD.animate) f.piernaD.animate(paso(-9), { duration: 450, iterations: 2 });
        if (f.superior && f.superior.animate) f.superior.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-1.5px)' }, { transform: 'translateY(0)' }], { duration: 450, iterations: 2 });
      });
      setTimeout(function () { if (alLlegar) alLlegar(); }, dur);
    }
    function saludarMano() {
      if (!MOVIMIENTO) return;
      clearTimeout(relojCuerpo);
      pose({ libre: -145, anteLibre: -10, cabeza: 3 });
      vivas().forEach(function (f) {
        if (f.anteLibre && f.anteLibre.animate) setTimeout(function () {
          f.anteLibre.animate([{ transform: 'rotate(-10deg)' }, { transform: 'rotate(-38deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(-30deg)' }, { transform: 'rotate(-10deg)' }], { duration: 1300, easing: 'ease-in-out' });
        }, 450);
      });
      relojCuerpo = setTimeout(function () { animar(modo); }, 2000);
    }

    // =================================================================
    // BOTÓN FLOTANTE Y BURBUJA DE SALUDO
    // =================================================================
    // Contenedor del bot: el botón del personaje y, encima, una ✕ pequeña para
    // ocultarlo (en computadora aparece al pasar el mouse; en celular, siempre).
    var bot = el('div', 'group fixed bottom-4 right-4 z-[900]');
    var boton = el('button', 'ent-flota relative block w-[72px] h-[72px] rounded-full bg-white shadow-lg ring-4 overflow-visible transition hover:scale-105 ' + FOCO);
    boton.type = 'button';
    var marco = el('span', 'block w-full h-full rounded-full overflow-hidden');
    boton.appendChild(marco);
    var btnOcultar = el('button', 'absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-700/90 hover:bg-slate-900 text-white text-[11px] leading-none shadow transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 ' + FOCO, '✕');
    btnOcultar.type = 'button';
    btnOcultar.setAttribute('aria-label', 'Ocultar al personaje');
    btnOcultar.title = 'Ocultar al personaje';
    bot.appendChild(boton);
    bot.appendChild(btnOcultar);
    raiz.appendChild(bot);
    // Oculto: solo una pestaña pequeña en el borde para volver a mostrarlo.
    var pestana = el('button', 'hidden fixed bottom-6 right-0 z-[900] flex items-center gap-1 rounded-l-full bg-white/95 pl-1.5 pr-2 py-1 shadow-lg ring-1 ring-slate-200 opacity-70 hover:opacity-100 transition ' + FOCO);
    pestana.type = 'button';
    pestana.setAttribute('aria-label', 'Mostrar al personaje de la clase');
    pestana.title = 'Mostrar al personaje de la clase';
    var pestanaCara = el('span', 'block w-7 h-7 rounded-full overflow-hidden');
    pestana.appendChild(pestanaCara);
    pestana.appendChild(el('span', 'text-[11px] font-bold text-slate-600', '‹'));
    raiz.appendChild(pestana);

    var burbuja = el('div', 'hidden ent-entra fixed bottom-24 right-4 sm:bottom-6 sm:right-[96px] z-[900] max-w-[250px] rounded-2xl rounded-br-md bg-white px-3 py-2 pr-7 text-sm leading-snug text-slate-800 shadow-lg ring-1 ring-slate-200');
    var burbujaTxt = el('p', 'cursor-pointer');
    var burbujaX = el('button', 'absolute top-1 right-1 w-6 h-6 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs ' + FOCO, '✕');
    burbujaX.type = 'button';
    burbujaX.setAttribute('aria-label', 'Cerrar saludo');
    burbuja.appendChild(burbujaTxt);
    burbuja.appendChild(burbujaX);
    burbuja.setAttribute('role', 'status');
    raiz.appendChild(burbuja);
    var relojBurbuja = null;
    function decir(texto) {
      burbujaTxt.textContent = texto;
      burbuja.classList.remove('hidden');
      clearTimeout(relojBurbuja);
      moverBoca(true, Math.min(3500, texto.length * 45));
      relojBurbuja = setTimeout(function () { burbuja.classList.add('hidden'); }, (E.burbujaSegundos || 8) * 1000);
    }
    burbujaX.addEventListener('click', function () { burbuja.classList.add('hidden'); });
    burbujaTxt.addEventListener('click', function () { abrir(); });

    // =================================================================
    // PANEL: cabecera · aula (pizarra + personaje) · conversación
    // =================================================================
    // z-index 901: sobre la barra del libro (500-600) y bajo su ventana Guardar (1000).
    var panel = el('section', 'hidden ent-entra fixed z-[901] inset-x-0 bottom-0 h-[92dvh] rounded-t-3xl sm:inset-x-auto sm:right-4 sm:bottom-24 sm:w-[460px] sm:h-[min(760px,calc(100dvh-6.5rem))] sm:rounded-3xl bg-slate-50 shadow-2xl ring-1 ring-slate-200 flex flex-col overflow-hidden');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    raiz.appendChild(panel);

    var cab = el('div', 'flex-none flex items-center gap-2.5 px-3 py-2 text-white');
    var avatar = el('div', 'flex-none w-11 h-11 rounded-full bg-white/95 overflow-hidden ring-2 ring-white/70');
    var cabInfo = el('div', 'flex-1 min-w-0');
    var cabNombre = el('h2', 'font-extrabold text-[15px] leading-tight');
    var cabAviso = el('p', 'text-[11px] leading-tight text-white/90');
    cabInfo.appendChild(cabNombre);
    cabInfo.appendChild(cabAviso);
    function botonCab(txt, etiqueta) {
      var b = el('button', 'flex-none w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-base ' + FOCO.replace('ring-sky-600', 'ring-white'), txt);
      b.type = 'button';
      b.setAttribute('aria-label', etiqueta);
      b.title = etiqueta;
      return b;
    }
    var btnVoz = botonCab('🔊', 'Leer las respuestas en voz alta');
    btnVoz.setAttribute('role', 'switch');
    var btnMenu = botonCab('⋯', 'Más opciones');
    btnMenu.setAttribute('aria-haspopup', 'true');
    btnMenu.setAttribute('aria-expanded', 'false');
    var btnCerrar = botonCab('✕', 'Cerrar la clase');
    cab.appendChild(avatar);
    cab.appendChild(cabInfo);
    cab.appendChild(btnVoz);
    cab.appendChild(btnMenu);
    cab.appendChild(btnCerrar);
    panel.appendChild(cab);

    var menu = el('div', 'hidden absolute right-3 top-[3.6rem] z-20 w-64 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200 text-sm');
    menu.setAttribute('role', 'menu');
    panel.appendChild(menu);

    // Aula: pizarra a la izquierda y el personaje de pie a la derecha. Su alto
    // se ajusta a la pantalla (24 % del alto, entre 120 y 220 px) para que la
    // conversación siempre tenga espacio; la figura mide lo mismo que el aula.
    var aula = el('div', 'ent-aula relative flex-none overflow-hidden border-b border-slate-200');
    aula.style.height = 'clamp(120px, 24vh, 220px)';
    var anchoFigura = 'clamp(54px, 10.8vh, 99px)'; // = 0,45 × alto del aula
    var pizarra = el('div', 'ent-pizarra ent-tiza absolute left-3 top-2.5 bottom-[22%] rounded-md border-[5px] border-[#8b5a2b] px-3 py-1 overflow-hidden');
    pizarra.style.right = 'calc(' + anchoFigura + ' + 20px)';
    pizarra.setAttribute('aria-label', 'Pizarra');
    var pizTitulo = el('p', 'leading-tight border-b border-white/40 pb-0.5 mb-0.5 truncate');
    pizTitulo.style.fontSize = 'clamp(14px, 2.4vh, 22px)';
    var pizLista = el('ul', 'leading-[1.12] space-y-0.5');
    pizLista.style.fontSize = 'clamp(13px, 2.1vh, 20px)';
    pizLista.setAttribute('aria-live', 'polite');
    pizarra.appendChild(pizTitulo);
    pizarra.appendChild(pizLista);
    var repisa = el('div', 'absolute left-2 h-2 rounded-sm bg-[#7a4a22] shadow');
    repisa.style.bottom = 'calc(22% - 7px)';
    repisa.style.right = 'calc(' + anchoFigura + ' + 14px)';
    repisa.innerHTML = '<span class="absolute left-6 -top-1 w-5 h-1.5 rounded-sm bg-white/90"></span><span class="absolute left-14 -top-1 w-3 h-1.5 rounded-sm bg-yellow-100"></span><span class="absolute right-6 -top-1.5 w-7 h-2.5 rounded-sm bg-slate-700"></span>';
    var figura = el('div', 'ent-figura absolute right-2 bottom-0.5');
    figura.style.height = 'calc(100% - 6px)';
    figura.style.width = anchoFigura;
    // Lo que está haciendo el personaje ("Explicando…"), sobre el piso del aula.
    var estadoPill = el('p', 'hidden absolute left-3 bottom-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm');
    estadoPill.setAttribute('aria-live', 'polite');
    aula.appendChild(pizarra);
    aula.appendChild(repisa);
    aula.appendChild(figura);
    aula.appendChild(estadoPill);
    panel.appendChild(aula);

    var log = el('div', 'flex-1 min-h-[110px] overflow-y-auto px-3 py-2.5 space-y-2.5');
    log.setAttribute('role', 'log');
    log.setAttribute('aria-label', 'Conversación de la clase');
    panel.appendChild(log);

    // Dos sugerencias, en tarjetas sencillas.
    var zonaSug = el('div', 'flex-none grid grid-cols-2 gap-2 px-3 pb-2 empty:hidden');
    zonaSug.setAttribute('aria-label', 'Preguntas sugeridas');
    panel.appendChild(zonaSug);

    var pie = el('div', 'flex-none border-t border-slate-200 bg-white px-3 pt-2 pb-2 space-y-0.5');
    var fila = el('form', 'flex items-center gap-2');
    fila.setAttribute('autocomplete', 'off');
    var btnMic = el('button', 'flex-none w-12 h-12 rounded-full text-white text-xl shadow transition disabled:opacity-40 ' + FOCO, '🎤');
    btnMic.type = 'button';
    var entrada = el('input', 'flex-1 min-w-0 h-12 rounded-full border border-slate-300 bg-slate-50 px-4 text-sm ' + FOCO);
    entrada.type = 'text';
    entrada.maxLength = maxCaracteres;
    entrada.setAttribute('aria-label', 'Tu pregunta');
    var btnEnviar = el('button', 'flex-none w-12 h-12 rounded-full text-white text-lg shadow disabled:opacity-40 ' + FOCO, '➤');
    btnEnviar.type = 'submit';
    btnEnviar.setAttribute('aria-label', 'Enviar pregunta');
    fila.appendChild(btnMic);
    fila.appendChild(entrada);
    fila.appendChild(btnEnviar);
    var micInfo = el('p', 'text-[11px] leading-tight text-slate-600 empty:hidden');
    micInfo.setAttribute('aria-live', 'polite');
    var info = el('div', 'flex items-center justify-between gap-2 text-[11px] text-slate-500');
    var contador = el('span', '');
    var btnTerminar = el('button', 'font-bold text-slate-700 hover:underline disabled:opacity-40 disabled:no-underline ' + FOCO, '📝 Terminar la clase');
    btnTerminar.type = 'button';
    info.appendChild(contador);
    info.appendChild(btnTerminar);
    pie.appendChild(fila);
    pie.appendChild(micInfo);
    pie.appendChild(info);
    panel.appendChild(pie);

    // ---------- Pintar el personaje ----------
    function oscuro() { return Dib.mezclar(P.color || '#92400e', '#000', 0.35); }
    function cuerpoEntero(contenedor) {
      if (P.ilustracion) {
        var img = el('img', 'w-full h-full object-contain object-bottom');
        img.src = P.ilustracion;
        img.alt = '';
        contenedor.innerHTML = '';
        contenedor.appendChild(img);
      } else {
        contenedor.innerHTML = Dib.dibujar(P);
        registrar(contenedor);
      }
    }
    function retrato(contenedor) {
      contenedor.innerHTML = Dib.dibujar(P, { cara: true });
      registrar(contenedor);
    }
    function pintarPersonaje() {
      var color = P.color || '#92400e';
      figuras = [];
      retrato(marco);
      marco.style.background = Dib.mezclar(color, '#fff', 0.85);
      retrato(pestanaCara);
      pestanaCara.style.background = Dib.mezclar(color, '#fff', 0.85);
      boton.style.setProperty('--tw-ring-color', color);
      boton.style.setProperty('--ent-color', color + '88');
      boton.setAttribute('aria-label', 'Abrir la clase con ' + P.nombre);
      retrato(avatar);
      cuerpoEntero(figura);
      cab.style.background = 'linear-gradient(135deg,' + color + ',' + oscuro() + ')';
      cabNombre.textContent = P.nombre;
      panel.setAttribute('aria-label', 'Clase con ' + P.nombre);
      cabAviso.textContent = '🎭 Recreación con IA (' + String(P.epoca || '').split(';')[0] + ') · no es la persona real';
      cabAviso.title = 'Recreación con IA de ' + P.nombre + '. No es la persona real y puede equivocarse: contrasta con tu libro.';
      figura.style.transform = '';
      btnMic.style.background = color;
      btnEnviar.style.background = color;
    }

    // ---------- Pizarra ----------
    var relojTiza = null;
    function escribirPizarra(items, animado) {
      clearInterval(relojTiza);
      if (escribiendo) { escribiendo = false; caminar(0); animar(modoBase); }
      pizTitulo.textContent = tituloClase;
      pizLista.innerHTML = '';
      items = (items || []).slice(0, 3);
      if (!items.length) return;
      var lis = items.map(function (t) {
        var li = el('li', 'flex gap-1.5');
        li.appendChild(el('span', 'flex-none opacity-80', '•'));
        var span = el('span', '');
        li.appendChild(span);
        pizLista.appendChild(li);
        return { span: span, texto: t };
      });
      if (!animado || !MOVIMIENTO) { lis.forEach(function (x) { x.span.textContent = x.texto; }); return; }
      // Camina hasta la pizarra, escribe letra por letra con la tiza y vuelve.
      escribiendo = true;
      caminar(-Math.round(figura.offsetWidth * 0.3), function () {
        if (!escribiendo) return;
        animar('escribiendo');
        var i = 0, k = 0;
        relojTiza = setInterval(function () {
          if (i >= lis.length) {
            clearInterval(relojTiza);
            escribiendo = false;
            caminar(0);
            animar(modoBase);
            return;
          }
          k++;
          lis[i].span.textContent = lis[i].texto.slice(0, k);
          if (k >= lis[i].texto.length) { i++; k = 0; }
        }, 40);
      });
    }

    // ---------- Estado visible ----------
    function estado(tipo, texto) {
      estadoPill.textContent = texto || '';
      estadoPill.classList.toggle('hidden', !texto);
      boton.classList.toggle('ent-habla', tipo === 'hablando');
      cambiarModo(tipo || 'reposo');
      if (tipo !== 'hablando') moverBoca(false);
    }
    function pintarVoz() {
      var hay = IA ? IA.hayVoz() : true;
      btnVoz.classList.toggle('hidden', !hay);
      btnVoz.setAttribute('aria-checked', prefs.voz ? 'true' : 'false');
      btnVoz.textContent = prefs.voz ? '🔊' : '🔈';
      btnVoz.title = prefs.voz ? 'Voz activada (toca para silenciar)' : 'Voz desactivada (toca para activarla)';
    }
    function hablarPersonaje(texto) {
      if (!IA || !prefs.voz || !IA.hayVoz()) {
        // Sin voz: mueve la boca y gesticula un momento.
        var ms = Math.min(5000, texto.length * 45);
        moverBoca(true, ms);
        cambiarModo('hablando');
        setTimeout(function () { if (modoBase === 'hablando') cambiarModo('reposo'); }, ms);
        return;
      }
      IA.hablar(texto, {
        voz: P.voz,
        genero: P.genero,
        alEstado: function (e) {
          if (e === 'preparando') estado('pensando', '⏳ Preparando la voz…');
          else if (e === 'hablando') { estado('hablando', '🔊 Explicando…'); moverBoca(true); }
          else estado('', textoReposo());
        },
      });
    }
    function textoReposo() { return ses.cerrada ? '✅ Clase terminada' : ''; }

    // ---------- Mensajes ----------
    function burbujaMsg(rol, texto) {
      var esP = rol === 'personaje';
      var f = el('div', 'flex gap-2 items-end ent-entra ' + (esP ? 'justify-start' : 'justify-end'));
      if (esP) {
        var mini = el('div', 'flex-none w-7 h-7 rounded-full overflow-hidden bg-white ring-1 ring-slate-200');
        mini.innerHTML = Dib.dibujar(P, { cara: true });
        f.appendChild(mini);
      }
      var b = el('div', 'max-w-[84%] rounded-2xl px-3 py-2 text-sm leading-snug shadow-sm ' +
        (esP ? 'bg-white text-slate-900 ring-1 ring-slate-200 rounded-bl-md' : 'text-white rounded-br-md'));
      if (!esP) b.style.background = P.color || '#92400e';
      b.appendChild(el('span', 'sr-only', esP ? P.nombre + ': ' : 'Tú: '));
      b.appendChild(document.createTextNode(texto));
      f.appendChild(b);
      log.appendChild(f);
      log.scrollTop = log.scrollHeight;
      return f;
    }
    function avisoMsg(texto, accion) {
      var f = el('div', 'ent-entra rounded-2xl bg-rose-50 ring-1 ring-rose-200 px-3 py-2 text-xs text-rose-900');
      f.setAttribute('role', 'alert');
      f.appendChild(el('p', '', texto));
      if (accion) {
        var b = el('button', 'mt-1 font-extrabold underline ' + FOCO, 'Reintentar');
        b.type = 'button';
        b.addEventListener('click', function () { f.remove(); accion(); });
        f.appendChild(b);
      }
      log.appendChild(f);
      log.scrollTop = log.scrollHeight;
      return f;
    }
    var pensandoEl = null;
    function pensando(on, texto) {
      if (pensandoEl) { pensandoEl.remove(); pensandoEl = null; }
      if (!on) return;
      pensandoEl = el('div', 'flex items-center gap-2 text-xs text-slate-500');
      var p = el('span', 'ent-puntos text-slate-400');
      p.innerHTML = '<span></span><span></span><span></span>';
      pensandoEl.appendChild(p);
      pensandoEl.appendChild(el('span', '', texto));
      log.appendChild(pensandoEl);
      log.scrollTop = log.scrollHeight;
    }
    function pintarConversacion() {
      log.innerHTML = '';
      // El saludo se dice en voz alta (no se escribe). Mientras no haya
      // preguntas, solo una indicación breve.
      if (!ses.historial.length && iaConfigurada()) log.appendChild(el('p', 'ent-pista pt-3 text-center text-xs text-slate-500', 'Toca 🎤 y pregunta, o elige una sugerencia.'));
      if (!iaConfigurada()) avisoMsg(C.mensajes.sinIA || 'La IA no está disponible.');
      ses.historial.forEach(function (m) { burbujaMsg(m.rol, m.texto); });
      if (ses.resumen) tarjetaResumen(ses.resumen);
      escribirPizarra(ses.pizarra || P.pizarra || [], false);
      pintarControles();
    }

    // ---------- Sugerencias: siempre dos ----------
    function sugerenciasActuales() {
      var base = [C.mensajes.explicar || 'Explíqueme el tema de hoy', C.mensajes.importancia || '¿Por qué es importante este tema?'];
      var lista = (ses.siguientes && ses.siguientes.length ? ses.siguientes : base).slice();
      var hechas = ses.historial.map(function (m) { return m.texto; });
      lista = lista.filter(function (s) { return hechas.indexOf(s) < 0; });
      if (lista.length < 2) base.forEach(function (s) { if (lista.length < 2 && hechas.indexOf(s) < 0 && lista.indexOf(s) < 0) lista.push(s); });
      return lista.slice(0, 2);
    }
    function pintarSugerencias() {
      zonaSug.innerHTML = '';
      if (ses.cerrada || ses.preguntas >= maxPreguntas || !iaConfigurada() || ocupado) return;
      var color = P.color || '#92400e';
      sugerenciasActuales().forEach(function (s, i) {
        var b = el('button', 'flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-left text-[12px] leading-tight font-semibold ring-1 transition hover:shadow-md hover:-translate-y-px ' + FOCO);
        b.type = 'button';
        b.style.background = Dib.mezclar(color, '#fff', 0.9);
        b.style.color = Dib.mezclar(color, '#000', 0.45);
        b.style.setProperty('--tw-ring-color', Dib.mezclar(color, '#fff', 0.65));
        b.appendChild(el('span', 'flex-none text-sm leading-none mt-px', i === 0 && !ses.historial.length ? '📚' : '💬'));
        b.appendChild(el('span', 'line-clamp-2', s));
        b.setAttribute('aria-label', 'Preguntar: ' + s);
        b.addEventListener('click', function () { if (IA) IA.desbloquear(); preguntar(s); });
        zonaSug.appendChild(b);
      });
    }

    // ---------- Controles ----------
    var ocupado = false, avisoArchivo = false;
    var mic = null;
    function pintarControles() {
      var lleno = ses.preguntas >= maxPreguntas;
      var activo = iaConfigurada() && !ses.cerrada && !lleno;
      var escuchando = !!(mic && mic.activo);
      entrada.disabled = !activo || ocupado;
      btnEnviar.disabled = !activo || ocupado || escuchando || !entrada.value.trim();
      btnMic.classList.toggle('hidden', !mic || !mic.modo);
      btnMic.disabled = !activo || ocupado;
      btnMic.textContent = escuchando ? '⏹' : '🎤';
      btnMic.style.background = escuchando ? '#dc2626' : P.color || '#92400e';
      btnMic.classList.toggle('ent-mic-on', escuchando && mic.modo === 'navegador');
      if (!escuchando) btnMic.style.boxShadow = '';
      btnMic.setAttribute('aria-label', escuchando ? 'Detener el micrófono' : 'Preguntar con el micrófono');
      btnMic.setAttribute('aria-pressed', escuchando ? 'true' : 'false');
      entrada.placeholder = ses.cerrada ? 'Clase terminada' : lleno ? 'Ya usaste tus preguntas' : escuchando ? 'Te escucho…' : 'Escribe o dicta tu pregunta…';
      contador.textContent = 'Preguntas: ' + ses.preguntas + ' de ' + maxPreguntas;
      btnTerminar.textContent = ses.cerrada ? '🔁 Nueva clase' : '📝 Terminar la clase';
      btnTerminar.disabled = ocupado || (!ses.cerrada && !ses.preguntas);
      pintarSugerencias();
    }
    entrada.addEventListener('input', pintarControles);

    // ---------- Datos que se envían (nunca datos del estudiante) ----------
    var temaPagina = '';
    function datos() {
      return {
        personaje: { nombre: P.nombre, rol: P.rol, epoca: P.epoca, descripcion: P.descripcion, personalidad: P.personalidad },
        libro: C.libro.nombre || 'el libro',
        publico: C.libro.publico || 'estudiantes',
        tema: temaPagina || (temaPagina = IA.leerPagina(2500)),
        maxPalabras: Math.max(25, Math.min(120, Number(E.maxPalabras) || 45)),
      };
    }

    // =================================================================
    // FLUJO: preguntar → explicar (voz + pizarra) → terminar
    // =================================================================
    function preguntar(texto) {
      texto = R.texto(texto, maxCaracteres);
      if (!texto || ocupado || ses.cerrada || !IA) return;
      if (ses.preguntas >= maxPreguntas) { avisoMsg((C.mensajes.limite || 'Ya usaste tus preguntas.').replace('{max}', maxPreguntas)); return; }
      if (R.tieneDatosPersonales(texto)) { micInfo.textContent = '🔒 ' + (C.mensajes.privado || 'No envíes datos personales.'); return; }
      IA.callar();
      var pista = log.querySelector('.ent-pista');
      if (pista) pista.remove();
      var previo = ses.historial.slice();
      ses.historial.push({ rol: 'estudiante', texto: texto });
      var miBurbuja = burbujaMsg('estudiante', texto);
      entrada.value = '';
      micInfo.textContent = '';
      ocupado = true;
      pintarControles();
      estado('pensando', '💭 Pensando…');
      pensando(true, (P.corto || P.nombre) + ' está pensando…');
      IA.conversar(datos(), previo, texto).then(function (r) {
        ocupado = false;
        pensando(false);
        if (r.error) {
          // La pregunta no se cuenta: se puede reintentar.
          ses.historial = previo;
          miBurbuja.remove();
          entrada.value = texto;
          avisoMsg('⚠️ ' + r.error, function () { entrada.value = ''; preguntar(texto); });
          estado('', textoReposo());
          pintarControles();
          return;
        }
        // Fuera del tema de la actividad: no se responde; frase fija que
        // devuelve al tema (y la pizarra no cambia).
        if (!r.enTema) {
          r.texto = (C.mensajes.fueraDeTema || 'Esa pregunta no es de nuestra clase de hoy. Volvamos al tema.').replace('{tema}', tituloClase);
          r.pizarra = [];
        }
        ses.historial.push({ rol: 'personaje', texto: r.texto });
        ses.preguntas += 1;
        if (r.pizarra.length) ses.pizarra = r.pizarra;
        ses.siguientes = r.siguientes;
        guardarSes();
        burbujaMsg('personaje', r.texto);
        if (r.pizarra.length) escribirPizarra(r.pizarra, true);
        estado('', textoReposo());
        pintarControles();
        hablarPersonaje(r.texto);
        if (ses.preguntas >= maxPreguntas) avisoMsg((C.mensajes.limite || 'Ya usaste tus preguntas.').replace('{max}', maxPreguntas));
      });
    }
    fila.addEventListener('submit', function (e) {
      e.preventDefault();
      if (IA) IA.desbloquear();
      if (!btnEnviar.disabled) preguntar(entrada.value);
    });

    function terminar() {
      if (ses.cerrada) return nuevaClase();
      if (!ses.preguntas || ocupado || !IA) return;
      if (mic && mic.activo) mic.detener();
      IA.desbloquear();
      IA.callar();
      ocupado = true;
      pintarControles();
      estado('pensando', '📝 Preparando tu resumen…');
      pensando(true, 'Preparando el resumen de la clase…');
      IA.cerrar(datos(), ses.historial).then(function (r) {
        ocupado = false;
        pensando(false);
        if (r.error) {
          avisoMsg('⚠️ No se pudo preparar el resumen. ' + r.error, terminar);
          estado('', textoReposo());
          pintarControles();
          return;
        }
        ses.cerrada = true;
        ses.resumen = r;
        if (r.pizarra.length) ses.pizarra = r.pizarra;
        guardarSes();
        tarjetaResumen(r);
        escribirPizarra(ses.pizarra, true);
        estado('', textoReposo());
        pintarControles();
        if (r.despedida) hablarPersonaje(r.despedida);
        try {
          document.dispatchEvent(new CustomEvent('folleto:entrevista-terminada', {
            detail: { personaje: idP, pagina: pagina, preguntas: ses.preguntas, resumen: r, historial: ses.historial.slice() },
          }));
        } catch (x) {}
      });
    }
    function tarjetaResumen(r) {
      if (r.despedida) burbujaMsg('personaje', r.despedida);
      var t = el('div', 'ent-entra rounded-2xl bg-white ring-1 ring-slate-200 p-3 text-sm space-y-2 shadow-sm');
      var tit = el('p', 'font-extrabold', '📝 Resumen de tu clase');
      tit.style.color = oscuro();
      t.appendChild(tit);
      if (r.aprendizajes && r.aprendizajes.length) {
        t.appendChild(el('p', 'text-xs font-bold text-slate-600', 'Lo que aprendiste'));
        var ul = el('ul', 'space-y-1');
        r.aprendizajes.forEach(function (a) {
          var li = el('li', 'flex gap-2');
          li.appendChild(el('span', 'flex-none', '💡'));
          li.appendChild(el('span', '', a));
          ul.appendChild(li);
        });
        t.appendChild(ul);
      }
      if (r.preguntaDestacada) {
        var q = el('div', 'rounded-xl bg-amber-50 ring-1 ring-amber-200 p-2');
        q.appendChild(el('p', 'text-xs font-bold text-amber-900', '🏅 Tu mejor pregunta'));
        q.appendChild(el('p', 'italic', '“' + r.preguntaDestacada + '”'));
        if (r.porQue) q.appendChild(el('p', 'text-xs text-slate-700 mt-0.5', r.porQue));
        t.appendChild(q);
      }
      if (r.consejo) {
        var k = el('p', 'text-xs text-slate-700');
        k.appendChild(el('b', '', '🎯 Para tu próxima clase: '));
        k.appendChild(document.createTextNode(r.consejo));
        t.appendChild(k);
      }
      t.appendChild(el('p', 'text-[10px] text-slate-400', 'Resumen generado por IA. Contrasta la información con tu libro y tu docente.'));
      log.appendChild(t);
      log.scrollTop = log.scrollHeight;
    }
    function nuevaClase() {
      if (IA) IA.callar();
      borrar(SS, claveSes());
      cargarSes();
      pintarConversacion();
      estado('', textoReposo());
    }
    btnTerminar.addEventListener('click', terminar);

    // ---------- Micrófono ----------
    function crearMicrofono() {
      mic = new IA.Microfono({
        alTexto: function (t) { entrada.value = t; pintarControles(); },
        alNivel: function (n) { btnMic.style.boxShadow = '0 0 0 ' + Math.round(3 + n * 14) + 'px rgba(220,38,38,.25)'; },
        alEstado: function (e, i) {
          if (e === 'escuchando') {
            micInfo.textContent = i.segundos ? '🎙️ Te escucho… (' + i.segundos + ' s)' : '🎙️ Habla ahora: cuando termines, se envía sola.';
            estado('escuchando', '👂 Escuchando…');
          } else if (e === 'transcribiendo') {
            micInfo.textContent = '✍️ Convirtiendo tu voz en texto…';
            estado('pensando', '✍️ Escribiendo lo que dijiste…');
          } else if (e === 'listo') {
            estado('', textoReposo());
            var t = entrada.value.trim();
            if (!t) micInfo.textContent = 'No te escuché. Toca 🎤 y habla de nuevo, o escribe tu pregunta.';
            else if (E.enviarAlTerminarDictado !== false) { micInfo.textContent = ''; preguntar(t); }
            else micInfo.textContent = 'Revisa tu pregunta y toca ➤ para enviarla.';
          } else {
            micInfo.textContent = i.mensaje;
            estado('', textoReposo());
          }
          pintarControles();
        },
      });
    }
    btnMic.addEventListener('click', function () {
      if (!mic) return;
      IA.desbloquear();
      if (mic.activo) mic.detener();
      else { entrada.value = ''; mic.iniciar(); }
      pintarControles();
      // Abierto como archivo (doble clic), el navegador no recuerda el permiso
      // del micrófono y lo pide cada vez. Publicado (https) lo pide una sola vez.
      if (location.protocol === 'file:' && !avisoArchivo) {
        avisoArchivo = true;
        if (window.console) console.warn('Entrevista: la página se abrió como archivo (file://); el navegador pedirá permiso del micrófono cada vez. Ábrela desde un servidor (http://localhost o https).');
      }
    });

    // ---------- Menú: cambiar de profesor / nueva clase ----------
    function cerrarMenu() { menu.classList.add('hidden'); btnMenu.setAttribute('aria-expanded', 'false'); }
    function abrirMenu() {
      menu.innerHTML = '';
      var lista = forzado ? [] : elegibles();
      if (lista.length > 1) {
        menu.appendChild(el('p', 'px-2 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500', 'Cambiar de profesor'));
        lista.forEach(function (k) {
          var q = C.personajes[k];
          var b = el('button', 'w-full flex items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-slate-100 ' + FOCO);
          b.type = 'button';
          b.setAttribute('role', 'menuitemradio');
          b.setAttribute('aria-checked', k === idP ? 'true' : 'false');
          var mini = el('span', 'flex-none w-9 h-9 rounded-full overflow-hidden ring-1 ring-slate-200');
          mini.style.background = Dib.mezclar(q.color || '#92400e', '#fff', 0.85);
          mini.innerHTML = Dib.dibujar(q, { cara: true });
          var tx = el('span', 'flex-1 min-w-0');
          tx.appendChild(el('span', 'block font-bold text-slate-900 truncate', q.nombre + (k === idP ? ' ✓' : '')));
          tx.appendChild(el('span', 'block text-[11px] text-slate-500 truncate', 'Recreación · ' + String(q.epoca || '').split(';')[0]));
          b.appendChild(mini);
          b.appendChild(tx);
          b.addEventListener('click', function () { cerrarMenu(); cambiarPersonaje(k); });
          menu.appendChild(b);
        });
        menu.appendChild(el('hr', 'my-1.5 border-slate-200'));
      }
      var n = el('button', 'w-full rounded-xl px-2 py-1.5 text-left hover:bg-slate-100 ' + FOCO, '🔁 Empezar una nueva clase');
      n.type = 'button';
      n.setAttribute('role', 'menuitem');
      n.addEventListener('click', function () { cerrarMenu(); nuevaClase(); });
      menu.appendChild(n);
      var o = el('button', 'w-full rounded-xl px-2 py-1.5 text-left hover:bg-slate-100 ' + FOCO, '🙈 Ocultar al personaje');
      o.type = 'button';
      o.setAttribute('role', 'menuitem');
      o.addEventListener('click', function () { cerrarMenu(); ocultar(); });
      menu.appendChild(o);
      menu.classList.remove('hidden');
      btnMenu.setAttribute('aria-expanded', 'true');
      var primero = menu.querySelector('button');
      if (primero) primero.focus();
    }
    btnMenu.addEventListener('click', function () { menu.classList.contains('hidden') ? abrirMenu() : cerrarMenu(); });
    function cambiarPersonaje(k) {
      if (k === idP || ocupado) return;
      if (IA) { IA.callar(); IA.desbloquear(); }
      if (mic && mic.activo) mic.detener();
      idP = k;
      P = C.personajes[k];
      prefs.personaje = k;
      guardar(LS, CLAVE_PREF, prefs);
      cargarSes();
      pintarPersonaje();
      pintarConversacion();
      estado('', textoReposo());
      saludarMano();
      if (!ses.historial.length) hablarPersonaje(P.saludo || '');
    }

    btnVoz.addEventListener('click', function () {
      prefs.voz = !prefs.voz;
      guardar(LS, CLAVE_PREF, prefs);
      if (!prefs.voz && IA) IA.callar();
      else if (IA) IA.desbloquear();
      pintarVoz();
    });

    // ---------- Abrir / cerrar ----------
    var abierto = false, focoAntes = null;
    function abrir() {
      if (abierto) return;
      abierto = true;
      focoAntes = document.activeElement;
      burbuja.classList.add('hidden');
      panel.classList.remove('hidden');
      boton.setAttribute('aria-expanded', 'true');
      prepararIA().then(function () {
        IA.desbloquear(); // dentro del toque: iPhone deja sonar el audio después
        if (!mic) crearMicrofono();
        pintarVoz();
        pintarConversacion();
        estado('', iaConfigurada() ? textoReposo() : 'Sin conexión con la IA');
        saludarMano();
        // La clase empieza hablando: saluda en voz alta si aún no hay preguntas.
        if (!ses.historial.length && iaConfigurada()) setTimeout(function () { if (abierto) hablarPersonaje(P.saludo || ''); }, 300);
        if (window.matchMedia && window.matchMedia('(min-width: 640px)').matches) entrada.focus();
      }).catch(function (e) {
        if (window.console) console.warn(e);
        log.innerHTML = '';
        avisoMsg(C.mensajes.sinIA || 'La IA no está disponible.');
      });
    }
    function cerrar() {
      if (!abierto) return;
      abierto = false;
      cerrarMenu();
      if (IA) IA.callar();
      if (mic && mic.activo) mic.detener();
      moverBoca(false);
      clearInterval(relojTiza);
      escribiendo = false;
      caminar(0);
      panel.classList.add('hidden');
      boton.setAttribute('aria-expanded', 'false');
      estado('', '');
      if (focoAntes && focoAntes.focus && document.contains(focoAntes)) focoAntes.focus(); else if (!prefs.oculto) boton.focus();
    }
    // Ocultar al personaje (se recuerda en este dispositivo, en todas las
    // actividades, hasta que el estudiante lo vuelva a mostrar).
    function ponerOculto(oculto) {
      bot.classList.toggle('hidden', oculto);
      pestana.classList.toggle('hidden', !oculto);
      if (oculto) { burbuja.classList.add('hidden'); clearTimeout(relojBurbuja); }
    }
    function ocultar() {
      cerrar();
      if (IA) IA.callar();
      prefs.oculto = true;
      guardar(LS, CLAVE_PREF, prefs);
      ponerOculto(true);
      pestana.focus();
    }
    function mostrar() {
      prefs.oculto = false;
      guardar(LS, CLAVE_PREF, prefs);
      ponerOculto(false);
      boton.focus();
    }
    btnOcultar.addEventListener('click', ocultar);
    var saludoPreparado = false;
    function prepararSaludo() {
      if (saludoPreparado || !prefs.voz || ses.historial.length || !iaConfigurada()) return;
      saludoPreparado = true;
      prepararIA().then(function () { IA.precargar(P.saludo || '', P.voz); });
    }
    boton.addEventListener('pointerenter', prepararSaludo);
    boton.addEventListener('focus', prepararSaludo);
    boton.addEventListener('touchstart', prepararSaludo, { passive: true });
    pestana.addEventListener('click', mostrar);
    boton.setAttribute('aria-expanded', 'false');
    boton.addEventListener('click', function () { abierto ? cerrar() : abrir(); });
    btnCerrar.addEventListener('click', cerrar);
    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!menu.classList.contains('hidden')) { cerrarMenu(); btnMenu.focus(); } else cerrar();
    });
    document.addEventListener('click', function (e) {
      if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== btnMenu) cerrarMenu();
    });

    // ---------- Arranque ----------
    pintarPersonaje();
    escribirPizarra(P.pizarra || [], false);
    pintarControles();
    ponerOculto(!!prefs.oculto);
    // Saludo en burbuja (una vez por actividad y sesión, sin voz: el navegador
    // no deja sonar audio antes de que el estudiante toque algo).
    var claveSaludo = 'prolipa-entrevista-saludo:' + idLibro + ':' + pagina;
    if (E.saludoAlCargar !== false && !prefs.oculto && !leer(SS, claveSaludo)) {
      setTimeout(function () {
        if (abierto || prefs.oculto) return;
        guardar(SS, claveSaludo, 1);
        decir(P.saludoCorto || '¡Hola! Soy ' + P.nombre + '. ¿Empezamos la clase? 🎤');
      }, 1500);
    }

    // API para pruebas y para otros scripts del libro.
    window.Entrevista = {
      config: C,
      personaje: function () { return idP; },
      abrir: abrir,
      cerrar: cerrar,
      ocultar: ocultar,
      mostrar: mostrar,
      preguntar: function (t) { return prepararIA().then(function () { preguntar(t); }); },
      terminar: terminar,
      cambiarPersonaje: cambiarPersonaje,
      sesion: function () { return JSON.parse(JSON.stringify(ses)); },
    };
  }
})();
