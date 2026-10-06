/* =========================================================================
   BIOPORTAL — el portal al mundo del tema (js/bioportal/bioportal.js)
   -------------------------------------------------------------------------
   Un portal circular brillante (energía, burbujas y vapor) se abre:
   - en el CUARTO, con realidad aumentada (WebXR, Chrome en Android): se
     apunta al piso, se toca y el portal aparece; se puede caminar a través
     de él para quedar dentro del mundo;
   - o en la PANTALLA (computadora, iPhone): el portal flota y se "vuela"
     a través de él; se mira alrededor arrastrando.
   A través del portal se ve el mundo del tema de la actividad (mundos.js):
   la IA lo elige y arma un tour; en cada parada la guía (voz) narra lo que
   se está viendo y un marcador muestra dónde mirar. Se le puede preguntar.
   Trucos 3D: el portal es una máscara del stencil; el mundo solo se dibuja
   donde está la máscara (al entrar, en toda la pantalla).
   IA: la misma conexión de la Entrevista (js/entrevista/config.js); clave
   local en js/bioportal/config.local.js (o la de la Entrevista / BioSalto);
   publicado, servidor intermedio → /api/bioportal/tour y /api/bioportal/pregunta.
   ========================================================================= */
(function () {
'use strict';
const SCRIPT = document.currentScript ? document.currentScript.src : location.href;
const PORTAL = {
  paradas: 6, // paradas del tour (de 4 a 8)
  radio: 0.9, // metros: el portal mide 1,8 m de alto
  altura: 1.2, // metros desde el piso hasta el centro del portal
  // Dirección pública del libro (GitHub Pages): el QR lleva aquí cuando el portal
  // se abre desde la computadora (archivo o localhost), que el celular no puede abrir.
  urlPublica: 'https://brayan240699194.github.io/ProfesorIAProlipa/',
};
const LIB_THREE = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const LIB_QR = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
const URL_GOOGLE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const EMOJI_MUNDO = { 'tierra-primitiva': '🌋', celula: '🦠', cuerpo: '🩸', ecosistema: '🌳', molecular: '🧬' };

// Tour de ejemplo (sin IA).
const EJEMPLO = {
  mundo: 'tierra-primitiva',
  titulo: 'Viaje a la Tierra primitiva',
  bienvenida: '¡Bienvenido! Este portal te lleva unos 4000 millones de años atrás, cuando la Tierra era un lugar hirviente y todavía sin vida.',
  paradas: [
    { punto: 'atmosfera', emoji: '🌫️', titulo: 'Un cielo sin oxígeno', narracion: 'Mira ese cielo naranja: la atmósfera primitiva casi no tenía oxígeno libre. Estaba llena de metano, amoníaco, hidrógeno y vapor de agua.' },
    { punto: 'volcanes', emoji: '🌋', titulo: 'Volcanes por todas partes', narracion: '¡Siente el calor! Los volcanes expulsaban gases y vapor de agua sin parar. Ese vapor se enfrió, cayó como lluvia durante millones de años y formó los océanos.' },
    { punto: 'rayos', emoji: '⚡', titulo: 'La chispa de la vida', narracion: '¡Impresionante, verdad? Esos rayos que ves atravesando el metano y el amoníaco fueron la chispa perfecta para unir moléculas simples y crear los primeros aminoácidos, los ladrillos de la vida.' },
    { punto: 'oceano', emoji: '🌊', titulo: 'La sopa primitiva', narracion: 'Este océano tibio era como una sopa: en él se fueron acumulando las moléculas orgánicas que se formaban con la energía de los rayos y del Sol.' },
    { punto: 'charca', emoji: '💧', titulo: 'Una charca tibia', narracion: 'En charcas como esta el agua se evaporaba y las moléculas se concentraban. Así pudieron unirse en cadenas más grandes, como las proteínas.' },
    { punto: 'moleculas', emoji: '✨', titulo: 'Hacia las primeras células', narracion: '¿Ves esas moléculas brillando? Algunas quedaron encerradas en gotitas llamadas coacervados, un paso clave hacia las primeras células.' },
  ],
  despedida: 'La vida empezó con moléculas simples, agua y mucha energía. ¡Gracias por viajar conmigo al origen de la vida!',
};

const $ = (id) => document.getElementById(id);
const R = window.BioPortalReglas;
const MOVIMIENTO = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function almacen() { try { return window.localStorage; } catch (e) { return null; } }
const LS = almacen();
function leer(k) { try { return LS ? LS.getItem(k) : null; } catch (e) { return null; } }
function guardar(k, v) { try { if (LS) LS.setItem(k, v); } catch (e) {} }
function cargarScript(url) {
  return new Promise((ok, falla) => {
    const s = document.createElement('script');
    s.src = url;
    s.onload = ok;
    s.onerror = () => falla(new Error('No se pudo cargar ' + url));
    document.head.appendChild(s);
  });
}

// ======================= IA (misma conexión que la Entrevista) =======================
const carpeta = (n) => new URL('../' + n + '/', SCRIPT).href;
const enLocal = location.protocol === 'file:' || /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(location.hostname) || /\.devtunnels\.ms$/.test(location.hostname);
const C = window.ENTREVISTA_CONFIG || { ia: {} };
C.ia = C.ia || {};
let modoIA = ''; // 'servidor' | 'directo' | ''

// Clave de pruebas: js/bioportal/config.local.js; si no, la de la Entrevista
// o la de BioSalto. Solo en tu computadora o por el túnel de VS Code.
async function prepararIA() {
  const secretos = () => window.BIOPORTAL_SECRETOS || window.ENTREVISTA_SECRETOS || window.BIOSALTO_SECRETOS;
  if (enLocal && C.ia.activa !== false) {
    for (const n of ['bioportal', 'entrevista', 'biosalto']) {
      if (secretos()) break;
      await cargarScript(carpeta(n) + 'config.local.js?t=' + Date.now()).catch(() => {});
    }
  }
  const S = enLocal && secretos();
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
// Si a los "ms" no hay respuesta (o la primera falla), se lanza un segundo
// intento en paralelo y gana el primero que traiga algo válido.
function carrera(fn, ms) {
  return new Promise((ok, falla) => {
    let lanzados = 0, fallidos = 0, listo = false, ultimo = null, reloj = 0;
    const lanzar = () => {
      if (listo || lanzados >= 2) return;
      lanzados += 1;
      fn().then((r) => {
        if (!r) throw new Error('respuesta no válida');
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
function materia(texto) {
  const libro = C.libro || {};
  return (ACTIVIDAD.materia && ACTIVIDAD.materia.nombre) || libro.nombre || ((window.ProlipaMateria && window.ProlipaMateria.detectar(texto)) || {}).nombre || '';
}
// → { mundo, titulo, bienvenida, paradas, despedida, origen }
async function pedirTour(tema, contexto) {
  const d = R.datos({ tema, paradas: PORTAL.paradas, contexto, libro: materia(tema + ' ' + (contexto || '')), publico: (C.libro || {}).publico });
  const ejemplo = () => Object.assign({}, EJEMPLO, { origen: 'ejemplo' });
  if (!modoIA || !tema || R.tieneDatosPersonales(d.tema)) return ejemplo();
  const intento = async () => {
    if (modoIA === 'servidor') {
      return R.normalizarTour(await fetch(base() + '/api/bioportal/tour', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), signal: conTiempo(28000) }).then(comprobar), d.paradas);
    }
    const j = await gemini({ systemInstruction: { parts: [{ text: R.sistema(d) }] }, contents: [{ role: 'user', parts: [{ text: R.usuario(d) }] }], generationConfig: { maxOutputTokens: 3000, temperature: 0.8, responseMimeType: 'application/json' } }, 22000);
    return R.normalizarTour(textoDe(j), d.paradas);
  };
  try {
    return Object.assign(await carrera(intento, 7000), { origen: 'ia' });
  } catch (e) {
    console.warn('BioPortal: sin tour de la IA, se usa el de ejemplo.', e);
    return ejemplo();
  }
}
const SIN_RESPUESTA = 'Ahora no puedo responder preguntas, pero sigue explorando: ¡hay mucho por descubrir en este mundo!';
async function preguntar(pregunta) {
  const tr = estado.tour, p = tr.paradas[estado.i];
  const d = R.datosPregunta({ libro: materia(estado.tema), publico: (C.libro || {}).publico, tema: estado.tema || tr.titulo, mundo: tr.mundo, parada: p ? p.titulo + ': ' + p.narracion : tr.bienvenida, pregunta });
  if (!modoIA) return SIN_RESPUESTA;
  if (R.tieneDatosPersonales(d.pregunta)) return 'Mejor no compartas datos personales como correos o teléfonos. ¿Qué más quieres saber de este mundo?';
  const intento = async () => {
    if (modoIA === 'servidor') return R.normalizarPregunta(await fetch(base() + '/api/bioportal/pregunta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), signal: conTiempo(15000) }).then(comprobar));
    const j = await gemini({ systemInstruction: { parts: [{ text: R.sistemaPregunta(d) }] }, contents: [{ role: 'user', parts: [{ text: d.pregunta }] }], generationConfig: { maxOutputTokens: 400, temperature: 0.6, responseMimeType: 'application/json' } }, 12000);
    return R.normalizarPregunta(textoDe(j));
  };
  try { return (await carrera(intento, 4000)).respuesta; } catch (e) { console.warn('BioPortal: sin respuesta.', e); return SIN_RESPUESTA; }
}

// ======================= Voz y sonidos =======================
let vozActiva = leer('bioportal.voz') !== 'no';
function hablar(t, alTerminar) {
  if (!vozActiva || !window.speechSynthesis || !t) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'es-ES';
    const v = speechSynthesis.getVoices().find((x) => /^es[-_]/i.test(x.lang));
    if (v) u.voice = v;
    u.rate = 1.02;
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
    notas.forEach(([f, ini, dur, tipo, f2, vol]) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = tipo || 'sine';
      o.frequency.setValueAtTime(f, t0 + ini);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + ini + dur);
      g.gain.setValueAtTime(0.0001, t0 + ini);
      g.gain.exponentialRampToValueAtTime(vol || 0.18, t0 + ini + Math.min(0.15, dur / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0 + ini);
      o.stop(t0 + ini + dur + 0.05);
    });
  } catch (e) {}
}
const SONIDO = {
  abrir: () => tono([[90, 0, 1.4, 'sawtooth', 420, 0.08], [220, 0.1, 1.2, 'sine', 880, 0.12], [660, 0.7, 0.6, 'triangle', 1320, 0.08]]),
  entrar: () => tono([[160, 0, 1.1, 'sawtooth', 1200, 0.06], [400, 0, 1.1, 'sine', 90, 0.12]]),
  parada: () => tono([[880, 0, 0.18, 'triangle'], [1320, 0.09, 0.28, 'triangle']]),
  fin: () => tono([[523, 0, 0.2, 'triangle'], [659, 0.15, 0.2, 'triangle'], [784, 0.3, 0.45, 'triangle']]),
};

// ======================= Escena 3D =======================
let T = null; // three.js
let renderer = null, escena = null, camara = null, ancla = null, sala = null, fondo3D = null, portal = null, mundo = null, marcador = null, reticula = null;
const VISTA_FUERA = () => (camara && camara.aspect < 0.8 ? 4.6 : 3.6);
const VISTAS_DENTRO = { cuerpo: [0, 2.1, -1.5] };
const vista = { yaw: 0, pitch: 0, objYaw: 0, objPitch: 0, pos: null, objPos: null, libre: 0 };

function sinStencil(m, func) {
  m.stencilWrite = true;
  m.stencilRef = 1;
  m.stencilFunc = func;
  m.stencilFail = m.stencilZFail = m.stencilZPass = T.KeepStencilOp;
}
const materiales = (o) => (o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []);
function lienzo(tam, dibujar) {
  const c = document.createElement('canvas'); c.width = c.height = tam;
  dibujar(c.getContext('2d'), tam);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  return t;
}

// Tu salón (solo en la pantalla): fondo azul y un piso con brillo bajo el portal.
function crearSala() {
  fondo3D = lienzo(256, (x, n) => {
    const g = x.createLinearGradient(0, 0, 0, n);
    g.addColorStop(0, '#0b1530'); g.addColorStop(0.55, '#1e3a8a'); g.addColorStop(1, '#0c4a6e');
    x.fillStyle = g; x.fillRect(0, 0, n, n);
  });
  const g = new T.Group();
  const piso = new T.Mesh(new T.CircleGeometry(9, 64).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({
    transparent: true, depthWrite: false,
    map: lienzo(512, (x, n) => {
      const r = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
      r.addColorStop(0, 'rgba(56,189,248,.35)'); r.addColorStop(0.5, 'rgba(37,99,235,.18)'); r.addColorStop(1, 'rgba(37,99,235,0)');
      x.fillStyle = r; x.fillRect(0, 0, n, n);
      x.strokeStyle = 'rgba(186,230,253,.18)'; x.lineWidth = 2;
      for (let i = 1; i < 9; i++) { x.beginPath(); x.arc(n / 2, n / 2, (n / 2) * (i / 9), 0, Math.PI * 2); x.stroke(); }
    }),
  }));
  g.add(piso);
  const polvo = new T.Points(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(Array.from({ length: 360 }, (_, i) => (i % 3 === 1 ? Math.random() * 4 : (Math.random() - 0.5) * 14)), 3)), new T.PointsMaterial({ color: '#bae6fd', size: 0.03, transparent: true, opacity: 0.6, depthWrite: false }));
  g.add(polvo);
  g.traverse((o) => { materiales(o).forEach((m) => sinStencil(m, T.NotEqualStencilFunc)); o.renderOrder = 3; });
  g.userData.polvo = polvo;
  return g;
}

// El portal: máscara (stencil) + aro de energía, remolino, chispas, burbujas y vapor.
function crearPortal() {
  const Rr = PORTAL.radio;
  const g = new T.Group(); g.position.y = PORTAL.altura; g.scale.setScalar(0.001);
  const mascara = new T.Mesh(new T.CircleGeometry(Rr, 72), new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  Object.assign(mascara.material, { stencilWrite: true, stencilRef: 1, stencilFunc: T.AlwaysStencilFunc, stencilZPass: T.ReplaceStencilOp });
  mascara.renderOrder = 1;
  g.add(mascara);
  const suma = { transparent: true, depthWrite: false, blending: T.AdditiveBlending };
  const nucleo = new T.Mesh(new T.TorusGeometry(Rr, 0.03, 12, 160), new T.MeshBasicMaterial({ color: '#ffffff' }));
  const halo = new T.Mesh(new T.TorusGeometry(Rr, 0.11, 16, 160), new T.MeshBasicMaterial(Object.assign({ color: '#38bdf8', opacity: 0.5 }, suma)));
  const texRemolino = lienzo(512, (x, n) => {
    const c = n / 2, r0 = c * 0.6;
    const r = x.createRadialGradient(c, c, r0 * 0.95, c, c, c);
    r.addColorStop(0, 'rgba(255,255,255,.95)'); r.addColorStop(0.18, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = r; x.beginPath(); x.arc(c, c, c, 0, Math.PI * 2); x.fill();
    x.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const rad = r0 + Math.random() * (c - r0) * 0.85, a = Math.random() * Math.PI * 2, l = 0.3 + Math.random() * 0.9;
      x.strokeStyle = 'rgba(255,255,255,' + (0.15 + Math.random() * 0.5).toFixed(2) + ')';
      x.lineWidth = 1 + Math.random() * 4;
      x.beginPath(); x.arc(c, c, rad, a, a + l); x.stroke();
    }
  });
  const remolino = new T.Mesh(new T.RingGeometry(Rr * 0.97, Rr * 1.6, 160, 1), new T.MeshBasicMaterial(Object.assign({ map: texRemolino, color: '#7dd3fc', side: T.DoubleSide }, suma)));
  const remolino2 = new T.Mesh(remolino.geometry, new T.MeshBasicMaterial(Object.assign({ map: texRemolino, color: '#38bdf8', side: T.DoubleSide, opacity: 0.7 }, suma)));
  remolino2.scale.setScalar(0.92); remolino2.rotation.z = 1.7;
  // Chispas de energía alrededor del aro.
  const N = 320, pos = new Float32Array(N * 3), datos = [];
  for (let i = 0; i < N; i++) datos.push({ a: Math.random() * Math.PI * 2, r: Rr * (0.95 + Math.random() * 0.35), v: 0.3 + Math.random() * 0.9, z: (Math.random() - 0.5) * 0.12 });
  const chispas = new T.Points(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(pos, 3)), new T.PointsMaterial(Object.assign({ color: '#e0f2fe', size: 0.035, map: puntoSuave(), opacity: 0.95 }, suma)));
  // Burbujas que salen del portal y vapor que sube desde abajo.
  const NB = 70, posB = new Float32Array(NB * 3), datosB = [];
  for (let i = 0; i < NB; i++) datosB.push(nuevaBurbuja({}, true));
  const burbujas = new T.Points(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(posB, 3)), new T.PointsMaterial({ color: '#bae6fd', size: 0.06, map: texBurbuja(), transparent: true, depthWrite: false, opacity: 0.9 }));
  const NV = 26, posV = new Float32Array(NV * 3), datosV = [];
  for (let i = 0; i < NV; i++) datosV.push({ x: (Math.random() - 0.5) * Rr * 2.2, y: -Rr - 0.2 + Math.random() * 1.4, z: (Math.random() - 0.5) * 0.6, v: 0.08 + Math.random() * 0.12 });
  const vapor = new T.Points(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(posV, 3)), new T.PointsMaterial({ color: '#e0f2fe', size: 0.7, map: puntoSuave(), transparent: true, depthWrite: false, opacity: 0.16 }));
  // Por detrás, el portal se ve como un disco de energía (al rodearlo no "desaparece").
  const espalda = new T.Mesh(new T.CircleGeometry(Rr, 72), new T.MeshBasicMaterial({ map: texRemolino, color: '#1e3a8a', side: T.BackSide, transparent: true, opacity: 0.92, depthWrite: false }));
  espalda.renderOrder = 6; g.add(espalda);
  const luz = new T.PointLight('#38bdf8', 3, 6);
  [nucleo, halo, remolino, remolino2, chispas, burbujas, vapor].forEach((o) => { o.renderOrder = 6; g.add(o); });
  g.add(luz);
  function nuevaBurbuja(b, inicio) {
    const a = Math.random() * Math.PI * 2;
    b.x = Math.cos(a) * PORTAL.radio * (0.9 + Math.random() * 0.2); b.y = Math.sin(a) * PORTAL.radio * (0.9 + Math.random() * 0.2); b.z = 0;
    b.vx = Math.cos(a) * 0.05; b.vy = 0.12 + Math.random() * 0.2; b.vz = 0.05 + Math.random() * 0.25; b.vida = inicio ? Math.random() * 3 : 3;
    return b;
  }
  let abierto = 0, abriendo = -1;
  return {
    grupo: g,
    abierto: () => abierto >= 1,
    abrir() { if (abriendo < 0 && abierto < 1) abriendo = 0; },
    cerrar() { abierto = 0; abriendo = -1; g.scale.setScalar(0.001); },
    tenir(color) { espalda.material.color.set(color).multiplyScalar(0.55); halo.material.color.set(color); remolino2.material.color.set(color); luz.color.set(color); document.documentElement.style.setProperty('--energia', color); },
    actualizar(t, dt) {
      if (abriendo >= 0) {
        abriendo += dt / (MOVIMIENTO ? 1.3 : 0.01);
        const k = Math.min(1, abriendo), s = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); // rebote al final
        g.scale.setScalar(Math.max(0.001, s));
        if (k >= 1) { abierto = 1; abriendo = -1; g.scale.setScalar(1); }
      }
      remolino.rotation.z = -t * 0.55; espalda.rotation.z = t * 0.4; remolino2.rotation.z = 1.7 + t * 0.85;
      halo.material.opacity = 0.42 + Math.sin(t * 3) * 0.12;
      luz.intensity = 2.5 + Math.sin(t * 4) * 0.8;
      datos.forEach((d, i) => { d.a += dt * d.v; const r = d.r + Math.sin(t * 2 + i) * 0.03; pos[i * 3] = Math.cos(d.a) * r; pos[i * 3 + 1] = Math.sin(d.a) * r; pos[i * 3 + 2] = d.z; });
      chispas.geometry.attributes.position.needsUpdate = true;
      datosB.forEach((b, i) => { b.vida -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (b.vida <= 0) nuevaBurbuja(b); posB[i * 3] = b.x; posB[i * 3 + 1] = b.y; posB[i * 3 + 2] = b.z; });
      burbujas.geometry.attributes.position.needsUpdate = true;
      datosV.forEach((v, i) => { v.y += v.v * dt; if (v.y > Rr * 0.6) v.y = -Rr - 0.25; posV[i * 3] = v.x + Math.sin(t * 0.5 + i) * 0.1; posV[i * 3 + 1] = v.y; posV[i * 3 + 2] = v.z; });
      vapor.geometry.attributes.position.needsUpdate = true;
    },
  };
}
let texSuave = null;
function puntoSuave() {
  return texSuave || (texSuave = lienzo(64, (x, n) => {
    const r = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = r; x.fillRect(0, 0, n, n);
  }));
}
function texBurbuja() {
  return lienzo(64, (x, n) => {
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 3;
    x.beginPath(); x.arc(n / 2, n / 2, n / 2 - 4, 0, Math.PI * 2); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.18)'; x.fill();
    x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(n * 0.36, n * 0.34, 5, 0, Math.PI * 2); x.fill();
  });
}
// Marcador de la parada: un anillo que late sobre lo que se está mirando.
function crearMarcador() {
  const s = new T.Sprite(new T.SpriteMaterial({
    transparent: true, depthTest: false, depthWrite: false,
    map: lienzo(128, (x, n) => {
      const c = n / 2;
      const r = x.createRadialGradient(c, c, c * 0.3, c, c, c);
      r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.55, 'rgba(255,255,255,.0)'); r.addColorStop(0.7, 'rgba(255,255,255,.95)'); r.addColorStop(0.8, 'rgba(255,255,255,.4)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = r; x.fillRect(0, 0, n, n);
      x.fillStyle = '#fff'; x.beginPath(); x.arc(c, c, 6, 0, Math.PI * 2); x.fill();
    }),
  }));
  sinStencil(s.material, T.EqualStencilFunc);
  s.renderOrder = 8;
  s.visible = false;
  return s;
}
// Retícula de la realidad aumentada: un círculo en el piso donde va a ir el portal.
function crearReticula() {
  const g = new T.Group();
  g.add(new T.Mesh(new T.RingGeometry(0.28, 0.34, 48).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: '#7dd3fc' })));
  g.add(new T.Mesh(new T.CircleGeometry(0.26, 48).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.25 })));
  g.matrixAutoUpdate = false;
  g.visible = false;
  return g;
}

