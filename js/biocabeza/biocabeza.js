/* =========================================================================
   BIOCABEZA — el juego de los sombreros biológicos (js/biocabeza/biocabeza.js)
   -------------------------------------------------------------------------
   La cámara frontal muestra al estudiante; arriba, la nube con la pregunta de
   la IA; sobre su cabeza flotan tres "sombreros" con las opciones. Mueve la
   cabeza (se sigue la nariz con MediaPipe Face Landmarker) hasta quedar bajo
   una opción y se queda quieto JUEGO.segundosQuieto: esa es su respuesta.
   IA: la misma conexión de la Entrevista (js/entrevista/config.js, clave en
   config.local.js o servidor intermedio → /api/biocabeza/preguntas).
   Sin IA o sin cámara, el juego sigue: preguntas de ejemplo y toque/teclado.
   Script clásico (no módulo) para que también funcione abriendo el archivo
   (file://); MediaPipe se trae con import() dinámico desde el CDN.
   ========================================================================= */
(function () {
'use strict';
const SCRIPT = document.currentScript ? document.currentScript.src : location.href;
const JUEGO = {
  segundosQuieto: 1.5, // tiempo quieto bajo una opción para elegirla
  toleranciaQuieto: 0.06, // cuánto puede moverse la nariz (fracción del ancho) y seguir "quieto"
  ganancia: 1.7, // amplifica el movimiento: no hace falta salirse de la pantalla
  // Lectura: los sombreros no se pueden elegir con la cabeza hasta que la voz
  // termina de leer la pregunta y las opciones (+ esperaTrasLeer). Sin voz, se
  // calcula el tiempo de lectura según el número de palabras.
  esperaTrasLeer: 800, // ms después de que la voz termina
  msPorPalabra: 330, // lectura en silencio (≈ 3 palabras por segundo)
  lecturaMinima: 3500,
  lecturaMaxima: 10000,
  segundosRevelar: 5, // mínimo con la explicación en pantalla antes de la siguiente
  // Dirección pública del libro (GitHub Pages): el QR lleva aquí cuando el juego
  // se abre desde la computadora (archivo o localhost), que el celular no puede abrir.
  urlPublica: 'https://brayan240699194.github.io/ProfesorIAProlipa/',
};
const MEDIAPIPE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODELO_CARA = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const LIB_QR = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
const URL_GOOGLE = 'https://generativelanguage.googleapis.com/v1beta/models/';
// Puntos de la malla facial: nariz, frente (arriba), mentón, mejillas.
const P = { nariz: 1, frente: 10, menton: 152, izq: 234, der: 454 };

// Preguntas de ejemplo (sin IA).
const EJEMPLO = {
  tema: 'La célula',
  preguntas: [
    { pregunta: '¿Cuál es el "cerebro" de la célula?', opciones: [{ texto: 'Mitocondria', emoji: '⚡' }, { texto: 'Núcleo', emoji: '🧠' }, { texto: 'Ribosoma', emoji: '🔩' }], correcta: 1, explicacion: 'El núcleo guarda el ADN y dirige las actividades de la célula.' },
    { pregunta: '¿Qué organelo es la "central eléctrica" de la célula?', opciones: [{ texto: 'Mitocondria', emoji: '⚡' }, { texto: 'Vacuola', emoji: '💧' }, { texto: 'Aparato de Golgi', emoji: '📦' }], correcta: 0, explicacion: 'La mitocondria produce ATP, la energía de la célula, en la respiración celular.' },
    { pregunta: '¿Dónde se fabrican las proteínas?', opciones: [{ texto: 'Lisosoma', emoji: '🗑️' }, { texto: 'Cloroplasto', emoji: '🌿' }, { texto: 'Ribosoma', emoji: '🔩' }], correcta: 2, explicacion: 'Los ribosomas leen el ARN mensajero y unen aminoácidos para formar proteínas.' },
    { pregunta: '¿Qué tienen las células vegetales y no las animales?', opciones: [{ texto: 'Pared celular', emoji: '🧱' }, { texto: 'Núcleo', emoji: '🧠' }, { texto: 'Membrana', emoji: '🫧' }], correcta: 0, explicacion: 'La pared celular de celulosa da forma y soporte a la célula vegetal.' },
    { pregunta: '¿Quién hace la fotosíntesis en la planta?', opciones: [{ texto: 'Mitocondria', emoji: '⚡' }, { texto: 'Cloroplasto', emoji: '🌿' }, { texto: 'Centriolo', emoji: '🎯' }], correcta: 1, explicacion: 'El cloroplasto usa la luz para transformar CO₂ y agua en glucosa.' },
    { pregunta: '¿Cuál es la "aduana" que controla qué entra a la célula?', opciones: [{ texto: 'Citoplasma', emoji: '🌊' }, { texto: 'Nucléolo', emoji: '⚫' }, { texto: 'Membrana', emoji: '🫧' }], correcta: 2, explicacion: 'La membrana plasmática es semipermeable: deja pasar unas sustancias y otras no.' },
    { pregunta: '¿Qué célula NO tiene núcleo definido?', opciones: [{ texto: 'Bacteria', emoji: '🦠' }, { texto: 'Neurona', emoji: '🧬' }, { texto: 'Célula vegetal', emoji: '🌱' }], correcta: 0, explicacion: 'Las bacterias son procariotas: su ADN está libre en el citoplasma.' },
    { pregunta: '¿Qué organelo es el "reciclador" de la célula?', opciones: [{ texto: 'Ribosoma', emoji: '🔩' }, { texto: 'Lisosoma', emoji: '♻️' }, { texto: 'Cloroplasto', emoji: '🌿' }], correcta: 1, explicacion: 'Los lisosomas tienen enzimas que digieren desechos y partes viejas de la célula.' },
    { pregunta: '¿Qué molécula guarda la información genética?', opciones: [{ texto: 'Glucosa', emoji: '🍬' }, { texto: 'Lípido', emoji: '🧈' }, { texto: 'ADN', emoji: '🧬' }], correcta: 2, explicacion: 'El ADN contiene los genes, las instrucciones para formar y hacer funcionar al ser vivo.' },
    { pregunta: '¿Qué organelo "empaca y envía" las proteínas?', opciones: [{ texto: 'Aparato de Golgi', emoji: '📦' }, { texto: 'Vacuola', emoji: '💧' }, { texto: 'Núcleo', emoji: '🧠' }], correcta: 0, explicacion: 'El aparato de Golgi modifica, empaca y distribuye proteínas y lípidos.' },
  ],
};

const $ = (id) => document.getElementById(id);
const R = window.BioCabezaReglas;
const MOVIMIENTO = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function almacen() { try { return window.localStorage; } catch (e) { return null; } }
const LS = almacen();
function leer(k) { try { return LS ? LS.getItem(k) : null; } catch (e) { return null; } }
function guardar(k, v) { try { if (LS) LS.setItem(k, v); } catch (e) {} }
function el(tag, clase, texto) {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto != null) e.textContent = texto;
  return e;
}
function cargarScript(url) {
  return new Promise((ok, falla) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = ok;
    s.onerror = () => falla(new Error('No se pudo cargar ' + url));
    document.head.appendChild(s);
  });
}
const mezclar = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ======================= IA (misma conexión que la Entrevista) =======================
const carpetaEntrevista = new URL('../entrevista/', SCRIPT).href;
const enLocal = location.protocol === 'file:' || /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(location.hostname) || /\.devtunnels\.ms$/.test(location.hostname);
const C = window.ENTREVISTA_CONFIG || { ia: {} };
C.ia = C.ia || {};

