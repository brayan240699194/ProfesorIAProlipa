/* =========================================================================
   MATERIA AUTOMÁTICA (js/materia.js)
   -------------------------------------------------------------------------
   Deduce de qué materia es el libro (Biología, Matemática, Física…) sin
   internet y sin configurar nada. Así la mascota, el profesor con IA y los
   juegos se adaptan solos: copia la carpeta a un libro de Matemática y todo
   habla de Matemática. La carga js/toolbar-tooltips.js en cada actividad.

   Cómo decide (de más a menos seguro):
     1. <body data-materia="Matemática"> en la actividad: manda siempre.
     2. El LIBRO: suma lo que encontró en todas las actividades abiertas de
        esta carpeta y en la portada (index.html, cuando se puede leer). Una
        sola actividad puede mezclar materias ("El origen de la vida" habla
        de moléculas; "Nuevas energías", de circuitos), pero el libro entero
        no se confunde. Se recuerda en este navegador.
     3. El nombre de la materia escrito en la página ("Objetivo de Biología").
     4. Si aún no está seguro: null. Entonces no se nombra ninguna materia y
        cada IA la deduce sola del texto de la actividad.

   window.ProlipaMateria:
     actual()        → { id, nombre, emoji } del libro/página, o null
     detectar(texto) → { id, nombre, emoji } de un texto cualquiera, o null
   ========================================================================= */
