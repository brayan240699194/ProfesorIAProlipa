/* =========================================================================
   MASCOTA VIRTUAL — js/pet/mascota.js (punto de entrada)
   -------------------------------------------------------------------------
   UNA línea al final del <body> de cualquier actividad:
     (automático: lo carga js/toolbar-tooltips.js en todas las actividades)
   Carga en paralelo config.js y personajes.js; ia.js solo si hay IA.
   No necesita cambios en el libro:
     - Botón "Mascota" en la barra flotante (#navbar de builder.js).
     - Calificar: clic en #bt_comprobar. Corre después de onclick="total()",
       así que los campos ya tienen .bien / .mal. También escucha
       'folleto:calificado' si algún libro lo emite (sin reaccionar dos veces).
     - Preguntas abiertas: al salir de un <textarea> con N caracteres.
     - Inactividad: sin mouse, toques, teclas ni scroll → se duerme.
   Continuidad: la posición, el ánimo y los mensajes ya dichos viven en
   sessionStorage, así al pasar de una actividad a otra sigue igual hasta
   que se cierra el libro. La mascota elegida se guarda para siempre.
   Diseño para estudiantes: siempre en positivo, nunca se enferma, no
   reclama ni culpa, y no insiste (tiempo mínimo entre mensajes).
   ========================================================================= */
