/* =========================================================================
   Tooltips de la barra flotante (#navbar): comportamiento adicional que
   el simple CSS :hover no puede resolver por sí solo:
   1) Al hacer clic en un icono, el tooltip debe desaparecer al instante
      (no esperar a que el mouse se retire).
   2) Mientras el panel que ese icono abre siga desplegado (la ayuda
      "#nota-informativa", el recorrido guiado ".infoAyuda", o el modal
      "#myModal"), el tooltip de ese icono no debe volver a aparecer.
   Reescrito a JS nativo (sin jQuery). No modifica funciones.js/builder.js —
   solo agrega/quita la clase "no-tip" (estilada en no-bootstrap.css) sobre
   los botones ya existentes.
   ========================================================================= */

/* =========================================================================
   Materia automática (js/materia.js): deduce de qué materia es la actividad
   (Biología, Matemática, Física…) leyendo su texto. La usan la mascota, el
   profesor con IA y los juegos, así se adaptan solos a cualquier libro.
   ========================================================================= */
(function () {
  if (!document.getElementById('activity')) return;
  var yo = document.currentScript && document.currentScript.src;
  if (!yo) return;
  var s = document.createElement('script');
  s.src = yo.split('?')[0].replace(/[^/]*$/, '') + 'materia.js?v=5';
  s.async = false;
  document.head.appendChild(s);
})();
function materiaActividad() { return (window.ProlipaMateria && window.ProlipaMateria.actual()) || null; }

/* =========================================================================
   Botón "Juego" de la barra (#navbar): abre el menú de juegos (juegos.html)
   en un marco SOBRE la actividad, sin salir de ella ni perder lo que el
   estudiante ya respondió. Desde ahí se elige BioCabeza (responder moviendo
   la cabeza frente a la cámara), BioSalto (la gallina: responder con la voz)
   o BioPortal (un portal en realidad aumentada al mundo del tema, con un tour).
   A cada página del marco que avisa "juego:listo" se le manda el título y el
   texto de la actividad, así la IA pregunta sobre ese contenido. Va antes del
   bloque de tooltips para que el botón nuevo también reciba su comportamiento.
   Qué juegos se muestran: js/juegos/config.js (true/false) o, en una
   actividad, <body data-juegos="biocabeza,biosalto,bioportal|…|ninguno">.
   Con un solo juego, el botón lo abre directo; sin ninguno, no aparece.
   Ver los README de js/biocabeza, js/biosalto y js/bioportal.
   ========================================================================= */
