/* =========================================================================
   BIOSALTO — la gallina saltarina (js/biosalto/biosalto.js)
   -------------------------------------------------------------------------
   Una gallina está en una montaña frente a un barranco. La IA hace una
   pregunta cuya respuesta es UNA palabra; el estudiante la DICE por el
   micrófono. Si es correcta, la gallina salta a la otra montaña; si no, cae
   al barranco (y vuelve a aparecer en su montaña para la siguiente).
   Voz → texto: dictado del navegador (Chrome, Edge, Safari); si no hay
   (Firefox, Brave, archivo local), graba y transcribe Gemini. Sin micrófono:
   se puede escribir la respuesta o abrir el juego en el celular (QR).
   IA: la misma conexión de la Entrevista (js/entrevista/config.js); clave
   local en js/biosalto/config.local.js (o la de la Entrevista); publicado,
   servidor intermedio → /api/biosalto/preguntas y /api/transcribir.
   ========================================================================= */
(function () {
'use strict';
const SCRIPT = document.currentScript ? document.currentScript.src : location.href;
const JUEGO = {
  esperaTrasLeer: 120, // ms entre que la voz termina de leer y el micrófono empieza a escuchar
  esperaSinVoz: 600, // sin voz: pausa antes de escuchar
  // El micrófono escucha SEGUIDO (no hay que tocar 🎤 ni repetir) hasta que
  // llega una respuesta o pasan maxEscuchaMs sin oír nada.
  maxEscuchaMs: 25000,
  silencioMs: 600, // grabación: tras hablar, este silencio termina la respuesta
  // Grabación: la voz se detecta comparando con el ruido del salón (se mide
  // solo), así basta con hablar normal: umbral = máx(umbralMinimo, ruido × factorRuido).
  umbralMinimo: 0.006,
  factorRuido: 2.6,
  maxFraseMs: 4000, // grabación: una respuesta no dura más que esto
  segundosRevelar: 4.5, // mínimo con la explicación en pantalla antes de la siguiente
  // Dirección pública del libro (GitHub Pages): el QR lleva aquí cuando el juego
  // se abre desde la computadora (archivo o localhost), que el celular no puede abrir.
  urlPublica: 'https://brayan240699194.github.io/ProfesorIAProlipa/',
};
const LIB_QR = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
const URL_GOOGLE = 'https://generativelanguage.googleapis.com/v1beta/models/';

// Preguntas de ejemplo (sin IA).
const EJEMPLO = {
  tema: 'Biología general',
  preguntas: [
    { pregunta: '¿Qué molécula guarda la información genética?', respuesta: 'ADN', aceptadas: [], pista: 'Tiene forma de doble hélice', emoji: '🧬', explicacion: 'El ADN contiene los genes con las instrucciones para formar al ser vivo.' },
    { pregunta: '¿Qué organelo produce la energía de la célula?', respuesta: 'mitocondria', aceptadas: ['mitocondrias'], pista: 'Es la central eléctrica celular', emoji: '⚡', explicacion: 'La mitocondria realiza la respiración celular y produce ATP.' },
    { pregunta: '¿Qué gas liberan las plantas durante la fotosíntesis?', respuesta: 'oxígeno', aceptadas: [], pista: 'Lo respiramos para vivir', emoji: '🌿', explicacion: 'Al hacer fotosíntesis, las plantas liberan oxígeno al aire.' },
    { pregunta: '¿Cuál es la unidad básica de la vida?', respuesta: 'célula', aceptadas: ['células'], pista: 'Todos los seres vivos la tienen', emoji: '🦠', explicacion: 'Todo ser vivo está formado por una o más células.' },
    { pregunta: '¿Qué órgano bombea la sangre por el cuerpo?', respuesta: 'corazón', aceptadas: [], pista: 'Late unas 70 veces por minuto', emoji: '🫀', explicacion: 'El corazón es un músculo que impulsa la sangre por los vasos.' },
    { pregunta: '¿Qué pigmento verde capta la luz en las plantas?', respuesta: 'clorofila', aceptadas: [], pista: 'Está dentro de los cloroplastos', emoji: '🍃', explicacion: 'La clorofila absorbe la luz para hacer la fotosíntesis.' },
    { pregunta: '¿Qué órgano controla el pensamiento y la memoria?', respuesta: 'cerebro', aceptadas: [], pista: 'Está protegido por el cráneo', emoji: '🧠', explicacion: 'El cerebro procesa la información y controla el cuerpo.' },
    { pregunta: '¿Qué microorganismo unicelular no tiene núcleo definido?', respuesta: 'bacteria', aceptadas: ['bacterias'], pista: 'Algunas causan infecciones', emoji: '🦠', explicacion: 'Las bacterias son procariotas: su ADN está libre en el citoplasma.' },
    { pregunta: '¿Qué líquido rojo transporta el oxígeno en el cuerpo?', respuesta: 'sangre', aceptadas: [], pista: 'Circula por venas y arterias', emoji: '🩸', explicacion: 'La sangre lleva el oxígeno de los pulmones a todo el cuerpo.' },
    { pregunta: '¿Qué órgano digiere los alimentos con jugos ácidos?', respuesta: 'estómago', aceptadas: [], pista: 'Está entre el esófago y el intestino', emoji: '🍽️', explicacion: 'El estómago mezcla los alimentos con ácido y enzimas.' },
  ],
};

const $ = (id) => document.getElementById(id);
const R = window.BioSaltoReglas;
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
const limitar = (v, min, max) => Math.min(max, Math.max(min, v));
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

// ======================= IA (misma conexión que la Entrevista) =======================
const carpetaPropia = new URL('./', SCRIPT).href;
const carpetaEntrevista = new URL('../entrevista/', SCRIPT).href;
const enLocal = location.protocol === 'file:' || /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(location.hostname) || /\.devtunnels\.ms$/.test(location.hostname);
const C = window.ENTREVISTA_CONFIG || { ia: {} };
C.ia = C.ia || {};
let modoIA = ''; // 'servidor' | 'directo' | ''

// Clave de pruebas: primero js/biosalto/config.local.js; si no, la de la
// Entrevista. Solo en tu computadora o por el túnel de VS Code.
async function prepararIA() {
  if (enLocal && C.ia.activa !== false) {
    if (!window.BIOSALTO_SECRETOS) await cargarScript(carpetaPropia + 'config.local.js?t=' + Date.now()).catch(() => {});
    if (!window.BIOSALTO_SECRETOS && !window.ENTREVISTA_SECRETOS) await cargarScript(carpetaEntrevista + 'config.local.js?t=' + Date.now()).catch(() => {});
  }
  const S = enLocal && (window.BIOSALTO_SECRETOS || window.ENTREVISTA_SECRETOS);
  if (S && S.ia) {
    if (S.ia.apiKey && S.ia.proxyUrl == null) C.ia.proxyUrl = '';
    for (const k in S.ia) if (S.ia[k] !== '' && S.ia[k] != null) C.ia[k] = S.ia[k];
  }
  if (C.ia.activa === false) return '';
  return C.ia.proxyUrl ? 'servidor' : C.ia.apiKey ? 'directo' : '';
}
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
const base = () => String(C.ia.proxyUrl).replace(/\/+$/, '').replace(/\/api$/, '');
const textoDe = (j) => ((j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map((x) => (x.thought ? '' : x.text || '')).join('').trim();
// Llamada directa a Gemini (pruebas: la clave queda en el navegador). Si el
// modelo no acepta la opción de pensamiento (400), se repite sin ella.
function gemini(cuerpo, ms) {
  const pedir = (conPensamiento) => {
    const c = JSON.parse(JSON.stringify(cuerpo));
    c.generationConfig = c.generationConfig || {};
    if (conPensamiento) c.generationConfig.thinkingConfig = pensamiento(C.ia.modelo);
    return fetch(URL_GOOGLE + encodeURIComponent(C.ia.modelo || 'gemini-3.5-flash-lite') + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': C.ia.apiKey },
      body: JSON.stringify(c),
      signal: conTiempo(ms),
    }).then(comprobar);
  };
  return pedir(true).catch((e) => { if (e.status === 400 && !/API[_ ]?key/i.test(e.detalle || '')) return pedir(false); throw e; });
}
// A veces Gemini se demora ~20 s en una petición y la siguiente sale en 2-3 s:
// si a los "ms" no hay respuesta (o la primera falla), se lanza un segundo
// intento en paralelo y gana el primero que traiga preguntas válidas.
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
// → { tema, preguntas, origen: 'ia' | 'ejemplo' }
async function pedirPreguntas(tema, cantidad, nivel, contexto) {
  const libro = C.libro || {};
  // Materia: la de la actividad (detectada) o la de config.js; si no, la deduce la IA del tema.
  const materia = (ACTIVIDAD.materia && ACTIVIDAD.materia.nombre) || libro.nombre || ((window.ProlipaMateria && window.ProlipaMateria.detectar(tema + ' ' + (contexto || ''))) || {}).nombre || '';
  const d = R.datos({ tema, cantidad, nivel, contexto, libro: materia, publico: libro.publico });
  const ejemplo = () => ({ tema: EJEMPLO.tema, preguntas: mezclar(EJEMPLO.preguntas).slice(0, d.cantidad), origen: 'ejemplo' });
  if (!modoIA || R.tieneDatosPersonales(d.tema)) return ejemplo();
  const intento = async () => {
    if (modoIA === 'servidor') {
      return R.normalizarRespuesta(await fetch(base() + '/api/biosalto/preguntas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), signal: conTiempo(25000) }).then(comprobar), d.cantidad);
    }
    const j = await gemini({ systemInstruction: { parts: [{ text: R.sistema(d) }] }, contents: [{ role: 'user', parts: [{ text: R.usuario(d) }] }], generationConfig: { maxOutputTokens: 2500, temperature: 0.8, responseMimeType: 'application/json' } }, 20000);
    return R.normalizarRespuesta(textoDe(j), d.cantidad);
  };
  try {
    const r = await carrera(intento, 6000);
    return { tema: r.tema || d.tema, preguntas: r.preguntas, origen: 'ia' };
  } catch (e) {
    console.warn('BioSalto: sin preguntas de la IA, se usan las de ejemplo.', e);
    return ejemplo();
  }
}
// Audio WAV (base64) → texto, con Gemini (cuando el navegador no tiene dictado).
// "esperada": la respuesta de la pregunta. Gemini la escribe bien escrita si
// lo que oye SUENA como ella; si se dijo otra cosa, escribe lo que se dijo.
// La primera petición a Gemini a veces tarda ~5 s y la siguiente ~1 s: si a
// los 2,5 s no responde, se lanza otra en paralelo y gana la primera que traiga texto.
function transcribir(audio, esperada) {
  return carrera(() => transcribirUna(audio, esperada), 2500).catch(() => '');
}
async function transcribirUna(audio, esperada) {
  if (modoIA === 'servidor') {
    const j = await fetch(base() + '/api/transcribir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audio, pista: esperada || '' }), signal: conTiempo(15000) }).then(comprobar);
    return R.texto(j.texto, 120);
  }
  if (modoIA === 'directo') {
    const instruccion = R.TRANSCRIBIR + (esperada ? ' Si lo que dice suena como «' + esperada + '», escríbelo así, bien escrito; si dice otra palabra, escribe la que dijo.' : '');
    const j = await gemini({ contents: [{ role: 'user', parts: [{ text: instruccion }, { inlineData: { mimeType: 'audio/wav', data: audio } }] }], generationConfig: { temperature: 0, maxOutputTokens: 60 } }, 8000);
    return R.texto(textoDe(j).replace(/^["“«]|["”»]$/g, ''), 120);
  }
  return '';
}

// ======================= Voz y sonidos =======================
let vozActiva = leer('biosalto.voz') !== 'no';
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
function callar() { if (window.speechSynthesis) speechSynthesis.cancel(); }
let audioCtx = null;
function tono(notas) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audioCtx.currentTime;
    notas.forEach(([f, ini, dur, tipo, f2]) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = tipo || 'triangle';
      o.frequency.setValueAtTime(f, t0 + ini);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + ini + dur);
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
  salto: () => tono([[300, 0, 0.35, 'sine', 900]]),
  aterriza: () => tono([[523, 0, 0.12], [659, 0.1, 0.12], [784, 0.2, 0.12], [1047, 0.3, 0.25]]),
  cae: () => tono([[700, 0, 0.9, 'sawtooth', 120]]),
  plop: () => tono([[180, 0, 0.25, 'sine', 60]]),
  tic: () => tono([[880, 0, 0.06, 'sine']]),
};

// ======================= Confeti y plumas =======================
const lienzo = $('confeti');
const ctx = lienzo.getContext('2d');
let particulas = [];
function ajustarLienzo() {
  const r = window.devicePixelRatio || 1;
  lienzo.width = innerWidth * r;
  lienzo.height = innerHeight * r;
  ctx.setTransform(r, 0, 0, r, 0, 0);
}
function confeti(x, y, n, colores, opciones) {
  const o = opciones || {};
  n = MOVIMIENTO ? n : Math.min(n, 15);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = (o.v || 5) + Math.random() * (o.v || 5) * 1.4;
    particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.subida || 4), g: o.g || 0.28, r: (o.r || 5) + Math.random() * 4, giro: Math.random() * 6, vg: (Math.random() - 0.5) * 0.4, color: colores[i % colores.length], vida: 1, pluma: !!o.pluma });
  }
}
const FIESTA = ['#1e3a8a', '#2563eb', '#3b82f6', '#38bdf8', '#7dd3fc', '#ffffff', '#facc15'];
function pintarConfeti() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  particulas = particulas.filter((p) => p.vida > 0 && p.y < innerHeight + 30);
  for (const p of particulas) {
    p.vy += p.g; p.vx *= p.pluma ? 0.95 : 0.985; p.x += p.vx + (p.pluma ? Math.sin(p.giro * 2) * 0.8 : 0); p.y += p.pluma ? Math.min(p.vy, 2.2) : p.vy; p.giro += p.vg; p.vida -= 0.008;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.vida * 1.5));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.giro);
    ctx.fillStyle = p.color;
    if (p.pluma) { ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.2, p.r * 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
    ctx.restore();
  }
}