async function prepararEscena() {
  T = await import(LIB_THREE);
  renderer = new T.WebGLRenderer({ antialias: true, alpha: true, stencil: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.xr.enabled = true;
  $('escena').appendChild(renderer.domElement);
  escena = new T.Scene();
  camara = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 200);
  ancla = new T.Group(); escena.add(ancla);
  sala = crearSala(); escena.add(sala);
  escena.background = fondo3D;
  portal = crearPortal(); ancla.add(portal.grupo);
  marcador = crearMarcador(); ancla.add(marcador);
  reticula = crearReticula(); escena.add(reticula);
  vista.pos = new T.Vector3(0, 1.35, VISTA_FUERA());
  vista.objPos = vista.pos.clone();
  mirarA(new T.Vector3(0, 0.7, 0), true);
  addEventListener('resize', ajustar);
  arrastrar(renderer.domElement);
  renderer.setAnimationLoop(cuadro);
}
function ajustar() {
  if (!renderer || renderer.xr.isPresenting) return;
  camara.aspect = innerWidth / innerHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (!estado.dentro) { vista.objPos.z = VISTA_FUERA(); }
}
function ponerMundo(id) {
  quitarMundo();
  mundo = window.BioPortalMundos.crear(T, id);
  mundo.grupo.traverse((o) => { materiales(o).forEach((m) => sinStencil(m, T.EqualStencilFunc)); o.renderOrder = Math.max(2, o.renderOrder); });
  ancla.add(mundo.grupo);
  escena.fog = mundo.grupo.userData.niebla || null;
  portal.tenir(mundo.color);
  estado.dentro = false;
  sala.visible = !renderer.xr.isPresenting;
  extra.alMundo();
}
function quitarMundo() {
  if (!mundo) return;
  ancla.remove(mundo.grupo);
  mundo.grupo.traverse((o) => { if (o.geometry) o.geometry.dispose(); materiales(o).forEach((m) => { if (m.map && m.map !== texSuave) m.map.dispose(); m.dispose(); }); });
  mundo = null;
  escena.fog = null;
}
// Dentro del portal el mundo se dibuja en toda la pantalla; fuera, solo a través del portal.
function ponerDentro(si) {
  if (!mundo || estado.dentro === si) return;
  estado.dentro = si;
  const f = si ? T.AlwaysStencilFunc : T.EqualStencilFunc;
  mundo.grupo.traverse((o) => materiales(o).forEach((m) => { m.stencilFunc = f; }));
  marcador.material.stencilFunc = f;
  sala.visible = !si && !(renderer && renderer.xr.isPresenting);
  if (si) { SONIDO.entrar(); destello(); }
  extra.alCruzar(si);
  $('b-entrar').textContent = si ? '🚪 Salir' : '🚪 Entrar';
  $('b-entrar').setAttribute('aria-label', si ? 'Salir del portal' : 'Entrar al portal');
}
function destello() {
  const d = $('destello');
  d.classList.remove('ver'); void d.offsetWidth; d.classList.add('ver');
}

// ---------- cámara en la pantalla ----------
const angulo = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };
// bajo: cuánto mirar por debajo del punto (radianes) para que quede en la
// parte de arriba de la pantalla, sin taparlo con la tarjeta del tour.
function mirarA(p, ya, bajo) {
  const d = p.clone().sub(vista.objPos);
  vista.objYaw = Math.atan2(-d.x, -d.z);
  vista.objPitch = Math.atan2(d.y, Math.hypot(d.x, d.z)) - (bajo || 0);
  vista.libre = 0;
  if (ya) { vista.yaw = vista.objYaw; vista.pitch = vista.objPitch; vista.pos.copy(vista.objPos); }
}
function moverCamara(dt) {
  const k = MOVIMIENTO ? 1 - Math.exp(-dt * 2.2) : 1;
  vista.pos.lerp(vista.objPos, MOVIMIENTO ? 1 - Math.exp(-dt * 1.8) : 1);
  vista.yaw = angulo(vista.yaw, vista.objYaw, k);
  vista.pitch += (vista.objPitch - vista.pitch) * k;
  camara.position.copy(vista.pos);
  camara.rotation.set(vista.pitch, vista.yaw, 0, 'YXZ');
  // Al cruzar el plano del portal (z = 0) se entra o se sale del mundo.
  if (mundo) ponerDentro(vista.pos.z < 0);
}
function arrastrar(lien) {
  let x0 = 0, y0 = 0, activo = false;
  let ix = 0, iy = 0;
  lien.addEventListener('pointerdown', (e) => { activo = true; x0 = ix = e.clientX; y0 = iy = e.clientY; lien.setPointerCapture(e.pointerId); });
  lien.addEventListener('pointermove', (e) => {
    if (!activo || estado.fase === 'inicio') return;
    vista.objYaw += (e.clientX - x0) * 0.005;
    vista.objPitch = Math.max(-1.2, Math.min(1.2, vista.objPitch + (e.clientY - y0) * 0.004));
    if (!estado.dentro) vista.objYaw = Math.max(-0.6, Math.min(0.6, vista.objYaw));
    x0 = e.clientX; y0 = e.clientY;
  });
  const fin = () => { activo = false; };
  // Un toque (sin arrastrar) sobre un punto brillante lleva a esa parada.
  lien.addEventListener('pointerup', (e) => { if (activo && Math.hypot(e.clientX - ix, e.clientY - iy) < 6) extra.tocarPantalla(e.clientX, e.clientY); fin(); });
  lien.addEventListener('pointercancel', fin);
}
function vistaDentro() { const v = (mundo && VISTAS_DENTRO[estado.tour.mundo]) || [0, 1.6, -1.6]; return new T.Vector3(v[0], v[1], v[2]); }

