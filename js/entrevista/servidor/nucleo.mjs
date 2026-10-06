/* =========================================================================
   Servidor intermedio de la Entrevista con IA — lógica común
   (js/entrevista/servidor/nucleo.mjs)
   -------------------------------------------------------------------------
   Guarda la clave de Google (nunca llega al navegador), arma los prompts con
   las MISMAS reglas que el navegador (../reglas.js) y solo acepta las tareas
   de la clase: no se puede usar como chat libre.
   Usa solo APIs web estándar (fetch, Request, Response, crypto.subtle) y
   corre en Node 18+ (proxy-entrevista.mjs).

   Variables (secretos/entorno):
     GOOGLE_API_KEY        (obligatoria, SECRETO) clave de Google AI Studio
     ORIGENES_PERMITIDOS   páginas que pueden usarlo, separadas por coma
                           (ej. https://usuario.github.io,http://localhost:*)
                           "puerto *" = cualquier puerto; "*" = todas (solo pruebas)
     GEMINI_MODELO         por defecto gemini-3.5-flash-lite
     VOZ_MODELOS           modelos de voz separados por coma, en orden
     LIMITE_CHAT_POR_HORA, LIMITE_CIERRE_POR_HORA, LIMITE_VOZ_POR_HORA,
     LIMITE_TRANSCRIBIR_POR_HORA, LIMITE_PREGUNTAS_POR_HORA
                           por IP (un colegio suele salir por una sola IP)

   Rutas (POST con JSON):
     /api/entrevista/chat    { datos, historial, pregunta } → { enTema, texto, pizarra, siguientes }
     /api/entrevista/cierre  { datos, historial }           → { despedida, aprendizajes, … }
     /api/voz                { texto, voz }                 → { audio (base64), mime }
     /api/transcribir        { audio (base64 WAV) }         → { texto }
     /api/biocabeza/preguntas { tema, cantidad, nivel, contexto, libro, publico } → { tema, preguntas }
     /api/biosalto/preguntas  { tema, cantidad, nivel, contexto, libro, publico } → { tema, preguntas }
     /api/bioportal/tour      { tema, paradas, contexto, libro, publico }       → { mundo, titulo, bienvenida, paradas, despedida }
     /api/bioportal/pregunta  { tema, mundo, parada, pregunta, libro, publico } → { respuesta }
     GET /api/salud                                         → { ok, modelo }
   ========================================================================= */
import '../reglas.js'; // define globalThis.EntrevistaReglas (mismas reglas que el navegador)
import '../../biocabeza/reglas.js'; // define globalThis.BioCabezaReglas (juego BioCabeza)
import '../../biosalto/reglas.js'; // define globalThis.BioSaltoReglas (juego BioSalto)
import '../../bioportal/reglas.js'; // define globalThis.BioPortalReglas (BioPortal)

const R = globalThis.EntrevistaReglas;
const B = globalThis.BioCabezaReglas;
const S = globalThis.BioSaltoReglas;
const P = globalThis.BioPortalReglas;
const URL_GOOGLE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const VOZ_POR_DEFECTO = 'gemini-3.8-flash-lite-tts,gemini-3.8-flash-tts,gemini-3.1-flash-tts-preview,gemini-2.5-flash-preview-tts';
const texto = R.texto;
const entre = (v, min, max, def) => Math.min(max, Math.max(min, Number(v) || def));