(function () {
  'use strict';
  // Una sola mascota por página aunque el script se incluya dos veces.
  if (window.__mascotaProlipa) return;
  window.__mascotaProlipa = true;

  var script = document.currentScript;
  var src = script ? script.src : '';
  var carpeta = src.split('?')[0].replace(/[^/]*$/, '');
  var version = src.indexOf('?') >= 0 ? '?' + src.split('?')[1] : '';
  var libroAtributo = script && script.getAttribute('data-libro');
  var configAtributo = script && script.getAttribute('data-config');

  // Carga en paralelo; async=false conserva el orden de ejecución.
  function cargar(url) {
    return new Promise(function (ok, falla) {
      var s = document.createElement('script');
      s.src = url;
      s.async = false;
      s.onload = ok;
      s.onerror = function () { falla(new Error('Mascota: no se pudo cargar ' + url)); };
      document.head.appendChild(s);
    });
  }
  var cargas = [cargar(carpeta + 'personajes.js' + version)];
  // config.js se pide siempre fresco (es pequeño): así un cambio de clave o de
  // mensajes se aplica al recargar, sin pelear con la caché del navegador.
  if (!window.MASCOTA_CONFIG || configAtributo) cargas.unshift(cargar((configAtributo || carpeta + 'config.js') + '?t=' + Date.now()));
  // Secretos locales (js/pet/config.local.js, ignorado por git): la clave de
  // pruebas vive ahí y no en config.js. Solo se busca si config.js no trae
  // clave ni servidor intermedio; si el archivo no existe, se sigue sin él.
  function cargarSecretos() {
    var ia = (window.MASCOTA_CONFIG && window.MASCOTA_CONFIG.ia) || {};
    if (window.MASCOTA_SECRETOS || ia.apiKey || ia.proxyUrl || ia.activa === false) return Promise.resolve();
    return cargar(carpeta + 'config.local.js?t=' + Date.now()).catch(function () {});
  }
  function aplicarSecretos() {
    var S = window.MASCOTA_SECRETOS, C = window.MASCOTA_CONFIG;
    if (!S || !C) return;
    if (S.ia) { C.ia = C.ia || {}; for (var k in S.ia) if (S.ia[k] !== '' && S.ia[k] != null) C.ia[k] = S.ia[k]; }
  }
  Promise.all(cargas).then(cargarSecretos).then(function () { aplicarSecretos(); iniciar(); }).catch(function (err) {
    if (window.console) console.warn(err);
  });

  // =====================================================================
  // ALMACENAMIENTO — patrón adaptador: interfaz PetStorage con load()/save()
  // (Promesas). LocalStorageAdapter o MongoAdapter según la configuración.
  // =====================================================================
  function PetStorage() {}
  PetStorage.prototype.load = function () { return Promise.reject(new Error('load() no implementado')); };
  PetStorage.prototype.save = function () { return Promise.reject(new Error('save() no implementado')); };

  // Clave por estudiante y libro; vacío o bloqueado → null / false.
  function LocalStorageAdapter(o) {
    this.clave = 'prolipa-mascota:' + o.libro + ':' + o.studentId;
  }
  LocalStorageAdapter.prototype = Object.create(PetStorage.prototype);
  LocalStorageAdapter.prototype.load = function () {
    try {
      var t = window.localStorage.getItem(this.clave);
      return Promise.resolve(t ? JSON.parse(t) : null);
    } catch (e) {
      return Promise.resolve(null);
    }
  };
  LocalStorageAdapter.prototype.save = function (d) {
    try {
      window.localStorage.setItem(this.clave, JSON.stringify(d));
      return Promise.resolve(true);
    } catch (e) {
      return Promise.resolve(false);
    }
  };

  // Habla con el BACKEND, nunca con MongoDB: GET/PUT {apiBase}/api/pet/:id
  // con la cookie de sesión de la plataforma (el servidor verifica que el
  // id sea del usuario logueado). 404 = todavía no tiene mascota.
  function MongoAdapter(o) {
    this.url = String(o.apiBase).replace(/\/+$/, '') + '/api/pet/' + encodeURIComponent(o.studentId) + '?libro=' + encodeURIComponent(o.libro);
  }
  MongoAdapter.prototype = Object.create(PetStorage.prototype);
  MongoAdapter.prototype._pedir = function (metodo, cuerpo) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = ctrl && setTimeout(function () { ctrl.abort(); }, 6000);
    return fetch(this.url, {
      method: metodo,
      credentials: 'include',
      headers: cuerpo ? { 'Content-Type': 'application/json' } : {},
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: ctrl ? ctrl.signal : undefined,
    }).finally(function () { clearTimeout(t); });
  };
  MongoAdapter.prototype.load = function () {
    return this._pedir('GET').then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('Mascota: GET ' + r.status);
      return r.json();
    });
  };
  MongoAdapter.prototype.save = function (d) {
    return this._pedir('PUT', d).then(function (r) {
      if (!r.ok) throw new Error('Mascota: PUT ' + r.status);
      return true;
    });
  };

  // Con 'mongo', si el servidor falla se sigue con la copia local.
  function crearAlmacenamiento(C, studentId, libro) {
    var local = new LocalStorageAdapter({ studentId: studentId, libro: libro });
    if (C.almacenamiento !== 'mongo' || !C.apiBase) return local;
    var remoto = new MongoAdapter({ apiBase: C.apiBase, studentId: studentId, libro: libro });
    var s = Object.create(PetStorage.prototype);
    s.load = function () { return remoto.load().catch(function () { return local.load(); }); };
    s.save = function (d) {
      local.save(d);
      return remoto.save(d).catch(function () { return false; });
    };
    return s;
  }

  // =====================================================================
  function iniciar() {
    var C = window.MASCOTA_CONFIG;
    // Encendido: C.activa en config.js (todas las actividades) o, en una
    // actividad, <body data-mascota="no"> / "si", que manda sobre config.js.
    var propio = (document.body.getAttribute('data-mascota') || '').toLowerCase();
    if (propio ? /^(no|false|ninguno|apagado|apagada)$/.test(propio) : C.activa === false) return;
    var T = C.tiempos;
    var DIBUJO = window.MascotaPersonajes;
    C.personajes = (C.personajes || []).filter(function (p) { return DIBUJO.tipos.indexOf(p.id) >= 0; });
    var LIBRO = libroAtributo || C.idLibro;
    var STUDENT_ID = resolverEstudiante();
    var PAGINA = (decodeURIComponent(location.pathname.split('/').pop() || '').replace(/\.html?$/i, '') || 'actividad');
    var almacen = crearAlmacenamiento(C, STUDENT_ID, LIBRO);
    var TAMANOS = {
      pequena: { nombre: 'Pequeña', clase: 'w-16 h-16 sm:w-20 sm:h-20' },
      normal: { nombre: 'Normal', clase: 'w-20 h-20 sm:w-24 sm:h-24' },
      grande: { nombre: 'Grande', clase: 'w-24 h-24 sm:w-32 sm:h-32' },
    };
    var FOCO = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2';

    function resolverEstudiante() {
      var id = typeof C.studentId === 'function' ? C.studentId() : C.studentId;
      if (!id && C.parametroUrlEstudiante) {
        try { id = new URLSearchParams(location.search).get(C.parametroUrlEstudiante); } catch (e) {}
      }
      id = String(id || '').trim();
      return /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : 'anonimo';
    }

    // ---------- Utilidades ----------
    function buscar(lista, id) {
      for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
      return null;
    }
    function limitar(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function esc(t) {
      return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    function azar(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
    function reducirMovimiento() {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
    function animar(el, cuadros, op) {
      if (!el || !el.animate || reducirMovimiento()) return null;
      return el.animate(cuadros, op);
    }
    function copia(o) { return JSON.parse(JSON.stringify(o)); }

    // =================================================================
    // DATOS (para siempre) y SESIÓN (hasta cerrar el libro)
    // =================================================================
    function datosVacios() {
      return { version: 2, studentId: STUDENT_ID, libro: LIBRO, tipo: null, nombre: '', color: null, tamano: 'normal', visible: true, minimizada: false, sonido: true, voz: false, frecuencia: 'normal', ia: true, diccionario: true, pospuesto: false, nombrePedido: false, posicion: null, ultimaVisita: null };
    }
    function limpiarNombre(t) { return String(t).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20); }
    function limpiarPos(p) {
      return p && isFinite(p.x) && isFinite(p.y) ? { x: limitar(+p.x, 0, 1), y: limitar(+p.y, 0, 1) } : null;
    }
    // Acepta solo valores conocidos; migra los datos de la versión 1.
    function normalizar(d) {
      var n = datosVacios();
      if (!d || typeof d !== 'object') return n;
      if (buscar(C.personajes, d.tipo)) n.tipo = d.tipo;
      if (typeof d.nombre === 'string') n.nombre = limpiarNombre(d.nombre);
      if (buscar(C.colores, d.color)) n.color = d.color;
      if (TAMANOS[d.tamano]) n.tamano = d.tamano;
      if (C.frecuencias[d.frecuencia]) n.frecuencia = d.frecuencia;
      ['visible', 'minimizada', 'sonido', 'voz', 'ia', 'diccionario', 'pospuesto', 'nombrePedido'].forEach(function (k) {
        if (typeof d[k] === 'boolean') n[k] = d[k];
      });
      n.ia = true; // la IA ya no se apaga desde el panel: siempre activa si está configurada
      if (C.recordarPosicion === 'siempre') n.posicion = limpiarPos(d.posicion);
      if (typeof d.ultimaVisita === 'string' && !isNaN(Date.parse(d.ultimaVisita))) n.ultimaVisita = d.ultimaVisita;
      return n;
    }
    var datos = datosVacios();
    var tGuardar = null;
    function guardar() {
      clearTimeout(tGuardar);
      tGuardar = setTimeout(function () { almacen.save(copia(datos)); }, 250);
    }

    var CLAVE_SES = 'prolipa-mascota-sesion:' + LIBRO + ':' + STUDENT_ID;
    var ses = null;
    function leerSesion() {
      try { return JSON.parse(window.sessionStorage.getItem(CLAVE_SES)); } catch (e) { return null; }
    }
    function guardarSesion() {
      try { window.sessionStorage.setItem(CLAVE_SES, JSON.stringify(ses)); } catch (e) {}
    }
    function sesionNueva() {
      return { inicio: Date.now(), ultima: Date.now(), posicion: null, calificadas: [], descanso: false, usados: {} };
    }

    function personaje() { return buscar(C.personajes, datos.tipo) || C.personajes[0]; }
    function hexDe(colorId, tipo) {
      var c = buscar(C.colores, colorId) || buscar(C.colores, (buscar(C.personajes, tipo) || C.personajes[0]).color) || C.colores[0];
      return c.hex;
    }
    function nombre() { return datos.nombre || personaje().nombreSugerido; }
    function frecuencia() { return C.frecuencias[datos.frecuencia] || C.frecuencias.normal; }

    // ---------- Nombre del estudiante ----------
    // Solo en ESTE dispositivo (localStorage, compartido por los libros);
    // nunca va al servidor ni a la IA. La mascota lo usa para llamarle.
    var CLAVE_ALUMNO = 'prolipa-mascota-alumno:' + STUDENT_ID;
    var alumno = '';
    try { alumno = limpiarNombre(window.localStorage.getItem(CLAVE_ALUMNO) || ''); } catch (e) {}
    function guardarAlumno(n) {
      alumno = limpiarNombre(n || '');
      try {
        if (alumno) window.localStorage.setItem(CLAVE_ALUMNO, alumno);
        else window.localStorage.removeItem(CLAVE_ALUMNO);
      } catch (e) {}
    }
    // Pone los nombres en un mensaje. Sin nombre del estudiante, {alumno} se
    // quita con su coma ("¡Hola, {alumno}!" → "¡Hola!") y se ajusta la mayúscula.
    function personalizar(texto, vars) {
      vars = vars || {};
      vars.nombre = nombre();
      if (alumno) vars.alumno = alumno;
      else texto = texto.replace(/,\s*\{alumno\}/g, '').replace(/\{alumno\},?\s*/g, '').replace(/\s+([!?.,])/g, '$1');
      texto = texto.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
      return texto.replace(/^([¡¿]?)(\S)/, function (m, a, b) { return a + b.toUpperCase(); });
    }
    // A veces (35 %) antepone el nombre: "Ana, ¿sabías que…?". La primera
    // letra pasa a minúscula salvo que sea ¡ ¿ o una sigla ("IA").
    function conNombre(texto) {
      if (!alumno || !texto || Math.random() > 0.35) return texto;
      var a = texto.charAt(0), b = texto.charAt(1);
      var sigla = b && b === b.toUpperCase() && b !== b.toLowerCase();
      return alumno + ', ' + (/[¡¿]/.test(a) || sigla ? texto : a.toLowerCase() + texto.slice(1));
    }
    function pedirNombreUnaVez(ms) {
      if (alumno || datos.nombrePedido) return;
      datos.nombrePedido = true;
      guardar();
      setTimeout(function () {
        if (alumno) return;
        accion('saludo', 'corazones', 4);
        decir('pedirNombre', null, true);
      }, ms);
    }
    // 'nunca' (por defecto): al abrir cada actividad aparece abajo a la derecha;
    // si la arrastras, se queda donde la dejes solo en esa página.
    var posPagina = null;
    function posicion() {
      if (C.recordarPosicion === 'siempre') return datos.posicion;
      if (C.recordarPosicion === 'sesion') return ses.posicion;
      return posPagina;
    }
    function activa() { return !!datos.tipo && datos.visible && !datos.minimizada; }

    // =================================================================
    // INTERFAZ DE LA MASCOTA
    // =================================================================
    var raiz, btn, burbuja, anuncio, capa, botonNav;

    function construir() {
      raiz = document.createElement('div');
      raiz.id = 'mascota';
      // z-[1050]: encima del fondo del modal "Guardar" (1000) para que se
      // vea su reacción al calificar; debajo del confeti (1100).
      raiz.className = 'fixed z-[1050] print:hidden select-none';
      raiz.innerHTML =
        '<div id="mascota-burbuja" aria-hidden="true" class="absolute w-max max-w-[14rem] sm:max-w-[17rem] rounded-2xl bg-white px-3 py-2 text-sm font-medium leading-snug text-slate-900 shadow-lg shadow-blue-900/10 ring-1 ring-sky-100 opacity-0 invisible transition-opacity duration-300 motion-reduce:transition-none"></div>' +
        '<div class="relative">' +
        '<button type="button" id="mascota-btn"></button>' +
        // Un solo botón ⋯ abre el menú general con todo lo que hace la mascota.
        // Mientras lee, a su lado aparecen ⏸/▶ y ⏹.
        '<div id="mascota-controles" class="absolute -top-2 -left-2 flex gap-1">' +
        '<button type="button" data-accion="menu" class="w-7 h-7 rounded-full bg-white text-slate-700 text-sm font-bold leading-none shadow ring-1 ring-slate-200 hover:bg-slate-100 ' + FOCO + '" aria-label="Menú de la mascota" aria-haspopup="menu" aria-expanded="false" title="Menú">⋯</button>' +
        (C.lectura === false ? '' :
          '<button type="button" data-accion="leer" class="hidden w-7 h-7 rounded-full bg-white text-slate-700 text-sm font-bold leading-none shadow ring-1 ring-slate-200 hover:bg-slate-100 ' + FOCO + '" aria-label="Pausar la lectura" title="Pausar">⏸</button>' +
          '<button type="button" data-accion="leer-todo" class="hidden w-7 h-7 rounded-full bg-white text-slate-700 text-sm font-bold leading-none shadow ring-1 ring-slate-200 hover:bg-slate-100 ' + FOCO + '" aria-label="Leer toda la actividad" title="Leer toda la actividad">📄</button>' +
          '<button type="button" data-accion="detener-lectura" class="hidden w-7 h-7 rounded-full bg-white text-slate-700 text-sm font-bold leading-none shadow ring-1 ring-slate-200 hover:bg-slate-100 ' + FOCO + '" aria-label="Detener la lectura" title="Detener">⏹</button>') +
        '</div>' +
        // Menú minimalista: solo íconos, que salen sobre la cabeza de la mascota.
        '<div id="mascota-menu" role="menu" aria-label="Menú de la mascota" class="hidden absolute z-10 flex gap-2" style="left:50%;transform:translateX(-50%)">' +
        (C.lectura === false ? '' : iconoMenu('lectura', '🔊', 'Leer en voz alta')) +
        iconoMenu('chat', '💬', 'Preguntar') +
        iconoMenu('minimizar', '➖', 'Minimizar') +
        '</div>' +
        (C.diccionario === false ? '' :
          '<div id="mascota-dicc" role="dialog" aria-label="Diccionario" class="hidden absolute z-10 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-white p-3 text-sm leading-snug text-slate-800 shadow-xl shadow-blue-900/15 ring-1 ring-sky-100">' +
          '<div class="flex items-center gap-2"><span aria-hidden="true" class="text-lg">🔍</span><b id="mascota-dicc-termino" class="flex-1 text-base text-blue-900"></b>' +
          '<button type="button" data-accion="dicc-cerrar" class="w-7 h-7 rounded-full text-slate-500 hover:bg-slate-100 ' + FOCO + '" aria-label="Cerrar">✕</button></div>' +
          '<p id="mascota-dicc-texto" class="mt-1.5" aria-live="polite"></p>' +
          '<p id="mascota-dicc-ejemplo" class="hidden mt-2 rounded-xl bg-sky-50 p-2"></p>' +
          '<div class="mt-2.5 flex gap-1.5">' +
          '<button type="button" data-accion="dicc-ejemplo" class="flex-1 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 px-3 py-1.5 font-bold text-white ' + FOCO + '">💡 Un ejemplo</button>' +
          '<button type="button" data-accion="dicc-escuchar" class="rounded-full px-3 py-1.5 font-bold text-blue-900 ring-1 ring-sky-200 hover:bg-sky-50 ' + FOCO + '">🔊 Escuchar</button>' +
          '</div></div>') +
        '<div id="mascota-particulas" class="pointer-events-none absolute inset-0" aria-hidden="true"></div>' +
        '</div>';
      document.body.appendChild(raiz);
      btn = raiz.querySelector('#mascota-btn');
      burbuja = raiz.querySelector('#mascota-burbuja');
      capa = raiz.querySelector('#mascota-particulas');
      anuncio = document.createElement('div');
      anuncio.className = 'sr-only print:hidden';
      anuncio.setAttribute('role', 'status');
      anuncio.setAttribute('aria-live', 'polite');
      document.body.appendChild(anuncio);

      activarArrastre();
      btn.addEventListener('click', clicMascota);
      btn.addEventListener('keydown', teclasMascota);
      burbuja.addEventListener('click', ocultarBurbuja);
      raiz.addEventListener('click', function (e) {
        var b = e.target.closest('[data-accion]');
        if (!b) return;
        var accion = b.getAttribute('data-accion');
        if (accion === 'menu') return menuGeneral(raiz.querySelector('#mascota-menu').classList.contains('hidden'));
        if (accion.indexOf('dicc-') === 0) return botonDiccionario(accion);
        menuGeneral(false);
        if (accion === 'chat') abrirPanel('chat');
        else if (accion === 'lectura') botonLectura('leer-parrafo');
        else if (accion === 'minimizar') minimizar(true);
        else botonLectura(accion);
      });
      document.addEventListener('click', function (e) { if (!raiz.contains(e.target)) menuGeneral(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { menuGeneral(false); cerrarDiccionario(); } });
      if (C.diccionario !== false) {
        // Doble clic / dedo sostenido en una palabra; y, si la página deja seleccionar, también la selección.
        escucharGestos();
        var relojSel = 0;
        document.addEventListener('selectionchange', function () { clearTimeout(relojSel); relojSel = setTimeout(revisarSeleccion, 700); });
      }
      window.addEventListener('resize', function () { aplicarPosicion(); reservarEspacio(); });
      // Tailwind (CDN) aplica las clases un instante después: al cambiar el
      // tamaño real se recoloca y se reserva el espacio.
      if (window.ResizeObserver) new ResizeObserver(function () { aplicarPosicion(); reservarEspacio(); }).observe(btn);
      crearBotonBarra();
      vigilarMicrofono();
      bufandaDeVezEnCuando(true);
      setTimeout(function () { prepararVozLocal(false); }, 4000);
    }

    // ---------- Leer en voz alta (js/pet/lectura.js) ----------
    // 🔊 abre el menú 👆 Párrafo / 📄 Todo. Mientras lee, 🔊 es ⏸/▶ y aparece ⏹.
    // La mascota lee con su misma voz natural y mueve la boca al hablar.
    var lector = null, cargaLector = null;
    function conLector(fn) {
      if (lector) return fn(lector);
      cargaLector = cargaLector || cargar(carpeta + 'lectura.js' + version).then(function () {
        lector = window.MascotaLectura.crear({
          voz: function (t) {
            if (vozLocalLista()) return window.MascotaVozLocal.sintetizar(textoParaVoz(t)).catch(function () { return null; });
            prepararVozLocal(true);
            if (!vozNatural()) return Promise.resolve(null);
            return audioNatural(textoParaVoz(t)).catch(function (e) {
              if (e && e.status) vozIAPausa = Date.now() + (e.diario ? 60 : e.status === 429 ? 1 : 30) * 60000;
              return null;
            });
          },
          antes: function () { callar(); },
          alEstado: estadoLectura,
          alBoca: bocaLectura,
          alAviso: function (t) { mostrarBurbuja(t); },
          alSenalar: senalarLectura,
          // Con la voz local cada parte es una frase o dos (se genera rápido y suena seguido).
          letrasParte: function () { return vozLocalLista() ? 170 : 480; },
          maxEspera: function () { return vozLocalLista() ? 12000 : 3000; },
        });
      });
      // La voz natural también se "despierta" en este mismo toque.
      desbloquearAudio();
      return cargaLector.then(function () { fn(lector); });
    }
    // ---------- Menú general (⋯) ----------
    function iconoMenu(accion, ico, texto) {
      return '<button type="button" role="menuitem" data-accion="' + accion + '" aria-label="' + texto + '" title="' + texto + '" class="grid place-items-center w-11 h-11 rounded-full bg-white text-xl shadow-lg shadow-blue-900/20 ring-1 ring-sky-100 hover:bg-sky-50 hover:scale-110 transition-transform motion-reduce:transition-none ' + FOCO + '">' + ico + '</button>';
    }
    // Los íconos salen sobre la cabeza, uno tras otro (o debajo, si la mascota está arriba de la pantalla).
    function menuGeneral(si) {
      var m = raiz && raiz.querySelector('#mascota-menu');
      if (!m) return;
      var abierto = !m.classList.contains('hidden');
      if (si && !abierto) {
        var r = raiz.getBoundingClientRect();
        var arriba = r.top > 80;
        m.style.bottom = arriba ? 'calc(100% + .9rem)' : ''; m.style.top = arriba ? '' : 'calc(100% + .5rem)';
        ocultarBurbuja();
        cerrarDiccionario();
        m.classList.remove('hidden');
        // Centrado sobre la cabeza, pero sin salirse de la pantalla por los lados.
        m.style.transform = 'translateX(-50%)';
        var q = m.getBoundingClientRect(), dx = 0;
        if (q.right > window.innerWidth - 8) dx = window.innerWidth - 8 - q.right;
        if (q.left + dx < 8) dx = 8 - q.left;
        m.style.transform = 'translateX(calc(-50% + ' + Math.round(dx) + 'px))';
        [].forEach.call(m.children, function (b, i) {
          animar(b, [{ transform: 'translateY(' + (arriba ? 18 : -18) + 'px) scale(.3)', opacity: 0 }, { transform: 'translateY(-4px) scale(1.08)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 320, delay: i * 55, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' });
        });
        var p = m.querySelector('button'); if (p) p.focus({ preventScroll: true });
      } else if (!si && abierto) m.classList.add('hidden');
      raiz.querySelector('[data-accion="menu"]').setAttribute('aria-expanded', si ? 'true' : 'false');
      raiz.querySelector('[data-accion="menu"]').textContent = si ? '✕' : '⋯';
    }
    function botonLectura(accion) {
      var e = lector ? lector.estado() : 'quieto';
      if (accion === 'leer') {
        if (e === 'leyendo' || e === 'cargando') return lector.pausar();
        if (e === 'pausa') return lector.seguir();
        if (e === 'eligiendo') return lector.cancelarEleccion();
        return;
      }
      if (accion === 'detener-lectura') { if (lector) lector.detener(); return; }
      if (accion === 'leer-parrafo' || accion === 'leer-todo') {
        cerrarDiccionario();
        conLector(function (l) { if (accion === 'leer-parrafo') l.parrafo(); else l.todo(); });
      }
    }
    function estadoLectura(e) {
      var b = raiz.querySelector('[data-accion="leer"]'), parar = raiz.querySelector('[data-accion="detener-lectura"]');
      if (!b) return;
      var ico = { eligiendo: '👆', cargando: '⏳', leyendo: '⏸', pausa: '▶' }[e] || '⏸';
      var txt = { eligiendo: 'Cancelar: no leer', cargando: 'Preparando la voz…', leyendo: 'Pausar la lectura', pausa: 'Seguir leyendo' }[e] || '';
      b.textContent = ico;
      b.setAttribute('aria-label', txt); b.title = txt;
      b.classList.toggle('hidden', e === 'quieto');
      b.classList.toggle('motion-safe:animate-pulse', e === 'eligiendo' || e === 'cargando');
      parar.classList.toggle('hidden', e === 'quieto' || e === 'eligiendo');
      var todo = raiz.querySelector('[data-accion="leer-todo"]');
      if (todo) todo.classList.toggle('hidden', e !== 'eligiendo');
      if (e === 'eligiendo') mostrarBurbuja('👆 Toca el párrafo que quieres que lea, o 📄 para leer toda la actividad.');
      else if (e !== 'quieto') ocultarBurbuja();
      if (e === 'quieto' || e === 'pausa') bocaLectura(0, false);
      if (e === 'quieto') senalarLectura(null);
      pintarAtuendo(); // lentes mientras lee
    }
    // Al leer, la mascota "expone": levanta el brazo hacia la oración y una
    // manito 👈 la señala (sigue a la oración aunque se mueva la página).
    var senal = { rect: null, mano: null, brazo: null, lado: '', reloj: 0 };
    function senalarLectura(rect) {
      senal.rect = rect;
      if (!rect) {
        if (senal.mano) senal.mano.hidden = true;
        if (senal.brazo) { senal.brazo.cancel(); senal.brazo = null; }
        senal.lado = '';
        clearInterval(senal.reloj); senal.reloj = 0;
        return;
      }
      if (!senal.mano) {
        senal.mano = document.createElement('div');
        senal.mano.id = 'mascota-senal';
        senal.mano.setAttribute('aria-hidden', 'true');
        senal.mano.style.cssText = 'position:fixed;z-index:1049;left:0;top:0;font-size:30px;line-height:1;pointer-events:none;filter:drop-shadow(0 3px 4px rgba(30,58,138,.35));transition:transform .45s cubic-bezier(.3,1.3,.5,1)';
        senal.mano.innerHTML = '<span style="display:inline-block"></span>';
        document.body.appendChild(senal.mano);
      }
      colocarSenal(true);
      if (!senal.reloj) senal.reloj = setInterval(function () { colocarSenal(false); }, 250);
    }
    function colocarSenal(nueva) {
      var r = senal.rect && senal.rect();
      var m = senal.mano;
      if (!r || !m || (!r.width && !r.height) || r.bottom < 0 || r.top > window.innerHeight) { if (m) m.hidden = true; return; }
      var yo = btn.getBoundingClientRect();
      var cx = yo.left + yo.width / 2, cy = yo.top + yo.height * 0.45;
      // La manito queda al lado de la oración que mira hacia la mascota.
      var derecha = cx > r.left + r.width / 2;
      var x = derecha ? Math.min(window.innerWidth - 40, r.right + 6) : Math.max(4, r.left - 38);
      var y = r.top + r.height / 2 - 16;
      m.hidden = false;
      m.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
      var s = m.firstChild;
      var lado = derecha ? 'izq' : 'der';
      if (s.textContent !== (derecha ? '👈' : '👉')) s.textContent = derecha ? '👈' : '👉';
      if (!reducirMovimiento() && s.animate && (nueva || !s._toque)) {
        if (s._toque) s._toque.cancel();
        s._toque = s.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + (derecha ? -7 : 7) + 'px)' }], { duration: 520, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      }
      // El brazo del lado de la oración se levanta hacia ella y "explica" (sube y baja un poco).
      if (nueva || lado !== senal.lado) {
        senal.lado = lado;
        if (senal.brazo) senal.brazo.cancel();
        var ang = Math.atan2(y + 16 - cy, (derecha ? r.right : r.left) - cx) * 180 / Math.PI;
        // El brazo cuelga hacia abajo (90° en pantalla); girarlo g grados lo apunta a 90° + g.
        var g = ang - 90;
        while (g > 180) g -= 360;
        while (g <= -180) g += 360;
        g = (g < 0 ? -1 : 1) * Math.max(60, Math.min(150, Math.abs(g)));
        senal.brazo = animar(parte(derecha ? 'brazo-izq' : 'brazo-der'), [{ transform: rot(g * 0.92) }, { transform: rot(g * 1.04) }], { duration: 700, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      }
    }

    // ---------- 🔍 Diccionario ----------
    // El estudiante selecciona una palabra (o una expresión corta) de la
    // actividad: la mascota saca su lupa y la explica sencillo, como un amigo,
    // en el sentido de la frase. "💡 Un ejemplo" pide un ejemplo cotidiano.
    var dicc = { termino: '', frase: '', texto: '', ejemplo: '', cache: {}, turno: 0, lupa: null };
    function diccionarioActivo() { return C.diccionario !== false && datos.diccionario !== false; }
    function revisarSeleccion() {
      if (!diccionarioActivo() || !activa() || panel) return;
      var s = window.getSelection && window.getSelection();
      if (!s || s.isCollapsed || !s.rangeCount) return;
      var zona = document.querySelector('#activity .panel-body') || document.getElementById('activity');
      var r = s.getRangeAt(0);
      if (!zona || !zona.contains(r.commonAncestorContainer) || raiz.contains(r.commonAncestorContainer)) return;
      var t = s.toString().replace(/\s+/g, ' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim();
      // Solo palabras o expresiones cortas (seleccionar un párrafo entero no es "buscar una palabra").
      if (t.length < 2 || t.length > 60 || t.split(' ').length > 6 || !/\p{L}/u.test(t)) return;
      if (t.toLowerCase() === dicc.termino.toLowerCase() && !raiz.querySelector('#mascota-dicc').classList.contains('hidden')) return;
      var nodo = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
      var bloque = nodo.closest('p, li, td, h1, h2, h3, h4, h5, h6, blockquote, label') || nodo;
      explicarTermino(t, (bloque.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 300));
    }
    // Las actividades desactivan la selección de texto (css/folleto2.css, para
    // que arrastrar no seleccione): por eso la palabra se elige con DOBLE CLIC
    // (o manteniendo el dedo en el celular) y se busca aquí cuál está bajo el
    // puntero, midiendo cada palabra del párrafo.
    var tocaCelular = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    function palabraEn(x, y) {
      var zona = document.querySelector('#activity .panel-body') || document.getElementById('activity');
      var pila = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [];
      var el = null;
      for (var i = 0; i < pila.length; i++) {
        var p = pila[i];
        if (!zona || !zona.contains(p) || raiz.contains(p) || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(p.tagName)) continue;
        el = p.closest('p, li, td, th, h1, h2, h3, h4, h5, h6, blockquote, label, span, div') || p;
        break;
      }
      if (!el) return null;
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n, m, r = document.createRange();
      while ((n = w.nextNode())) {
        var re = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
        while ((m = re.exec(n.textContent))) {
          r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
          var cajas = r.getClientRects();
          for (var k = 0; k < cajas.length; k++) {
            var c = cajas[k];
            if (x >= c.left - 2 && x <= c.right + 2 && y >= c.top - 2 && y <= c.bottom + 2) return { nodo: n, ini: m.index, fin: m.index + m[0].length, texto: m[0], bloque: el };
          }
        }
      }
      return null;
    }
    var HL_DICC = window.CSS && CSS.highlights && window.Highlight ? new Highlight() : null;
    if (HL_DICC) {
      CSS.highlights.set('mascota-dicc', HL_DICC);
      var estDicc = document.createElement('style');
      estDicc.textContent = '::highlight(mascota-dicc){background-color:rgba(56,189,248,.3);text-decoration:underline wavy #2563eb 2px;text-underline-offset:3px}';
      document.head.appendChild(estDicc);
    }
    function buscarEn(x, y) {
      if (!diccionarioActivo() || !activa() || panel) return false;
      var p = palabraEn(x, y);
      if (!p) return false;
      if (HL_DICC) { var r = document.createRange(); r.setStart(p.nodo, p.ini); r.setEnd(p.nodo, p.fin); HL_DICC.clear(); HL_DICC.add(r); }
      var bloque = p.bloque.closest('p, li, td, h1, h2, h3, h4, h5, h6, blockquote, label') || p.bloque;
      explicarTermino(p.texto, (bloque.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 300));
      return true;
    }
    function escucharGestos() {
      document.addEventListener('dblclick', function (e) { buscarEn(e.clientX, e.clientY); });
      // Celular: mantener el dedo ~0,55 s sobre la palabra.
      var toque = null;
      document.addEventListener('touchstart', function (e) {
        if (e.touches.length !== 1) { toque = null; return; }
        var t = e.touches[0];
        toque = { x: t.clientX, y: t.clientY, reloj: setTimeout(function () { if (toque) { buscarEn(toque.x, toque.y); toque = null; } }, 550) };
      }, { passive: true });
      var cancelar = function () { if (toque) { clearTimeout(toque.reloj); toque = null; } };
      document.addEventListener('touchmove', function (e) { if (toque && Math.hypot(e.touches[0].clientX - toque.x, e.touches[0].clientY - toque.y) > 10) cancelar(); }, { passive: true });
      document.addEventListener('touchend', cancelar, { passive: true });
      document.addEventListener('touchcancel', cancelar, { passive: true });
    }
    // La lupa se dibuja DENTRO del brazo (en su mano): así se mueve con él.
    // La mascota levanta ese brazo hacia su cara, como mirando a través.
    var SVGNS = 'http://www.w3.org/2000/svg';
    function manoDe(brazo) {
      // Personajes con brazo de línea: la mano es el círculo del final.
      var c = brazo.querySelector('circle');
      if (c) return { x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), r: +c.getAttribute('r') || 4 };
      // Alas o aletas: el extremo de abajo (cuelgan del hombro).
      try { var b = brazo.getBBox(); return { x: b.x + b.width / 2, y: b.y + b.height, r: 3 }; } catch (e) { return null; }
    }
    function ponerLupa(si) {
      if (dicc.anims) { dicc.anims.forEach(function (x) { if (x) x.cancel(); }); dicc.anims = null; }
      if (dicc.lupa) { var br = dicc.lupa.parentNode; dicc.lupa.remove(); dicc.lupa = null; if (br && br.style) br.style.transform = ''; }
      if (!si) return;
      // El brazo del lado de la actividad (la mascota suele estar a la derecha).
      var r = raiz.getBoundingClientRect();
      var izqPantalla = r.left + r.width / 2 > window.innerWidth / 2;
      var brazo = parte(izqPantalla ? 'brazo-izq' : 'brazo-der');
      var m = brazo && manoDe(brazo);
      if (m) {
        // Mango desde la mano y lente un poco más allá (en la dirección del brazo: hacia abajo antes de girar).
        var t = Math.max(5, m.r * 1.6);
        var g = document.createElementNS(SVGNS, 'g');
        g.setAttribute('class', 'mascota-lupa');
        g.innerHTML =
          '<line x1="' + m.x + '" y1="' + m.y + '" x2="' + m.x + '" y2="' + (m.y + t * 1.1) + '" stroke="#78350f" stroke-width="' + (t * 0.42).toFixed(1) + '" stroke-linecap="round"/>' +
          '<circle cx="' + m.x + '" cy="' + (m.y + t * 2) + '" r="' + t + '" fill="rgba(186,230,253,.55)" stroke="#1e3a8a" stroke-width="' + (t * 0.32).toFixed(1) + '"/>' +
          '<circle cx="' + (m.x - t * 0.35) + '" cy="' + (m.y + t * 1.65) + '" r="' + (t * 0.25).toFixed(1) + '" fill="#fff" opacity=".9"/>';
        brazo.appendChild(g);
        dicc.lupa = g;
        dicc.brazo = brazo; dicc.giro = izqPantalla ? 150 : -150;
        levantarLupa(true);
        dicc.anims.push(animar(g, [{ opacity: 0 }, { opacity: 1 }], { duration: 250 }));
      }
      if (MOV.meneo) MOV.meneo();
      animar(parte('ojos'), [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.1)' }, { transform: 'scaleY(1)' }, { transform: 'scaleY(0.1)' }, { transform: 'scaleY(1)' }], { duration: 420, delay: 200 });
    }
    // Levanta el brazo con la lupa hacia la cara y "busca" moviéndola un poco.
    // (Se vuelve a llamar si la mascota reinicia sus animaciones de reposo.)
    function levantarLupa(conSubida) {
      if (!dicc.lupa || !dicc.brazo) return;
      if (dicc.anims) dicc.anims.forEach(function (x) { if (x) x.cancel(); });
      var brazo = dicc.brazo, giro = dicc.giro, d = giro > 0 ? 1 : -1;
      dicc.anims = [
        conSubida ? animar(brazo, [{ transform: rot(0) }, { transform: rot(giro) }], { duration: 450, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'forwards' }) : null,
        animar(brazo, [{ transform: rot(giro) }, { transform: rot(giro - 12 * d) }, { transform: rot(giro + 8 * d) }, { transform: rot(giro) }], { duration: 1600, delay: conSubida ? 450 : 0, iterations: Infinity, easing: 'ease-in-out' }),
      ];
      if (reducirMovimiento()) brazo.style.transform = rot(giro);
    }
    function abrirDiccionario() {
      var c = raiz.querySelector('#mascota-dicc');
      var r = raiz.getBoundingClientRect();
      var abajo = r.top < window.innerHeight / 2, izq = r.left + r.width / 2 < window.innerWidth / 2;
      if (window.innerWidth < 640) {
        // Celular: a lo ancho de la pantalla, encima (o debajo) de la mascota, sin salirse por los lados.
        c.style.position = 'fixed'; c.style.left = '12px'; c.style.right = '12px'; c.style.width = 'auto';
        c.style.top = abajo ? Math.round(r.bottom + 8) + 'px' : ''; c.style.bottom = abajo ? '' : Math.round(window.innerHeight - r.top + 10) + 'px';
      } else {
        c.style.position = ''; c.style.width = '';
        c.style.top = abajo ? '100%' : ''; c.style.bottom = abajo ? '' : 'calc(100% + .75rem)';
        c.style.left = izq ? '0' : ''; c.style.right = izq ? '' : '0';
      }
      c.classList.remove('hidden');
      ocultarBurbuja();
      menuGeneral(false);
    }
    function cerrarDiccionario() {
      var c = raiz && raiz.querySelector('#mascota-dicc');
      if (c) c.classList.add('hidden');
      dicc.turno++;
      ponerLupa(false);
      if (HL_DICC) HL_DICC.clear();
    }
    function pedirExplicacion(termino, frase, ejemplo) {
      var k = (ejemplo ? 'ej|' : '') + termino.toLowerCase() + '|' + (ejemplo ? '' : frase.slice(0, 80));
      if (dicc.cache[k]) return Promise.resolve({ texto: dicc.cache[k] });
      if (!iaConfigurada()) return Promise.resolve({ texto: '', error: 'sin IA' });
      scriptIA = scriptIA || cargar(carpeta + 'ia.js' + version);
      var ctx = { libro: nombreMateria(), publico: C.publico, mascota: nombre(), config: C.ia };
      return scriptIA.then(function () { return window.MascotaIA.explicar(ctx, termino, frase, ejemplo); }).then(function (r) {
        if (r.texto) dicc.cache[k] = r.texto;
        return r;
      }).catch(function () { return { texto: '', error: 'sin conexión' }; });
    }
    function explicarTermino(termino, frase) {
      var mio = ++dicc.turno;
      dicc.termino = termino; dicc.frase = frase; dicc.texto = ''; dicc.ejemplo = '';
      raiz.querySelector('#mascota-dicc-termino').textContent = termino;
      var p = raiz.querySelector('#mascota-dicc-texto');
      p.textContent = '🔍 Déjame ver…';
      p.classList.add('text-slate-500', 'italic');
      raiz.querySelector('#mascota-dicc-ejemplo').classList.add('hidden');
      raiz.querySelector('[data-accion="dicc-ejemplo"]').disabled = true;
      ponerLupa(true);
      abrirDiccionario();
      pedirExplicacion(termino, frase, false).then(function (r) {
        if (mio !== dicc.turno) return;
        p.classList.remove('text-slate-500', 'italic');
        dicc.texto = r.texto || 'Para explicarte «' + termino + '» necesito conectarme con la IA. Mientras tanto, búscala en el glosario de tu libro o pregúntale a tu docente.';
        p.textContent = dicc.texto;
        raiz.querySelector('[data-accion="dicc-ejemplo"]').disabled = !r.texto;
        anuncio.textContent = nombre() + ': ' + dicc.texto;
        if (r.texto) { ponerAnimo('feliz'); volverACalma(4000); }
      });
    }
    function botonDiccionario(accion) {
      if (accion === 'dicc-cerrar') return cerrarDiccionario();
      if (accion === 'dicc-escuchar') return hablar((dicc.texto + ' ' + dicc.ejemplo).trim());
      if (accion === 'dicc-ejemplo') {
        var b = raiz.querySelector('[data-accion="dicc-ejemplo"]'), e = raiz.querySelector('#mascota-dicc-ejemplo');
        var mio = dicc.turno;
        b.disabled = true;
        e.classList.remove('hidden');
        e.textContent = '💡 Pensando un ejemplo…';
        pedirExplicacion(dicc.termino, dicc.frase, true).then(function (r) {
          if (mio !== dicc.turno) return;
          dicc.ejemplo = r.texto ? '💡 ' + r.texto : '';
          e.textContent = dicc.ejemplo || 'Ahora no pude pensar un ejemplo. Intenta otra vez en un momento.';
          b.disabled = false;
        });
      }
    }

    // Boca al leer: la "o" se abre con el volumen de la voz; al callar vuelve su expresión.
    var bocaAbierta = false;
    function bocaLectura(nivel, hablando) {
      var o = parte('boca-o'), fz = parte('boca-feliz');
      if (!o) return;
      if (hablando) {
        if (!bocaAbierta) { bocaAbierta = true; o.style.display = ''; if (fz) fz.style.display = 'none'; o.style.transformBox = 'fill-box'; o.style.transformOrigin = '50% 30%'; }
        o.style.transform = 'scale(' + (0.85 + nivel * 0.25).toFixed(2) + ',' + (0.2 + nivel * 1.1).toFixed(2) + ')';
      } else if (bocaAbierta) {
        bocaAbierta = false;
        o.style.transform = '';
        aplicarExpresion();
      }
    }

    // Botón "Mascota" en la barra flotante: hereda estilo y tooltip
    // (data-info) de los demás botones de builder.js, sin tocar ese archivo.
    function crearBotonBarra() {
      var nav = document.querySelector('#navbar .nav');
      if (!nav) return;
      var li = document.createElement('li');
      li.innerHTML = '<button type="button" id="mascota-nav" class="btn button mytooltip" data-info="Mascota" aria-label="Mascota: personaje, color y opciones" aria-haspopup="dialog" style="background:linear-gradient(150deg,#7dd3fc,#0ea5e9);padding:4px"></button>';
      var x = document.getElementById('toggle-btn-navbar-Ocultar');
      if (x && x.parentNode === nav) nav.insertBefore(li, x);
      else nav.appendChild(li);
      botonNav = li.firstChild;
      botonNav.addEventListener('click', function () {
        botonNav.classList.add('no-tip');
        abrirPanel(datos.tipo ? 'chat' : 'editar');
      });
      botonNav.addEventListener('mouseleave', function () {
        if (!panel) botonNav.classList.remove('no-tip');
      });
    }

    function pintar() {
      var sin = !datos.tipo;
      var mini = datos.minimizada || sin;
      raiz.classList.toggle('hidden', !datos.visible && !sin);
      btn.className = 'block touch-none cursor-grab active:cursor-grabbing ' + FOCO + ' ' +
        (mini ? 'w-12 h-12 rounded-full bg-white shadow-lg ring-1 ring-slate-200 p-1 text-2xl leading-none' : TAMANOS[datos.tamano].clase + ' rounded-3xl bg-transparent p-0');
      if (sin) {
        btn.innerHTML = '<span aria-hidden="true">🐾</span>';
        btn.setAttribute('aria-label', 'Elegir una mascota que te acompañe');
      } else {
        btn.innerHTML = '<span id="mascota-figura" class="block w-full h-full">' + DIBUJO.dibujar(datos.tipo, hexDe(datos.color, datos.tipo), atuendoActual()) + '</span>';
        btn.setAttribute('aria-label', mini ? 'Mostrar a ' + nombre() : nombre() + ', tu mascota. Actívala para jugar; con las flechas la mueves.');
      }
      raiz.querySelector('#mascota-controles').classList.toggle('hidden', mini);
      if (mini) { ocultarBurbuja(); menuGeneral(false); cerrarDiccionario(); }
      if (botonNav) botonNav.innerHTML = datos.tipo ? '<span class="block w-full h-full pointer-events-none">' + DIBUJO.dibujar(datos.tipo, hexDe(datos.color, datos.tipo), []) + '</span>' : '<span aria-hidden="true" style="font-size:20px;line-height:1">🐾</span>';
      aplicarExpresion();
      reiniciarBucles();
      aplicarPosicion();
      reservarEspacio();
    }
    // Espacio al final de la página para que no tape el último contenido
    // (al imprimir misEstilos.css deja el padding en 0).
    function reservarEspacio() {
      document.body.style.paddingBottom = raiz.classList.contains('hidden') ? '' : btn.offsetHeight + 28 + 'px';
    }

    // ---------- Posición ----------
    // Se guarda el CENTRO de la mascota como fracción de la pantalla: sirve
    // en otro tamaño de ventana y aunque la mascota cambie de tamaño.
    var M = 12;
    function colocar(cx, cy) {
      var w = raiz.offsetWidth, h = raiz.offsetHeight;
      var x = limitar(cx - w / 2, M, Math.max(M, window.innerWidth - w - M));
      var y = limitar(cy - h / 2, M, Math.max(M, window.innerHeight - h - M));
      raiz.style.cssText = 'left:' + x + 'px;top:' + y + 'px';
    }
    function aplicarPosicion() {
      var p = posicion();
      // Sin posición guardada: la de config.js (encima del profesor con IA, que va en la esquina).
      var base = (window.innerWidth < 640 && C.posicionCelular) || C.posicion || {};
      var derecha = Number(base.derecha) >= 0 ? Number(base.derecha) : 16, abajo = Number(base.abajo) >= 0 ? Number(base.abajo) : 16;
      if (!p) raiz.style.cssText = 'right:' + derecha + 'px;bottom:calc(' + abajo + 'px + env(safe-area-inset-bottom))';
      else colocar(p.x * window.innerWidth, p.y * window.innerHeight);
    }
    function moverA(x, y) {
      colocar(x + raiz.offsetWidth / 2, y + raiz.offsetHeight / 2);
    }
    function recordarPosicion() {
      var r = raiz.getBoundingClientRect();
      var p = { x: limitar((r.left + r.width / 2) / window.innerWidth, 0, 1), y: limitar((r.top + r.height / 2) / window.innerHeight, 0, 1) };
      if (C.recordarPosicion === 'siempre') {
        datos.posicion = p;
        guardar();
      } else if (C.recordarPosicion === 'sesion') {
        ses.posicion = p;
        guardarSesion();
      } else posPagina = p;
    }
    function volverAEsquina() {
      datos.posicion = null;
      ses.posicion = null;
      posPagina = null;
      guardar();
      guardarSesion();
      aplicarPosicion();
    }

    var suprimirClic = false;
    function activarArrastre() {
      var ini = null;
      var moviendo = false;
      btn.addEventListener('pointerdown', function (e) {
        if (e.button) return;
        var r = raiz.getBoundingClientRect();
        ini = { x: e.clientX, y: e.clientY, l: r.left, t: r.top, id: e.pointerId };
        moviendo = false;
      });
      btn.addEventListener('pointermove', function (e) {
        if (!ini || e.pointerId !== ini.id) return;
        var dx = e.clientX - ini.x;
        var dy = e.clientY - ini.y;
        if (!moviendo && dx * dx + dy * dy > 36) {
          moviendo = true;
          try { btn.setPointerCapture(e.pointerId); } catch (err) {}
          ocultarBurbuja();
        }
        if (moviendo) moverA(ini.l + dx, ini.t + dy);
      });
      var soltar = function (e) {
        if (!ini || e.pointerId !== ini.id) return;
        if (moviendo) {
          recordarPosicion();
          suprimirClic = true; // el clic que sigue al soltar no cuenta
          if (activa()) accion('rebote');
        }
        ini = null;
        moviendo = false;
      };
      btn.addEventListener('pointerup', soltar);
      btn.addEventListener('pointercancel', soltar);
    }
    // Teclado como alternativa al arrastre (Shift = paso grande).
    function teclasMascota(e) {
      var p = e.shiftKey ? 60 : 20;
      var d = { ArrowLeft: [-p, 0], ArrowRight: [p, 0], ArrowUp: [0, -p], ArrowDown: [0, p] }[e.key];
      if (!d) return;
      e.preventDefault();
      var r = raiz.getBoundingClientRect();
      moverA(r.left + d[0], r.top + d[1]);
      recordarPosicion();
    }

    // =================================================================
    // ÁNIMO, EXPRESIONES Y MOVIMIENTO
    // feliz · jugueton · tranquilo · dormido · extranando
    // =================================================================
    var animo = 'tranquilo';
    var EXPRESION = {
      feliz: ['ojos', 'boca-feliz'],
      jugueton: ['ojos', 'boca-o'],
      tranquilo: ['ojos', 'boca-feliz'],
      dormido: ['ojos-cerrados', 'boca-o', 'zzz'],
      extranando: ['ojos', 'boca-o'],
    };
    function parte(n) { return btn.querySelector('[data-parte="' + n + '"]'); }
    function aplicarExpresion() {
      var ver = EXPRESION[animo];
      ['ojos', 'ojos-cerrados', 'boca-feliz', 'boca-o', 'zzz'].forEach(function (p) {
        var el = parte(p);
        if (el) el.style.display = ver.indexOf(p) >= 0 ? '' : 'none';
      });
      raiz.setAttribute('data-animo', animo);
    }
    function ponerAnimo(a) {
      if (!EXPRESION[a] || a === animo) return;
      animo = a;
      aplicarExpresion();
      reiniciarBucles();
      pintarAtuendo(); // gafas de sol al descansar
    }

    // ---------- Atuendo automático ----------
    // No se elige: audífonos mientras el estudiante usa el micrófono, lentes
    // mientras lee, gafas de sol cuando descansa y, de vez en cuando, bufanda.
    var atu = { mic: false, bufanda: false, reconocedores: 0, flujos: [] };
    function atuendoActual() {
      var l = [];
      if (atu.mic) l.push('audifonos');
      var e = lector ? lector.estado() : 'quieto';
      if (e === 'leyendo' || e === 'cargando' || e === 'pausa') l.push('lentes');
      else if (animo === 'dormido') l.push('gafasSol');
      if (atu.bufanda) l.push('bufanda');
      return l;
    }
    function pintarAtuendo() {
      var g = btn && btn.querySelector('[data-parte="atuendo"]');
      if (!g || !datos.tipo) return;
      var html = DIBUJO.atuendo(datos.tipo, atuendoActual());
      if (g._html === html) return;
      g._html = html;
      g.innerHTML = html;
      animar(g, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
    }
    // ¿Se está usando el micrófono en la página (dictado o grabación)?
    function revisarMicrofono() {
      atu.flujos = atu.flujos.filter(function (s) { return s.getAudioTracks().some(function (t) { return t.readyState === 'live' && t.enabled; }); });
      var si = atu.reconocedores > 0 || atu.flujos.length > 0;
      if (si !== atu.mic) { atu.mic = si; pintarAtuendo(); }
    }
    function vigilarMicrofono() {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR && SR.prototype && !SR.prototype.__mascota) {
        var iniciar = SR.prototype.start;
        SR.prototype.start = function () {
          var r = this, listo = false;
          var fin = function () { if (listo) return; listo = true; atu.reconocedores = Math.max(0, atu.reconocedores - 1); revisarMicrofono(); };
          atu.reconocedores++;
          r.addEventListener('end', fin);
          r.addEventListener('error', fin);
          revisarMicrofono();
          try { return iniciar.apply(this, arguments); } catch (e) { fin(); throw e; }
        };
        SR.prototype.__mascota = true;
      }
      var md = navigator.mediaDevices;
      if (md && md.getUserMedia && !md.__mascota) {
        var pedir = md.getUserMedia.bind(md);
        md.getUserMedia = function (c) {
          return pedir(c).then(function (s) { if (c && c.audio) { atu.flujos.push(s); revisarMicrofono(); } return s; });
        };
        md.__mascota = true;
      }
      setInterval(function () { if (atu.flujos.length || atu.mic) revisarMicrofono(); }, 1000);
    }
    // De vez en cuando (cada 5 a 9 minutos) se pone la bufanda un ratito.
    function bufandaDeVezEnCuando(primera) {
      setTimeout(function () {
        if (activa() && !document.hidden) {
          atu.bufanda = true; pintarAtuendo();
          setTimeout(function () { atu.bufanda = false; pintarAtuendo(); }, 75000);
        }
        bufandaDeVezEnCuando(false);
      }, (primera ? 60 + Math.random() * 120 : 300 + Math.random() * 240) * 1000);
    }
    var tCalma = null;
    function volverACalma(ms) {
      clearTimeout(tCalma);
      tCalma = setTimeout(function () { if (animo !== 'dormido') ponerAnimo('tranquilo'); }, ms);
    }

    // En reposo: respira, mueve su parte "extra" y parpadea. Todo se
    // detiene si está minimizada, oculta o con "reducir movimiento".
    var bucles = [];
    var tParpadeo = null;
    function reiniciarBucles() {
      bucles.forEach(function (a) { a.cancel(); });
      bucles = [];
      clearTimeout(tParpadeo);
      if (!activa() || reducirMovimiento()) return;
      var dormido = animo === 'dormido';
      var rapido = animo === 'jugueton' || animo === 'extranando';
      [
        animar(parte('cuerpo'), [{ transform: 'scale(1,1)' }, { transform: 'scale(1.025,1.045)' }, { transform: 'scale(1,1)' }], { duration: dormido ? 5200 : rapido ? 1800 : 3400, iterations: Infinity, easing: 'ease-in-out' }),
        !dormido && animar(parte('extra'), DIBUJO.movimiento(datos.tipo), { duration: rapido ? 450 : 1700, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }),
        !dormido && animar(parte('pie-izq'), [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(0) rotate(0)', offset: 0.7 }, { transform: 'translateY(-2px) rotate(-8deg)', offset: 0.8 }, { transform: 'translateY(0) rotate(0)', offset: 0.9 }, { transform: 'translateY(0) rotate(0)' }], { duration: 3200, iterations: Infinity }),
        !dormido && animar(parte('pie-der'), [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(0) rotate(0)', offset: 0.7 }, { transform: 'translateY(-2px) rotate(8deg)', offset: 0.8 }, { transform: 'translateY(0) rotate(0)', offset: 0.9 }, { transform: 'translateY(0) rotate(0)' }], { duration: 3200, delay: 1600, iterations: Infinity }),
        !dormido && animar(parte('brazo-izq'), [{ transform: 'rotate(-4deg)' }, { transform: 'rotate(6deg)' }], { duration: 2400, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }),
        !dormido && animar(parte('brazo-der'), [{ transform: 'rotate(4deg)' }, { transform: 'rotate(-6deg)' }], { duration: 2600, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }),
        dormido && animar(parte('zzz'), [{ transform: 'translateY(4px)', opacity: 0.3 }, { transform: 'translateY(-4px)', opacity: 1 }], { duration: 1800, iterations: Infinity, direction: 'alternate' }),
      ].forEach(function (a) { if (a) bucles.push(a); });
      if (!dormido) parpadear();
      // Si tiene la lupa en la mano o está señalando al leer, ese brazo sigue arriba.
      if (typeof dicc !== 'undefined' && dicc && dicc.lupa) levantarLupa(false);
      if (typeof senal !== 'undefined' && senal && senal.rect) { senal.lado = ''; colocarSenal(false); }
    }
    function parpadear() {
      tParpadeo = setTimeout(function () {
        animar(parte('ojos'), [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.1)' }, { transform: 'scaleY(1)' }], { duration: 170 });
        parpadear();
      }, 2200 + Math.random() * 3800);
    }

    // Giro de brazos ajustado a cada personaje (alas y aletas giran menos).
    function rot(grados) { return 'rotate(' + grados * DIBUJO.giroBrazos(datos.tipo) + 'deg)'; }
    // Movimientos enérgicos. "figura" (HTML) = todo el personaje;
    // "cuerpo" (SVG) = estirar y aplastar, sumado a la respiración.
    function f() { return btn.querySelector('#mascota-figura'); }
    var MOV = {
      salto: function () { return animar(parte('cuerpo'), [{ transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(0) scale(1.1,.88)', offset: 0.15 }, { transform: 'translateY(-24px) scale(.94,1.08)', offset: 0.5 }, { transform: 'translateY(0) scale(1.08,.92)', offset: 0.85 }, { transform: 'translateY(0) scale(1,1)' }], { duration: 520, easing: 'ease-out', composite: 'add' }); },
      dobleSalto: function () { return animar(parte('cuerpo'), [{ transform: 'translateY(0)' }, { transform: 'translateY(-26px)', offset: 0.25 }, { transform: 'translateY(0) scale(1.08,.92)', offset: 0.5 }, { transform: 'translateY(-34px)', offset: 0.75 }, { transform: 'translateY(0)' }], { duration: 900, easing: 'ease-in-out', composite: 'add' }); },
      voltereta: function () { return animar(f(), [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-36px) rotate(180deg)', offset: 0.5 }, { transform: 'translateY(0) rotate(360deg)' }], { duration: 760, easing: 'cubic-bezier(.3,.7,.4,1)' }); },
      giro: function () { return animar(f(), [{ transform: 'scaleX(1)' }, { transform: 'scaleX(-1)', offset: 0.25 }, { transform: 'scaleX(1)', offset: 0.5 }, { transform: 'scaleX(-1)', offset: 0.75 }, { transform: 'scaleX(1)' }], { duration: 900, easing: 'ease-in-out' }); },
      baile: function () { return animar(f(), [{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg) translate(-6px,-4px)' }, { transform: 'rotate(0) translateY(-12px)' }, { transform: 'rotate(14deg) translate(6px,-4px)' }, { transform: 'rotate(0)' }], { duration: 760, iterations: 3, easing: 'ease-in-out' }); },
      meneo: function () { return animar(f(), [{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(0)' }], { duration: 520, easing: 'ease-in-out' }); },
      latido: function () { return animar(f(), [{ transform: 'scale(1)' }, { transform: 'scale(1.16)', offset: 0.2 }, { transform: 'scale(1)', offset: 0.4 }, { transform: 'scale(1.1)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 760 }); },
      estirarse: function () { return animar(parte('cuerpo'), [{ transform: 'scale(1,1)' }, { transform: 'scale(.92,1.2)', offset: 0.45 }, { transform: 'scale(1.06,.94)', offset: 0.75 }, { transform: 'scale(1,1)' }], { duration: 1000, easing: 'ease-in-out', composite: 'add' }); },
      saludo: function () { return animar(f(), [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg) translateY(-8px)', offset: 0.25 }, { transform: 'rotate(10deg) translateY(-4px)', offset: 0.5 }, { transform: 'rotate(-8deg) translateY(-6px)', offset: 0.75 }, { transform: 'rotate(0)' }], { duration: 900, easing: 'ease-in-out' }); },
      rebote: function () { return animar(f(), [{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)', offset: 0.2 }, { transform: 'translateY(0)', offset: 0.4 }, { transform: 'translateY(-8px)', offset: 0.6 }, { transform: 'translateY(0)', offset: 0.8 }, { transform: 'translateY(-3px)', offset: 0.9 }, { transform: 'translateY(0)' }], { duration: 760 }); },
      cohete: function () { return animar(f(), [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(6px) scale(1.1,.85)', offset: 0.15 }, { transform: 'translateY(-70px) scale(.9,1.12)', offset: 0.5 }, { transform: 'translateY(0) scale(1.1,.88)', offset: 0.85 }, { transform: 'translateY(0) scale(1)' }], { duration: 1000, easing: 'ease-in-out' }); },
      mareo: function () { return animar(f(), [{ transform: 'rotate(0)' }, { transform: 'rotate(540deg) scale(.9)', offset: 0.6 }, { transform: 'rotate(700deg) translateX(-4px)', offset: 0.8 }, { transform: 'rotate(720deg)' }], { duration: 1400, easing: 'ease-out' }); },
      // Zapateo: los pies se levantan por turnos.
      zapatear: function () {
        var k = function (s) { return [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-4px) rotate(' + 9 * s + 'deg)', offset: 0.25 }, { transform: 'translateY(0) rotate(0)', offset: 0.5 }, { transform: 'translateY(-4px) rotate(' + 9 * s + 'deg)', offset: 0.75 }, { transform: 'translateY(0) rotate(0)' }]; };
        animar(parte('pie-izq'), k(-1), { duration: 700, iterations: 2, composite: 'add' });
        return animar(parte('pie-der'), k(1), { duration: 700, delay: 350, iterations: 2, composite: 'add' });
      },
      // Brazo derecho arriba saludando (gira desde el hombro).
      saludarBrazo: function () {
        return animar(parte('brazo-der'), [{ transform: 'rotate(0)' }, { transform: rot(-150), offset: 0.25 }, { transform: rot(-115), offset: 0.4 }, { transform: rot(-150), offset: 0.55 }, { transform: rot(-115), offset: 0.7 }, { transform: rot(-150), offset: 0.85 }, { transform: 'rotate(0)' }], { duration: 1600, easing: 'ease-in-out', composite: 'add' });
      },
      // Los dos brazos arriba ("¡lo logré!").
      brazosArriba: function () {
        animar(parte('brazo-izq'), [{ transform: 'rotate(0)' }, { transform: rot(160), offset: 0.3 }, { transform: rot(145), offset: 0.5 }, { transform: rot(160), offset: 0.7 }, { transform: 'rotate(0)' }], { duration: 1300, easing: 'ease-in-out', composite: 'add' });
        return animar(parte('brazo-der'), [{ transform: 'rotate(0)' }, { transform: rot(-160), offset: 0.3 }, { transform: rot(-145), offset: 0.5 }, { transform: rot(-160), offset: 0.7 }, { transform: 'rotate(0)' }], { duration: 1300, easing: 'ease-in-out', composite: 'add' });
      },
      // Aplaudir: brazos al frente, juntándose varias veces.
      aplaudir: function () {
        var k = function (s) { return [{ transform: 'rotate(0)' }, { transform: rot(70 * s), offset: 0.2 }, { transform: rot(45 * s), offset: 0.35 }, { transform: rot(70 * s), offset: 0.5 }, { transform: rot(45 * s), offset: 0.65 }, { transform: rot(70 * s), offset: 0.8 }, { transform: 'rotate(0)' }]; };
        animar(parte('brazo-izq'), k(-1), { duration: 1300, easing: 'ease-in-out', composite: 'add' });
        return animar(parte('brazo-der'), k(1), { duration: 1300, easing: 'ease-in-out', composite: 'add' });
      },
      // Brazos alternando arriba y abajo (para bailar).
      bracear: function () {
        animar(parte('brazo-izq'), [{ transform: 'rotate(0)' }, { transform: rot(150) }, { transform: rot(20) }, { transform: rot(150) }, { transform: 'rotate(0)' }], { duration: 1600, easing: 'ease-in-out', composite: 'add' });
        return animar(parte('brazo-der'), [{ transform: 'rotate(0)' }, { transform: rot(-20) }, { transform: rot(-150) }, { transform: rot(-20) }, { transform: 'rotate(0)' }], { duration: 1600, easing: 'ease-in-out', composite: 'add' });
      },
      // Un brazo a medio subir y quieto un momento: "¡tú puedes!".
      animoBrazo: function () {
        return animar(parte('brazo-der'), [{ transform: 'rotate(0)' }, { transform: rot(-110), offset: 0.25 }, { transform: rot(-120), offset: 0.5 }, { transform: rot(-110), offset: 0.75 }, { transform: 'rotate(0)' }], { duration: 1400, easing: 'ease-in-out', composite: 'add' });
      },
      mirar: function () {
        return animar(parte('ojos'), [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)', offset: 0.25 }, { transform: 'translateX(-3px)', offset: 0.45 }, { transform: 'translateX(3px)', offset: 0.6 }, { transform: 'translateX(3px)', offset: 0.8 }, { transform: 'translateX(0)' }], { duration: 1600 });
      },
    };
    var EFECTOS = {
      confeti: null, // cuadritos de colores
      estrellas: ['⭐', '✨', '🌟'],
      corazones: ['💖', '💛', '💙', '💜'],
      notas: ['🎵', '🎶', '✨'],
      fuego: ['🔥', '⚡', '✨'],
      animo: ['💪', '✨'],
      ideas: ['💡', '✨'],
      escritura: ['✍️', '✨'],
    };
    var COLORES_CONFETI = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ec4899', '#a855f7'];
    // accion('salto', 'estrellas', 8)
    // Gestos de brazos que acompañan a cada movimiento del cuerpo.
    var CON_BRAZOS = { saludo: 'saludarBrazo', estirarse: 'brazosArriba', cohete: 'brazosArriba', voltereta: 'brazosArriba', dobleSalto: 'brazosArriba', baile: 'bracear', latido: 'aplaudir', rebote: 'aplaudir' };
    function accion(mov, efecto, n) {
      if (!activa()) return;
      if (MOV[mov]) MOV[mov]();
      if (CON_BRAZOS[mov] && MOV[CON_BRAZOS[mov]]) MOV[CON_BRAZOS[mov]]();
      if (['baile', 'saludo', 'rebote', 'latido', 'saludarBrazo', 'bracear', 'aplaudir'].indexOf(mov) >= 0) MOV.zapatear();
      if (efecto) particulas(efecto, n || 8);
    }
    function particulas(tipo, n) {
      if (reducirMovimiento() || !activa()) return;
      var emojis = EFECTOS[tipo];
      for (var i = 0; i < n; i++) {
        var s = document.createElement('span');
        if (emojis) {
          s.textContent = emojis[i % emojis.length];
          s.className = 'absolute left-1/2 top-1/4 text-lg';
        } else {
          s.className = 'absolute left-1/2 top-1/3 w-2 h-2 rounded-sm';
          s.style.background = COLORES_CONFETI[i % COLORES_CONFETI.length];
        }
        capa.appendChild(s);
        var dx = (Math.random() - 0.5) * 150;
        var dy = -40 - Math.random() * 80;
        var gira = emojis ? 0 : Math.random() * 720 - 360;
        var a = s.animate([
          { transform: 'translate(-50%,0) scale(.5)', opacity: 0 },
          { transform: 'translate(calc(-50% + ' + dx * 0.5 + 'px),' + dy * 0.6 + 'px) scale(1.1) rotate(' + gira / 2 + 'deg)', opacity: 1, offset: 0.35 },
          { transform: 'translate(calc(-50% + ' + dx + 'px),' + (dy + (emojis ? 0 : 60)) + 'px) scale(.9) rotate(' + gira + 'deg)', opacity: 0 },
        ], { duration: 1100 + Math.random() * 600, delay: i * 45, easing: 'ease-out', fill: 'both' });
        a.onfinish = s.remove.bind(s);
      }
    }

    // Sonido corto generado (sin archivos), solo al hacerle clic.
    var audio = null;
    var TONO = { astronauta: 560, lobo: 340, perro: 600, ajolote: 820, bit: 760, nexo: 700 };
    function sonar() {
      if (!datos.sonido) return;
      try {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audio = audio || new Ctx();
        var t = audio.currentTime;
        var o = audio.createOscillator();
        var g = audio.createGain();
        var fr = (TONO[datos.tipo] || 480) * (0.9 + Math.random() * 0.25);
        o.type = datos.tipo === 'bit' || datos.tipo === 'nexo' ? 'triangle' : 'sine';
        o.frequency.setValueAtTime(fr, t);
        o.frequency.exponentialRampToValueAtTime(fr * 1.9, t + 0.12);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(datos.tipo === 'bit' || datos.tipo === 'nexo' ? 0.06 : 0.1, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g).connect(audio.destination);
        o.start(t);
        o.stop(t + 0.22);
      } catch (e) {}
    }

    // =================================================================
    // MENSAJES
    // =================================================================
    // Sin repetir dentro de cada categoría en toda la sesión (aunque cambie
    // de actividad): los ya dichos se anotan en la sesión.
    function elegir(cat, lista) {
      lista = lista || (C.mensajes[cat] || []);
      if (!lista.length) return '';
      var usados = ses.usados[cat] || [];
      var libres = [];
      for (var i = 0; i < lista.length; i++) if (usados.indexOf(i) < 0) libres.push(i);
      if (!libres.length) {
        var ultimo = usados[usados.length - 1];
        usados = [];
        libres = lista.map(function (_, k) { return k; }).filter(function (k) { return k !== ultimo || lista.length === 1; });
      }
      var k = azar(libres);
      usados.push(k);
      ses.usados[cat] = usados;
      guardarSesion();
      return lista[k];
    }
    var ultimoMensaje = 0;
    var tBurbuja = null;
    // forzar = respuesta a algo que hizo el estudiante (se muestra aunque
    // haya pasado poco). Lo demás respeta la frecuencia elegida.
    function decir(cat, vars, forzar, lista) {
      if (!activa()) return false;
      var ahora = Date.now();
      if (!forzar && ahora - ultimoMensaje < frecuencia().minimo * 1000) return false;
      var texto = elegir(cat, lista);
      if (!texto) return false;
      texto = personalizar(texto, vars);
      ultimoMensaje = ahora;
      mostrarBurbuja(texto);
      return true;
    }
    function mostrarBurbuja(texto) {
      burbuja.textContent = texto;
      var r = raiz.getBoundingClientRect();
      var abajo = r.top < 120;
      var izq = r.left + r.width / 2 < window.innerWidth / 2;
      var cl = burbuja.classList;
      cl.toggle('bottom-full', !abajo);
      cl.toggle('mb-6', !abajo); // deja libres los botones ⋯ y –
      cl.toggle('top-full', abajo);
      cl.toggle('mt-2', abajo);
      cl.toggle('left-0', izq);
      cl.toggle('right-0', !izq);
      cl.remove('opacity-0', 'invisible');
      animar(burbuja, [{ transform: 'translateY(8px) scale(.9)' }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      anuncio.textContent = nombre() + ': ' + texto;
      clearTimeout(tBurbuja);
      tBurbuja = setTimeout(ocultarBurbuja, Math.max(T.burbujaSegundos, texto.length / 14) * 1000);
    }
    function ocultarBurbuja() {
      clearTimeout(tBurbuja);
      if (burbuja) burbuja.classList.add('opacity-0', 'invisible');
    }

    // ---------- Ideas del tema: IA si hay, si no, consejos del libro ----------
    // estadoIA: sinConfigurar · pendiente · probando · conectada · error
    var ideasIA = null; // { curiosidad: [], consejo: [], animo: [] }
    var estadoIA = { estado: 'pendiente', detalle: '' };
    // Materia: la de config.js (nombreLibro) o la que se detecta de la actividad (js/materia.js).
    function materia() { return (window.ProlipaMateria && window.ProlipaMateria.actual()) || null; }
    function nombreMateria() { return C.nombreLibro || (materia() || {}).nombre || 'la materia de esta actividad (dedúcela de su contenido)'; }
    function consejosDelLibro() {
      var porMateria = (C.mensajes.consejoPorMateria || {})[(materia() || {}).id] || [];
      return porMateria.concat(C.mensajes.consejo || []);
    }
    function iaConfigurada() { return !!(C.ia && C.ia.activa && (C.ia.proxyUrl || C.ia.apiKey)); }
    function iaEnUso() { return iaConfigurada() && datos.ia; }
    var scriptIA = null;
    var cargaIA = null;
    var reintentosIA = 0;
    // forzar = "Probar conexión": ignora la caché y los fallos recientes.
    function prepararIA(forzar) {
      if (!iaConfigurada()) {
        estadoIA = { estado: 'sinConfigurar' };
        return Promise.resolve();
      }
      if (!datos.ia) return Promise.resolve();
      if (cargaIA && !forzar) return cargaIA;
      estadoIA = { estado: 'probando' };
      refrescarEstadoIA();
      scriptIA = scriptIA || cargar(carpeta + 'ia.js' + version);
      cargaIA = scriptIA
        .then(function () {
          return window.MascotaIA.obtener({ libro: nombreMateria(), idLibro: LIBRO, pagina: PAGINA, publico: C.publico, mascota: nombre(), config: C.ia }, forzar);
        })
        .then(function (r) {
          if (r.ideas) {
            ideasIA = r.ideas;
            reintentosIA = 0;
            estadoIA = { estado: 'conectada', origen: r.origen };
            avisarConexion(forzar);
          } else {
            estadoIA = { estado: 'error', detalle: r.error || 'No se pudo conectar con la IA.' };
            if (window.console) console.info('Mascota · IA: ' + estadoIA.detalle + (r.permanente ? ' Revisa la clave en js/pet/config.local.js (o el servidor en config.js → ia).' : ' Se vuelve a intentar sola.'));
            // Fallo pasajero (tiempo, internet, 429): reintenta sola, hasta 3 veces.
            if (!r.permanente && reintentosIA < 3) {
              reintentosIA += 1;
              setTimeout(function () { cargaIA = null; prepararIA(); }, 20000 * reintentosIA);
            }
          }
          refrescarEstadoIA();
        })
        .catch(function () {
          estadoIA = { estado: 'error', detalle: 'No se pudo cargar js/pet/ia.js.' };
          refrescarEstadoIA();
        });
      return cargaIA;
    }
    // "¡Estoy conectada a la IA!": una vez por sesión (o al probar la
    // conexión), sin pisar el saludo que esté en pantalla.
    function avisarConexion(forzar) {
      if (ses.iaAvisada && !forzar) return;
      ses.iaAvisada = true;
      guardarSesion();
      var espera = Math.max(forzar ? 0 : 1500, ultimoMensaje + T.burbujaSegundos * 1000 + 400 - Date.now());
      setTimeout(function () {
        accion('cohete', 'ideas', 8);
        decir('iaConectada', null, true);
      }, espera);
    }
    function textoEstadoIA() {
      if (!iaConfigurada()) return '⚪ No configurada: usa las ideas del libro.';
      if (!borrador.ia) return '⚪ Desactivada: usa las ideas del libro.';
      var e = estadoIA;
      if (e.estado === 'probando') return '🟡 Conectando con la IA…';
      if (e.estado === 'conectada') return '🟢 Conectada a la IA' + (e.origen === 'cache' ? ' (ideas guardadas de esta actividad)' : '') + '.';
      if (e.estado === 'error') return '🔴 ' + e.detalle + ' Mientras tanto usa las ideas del libro.';
      return '🟡 Conectando con la IA…';
    }
    // Subtítulo de la cabecera: estado de la IA y avance de hoy.
    function estadoCabecera() {
      var ia = '';
      if (iaConfigurada() && datos.ia) {
        ia = { conectada: '🟢 IA conectada', probando: '🟡 Conectando…', error: '🔴 IA sin conexión' }[estadoIA.estado] || '';
      }
      var n = ses.calificadas.length;
      var hoy = 'Hoy: ' + n + (n === 1 ? ' actividad' : ' actividades') + ' · ' + Math.max(1, Math.round((Date.now() - ses.inicio) / 60000)) + ' min';
      return (ia ? ia + ' · ' : '') + hoy;
    }
    function refrescarEstadoIA() {
      var punto = panel && panel.querySelector('#mp-ia-punto');
      if (punto) {
        var ok = estadoIA.estado === 'conectada';
        punto.style.background = ok ? '#22c55e' : '#facc15';
        punto.setAttribute('aria-label', ok ? 'IA conectada' : 'IA sin conexión');
        punto.title = ok ? 'IA conectada' : 'IA sin conexión';
      }
      var sub = panel && !primera && panel.querySelector('#mp-subtitulo');
      if (sub) sub.textContent = estadoCabecera();
      var el = panel && panel.querySelector('#mp-ia-estado');
      if (el) el.textContent = textoEstadoIA();
      var b = panel && panel.querySelector('[data-p="probarIA"]');
      if (b) b.disabled = !iaConfigurada() || !borrador.ia || estadoIA.estado === 'probando';
    }
    // Ideas del tema: 🤓 datos curiosos (más seguido), 💡 consejos o pistas y
    // 💪 ánimo. grupo (opcional) pide uno solo. Sin IA: los del libro.
    var GRUPOS = [
      { id: 'curiosidad', emoji: '🤓', peso: 0.45 },
      { id: 'consejo', emoji: '💡', peso: 0.35 },
      { id: 'animo', emoji: '💪', peso: 0.2 },
    ];
    function hayIdeasIA(grupo) { return !!(ideasIA && ideasIA[grupo] && ideasIA[grupo].length); }
    function idea(grupo) {
      var hay = GRUPOS.filter(function (g) { return hayIdeasIA(g.id) && (!grupo || g.id === grupo); });
      if (!hay.length) {
        // Los del libro traen su emoji delante: el nombre va después del emoji.
        var t = elegir('consejo', consejosDelLibro());
        var m = /^(\S+)\s+([\s\S]*)$/.exec(t);
        return m && !/[A-Za-zÁÉÍÓÚÑáéíóúñ¿¡]/.test(m[1].charAt(0)) ? m[1] + ' ' + conNombre(m[2]) : conNombre(t);
      }
      var total = hay.reduce(function (s, g) { return s + g.peso; }, 0);
      var r = Math.random() * total;
      var g = hay[hay.length - 1];
      for (var i = 0; i < hay.length; i++) {
        r -= hay[i].peso;
        if (r <= 0) { g = hay[i]; break; }
      }
      return g.emoji + ' ' + conNombre(elegir('ia:' + PAGINA + ':' + g.id, ideasIA[g.id]));
    }
    function decirIdea(forzar) {
      if (!activa()) return false;
      if (!forzar && Date.now() - ultimoMensaje < frecuencia().minimo * 1000) return false;
      var t = idea();
      if (!t) return false;
      ultimoMensaje = Date.now();
      mostrarBurbuja(t);
      accion('meneo', 'ideas', 4);
      return true;
    }

    // =================================================================
    // CHAT "PREGUNTAR" (tutor con IA)
    // Historial y contador por actividad, en la sesión. Si la IA escribe una
    // respuesta de la página, se pide otra vez con reglas estrictas; si
    // insiste, se muestra una pista del libro. El nombre del estudiante no
    // se envía: la IA escribe {alumno} y aquí se reemplaza.
    // =================================================================
    var CH = C.chat || {};
    var esperandoChat = false;
    var chatMostrados = 0;
    function chatDisponible() { return CH.activo !== false && iaConfigurada() && datos.ia; }
    function chatPagina() {
      if (!ses.chat) ses.chat = {};
      return ses.chat[PAGINA] || (ses.chat[PAGINA] = { usadas: 0, historial: [] });
    }
    function preguntasRestantes() { return Math.max(0, (CH.maxPreguntas || 15) - chatPagina().usadas); }

    // Respuestas correctas de la página: las mismas que usa la calificación
    // (data-valor de los campos que validan, data-resp de las tablas).
    var formasRespuesta = null;
    function formasDeRespuestas() {
      if (formasRespuesta) return formasRespuesta;
      var formas = [];
      var vistos = {};
      var agregar = function (tipo, valor) {
        if (!vistos[tipo + valor]) {
          vistos[tipo + valor] = 1;
          formas.push({ tipo: tipo, valor: valor });
        }
      };
      var campos = document.querySelectorAll('#activity input[data-valor], #activity select[data-valor], #activity input[data-resp], #activity select[data-resp]');
      Array.prototype.forEach.call(campos, function (el) {
        String(el.getAttribute('data-valor') || el.getAttribute('data-resp') || '').split('|').forEach(function (v) {
          v = v.trim();
          if (!v) return;
          var n = Number(v.replace(',', '.').replace(/[−–]/g, '-'));
          if (isNaN(n)) {
            if (v.length >= 4) agregar('texto', v.toLowerCase());
            return;
          }
          var abs = Math.abs(n);
          var entero = Math.abs(abs - Math.round(abs)) < 1e-9;
          // Enteros de una cifra: solo cuentan como "= 7", "es 7"… (así no se
          // bloquea "paso 2" o "3 ideas").
          var tipo = entero && abs < 10 ? 'chico' : 'numero';
          var textos = entero ? [String(Math.round(abs))] : [abs.toFixed(2), abs.toFixed(1)].map(function (t) { return t.replace(/0+$/, '').replace(/\.$/, ''); });
          textos.forEach(function (t) {
            agregar(tipo, t);
            if (t.indexOf('.') >= 0) agregar(tipo, t.replace('.', ','));
          });
          if (entero && abs >= 1000) {
            var d = String(Math.round(abs));
            agregar('numero', d.replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
            agregar('numero', d.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
          }
        });
      });
      formasRespuesta = formas;
      return formas;
    }
    function escRegex(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function revelaRespuesta(texto) {
      var t = ' ' + String(texto).replace(/[−–]/g, '-').replace(/\u00a0/g, ' ').toLowerCase() + ' ';
      return formasDeRespuestas().some(function (f) {
        if (f.tipo === 'texto') return t.indexOf(f.valor) >= 0;
        var num = escRegex(f.valor);
        if (f.tipo === 'numero') return new RegExp('(^|[^\\d.,])-?' + num + '(?![\\d]|[.,]\\d)').test(t);
        return new RegExp('(=|\\bes|\\bson|\\bda|\\bvale|\\bser[ií]a|\\bresultado(?: es)?|\\bigual a)\\s*-?\\s*' + num + '(?![\\d]|[.,]\\d)').test(t);
      });
    }
    // Correos o números largos (teléfonos, cédulas): no se envían.
    function tieneDatosPersonales(t) {
      return /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(t) || /\d{8,}/.test(t.replace(/(\d)[\s.-](?=\d)/g, '$1'));
    }
    // local = mensaje de la mascota que no viene de la IA (no se reenvía).
    function agregarAlChat(rol, texto, local) {
      var ch = chatPagina();
      ch.historial.push({ rol: rol, texto: texto, local: !!local });
      if (ch.historial.length > 20) {
        ch.historial = ch.historial.slice(-20);
        chatMostrados = -1; // se recortó: redibujar todo
      }
      guardarSesion();
      pintarChat(chatMostrados < 0);
    }

    // ---------- Preguntar con la voz (dictado del navegador: Chrome, Edge, Safari) ----------
    // Se toca 🎤, se habla y la pregunta aparece en el campo; al terminar de hablar
    // se envía sola. Mientras escucha, la mascota se pone sus audífonos.
    var dictado = null;
    function hayDictado() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
    function pintarMic(escuchando) {
      var b = panel && panel.querySelector('#mp-chat-mic');
      var campo = panel && panel.querySelector('#mp-chat-texto');
      if (b) {
        b.setAttribute('aria-pressed', escuchando ? 'true' : 'false');
        b.textContent = escuchando ? '⏺' : '🎤';
        b.title = escuchando ? 'Te escucho… (toca para terminar)' : 'Preguntar con tu voz';
        b.className = 'flex-none w-11 rounded-xl text-lg transition-colors ' + FOCO + (escuchando ? ' bg-red-500 text-white ring-2 ring-red-300 motion-safe:animate-pulse' : ' ring-1 ring-sky-200 bg-white hover:bg-sky-50');
      }
      if (campo) campo.placeholder = escuchando ? '🎤 Te escucho… habla normal' : 'Escribe o toca 🎤 y habla…';
    }
    function detenerDictado() { if (dictado) { var d = dictado; dictado = null; try { d.abort(); } catch (e) {} pintarMic(false); } }
    function dictar() {
      if (dictado) { try { dictado.stop(); } catch (e) {} return; } // segundo toque: termina y envía
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR || !chatDisponible() || esperandoChat) return;
      callar(); // que no se escuche a sí misma
      var r = new SR();
      var idioma = (navigator.language || '').toLowerCase();
      r.lang = /^es/.test(idioma) ? navigator.language : 'es-EC';
      r.interimResults = true;
      r.continuous = false;
      r.maxAlternatives = 1;
      var texto = '', enviado = false;
      r.onresult = function (e) {
        texto = Array.prototype.map.call(e.results, function (x) { return x[0].transcript; }).join(' ').replace(/\s+/g, ' ').trim();
        var campo = panel && panel.querySelector('#mp-chat-texto');
        if (campo) campo.value = texto;
      };
      r.onerror = function (e) {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') agregarAlChat('mascota', 'Para preguntarme con tu voz, permite el micrófono en el navegador. También puedes escribir. 😊', true);
        else if (e.error === 'no-speech') agregarAlChat('mascota', 'No te escuché. Toca 🎤 y habla normal, cerca del micrófono.', true);
      };
      r.onend = function () {
        if (dictado !== r) return;
        dictado = null;
        pintarMic(false);
        var campo = panel && panel.querySelector('#mp-chat-texto');
        if (!enviado && texto && campo) {
          enviado = true;
          if (enviarPregunta(texto)) campo.value = '';
          campo.focus();
        }
      };
      dictado = r;
      pintarMic(true);
      try { r.start(); } catch (e) { dictado = null; pintarMic(false); }
    }

    function enviarPregunta(texto) {
      texto = String(texto || '').replace(/\s+/g, ' ').trim().slice(0, CH.maxCaracteres || 300);
      if (!texto || esperandoChat || !chatDisponible()) return false;
      if (!preguntasRestantes()) {
        agregarAlChat('mascota', personalizar(elegir('chatSinPreguntas')), true);
        return false;
      }
      if (tieneDatosPersonales(texto)) {
        agregarAlChat('mascota', personalizar(elegir('chatPrivado')), true);
        return false;
      }
      var ch = chatPagina();
      var previo = ch.historial.filter(function (m) { return !m.local; });
      ch.usadas++;
      esperandoChat = true;
      agregarAlChat('estudiante', texto, false);
      accion('mirar');
      notarActividad();
      scriptIA = scriptIA || cargar(carpeta + 'ia.js' + version);
      var ctx = { libro: nombreMateria(), publico: C.publico, mascota: nombre(), config: C.ia, maxPalabras: CH.maxPalabras || 60 };
      scriptIA
        .then(function () { return window.MascotaIA.conversar(ctx, previo, texto); })
        .then(function (r) {
          if (!r.texto || !revelaRespuesta(r.texto)) return r;
          return window.MascotaIA.conversar(ctx, previo, texto, true).then(function (r2) {
            return r2.texto && !revelaRespuesta(r2.texto) ? r2 : { texto: elegir('chatBloqueado'), bloqueada: true };
          });
        })
        .catch(function () { return { texto: '', error: 'No se pudo cargar js/pet/ia.js.' }; })
        .then(function (r) {
          esperandoChat = false;
          if (!r.texto) {
            ch.usadas = Math.max(0, ch.usadas - 1); // un fallo no gasta la pregunta
            agregarAlChat('mascota', 'Ahora no puedo conectarme' + (r.error ? ': ' + r.error : '.') + ' Intenta otra vez en un momento.', true);
            return;
          }
          agregarAlChat('mascota', personalizar(r.texto), !!r.bloqueada);
          if (datos.voz && panel && pestana === 'chat') {
            hablar(personalizar(r.texto));
          }
          accion('latido', r.bloqueada ? 'animo' : 'ideas', 4);
          // Si cerró el panel mientras esperaba, la mascota avisa.
          if (!(panel && pestana === 'chat') && activa()) {
            ultimoMensaje = Date.now();
            mostrarBurbuja(personalizar(elegir('chatListo')));
          }
        });
      return true;
    }

    // Dibuja la conversación. completo = desde cero (al abrir la pestaña);
    // si no, solo agrega lo nuevo (role="log" lee solo lo agregado).
    function pintarChat(completo) {
      var log = panel && panel.querySelector('#mp-chat-log');
      if (!log) return;
      var ch = chatPagina();
      if (completo) {
        log.innerHTML = '';
        log.appendChild(burbujaChat('mascota', personalizar((C.mensajes.chatSaludo || ['¡Pregúntame!'])[0])));
        chatMostrados = 0;
      }
      var pensando = log.querySelector('[data-pensando]');
      if (pensando) pensando.remove();
      for (; chatMostrados < ch.historial.length; chatMostrados++) {
        log.appendChild(burbujaChat(ch.historial[chatMostrados].rol, ch.historial[chatMostrados].texto));
      }
      if (esperandoChat) {
        var b = burbujaChat('mascota', nombre() + ' está pensando…');
        b.setAttribute('data-pensando', '');
        b.firstChild.classList.add('motion-safe:animate-pulse', 'text-slate-600');
        log.appendChild(b);
      }
      log.scrollTop = log.scrollHeight;
      var r = preguntasRestantes();
      var info = panel.querySelector('#mp-chat-info');
      if (info) info.textContent = 'No escribas datos personales · ' + (r ? 'Te quedan ' + r + (r === 1 ? ' pregunta' : ' preguntas') + ' en esta actividad.' : 'Ya no quedan preguntas en esta actividad.');
      Array.prototype.forEach.call(panel.querySelectorAll('#mp-chat-enviar, [data-p="rapida"]'), function (el) {
        el.disabled = esperandoChat || !r;
      });
    }
    // ---------- Voz (lectura en voz alta del chat) ----------
    // 1) Voz NATURAL (config.voz.motor = 'ia'): Google Gemini convierte el
    //    texto en audio con una voz humana. Necesita la IA de Google (clave
    //    en pruebas o el servidor intermedio). Tarda unos segundos la primera
    //    vez; cada mensaje se guarda para volver a escucharlo al instante.
    // 2) Si eso no está o falla: la voz del propio dispositivo (gratis, sin
    //    internet, pero más robótica). Se elige la más natural que haya.
    var VOZ = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function' ? window.speechSynthesis : null;
    var VC = C.voz || {};
    var AUDIO = typeof window.Audio === 'function' ? new Audio() : null;
    var SILENCIO = 'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
    var vozElegida = null, botonHablando = null, turnoVoz = 0, audioListo = false, vozIAPausa = 0;
    var audiosVoz = {}, ordenAudios = [];
    function vozNatural() {
      var ia = C.ia || {};
      return VC.motor !== 'dispositivo' && !!AUDIO && iaConfigurada() && Date.now() > vozIAPausa &&
        !!(ia.proxyUrl || (ia.apiKey && (ia.proveedor === 'google' || (!ia.proveedor && /^gemini/i.test(ia.modelo || '')))));
    }
    function hayVoz() { return !!VOZ || vozNatural(); }
    function nombreVozIA() { return (VC.porPersonaje || {})[datos.tipo] || VC.vozIA || 'Achird'; }
    function elegirVoz() {
      if (!VOZ) return null;
      var voces = VOZ.getVoices().filter(function (v) { return /^es([-_]|$)/i.test(v.lang); });
      if (!voces.length) return null;
      // Primero las voces "naturales" (neuronales), luego español latino.
      var orden = ['es-ec', 'es-419', 'es-us', 'es-mx', 'es-co', 'es-pe'];
      function puntos(v) {
        var i = orden.indexOf(v.lang.toLowerCase().replace('_', '-'));
        return (/natural|neural|enhanced|premium|mejorad|siri/i.test(v.name) ? 40 : 0) + (/online|google/i.test(v.name) ? 10 : 0) + (i < 0 ? 0 : 20 - i);
      }
      return voces.sort(function (a, b) { return puntos(b) - puntos(a); })[0];
    }
    if (VOZ) {
      vozElegida = elegirVoz();
      if (VOZ.addEventListener) VOZ.addEventListener('voiceschanged', function () { vozElegida = elegirVoz(); });
    }
    window.addEventListener('pagehide', function () { callar(); });
    // Quita emojis y cambia símbolos que la voz leería raro. Las fórmulas de
    // biología se leen por letras: CO₂ → "C O 2", C₆H₁₂O₆ → "C 6 H 12 O 6".
    function textoParaVoz(t) {
      return String(t)
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
        .replace(/\b(CO|ATP|ADN|ARN|NaCl|O|H|N|C)(?=[₀-₉])/g, function (f) { return f.split('').join(' '); })
        .replace(/[₀-₉]+/g, function (d) { return ' ' + d.split('').map(function (c) { return c.charCodeAt(0) - 0x2080; }).join('') + ' '; })
        .replace(/\^2|²/g, ' al cuadrado').replace(/\^3|³/g, ' al cubo')
        .replace(/√/g, 'raíz de ').replace(/\s+/g, ' ').trim();
    }
    // Aviso debajo del interruptor. estado: 'listo' | 'cargando' | 'hablando'
    function marcarBoton(btn, estado) {
      var aviso = panel && panel.querySelector('#mp-voz-estado');
      if (!aviso) return;
      aviso.textContent = estado === 'cargando' ? '⏳ Preparando la voz…' : estado === 'hablando' ? '🔊 Leyendo la respuesta…' : '';
      aviso.classList.toggle('motion-safe:animate-pulse', estado === 'cargando');
    }
    function callar() {
      turnoVoz++;
      if (VOZ) try { VOZ.cancel(); } catch (e) {}
      if (AUDIO) try { AUDIO.pause(); } catch (e) {}
      marcarBoton(botonHablando, 'listo');
      botonHablando = null;
    }
    // iPhone/iPad solo dejan sonar audio si empieza con un toque: se
    // "despierta" el reproductor en ese toque y luego se reutiliza.
    function desbloquearAudio() {
      if (!AUDIO || audioListo) return;
      audioListo = true;
      try { AUDIO.src = SILENCIO; var pr = AUDIO.play(); if (pr && pr.catch) pr.catch(function () { audioListo = false; }); } catch (e) { audioListo = false; }
    }
    function despertarVoz() {
      if (!datos.voz) return;
      desbloquearAudio();
      if (VOZ) try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; VOZ.speak(u); } catch (e) {}
    }
    // Audio natural de un texto (de la memoria si ya se pidió antes).
    function audioNatural(t) {
      var k = nombreVozIA() + '|' + t;
      if (audiosVoz[k]) return Promise.resolve(audiosVoz[k]);
      scriptIA = scriptIA || cargar(carpeta + 'ia.js' + version);
      return scriptIA.then(function () { return window.MascotaIA.voz(C.ia, VC, t, nombreVozIA()); }).then(function (blob) {
        var url = URL.createObjectURL(blob);
        audiosVoz[k] = url;
        ordenAudios.push(k);
        if (ordenAudios.length > 30) { var viejo = ordenAudios.shift(); URL.revokeObjectURL(audiosVoz[viejo]); delete audiosVoz[viejo]; }
        return url;
      });
    }
    function hablar(texto, btn) {
      var antes = botonHablando;
      callar();
      if (btn && antes === btn) return; // segundo toque = detener (o cancelar)
      var t = textoParaVoz(texto);
      if (!t) return;
      var mio = turnoVoz;
      botonHablando = btn || null;
      var fin = function () { if (mio === turnoVoz) { marcarBoton(btn, 'listo'); botonHablando = null; } };
      // 1) Voz natural en el dispositivo (Piper): gratis y sin límites.
      if (vozLocalLista()) return hablarLocal(t, btn, mio, fin);
      prepararVozLocal(true); // la primera vez se descarga (una sola vez); mientras tanto, las otras voces
      if (!vozNatural()) return vozDispositivo(t, btn, mio, fin);
      desbloquearAudio();
      marcarBoton(btn, 'cargando');
      audioNatural(t).then(function (url) {
        if (mio !== turnoVoz) return;
        AUDIO.onended = fin;
        AUDIO.src = url;
        marcarBoton(btn, 'hablando');
        return AUDIO.play();
      }).catch(function (e) {
        if (mio !== turnoVoz) return;
        // Límite de uso, clave o modelo con problemas: un rato con la voz del dispositivo.
        // 429: el cupo por minuto vuelve en 1 min; el diario, mañana (se reintenta cada hora).
        if (e && e.status) vozIAPausa = Date.now() + (e.diario ? 60 : e.status === 429 ? 1 : 30) * 60000;
        if (e && e.name === 'NotAllowedError') return fin(); // el navegador no dejó sonar (sin toque previo)
        vozDispositivo(t, btn, mio, fin);
      });
    }
    // ---------- Voz local (js/pet/voz-local.js: Piper en el navegador) ----------
    // motor 'local' (por defecto): voz neuronal generada en el propio dispositivo,
    // gratis y sin límites. Se descarga una sola vez (≈ 60 MB) cuando la mascota
    // va a hablar o leer por primera vez; si ya está guardada, se prepara sola.
    var cargaVozLocal = null, avisoVozLocal = false;
    function motorLocal() { return (VC.motor || 'local') === 'local' && !!AUDIO; }
    function vozLocalLista() { return motorLocal() && !!window.MascotaVozLocal && window.MascotaVozLocal.lista(); }
    function prepararVozLocal(descargar) {
      if (!motorLocal()) return Promise.resolve();
      if (!cargaVozLocal) cargaVozLocal = cargar(carpeta + 'voz-local.js' + version).then(function () { if (VC.vozLocal) window.MascotaVozLocal.usar(VC.vozLocal); });
      return cargaVozLocal.then(function () {
        var L = window.MascotaVozLocal;
        if (!L.soportada() || L.lista() || L.estado() === 'preparando' || L.estado() === 'error') return;
        // Sin permiso para descargar (al abrir la página): solo si ya está guardada en el dispositivo.
        if (!descargar) return L.guardada().then(function (si) { if (si) return L.preparar(); }).catch(function () {});
        if (!avisoVozLocal && datos.tipo && activa()) { avisoVozLocal = true; mostrarBurbuja('⬇️ Estoy bajando mi voz natural (una sola vez). Mientras tanto hablo con esta voz.'); }
        L.preparar().then(function () { if (datos.tipo && activa()) mostrarBurbuja('🎙️ ¡Listo! Ya tengo mi voz natural.'); }, function (e) { console.warn('Mascota: sin voz local.', e); });
      }).catch(function () {});
    }
    // Lee frase por frase: mientras suena una, se genera la siguiente.
    function hablarLocal(t, btn, mio, fin) {
      var L = window.MascotaVozLocal, frases = L.frases(t), pedidos = [];
      var pedir = function (i) { return pedidos[i] || (pedidos[i] = L.sintetizar(frases[i])); };
      marcarBoton(btn, 'cargando');
      var tocar = function (i) {
        if (mio !== turnoVoz) return;
        if (i >= frases.length) return fin();
        pedir(i).then(function (url) {
          if (mio !== turnoVoz) return;
          if (i + 1 < frases.length) pedir(i + 1);
          AUDIO.onended = function () { tocar(i + 1); };
          AUDIO.src = url;
          marcarBoton(btn, 'hablando');
          var pr = AUDIO.play();
          if (pr && pr.catch) pr.catch(function () { fin(); });
        }).catch(function () { if (mio === turnoVoz) vozDispositivo(frases.slice(i).join(' '), btn, mio, fin); });
      };
      tocar(0);
    }
    function vozDispositivo(t, btn, mio, fin) {
      if (!VOZ) return fin();
      var u = new SpeechSynthesisUtterance(t);
      u.lang = vozElegida ? vozElegida.lang : 'es-ES';
      if (vozElegida) u.voice = vozElegida;
      u.rate = 1;
      u.pitch = 1;
      marcarBoton(btn, 'hablando');
      u.onend = u.onerror = fin;
      // Chrome a veces ignora speak() justo después de cancel(): una pausa corta lo evita.
      setTimeout(function () {
        if (mio !== turnoVoz) return;
        try { VOZ.resume(); VOZ.speak(u); } catch (e) { fin(); }
      }, 60);
    }
    function pintarInterruptorVoz() {
      var sw = panel && panel.querySelector('#mp-voz');
      if (!sw) return;
      sw.setAttribute('aria-checked', datos.voz ? 'true' : 'false');
      sw.className = 'flex-none flex items-center gap-1.5 rounded-full px-3 py-1.5 min-h-[2.25rem] text-xs font-bold ring-1 transition ' + FOCO + ' ' +
        (datos.voz ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-sky-50');
      sw.innerHTML = '<span aria-hidden="true">' + (datos.voz ? '🔊' : '🔈') + '</span>' + (datos.voz ? 'Sí' : 'No');
    }

    function burbujaChat(rol, texto) {
      var es = rol === 'estudiante';
      var fila = document.createElement('div');
      fila.className = 'flex ' + (es ? 'justify-end' : 'justify-start');
      var b = document.createElement('p');
      b.className = 'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ' + (es ? 'bg-blue-600 text-white rounded-br-md shadow-sm' : 'bg-white text-slate-900 ring-1 ring-sky-100 rounded-bl-md shadow-sm');
      var quien = document.createElement('span');
      quien.className = 'sr-only';
      quien.textContent = es ? 'Tú: ' : nombre() + ': ';
      b.appendChild(quien);
      b.appendChild(document.createTextNode(texto));
      fila.appendChild(b);
      return fila;
    }

    // =================================================================
    // EVENTOS DEL LIBRO
    // =================================================================
    var ultimaCalif = 0;
    var tSecuencia = [];
    function alCalificar() {
      var ahora = Date.now();
      if (ahora - ultimaCalif < 1500) return; // clic + evento = una sola vez
      var b = document.getElementById('bt_comprobar');
      if (b && !b.disabled) return; // total() no llegó a EndActivity()
      ultimaCalif = ahora;
      notarActividad();
      // El campo "¿Cómo te llamas?" del modal Guardar sale lleno (se puede cambiar).
      var campoNombre = document.getElementById('txtAlumno');
      if (campoNombre && !campoNombre.value && alumno) campoNombre.value = alumno;
      if (ses.calificadas.indexOf(PAGINA) < 0) {
        ses.calificadas.push(PAGINA);
        guardarSesion();
      }
      if (!activa()) return;
      var zona = document.getElementById('activity') || document.body;
      var campos = zona.querySelectorAll('.bien, .mal, .f-tabla-bien, .f-tabla-mal');
      var ok = 0, racha = 0, mejor = 0, total = campos.length;
      for (var i = 0; i < total; i++) {
        var bien = campos[i].classList.contains('bien') || campos[i].classList.contains('f-tabla-bien');
        if (bien) ok++;
        racha = bien ? racha + 1 : 0;
        if (racha > mejor) mejor = racha;
      }
      var v = { aciertos: ok, total: total };
      var baila = mejor >= C.rachaParaBailar;
      ponerAnimo('jugueton');
      tSecuencia.forEach(clearTimeout);
      tSecuencia = [];
      var espera = T.burbujaSegundos * 1000 + 600;
      if (!total) espera = 300; // nada autocalificado: solo el festejo final
      else if (ok === total) {
        if (baila) accion('baile', 'fuego', 9);
        else accion(azar(['voltereta', 'cohete', 'dobleSalto']), 'confeti', 18);
        decir(baila ? 'racha' : 'correcto', v, true);
      } else if (ok > 0) {
        accion(baila ? 'baile' : 'rebote', 'estrellas', 7);
        decir('mixto', v, true);
      } else {
        accion('animoBrazo', 'animo', 5);
        // La mitad de las veces, un ánimo de la IA sobre el tema.
        if (hayIdeasIA('animo') && Math.random() < 0.5) {
          ultimoMensaje = Date.now();
          mostrarBurbuja(idea('animo'));
        } else decir('animo', v, true);
      }
      tSecuencia.push(setTimeout(function () {
        accion(azar(['voltereta', 'dobleSalto', 'giro']), 'confeti', 22);
        decir('actividadTerminada', v, true);
      }, espera));
      var n = ses.calificadas.length;
      if ([3, 5, 8, 12, 18].indexOf(n) >= 0) {
        tSecuencia.push(setTimeout(function () {
          accion('cohete', 'estrellas', 10);
          decir('progreso', { n: n }, true);
        }, espera * 2));
      } else if (hayIdeasIA('curiosidad')) {
        // Premio: un dato curioso del tema al terminar.
        tSecuencia.push(setTimeout(function () {
          if (!activa()) return;
          ultimoMensaje = Date.now();
          mostrarBurbuja(idea('curiosidad'));
          accion('latido', 'ideas', 5);
        }, espera * 2));
      }
      volverACalma(espera * 3 + 6000);
    }

    // Pregunta abierta completada: una vez por campo, con pausa entre
    // felicitaciones (el doble del mínimo de la frecuencia elegida).
    var vistas = typeof WeakSet === 'function' ? new WeakSet() : null;
    var ultimaAbierta = 0;
    function alSalirDeCampo(e) {
      var t = e.target;
      if (!t || t.tagName !== 'TEXTAREA' || !vistas || vistas.has(t)) return;
      if ((t.value || '').trim().length < C.minCaracteresAbierta) return;
      vistas.add(t);
      if (Date.now() - ultimaAbierta < frecuencia().minimo * 2000) return;
      if (decir('abierta')) {
        ultimaAbierta = Date.now();
        if (animo === 'dormido') ponerAnimo('feliz');
        accion('latido', 'escritura', 5);
      }
    }

    // ---------- Actividad, sueño y última visita ----------
    var tSueno = null;
    var ultimaNota = 0;
    var ultimaVisitaGuardada = 0;
    function notarActividad() {
      var ahora = Date.now();
      if (animo === 'dormido') despertar();
      if (ahora - ultimaNota < 1000) return; // basta una vez por segundo
      ultimaNota = ahora;
      ses.ultima = ahora;
      clearTimeout(tSueno);
      tSueno = setTimeout(dormir, T.dormirMinutos * 60000);
      if (ahora - ultimaVisitaGuardada > 60000) marcarVisita();
    }
    function marcarVisita() {
      ultimaVisitaGuardada = Date.now();
      datos.ultimaVisita = new Date().toISOString();
      almacen.save(copia(datos));
      guardarSesion();
    }
    function dormir() {
      if (!activa() || panel) return;
      ocultarBurbuja();
      ponerAnimo('dormido');
    }
    function despertar() {
      ponerAnimo('feliz');
      accion('estirarse');
      decir('despertar', null, true);
      volverACalma(20000);
    }

    // ---------- Latido del módulo: ideas, descanso y movimientos sueltos ----------
    // Un solo temporizador cada 15 s (ligero). Solo habla si el estudiante
    // estuvo activo en el último minuto y respeta la frecuencia elegida.
    function latidoModulo() {
      if (!activa() || document.hidden || panel || animo === 'dormido') return;
      var ahora = Date.now();
      var presente = ahora - ses.ultima < 60000;
      var fr = frecuencia();
      if (presente && !ses.descanso && ahora - ses.inicio > T.descansoMinutos * 60000) {
        if (decir('descanso')) {
          ses.descanso = true;
          guardarSesion();
          accion('estirarse');
          return;
        }
      }
      if (presente && fr.espontaneo && ahora - ultimoMensaje > fr.espontaneo * 60000) {
        if (decirIdea(false)) return;
      }
      if (Math.random() < 0.3) accion(azar(['mirar', 'meneo', 'saludarBrazo', 'mirar', 'aplaudir']));
    }

    // Al llegar al final sin haber calificado: un recordatorio (una vez).
    var finalDicho = false;
    function alDesplazar() {
      if (finalDicho || !activa() || datos.frecuencia === 'pocos') return;
      var b = document.getElementById('bt_comprobar');
      if (!b || b.disabled) return;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 40) {
        finalDicho = decir('final');
        if (finalDicho) accion('saludo');
      }
    }

    // ---------- Saludo al llegar ----------
    function saludar(nuevaVisita, previa) {
      if (!datos.tipo) {
        if (!datos.pospuesto) setTimeout(function () { abrirPanel('editar', true); }, 900);
        return;
      }
      if (!nuevaVisita) {
        ponerAnimo('tranquilo'); // cambió de actividad: sigue como estaba, sin saludar
        return;
      }
      var dias = previa ? (Date.now() - Date.parse(previa)) / 86400000 : 0;
      setTimeout(function () {
        if (!previa || dias < T.extranarDias) {
          var h = new Date().getHours();
          ponerAnimo('feliz');
          accion('saludo', 'estrellas', 5);
          decir(h >= 5 && h < 12 ? 'saludoManana' : h >= 12 && h < 19 ? 'saludoTarde' : 'saludoNoche', null, true);
        } else if (dias < T.reencuentroDias) {
          ponerAnimo('extranando');
          accion('dobleSalto', 'corazones', 8);
          decir('teExtrane', null, true);
        } else {
          ponerAnimo('extranando');
          accion('cohete', 'corazones', 14);
          setTimeout(function () { accion('dobleSalto', 'confeti', 16); }, 1100);
          decir('reencuentro', null, true);
        }
        volverACalma(15000);
        pedirNombreUnaVez(T.burbujaSegundos * 1000 + 2000);
      }, 900);
    }

    // =================================================================
    // CLIC Y MINIMIZAR
    // =================================================================
    var clics = [];
    function clicMascota() {
      if (suprimirClic) { suprimirClic = false; return; }
      if (!datos.tipo) return abrirPanel('editar', !datos.pospuesto);
      if (datos.minimizada) {
        minimizar(false);
        accion('cohete', 'estrellas', 6);
        return;
      }
      sonar();
      var ahora = Date.now();
      clics = clics.filter(function (t) { return ahora - t < 2500; });
      clics.push(ahora);
      if (clics.length >= 5) { // muchos clics seguidos: se marea (y se ríe)
        clics = [];
        accion('mareo', 'estrellas', 8);
        decir('mareo', null, true);
        return;
      }
      accion(azar(['salto', 'giro', 'voltereta', 'meneo', 'rebote', 'latido', 'cohete', 'dobleSalto', 'saludarBrazo', 'brazosArriba', 'aplaudir', 'bracear']), azar([null, 'estrellas', 'confeti', 'corazones']), 6);
      if (animo === 'tranquilo') { ponerAnimo('feliz'); volverACalma(12000); }
      if (Math.random() < 0.35) decirIdea(false);
      else decir('clic');
    }
    function minimizar(si) {
      datos.minimizada = si;
      guardar();
      pintar();
      btn.focus();
    }

    // =================================================================
    // PANEL "MASCOTA" (desde la barra, el botón ⋯ o la primera visita)
    // Pestañas: Mi mascota · Personaje · Accesorios · Opciones
    // Cada pestaña se dibuja una vez; al tocar un control solo se cambian
    // sus clases (sin redibujar: no parpadea ni pierde el foco).
    // =================================================================
    var panel = null;
    var borrador = null;
    var primera = false;
    var pestana = 'chat';
    var focoPrevio = null;
    var huboCambio = false;
    var nombreNuevo = false; // escribió su nombre en el panel
    var PESTANAS = [
      { id: 'chat', nombre: 'Chat', icono: '💬' },
      { id: 'editar', nombre: 'Editar', icono: '✏️' },
      { id: 'opciones', nombre: 'Opciones', icono: '⚙️' },
    ];
    // Clases de cada control según si está elegido (se usan al dibujar y al actualizar).
    var CLASES = {
      chip: function (s) { return 'rounded-full px-3 py-1.5 text-sm font-semibold leading-snug ring-2 transition-colors motion-reduce:transition-none ' + FOCO + (s ? ' ring-blue-600 bg-blue-50 text-blue-900' : ' ring-slate-200 bg-white text-slate-700 hover:bg-sky-50 hover:ring-sky-200'); },
      color: function (s) { return 'grid place-items-center w-full aspect-square rounded-2xl shadow-sm ring-2 ring-offset-2 transition-transform motion-reduce:transition-none hover:scale-110 ' + FOCO + (s ? ' ring-blue-600 scale-110 shadow-md' : ' ring-transparent'); },
      tarjeta: function (s) { return 'rounded-2xl p-2 text-center ring-2 transition-colors motion-reduce:transition-none ' + FOCO + (s ? ' ring-blue-600 bg-blue-50' : ' ring-slate-200 bg-white hover:bg-sky-50 hover:ring-sky-200'); },
      interruptor: function (s) { return 'relative flex-none w-12 h-7 rounded-full transition-colors motion-reduce:transition-none disabled:opacity-50 ' + FOCO + (s ? ' bg-blue-600' : ' bg-slate-300'); },
      perilla: function (s) { return 'absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none' + (s ? ' translate-x-5' : ''); },
      pestana: function (s) { return 'flex items-center gap-1 rounded-full px-3 py-1 text-xs sm:text-sm font-semibold leading-tight transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white ' + (s ? 'bg-white text-blue-700 shadow-sm' : 'text-white hover:bg-white/15'); },
      engranaje: function (s) { return 'relative flex-none w-10 h-10 rounded-full text-lg leading-none transition-colors motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white ' + (s ? 'bg-white/30' : 'hover:bg-white/15'); },
    };
    var BOTON = 'rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:border-sky-200 disabled:opacity-50 ' + FOCO;
    // Botón principal: degradado celeste → azul, como el modal "Guarda tu actividad".
    var PRIMARIO = 'bg-[linear-gradient(135deg,#38bdf8,#2563eb)] text-white font-bold shadow-md shadow-blue-600/25 hover:brightness-110 disabled:opacity-50 ' + FOCO;

    // ¿Está elegido este control? (según el borrador)
    function elegido(el) {
      var b = borrador;
      var id = el.getAttribute('data-id');
      switch (el.getAttribute('data-p')) {
        case 'tipo': return b.tipo === id;
        case 'color': return hexDe(b.color, b.tipo) === buscar(C.colores, id).hex;
        case 'opcion': return b[el.getAttribute('data-clave')] === id;
        case 'switch': return !!b[id] && !el.disabled;
      }
      return null;
    }
    function miniPersonaje(p, sel) {
      return DIBUJO.dibujar(p.id, sel ? hexDe(borrador.color, borrador.tipo) : hexDe(p.color, p.id), []);
    }

    // Tarjeta de sección (pestaña Editar).
    function seccion(titulo, contenido) {
      return '<section class="rounded-2xl bg-white ring-1 ring-slate-100 shadow-sm p-3 sm:p-4"><h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-sky-700">' + titulo + '</h3>' + contenido + '</section>';
    }
    var CAMPO = 'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:bg-white ' + FOCO;

    function htmlPestana(id) {
      var b = borrador;
      if (id === 'chat') {
        var libre = chatDisponible();
        return (hayVoz() ? '<div class="mb-2 flex items-center justify-between gap-2"><div class="min-w-0"><span id="mp-voz-txt" class="block text-xs font-semibold text-slate-700">Leer las respuestas en voz alta</span>' +
            '<span id="mp-voz-estado" class="block min-h-[1rem] text-[11px] font-semibold text-sky-700" aria-live="polite"></span></div>' +
            '<button type="button" id="mp-voz" role="switch" aria-labelledby="mp-voz-txt"></button></div>' : '') +
          '<div id="mp-chat-log" role="log" aria-label="Conversación con ' + esc(nombre()) + '" class="flex flex-col gap-2 h-[46vh] sm:h-[50vh] min-h-[12rem] overflow-y-auto overscroll-contain rounded-2xl bg-gradient-to-b from-sky-50 to-white ring-1 ring-sky-100 p-3"></div>' +
          (libre
            ? '<form id="mp-chat-form" class="mt-2 flex gap-2" autocomplete="off"><label for="mp-chat-texto" class="sr-only">Tu pregunta para ' + esc(nombre()) + '</label>' +
              '<input id="mp-chat-texto" type="text" maxlength="' + (CH.maxCaracteres || 300) + '" placeholder="' + (hayDictado() ? 'Escribe o toca 🎤 y habla…' : 'Escribe tu pregunta…') + '" class="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 placeholder:text-slate-500 focus:bg-white ' + FOCO + '"/>' +
              (hayDictado() ? '<button type="button" id="mp-chat-mic" aria-label="Preguntar con tu voz" aria-pressed="false" title="Preguntar con tu voz" class="flex-none w-11 rounded-xl text-lg ring-1 ring-sky-200 bg-white hover:bg-sky-50 transition-colors ' + FOCO + '">🎤</button>' : '') +
              '<button type="submit" id="mp-chat-enviar" class="flex-none rounded-xl px-4 py-2 text-sm ' + PRIMARIO + '">Enviar</button></form>' +
              '<p id="mp-chat-info" class="mt-2 text-xs text-slate-600"></p>'
            : '<p class="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">' +
              (CH.activo === false ? 'Las preguntas están apagadas en este libro.' : !iaConfigurada() ? 'Para hacerle preguntas se necesita la IA conectada. Pídele a tu docente que la active.' : 'Para hacerle preguntas se necesita la IA conectada. Intenta otra vez en un momento.') + '</p>');
      }
      if (id === 'editar') {
        var personajes = '<div class="grid grid-cols-3 sm:grid-cols-6 gap-2 p-1">' + C.personajes.map(function (p) {
          return '<button type="button" data-p="tipo" data-id="' + p.id + '">' +
            '<span data-mini class="block w-12 h-12 sm:w-14 sm:h-14 mx-auto pointer-events-none">' + miniPersonaje(p, p.id === b.tipo) + '</span>' +
            '<span class="block mt-1 text-xs font-semibold text-slate-800 leading-tight">' + esc(p.nombre) + '</span></button>';
        }).join('') + '</div>';
        // Colores: muestras grandes con ✓ en la elegida y su nombre arriba.
        var colores = '<p class="mb-2 text-sm text-slate-700">Color de <b id="mp-color-de"></b>: <b id="mp-color-nombre" class="text-slate-900"></b></p>' +
          '<div class="grid grid-cols-6 sm:grid-cols-11 gap-2 p-1">' + C.colores.map(function (c) {
            return '<button type="button" data-p="color" data-id="' + c.id + '" title="' + esc(c.nombre) + '" aria-label="' + esc(c.nombre) + '" style="background:linear-gradient(145deg,' + c.hex + ',' + c.hex + 'cc)">' +
              '<span data-check aria-hidden="true" class="hidden text-white text-lg font-black drop-shadow">✓</span></button>';
          }).join('') + '</div>';
        var nombres = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
          '<div><label for="mp-alumno" class="block text-sm font-semibold text-slate-800">Tu nombre</label>' +
          '<input id="mp-alumno" type="text" maxlength="20" autocomplete="given-name" placeholder="¿Cómo te llamas?" value="' + esc(alumno) + '" class="' + CAMPO + '"/></div>' +
          '<div><label for="mp-nombre" class="block text-sm font-semibold text-slate-800">Nombre de tu mascota</label>' +
          '<input id="mp-nombre" type="text" maxlength="20" autocomplete="off" value="' + esc(b.nombre || buscar(C.personajes, b.tipo).nombreSugerido) + '" class="' + CAMPO + '"/></div>' +
          '</div><p class="mt-2 text-xs text-slate-600">Tu nombre solo se guarda en este dispositivo.</p>';
        return '<div class="space-y-3">' + seccion('Nombres', nombres) + seccion('Personaje', personajes) + seccion('Color', colores) + '</div>';
      }
      // Opciones
      var interruptor = function (clave, texto, ayuda, deshabilitado) {
        return '<div class="flex items-center justify-between gap-3 py-3 border-b border-slate-100"><div class="min-w-0"><p class="text-sm font-semibold text-slate-900" id="mp-l-' + clave + '">' + texto + '</p>' + (ayuda ? '<p class="text-xs text-slate-600">' + ayuda + '</p>' : '') + '</div>' +
          '<button type="button" role="switch" data-p="switch" data-id="' + clave + '" aria-labelledby="mp-l-' + clave + '"' + (deshabilitado ? ' disabled' : '') + '><span></span></button></div>';
      };
      var grupo = function (clave, texto, opciones) {
        return '<div class="py-3 border-b border-slate-100"><p class="text-sm font-semibold text-slate-900">' + texto + '</p><div class="mt-2 flex flex-wrap gap-2 p-1">' +
          Object.keys(opciones).map(function (k) {
            return '<button type="button" data-p="opcion" data-clave="' + clave + '" data-id="' + k + '">' + esc(opciones[k].nombre) + '</button>';
          }).join('') + '</div></div>';
      };
      return interruptor('visible', 'Mostrar la mascota', 'Si la ocultas, vuelve desde su botón en la barra.') +
        interruptor('sonido', 'Sonido al tocarla') +
        (C.diccionario === false ? '' : interruptor('diccionario', '🔍 Lupa de búsqueda', (window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 'Mantén el dedo' : 'Doble clic') + ' en una palabra de la actividad y te la explico.')) +
        grupo('frecuencia', 'Cuánto habla', C.frecuencias) +
        grupo('tamano', 'Tamaño', TAMANOS) +
        '<div class="pt-4"><button type="button" data-p="esquina" class="' + BOTON + '">↘️ Volver a la esquina</button></div>';
    }

    // Pone clases y estados ARIA de todos los controles según el borrador.
    function actualizarControles() {
      if (!panel) return;
      var b = borrador;
      panel.querySelector('#mp-vista').innerHTML = DIBUJO.dibujar(b.tipo, hexDe(b.color, b.tipo), [], 'Vista previa de ' + esc(b.nombre || 'tu mascota'));
      var cn = panel.querySelector('#mp-color-nombre');
      if (cn) {
        var col = C.colores.filter(function (c) { return c.hex === hexDe(b.color, b.tipo); })[0];
        cn.textContent = col ? col.nombre : '';
        panel.querySelector('#mp-color-de').textContent = b.nombre || buscar(C.personajes, b.tipo).nombreSugerido;
      }
      Array.prototype.forEach.call(panel.querySelectorAll('#mp-cuerpo [data-p]'), function (el) {
        var p = el.getAttribute('data-p');
        var s = elegido(el);
        if (s === null) return;
        if (p === 'switch') {
          el.setAttribute('aria-checked', String(s));
          el.className = CLASES.interruptor(s);
          el.firstChild.className = CLASES.perilla(s);
          return;
        }
        el.setAttribute('aria-pressed', String(s));
        el.className = p === 'color' ? CLASES.color(s) : p === 'tipo' ? CLASES.tarjeta(s) : CLASES.chip(s);
        if (p === 'color') el.querySelector('[data-check]').classList.toggle('hidden', !s);
        if (p === 'tipo') el.querySelector('[data-mini]').innerHTML = miniPersonaje(buscar(C.personajes, el.getAttribute('data-id')), s);
      });
      refrescarEstadoIA();
    }

    function mostrarPestana(id, enfocarPestana) {
      pestana = id;
      detenerDictado();
      callar();
      panel.querySelectorAll('[data-tab]').forEach(function (t) {
        var sel = t.getAttribute('data-tab') === pestana;
        if (t.getAttribute('role') === 'tab') {
          t.setAttribute('aria-selected', String(sel));
          t.tabIndex = sel ? 0 : -1;
          t.className = CLASES.pestana(sel);
        } else {
          t.setAttribute('aria-pressed', String(sel));
          t.className = CLASES.engranaje(sel);
        }
      });
      var cuerpo = panel.querySelector('#mp-cuerpo');
      cuerpo.setAttribute('aria-labelledby', 'mp-tab-' + pestana);
      cuerpo.innerHTML = htmlPestana(pestana);
      cuerpo.scrollTop = 0;
      actualizarControles();
      if (pestana === 'chat') { pintarInterruptorVoz(); pintarChat(true); }
      var destino = pestana === 'chat' && panel.querySelector('#mp-chat-texto') ? panel.querySelector('#mp-chat-texto') : enfocarPestana ? panel.querySelector('#mp-tab-' + pestana) : null;
      if (destino) destino.focus({ preventScroll: true });
      panel.firstChild.scrollTop = 0;
    }

    function abrirPanel(tab, esPrimera) {
      if (panel) return;
      primera = !!esPrimera || !datos.tipo;
      huboCambio = false;
      nombreNuevo = false;
      borrador = copia(datos);
      if (!borrador.tipo) borrador.tipo = C.personajes[0].id;
      focoPrevio = document.activeElement;
      ocultarBurbuja();
      panel = document.createElement('div');
      panel.className = 'fixed inset-0 z-[1400] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[2px] sm:p-4 print:hidden';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-labelledby', 'mp-titulo');
      panel.innerHTML =
        '<div class="flex flex-col w-full sm:max-w-xl max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl shadow-blue-950/20 ring-1 ring-black/5">' +
        // Cabecera azul: la mascota (tócala y salta) con una bolita discreta del
        // estado de la IA (verde = conectada, amarilla = sin conexión), su nombre
        // con las pestañas Chat y Editar, y a la derecha Opciones (⚙️) y cerrar.
        '<div class="relative flex-none overflow-hidden flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4 text-white bg-[linear-gradient(135deg,#0ea5e9_0%,#2563eb_60%,#1e40af_100%)]">' +
        '<span aria-hidden="true" class="pointer-events-none absolute -right-10 -top-14 w-40 h-40 rounded-full bg-white/10"></span>' +
        '<span aria-hidden="true" class="pointer-events-none absolute right-16 -bottom-10 w-24 h-24 rounded-full bg-white/10"></span>' +
        '<div class="relative flex-none">' +
        '<button type="button" data-p="jugar" id="mp-vista" title="¡Tócame!" aria-label="Jugar con tu mascota" class="block w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-1 shadow-lg ring-4 ring-white/30 transition-transform hover:scale-105 motion-reduce:transition-none ' + FOCO + '"></button>' +
        '<span id="mp-ia-punto" role="img" aria-label="IA sin conexión" title="IA sin conexión" class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white" style="background:#facc15"></span>' +
        '</div>' +
        '<div class="relative flex-1 min-w-0"><div class="flex items-center gap-1.5 min-w-0">' +
        '<span class="sm:hidden flex-none grid place-items-center w-6 h-6 rounded-md bg-white shadow" title="Prolipa · Vanguardia en educación"><img src="' + carpeta + '../../img/prolipa-icono.png" alt="Prolipa" class="w-5 h-5 object-contain" /></span>' +
        '<h2 id="mp-titulo" class="min-w-0 text-base sm:text-lg font-extrabold leading-tight text-white truncate">' + (primera ? 'Elige tu compañero' : esc(nombre())) + '</h2></div>' +
        '<div role="tablist" aria-label="Secciones" class="mt-1.5 inline-flex gap-1 rounded-full bg-white/15 p-1">' +
        PESTANAS.filter(function (t) { return t.id !== 'opciones'; }).map(function (t) {
          return '<button type="button" role="tab" id="mp-tab-' + t.id + '" data-tab="' + t.id + '" aria-controls="mp-cuerpo"><span aria-hidden="true">' + t.icono + '</span><span>' + t.nombre + '</span></button>';
        }).join('') + '</div></div>' +
        // Logo de Prolipa (el mismo de los juegos: img/prolipa-icono.png).
        // (en el celular va pequeño junto al nombre, para no tapar las pestañas)
        '<span class="relative flex-none hidden sm:grid place-items-center w-10 h-10 rounded-xl bg-white shadow-md ring-2 ring-white/40" title="Prolipa · Vanguardia en educación"><img src="' + carpeta + '../../img/prolipa-icono.png" alt="Prolipa" class="w-8 h-8 object-contain" /></span>' +
        '<button type="button" id="mp-tab-opciones" data-tab="opciones" aria-controls="mp-cuerpo" aria-label="Opciones" title="Opciones">⚙️</button>' +
        '<button type="button" data-p="cerrar" class="relative flex-none w-10 h-10 rounded-full text-2xl text-white hover:bg-white/15 ' + FOCO + '" aria-label="Cerrar">&times;</button></div>' +
        '<div id="mp-cuerpo" role="tabpanel" class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pt-4 pb-4 sm:px-5 sm:pb-5"></div>' +
        (primera ? '<div class="flex justify-end gap-2 p-4 border-t border-slate-100">' +
          '<button type="button" data-p="ahoraNo" class="' + BOTON + '">Ahora no</button>' +
          '<button type="button" data-p="listo" class="rounded-xl px-5 py-2 text-sm ' + PRIMARIO + '">¡Listo!</button></div>' : '') +
        '</div>';
      document.body.appendChild(panel);
      panel.addEventListener('click', clicPanel);
      panel.addEventListener('input', function (e) {
        if (e.target.id === 'mp-alumno') {
          var antes = alumno;
          guardarAlumno(e.target.value);
          if (alumno && alumno !== antes) nombreNuevo = true;
          return;
        }
        if (e.target.id !== 'mp-nombre') return;
        borrador.nombre = limpiarNombre(e.target.value);
        panel.querySelector('#mp-vista svg').setAttribute('aria-label', 'Vista previa de ' + esc(borrador.nombre || 'tu mascota'));
        var cd = panel.querySelector('#mp-color-de'); if (cd) cd.textContent = borrador.nombre || buscar(C.personajes, borrador.tipo).nombreSugerido;
        if (!primera) confirmarCambios(false);
      });
      panel.addEventListener('keydown', teclasPanel);
      panel.addEventListener('submit', function (e) {
        if (e.target.id !== 'mp-chat-form') return;
        e.preventDefault();
        var campo = panel.querySelector('#mp-chat-texto');
        despertarVoz();
        if (enviarPregunta(campo.value)) campo.value = '';
        campo.focus();
      });
      panel.addEventListener('mousedown', function (e) { if (e.target === panel) (primera ? ahoraNo : cerrarPanel)(); });
      mostrarPestana(tab || (primera ? 'editar' : 'chat'), true);
      animar(panel.firstChild, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
    }

    function teclasPanel(e) {
      if (e.key === 'Escape') { e.preventDefault(); return primera ? ahoraNo() : cerrarPanel(); }
      if (e.key === 'Enter' && (e.target.id === 'mp-nombre' || e.target.id === 'mp-alumno')) return primera ? confirmarPrimera() : cerrarPanel();
      if (e.target.getAttribute('role') === 'tab' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        return mostrarPestana(pestana === 'chat' ? 'editar' : 'chat', true);
      }
      if (e.key === 'Tab') {
        var f = Array.prototype.filter.call(panel.querySelectorAll('button, input'), function (el) { return !el.disabled && el.offsetParent !== null && el.tabIndex !== -1; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }

    function clicPanel(e) {
      if (e.target.closest('#mp-chat-mic')) { despertarVoz(); return dictar(); }
      if (e.target.closest('#mp-voz')) {
        datos.voz = !datos.voz;
        guardar();
        pintarInterruptorVoz();
        if (datos.voz) desbloquearAudio(); // sin frase de prueba: no gasta voz natural
        else callar();
        return;
      }
      var t = e.target.closest('[data-tab], [data-p]');
      if (!t || t.disabled) return;
      if (t.hasAttribute('data-tab')) return mostrarPestana(t.getAttribute('data-tab'), false);
      var p = t.getAttribute('data-p');
      var id = t.getAttribute('data-id');
      var b = borrador;
      switch (p) {
        case 'cerrar': return primera ? ahoraNo() : cerrarPanel();
        case 'listo': return primera ? confirmarPrimera() : cerrarPanel();
        case 'ahoraNo': return ahoraNo();
        case 'tipo': {
          var antes = buscar(C.personajes, b.tipo);
          var nuevo = buscar(C.personajes, id);
          // El nombre y el color sugeridos siguen al nuevo personaje si no se cambiaron.
          if (!b.nombre || (antes && b.nombre === antes.nombreSugerido)) b.nombre = nuevo.nombreSugerido;
          if (!b.color || (antes && b.color === antes.color)) b.color = nuevo.color;
          b.tipo = id;
          break;
        }
        case 'color': b.color = id; break;
        case 'switch': b[id] = !b[id]; break;
        case 'opcion': b[t.getAttribute('data-clave')] = id; break;
        case 'esquina': volverAEsquina(); cerrarPanel(); return;
        case 'jugar': {
          // Tocar la mascota de la cabecera: salta ahí mismo (y la de la página también).
          sonar();
          var mov = azar([
            [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-14px) rotate(-8deg)', offset: 0.4 }, { transform: 'translateY(0) rotate(0)' }],
            [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }],
            [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.3 }, { transform: 'scale(.95)', offset: 0.6 }, { transform: 'scale(1)' }],
          ]);
          animar(t, mov, { duration: 650, easing: 'ease-out' });
          accion(azar(['cohete', 'voltereta', 'dobleSalto']), azar(['confeti', 'estrellas', 'corazones']), 10);
          return;
        }
        default: return;
      }
      if (!primera) confirmarCambios(p === 'tipo' || p === 'color');
      actualizarControles();
    }

    // Aplica el borrador a la mascota (fuera de la primera visita, al instante).
    function confirmarCambios(festejar) {
      var cambioIA = borrador.ia !== datos.ia;
      datos = normalizar(borrador);
      datos.pospuesto = false;
      huboCambio = true;
      guardar();
      pintar();
      if (cambioIA && datos.ia) prepararIA();
      if (festejar) accion('giro', 'estrellas', 6);
    }
    function confirmarPrimera() {
      borrador.visible = true;
      borrador.minimizada = false;
      borrador.nombre = borrador.nombre || buscar(C.personajes, borrador.tipo).nombreSugerido;
      confirmarCambios(false);
      cerrarPanel();
      ponerAnimo('feliz');
      setTimeout(function () {
        accion('cohete', 'confeti', 20);
        decir('bienvenida', null, true);
      }, 150);
      pedirNombreUnaVez(T.burbujaSegundos * 1000 + 2500);
      volverACalma(15000);
    }
    function ahoraNo() {
      if (!datos.tipo) {
        datos.pospuesto = true;
        guardar();
      }
      cerrarPanel();
    }
    function cerrarPanel() {
      if (!panel) return;
      detenerDictado();
      callar();
      var eraPrimera = primera;
      panel.remove();
      panel = null;
      if (botonNav) botonNav.classList.remove('no-tip');
      if (!eraPrimera && nombreNuevo) {
        accion('dobleSalto', 'corazones', 8);
        decir('nombreNuevo', null, true);
      } else if (!eraPrimera && huboCambio) decir('cambio', null, false);
      // El foco vuelve a donde estaba; si no, a la mascota (o al botón de la
      // barra si la mascota quedó oculta).
      var destino = focoPrevio && focoPrevio !== document.body && document.contains(focoPrevio) && focoPrevio.offsetParent !== null ? focoPrevio : raiz.classList.contains('hidden') ? botonNav : btn;
      if (destino && destino.focus) destino.focus();
    }

    // =================================================================
    // ARRANQUE
    // =================================================================
    function arrancar(d) {
      datos = normalizar(d);
      var previa = datos.ultimaVisita;
      var s = leerSesion();
      // Visita nueva = el libro se abrió de nuevo, o pasó mucho sin actividad.
      var nuevaVisita = !s || Date.now() - (s.ultima || 0) > T.nuevaVisitaMinutos * 60000;
      ses = nuevaVisita ? sesionNueva() : s;
      if (!ses.usados) ses.usados = {};
      if (!ses.calificadas) ses.calificadas = [];
      if (nuevaVisita && s) ses.posicion = s.posicion; // misma pestaña: conserva su lugar
      construir();
      pintar();
      saludar(nuevaVisita, previa);

      ['pointerdown', 'keydown', 'input', 'wheel', 'touchstart'].forEach(function (ev) {
        document.addEventListener(ev, notarActividad, { passive: true, capture: true });
      });
      document.addEventListener('pointermove', notarActividad, { passive: true });
      var tScroll = 0;
      window.addEventListener('scroll', function () {
        notarActividad();
        var ahora = Date.now();
        if (ahora - tScroll > 400) { tScroll = ahora; alDesplazar(); }
      }, { passive: true });
      document.addEventListener('focusout', alSalirDeCampo, true);
      document.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('#bt_comprobar')) setTimeout(alCalificar, 0);
      });
      document.addEventListener('folleto:calificado', function () { setTimeout(alCalificar, 0); });
      document.addEventListener('visibilitychange', function () { if (document.hidden) marcarVisita(); });
      window.addEventListener('pagehide', marcarVisita);
      if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mq.addEventListener) mq.addEventListener('change', reiniciarBucles);
      }
      setInterval(latidoModulo, 15000);
      notarActividad();
      // La IA se prepara cuando el navegador está libre (no retrasa la página).
      (window.requestIdleCallback || function (fn) { setTimeout(fn, 2500); })(function () { prepararIA(); });
    }

    almacen.load().catch(function () { return null; }).then(function (d) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { arrancar(d); });
      else arrancar(d);
    });

    // API para pruebas y para otros scripts del libro.
    window.Mascota = {
      config: C,
      studentId: STUDENT_ID,
      datos: function () { return copia(datos); },
      sesion: function () { return copia(ses); },
      animo: function () { return animo; },
      ideas: function () { return ideasIA ? copia(ideasIA) : null; },
      alumno: function () { return alumno; },
      preguntar: enviarPregunta,
      revelaRespuesta: revelaRespuesta,
      decir: decir,
      accion: accion,
      abrirPanel: abrirPanel,
      dormir: dormir,
      probarIA: function () { return prepararIA(true); },
      estadoIA: function () { return copia(estadoIA); },
      PetStorage: PetStorage,
      LocalStorageAdapter: LocalStorageAdapter,
      MongoAdapter: MongoAdapter,
    };
  }
})();