// ---------- flecha hacia la parada ----------
const tmp = { v: null, m: null };
function flecha() {
  const f = $('flecha');
  if (!marcador || !marcador.visible || estado.fase !== 'tour') { f.hidden = true; return; }
  const xr = renderer.xr.isPresenting ? renderer.xr.getCamera() : null;
  const cam = xr ? (xr.cameras && xr.cameras[0]) || xr : camara;
  tmp.v = tmp.v || new T.Vector3(); tmp.m = tmp.m || new T.Matrix4();
  const v = marcador.getWorldPosition(tmp.v).applyMatrix4(tmp.m.copy(cam.matrixWorld).invert());
  const detras = v.z > 0;
  let x, y;
  if (!detras) { const p = v.clone().applyMatrix4(cam.projectionMatrix); x = p.x; y = p.y; if (Math.abs(x) < 0.85 && Math.abs(y) < 0.8) { f.hidden = true; return; } }
  else { x = v.x || 1; y = v.y; if (Math.abs(x) < Math.abs(y) * 0.3) x = x < 0 ? -1 : 1; }
  const a = Math.atan2(y, x), w = innerWidth, h = innerHeight;
  const cx = w / 2 + Math.cos(a) * (w / 2 - 50), cy = h * 0.4 - Math.sin(a) * (h * 0.4 - 60);
  f.hidden = false;
  f.style.transform = 'translate(' + cx.toFixed(0) + 'px,' + cy.toFixed(0) + 'px) rotate(' + (-a).toFixed(3) + 'rad)';
}