// ======================= Escena: montañas, barranco y gallina =======================
const escenario = $('escenario');
const pista = $('pista');
const gallinaEl = $('gallina');
const ondasEl = $('ondas');
const burbujaEl = $('burbuja');
const esc = { montes: [], k: 0, ancho: 0, hueco: 0, g: 96, pan: 0 };

function medidas() {
  const W = innerWidth, H = innerHeight;
  esc.ancho = limitar(W * 0.3, 130, 340);
  esc.hueco = limitar(W * 0.24, 100, 280);
  esc.g = limitar(Math.min(W, H) * 0.14, 64, 120);
  escenario.style.setProperty('--g', esc.g + 'px');
}
const xMonte = (i) => i * (esc.ancho + esc.hueco);
// Altura de la cima: entre la nube de la pregunta y el panel del micrófono.
function cimaMonte(m) {
  const H = innerHeight;
  const nubeAbajo = $('nube').getBoundingClientRect().bottom;
  const panelArriba = $('panel-voz').getBoundingClientRect().top;
  const min = nubeAbajo + esc.g + 40, max = Math.max(min, panelArriba - 70);
  return limitar(H * (1 - m.frac), min, max);
}
function svgMonte(semilla) {
  const r = (n) => (Math.sin(semilla * 97 + n * 13) + 1) / 2; // pseudoaleatorio estable por montaña
  const izq = [8, 4 + r(1) * 6, 10 + r(2) * 4, 2 + r(3) * 6, 0];
  const der = [92, 96 - r(4) * 6, 90 - r(5) * 4, 98 - r(6) * 6, 100];
  return '<svg viewBox="0 0 100 200" preserveAspectRatio="none" aria-hidden="true">' +
    '<path d="M' + izq[0] + ' 12 L' + izq[1] + ' 50 L' + izq[2] + ' 95 L' + izq[3] + ' 145 L' + izq[4] + ' 200 L100 200 L' + der[3] + ' 145 L' + der[2] + ' 95 L' + der[1] + ' 50 L' + der[0] + ' 12 Z" class="r"/>' +
    '<path d="M' + izq[0] + ' 12 L' + izq[1] + ' 50 L' + izq[2] + ' 95 L' + izq[3] + ' 145 L' + izq[4] + ' 200 L38 200 L34 140 L40 80 L30 12 Z" class="rl"/>' +
    '<path d="M60 40 L70 60 L64 62 Z M22 110 L32 128 L26 130 Z M72 150 L82 170 L76 172 Z" class="rs" opacity=".7"/>' +
    '<path d="M2 16 Q50 2 98 16 L96 30 Q80 22 66 30 Q50 22 36 30 Q20 22 4 30 Z" class="p"/>' +
    '<path d="M2 16 Q50 2 98 16 L98 20 Q50 8 2 20 Z" class="pl"/>' +
    '</svg>';
}
// Paisajes: cambian con cada salto para que el recorrido no aburra. Cada
// montaña ya nace con el adorno del paisaje que tendrá al llegar a ella.
const PAISAJES = [
  { id: 'dia', nombre: '☀️ Montañas azules', decor: ['🌳', '🌲', '🌼'] },
  { id: 'atardecer', nombre: '🌅 Cañón al atardecer', decor: ['🌵', '🪨', '🌵'] },
  { id: 'nevado', nombre: '❄️ Cumbres nevadas', decor: ['🌲', '⛄', '🌲'] },
  { id: 'selva', nombre: '🌴 Selva tropical', decor: ['🌴', '🌺', '🦜'] },
  { id: 'noche', nombre: '🌙 Noche estrellada', decor: ['🍄', '🌲', '🦉'] },
];
const paisajeDe = (i) => PAISAJES[i % PAISAJES.length];
function ponerPaisaje(i, anunciar) {
  const p = paisajeDe(i);
  if (escenario.dataset.paisaje === p.id) return;
  escenario.dataset.paisaje = p.id;
  // Los adornos de todas las montañas toman el paisaje actual.
  esc.montes.forEach((m, j) => { const d = m && m.el.querySelector('.decor'); if (d) d.textContent = p.decor[j % 3]; });
  if (!anunciar) return;
  const c = el('div', 'cartel', p.nombre);
  c.setAttribute('aria-hidden', 'true');
  escenario.append(c);
  setTimeout(() => c.remove(), 2700);
}
function crearMonte(i) {
  const m = { el: el('div', 'monte'), frac: 0.36 + ((Math.sin(i * 2.7) + 1) / 2) * 0.16 };
  m.el.innerHTML = svgMonte(i + 1);
  if (i > 0) m.el.append(el('span', 'decor', paisajeDe(esc.k).decor[i % 3]));
  pista.append(m.el);
  esc.montes[i] = m;
  colocarMonte(i);
  return m;
}
function colocarMonte(i) {
  const m = esc.montes[i];
  if (!m) return;
  const cima = cimaMonte(m);
  m.cima = cima;
  Object.assign(m.el.style, { left: xMonte(i) + 'px', width: esc.ancho + 'px', height: innerHeight - cima + 'px' });
}
function asegurarMontes(hasta) { for (let i = 0; i <= hasta; i++) if (!esc.montes[i]) crearMonte(i); }
// Punto donde se para la gallina en la montaña i (coordenadas de la pista).
function puntoMonte(i) { asegurarMontes(i); const m = esc.montes[i]; return { x: xMonte(i) + esc.ancho * 0.45, y: m.cima + 8 }; }
// Centra la montaña actual y la siguiente en la pantalla.
function panear(animado) {
  esc.pan = (innerWidth - (2 * esc.ancho + esc.hueco)) / 2 - xMonte(esc.k);
  pista.style.transition = animado ? '' : 'none';
  pista.style.transform = 'translateX(' + esc.pan + 'px)';
  if (!animado) { void pista.offsetWidth; pista.style.transition = ''; }
}
function ponerGallina(p) {
  gallinaEl.style.left = p.x + 'px';
  gallinaEl.style.top = p.y + 'px';
  ondasEl.style.left = p.x + 'px';
  ondasEl.style.top = p.y - esc.g * 0.45 + 'px';
  burbujaEl.style.left = p.x + 'px';
  burbujaEl.style.top = p.y - esc.g - 12 + 'px';
}
function reacomodar() {
  medidas();
  esc.montes.forEach((m, i) => colocarMonte(i));
  ponerGallina(puntoMonte(esc.k));
  panear(false);
  ajustarLienzo();
}
function reiniciarEscena() {
  esc.montes.forEach((m) => m && m.el.remove());
  esc.montes = [];
  esc.k = 0;
  ponerPaisaje(0, false);
  asegurarMontes(1);
  ponerGallina(puntoMonte(0));
  panear(false);
  gallinaEl.className = '';
}
function burbuja(texto, clase) {
  if (!texto) { burbujaEl.hidden = true; return; }
  burbujaEl.textContent = texto;
  burbujaEl.className = clase || '';
  burbujaEl.hidden = false;
}
// Trayectoria en arco de "a" a "b"; "alto" es la altura extra del salto.
function arco(a, b, alto, pasos, extra) {
  const k = [];
  for (let s = 0; s <= pasos; s++) {
    const t = s / pasos;
    const x = (b.x - a.x) * t, y = (b.y - a.y) * t - alto * 4 * t * (1 - t);
    k.push({ transform: 'translate(' + x + 'px,' + y + 'px)' + (extra ? extra(t) : '') });
  }
  return k;
}
// La gallina salta a la montaña siguiente. "fuerza" (0-1, lo fuerte que habló) solo sube el arco:
// para acertar basta con hablar normal y claro.
function saltar(fuerza) {
  return new Promise((ok) => {
    const a = puntoMonte(esc.k), b = puntoMonte(esc.k + 1);
    asegurarMontes(esc.k + 2);
    burbuja('');
    gallinaEl.className = 'vuela';
    SONIDO.salto();
    const alto = 110 + limitar(fuerza, 0, 1) * 90;
    const fin = () => {
      gallinaEl.getAnimations().forEach((x) => x.cancel());
      gallinaEl.className = '';
      esc.k += 1;
      ponerPaisaje(esc.k, true); // ¡nuevo paisaje!
      ponerGallina(b);
      SONIDO.aterriza();
      const sx = b.x + esc.pan, sy = b.y;
      confeti(sx, sy, 26, ['#a16207', '#d6d3d1', '#86efac'], { v: 2.5, subida: 2, r: 3 }); // polvo al aterrizar
      confeti(sx, sy - esc.g, 70, FIESTA, { v: 5, subida: 5 });
      panear(true);
      setTimeout(ok, 500);
    };
    if (!MOVIMIENTO) return fin();
    gallinaEl.animate(arco(a, b, alto, 16, (t) => ' rotate(' + Math.sin(t * Math.PI) * -12 + 'deg)'), { duration: 950, easing: 'linear', fill: 'forwards' }).onfinish = fin;
  });
}
// La gallina cae al barranco y vuelve a aparecer en su montaña.
function caer() {
  return new Promise((ok) => {
    const a = puntoMonte(esc.k);
    const borde = { x: a.x + esc.ancho * 0.55 + esc.hueco * 0.45, y: innerHeight + esc.g * 1.5 };
    burbuja('');
    gallinaEl.className = 'cae';
    SONIDO.cae();
    const reaparecer = () => {
      gallinaEl.getAnimations().forEach((x) => x.cancel());
      ponerGallina(a);
      gallinaEl.className = '';
      void gallinaEl.offsetWidth;
      gallinaEl.className = 'aparece';
      setTimeout(() => { gallinaEl.className = ''; ok(); }, 800);
    };
    if (!MOVIMIENTO) return reaparecer();
    // Plumas al resbalar y "¡Plop!" al llegar al fondo.
    setTimeout(() => confeti(a.x + esc.pan + esc.ancho * 0.4, a.y - esc.g * 0.5, 22, ['#ffffff', '#f1f5f9', '#e2e8f0'], { v: 2, subida: 3, g: 0.06, r: 6, pluma: true }), 250);
    const caida = gallinaEl.animate([
      { transform: 'translate(0,0) rotate(0)' },
      { transform: 'translate(' + (borde.x - a.x) * 0.35 + 'px,-60px) rotate(-15deg)', offset: 0.22 },
      { transform: 'translate(' + (borde.x - a.x) * 0.7 + 'px,' + (borde.y - a.y) * 0.45 + 'px) rotate(200deg)', offset: 0.6 },
      { transform: 'translate(' + (borde.x - a.x) + 'px,' + (borde.y - a.y) + 'px) rotate(540deg)' },
    ], { duration: 1300, easing: 'ease-in', fill: 'forwards' });
    caida.onfinish = () => {
      SONIDO.plop();
      const p = el('div', 'plop', '¡Plop!');
      p.style.left = borde.x + 'px';
      p.style.top = innerHeight * 0.86 + 'px';
      pista.append(p);
      setTimeout(() => p.remove(), 1000);
      confeti(borde.x + esc.pan, innerHeight * 0.9, 30, ['#bae6fd', '#7dd3fc', '#ffffff'], { v: 3, subida: 6, r: 4 }); // salpicadura
      setTimeout(reaparecer, 700);
    };
  });
}