(function (g) {
  'use strict';
  // Palabras típicas de cada materia (sin tildes, en minúsculas).
  var MATERIAS = [
    { id: 'biologia', nombre: 'Biología', emoji: '🧬', claves: 'biologia biologico celula celulas celular adn arn gen genes genetica organismo organismos especie especies evolucion proteina proteinas enzima enzimas metabolismo fotosintesis bacteria bacterias virus tejido tejidos organo organos digestion digestivo ecosistema taxonomia mitocondria nucleo cromosoma cromosomas herencia seres_vivos ser_vivo levadura musculo musculos sangre respiracion_celular biodiversidad microorganismo planta plantas animal animales vida' },
    { id: 'matematica', nombre: 'Matemática', emoji: '📐', claves: 'matematica matematicas ecuacion ecuaciones funcion funciones fraccion fracciones polinomio polinomios derivada integral angulo angulos triangulo triangulos geometria algebra porcentaje probabilidad estadistica variable variables parabola raiz potencia logaritmo matriz teorema numero numeros calcula resuelve suma multiplicacion division perimetro area' },
    { id: 'fisica', nombre: 'Física', emoji: '🪐', claves: 'fisica fuerza fuerzas velocidad aceleracion masa newton movimiento gravedad onda ondas electricidad circuito magnetismo presion friccion inercia cinetica potencial trayectoria optica' },
    { id: 'quimica', nombre: 'Química', emoji: '⚗️', claves: 'quimica quimico atomo atomos molecula moleculas reaccion_quimica elemento elementos tabla_periodica enlace enlaces acido acidos ph mol compuesto compuestos electron electrones ion iones oxidacion valencia' },
    { id: 'lengua', nombre: 'Lengua y Literatura', emoji: '📖', claves: 'lengua literatura literario texto textos parrafo oracion oraciones sustantivo verbo verbos adjetivo poema poesia cuento cuentos narrador ortografia gramatica novela autor escritura lectura argumentativo' },
    { id: 'sociales', nombre: 'Estudios Sociales', emoji: '🌎', claves: 'historia historico sociedad geografia ciudadania democracia constitucion cultura economia independencia derechos gobierno territorio poblacion colonial republica civilizacion' },
    { id: 'ingles', nombre: 'Inglés', emoji: '🇬🇧', claves: 'english vocabulary grammar the and is are you what where' },
  ].map(function (m) {
    m.lista = m.claves.split(' ').map(function (c) { return c.replace(/_/g, ' '); });
    return m;
  });
  // El nombre de la materia escrito ("Objetivo de Biología", "Matemática 2")
  // pesa mucho más que una palabra suelta.
  var NOMBRES = {
    biologia: ['biologia', 'biologica', 'biologico'],
    matematica: ['matematica', 'matematicas'],
    fisica: ['fisica'],
    quimica: ['quimica'],
    lengua: ['lengua y literatura'],
    sociales: ['estudios sociales'],
    ingles: ['ingles', 'english'],
  };
  var PESO_NOMBRE = 8, PESO_PORTADA = 3;
  var MINIMO_LIBRO = 15; // puntos que necesita una materia para ser la del libro
  var VENTAJA = 1.5; // y cuántas veces más que la segunda

  function normalizar(t) {
    return ' ' + String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ') + ' ';
  }
  function contar(texto, palabra) {
    var n = 0, i = 0, buscar = ' ' + palabra + ' ';
    while ((i = texto.indexOf(buscar, i)) >= 0) { n += 1; i += buscar.length - 1; }
    return n;
  }
  // El nombre cuenta solo cuando se usa COMO MATERIA ("objetivo de biologia",
  // "biologia 1", "libro de matematica"), no como adjetivo ("evolucion quimica").
  var ANTES = ['objetivo de', 'objetivos de', 'area de', 'asignatura de', 'clase de', 'libro de', 'materia de', 'docente de', 'profesor de'];
  function contarNombre(t, nombre) {
    var n = ANTES.reduce(function (s, a) { return s + contar(t, a + ' ' + nombre); }, 0);
    var re = new RegExp(' ' + nombre + ' [0-9] ', 'g');
    return n + (t.match(re) || []).length;
  }
  // → { biologia: { claves, nombres }, … }
  function puntajes(texto) {
    var t = normalizar(texto), r = {};
    MATERIAS.forEach(function (m) {
      r[m.id] = {
        claves: m.lista.reduce(function (s, c) { return s + contar(t, c); }, 0),
        nombres: (NOMBRES[m.id] || []).reduce(function (s, c) { return s + contarNombre(t, c); }, 0),
      };
    });
    return r;
  }
  var total = function (p) { return p.claves + PESO_NOMBRE * p.nombres; };
  function aMateria(id) {
    var m = MATERIAS.filter(function (x) { return x.id === id; })[0];
    return m ? { id: m.id, nombre: m.nombre, emoji: m.emoji } : null;
  }
  // La que gana con claridad en una tabla { id: puntos }, o null.
  function ganador(tabla, minimo) {
    var orden = Object.keys(tabla).sort(function (a, b) { return tabla[b] - tabla[a]; });
    var a = tabla[orden[0]] || 0, b = tabla[orden[1]] || 0;
    return a >= minimo && a >= VENTAJA * b ? aMateria(orden[0]) : null;
  }
  // Para un texto suelto (por ejemplo, el tema de un juego abierto con el QR).
  function detectar(texto) {
    var p = puntajes(texto), tabla = {};
    for (var id in p) tabla[id] = total(p[id]);
    return ganador(tabla, 3);
  }

  // ---------- Memoria del libro (por carpeta, en este navegador) ----------
  var CLAVE = 'prolipa-materia:' + location.pathname.replace(/[^/]*$/, '');
  function leer() { try { return JSON.parse(localStorage.getItem(CLAVE)) || { paginas: {} }; } catch (e) { return { paginas: {} }; } }
  function guardar(m) { try { localStorage.setItem(CLAVE, JSON.stringify(m)); } catch (e) {} }
  function anotar(pagina, texto, peso) {
    var p = puntajes(texto), fila = {};
    for (var id in p) if (total(p[id])) fila[id] = total(p[id]) * (peso || 1);
    var mem = leer();
    mem.paginas[pagina] = fila;
    guardar(mem);
    return p;
  }
  // Con UNA sola actividad no se decide el libro (una actividad puede mezclar
  // materias): hacen falta dos actividades o la portada.
  function delLibro() {
    var suma = {}, mem = leer(), paginas = Object.keys(mem.paginas);
    if (paginas.length < 2 && paginas.indexOf('__portada') < 0) return null;
    paginas.forEach(function (pg) { for (var id in mem.paginas[pg]) suma[id] = (suma[id] || 0) + mem.paginas[pg][id]; });
    return ganador(suma, MINIMO_LIBRO);
  }

  var cache, estaPagina = null, portadaLeida = false;
  function actual() {
    if (cache !== undefined) return cache;
    var fija = document.body && document.body.getAttribute('data-materia');
    if (fija) {
      var conocida = MATERIAS.filter(function (m) { return normalizar(m.nombre) === normalizar(fija) || m.id === fija; })[0];
      return (cache = conocida ? aMateria(conocida.id) : { id: normalizar(fija).trim().replace(/ /g, '-'), nombre: fija, emoji: '📘' });
    }
    var zona = document.querySelector('#activity .panel-body') || document.body;
    if (!zona) return null;
    if (!estaPagina) {
      var pagina = decodeURIComponent(location.pathname.split('/').pop() || 'pagina');
      estaPagina = anotar(pagina, document.title + ' ' + (zona.textContent || '').slice(0, 6000));
      leerPortada();
    }
    // 2) El libro entero · 3) el nombre escrito en esta página · 4) no se sabe.
    var libro = delLibro();
    if (libro) return (cache = libro);
    var nombres = {};
    for (var id in estaPagina) nombres[id] = estaPagina[id].nombres;
    return (cache = ganador(nombres, 1));
  }
  // La portada del libro (index.html) dice mucho ("Biología 1 · BGU"). Solo se
  // puede leer publicada o con un servidor (no abriendo el archivo con doble clic).
  function leerPortada() {
    if (portadaLeida || !/^https?:$/.test(location.protocol) || !window.fetch) return;
    portadaLeida = true;
    fetch('index.html', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (html) {
      if (!html) return;
      var texto = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
      anotar('__portada', texto, PESO_PORTADA);
      cache = undefined; // se vuelve a decidir con la portada
    }).catch(function () {});
  }
  g.ProlipaMateria = { actual: actual, detectar: detectar };
})(typeof window !== 'undefined' ? window : globalThis);