// ---------- cuadro a cuadro ----------
let antes = 0;
const enAncla = { v: null, previo: 0 };
function cuadro(ms, marco) {
  const t = ms / 1000, dt = Math.min(0.1, Math.max(0, t - antes || 0.016));
  antes = t;
  portal.actualizar(t, dt);
  if (mundo) mundo.actualizar(t, dt);
  if (marcador.visible) { const d = camara.getWorldPosition(new T.Vector3()).distanceTo(marcador.getWorldPosition(new T.Vector3())); marcador.scale.setScalar(Math.max(0.2, d * 0.09) * (1 + Math.sin(t * 5) * 0.12)); }
  if (sala.visible) sala.userData.polvo.rotation.y = t * 0.02;
  if (renderer.xr.isPresenting) cuadroAR(marco);
  else moverCamara(dt);
  flecha();
  extra.cuadro(t, dt);
  renderer.render(escena, camara);
}

// ======================= Realidad aumentada (WebXR) =======================
// La sesión, el ancla (el portal queda fijo en el cuarto aunque el estudiante
// camine o gire 360°) y la recuperación del seguimiento: js/realidad-aumentada.js.
let ar = { sesion: null };
const hayAR = () => (window.ProlipaAR ? window.ProlipaAR.disponible() : Promise.resolve(false));
async function iniciarAR() {
  mostrarHud(); // la capa del tour es la que se ve sobre la cámara (dom-overlay)
  $('b-foto').hidden = true;
  $('tarjeta').hidden = true;
  ar = window.ProlipaAR.crear({
    THREE: T, renderer, camara, objeto: ancla, reticula, raiz: $('hud'),
    alColocar: colocadoAR,
    alTocar: (rayo, tipo) => { if (tipo === 'toque') extra.tocarRayo(rayo); },
    alSeguimiento: (bien) => { $('aviso-seguimiento').hidden = bien; },
    alTerminar: finAR,
  });
  await ar.iniciar();
  escena.background = null;
  sala.visible = false;
  portal.cerrar();
  estado.modo = 'ar';
  estado.fase = 'ar-buscando';
  $('aviso-ar').hidden = false;
  $('tarjeta').hidden = true;
  $('b-entrar').hidden = true;
}
function cuadroAR(marco) {
  ar.cuadro(marco);
  // Caminar a través del portal: se entra o se sale del mundo.
  if (ar.colocado && portal.abierto()) {
    enAncla.v = ancla.worldToLocal(camara.getWorldPosition(enAncla.v || new T.Vector3()));
    const z = enAncla.v.z, cerca = Math.hypot(enAncla.v.x, enAncla.v.y - PORTAL.altura) < PORTAL.radio * 1.15;
    if (cerca && enAncla.previo > 0 && z <= 0) ponerDentro(true);
    else if (cerca && enAncla.previo < 0 && z >= 0) ponerDentro(false);
    enAncla.previo = z;
  }
}
function colocadoAR() {
  enAncla.previo = 1;
  $('aviso-ar').hidden = true;
  $('b-entrar').hidden = false;
  abrirPortal();
  extra.iniciar();
  estado.fase = 'tour';
  setTimeout(() => mostrarParada(-1), MOVIMIENTO ? 900 : 0);
}
function finAR() {
  ar = { sesion: null };
  estado.modo = '3d';
  escena.background = fondo3D;
  $('aviso-seguimiento').hidden = true;
  sala.visible = !estado.dentro;
  ajustar();
  volverAlInicio();
}