// ======================= Micrófono =======================
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const mic = { stream: null, ctx: null, fuente: null, analizador: null, datos: null, nivel: 0, pico: 0, motor: '', escuchando: false, detener: null, reabrir: null };
// Abre el micrófono (para medir el volumen y, si hace falta, grabar).
async function abrirMicrofono() {
  if (mic.stream) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw Object.assign(new Error('sin micrófono'), { motivo: window.isSecureContext ? 'sin-mic' : 'inseguro' });
  }
  try {
    mic.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    throw Object.assign(e, { motivo: e.name === 'NotAllowedError' ? 'permiso' : e.name === 'NotFoundError' || e.name === 'OverconstrainedError' ? 'sin-mic' : e.name === 'NotReadableError' ? 'ocupado' : 'sin-mic' });
  }
  mic.ctx = new (window.AudioContext || window.webkitAudioContext)();
  mic.fuente = mic.ctx.createMediaStreamSource(mic.stream);
  mic.analizador = mic.ctx.createAnalyser();
  mic.analizador.fftSize = 1024;
  mic.fuente.connect(mic.analizador);
  mic.datos = new Float32Array(mic.analizador.fftSize);
}
function cerrarMicrofono() {
  if (mic.detener) mic.detener(true);
  if (mic.stream) mic.stream.getTracks().forEach((t) => t.stop());
  if (mic.ctx) mic.ctx.close().catch(() => {});
  Object.assign(mic, { stream: null, ctx: null, fuente: null, analizador: null, datos: null, escuchando: false });
}
// Volumen actual 0-1.
function medirNivel() {
  if (!mic.analizador) return 0;
  mic.analizador.getFloatTimeDomainData(mic.datos);
  let s = 0;
  for (let i = 0; i < mic.datos.length; i++) s += mic.datos[i] * mic.datos[i];
  return Math.min(1, Math.sqrt(s / mic.datos.length) * 12);
}
// Muletillas: si lo dicho es solo esto ("eh", "este", "creo que"), se ignora
// y se sigue escuchando (no cuenta como respuesta equivocada).
const RELLENO = new Set('a ah ahh am eh ehh em emm mm mmm este esta es la el lo los las un una uno pues bueno ok okay ya ver creo que se no si o y de del mi me'.split(' '));
function soloRelleno(t) { return !R.normalizar(t).split(' ').some((w) => w.length > 1 && !RELLENO.has(w)); }