(function () {
  var lista = document.querySelector('#navbar .nav');
  if (!document.getElementById('activity') || !lista) return;
  var yo = document.currentScript && document.currentScript.src;
  if (!yo) return;
  var carpeta = yo.split('?')[0].replace(/js\/[^/]*$/, '');
  // Ícono: el símbolo del logo de Prolipa (los tres libros) en blanco.
  var ICONO = '<img class="btnJuego-ico" src="' + carpeta + 'img/prolipa-silueta.png" alt="" />';
  function visto() { try { return localStorage.getItem('juegos.visto') === '2'; } catch (e) { return true; } }

  var JUEGOS = [
    { id: 'biocabeza', nombre: 'BioCabeza', pagina: 'biocabeza.html', que: '<b>BioCabeza</b> (con la cámara)' },
    { id: 'biosalto', nombre: 'BioSalto', pagina: 'biosalto.html', que: '<b>BioSalto</b> (con tu voz)' },
    { id: 'bioportal', nombre: 'BioPortal', pagina: 'bioportal.html', que: '<b>BioPortal</b> (un portal en realidad aumentada)' },
  ];
  var CERRAR_AYUDA = '<div class="glyphicon glyphicon-remove-circle cerrarAyudas" style="color:red;font-size:2.5rem;float:right"></div>';
  var activos = [];

  // El botón se crea ya (para que reciba el comportamiento de los tooltips),
  // pero queda oculto hasta saber qué juegos se muestran (js/juegos/config.js).
  var li = document.createElement('li');
  li.hidden = true;
  li.innerHTML = '<button type="button" class="btn button btnJuego mytooltip" data-info="Juegos" aria-label="Juegos">' + ICONO +
    (visto() ? '' : '<span class="btnJuego-nuevo" aria-hidden="true"></span>') + '</button>';
  lista.insertBefore(li, document.getElementById('toggle-btn-navbar-Ocultar'));
  var boton = li.firstChild;
  // También aparece en el recorrido de Info (builder.js recorre iconosAyuda).
  var ayuda = { boton: 'btnJuego', icono: '<span class="btnJuego-mini">' + ICONO + '</span>', texto: 'Juegos con preguntas de esta actividad.' + CERRAR_AYUDA };
  if (window.iconosAyuda) window.iconosAyuda.push(ayuda);

  function quitarAyuda(a) {
    var k = window.iconosAyuda ? window.iconosAyuda.indexOf(a) : -1;
    if (k >= 0) window.iconosAyuda.splice(k, 1);
  }


  // Juegos activos: los del <body data-juegos="…"> de la actividad o, si no
  // tiene, los que están en true en js/juegos/config.js.
  function aplicarConfig() {
    var c = window.JUEGOS_CONFIG || {};
    var propios = (document.body.getAttribute('data-juegos') || '').toLowerCase().split(/[\s,]+/).filter(Boolean);
    activos = JUEGOS.filter(function (j) { return propios.length ? propios.indexOf(j.id) >= 0 : c[j.id] !== false; });
    if (!activos.length) {
      // Sin juegos: el botón no aparece ni sale en el recorrido de Info.
      quitarAyuda(ayuda);
      return;
    }
    var solo = activos.length === 1 ? activos[0] : null;
    boton.setAttribute('data-info', solo ? solo.nombre : 'Juegos');
    boton.setAttribute('aria-label', solo ? 'Juego: ' + solo.nombre : 'Juegos');
    var texto = (solo ? 'Juega a ' + solo.que : 'Juegos: ' + activos.map(function (j) { return j.que; }).join(', ').replace(/, ([^,]*)$/, ' y $1')) + ' con preguntas de esta actividad.';
    ayuda.texto = texto + CERRAR_AYUDA;
    var info = li.querySelector('.infoAyuda');
    if (info) info.innerHTML = ayuda.icono + ' ' + ayuda.texto;
    li.hidden = false;
  }
  var cfg = document.createElement('script');
  cfg.src = carpeta + 'js/juegos/config.js?t=' + Date.now();
  cfg.onload = cfg.onerror = aplicarConfig;
  document.head.appendChild(cfg);

  function estilos() {
    if (document.getElementById('biocabeza-estilos')) return;
    var s = document.createElement('style');
    s.id = 'biocabeza-estilos';
    s.textContent =
      '#navbar .btnJuego{position:relative;background:linear-gradient(150deg,#7dd3fc,#0ea5e9)!important;box-shadow:0 4px 12px rgba(14,165,233,.35)!important}' +
      '#navbar .btnJuego{padding:0!important}#navbar .btnJuego .btnJuego-ico{flex:none;display:block;width:24px;min-width:24px;height:24px}' +
      '#navbar .btnJuego:hover .btnJuego-ico{animation:bcSalta .5s}' +
      '#navbar .btnJuego-nuevo{position:absolute;top:-4px;right:-4px;width:12px;height:12px;border-radius:50%;background:#1d4ed8;border:2px solid #fff;animation:bcPulso 1.6s infinite}' +
      '#navbar.visible .nav>li:nth-child(6){transition-delay:.23s}' +
      '.btnJuego-mini{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:6px;background:#0ea5e9;vertical-align:-5px}.btnJuego-mini img{width:16px;height:16px}' +
      '@keyframes bcPulso{50%{transform:scale(1.35)}}' +
      '@keyframes bcSalta{40%{transform:translateY(-3px) rotate(-12deg)}80%{transform:rotate(6deg)}}' +
      '#biocabeza-capa{position:fixed;inset:0;z-index:1100;display:grid;place-items:center;background:rgba(11,21,48,.62);backdrop-filter:blur(5px);opacity:0;transition:opacity .25s}' +
      '#biocabeza-capa.abierta{opacity:1}' +
      // Caja del marco: detrás del iframe está la pantalla de carga (logo y
      // giro); el iframe aparece con un fundido solo cuando su página está lista.
      '.bc-caja{position:relative;width:min(1100px,96vw);height:min(780px,94vh);border-radius:26px;overflow:hidden;background:linear-gradient(135deg,#1e3a8a,#2563eb 55%,#38bdf8);box-shadow:0 30px 80px rgba(30,58,138,.45);transform:scale(.92) translateY(24px);transition:transform .4s cubic-bezier(.2,.9,.3,1.2)}' +
      '#biocabeza-capa.abierta .bc-caja{transform:none}' +
      '.bc-caja iframe{position:absolute;inset:0;display:block;width:100%;height:100%;border:0;background:transparent;opacity:0;transition:opacity .3s ease}' +
      '.bc-caja.listo iframe{opacity:1}' +
      '.bc-carga{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#fff;font:700 1.05rem system-ui,sans-serif;transition:opacity .3s}' +
      '.bc-caja.listo .bc-carga{opacity:0}' +
      '.bc-logo{display:grid;place-items:center;width:84px;height:84px;border-radius:24px;background:#fff;box-shadow:0 12px 28px rgba(15,23,42,.3);animation:bcFlota 1.6s ease-in-out infinite}' +
      '.bc-logo img{width:62px;height:62px;object-fit:contain}' +
      '.bc-giro{width:38px;height:38px;border-radius:50%;border:4px solid rgba(255,255,255,.3);border-top-color:#fff;animation:bcGira .8s linear infinite}' +
      '@keyframes bcFlota{50%{transform:translateY(-6px)}}' +
      '@keyframes bcGira{to{transform:rotate(360deg)}}' +
      '@media (max-width:700px),(max-height:560px){.bc-caja{width:100vw;height:100vh;height:100dvh;border-radius:0}}' +
      '.biocabeza-resultado{position:fixed;z-index:1101;left:50%;bottom:24px;transform:translate(-50%,20px);opacity:0;padding:12px 20px;border-radius:999px;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;font:600 .95rem system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.3);transition:opacity .3s,transform .3s;pointer-events:none}' +
      '.biocabeza-resultado.ver{opacity:1;transform:translate(-50%,0)}' +
      '@media (prefers-reduced-motion:reduce){#biocabeza-capa,.bc-caja,.bc-caja iframe,.bc-carga,.biocabeza-resultado{transition:none}#navbar .btnJuego-nuevo,.bc-logo{animation:none}}' +
      '@media print{#biocabeza-capa,.biocabeza-resultado,#navbar .btnJuego{display:none!important}}';
    document.head.appendChild(s);
  }
  estilos();

  // Lo que se le manda al juego: título y texto de la actividad (sin campos ni botones).
  function tituloActividad() {
    var h = document.querySelector('#activity .panel-body h3');
    return ((h && h.textContent) || document.title || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }
  function textoActividad() {
    var zona = document.querySelector('#activity .panel-body');
    if (!zona) return '';
    var copia = zona.cloneNode(true);
    copia.querySelectorAll('script,style,input,textarea,select,button,.infoAyuda').forEach(function (e) { e.remove(); });
    return (copia.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 2500);
  }
  var capa = null, marco = null, caja = null, foco = null, relojCarga = 0;
  // Pantalla de carga mientras la página del marco (menú o juego) se carga;
  // si algo tarda demasiado, el marco se muestra igual a los 8 s.
  function cargando(texto) {
    if (!caja) return;
    caja.classList.remove('listo');
    caja.querySelector('.bc-texto').textContent = texto || 'Cargando…';
    clearTimeout(relojCarga);
    relojCarga = setTimeout(mostrarMarco, 8000);
  }
  function mostrarMarco() {
    clearTimeout(relojCarga);
    if (caja) caja.classList.add('listo');
    try { if (marco) marco.contentWindow.focus(); } catch (e) { }
  }
  // destino: un juego para abrir directo; sin él, el juego activo si es uno
  // solo, o el menú de juegos.
  function abrir(destino) {
    if (capa) return;
    foco = document.activeElement;
    capa = document.createElement('div');
    capa.id = 'biocabeza-capa';
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-modal', 'true');
    capa.setAttribute('aria-label', destino ? destino.nombre : 'Juegos');
    marco = document.createElement('iframe');
    marco.title = destino ? destino.nombre : 'Juegos';
    marco.allow = 'camera; microphone; autoplay; clipboard-write; xr-spatial-tracking; fullscreen';
    // Con un solo juego se abre directo; si no, el menú para elegir.
    var uno = destino || (activos.length === 1 ? activos[0] : null);
    var pagina = uno ? uno.pagina : 'juegos.html';
    marco.src = carpeta + pagina + '?tema=' + encodeURIComponent(tituloActividad());
    caja = document.createElement('div');
    caja.className = 'bc-caja';
    caja.innerHTML = '<div class="bc-carga" aria-hidden="true"><div class="bc-logo"><img src="' + carpeta + 'img/prolipa-icono.png" alt="" /></div><div class="bc-giro"></div><span class="bc-texto">Cargando…</span></div>';
    marco.addEventListener('load', mostrarMarco);
    caja.appendChild(marco);
    capa.appendChild(caja);
    cargando(uno ? 'Cargando ' + uno.nombre + '…' : 'Cargando los juegos…');
    document.body.appendChild(capa);
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (capa) capa.classList.add('abierta'); }); });
    if (window.speechSynthesis) speechSynthesis.cancel(); // calla al personaje de la Entrevista
    try { localStorage.setItem('juegos.visto', '2'); } catch (e) { }
    var punto = boton.querySelector('.btnJuego-nuevo');
    if (punto) punto.remove();
  }
  function cerrar() {
    if (!capa) return;
    var c = capa, m = marco;
    capa = marco = caja = null;
    clearTimeout(relojCarga);
    c.classList.remove('abierta');
    m.src = 'about:blank'; // apaga la cámara del juego
    setTimeout(function () { c.remove(); }, 260);
    document.documentElement.style.overflow = '';
    if (foco && foco.focus) foco.focus();
  }
  function avisoResultado(d) {
    var t = document.createElement('div');
    t.className = 'biocabeza-resultado';
    t.setAttribute('role', 'status');
    t.textContent = (d.juego === 'BioSalto' ? '🐔 BioSalto: ' : '🎩 BioCabeza: ') + d.aciertos + ' de ' + d.total + (d.total === 1 ? ' acierto' : ' aciertos');
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('ver'); });
    setTimeout(function () { t.classList.remove('ver'); setTimeout(function () { t.remove(); }, 400); }, 4500);
  }
  window.addEventListener('message', function (e) {
    if (!marco || e.source !== marco.contentWindow || !e.data) return;
    var d = e.data;
    if (d.tipo === 'juego:listo') { marco.contentWindow.postMessage({ tipo: 'juego:actividad', tema: tituloActividad(), contexto: textoActividad(), materia: materiaActividad(), juegos: activos.map(function (j) { return j.id; }) }, '*'); mostrarMarco(); }
    else if (d.tipo === 'juego:navegando') cargando('Cargando ' + (typeof d.nombre === 'string' ? d.nombre.slice(0, 30) : 'el juego') + '…');
    else if (d.tipo === 'juego:cerrar') cerrar();
    else if (d.tipo === 'juego:resultado') avisoResultado({ juego: d.juego === 'BioSalto' ? 'BioSalto' : 'BioCabeza', aciertos: Number(d.aciertos) || 0, total: Number(d.total) || 0 });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && capa) cerrar(); });
  boton.addEventListener('click', function () { abrir(); });
})();