// Clave de pruebas (js/entrevista/config.local.js): solo en tu computadora o
// por el túnel de VS Code. Publicado, se usa el servidor intermedio (proxyUrl).
async function prepararIA() {
  if (enLocal && !window.ENTREVISTA_SECRETOS && C.ia.activa !== false) await cargarScript(carpetaEntrevista + 'config.local.js?t=' + Date.now()).catch(() => {});
  const S = enLocal && window.ENTREVISTA_SECRETOS;
  if (S && S.ia) {
    if (S.ia.apiKey && S.ia.proxyUrl == null) C.ia.proxyUrl = '';
    for (const k in S.ia) if (S.ia[k] !== '' && S.ia[k] != null) C.ia[k] = S.ia[k];
  }
  if (C.ia.activa === false) return '';
  return C.ia.proxyUrl ? 'servidor' : C.ia.apiKey ? 'directo' : '';
}
let modoIA = '';

function conTiempo(ms) { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; }
async function comprobar(r) {
  if (r.ok) return r.json();
  const e = new Error('IA ' + r.status);
  e.status = r.status;
  e.detalle = (await r.text().catch(() => '')).slice(0, 300);
  throw e;
}
function pensamiento(modelo) {
  const v = /gemini-(\d+)/i.exec(modelo || '');
  return v && Number(v[1]) < 3 ? { thinkingBudget: 0 } : { thinkingLevel: 'minimal' };
}
async function geminiDirecto(d) {
  const pedir = (conPensamiento) => {
    const gen = { maxOutputTokens: 2500, temperature: 0.8, responseMimeType: 'application/json' };
    if (conPensamiento) gen.thinkingConfig = pensamiento(C.ia.modelo);
    return fetch(URL_GOOGLE + encodeURIComponent(C.ia.modelo || 'gemini-3.5-flash-lite') + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': C.ia.apiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: R.sistema(d) }] }, contents: [{ role: 'user', parts: [{ text: R.usuario(d) }] }], generationConfig: gen }),
      signal: conTiempo(20000),
    }).then(comprobar);
  };
  const j = await pedir(true).catch((e) => { if (e.status === 400 && !/API[_ ]?key/i.test(e.detalle || '')) return pedir(false); throw e; });
  return ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map((x) => (x.thought ? '' : x.text || '')).join('');
}
// A veces Gemini se demora ~20 s en una petición y la siguiente sale en 2-3 s:
// si a los "ms" no hay respuesta (o la primera falla), se lanza un segundo
// intento en paralelo y gana el primero que traiga preguntas válidas.
// Con la clave mal (400/401/403) no se reintenta.
function carrera(fn, ms) {
  return new Promise((ok, falla) => {
    let lanzados = 0, fallidos = 0, listo = false, ultimo = null, reloj = 0;
    const lanzar = () => {
      if (listo || lanzados >= 2) return;
      lanzados += 1;
      fn().then((r) => {
        if (!r) throw Object.assign(new Error('preguntas no válidas'), { sinPreguntas: true });
        if (!listo) { listo = true; clearTimeout(reloj); ok(r); }
      }).catch((e) => {
        ultimo = e;
        fallidos += 1;
        if (listo) return;
        if (lanzados < 2 && ![400, 401, 403].includes(e.status)) { clearTimeout(reloj); lanzar(); }
        else if (fallidos >= lanzados) { listo = true; falla(ultimo); }
      });
    };
    lanzar();
    reloj = setTimeout(lanzar, ms);
  });
}
// → { tema, preguntas, origen: 'ia' | 'ejemplo', error? }
async function pedirPreguntas(tema, cantidad, nivel, contexto) {
  const libro = C.libro || {};
  // Materia: la de la actividad (detectada) o la de config.js; si no, la deduce la IA del tema.
  const materia = (ACTIVIDAD.materia && ACTIVIDAD.materia.nombre) || libro.nombre || ((window.ProlipaMateria && window.ProlipaMateria.detectar(tema + ' ' + (contexto || ''))) || {}).nombre || '';
  const d = R.datos({ tema, cantidad, nivel, contexto, libro: materia, publico: libro.publico });
  const ejemplo = (error) => ({ tema: EJEMPLO.tema, preguntas: mezclar(EJEMPLO.preguntas).slice(0, d.cantidad), origen: 'ejemplo', error });
  if (!modoIA) return ejemplo('');
  if (R.tieneDatosPersonales(d.tema)) return ejemplo('El tema no puede llevar correos ni números largos.');
  const intento = async () => {
    if (modoIA === 'servidor') {
      const base = String(C.ia.proxyUrl).replace(/\/+$/, '').replace(/\/api$/, '');
      return R.normalizar(await fetch(base + '/api/biocabeza/preguntas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), signal: conTiempo(25000) }).then(comprobar), d.cantidad);
    }
    return R.normalizar(await geminiDirecto(d), d.cantidad);
  };
  try {
    const r = await carrera(intento, 6000);
    return { tema: r.tema || d.tema, preguntas: r.preguntas, origen: 'ia' };
  } catch (e) {
    const s = e.status;
    const m = e.sinPreguntas ? 'La IA no devolvió preguntas válidas.' : s === 429 ? 'La IA llegó a su límite de uso (429).' : s === 400 || s === 401 || s === 403 ? 'La clave o el servidor de la IA no es válido (' + s + ').' : s ? 'La IA respondió con error ' + s + '.' : 'Sin conexión con la IA.';
    console.warn('BioCabeza:', e);
    return ejemplo(m);
  }
}

// ======================= Voz y sonidos =======================
let vozActiva = leer('biocabeza.voz') !== 'no';
// Lee el texto con la voz del dispositivo. alTerminar se llama al acabar de
// leer. Devuelve false si no hay voz (entonces alTerminar no se llama).
function hablar(t, alTerminar) {
  if (!vozActiva || !window.speechSynthesis) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'es-ES';
    const v = speechSynthesis.getVoices().find((x) => /^es[-_]/i.test(x.lang));
    if (v) u.voice = v;
    u.rate = 1.05;
    if (alTerminar) { u.onend = alTerminar; u.onerror = alTerminar; }
    speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}
// Tiempo para leer un texto en silencio (≈ 3 palabras por segundo).
function tiempoLectura(t) {
  const palabras = String(t).split(/\s+/).filter(Boolean).length;
  return Math.min(JUEGO.lecturaMaxima, Math.max(JUEGO.lecturaMinima, 1500 + palabras * JUEGO.msPorPalabra));
}
let audioCtx = null;
function tono(notas) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audioCtx.currentTime;
    notas.forEach(([f, ini, dur, tipo]) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = tipo || 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + ini);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + ini + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0 + ini);
      o.stop(t0 + ini + dur + 0.05);
    });
  } catch (e) {}
}
const SONIDO = {
  bien: () => tono([[523, 0, 0.15], [659, 0.1, 0.15], [784, 0.2, 0.15], [1047, 0.3, 0.3]]),
  mal: () => tono([[220, 0, 0.25, 'sawtooth'], [180, 0.18, 0.35, 'sawtooth']]),
  tic: () => tono([[880, 0, 0.06, 'sine']]),
};