// Crea el manejador con la configuración (env). Devuelve (request, ip) → Response.
export function crearServidor(env) {
  const CLAVE = env.GOOGLE_API_KEY || '';
  const MODELO = env.GEMINI_MODELO || 'gemini-3.5-flash-lite';
  const VOZ_MODELOS = String(env.VOZ_MODELOS || VOZ_POR_DEFECTO).split(',').map((s) => s.trim()).filter(Boolean);
  const ORIGENES = String(env.ORIGENES_PERMITIDOS || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  const LIMITES = {
    chat: Number(env.LIMITE_CHAT_POR_HORA || 900),
    cierre: Number(env.LIMITE_CIERRE_POR_HORA || 200),
    voz: Number(env.LIMITE_VOZ_POR_HORA || 900),
    transcribir: Number(env.LIMITE_TRANSCRIBIR_POR_HORA || 600),
    preguntas: Number(env.LIMITE_PREGUNTAS_POR_HORA || 300),
  };

  // ---------- CORS: solo las páginas del libro ----------
  function origenPermitido(origen) {
    if (!origen) return false;
    return ORIGENES.some((o) => o === '*' || o === origen || (o.endsWith(':*') && origen.startsWith(o.slice(0, -1)) && /^\d+$/.test(origen.slice(o.length - 1))));
  }
  function cabeceras(origen, extra) {
    const h = { 'Content-Type': 'application/json; charset=utf-8', ...(extra || {}) };
    if (origenPermitido(origen)) {
      h['Access-Control-Allow-Origin'] = origen;
      h['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
      h['Access-Control-Allow-Headers'] = 'Content-Type';
      h['Access-Control-Max-Age'] = '86400';
      h.Vary = 'Origin';
    }
    return h;
  }

  // ---------- Límite por IP (en memoria) ----------
  const cuentas = new Map();
  function dentroDelLimite(ip, tipo) {
    const ahora = Date.now();
    if (cuentas.size > 5000) for (const [k, c] of cuentas) if (ahora - c.desde > 3600000) cuentas.delete(k);
    const k = tipo + '|' + ip;
    const c = cuentas.get(k);
    if (!c || ahora - c.desde > 3600000) { cuentas.set(k, { n: 1, desde: ahora }); return true; }
    c.n += 1;
    return c.n <= LIMITES[tipo];
  }

  // ---------- Gemini ----------
  function pensamiento(modelo) {
    const v = /gemini-(\d+)/i.exec(modelo || '');
    return v && Number(v[1]) < 3 ? { thinkingBudget: 0 } : { thinkingLevel: 'minimal' };
  }
  async function comprobar(r) {
    if (r.ok) return r.json();
    const e = new Error('IA ' + r.status);
    e.status = r.status;
    e.detalle = (await r.text().catch(() => '')).slice(0, 400);
    throw e;
  }
  // UN reintento: si tardó demasiado, al instante (la siguiente petición suele
  // salir en 1-2 s); si está saturada o en el límite, tras 2 s.
  async function conReintento(fn) {
    try {
      return await fn();
    } catch (e) {
      if (e.name === 'TimeoutError' || e.name === 'AbortError') return fn();
      if (![429, 500, 503].includes(e.status)) throw e;
      await new Promise((ok) => setTimeout(ok, 2000));
      return fn();
    }
  }
  const textoDe = (j) => (j?.candidates?.[0]?.content?.parts || []).map((x) => (x.thought ? '' : x.text || '')).join('').trim();
  function llamar(modelo, cuerpo, ms) {
    return fetch(URL_GOOGLE + encodeURIComponent(modelo) + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': CLAVE },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(ms),
    });
  }
  // turnos: [{ rol: 'personaje' | 'estudiante', texto }] → texto de la respuesta
  async function generar(sistema, turnos, { maxTokens = 400, temperatura = 0.7, json = false, ms = 8000 } = {}) {
    const pedir = (conPensamiento) => {
      const gen = { maxOutputTokens: maxTokens, temperature: temperatura };
      if (conPensamiento) gen.thinkingConfig = pensamiento(MODELO);
      if (json) gen.responseMimeType = 'application/json';
      return llamar(MODELO, {
        systemInstruction: { parts: [{ text: sistema }] },
        contents: turnos.map((t) => ({ role: t.rol === 'personaje' ? 'model' : 'user', parts: [{ text: t.texto }] })),
        generationConfig: gen,
      }, ms).then(comprobar);
    };
    // Si el modelo no acepta la opción de pensamiento (400), se pide sin ella.
    return textoDe(await conReintento(() => pedir(true).catch((e) => {
      if (e.status === 400 && !/API[_ ]?key/i.test(e.detalle || '')) return pedir(false);
      throw e;
    })));
  }

  // ---------- Datos de la clase (vienen del navegador: se validan) ----------
  function datosClase(e) {
    const d = e && typeof e === 'object' ? e : {};
    return {
      personaje: R.personaje(d.personaje),
      libro: texto(d.libro, 80) || 'el libro',
      publico: texto(d.publico, 100) || 'estudiantes',
      tema: texto(d.tema, 3000),
      maxPalabras: entre(d.maxPalabras, 25, 120, 45),
    };
  }
  function historial(h, max) {
    const lista = (Array.isArray(h) ? h : []).slice(-max)
      .filter((m) => m && (m.rol === 'personaje' || m.rol === 'estudiante'))
      .map((m) => ({ rol: m.rol, texto: texto(m.texto, 700) }))
      .filter((m) => m.texto);
    while (lista.length && lista[0].rol !== 'estudiante') lista.shift(); // Gemini empieza con el usuario
    return lista;
  }
  function falla(e) {
    if (e.status === 429) return [429, { error: 'la IA llegó a su límite de uso' }];
    if (e.status) return [502, { error: 'la IA respondió ' + e.status }];
    return [504, { error: 'la IA no respondió a tiempo' }];
  }

  async function chat(e) {
    const d = datosClase(e.datos);
    const pregunta = texto(e.pregunta, 300);
    if (pregunta.length < 2) return [400, { error: 'pregunta vacía' }];
    if (R.tieneDatosPersonales(pregunta)) return [400, { error: 'datos personales' }];
    const turnos = historial(e.historial, 10).concat([{ rol: 'estudiante', texto: pregunta }]);
    try {
      const r = R.normalizarRespuesta(await generar(R.chat(d), turnos, { maxTokens: 600, temperatura: 0.7, json: true }), d.maxPalabras);
      return r.texto ? [200, r] : [502, { error: 'sin respuesta' }];
    } catch (err) { return falla(err); }
  }

  async function cierre(e) {
    const d = datosClase(e.datos);
    const h = historial(e.historial, 30);
    if (!h.length) return [400, { error: 'clase vacía' }];
    const p = R.cierre(d, h);
    try {
      let r = null;
      for (let i = 0; i < 2 && !r; i++) {
        r = R.normalizarCierre(await generar(p.sistema, [{ rol: 'estudiante', texto: p.usuario }], { json: true, maxTokens: 900, temperatura: 0.4, ms: 20000 }));
      }
      return r ? [200, r] : [502, { error: 'sin resumen' }];
    } catch (err) { return falla(err); }
  }

  // ---------- Voz: texto → audio (base64; el navegador le pone la cabecera WAV) ----------
  const cacheVoz = new Map();
  const agotados = new Map(); // modelo de voz → hasta cuándo no tiene cupo (se salta)
  async function huella(t) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  // Los audios repetidos (saludos…) se guardan en memoria y se comparten.
  async function voz(e) {
    const frase = texto(e.texto, 1000);
    const nombre = /^[A-Za-z]{3,20}$/.test(e.voz || '') ? e.voz : 'Puck';
    if (frase.length < 2) return [400, { error: 'texto vacío' }];
    const clave = await huella(nombre + '|' + frase);
    const guardado = cacheVoz.get(clave);
    if (guardado) return [200, guardado];
    const disponibles = VOZ_MODELOS.filter((m) => !(agotados.get(m) > Date.now()));
    if (!disponibles.length) return [429, { error: 'la voz no tiene cupo', diario: true }];
    let r = null, diario = false;
    for (const modelo of disponibles) {
      // Lleno (429), no existe (404), caído (5xx) o muy lento: el siguiente modelo.
      r = await llamar(modelo, {
        contents: [{ parts: [{ text: frase }] }], // solo el texto: lo que se envía, se lee
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: nombre } } } },
      }, 16000).catch(() => null);
      if (r && r.status === 429) {
        diario = /PerDay/i.test(await r.clone().text().catch(() => ''));
        agotados.set(modelo, Date.now() + (diario ? 60 : 1) * 60000);
      }
      if (r && (r.ok || ![429, 404, 500, 503].includes(r.status))) break;
    }
    if (!r) return [504, { error: 'la voz no respondió a tiempo' }];
    if (!r.ok) return [r.status === 429 ? 429 : 502, { error: 'la voz respondió ' + r.status, diario }];
    const j = await r.json().catch(() => null);
    const d = (j?.candidates?.[0]?.content?.parts || []).map((x) => x.inlineData).find((x) => x?.data);
    if (!d) return [502, { error: 'sin audio' }];
    const audio = { audio: d.data, mime: d.mimeType || '' };
    cacheVoz.set(clave, audio);
    if (cacheVoz.size > 200) cacheVoz.delete(cacheVoz.keys().next().value);
    return [200, audio];
  }

  // ---------- Transcripción: WAV del micrófono → texto ----------
  async function transcribir(e) {
    const audio = String(e.audio || '');
    if (audio.length < 1000 || !/^[A-Za-z0-9+/=]+$/.test(audio.slice(0, 200))) return [400, { error: 'audio inválido' }];
    try {
      const j = await conReintento(() => llamar(MODELO, {
        // pista (BioSalto): la respuesta esperada; si lo que se oye suena como ella, se escribe bien.
        contents: [{ role: 'user', parts: [{ text: R.TRANSCRIBIR + (texto(e.pista, 30) ? ' Si lo que dice suena como «' + texto(e.pista, 30) + '», escríbelo así, bien escrito; si dice otra palabra, escribe la que dijo.' : '') }, { inlineData: { mimeType: 'audio/wav', data: audio } }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 600, thinkingConfig: pensamiento(MODELO) },
      }, 8000).then(comprobar));
      return [200, { texto: texto(textoDe(j).replace(/^["“]|["”]$/g, ''), 1000) }];
    } catch (err) { return falla(err); }
  }

  // ---------- BioCabeza: preguntas de opción múltiple sobre un tema ----------
  async function preguntas(e) {
    const d = B.datos(e);
    if (B.tieneDatosPersonales(d.tema)) return [400, { error: 'datos personales' }];
    try {
      let r = null;
      for (let i = 0; i < 2 && !r; i++) {
        r = B.normalizar(await generar(B.sistema(d), [{ rol: 'estudiante', texto: B.usuario(d) }], { json: true, maxTokens: 2500, temperatura: 0.8, ms: 9000 }), d.cantidad);
      }
      return r ? [200, r] : [502, { error: 'sin preguntas' }];
    } catch (err) { return falla(err); }
  }

  // ---------- BioSalto: preguntas de respuesta de una palabra (se dicen por el micrófono) ----------
  async function preguntasSalto(e) {
    const d = S.datos(e);
    if (S.tieneDatosPersonales(d.tema)) return [400, { error: 'datos personales' }];
    try {
      let r = null;
      for (let i = 0; i < 2 && !r; i++) {
        r = S.normalizarRespuesta(await generar(S.sistema(d), [{ rol: 'estudiante', texto: S.usuario(d) }], { json: true, maxTokens: 2500, temperatura: 0.8, ms: 9000 }), d.cantidad);
      }
      return r ? [200, r] : [502, { error: 'sin preguntas' }];
    } catch (err) { return falla(err); }
  }

  // ---------- BioPortal: el tour por el mundo del tema y las preguntas a la guía ----------
  async function tourPortal(e) {
    const d = P.datos(e);
    if (P.tieneDatosPersonales(d.tema)) return [400, { error: 'datos personales' }];
    try {
      let r = null;
      for (let i = 0; i < 2 && !r; i++) {
        r = P.normalizarTour(await generar(P.sistema(d), [{ rol: 'estudiante', texto: P.usuario(d) }], { json: true, maxTokens: 3000, temperatura: 0.8, ms: 12000 }), d.paradas);
      }
      return r ? [200, r] : [502, { error: 'sin tour' }];
    } catch (err) { return falla(err); }
  }
  async function preguntaPortal(e) {
    const d = P.datosPregunta(e);
    if (d.pregunta.length < 2) return [400, { error: 'pregunta vacía' }];
    if (P.tieneDatosPersonales(d.pregunta)) return [400, { error: 'datos personales' }];
    try {
      const r = P.normalizarPregunta(await generar(P.sistemaPregunta(d), [{ rol: 'estudiante', texto: d.pregunta }], { json: true, maxTokens: 400, temperatura: 0.6, ms: 9000 }));
      return r ? [200, r] : [502, { error: 'sin respuesta' }];
    } catch (err) { return falla(err); }
  }

  const RUTAS = {
    '/api/entrevista/chat': { tipo: 'chat', fn: chat, max: 64 * 1024 },
    '/api/entrevista/cierre': { tipo: 'cierre', fn: cierre, max: 64 * 1024 },
    '/api/voz': { tipo: 'voz', fn: voz, max: 8 * 1024 },
    '/api/transcribir': { tipo: 'transcribir', fn: transcribir, max: 3 * 1024 * 1024 }, // ~60 s de WAV a 16 kHz
    '/api/biocabeza/preguntas': { tipo: 'preguntas', fn: preguntas, max: 12 * 1024 },
    '/api/biosalto/preguntas': { tipo: 'preguntas', fn: preguntasSalto, max: 12 * 1024 },
    '/api/bioportal/tour': { tipo: 'preguntas', fn: tourPortal, max: 12 * 1024 },
    '/api/bioportal/pregunta': { tipo: 'chat', fn: preguntaPortal, max: 8 * 1024 },
  };

  return async function atender(request, ip) {
    const origen = request.headers.get('Origin') || '';
    const responder = (estado, cuerpo) => new Response(JSON.stringify(cuerpo), { status: estado, headers: cabeceras(origen) });
    const ruta = new URL(request.url).pathname.replace(/\/+$/, '');
    if (request.method === 'OPTIONS') return new Response(null, { status: origenPermitido(origen) ? 204 : 403, headers: cabeceras(origen) });
    if (request.method === 'GET' && (ruta === '/api/salud' || ruta === '')) return responder(200, { ok: !!CLAVE, modelo: MODELO, clave: CLAVE ? 'configurada' : 'FALTA GOOGLE_API_KEY' });
    const r = RUTAS[ruta];
    if (request.method !== 'POST' || !r) return responder(404, { error: 'no encontrado' });
    if (!origenPermitido(origen)) return responder(403, { error: 'origen no permitido: agrega ' + (origen || '(sin origen)') + ' a ORIGENES_PERMITIDOS' });
    if (!CLAVE) return responder(500, { error: 'falta configurar GOOGLE_API_KEY en el servidor' });
    if (!dentroDelLimite(ip || 'desconocida', r.tipo)) return responder(429, { error: 'demasiadas peticiones, espera un momento' });
    let cuerpo;
    try {
      const t = await request.text();
      if (t.length > r.max) return responder(413, { error: 'muy grande' });
      cuerpo = JSON.parse(t || '{}');
    } catch { return responder(400, { error: 'cuerpo inválido' }); }
    try {
      const [estado, datos] = await r.fn(cuerpo || {});
      return responder(estado, datos);
    } catch (e) {
      console.error(e);
      return responder(500, { error: 'error interno' });
    }
  };
}