// ======================= Experiencia (mejoras sobre el tour) =======================
// Todo esto es "extra": cada parte está protegida (try/catch) para que, si algo
// falla en un dispositivo, el portal y el tour sigan funcionando igual.
//  1) Sonido ambiente de cada mundo (sintetizado, sin archivos): océano y
//     truenos que llegan después del rayo, latidos en el cuerpo, selva con
//     pájaros… Baja solo mientras habla la guía. Botón 🎵.
//  2) Hiperespacio al cruzar el portal (pantalla): la vista se estira y pasan
//     estelas de luz. En el celular, además, vibra.
//  3) Puntos interactivos: cada parada flota en el mundo como un ícono
//     brillante; tocarlo lleva a esa parada (también en realidad aumentada).
//  4) Recorrido automático (⏯): al terminar de narrar, pasa solo a la siguiente.
//  5) 📸 Postal: una foto del viaje con el título, para guardar.
const extra = (function () {
  const seguro = (fn) => function () { try { return fn.apply(null, arguments); } catch (e) { console.warn('BioPortal (extra):', e); } };
  const vibrar = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };

  // ---------- 1) Sonido ambiente ----------
  const amb = { ctx: null, salida: null, nodos: [], relojes: [], mundo: '', activo: leer('bioportal.ambiente') !== 'no', nivel: 0 };
  function ctxAudio() {
    if (!amb.ctx) {
      amb.ctx = audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      amb.salida = amb.ctx.createGain();
      amb.salida.gain.value = 0;
      amb.salida.connect(amb.ctx.destination);
    }
    if (amb.ctx.state === 'suspended') amb.ctx.resume().catch(() => {});
    return amb.ctx;
  }
  function ruido(segundos) {
    const c = amb.ctx, b = c.createBuffer(1, c.sampleRate * segundos, c.sampleRate), d = b.getChannelData(0);
    let ult = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; ult = (ult + 0.02 * w) / 1.02; d[i] = ult * 3.5; } // ruido "marrón": grave y suave
    return b;
  }
  function fuenteRuido(filtro, frec, q, vol) {
    const c = amb.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = ruido(4); s.loop = true;
    f.type = filtro; f.frequency.value = frec; f.Q.value = q || 0.7;
    g.gain.value = vol;
    s.connect(f).connect(g).connect(amb.salida);
    s.start();
    amb.nodos.push(s, f, g);
    return g;
  }
  function oscilador(tipo, frec, vol) {
    const c = amb.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = tipo; o.frequency.value = frec; g.gain.value = vol;
    o.connect(g).connect(amb.salida); o.start();
    amb.nodos.push(o, g);
    return { o, g };
  }
  // Ondas lentas: el volumen sube y baja (olas, respiración).
  function ola(g, base, cuanto, periodo) {
    const c = amb.ctx, lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 1 / periodo; lg.gain.value = cuanto;
    lfo.connect(lg).connect(g.gain); lfo.start();
    g.gain.value = base;
    amb.nodos.push(lfo, lg);
  }
  function golpe(frec, frec2, dur, vol, tipo, retraso) {
    const c = amb.ctx, t = c.currentTime + (retraso || 0), o = c.createOscillator(), g = c.createGain();
    o.type = tipo || 'sine'; o.frequency.setValueAtTime(frec, t); if (frec2) o.frequency.exponentialRampToValueAtTime(frec2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(amb.salida); o.start(t); o.stop(t + dur + 0.05);
  }
  function trueno(retraso, fuerza) {
    const c = amb.ctx, t = c.currentTime + retraso, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = ruido(3); f.type = 'lowpass'; f.frequency.value = 160 + Math.random() * 120;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9 * fuerza, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    s.connect(f).connect(g).connect(amb.salida); s.start(t); s.stop(t + 2.8);
  }
  function repetir(fn, min, max) {
    const una = () => { amb.relojes.push(setTimeout(() => { if (amb.mundo) { seguro(fn)(); una(); } }, (min + Math.random() * (max - min)) * 1000)); };
    una();
  }
  const PAISAJES = {
    'tierra-primitiva': () => {
      ola(fuenteRuido('lowpass', 420, 0.8, 0.5), 0.45, 0.25, 6); // océano hirviente
      fuenteRuido('bandpass', 1800, 2, 0.04); // burbujeo
      repetir(() => golpe(90 + Math.random() * 60, 40, 0.5, 0.15, 'sine'), 1.5, 4); // volcanes que retumban
    },
    celula: () => {
      oscilador('sine', 55, 0.12); oscilador('sine', 82.5, 0.06);
      fuenteRuido('bandpass', 600, 1.2, 0.05);
      repetir(() => golpe(500 + Math.random() * 700, 900, 0.18, 0.06, 'sine'), 0.4, 1.4); // burbujitas del citoplasma
    },
    cuerpo: () => {
      ola(fuenteRuido('lowpass', 300, 0.7, 0.35), 0.3, 0.15, 0.9); // la sangre que corre
      repetir(() => { golpe(62, 40, 0.18, 0.5, 'sine'); golpe(55, 35, 0.2, 0.35, 'sine', 0.26); }, 0.95, 0.95); // latido
    },
    ecosistema: () => {
      ola(fuenteRuido('bandpass', 700, 0.6, 0.12), 0.1, 0.06, 7); // viento entre los árboles
      fuenteRuido('highpass', 2500, 0.5, 0.025); // el río
      repetir(() => { const f = 2200 + Math.random() * 1600; golpe(f, f * 1.4, 0.12, 0.08, 'sine'); golpe(f * 1.1, f * 0.9, 0.1, 0.06, 'sine', 0.14); }, 1.2, 3.5); // pájaros
    },
    molecular: () => {
      oscilador('sine', 220, 0.05); oscilador('sine', 221.3, 0.05); oscilador('triangle', 330, 0.025);
      repetir(() => golpe(1200 + Math.random() * 1800, 0, 0.35, 0.05, 'sine'), 0.6, 1.8); // destellos
    },
  };
  function pararAmbiente() {
    amb.relojes.forEach(clearTimeout); amb.relojes = [];
    amb.nodos.forEach((n) => { try { if (n.stop) n.stop(); n.disconnect(); } catch (e) {} });
    amb.nodos = [];
    amb.mundo = '';
  }
  const iniciarAmbiente = seguro(() => {
    if (!amb.activo || !estado.tour) return;
    ctxAudio();
    if (amb.mundo === estado.tour.mundo) return;
    pararAmbiente();
    amb.mundo = estado.tour.mundo;
    (PAISAJES[amb.mundo] || PAISAJES['tierra-primitiva'])();
  });
  // Volumen: fuerte adentro, suave afuera (se oye "a través" del portal) y más bajo mientras habla la guía.
  function volumenAmbiente() {
    if (!amb.ctx || !amb.salida) return;
    const habla = window.speechSynthesis && speechSynthesis.speaking;
    const meta = !amb.activo || estado.fase === 'inicio' ? 0 : (estado.dentro ? 0.55 : 0.22) * (habla ? 0.45 : 1);
    amb.nivel += (meta - amb.nivel) * 0.06;
    amb.salida.gain.value = amb.nivel;
  }
  function pintarAmbiente() {
    const b = $('b-ambiente');
    if (!b) return;
    b.textContent = amb.activo ? '🎵' : '🔇';
    b.setAttribute('aria-pressed', String(amb.activo));
    b.title = amb.activo ? 'Sonido del mundo: activado' : 'Sonido del mundo: apagado';
  }
  function alternarAmbiente() {
    amb.activo = !amb.activo;
    guardar('bioportal.ambiente', amb.activo ? 'si' : 'no');
    if (amb.activo) iniciarAmbiente(); else { pararAmbiente(); }
    pintarAmbiente();
  }

  // ---------- 2) Hiperespacio ----------
  const viaje = { t: -1, estelas: null, fov: 60 };
  function crearEstelas() {
    const N = 140, pos = new Float32Array(N * 6), datos = [];
    for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, r = 0.6 + Math.random() * 2.4; datos.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: -2 - Math.random() * 14, v: 10 + Math.random() * 14 }); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const l = new T.LineSegments(geo, new T.LineBasicMaterial({ color: '#e0f2fe', transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending }));
    l.renderOrder = 20; l.frustumCulled = false; l.visible = false;
    l.userData.datos = datos;
    escena.add(l);
    return l;
  }
  const hiperespacio = seguro(() => {
    if (!MOVIMIENTO || !renderer || renderer.xr.isPresenting) return;
    if (!viaje.estelas) viaje.estelas = crearEstelas();
    viaje.estelas.material.color.set(mundo ? mundo.color : '#e0f2fe');
    viaje.t = 0;
  });
  function cuadroViaje(dt) {
    if (viaje.t < 0 || !viaje.estelas) return;
    viaje.t += dt / 1.1;
    const p = Math.min(1, viaje.t), fuerza = Math.sin(p * Math.PI);
    camara.fov = viaje.fov + fuerza * 32;
    camara.updateProjectionMatrix();
    const e = viaje.estelas, a = e.geometry.attributes.position.array;
    e.visible = true;
    e.material.opacity = fuerza * 0.9;
    e.position.copy(camara.position); e.quaternion.copy(camara.quaternion);
    e.userData.datos.forEach((d, i) => {
      d.z += d.v * dt; if (d.z > -0.5) d.z = -16;
      const largo = 0.4 + fuerza * 2.2;
      a.set([d.x, d.y, d.z, d.x * 1.04, d.y * 1.04, d.z + largo], i * 6);
    });
    e.geometry.attributes.position.needsUpdate = true;
    if (p >= 1) { viaje.t = -1; e.visible = false; camara.fov = viaje.fov; camara.updateProjectionMatrix(); }
  }

  // ---------- 3) Puntos interactivos ----------
  const hot = { grupo: null, lista: [], raycaster: null };
  function texturaPunto(emoji, color) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const r = x.createRadialGradient(64, 64, 20, 64, 64, 62);
    r.addColorStop(0, 'rgba(255,255,255,.95)'); r.addColorStop(0.62, 'rgba(255,255,255,.95)'); r.addColorStop(0.7, color); r.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = r; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.fill();
    x.font = '58px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(emoji, 64, 68);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
    return t;
  }
  const crearPuntos = seguro(() => {
    quitarPuntos();
    if (!mundo || !estado.tour) return;
    hot.grupo = new T.Group();
    estado.tour.paradas.forEach((p, i) => {
      const pos = mundo.puntos[p.punto];
      if (!pos) return;
      const s = new T.Sprite(new T.SpriteMaterial({ map: texturaPunto(p.emoji || '✨', mundo.color), transparent: true, depthTest: false, depthWrite: false }));
      sinStencil(s.material, estado.dentro ? T.AlwaysStencilFunc : T.EqualStencilFunc);
      s.renderOrder = 9;
      s.position.copy(pos).add(new T.Vector3(0, 0.6, 0));
      s.userData = { parada: i, base: s.position.clone(), fase: Math.random() * 6 };
      hot.grupo.add(s);
      hot.lista.push(s);
    });
    ancla.add(hot.grupo);
  });
  function quitarPuntos() {
    if (!hot.grupo) return;
    ancla.remove(hot.grupo);
    hot.lista.forEach((s) => { s.material.map.dispose(); s.material.dispose(); });
    hot.grupo = null; hot.lista = [];
  }
  function cuadroPuntos(t) {
    if (!hot.grupo) return;
    const ver = estado.fase === 'tour' || estado.fase === 'final';
    hot.grupo.visible = ver;
    if (!ver) return;
    const cam = camara.getWorldPosition(new T.Vector3());
    hot.lista.forEach((s) => {
      const actual = s.userData.parada === estado.i;
      s.visible = !actual; // la parada actual ya tiene su marcador
      s.position.copy(s.userData.base); s.position.y += Math.sin(t * 1.6 + s.userData.fase) * 0.15;
      const d = cam.distanceTo(s.getWorldPosition(new T.Vector3()));
      s.scale.setScalar(Math.max(0.35, d * 0.075));
      s.material.opacity = s.userData.parada < estado.i ? 0.55 : 1; // las ya visitadas, más tenues
    });
  }
  // Tocar un punto (pantalla: x, y; realidad aumentada: un rayo).
  const tocarPunto = seguro((rayo) => {
    if (!hot.lista.length || (estado.fase !== 'tour' && estado.fase !== 'final')) return false;
    hot.raycaster = hot.raycaster || new T.Raycaster();
    hot.raycaster.camera = camara;
    hot.raycaster.ray.copy(rayo);
    const hit = hot.raycaster.intersectObjects(hot.lista.filter((s) => s.visible), false)[0];
    if (!hit) return false;
    estado.fase = 'tour';
    vibrar(25);
    SONIDO.parada();
    mostrarParada(hit.object.userData.parada);
    return true;
  });
  function tocarPantalla(x, y) {
    if (!T || !camara) return false;
    const rc = new T.Raycaster();
    rc.setFromCamera(new T.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camara);
    return tocarPunto(rc.ray);
  }

  // ---------- 4) Recorrido automático ----------
  const auto = { activo: leer('bioportal.auto') === 'si', reloj: 0 };
  function pintarAuto() {
    const b = $('b-auto');
    if (!b) return;
    b.setAttribute('aria-pressed', String(auto.activo));
    b.title = auto.activo ? 'Recorrido automático: activado' : 'Recorrido automático: apagado';
    b.classList.toggle('activo', auto.activo);
  }
  function alternarAuto() {
    auto.activo = !auto.activo;
    guardar('bioportal.auto', auto.activo ? 'si' : 'no');
    pintarAuto();
    if (auto.activo && estado.fase === 'tour' && !(window.speechSynthesis && speechSynthesis.speaking)) programarAuto(1200);
    else if (!auto.activo) clearTimeout(auto.reloj);
  }
  function programarAuto(ms) {
    clearTimeout(auto.reloj);
    if (!auto.activo || estado.fase !== 'tour') return;
    const i = estado.i;
    auto.reloj = setTimeout(() => {
      // Solo si el estudiante no hizo nada mientras tanto (no cambió de parada, no está preguntando).
      const escribiendo = document.activeElement && document.activeElement.id === 'texto-pregunta';
      if (estado.i !== i || estado.fase !== 'tour' || !$('respuesta').hidden || escribiendo || (window.speechSynthesis && speechSynthesis.speaking)) return;
      siguiente();
    }, ms);
  }

  // ---------- 5) Postal ----------
  const postal = seguro(() => {
    if (!renderer || renderer.xr.isPresenting) return;
    renderer.render(escena, camara);
    const foto = renderer.domElement.toDataURL('image/jpeg', 0.92);
    const img = new Image();
    img.onload = () => {
      const W = 1280, H = Math.round(W * img.height / img.width), M = 28, pie = 96;
      const c = document.createElement('canvas'); c.width = W + M * 2; c.height = H + M * 2 + pie;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, c.width, c.height); g.addColorStop(0, '#1e3a8a'); g.addColorStop(0.5, '#2563eb'); g.addColorStop(1, '#38bdf8');
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, M, M, W, H);
      x.fillStyle = '#fff'; x.textBaseline = 'middle';
      x.font = '800 38px system-ui, Segoe UI, sans-serif';
      x.fillText('🌀 BioPortal · ' + (estado.tour ? estado.tour.titulo : ''), M + 6, H + M + pie / 2 - 14);
      x.font = '600 24px system-ui, Segoe UI, sans-serif';
      const p = estado.tour && estado.tour.paradas[estado.i];
      x.fillText((p ? p.emoji + ' ' + p.titulo + ' · ' : '') + new Date().toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }), M + 6, H + M + pie / 2 + 24);
      const a = document.createElement('a');
      a.download = 'postal-bioportal.jpg';
      a.href = c.toDataURL('image/jpeg', 0.9);
      document.body.appendChild(a); a.click(); a.remove();
    };
    img.src = foto;
    destello();
    tono([[1800, 0, 0.05, 'square', 0, 0.06], [1200, 0.06, 0.08, 'square', 0, 0.05]]); // "clic" de cámara
  });

  return {
    // Al elegir el mundo: puntos y trueno sincronizado con cada rayo.
    alMundo: seguro(() => {
      crearPuntos();
      if (mundo) mundo.alRayo = (dist) => { if (amb.mundo && amb.ctx) trueno(Math.min(2.5, 0.25 + dist / 30), Math.max(0.35, 1 - dist / 60)); };
      if (amb.mundo && estado.tour && amb.mundo !== estado.tour.mundo) iniciarAmbiente();
    }),
    alCruzar: seguro((si) => {
      if (hot.grupo) hot.lista.forEach((s) => { s.material.stencilFunc = si ? T.AlwaysStencilFunc : T.EqualStencilFunc; });
      if (si) { hiperespacio(); vibrar([40, 30, 90]); }
    }),
    iniciar: iniciarAmbiente,
    parar: seguro(() => { pararAmbiente(); clearTimeout(auto.reloj); }),
    cuadro: seguro((t, dt) => { cuadroViaje(dt); cuadroPuntos(t); volumenAmbiente(); }),
    alNarrar: seguro((texto, conVoz) => { if (conVoz) programarAuto(1800); else programarAuto(Math.min(14000, 2500 + (texto || '').length * 55)); }),
    alParada: seguro(() => { clearTimeout(auto.reloj); }),
    tocarPantalla: (x, y) => { try { return tocarPantalla(x, y); } catch (e) { return false; } },
    tocarRayo: (r) => { try { return tocarPunto(r); } catch (e) { return false; } },
    alternarAmbiente, alternarAuto, postal,
    pintar: seguro(() => { pintarAmbiente(); pintarAuto(); }),
  };
})();