(function () {
  function setAttrAll(sel, attr, val) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.setAttribute(attr, val);
    });
  }
  function setTextAll(sel, text) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.textContent = text;
    });
  }

  // builder.js trae "Mostrar ayuda de la actividad" en el botón ❓ y
  // "Ayudas" en el botón ℹ️ — casi lo mismo, y al revés de cómo se leen
  // los iconos. Se renombra el data-info (el propio texto del tooltip)
  // sin tocar builder.js: ❓ = Ayudas (las pistas de cada pregunta),
  // ℹ️ = Info (el recorrido que explica qué hace cada botón).
  setAttrAll('.btnHelp', 'data-info', 'Ayudas');
  setAttrAll('.btn_Ayudas', 'data-info', 'Info');
  setAttrAll('.btnGuardar', 'data-info', 'Guardar');
  setAttrAll('.btnRepetir', 'data-info', 'Reiniciar');
  setAttrAll('.btnCalificar', 'data-info', 'Calificar');

  // Modal "Guardar la actividad en su máquina local" (builder.js): título
  // más corto para que no se encime con la "x", etiqueta más cercana y el
  // botón "Close" traducido — sin tocar builder.js, solo el texto ya
  // puesto en el DOM.
  setTextAll('.modal-title', 'Guarda tu actividad');
  setTextAll('#lbl_nombre', '¿Cómo te llamas?');
  var txtAlumno = document.getElementById('txtAlumno');
  if (txtAlumno) txtAlumno.setAttribute('placeholder', 'Escribe tu nombre aquí');
  setTextAll('.modal-footer [data-dismiss="modal"]', 'Cerrar');

  // La insignia "Unidad N" (Postlectura) y su remoción (STEAMission/Para
  // grandes problemas) ahora se ponen directo en cada uniNactM.js, igual
  // que el ícono de sección — ya no se detectan por sniffing aquí.

  function algoDesplegado() {
    var nota = document.getElementById('nota-informativa');
    var modal = document.getElementById('myModal');
    var infoVisible = Array.prototype.some.call(document.querySelectorAll('.infoAyuda'), function (el) {
      return el.offsetParent !== null;
    });
    return (nota && nota.classList.contains('nota-visible')) || infoVisible || (modal && modal.classList.contains('show'));
  }

  // mouseenter/mouseleave no burbujean, así que se enganchan directo en
  // cada botón (son estáticos: builder.js ya los creó antes de que este
  // script corra).
  document.querySelectorAll('#navbar .mytooltip').forEach(function (el) {
    el.addEventListener('mouseenter', function () {
      if (algoDesplegado()) el.classList.add('no-tip');
    });
    el.addEventListener('click', function () {
      el.classList.add('no-tip');
    });
    el.addEventListener('mouseleave', function () {
      setTimeout(function () {
        if (!algoDesplegado()) el.classList.remove('no-tip');
      }, 60);
    });
  });
})();