// Dictado del navegador, CONTINUO: escucha seguido, acepta apenas lo dicho
// (aún parcial) coincide con la respuesta y, si no, toma la primera frase
// completa que no sea solo muletillas. Si el navegador corta la sesión, se
// vuelve a abrir sola. → { textos, error }
function escucharDictado(p) {
  return new Promise((ok) => {
    let rec = null, listo = false, ultimoError = '', sinFrases = false, ignorar = false;
    const t0 = performance.now();
    const fin = (r) => {
      if (listo) return;
      listo = true;
      mic.detener = null;
      clearTimeout(reloj);
      try { if (rec) rec.abort(); } catch (e) {}
      ok(r);
    };
    const abrir = () => {
      if (listo) return;
      try { rec = new SR(); } catch (e) { return fin({ textos: [], error: 'no-disponible' }); }
      rec.lang = (C.microfono && C.microfono.idioma) || 'es-EC';
      rec.interimResults = true;
      rec.maxAlternatives = 5;
      rec.continuous = true;
      // Le decimos al dictado qué palabras esperar (Chrome reciente): así
      // reconoce mejor "mitocondria" o "clorofila" a la primera.
      if (!sinFrases && 'phrases' in rec && window.SpeechRecognitionPhrase) {
        try { rec.phrases = [p.respuesta].concat(p.aceptadas || []).map((x) => new window.SpeechRecognitionPhrase(x, 5)); } catch (e) {}
      }
      ignorar = false;
      rec.onresult = (e) => {
        if (ignorar) return;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i], alternativas = [];
          for (let j = 0; j < res.length; j++) alternativas.push(res[j].transcript);
          if (esEco(alternativas[0], p)) continue; // es la voz del juego, no el estudiante
          // Mientras la voz lee, se quitan las palabras de la pregunta (el micrófono
          // también la oye): así cuenta "creo que es la mitocondria" dicho encima.
          const candidatos = estado.leyendo ? alternativas.map((t) => sinPregunta(t, p)) : alternativas;
          if (!estado.leyendo || candidatos[0]) oido(estado.leyendo ? candidatos[0] : alternativas[0]);
          if (coincide(candidatos, p)) return fin({ textos: alternativas, error: '' }); // ¡correcta, al instante!
          if (!res.isFinal || estado.leyendo || soloRelleno(alternativas[0])) continue;
          // Si el dictado no está seguro de lo que oyó, no cuenta como error: sigue escuchando.
          const seguridad = res[0].confidence;
          if (seguridad > 0 && seguridad < 0.45) { estadoVoz('🤔 ¿«' + R.texto(alternativas[0], 30) + '»? No te entendí bien, dilo otra vez'); continue; }
          return fin({ textos: alternativas, error: '' });
        }
      };
      rec.onerror = (e) => { ultimoError = e.error || 'error'; if (ultimoError === 'phrases-not-supported') sinFrases = true; };
      rec.onend = () => {
        if (listo) return;
        if (ultimoError === 'phrases-not-supported') { ultimoError = ''; return abrir(); }
        // Sin permiso o sin servicio: no tiene sentido reabrir.
        if (['not-allowed', 'service-not-allowed', 'network', 'language-not-supported', 'audio-capture'].includes(ultimoError)) return fin({ textos: [], error: ultimoError });
        if (performance.now() - t0 > JUEGO.maxEscuchaMs) return fin({ textos: [], error: 'no-speech' });
        ultimoError = '';
        abrir(); // Chrome corta tras un silencio: se reabre y sigue escuchando
      };
      try { rec.start(); } catch (e) { fin({ textos: [], error: 'no-disponible' }); }
    };
    // Tocar 🎤 otra vez: con "cancelar" se descarta; si no, se evalúa lo dicho.
    mic.detener = (cancelar) => { if (cancelar) fin({ textos: [], error: 'cancelado' }); else try { rec.stop(); } catch (e) {} };
    // Cuando la voz del juego termina de leer, se empieza una escucha limpia:
    // así lo que el micrófono captó de la lectura no se toma como respuesta.
    mic.reabrir = () => { if (listo || !rec) return; ignorar = true; try { rec.abort(); } catch (e) {} };
    const reloj = setTimeout(() => fin({ textos: [], error: 'no-speech' }), JUEGO.maxEscuchaMs + 1000);
    abrir();
  });
}
// Grabación (cuando el navegador no tiene dictado): detecta la voz comparando
// con el ruido del lugar, corta al callarse 0,6 s y lo transcribe Gemini. Si
// lo dicho es solo ruido o muletillas, sigue escuchando sin que haya que tocar nada.
function escucharGrabando(p) {
  return new Promise((ok) => {
    if (!mic.ctx || !mic.fuente) return ok({ textos: [], error: 'audio-capture' });
    const proc = mic.ctx.createScriptProcessor(2048, 1, 1);
    let trozos = [], previos = [], hablo = false, ultimoSonido = 0, inicioVoz = 0, listo = false, ocupado = false;
    let ruido = 0.003, seguidos = 0;
    const t0 = performance.now();
    const soltar = () => { try { mic.fuente.disconnect(proc); proc.disconnect(); } catch (e) {} };
    const fin = (r) => {
      if (listo) return;
      listo = true;
      mic.detener = null;
      soltar();
      ok(r);
    };
    // Una frase terminó: se transcribe mientras se sigue escuchando.
    const frase = () => {
      const audio = previos.concat(trozos);
      trozos = []; previos = []; hablo = false; seguidos = 0;
      ocupado = true;
      estadoVoz('🤔 Entendiendo…');
      transcribir(aWav(audio, mic.ctx.sampleRate), p.respuesta).then((t) => {
        ocupado = false;
        if (listo) return;
        if (t) oido(t);
        if (t && (coincide([t], p) || !soloRelleno(t))) return fin({ textos: [t], error: '' });
        estadoVoz('🎤 Te escucho… di tu respuesta');
      }).catch((e) => {
        ocupado = false;
        console.warn('BioSalto: transcripción', e);
        if (!listo) estadoVoz('🎤 Te escucho… di tu respuesta');
      });
    };
    proc.onaudioprocess = (e) => {
      if (listo) return;
      const d = new Float32Array(e.inputBuffer.getChannelData(0));
      let s = 0;
      for (let i = 0; i < d.length; i++) s += d[i] * d[i];
      const rms = Math.sqrt(s / d.length), ahora = performance.now();
      const umbral = Math.max(JUEGO.umbralMinimo, ruido * JUEGO.factorRuido);
      if (!hablo) {
        // Ruido de fondo: promedio lento de lo que se oye cuando nadie habla.
        if (rms < umbral) ruido = ruido * 0.95 + rms * 0.05;
        seguidos = rms > umbral ? seguidos + 1 : 0;
        previos.push(d); if (previos.length > 6) previos.shift(); // un poco antes de la voz
        if (seguidos >= 2 && !ocupado) { hablo = true; inicioVoz = ultimoSonido = ahora; }
      } else {
        trozos.push(d);
        if (rms > umbral * 0.8) ultimoSonido = ahora;
        if (ahora - ultimoSonido > JUEGO.silencioMs || ahora - inicioVoz > JUEGO.maxFraseMs) frase();
      }
      if (!hablo && !ocupado && ahora - t0 > JUEGO.maxEscuchaMs) fin({ textos: [], error: 'no-speech' });
    };
    mic.fuente.connect(proc);
    proc.connect(mic.ctx.destination); // sin esto Chrome no procesa (la salida es silencio)
    mic.detener = (cancelar) => { if (cancelar) return fin({ textos: [], error: 'cancelado' }); if (hablo) frase(); };
  });
}
// Trozos Float32 → WAV mono 16 kHz en base64.
function aWav(trozos, tasa) {
  const total = trozos.reduce((n, t) => n + t.length, 0);
  const todo = new Float32Array(total);
  let o = 0;
  trozos.forEach((t) => { todo.set(t, o); o += t.length; });
  const paso = tasa / 16000, n = Math.floor(total / paso);
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const txt = (p, s) => { for (let i = 0; i < s.length; i++) v.setUint8(p + i, s.charCodeAt(i)); };
  txt(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); txt(8, 'WAVE'); txt(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true);
  v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); txt(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * paso), b = Math.min(total, Math.floor((i + 1) * paso));
    let s = 0;
    for (let j = a; j < b; j++) s += todo[j];
    const x = limitar(s / Math.max(1, b - a), -1, 1);
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// ¿Lo dicho contiene la respuesta (o una aceptada)? Tolera tildes, plurales y
// pequeños errores del dictado ("mitocondría", "cloroplastos").
function distancia(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// Cómo SUENA en español: b=v, c/s/z, ll=y, g/j delante de e/i, h muda,
// qu=k, letras dobles… El dictado confunde mucho esas letras ("bacteria" →
// "vacteria", "célula" → "selula"): comparando sonidos no cuenta como error.
function fonetica(w) {
  return String(w || '')
    .replace(/ch/g, '1').replace(/h/g, '').replace(/1/g, 'ch')
    .replace(/qu/g, 'k').replace(/gu(?=[ei])/g, 'g').replace(/g(?=[ei])/g, 'j')
    .replace(/c(?=[ei])/g, 's').replace(/c/g, 'k').replace(/z/g, 's').replace(/x/g, 'ks')
    .replace(/v/g, 'b').replace(/w/g, 'b').replace(/ll/g, 'y').replace(/y$/g, 'i')
    .replace(/(.)\1+/g, '$1');
}
// Errores tolerados según el largo de la palabra (en sonidos).
const tolerancia = (n) => (n >= 10 ? 3 : n >= 7 ? 2 : n >= 4 ? 1 : 0);
function coincide(textos, p) {
  const objetivos = [p.respuesta].concat(p.aceptadas || []).map((o) => fonetica(R.normalizar(o).replace(/ /g, ''))).filter(Boolean);
  return textos.some((t) => {
    const n = R.normalizar(t);
    if (!n) return false;
    const palabras = n.split(' ').map(fonetica);
    // También palabras que el dictado separó ("mito condria") o juntó.
    const juntas = palabras.slice(1).map((w, i) => palabras[i] + w);
    const todo = palabras.join('');
    return objetivos.some((o) => todo === o || (o.length >= 3 && todo.includes(o)) ||
      palabras.concat(juntas).some((w) => w === o || (w.length >= 3 && distancia(w, o) <= tolerancia(o.length))));
  });
}
// Lo oído sin las palabras de la pregunta.
function sinPregunta(texto, p) {
  const pregunta = new Set(R.normalizar(p.pregunta).split(' '));
  return R.normalizar(texto).split(' ').filter((w) => w && !pregunta.has(w)).join(' ');
}
// ¿Lo que se oyó es la voz del juego leyendo la pregunta (eco por los parlantes)?
function esEco(texto, p) {
  const oidas = R.normalizar(texto).split(' ').filter((w) => w.length > 2);
  if (oidas.length < 2) return false;
  const pregunta = new Set(R.normalizar(p.pregunta).split(' '));
  return oidas.filter((w) => pregunta.has(w)).length / oidas.length >= 0.6;
}

// ======================= El juego =======================
const estado = {
  fase: 'inicio', // inicio | cargando | cuenta | pregunta | revelando | final
  ronda: 0,
  tema: '',
  lista: [],
  i: 0,
  aciertos: 0,
  racha: 0,
  mejorRacha: 0,
  respuestas: [],
  desde: 0, // cuándo se pudo empezar a responder
  temporizador: 0,
  ultimas: null,
  sinMic: false,
  leyendo: false, // la voz está leyendo la pregunta
};
function estadoVoz(t) { $('estado-voz').textContent = t; }
function oido(t) { $('oido').textContent = t ? '«' + t + '»' : ''; }

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
  escenario.append(f);
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
// "mitocondria" → "M _ _ _ _ _ _ _ _ _ _ · 11 letras"
function letrasDe(r) {
  const p = String(r || '').trim();
  return '🔤 ' + p.charAt(0).toUpperCase() + ' _'.repeat(Math.max(0, p.length - 1)) + ' · ' + p.length + ' letras';
}
function prepararLista(preguntas) { return preguntas.map((p) => ({ ...p, aceptadas: p.aceptadas || [] })); }

function mostrarPregunta() {
  const p = estado.lista[estado.i];
  estado.fase = 'pregunta';
  pintarHud();
  $('pregunta').textContent = p.pregunta;
  // Ayuda, siempre visible: la pista de la IA y la primera letra con los
  // espacios de la palabra (la calcula el código, así siempre es exacta).
  const pistaEl = $('pista-texto');
  pistaEl.textContent = '';
  if (p.pista) pistaEl.append(el('span', '', '💡 ' + p.pista));
  pistaEl.append(el('span', 'letras', letrasDe(p.respuesta)));
  pistaEl.hidden = false;
  $('retro').hidden = true;
  $('siguiente').hidden = true;
  const nube = $('nube');
  nube.classList.remove('entra', 'bien', 'mal'); void nube.offsetWidth; nube.classList.add('entra');
  burbuja('');
  oido('');
  $('texto-respuesta').value = '';
  const n = estado.i;
  const listo = () => {
    estado.leyendo = false;
    if (estado.fase !== 'pregunta' || estado.i !== n) return;
    if (mic.escuchando) { if (mic.reabrir) mic.reabrir(); estadoVoz('🎤 Te escucho… di tu respuesta'); return; }
    if (mic.motor) escuchar();
    else estadoVoz('⌨️ Escribe tu respuesta y toca Saltar');
  };
  estado.desde = performance.now();
  estado.leyendo = hablar(p.pregunta, () => setTimeout(listo, JUEGO.esperaTrasLeer));
  if (!estado.leyendo) setTimeout(listo, JUEGO.esperaSinVoz);
  // Con el dictado del navegador se escucha DESDE YA, mientras la voz lee la
  // pregunta: si el estudiante responde antes, la voz se calla y la gallina
  // salta. Mientras lee, solo cuenta la respuesta correcta y dicha corta (la
  // pregunta nunca contiene la respuesta, así la voz no se "responde" sola).
  // Con la grabación se espera a que termine de leer (no se distinguiría).
  if (estado.leyendo && mic.motor === 'dictado') {
    setTimeout(() => { if (estado.fase === 'pregunta' && estado.i === n) escuchar(true); }, 250);
    estadoVoz('🎤 Te escucho… puedes responder ya');
  } else {
    estadoVoz(estado.leyendo ? '🔊 Escucha la pregunta…' : '📖 Lee la pregunta…');
  }
}

// mientrasLee: empieza a escuchar sin callar la voz que lee la pregunta.
async function escuchar(mientrasLee) {
  if (estado.fase !== 'pregunta' || mic.escuchando || !mic.motor) return;
  if (!mientrasLee) { callar(); estado.leyendo = false; }
  const p = estado.lista[estado.i], n = estado.i;
  mic.escuchando = true;
  mic.pico = 0;
  $('b-mic').classList.add('activo');
  $('b-mic').setAttribute('aria-label', 'Terminar de hablar');
  gallinaEl.className = 'escucha';
  estadoVoz(mientrasLee ? '🎤 Te escucho… puedes responder ya' : '🎤 Te escucho… di tu respuesta');
  oido('');
  let r = mic.motor === 'dictado' ? await escucharDictado(p) : await escucharGrabando(p);
  // El dictado no está disponible aquí (archivo local, marco, sin servicio): se graba y transcribe la IA.
  if (mic.motor === 'dictado' && !r.textos.length && ['not-allowed', 'service-not-allowed', 'network', 'language-not-supported', 'no-disponible'].includes(r.error)) {
    mic.motor = modoIA ? 'grabacion' : '';
    console.warn('BioSalto: el dictado del navegador no está disponible (' + r.error + ')' + (mic.motor ? '; se graba y transcribe con la IA.' : '; sin IA, solo se puede escribir.'));
    if (mic.motor && estado.fase === 'pregunta' && estado.i === n) r = await escucharGrabando(p);
  }
  mic.escuchando = false;
  $('b-mic').classList.remove('activo');
  $('b-mic').setAttribute('aria-label', 'Hablar: di tu respuesta');
  if (gallinaEl.className === 'escucha') gallinaEl.className = '';
  if (estado.fase !== 'pregunta' || estado.i !== n || r.error === 'cancelado') return;
  if (!mic.motor) { mostrarTeclado(true); estadoVoz('⌨️ Escribe tu respuesta y toca Saltar'); return; }
  if (r.error === 'audio-capture') return sinMicrofono('sin-mic');
  if (!r.textos.length) {
    // Escuchó seguido maxEscuchaMs y no oyó nada: se pausa para no quedarse abierto.
    estadoVoz('🎤 Toca el micrófono cuando quieras responder');
    return;
  }
  responder(r.textos);
}

function responder(textos) {
  const p = estado.lista[estado.i];
  if (estado.fase !== 'pregunta') return;
  estado.fase = 'revelando';
  if (mic.detener) mic.detener(true);
  callar();
  const bien = coincide(textos, p);
  const dicho = R.texto(textos[0], 40);
  if (bien) {
    estado.aciertos += 1;
    estado.racha += 1;
    estado.mejorRacha = Math.max(estado.mejorRacha, estado.racha);
  } else {
    estado.racha = 0;
  }
  estado.respuestas.push({ pregunta: p.pregunta, dicho, correcta: p.respuesta, bien, explicacion: p.explicacion });
  burbuja((bien ? '✅ ' : '❌ ') + '«' + dicho + '»', bien ? 'bien' : 'mal');
  estadoVoz(bien ? '¡Correcto! ¡A saltar!' : '¡Oh no! Esa no era…');
  mostrarTeclado(false);
  const d = $('destello');
  d.className = bien ? 'bien' : 'mal';
  setTimeout(() => (d.className = ''), 700);
  const n = estado.i;
  const accion = bien ? esperar(250).then(() => saltar(mic.pico)) : esperar(600).then(caer);
  accion.then(() => {
    if (estado.fase !== 'revelando' || estado.i !== n) return;
    if (bien) {
      const g = puntoMonte(esc.k);
      puntosFlotantes(g.x + esc.pan, g.y - esc.g * 1.3, estado.racha >= 2 ? '🔥 racha x' + estado.racha : '');
    }
    revelar(bien);
  });
}
function revelar(bien) {
  const p = estado.lista[estado.i];
  $('nube').classList.add(bien ? 'bien' : 'mal');
  const retro = $('retro');
  retro.hidden = false;
  retro.className = bien ? 'bien' : 'mal';
  retro.textContent = (bien ? (p.emoji ? p.emoji + ' ' : '') + '¡Correcto! ' : '❌ Era «' + p.respuesta + '». ') + (p.explicacion || '');
  const sig = $('siguiente');
  sig.hidden = false;
  sig.textContent = estado.i + 1 < estado.lista.length ? 'Siguiente ▶' : 'Ver resultado 🏁';
  estadoVoz(bien ? '🐔 ¡Buen salto!' : '🐔 La gallina volvió a su montaña');
  pintarHud();
  clearTimeout(estado.temporizador);
  const n = estado.i, desde = performance.now();
  const texto = (bien ? '¡Correcto! ' : 'Era ' + p.respuesta + '. ') + (p.explicacion || '');
  const pasar = (extra) => {
    if (estado.fase !== 'revelando' || estado.i !== n) return;
    clearTimeout(estado.temporizador);
    estado.temporizador = setTimeout(siguiente, Math.max(extra, JUEGO.segundosRevelar * 1000 - (performance.now() - desde)));
  };
  if (hablar(texto, () => pasar(1300))) estado.temporizador = setTimeout(siguiente, 20000);
  else pasar(3500);
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
  if (mic.detener) mic.detener(true);
  const n = estado.lista.length, a = estado.aciertos;
  const ratio = n ? a / n : 0;
  const estrellas = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : ratio > 0 ? 1 : 0;
  [...$('estrellas').children].forEach((s, k) => {
    s.classList.remove('llena');
    if (k < estrellas) setTimeout(() => { s.classList.add('llena'); tono([[660 + k * 220, 0, 0.18, 'sine']]); }, 450 + k * 380);
  });
  contar($('final-puntos'), a, ' de ' + n);
  $('final-aciertos').textContent = (n === 1 ? 'acierto' : 'aciertos') + (estado.mejorRacha >= 2 ? ' · 🔥 mejor racha x' + estado.mejorRacha : '');
  const clave = 'biosalto.record.' + estado.tema.toLowerCase();
  // El récord es la mejor proporción de aciertos ("4 de 5"), guardada como "a/n".
  const previo = /^(\d+)\/(\d+)$/.exec(leer(clave) || '');
  const antes = previo ? { a: Number(previo[1]), n: Number(previo[2]) } : null;
  const rec = $('final-record');
  if (a && (!antes || a / n > antes.a / antes.n)) { guardar(clave, a + '/' + n); rec.textContent = antes ? '🏅 ¡Nuevo récord! Antes: ' + aciertosTexto(antes.a, antes.n) : '🏅 ¡Tu primer récord en este tema!'; }
  else if (antes) rec.textContent = '🏅 Tu récord en este tema: ' + aciertosTexto(antes.a, antes.n);
  rec.hidden = !a && !antes;
  $('titulo-final').textContent = estrellas === 3 ? '¡Llegaste a la cima! 🏔️' : '¡Fin del recorrido! 🐔';
  $('final-mensaje').textContent = estrellas === 3 ? '¡Perfecto! Tu gallina no cayó ni una vez. 🏆' : estrellas === 2 ? '¡Muy bien! Repasa las que fallaste y vuelve por las 3 estrellas.' : 'Sigue practicando: lee las explicaciones y vuelve a jugar.';
  const ul = $('resumen');
  ul.textContent = '';
  estado.respuestas.forEach((r, k) => {
    const li = el('li', r.bien ? 'bien' : 'mal');
    li.style.setProperty('--k', k);
    li.append(el('b', '', (k + 1) + '. ' + r.pregunta), el('span', '', (r.bien ? '✅ ' : '❌ Dijiste «' + r.dicho + '» · Correcta: ') + '«' + r.correcta + '»'));
    if (r.explicacion) { li.append(el('br')); li.append(el('small', '', r.explicacion)); }
    ul.append(li);
  });
  $('final').hidden = false;
  $('final').scrollTop = 0;
  if (estrellas === 3) [0, 350, 700].forEach((t, k) => setTimeout(() => confeti(innerWidth * (0.25 + k * 0.25), innerHeight * 0.3, 120, FIESTA, { v: 6, subida: 6 }), t));
  hablar('Terminaste. Acertaste ' + a + ' de ' + n + ': tu gallina saltó ' + a + (a === 1 ? ' vez.' : ' veces.'));
  avisarActividad({ tipo: 'juego:resultado', juego: 'BioSalto', tema: estado.tema, aciertos: a, total: n });
}

// ---------- Teclado (sin micrófono) ----------
function mostrarTeclado(si) {
  $('escribir').hidden = !si;
  if (si && estado.fase === 'pregunta') setTimeout(() => $('texto-respuesta').focus(), 50);
}

// ---------- Sin micrófono: aviso y QR para el celular ----------
function sinMicrofono(motivo) {
  mic.motor = '';
  estado.sinMic = true;
  const textos = {
    'sin-mic': '🎙️ Esta computadora no tiene micrófono. Escanea el código QR para jugar en el celular, o juega escribiendo las respuestas.',
    permiso: '🔒 El micrófono está bloqueado: permítelo en el candado de la barra de direcciones, juega en el celular (QR) o escribe las respuestas.',
    ocupado: '🎙️ Otro programa está usando el micrófono. Ciérralo, juega en el celular (QR) o escribe las respuestas.',
    inseguro: '🎙️ Aquí el navegador no deja usar el micrófono. Juega en el celular (QR) o escribe las respuestas.',
  };
  const nota = $('sin-mic');
  nota.textContent = textos[motivo] || textos['sin-mic'];
  nota.hidden = false;
  $('b-mic').disabled = true;
  if (estado.fase === 'pregunta') { mostrarTeclado(true); estadoVoz('⌨️ Escribe tu respuesta y toca Saltar'); }
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
  const contexto = ACTIVIDAD.contexto && tema === ACTIVIDAD.tema ? ACTIVIDAD.contexto : '';
  const clave = claveDe(tema, valor('cantidad'), valor('nivel'));
  const preguntas = mismas ? Promise.resolve(mismas) : precarga && precarga.clave === clave ? precarga.promesa : pedirPreguntas(tema, valor('cantidad'), valor('nivel'), contexto);
  precarga = null;
  // Micrófono (se pide permiso con el toque del estudiante).
  let fallo = null;
  if (!estado.sinMic) {
    try { await abrirMicrofono(); } catch (e) { fallo = e; }
  }
  const listo = () => { boton.disabled = false; boton.textContent = '▶ ¡A jugar!'; };
  if (fallo) {
    listo();
    sinMicrofono(fallo.motivo);
    if (fallo.motivo === 'sin-mic' && !esCelular()) abrirQR();
    return; // se queda en el inicio con el aviso; al tocar ▶ otra vez juega escribiendo
  }
  if (!estado.sinMic) mic.motor = SR && location.protocol !== 'file:' ? 'dictado' : modoIA ? 'grabacion' : '';
  if (ronda !== estado.ronda) return listo();
  $('inicio').hidden = true;
  $('final').hidden = true;
  estado.lista = [];
  estado.respuestas = [];
  estado.i = 0;
  estado.aciertos = estado.racha = estado.mejorRacha = 0;
  medidas();
  reiniciarEscena();
  pintarHud();
  $('nube').classList.remove('bien', 'mal');
  $('nube-tema').textContent = tema;
  $('retro').hidden = true;
  $('siguiente').hidden = true;
  $('pista-texto').hidden = true;
  $('b-mic').disabled = !mic.motor;
  mostrarTeclado(!mic.motor);
  const preg = $('pregunta');
  preg.textContent = '';
  preg.append(el('span', 'cargando', '🧬'), ' ', el('span', 'puntitos', mismas ? '¡Otra ronda!' : 'Preparando tus preguntas'));
  estadoVoz('🐔 Tu gallina se está preparando…');
  const p = await preguntas;
  listo();
  if (ronda !== estado.ronda) return;
  estado.ultimas = p;
  estado.tema = p.tema || tema;
  $('nube-tema').textContent = estado.tema;
  estado.lista = prepararLista(p.preguntas);
  reacomodar();
  preg.textContent = '¡Prepárate! 🐔';
  pintarHud();
  await cuentaRegresiva(ronda);
  if (ronda !== estado.ronda) return;
  mostrarPregunta();
}
function salir() {
  estado.ronda += 1;
  clearTimeout(estado.temporizador);
  estado.fase = 'inicio';
  $('cuenta').textContent = '';
  callar();
  cerrarMicrofono();
  $('final').hidden = true;
  $('inicio').hidden = false;
}

// ======================= Dentro de una actividad (botón "Juego") =======================
const EMBEBIDO = window.parent !== window;
const ACTIVIDAD = { tema: '', contexto: '', materia: null };
function avisarActividad(m) { if (EMBEBIDO) try { window.parent.postMessage(m, '*'); } catch (e) {} }
function volverActividad() { salir(); avisarActividad({ tipo: 'juego:cerrar' }); }
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
// Las preguntas del tema de la actividad se piden apenas se abre el juego.
let precarga = null;
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
const esCelular = () => window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
function urlParaCelular() {
  const publicado = location.protocol === 'https:' && !/^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(location.hostname);
  const u = publicado ? new URL(location.href) : new URL('biosalto.html', (C.libro && C.libro.urlPublica) || JUEGO.urlPublica);
  u.hash = '';
  const t = $('tema').value.trim();
  if (t) u.searchParams.set('tema', t); else u.searchParams.delete('tema');
  return u.href;
}
async function abrirQR() {
  $('qr').hidden = false;
  $('b-cerrar-qr').focus();
  const caja = $('qr-codigo');
  try {
    if (!window.QRCode) await cargarScript(LIB_QR);
    caja.textContent = '';
    new window.QRCode(caja, { text: urlParaCelular(), width: 220, height: 220, colorDark: '#1e3a8a', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
  } catch (e) {
    caja.textContent = 'No se pudo crear el código QR (sin internet).';
  }
}
function cerrarQR() { $('qr').hidden = true; $('b-qr').focus(); }

// ======================= Arranque =======================
const JUGAR = { tema: new URLSearchParams(location.search).get('tema') || '' };
function segmentos(id) {
  const g = $(id);
  const pintar = () => [...g.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === g.dataset.valor)));
  g.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { g.dataset.valor = b.dataset.v; pintar(); } });
  pintar();
}
function cuadro() {
  requestAnimationFrame(cuadro);
  pintarConfeti();
  let v = 0;
  if (mic.escuchando) { v = medirNivel(); mic.pico = Math.max(mic.pico, v); }
  mic.nivel += (v - mic.nivel) * 0.35;
  if (mic.nivel < 0.004) mic.nivel = 0;
  escenario.style.setProperty('--nivel', mic.nivel.toFixed(3));
  escenario.style.setProperty('--aleteo', mic.nivel > 0.3 ? 'running' : 'paused');
}
// Antes de empezar: si la computadora no tiene micrófono, se avisa y se ofrece el QR.
function revisarMicrofono() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  navigator.mediaDevices.enumerateDevices().then((d) => {
    if (!d.some((x) => x.kind === 'audioinput')) sinMicrofono('sin-mic');
  }).catch(() => {});
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
  medidas();
  reiniciarEscena();
  addEventListener('resize', () => { if (estado.fase !== 'inicio') reacomodar(); else ajustarLienzo(); });
  ponerTema(JUGAR.tema ? R.texto(JUGAR.tema, 80) : '');
  const cfgJuegos = window.JUEGOS_CONFIG;
  if (cfgJuegos) mostrarAtras(['biocabeza', 'biosalto'].filter((k) => cfgJuegos[k] !== false).length > 1);
  segmentos('cantidad');
  segmentos('nivel');
  $('nivel').querySelectorAll('button').forEach((b) => { b.title = b.dataset.v[0].toUpperCase() + b.dataset.v.slice(1); b.setAttribute('aria-label', b.title); b.append(' ' + b.title); });
  if (esCelular()) $('b-qr').hidden = true;
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
  $('b-mic').addEventListener('click', () => {
    if (estado.fase !== 'pregunta') return;
    if (mic.escuchando) { if (mic.detener) mic.detener(false); } else escuchar();
  });
  $('b-teclado').addEventListener('click', () => mostrarTeclado($('escribir').hidden));
  $('escribir').addEventListener('submit', (e) => {
    e.preventDefault();
    const t = $('texto-respuesta').value.trim();
    if (t && estado.fase === 'pregunta') responder([t]);
  });
  const bVoz = $('b-voz');
  const pintarVoz = () => { bVoz.textContent = vozActiva ? '🔊' : '🔈'; bVoz.setAttribute('aria-pressed', String(vozActiva)); };
  pintarVoz();
  bVoz.addEventListener('click', () => { vozActiva = !vozActiva; guardar('biosalto.voz', vozActiva ? 'si' : 'no'); if (!vozActiva) callar(); pintarVoz(); });
  // Teclado: Espacio habla; Enter pasa a la siguiente; Esc cierra el QR o sale.
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('qr').hidden) return cerrarQR();
      if (estado.fase === 'inicio' || estado.fase === 'final') { if (EMBEBIDO) volverActividad(); return; }
      return salir();
    }
    if (e.target && e.target.tagName === 'INPUT') return;
    if (estado.fase === 'pregunta' && e.key === ' ') { e.preventDefault(); $('b-mic').click(); }
    else if (estado.fase === 'revelando' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); siguiente(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) callar(); });
  requestAnimationFrame(cuadro);
  revisarMicrofono();
  prepararIA().then((m) => {
    modoIA = m;
    if (!m) console.warn('BioSalto: sin IA, se juega con preguntas de ejemplo. Configura la clave en js/biosalto/config.local.js (o js/entrevista/config.local.js) o el servidor en js/entrevista/config.js (ia.proxyUrl).');
    precargar();
  });
}
iniciar();
})();