// ======================= Tour =======================
const estado = { fase: 'inicio', modo: '3d', tour: null, i: -1, dentro: false, tema: '', pedido: false };
function mostrarHud() {
  $('inicio').hidden = true;
  $('esquina-inicio').hidden = true;
  document.querySelector('body > .esquina.der').hidden = true;
  $('hud').hidden = false;
  $('titulo-tour').textContent = (EMOJI_MUNDO[estado.tour.mundo] || '🌀') + ' ' + estado.tour.titulo;
  pintarVoz();
}
function abrirPortal() { portal.abrir(); SONIDO.abrir(); }
async function empezar(modo) {
  if (!estado.tour || !renderer) return;
  callar();
  if (modo === 'ar') {
    try { await iniciarAR(); } catch (e) { console.warn('BioPortal: no se pudo abrir la realidad aumentada.', e); avisar('No se pudo abrir la realidad aumentada en este dispositivo. Se abrirá aquí en la pantalla.'); empezar('3d'); }
    return;
  }
  estado.modo = '3d';
  estado.fase = 'tour';
  mostrarHud();
  $('b-foto').hidden = false;
  extra.iniciar();
  $('b-entrar').hidden = false;
  vista.objPos.set(0, 1.35, VISTA_FUERA());
  mirarA(new T.Vector3(0, PORTAL.altura, 0));
  if (!portal.abierto()) abrirPortal();
  mostrarParada(-1);
}
function pintarPuntos() {
  const n = estado.tour.paradas.length, caja = $('puntos');
  caja.textContent = '';
  for (let k = 0; k < n; k++) { const i = document.createElement('i'); if (k < estado.i) i.className = 'hecho'; else if (k === estado.i) i.className = 'ahora'; caja.appendChild(i); }
}
function mostrarParada(i) {
  const tr = estado.tour, n = tr.paradas.length;
  estado.i = i;
  callar();
  const tarjeta = $('tarjeta');
  tarjeta.hidden = false;
  tarjeta.classList.remove('entra'); void tarjeta.offsetWidth; tarjeta.classList.add('entra');
  $('respuesta').hidden = true;
  $('b-siguiente').classList.remove('pulso');
  let texto;
  if (i < 0) {
    $('p-emoji').textContent = EMOJI_MUNDO[tr.mundo] || '🌀';
    $('p-contador').textContent = 'Bienvenida';
    $('p-titulo').textContent = tr.titulo;
    texto = tr.bienvenida || '¡Bienvenido! Mira a través del portal y acompáñame en este recorrido.';
    $('b-siguiente').textContent = estado.modo === '3d' && !estado.dentro ? '🚪 Entrar y empezar' : 'Empezar el tour ▶';
    $('b-anterior').disabled = true;
    marcador.visible = false;
  } else {
    const p = tr.paradas[i];
    $('p-emoji').textContent = p.emoji;
    $('p-contador').textContent = 'Parada ' + (i + 1) + ' de ' + n;
    $('p-titulo').textContent = p.titulo;
    texto = p.narracion;
    $('b-siguiente').textContent = i + 1 < n ? 'Siguiente ▶' : 'Terminar 🏁';
    $('b-anterior').disabled = false;
    const punto = mundo && mundo.puntos[p.punto];
    marcador.visible = !!punto;
    if (punto) {
      marcador.position.copy(punto);
      if (estado.modo === '3d') { if (!estado.dentro) vista.objPos.copy(vistaDentro()); mirarA(punto, false, camara.aspect < 0.8 ? 0.3 : 0.2); }
    }
    SONIDO.parada();
  }
  $('p-texto').textContent = texto;
  pintarPuntos();
  extra.alParada(i);
  const conVoz = hablar(texto, () => { $('b-siguiente').classList.add('pulso'); if (estado.i === i) extra.alNarrar(texto, true); });
  if (!conVoz) extra.alNarrar(texto, false);
}
function siguiente() {
  const n = estado.tour.paradas.length;
  if (estado.i < 0 && estado.modo === '3d' && !estado.dentro) {
    // Vuela a través del portal y empieza la primera parada.
    callar();
    vista.objPos.copy(vistaDentro());
    mirarA(new T.Vector3(0, 1.6, -12));
    $('tarjeta').hidden = true;
    setTimeout(() => { if (estado.fase === 'tour') mostrarParada(0); }, MOVIMIENTO ? 1600 : 0);
    return;
  }
  if (estado.i + 1 >= n) return terminar();
  mostrarParada(estado.i + 1);
}
function anterior() { if (estado.i > 0) mostrarParada(estado.i - 1); else if (estado.i === 0) mostrarParada(-1); }
function entrarSalir() {
  if (estado.modo === 'ar') { ponerDentro(!estado.dentro); return; }
  if (estado.dentro) { vista.objPos.set(0, 1.35, VISTA_FUERA()); mirarA(new T.Vector3(0, PORTAL.altura, 0)); }
  else { vista.objPos.copy(vistaDentro()); const p = marcador.visible ? marcador.position.clone() : new T.Vector3(0, 1.6, -12); mirarA(p); }
}
function terminar() {
  callar();
  estado.fase = 'final';
  estado.i = estado.tour.paradas.length;
  marcador.visible = false;
  $('flecha').hidden = true;
  $('p-emoji').textContent = '🏁';
  $('p-contador').textContent = 'Fin del tour';
  $('p-titulo').textContent = '¡Lo lograste!';
  const t = estado.tour.despedida || '¡Gracias por recorrer este mundo conmigo!';
  $('p-texto').textContent = t;
  $('respuesta').hidden = true;
  pintarPuntos();
  $('b-siguiente').textContent = '🔁 Repetir el tour';
  $('b-anterior').disabled = false;
  SONIDO.fin();
  hablar(t);
}
function clicSiguiente() {
  if (estado.fase === 'final') { estado.fase = 'tour'; mostrarParada(0); return; }
  siguiente();
}
function cerrarPortal() {
  callar();
  if (renderer && renderer.xr.isPresenting && ar.sesion) { ar.sesion.end().catch(() => {}); return; } // finAR vuelve al inicio
  volverAlInicio();
}
function volverAlInicio() {
  callar();
  extra.parar();
  estado.fase = 'inicio';
  estado.i = -1;
  $('hud').hidden = true;
  $('tarjeta').hidden = true;
  $('aviso-ar').hidden = true;
  $('inicio').hidden = false;
  $('esquina-inicio').hidden = false;
  document.querySelector('body > .esquina.der').hidden = false;
  if (marcador) marcador.visible = false;
  if (T) { vista.objPos.set(0, 1.35, VISTA_FUERA()); mirarA(new T.Vector3(0, 0.7, 0)); }
  pintarVoz();
}
async function enviarPregunta(texto) {
  texto = R.texto(texto, 200);
  if (texto.length < 2) return;
  callar();
  const caja = $('respuesta');
  caja.hidden = false;
  caja.className = 'pensando';
  caja.textContent = 'La guía está pensando…';
  $('texto-pregunta').value = '';
  const r = await preguntar(texto);
  caja.className = '';
  caja.textContent = r;
  hablar(r);
}
function avisar(t) {
  const e = $('estado');
  e.textContent = t;
}
// Preguntar con la voz (si el navegador tiene dictado).
function prepararDictado() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR || location.protocol === 'file:') return;
  const b = $('b-dictar');
  b.hidden = false;
  let rec = null;
  b.addEventListener('click', () => {
    if (rec) { rec.stop(); return; }
    callar();
    rec = new SR();
    rec.lang = 'es-ES';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    b.textContent = '⏺';
    let final = '';
    rec.onresult = (e) => { final = [...e.results].map((x) => x[0].transcript).join(' '); $('texto-pregunta').value = final; };
    rec.onend = () => { rec = null; b.textContent = '🎤'; if (final.trim()) enviarPregunta(final); };
    rec.onerror = () => {};
    try { rec.start(); } catch (e) { rec = null; b.textContent = '🎤'; }
  });
}