// ======================= Confeti =======================
const lienzo = $('confeti');
const ctx = lienzo.getContext('2d');
let particulas = [];
function ajustarLienzo() {
  const r = window.devicePixelRatio || 1;
  lienzo.width = innerWidth * r;
  lienzo.height = innerHeight * r;
  ctx.setTransform(r, 0, 0, r, 0, 0);
}
function confeti(x, y, mucho) {
  const colores = ['#1e3a8a', '#2563eb', '#3b82f6', '#38bdf8', '#7dd3fc', '#bae6fd', '#ffffff', '#facc15']; // azules y celestes de Prolipa
  const n = !MOVIMIENTO ? 20 : mucho ? 160 : 50;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = (mucho ? 6 : 4) + Math.random() * (mucho ? 9 : 5);
    particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (mucho ? 6 : 3), g: 0.28, r: 4 + Math.random() * 5, giro: Math.random() * 6, vg: (Math.random() - 0.5) * 0.4, color: mucho ? colores[i % colores.length] : '#94a3b8', vida: 1 });
  }
}
function pintarConfeti() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  particulas = particulas.filter((p) => p.vida > 0 && p.y < innerHeight + 30);
  for (const p of particulas) {
    p.vy += p.g; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.giro += p.vg; p.vida -= 0.008;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.vida * 1.5));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.giro);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
    ctx.restore();
  }
}

// ======================= Cámara y seguimiento de la cara =======================
const video = $('camara');
let landmarker = null;
let camaraLista = false;
let ultimoTiempoVideo = -1;

async function abrirCamara() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw Object.assign(new Error('sin cámara'), { motivo: window.isSecureContext ? 'Este navegador no permite usar la cámara.' : 'La cámara solo funciona en una dirección segura (https) o en localhost.' });
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } }).catch((e) => {
    const motivo = e.name === 'NotAllowedError' ? 'Permiso de cámara negado: actívalo en el candado 🔒 de la barra de direcciones.' : e.name === 'NotFoundError' ? 'No se encontró ninguna cámara.' : e.name === 'NotReadableError' ? 'Otra aplicación está usando la cámara.' : 'No se pudo abrir la cámara.';
    throw Object.assign(e, { motivo });
  });
  video.srcObject = stream;
  await video.play().catch(() => {});
  await new Promise((ok) => (video.readyState >= 2 ? ok() : video.addEventListener('loadeddata', ok, { once: true })));
  camaraLista = true;
}
function cerrarCamara() {
  const s = video.srcObject;
  if (s) s.getTracks().forEach((t) => t.stop());
  video.srcObject = null;
  camaraLista = false;
}
async function cargarDetector() {
  if (landmarker) return landmarker;
  const { FaceLandmarker, FilesetResolver } = await import(MEDIAPIPE + '/vision_bundle.mjs');
  const archivos = await FilesetResolver.forVisionTasks(MEDIAPIPE + '/wasm');
  const crear = (delegate) => FaceLandmarker.createFromOptions(archivos, { baseOptions: { modelAssetPath: MODELO_CARA, delegate }, runningMode: 'VIDEO', numFaces: 1 });
  landmarker = await crear('GPU').catch(() => crear('CPU'));
  return landmarker;
}
// Punto de la malla (0-1 del video) → píxeles de la pantalla (video en
// "cover" y en espejo).
function aPantalla(pt) {
  const W = innerWidth, H = innerHeight, vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
  const e = Math.max(W / vw, H / vh);
  return { x: (W - vw * e) / 2 + (1 - pt.x) * vw * e, y: (H - vh * e) / 2 + pt.y * vh * e };
}
// → { nariz, frente, alto } en píxeles, o null si no hay cara.
let caraAnterior = null;
function leerCara(ahora) {
  if (!landmarker || !camaraLista || video.readyState < 2) return null;
  if (video.currentTime === ultimoTiempoVideo) return caraAnterior;
  ultimoTiempoVideo = video.currentTime;
  let r;
  try { r = landmarker.detectForVideo(video, ahora); } catch (e) { return null; }
  const m = r && r.faceLandmarks && r.faceLandmarks[0];
  if (!m) { caraAnterior = null; return null; }
  const nariz = aPantalla(m[P.nariz]), frente = aPantalla(m[P.frente]), menton = aPantalla(m[P.menton]);
  caraAnterior = { nariz, frente, alto: Math.abs(menton.y - frente.y) };
  return caraAnterior;
}