/* =========================================================================
   Clase con un personaje de la ciencia (js/entrevista/): recreación con IA
   (Charles Darwin o Rosalind Franklin) abajo a la derecha de TODAS las
   actividades que cargan este archivo, sin agregar nada en cada HTML. Da la
   clase junto a una pizarra y el estudiante le pregunta por voz o
   escribiendo. Solo en páginas de actividad (#activity con la barra de
   builder.js); entrevista.js evita cargarse dos veces. Personajes e IA:
   js/entrevista/config.js.
   Al cambiar archivos de js/entrevista/ (menos config.js), subir el ?v= de
   abajo y el de toolbar-tooltips.js en los HTML.
   ========================================================================= */
(function () {
  if (!document.getElementById('activity') || !document.getElementById('navbar')) return;
  var yo = document.currentScript && document.currentScript.src;
  if (!yo) return;
  var s = document.createElement('script');
  s.src = yo.split('?')[0].replace(/[^/]*$/, '') + 'entrevista/entrevista.js?v=19';
  s.defer = true;
  document.body.appendChild(s);
})();


/* =========================================================================
   Mascota virtual (js/pet/): se activa sola en TODAS las actividades que
   cargan este archivo (las 18 y las que se creen con la misma plantilla),
   sin agregar nada en cada HTML. Solo en páginas de actividad (#activity
   con la barra de builder.js); mascota.js evita cargarse dos veces.
   Para quitarla de un libro basta con borrar este bloque. Al cambiar
   archivos de js/pet/ (menos config.js), subir el ?v= de abajo y el de
   toolbar-tooltips.js en los HTML.
   ========================================================================= */
(function () {
  if (!document.getElementById('activity') || !document.getElementById('navbar')) return;
  var yo = document.currentScript && document.currentScript.src;
  if (!yo) return;
  var s = document.createElement('script');
  s.src = yo.split('?')[0].replace(/[^/]*$/, '') + 'pet/mascota.js?v=51';
  s.defer = true;
  document.body.appendChild(s);
})();