// ======================= Dentro de una actividad (botón "Portal") =======================
const EMBEBIDO = window.parent !== window;
const ACTIVIDAD = { tema: '', contexto: '', materia: null };
function avisarActividad(m) { if (EMBEBIDO) try { window.parent.postMessage(m, '*'); } catch (e) {} }
// "← Juegos" (volver al menú) solo con más de un juego activo.
function mostrarAtras(si) { $('b-juegos').hidden = !si; }
function irAJuegos() {
  callar();
  avisarActividad({ tipo: 'juego:navegando', nombre: 'los juegos' });
  location.href = 'juegos.html' + (estado.tema ? '?tema=' + encodeURIComponent(estado.tema) : '');
}
function volverActividad() { callar(); if (ar.sesion) ar.sesion.end().catch(() => {}); avisarActividad({ tipo: 'juego:cerrar' }); }
function recibirActividad(e) {
  if (!EMBEBIDO || e.source !== window.parent || !e.data || e.data.tipo !== 'juego:actividad') return;
  ACTIVIDAD.tema = R.texto(e.data.tema, 80);
  ACTIVIDAD.contexto = R.texto(e.data.contexto, 2500);
  if (e.data.materia && e.data.materia.nombre) ACTIVIDAD.materia = { id: R.texto(e.data.materia.id, 30), nombre: R.texto(e.data.materia.nombre, 40) };
  if (Array.isArray(e.data.juegos)) mostrarAtras(e.data.juegos.length > 1);
  if (ACTIVIDAD.tema) ponerTema(ACTIVIDAD.tema);
  prepararTour();
}
function ponerTema(t) {
  estado.tema = t;
  $('de-actividad').textContent = '«' + t + '»';
  $('de-actividad').hidden = !t;
}
// El tour se pide apenas se abre (del tema de la actividad o del ?tema= del QR).
let iaLista = null, escenaLista = null;
function prepararTour() {
  if (estado.pedido) return;
  estado.pedido = true;
  const tema = estado.tema, contexto = ACTIVIDAD.contexto;
  Promise.all([iaLista.then(() => pedirTour(tema, contexto)), escenaLista]).then(([tr]) => {
    estado.tour = tr;
    if (!renderer) return;
    ponerMundo(tr.mundo);
    abrirPortal(); // se ve el mundo a través del portal detrás de la tarjeta de inicio
    const m = R.MUNDOS[tr.mundo];
    const e = $('estado');
    e.textContent = '';
    const chip = document.createElement('span');
    chip.id = 'destino';
    chip.textContent = (EMOJI_MUNDO[tr.mundo] || '🌀') + ' Destino: ' + (m ? m.nombre : tr.titulo);
    e.appendChild(chip);
    $('b-pantalla').disabled = false;
    $('b-ar').disabled = false;
  });
}