// ======================= El juego =======================
const estado = {
  fase: 'inicio', // inicio | cargando | cuenta | pregunta | revelando | final
  ronda: 0, // cambia al empezar o salir: corta lo que quedó esperando
  tema: '',
  lista: [], // preguntas con las opciones ya mezcladas
  i: 0,
  aciertos: 0,
  racha: 0,
  mejorRacha: 0,
  respuestas: [],
  columna: -1, // opción bajo la cabeza
  desde: 0, // cuándo empezó a estar quieto bajo esa opción
  ancla: null, // posición de la nariz al empezar a estar quieto
  bloqueadoHasta: 0,
  conVoz: false,
  suave: null, // posición suavizada de la cabeza
  topOpciones: 0,
  temporizador: 0,
  puesto: null, // sombrero correcto puesto sobre la cabeza { el, w, h }
  ultimas: null,
};
const opcionesEl = $('opciones');
const columnaEl = $('columna');
const marcaEl = $('marca');
const marcaIco = $('marca-ico');
const avanceEl = marcaEl.querySelector('.avance');

function aviso(t) { $('aviso').textContent = t; $('aviso').hidden = !t; }
function icono(t) { if (marcaIco.textContent !== t) marcaIco.textContent = t; }

function prepararLista(preguntas) {
  return preguntas.map((p) => {
    const orden = mezclar([0, 1, 2]);
    return { ...p, opciones: orden.map((k) => p.opciones[k]), correcta: orden.indexOf(p.correcta) };
  });
}

// Barra superior: n.º de pregunta, puntitos de progreso, puntos y racha.
function pintarHud() {
  const total = estado.lista.length;
  $('contador').firstChild.nodeValue = (total ? Math.min(estado.i + 1, total) + '/' + total : '–') + ' ';
  $('puntos').textContent = '✅ ' + aciertosTexto(estado.aciertos, total);
  const racha = $('racha');
  racha.hidden = estado.racha < 2;
  racha.textContent = '🔥 x' + estado.racha;
  const prog = $('progreso');
  if (prog.children.length !== total) { prog.textContent = ''; for (let k = 0; k < total; k++) prog.append(el('i')); }
  [...prog.children].forEach((d, k) => {
    const r = estado.respuestas[k];
    d.className = r ? (r.bien ? 'bien' : 'mal') : k === estado.i && estado.fase === 'pregunta' ? 'actual' : '';
  });
}
// "3 de 5 aciertos" (el marcador de los juegos: aciertos, no puntos).
function aciertosTexto(a, n) { return a + ' de ' + n + (n === 1 ? ' acierto' : ' aciertos'); }
function puntosFlotantes(x, y, etiqueta) {
  const f = el('div', 'flota', '+1 acierto');
  if (etiqueta) f.append(el('small', '', etiqueta));
  f.style.left = x + 'px';
  f.style.top = y + 'px';
  $('escenario').append(f);
  setTimeout(() => f.remove(), 1400);
  const p = $('puntos');
  p.classList.remove('sube'); void p.offsetWidth; p.classList.add('sube');
}
// Número que sube de 0 a "fin" (los aciertos del final); "despues" va detrás ("de 5").
function contar(nodo, fin, despues) {
  const t0 = performance.now(), dur = MOVIMIENTO ? 1100 : 0;
  const paso = (t) => {
    const x = dur ? Math.min(1, (t - t0) / dur) : 1;
    nodo.textContent = Math.round(fin * (1 - Math.pow(1 - x, 3))) + (despues || '');
    if (x < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
// 3, 2, 1, ¡Ya! antes de la primera pregunta.
function cuentaRegresiva(ronda) {
  return new Promise((ok) => {
    const c = $('cuenta');
    if (!MOVIMIENTO) return ok();
    estado.fase = 'cuenta';
    const pasos = ['3', '2', '1', '¡Ya!'];
    let k = 0;
    const paso = () => {
      c.textContent = '';
      if (ronda !== estado.ronda || k >= pasos.length) return ok();
      c.append(el('span', '', pasos[k]));
      tono(k < 3 ? [[660, 0, 0.12, 'sine']] : [[990, 0, 0.3, 'sine']]);
      k += 1;
      setTimeout(paso, k < pasos.length ? 800 : 650);
    };
    paso();
  });
}
function quitarSombreroPuesto() {
  if (estado.puesto) { estado.puesto.el.remove(); estado.puesto = null; }
}
// El sombrero correcto vuela desde su lugar y "se pone" sobre la cabeza; luego
// sigue a la cabeza hasta la siguiente pregunta.
function ponerSombrero(boton, r, alAterrizar) {
  quitarSombreroPuesto();
  const c = boton.cloneNode(true);
  c.className = 'sombrero bien volando';
  c.removeAttribute('aria-label');
  c.setAttribute('aria-hidden', 'true');
  Object.assign(c.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  $('escenario').append(c);
  boton.style.visibility = 'hidden';
  const s = estado.suave;
  const dx = s.x - (r.left + r.width / 2);
  const dy = s.y - s.alto * 0.25 - r.height * 0.35 - (r.top + r.height / 2);
  const vuelo = c.animate([
    { transform: 'translate(0,0) scale(1) rotate(0)' },
    { transform: 'translate(' + dx * 0.6 + 'px,' + (dy * 0.6 - 70) + 'px) scale(1.05) rotate(-10deg)', offset: 0.55 },
    { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.8) rotate(0)' },
  ], { duration: 700, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
  vuelo.onfinish = () => {
    vuelo.cancel();
    c.style.transform = 'scale(.8)';
    estado.puesto = { el: c, w: r.width, h: r.height };
    c.style.left = s.x - r.width / 2 + 'px';
    c.style.top = s.y - s.alto * 0.25 - r.height * 0.35 - r.height / 2 + 'px';
    alAterrizar();
  };
}

function mostrarPregunta() {
  const p = estado.lista[estado.i];
  estado.fase = 'pregunta';
  estado.columna = -1;
  estado.ancla = null;
  quitarSombreroPuesto();
  pintarHud();
  $('pregunta').textContent = p.pregunta;
  $('retro').hidden = true;
  $('siguiente').hidden = true;
  const nube = $('nube');
  nube.classList.remove('entra', 'bien', 'mal'); void nube.offsetWidth; nube.classList.add('entra');
  opcionesEl.textContent = '';
  p.opciones.forEach((o, k) => {
    const b = el('button', 'sombrero');
    b.type = 'button';
    b.style.setProperty('--k', k);
    b.setAttribute('aria-label', 'Opción ' + (k + 1) + ': ' + o.texto);
    b.append(el('span', 'tecla', String(k + 1)), el('span', 'emoji', o.emoji || '📦'), el('span', 'txt', o.texto), el('span', 'barra'));
    b.addEventListener('click', () => { if (estado.fase === 'pregunta') elegir(k); });
    opcionesEl.append(b);
  });
  // Bloqueo de lectura: con voz, hasta que termina de leer (máx. 15 s por si
  // el navegador no avisa); sin voz, según el largo del texto.
  const lectura = p.pregunta + '. ' + p.opciones.map((o) => o.texto).join(', ') + '.';
  const n = estado.i;
  const conVoz = hablar(lectura, () => {
    if (estado.fase === 'pregunta' && estado.i === n) estado.bloqueadoHasta = Math.min(estado.bloqueadoHasta, performance.now() + JUEGO.esperaTrasLeer);
  });
  estado.bloqueadoHasta = performance.now() + (conVoz ? 15000 : tiempoLectura(lectura));
  estado.conVoz = conVoz;
  opcionesEl.classList.add('espera');
  aviso(camaraLista ? (landmarker ? '' : 'Cargando el detector de caras…') : 'Toca tu respuesta (o usa las teclas 1, 2 y 3)');
}

function elegir(k) {
  const p = estado.lista[estado.i];
  estado.fase = 'revelando';
  if (window.speechSynthesis) speechSynthesis.cancel();
  const bien = k === p.correcta;
  if (bien) {
    estado.aciertos += 1;
    estado.racha += 1;
    estado.mejorRacha = Math.max(estado.mejorRacha, estado.racha);
  } else {
    estado.racha = 0;
  }
  estado.respuestas.push({ pregunta: p.pregunta, elegida: p.opciones[k].texto, correcta: p.opciones[p.correcta].texto, bien, explicacion: p.explicacion });
  const botones = [...opcionesEl.children];
  botones.forEach((b, j) => {
    b.style.setProperty('--p', 0);
    b.classList.remove('activo');
    if (j === p.correcta) b.classList.add('bien');
    else if (j === k) b.classList.add('mal');
    else b.classList.add('apagado');
  });
  const r = botones[k].getBoundingClientRect();
  const celebrar = (x, y) => {
    confeti(x, y, bien);
    if (bien) puntosFlotantes(x, y - 40, estado.racha >= 2 ? '🔥 racha x' + estado.racha : '');
    // Zoom de la cámara hacia la cara.
    const mundo = $('mundo');
    const c = estado.suave || { x: innerWidth / 2, y: innerHeight / 2 };
    mundo.style.transformOrigin = c.x + 'px ' + c.y + 'px';
    mundo.classList.add('zoom');
    setTimeout(() => mundo.classList.remove('zoom'), 900);
    pintarHud();
  };
  if (bien && MOVIMIENTO && caraAnterior && estado.suave) {
    ponerSombrero(botones[k], r, () => { const s = estado.suave; celebrar(s.x, s.y - s.alto * 0.25 - r.height * 0.35); });
  } else {
    botones[k].classList.add('explota');
    celebrar(r.left + r.width / 2, r.top + r.height / 2);
  }
  const d = $('destello');
  d.className = bien ? 'bien' : 'mal';
  setTimeout(() => (d.className = ''), 700);
  (bien ? SONIDO.bien : SONIDO.mal)();
  columnaEl.style.opacity = 0;
  marcaEl.style.opacity = 0;

  $('nube').classList.add(bien ? 'bien' : 'mal');
  const retro = $('retro');
  retro.hidden = false;
  retro.className = bien ? 'bien' : 'mal';
  retro.textContent = (bien ? '✅ ¡Correcto! ' : '❌ Era «' + p.opciones[p.correcta].texto + '». ') + (p.explicacion || '');
  const sig = $('siguiente');
  sig.hidden = false;
  sig.textContent = estado.i + 1 < estado.lista.length ? 'Siguiente ▶' : 'Ver resultado 🏁';
  aviso('');
  opcionesEl.classList.remove('espera');
  pintarHud();
  // Pasa sola a la siguiente cuando termina de leer la explicación (o tras su
  // tiempo de lectura), nunca antes de segundosRevelar. "Siguiente" adelanta.
  clearTimeout(estado.temporizador);
  const n = estado.i, desde = performance.now();
  const texto = (bien ? '¡Correcto! ' : 'Era ' + p.opciones[p.correcta].texto + '. ') + (p.explicacion || '');
  const pasar = (extra) => {
    if (estado.fase !== 'revelando' || estado.i !== n) return;
    clearTimeout(estado.temporizador);
    estado.temporizador = setTimeout(siguiente, Math.max(extra, JUEGO.segundosRevelar * 1000 - (performance.now() - desde)));
  };
  if (hablar(texto, () => pasar(1500))) estado.temporizador = setTimeout(siguiente, 20000);
  else pasar(tiempoLectura(texto));
}

function siguiente() {
  clearTimeout(estado.temporizador);
  if (estado.fase !== 'revelando') return;
  estado.i += 1;
  if (estado.i < estado.lista.length) mostrarPregunta();
  else terminar();
}

function terminar() {
  estado.fase = 'final';
  quitarSombreroPuesto();
  const n = estado.lista.length, a = estado.aciertos;
  const ratio = n ? a / n : 0;
  const estrellas = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;
  [...$('estrellas').children].forEach((s, k) => {
    s.classList.remove('llena');
    if (k < estrellas) setTimeout(() => { s.classList.add('llena'); tono([[660 + k * 220, 0, 0.18, 'sine']]); }, 450 + k * 380);
  });
  contar($('final-puntos'), a, ' de ' + n);
  $('final-aciertos').textContent = (n === 1 ? 'acierto' : 'aciertos') + (estado.mejorRacha >= 2 ? ' · 🔥 mejor racha x' + estado.mejorRacha : '');
  // Récord por tema (solo en este navegador).
  const clave = 'biocabeza.record.' + estado.tema.toLowerCase();
  // El récord es la mejor proporción de aciertos ("4 de 5"), guardada como "a/n".
  const previo = /^(\d+)\/(\d+)$/.exec(leer(clave) || '');
  const antes = previo ? { a: Number(previo[1]), n: Number(previo[2]) } : null;
  const rec = $('final-record');
  if (a && (!antes || a / n > antes.a / antes.n)) { guardar(clave, a + '/' + n); rec.textContent = antes ? '🏅 ¡Nuevo récord! Antes: ' + aciertosTexto(antes.a, antes.n) : '🏅 ¡Tu primer récord en este tema!'; }
  else if (antes) rec.textContent = '🏅 Tu récord en este tema: ' + aciertosTexto(antes.a, antes.n);
  rec.hidden = !a && !antes;
  $('final-mensaje').textContent = estrellas === 3 ? '¡Perfecto! Dominas «' + estado.tema + '». 🏆' : estrellas === 2 ? '¡Muy bien! Repasa las que fallaste y vuelve por las 3 estrellas.' : 'Sigue practicando: lee las explicaciones y vuelve a jugar.';
  const ul = $('resumen');
  ul.textContent = '';
  estado.respuestas.forEach((r, k) => {
    const li = el('li', r.bien ? 'bien' : 'mal');
    li.style.setProperty('--k', k);
    li.append(el('b', '', (k + 1) + '. ' + r.pregunta), el('span', '', (r.bien ? '✅ ' : '❌ Elegiste «' + r.elegida + '» · Correcta: ') + '«' + r.correcta + '»'));
    if (r.explicacion) { li.append(el('br')); li.append(el('small', '', r.explicacion)); }
    ul.append(li);
  });
  $('final').hidden = false;
  $('final').scrollTop = 0;
  if (estrellas === 3) [0, 350, 700].forEach((t, k) => setTimeout(() => confeti(innerWidth * (0.25 + k * 0.25), innerHeight * 0.3, true), t));
  hablar('Terminaste. Acertaste ' + a + ' de ' + n + '.');
  avisarActividad({ tipo: 'juego:resultado', juego: 'BioCabeza', tema: estado.tema, aciertos: a, total: n });
}

// ---------- Cada cuadro: dónde está la cabeza, qué opción tiene encima ----------
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  pintarConfeti();
  if (estado.fase !== 'pregunta' && estado.fase !== 'revelando') return;
  const W = innerWidth, H = innerHeight;
  const cara = leerCara(ahora);
  const nubeAbajo = $('nube').getBoundingClientRect().bottom + 22;
  const altoOp = opcionesEl.offsetHeight || 100;

  if (!cara) {
    // Sin cámara o sin cara: las opciones quedan a media altura (se tocan).
    const y = Math.max(nubeAbajo, H * 0.42 - altoOp / 2);
    estado.topOpciones += (y - estado.topOpciones) * 0.15;
    opcionesEl.style.transform = 'translateY(' + estado.topOpciones + 'px)';
    columnaEl.style.opacity = 0;
    marcaEl.style.opacity = 0;
    if (estado.fase === 'pregunta') {
      soltar();
      if (ahora >= estado.bloqueadoHasta) opcionesEl.classList.remove('espera');
      if (camaraLista && landmarker) aviso('🙂 Pon tu cara frente a la cámara');
    }
    return;
  }
  // Suavizado para que las opciones no tiemblen.
  const s = estado.suave || { x: cara.nariz.x, y: cara.frente.y, alto: cara.alto };
  s.x += (cara.nariz.x - s.x) * 0.45;
  s.y += (cara.frente.y - s.y) * 0.35;
  s.alto += (cara.alto - s.alto) * 0.2;
  estado.suave = s;

  // Las opciones flotan justo sobre la cabeza (solo se mueven en vertical).
  const topDeseado = s.y - s.alto * 0.35 - altoOp;
  const top = Math.min(Math.max(topDeseado, nubeAbajo), H * 0.62 - altoOp);
  estado.topOpciones += (top - estado.topOpciones) * 0.25;
  opcionesEl.style.transform = 'translateY(' + estado.topOpciones + 'px)';

  // El sombrero ganado sigue a la cabeza.
  if (estado.puesto) {
    const pu = estado.puesto;
    pu.el.style.left = s.x - pu.w / 2 + 'px';
    pu.el.style.top = s.y - s.alto * 0.25 - pu.h * 0.35 - pu.h / 2 + 'px';
  }

  // Marca sobre la cabeza.
  marcaEl.style.opacity = estado.fase === 'pregunta' ? 1 : 0;
  marcaEl.style.transform = 'translate(' + s.x + 'px,' + Math.max(estado.topOpciones + altoOp + 40, s.y - s.alto * 0.12) + 'px)';
  if (estado.fase !== 'pregunta') return;

  // Columna bajo la cabeza (con ganancia e histéresis en los bordes).
  const xe = Math.min(W - 1, Math.max(0, W / 2 + (s.x - W / 2) * JUEGO.ganancia));
  let col = Math.floor(xe / (W / 3));
  if (estado.columna >= 0 && col !== estado.columna) {
    const borde = (col > estado.columna ? col : estado.columna) * (W / 3);
    if (Math.abs(xe - borde) < W * 0.035) col = estado.columna;
  }
  const botones = [...opcionesEl.children];
  if (col !== estado.columna) {
    estado.columna = col;
    estado.desde = ahora;
    estado.ancla = { x: cara.nariz.x, y: cara.nariz.y };
    botones.forEach((b, j) => { b.classList.toggle('activo', j === col); b.style.setProperty('--p', 0); });
    const r = botones[col] && botones[col].getBoundingClientRect();
    if (r) { columnaEl.style.left = r.left + 'px'; columnaEl.style.width = r.width + 'px'; }
    columnaEl.style.opacity = 1;
    SONIDO.tic();
  }
  // ¿Sigue quieto?
  const mov = Math.hypot(cara.nariz.x - estado.ancla.x, cara.nariz.y - estado.ancla.y);
  if (mov > W * JUEGO.toleranciaQuieto || ahora < estado.bloqueadoHasta) {
    estado.desde = ahora;
    estado.ancla = { x: cara.nariz.x, y: cara.nariz.y };
  }
  const avance = Math.min(1, (ahora - estado.desde) / (JUEGO.segundosQuieto * 1000));
  botones[col].style.setProperty('--p', avance);
  avanceEl.setAttribute('stroke-dasharray', (avance * 100).toFixed(1) + ' 100');
  const bloqueado = ahora < estado.bloqueadoHasta;
  if (!bloqueado && opcionesEl.classList.contains('espera')) { opcionesEl.classList.remove('espera'); SONIDO.tic(); }
  const opcion = estado.lista[estado.i].opciones[col];
  icono(bloqueado ? (estado.conVoz ? '🔊' : '📖') : opcion.emoji || '🎓');
  aviso(bloqueado ? (estado.conVoz ? '🔊 Escucha la pregunta…' : '📖 Lee la pregunta… ' + Math.ceil((estado.bloqueadoHasta - ahora) / 1000)) : avance > 0.05 ? '⏱️ ¡Quieto! Eligiendo «' + opcion.texto + '»…' : '↔️ Mueve la cabeza bajo tu respuesta y quédate quieto');
  if (avance >= 1) elegir(col);
}
function soltar() {
  if (estado.columna < 0) return;
  estado.columna = -1;
  [...opcionesEl.children].forEach((b) => { b.classList.remove('activo'); b.style.setProperty('--p', 0); });
  avanceEl.setAttribute('stroke-dasharray', '0 100');
}

// ---------- Inicio, final y salida ----------
const valor = (id) => $(id).dataset.valor;
async function empezar(mismas) {
  const ronda = ++estado.ronda;
  const boton = $('b-empezar');
  boton.disabled = true;
  boton.textContent = '⏳ Preparando…';
  tono([[1, 0, 0.01]]); // desbloquea el audio con el toque del estudiante
  estado.fase = 'cargando';
  const tema = $('tema').value.trim() || JUGAR.tema || '';
  // Si el tema es el de la actividad abierta, la IA recibe su texto.
  const contexto = ACTIVIDAD.contexto && tema === ACTIVIDAD.tema ? ACTIVIDAD.contexto : '';
  // En paralelo: cámara, detector y preguntas de la IA.
  const camara = camaraLista ? Promise.resolve() : abrirCamara();
  const detector = cargarDetector();
  const clave = claveDe(tema, valor('cantidad'), valor('nivel'));
  const preguntas = mismas ? Promise.resolve(mismas) : precarga && precarga.clave === clave ? precarga.promesa : pedirPreguntas(tema, valor('cantidad'), valor('nivel'), contexto);
  precarga = null; // "Nuevas preguntas" siempre pide otras
  const rCamara = await camara.then(() => null, (e) => e);
  const listo = () => { boton.disabled = false; boton.textContent = '▶ ¡A jugar!'; };
  if (ronda !== estado.ronda) return listo();
  $('inicio').hidden = true;
  $('final').hidden = true;
  estado.lista = [];
  estado.respuestas = [];
  estado.i = 0;
  estado.aciertos = estado.racha = estado.mejorRacha = 0;
  pintarHud();
  opcionesEl.textContent = '';
  $('nube').classList.remove('bien', 'mal');
  $('nube-tema').textContent = tema;
  $('retro').hidden = true;
  $('siguiente').hidden = true;
  const preg = $('pregunta');
  preg.textContent = '';
  preg.append(el('span', 'cargando', '🧬'), ' ', el('span', 'puntitos', mismas ? '¡Otra ronda!' : 'Preparando tus preguntas'));
  aviso('');
  const p = await preguntas;
  listo();
  if (ronda !== estado.ronda) return;
  estado.ultimas = p;
  estado.tema = p.tema || tema;
  $('nube-tema').textContent = estado.tema;
  if (p.error) console.warn('BioCabeza:', p.error);
  estado.lista = prepararLista(p.preguntas);
  if (rCamara) {
    aviso(rCamara.motivo || 'No se pudo abrir la cámara.');
    await new Promise((ok) => setTimeout(ok, 2500));
  } else {
    await detector.catch((e) => { console.warn('BioCabeza: detector', e); aviso('No se pudo cargar el detector de caras: toca tu respuesta.'); });
  }
  if (ronda !== estado.ronda) return;
  preg.textContent = '¡Prepárate! 🎩';
  pintarHud();
  await cuentaRegresiva(ronda);
  if (ronda !== estado.ronda) return;
  mostrarPregunta();
}
function salir() {
  estado.ronda += 1;
  clearTimeout(estado.temporizador);
  quitarSombreroPuesto();
  estado.fase = 'inicio';
  $('cuenta').textContent = '';
  if (window.speechSynthesis) speechSynthesis.cancel();
  cerrarCamara();
  $('final').hidden = true;
  $('inicio').hidden = false;
  actualizarEstadoIA();
}

// ======================= Dentro de una actividad (botón "Juego") =======================
// js/toolbar-tooltips.js abre este juego en un marco sobre la actividad y le
// manda el título y el texto de la página: las preguntas salen de ahí.
const EMBEBIDO = window.parent !== window;
const ACTIVIDAD = { tema: '', contexto: '', materia: null };
function avisarActividad(m) { if (EMBEBIDO) try { window.parent.postMessage(m, '*'); } catch (e) {} }
function volverActividad() { salir(); avisarActividad({ tipo: 'juego:cerrar' }); }
// Vuelve al menú de juegos (juegos.html), con el mismo tema.
function irAJuegos() {
  salir();
  avisarActividad({ tipo: 'juego:navegando', nombre: 'los juegos' });
  const t = $('tema').value.trim() || JUGAR.tema;
  location.href = 'juegos.html' + (t ? '?tema=' + encodeURIComponent(t) : '');
}
function recibirActividad(e) {
  if (!EMBEBIDO || e.source !== window.parent || !e.data || e.data.tipo !== 'juego:actividad') return;
  ACTIVIDAD.tema = R.texto(e.data.tema, 80);
  ACTIVIDAD.contexto = R.texto(e.data.contexto, 2500);
  // La materia la detecta la actividad (js/materia.js): el juego se adapta solo.
  if (e.data.materia && e.data.materia.nombre) ACTIVIDAD.materia = { id: R.texto(e.data.materia.id, 30), nombre: R.texto(e.data.materia.nombre, 40) };
  if (Array.isArray(e.data.juegos)) mostrarAtras(e.data.juegos.length > 1);
  if (!ACTIVIDAD.tema) return;
  ponerTema(ACTIVIDAD.tema);
  precargar();
}
// Dentro de una actividad, las preguntas de su tema se piden apenas se abre
// el juego (la IA puede tardar), mientras el estudiante lee el inicio.
let precarga = null; // { clave, promesa }
function claveDe(tema, cantidad, nivel) { return [tema, cantidad, nivel].join('|'); }
function precargar() {
  if (!modoIA || !ACTIVIDAD.tema || precarga || estado.fase !== 'inicio') return;
  precarga = { clave: claveDe(ACTIVIDAD.tema, valor('cantidad'), valor('nivel')), promesa: pedirPreguntas(ACTIVIDAD.tema, valor('cantidad'), valor('nivel'), ACTIVIDAD.contexto) };
}
// El tema NO se elige: es el de la actividad desde la que se abrió el juego
// (o el de la dirección, ?tema=, al abrirlo con el QR en el celular).
// "← Juegos" (volver al menú) solo tiene sentido con más de un juego activo
// (js/juegos/config.js o, dentro de una actividad, lo que ella indique).
function mostrarAtras(si) { $('b-juegos').hidden = !si; }
function ponerTema(t) {
  $('tema').value = t;
  $('actividad-titulo').textContent = '«' + t + '»';
  $('de-actividad').hidden = !t;
}

// ======================= Código QR para el celular =======================
// El QR lleva al juego con el tema elegido. Publicado (https), usa esta misma
// dirección; abierto en la computadora (archivo, localhost o red local), el
// celular no podría abrirla, así que usa la dirección pública (JUEGO.urlPublica).
function urlParaCelular() {
  const publicado = location.protocol === 'https:' && !/^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(location.hostname);
  const u = publicado ? new URL(location.href) : new URL('biocabeza.html', (C.libro && C.libro.urlPublica) || JUEGO.urlPublica);
  u.hash = '';
  u.searchParams.delete('embebido');
  const t = $('tema').value.trim();
  if (t) u.searchParams.set('tema', t); else u.searchParams.delete('tema');
  return u.href;
}
async function dibujarQR(url) {
  const caja = $('qr-codigo');
  try {
    if (!window.QRCode) await cargarScript(LIB_QR);
    caja.textContent = '';
    new window.QRCode(caja, { text: url, width: 220, height: 220, colorDark: '#1e3a8a', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
  } catch (e) {
    caja.textContent = 'No se pudo crear el código QR (sin internet).';
  }
}
function abrirQR() {
  $('qr').hidden = false;
  dibujarQR(urlParaCelular());
  $('b-cerrar-qr').focus();
}
function cerrarQR() { $('qr').hidden = true; $('b-qr').focus(); }

// ======================= Arranque =======================
const JUGAR = { tema: new URLSearchParams(location.search).get('tema') || '' };
// En pantalla no se menciona la IA; sin conexión solo se avisa en la consola (F12).
function actualizarEstadoIA() {
  if (!modoIA && !actualizarEstadoIA.avisado) {
    actualizarEstadoIA.avisado = true;
    console.warn('BioCabeza: sin IA, se juega con preguntas de ejemplo sobre la célula. Configura la clave en js/entrevista/config.local.js o el servidor en js/entrevista/config.js (ia.proxyUrl).');
  }
}
// Botones de 3/5/8/10 y de nivel: guardan el valor en data-valor.
function segmentos(id) {
  const g = $(id);
  const pintar = () => [...g.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === g.dataset.valor)));
  g.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { g.dataset.valor = b.dataset.v; pintar(); } });
  pintar();
}
// Quita la pantalla de carga de la página (#precarga) cuando el juego está listo.
function quitarPrecarga() {
  const p = $('precarga');
  if (!p) return;
  p.classList.add('fuera');
  setTimeout(() => p.remove(), 400);
}
function iniciar() {
  ajustarLienzo();
  addEventListener('resize', ajustarLienzo);
  ponerTema(JUGAR.tema ? R.texto(JUGAR.tema, 80) : '');
  const cfgJuegos = window.JUEGOS_CONFIG;
  if (cfgJuegos) mostrarAtras(['biocabeza', 'biosalto'].filter((k) => cfgJuegos[k] !== false).length > 1);
  segmentos('cantidad');
  segmentos('nivel');
  $('nivel').querySelectorAll('button').forEach((b) => { b.title = b.dataset.v[0].toUpperCase() + b.dataset.v.slice(1); b.setAttribute('aria-label', b.title); b.append(' ' + b.title); });
  // En la computadora se destaca el QR; en el celular, la cámara.
  const esCelular = window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
  if (esCelular) $('b-qr').hidden = true;
  // Dentro de una actividad: botones para volver a ella.
  if (EMBEBIDO) {
    $('b-volver').hidden = false;
    $('b-volver-final').hidden = false;
    $('b-volver').addEventListener('click', volverActividad);
    $('b-volver-final').addEventListener('click', volverActividad);
    addEventListener('message', recibirActividad);
    avisarActividad({ tipo: 'juego:listo' });
  }
  $('b-juegos').addEventListener('click', irAJuegos);
  quitarPrecarga();

  $('b-empezar').addEventListener('click', () => empezar());
  $('b-otra').addEventListener('click', () => empezar(estado.ultimas));
  $('b-nuevo').addEventListener('click', salir);
  $('b-salir').addEventListener('click', salir);
  $('siguiente').addEventListener('click', siguiente);
  $('b-qr').addEventListener('click', abrirQR);
  $('b-cerrar-qr').addEventListener('click', cerrarQR);
  $('qr').addEventListener('click', (e) => { if (e.target === $('qr')) cerrarQR(); });
  const bVoz = $('b-voz');
  const pintarVoz = () => { bVoz.textContent = vozActiva ? '🔊' : '🔈'; bVoz.setAttribute('aria-pressed', String(vozActiva)); };
  pintarVoz();
  bVoz.addEventListener('click', () => { vozActiva = !vozActiva; guardar('biocabeza.voz', vozActiva ? 'si' : 'no'); if (!vozActiva && window.speechSynthesis) speechSynthesis.cancel(); pintarVoz(); });
  // Teclado: 1, 2, 3 (o ← ↓ →) eligen; Enter pasa a la siguiente; Esc cierra
  // el QR, sale de la partida o (dentro de una actividad) vuelve a ella.
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('qr').hidden) return cerrarQR();
      if (estado.fase === 'inicio' || estado.fase === 'final') { if (EMBEBIDO) volverActividad(); return; }
      return salir();
    }
    if (estado.fase === 'pregunta') {
      const k = { 1: 0, 2: 1, 3: 2, ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2 }[e.key];
      if (k != null) { e.preventDefault(); elegir(k); }
    } else if (estado.fase === 'revelando' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); siguiente(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && window.speechSynthesis) speechSynthesis.cancel(); });
  aviso('');
  requestAnimationFrame(cuadro);
  prepararIA().then((m) => { modoIA = m; actualizarEstadoIA(); precargar(); });
  // Se adelanta la descarga del detector mientras el estudiante elige el tema.
  if (!(window.matchMedia('(pointer: coarse)').matches && navigator.connection && navigator.connection.saveData)) setTimeout(() => cargarDetector().catch(() => {}), 800);
}
iniciar();
})();