// ======================= Código QR para el celular =======================
const esCelular = () => window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
function urlParaCelular() {
  const publicado = location.protocol === 'https:' && !/^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(location.hostname);
  const u = publicado ? new URL(location.href) : new URL('bioportal.html', (C.libro && C.libro.urlPublica) || PORTAL.urlPublica);
  u.hash = '';
  if (estado.tema) u.searchParams.set('tema', estado.tema); else u.searchParams.delete('tema');
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
function pintarVoz() {
  ['b-voz', 'b-voz-tour'].forEach((id) => { const b = $(id); b.textContent = vozActiva ? '🔊' : '🔈'; b.setAttribute('aria-pressed', String(vozActiva)); });
}
function alternarVoz() { vozActiva = !vozActiva; guardar('bioportal.voz', vozActiva ? 'si' : 'no'); if (!vozActiva) callar(); pintarVoz(); }
function quitarPrecarga() {
  const p = $('precarga');
  if (!p) return;
  p.classList.add('fuera');
  setTimeout(() => p.remove(), 400);
}
function iniciar() {
  const temaUrl = new URLSearchParams(location.search).get('tema') || '';
  ponerTema(temaUrl ? R.texto(temaUrl, 80) : '');
  pintarVoz();
  $('b-voz').addEventListener('click', alternarVoz);
  $('b-voz-tour').addEventListener('click', alternarVoz);
  $('b-pantalla').addEventListener('click', () => empezar('3d'));
  $('b-ar').addEventListener('click', () => empezar('ar'));
  $('b-qr').addEventListener('click', abrirQR);
  $('b-cerrar-qr').addEventListener('click', cerrarQR);
  $('qr').addEventListener('click', (e) => { if (e.target === $('qr')) cerrarQR(); });
  $('b-siguiente').addEventListener('click', clicSiguiente);
  $('b-anterior').addEventListener('click', () => { if (estado.fase === 'final') { estado.fase = 'tour'; mostrarParada(estado.tour.paradas.length - 1); } else anterior(); });
  $('b-repetir').addEventListener('click', () => hablar($('p-texto').textContent + ($('respuesta').hidden ? '' : ' ' + $('respuesta').textContent)));
  $('b-entrar').addEventListener('click', entrarSalir);
  $('b-ambiente').addEventListener('click', extra.alternarAmbiente);
  $('b-auto').addEventListener('click', extra.alternarAuto);
  $('b-foto').addEventListener('click', extra.postal);
  extra.pintar();
  $('b-cerrar').addEventListener('click', cerrarPortal);
  $('preguntar').addEventListener('submit', (e) => { e.preventDefault(); enviarPregunta($('texto-pregunta').value); });
  // En realidad aumentada, tocar la tarjeta o un botón no cuenta como "tocar el piso".
  $('hud').addEventListener('beforexrselect', (e) => { if (e.target.closest('button, input, form, #tarjeta')) e.preventDefault(); });
  prepararDictado();
  const cfgJuegos = window.JUEGOS_CONFIG;
  if (cfgJuegos) mostrarAtras(['biocabeza', 'biosalto', 'bioportal'].filter((k) => cfgJuegos[k] !== false).length > 1);
  $('b-juegos').addEventListener('click', irAJuegos);
  if (EMBEBIDO) {
    $('b-volver').hidden = false;
    $('b-volver').addEventListener('click', volverActividad);
    addEventListener('message', recibirActividad);
    avisarActividad({ tipo: 'juego:listo' });
  }
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('qr').hidden) return cerrarQR();
      if (estado.fase === 'inicio') { if (EMBEBIDO) volverActividad(); return; }
      return cerrarPortal();
    }
    if (e.target && e.target.tagName === 'INPUT') return;
    if (estado.fase === 'tour' || estado.fase === 'final') {
      if (e.key === 'ArrowRight') { e.preventDefault(); clicSiguiente(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); $('b-anterior').click(); }
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) callar(); });
  quitarPrecarga();
  iaLista = prepararIA().then((m) => {
    modoIA = m;
    if (!m) console.warn('BioPortal: sin IA, se usa el tour de ejemplo. Configura la clave en js/bioportal/config.local.js (o js/entrevista/config.local.js) o el servidor en js/entrevista/config.js (ia.proxyUrl).');
  });
  escenaLista = prepararEscena().catch((e) => {
    console.error('BioPortal: no se pudo preparar el 3D.', e);
    avisar('No se pudo abrir el portal: revisa tu conexión a internet o prueba con otro navegador.');
  });
  hayAR().then((si) => {
    if (si) $('b-ar').hidden = false;
    else if (!esCelular()) $('b-qr').hidden = false;
  });
  // Dentro de la actividad, el tema llega por mensaje; si no llega, se usa el de la dirección.
  if (EMBEBIDO) setTimeout(prepararTour, 2500); else prepararTour();
}
iniciar();
})();
