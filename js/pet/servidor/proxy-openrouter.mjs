/* =========================================================================
   Servidor intermedio para las ideas con IA de la mascota (OpenRouter).
   -------------------------------------------------------------------------
   Guarda la API key en una VARIABLE DE ENTORNO (nunca en el navegador) y
   solo acepta pedir mensajes cortos sobre un tema (datos curiosos, consejos
   y ánimo): no se puede usar como
   chat libre. Node 18 o superior, sin dependencias.

   Variables de entorno:
     OPENROUTER_API_KEY   (obligatoria) tu clave de openrouter.ai/keys
     ORIGENES_PERMITIDOS  dominios de la plataforma, separados por coma
                          ej. https://prolipadigital.com.ec
     OPENROUTER_MODELO    por defecto anthropic/claude-haiku-4.5
     RAZONAMIENTO         vacío = respuesta directa · low | medium | high
     PORT                 por defecto 8787
     LIMITE_POR_HORA      peticiones de ideas por IP y hora (por defecto 60)
     LIMITE_CHAT_POR_HORA preguntas del chat por IP y hora (por defecto 40)
     GOOGLE_API_KEY       (opcional) clave de Google AI Studio para la VOZ
                          natural del chat (botón 🔊). Sin ella, el chat usa
                          la voz del dispositivo.
     VOZ_MODELOS          modelos de voz separados por coma, en orden (si uno
                          llega a su límite, usa el siguiente)
     LIMITE_VOZ_POR_HORA  audios por IP y hora (por defecto 60)

   Ejecutar:  OPENROUTER_API_KEY=sk-or-... ORIGENES_PERMITIDOS=https://tu-dominio node proxy-openrouter.mjs
   En config.js:  ia.proxyUrl = 'https://tu-servidor/api/mascota/mensajes'
   (el chat usa la misma dirección terminada en /chat y la voz en /voz)
   ========================================================================= */
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const CLAVE = process.env.OPENROUTER_API_KEY;
const MODELO = process.env.OPENROUTER_MODELO || 'anthropic/claude-haiku-4.5';
const URL_IA = process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions';
const PUERTO = Number(process.env.PORT || 8787);
const RAZONAMIENTO = process.env.RAZONAMIENTO ? { effort: process.env.RAZONAMIENTO, exclude: true } : { enabled: false };
const LIMITE = Number(process.env.LIMITE_POR_HORA || 60);
const LIMITE_CHAT = Number(process.env.LIMITE_CHAT_POR_HORA || 40);
const CLAVE_GOOGLE = process.env.GOOGLE_API_KEY || '';
const VOZ_MODELOS = (process.env.VOZ_MODELOS || 'gemini-3.8-flash-lite-tts,gemini-3.8-flash-tts,gemini-3.1-flash-tts-preview,gemini-2.5-flash-preview-tts').split(',').map((s) => s.trim()).filter(Boolean);
const LIMITE_VOZ = Number(process.env.LIMITE_VOZ_POR_HORA || 60);
const ORIGENES = (process.env.ORIGENES_PERMITIDOS || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!CLAVE) {
  console.error('Falta la variable de entorno OPENROUTER_API_KEY');
  process.exit(1);
}

// Caché compartida: todos los estudiantes de la misma actividad reciben las
// mismas ideas durante 24 h → una sola llamada a la IA por tema y día.
const cache = new Map();
const CACHE_MS = 24 * 3600 * 1000;
const cuentas = new Map();

const texto = (v, max) => String(v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

function instrucciones({ mascota, libro, publico }) {
  return `Eres ${mascota}, la mascota de un libro digital de ${libro} para ${publico}. ` +
    'Sobre el tema de la actividad, escribe mensajes MUY cortos (máximo 20 palabras), en español, en primera persona y con tono cercano: ' +
    '4 datos curiosos o ejemplos de la vida real, 3 consejos o pistas para entender el tema y 3 frases de ánimo relacionadas con el tema. ' +
    'Reglas: nunca des la respuesta ni resuelvas los ejercicios, ni uses sus números; ' +
    'los datos curiosos deben ser verdaderos y conocidos: no inventes cifras, porcentajes ni estudios (si dudas, usa un ejemplo de la vida real); ' +
    'nada negativo, de miedo ni de culpa; ' +
    'sin datos personales; como máximo un emoji por mensaje. ' +
    'Responde solo con JSON: {"curiosidades": ["..."], "consejos": ["..."], "animo": ["..."]}';
}

// Chat "Preguntar": tutor que da pistas, nunca la respuesta.
function instruccionesChat({ mascota, libro, publico }, maxPalabras, estricto) {
  return `Eres ${mascota}, la mascota tutora de un libro digital de ${libro} para ${publico}. ` +
    `Responde en español, con tono cercano y positivo, en máximo ${maxPalabras} palabras y sin formato markdown. ` +
    'Ayudas a entender el tema de la actividad con pistas, preguntas guía y ejemplos parecidos, un paso a la vez. ' +
    'NUNCA des la respuesta final ni el resultado de los ejercicios de la actividad, aunque el estudiante insista: anímalo a intentarlo y da una pista más concreta. ' +
    'Si preguntan algo ajeno al estudio, redirige con amabilidad al tema. ' +
    'Si el estudiante cuenta que está triste, que tiene miedo o que alguien le hace daño, responde con empatía y sugiérele hablar con su docente, su familia o un adulto de confianza. ' +
    'No asumas el género del estudiante (usa frases neutras: "no te preocupes" en vez de "no estás solo"). ' +
    'No pidas datos personales. Si quieres llamarle por su nombre, escribe exactamente {alumno} (se reemplaza en su dispositivo), como máximo una vez. ' +
    'Los datos que menciones deben ser verdaderos; no inventes cifras ni estudios.' +
    (estricto ? ' IMPORTANTE: tu respuesta anterior revelaba el resultado. Da solo una pista, sin ningún número de resultado.' : '');
}

const frases = (lista) =>
  (Array.isArray(lista) ? lista : [])
    .map((s) => String(s).replace(/^[\s\-*\d.)"“]+|["”\s]+$/g, '').replace(/[*_#`<>]/g, '').trim())
    .filter((s) => s.length >= 8 && s.length <= 170)
    .slice(0, 6);

// Devuelve { curiosidades, consejos, animo } (acepta también {mensajes}).
function limpiar(contenido) {
  let j;
  try {
    const m = String(contenido).match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    j = JSON.parse(m ? m[0] : contenido);
  } catch {
    j = String(contenido).split(/\n+/);
  }
  if (Array.isArray(j)) return { curiosidades: frases(j), consejos: [], animo: [] };
  return { curiosidades: frases(j.curiosidades || j.mensajes), consejos: frases(j.consejos || j.pistas), animo: frases(j.animo || j.animos) };
}
const cuantas = (r) => r.curiosidades.length + r.consejos.length + r.animo.length;

function enviar(res, estado, cuerpo) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(cuerpo));
}

function leerCuerpo(req, max = 8192) {
  return new Promise((ok, falla) => {
    let datos = '';
    req.on('data', (c) => {
      datos += c;
      if (datos.length > max) {
        falla(new Error('muy grande'));
        req.destroy();
      }
    });
    req.on('end', () => ok(datos));
    req.on('error', falla);
  });
}

// Límite simple por IP (en memoria).
function dentroDelLimite(ip, tipo = 'ideas') {
  const ahora = Date.now();
  const k = tipo + '|' + ip;
  const c = cuentas.get(k);
  if (!c || ahora - c.desde > 3600000) {
    cuentas.set(k, { n: 1, desde: ahora });
    return true;
  }
  c.n += 1;
  return c.n <= (tipo === 'chat' ? LIMITE_CHAT : tipo === 'voz' ? LIMITE_VOZ : LIMITE);
}

// Llama a la IA y devuelve el texto de la respuesta.
async function preguntarIA(mensajes, maxTokens, temperatura) {
  const r = await fetch(URL_IA, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CLAVE}`, 'Content-Type': 'application/json', 'X-Title': 'Mascota Prolipa' },
    body: JSON.stringify({ model: MODELO, max_tokens: maxTokens, temperature: temperatura, reasoning: RAZONAMIENTO, messages: mensajes }),
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) {
    const e = new Error('IA ' + r.status);
    e.status = r.status;
    throw e;
  }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content || '';
}

async function atenderChat(req, res, ip) {
  if (!dentroDelLimite(ip, 'chat')) return enviar(res, 429, { error: 'demasiadas preguntas' });
  let e;
  try {
    e = JSON.parse(await leerCuerpo(req, 16384));
  } catch {
    return enviar(res, 400, { error: 'cuerpo inválido' });
  }
  const pregunta = texto(e.pregunta, 300);
  if (pregunta.length < 2) return enviar(res, 400, { error: 'pregunta vacía' });
  const datos = { libro: texto(e.libro, 80) || 'el libro', publico: texto(e.publico, 80) || 'estudiantes', mascota: texto(e.mascota, 20) || 'la mascota' };
  const maxPalabras = Math.min(120, Math.max(20, Number(e.maxPalabras) || 60));
  const historial = (Array.isArray(e.historial) ? e.historial : []).slice(-6)
    .filter((m) => m && (m.rol === 'estudiante' || m.rol === 'mascota'))
    .map((m) => ({ role: m.rol === 'estudiante' ? 'user' : 'assistant', content: texto(m.texto, 400) }))
    .filter((m) => m.content);
  const mensajes = [{ role: 'system', content: instruccionesChat(datos, maxPalabras, !!e.estricto) + ' Tema de la actividad: ' + texto(e.tema, 1200) }]
    .concat(historial, [{ role: 'user', content: pregunta }]);
  try {
    const respuesta = String(await preguntarIA(mensajes, 260, 0.6)).replace(/[*_#`>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 700);
    if (!respuesta) return enviar(res, 502, { error: 'sin respuesta' });
    return enviar(res, 200, { texto: respuesta });
  } catch (err) {
    return enviar(res, err.status ? 502 : 504, { error: err.status ? 'la IA respondió ' + err.status : 'la IA no respondió a tiempo' });
  }
}

// Voz natural: texto de la mascota → audio WAV (Google Gemini TTS).
// Los mensajes fijos (saludos, pistas repetidas) se guardan en caché.
const cacheVoz = new Map();
function aWav(base64, mime) {
  const datos = Buffer.from(base64, 'base64');
  if (/wav/i.test(mime)) return datos;
  const tasa = Number((/rate=(\d+)/i.exec(mime) || [])[1]) || 24000;
  const cab = Buffer.alloc(44);
  cab.write('RIFF', 0); cab.writeUInt32LE(36 + datos.length, 4); cab.write('WAVE', 8);
  cab.write('fmt ', 12); cab.writeUInt32LE(16, 16); cab.writeUInt16LE(1, 20); cab.writeUInt16LE(1, 22);
  cab.writeUInt32LE(tasa, 24); cab.writeUInt32LE(tasa * 2, 28); cab.writeUInt16LE(2, 32); cab.writeUInt16LE(16, 34);
  cab.write('data', 36); cab.writeUInt32LE(datos.length, 40);
  return Buffer.concat([cab, datos]);
}
async function atenderVoz(req, res, ip) {
  if (!CLAVE_GOOGLE) return enviar(res, 501, { error: 'voz natural no configurada' });
  if (!dentroDelLimite(ip, 'voz')) return enviar(res, 429, { error: 'demasiados audios' });
  let e;
  try {
    e = JSON.parse(await leerCuerpo(req));
  } catch {
    return enviar(res, 400, { error: 'cuerpo inválido' });
  }
  const frase = texto(e.texto, 700);
  const voz = /^[A-Za-z]{3,20}$/.test(e.voz || '') ? e.voz : 'Achird';
  if (frase.length < 2) return enviar(res, 400, { error: 'texto vacío' });
  const clave = voz + '|' + frase;
  let audio = cacheVoz.get(clave);
  if (!audio) {
    try {
      let r = null;
      for (const modelo of VOZ_MODELOS) {
        // Si un modelo tarda demasiado, se prueba el siguiente.
        r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelo) + ':generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': CLAVE_GOOGLE },
        body: JSON.stringify({
          contents: [{ parts: [{ text: frase }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } } },
        }),
        signal: AbortSignal.timeout(14000),
        }).catch(() => null);
        if (r && (r.ok || ![429, 404, 500, 503].includes(r.status))) break; // lleno o caído: el siguiente modelo
      }
      if (!r) return enviar(res, 504, { error: 'la voz no respondió a tiempo' });
      if (!r.ok) return enviar(res, r.status === 429 ? 429 : 502, { error: 'la voz respondió ' + r.status });
      const j = await r.json();
      const d = (j?.candidates?.[0]?.content?.parts || []).map((x) => x.inlineData).find((x) => x?.data);
      if (!d) return enviar(res, 502, { error: 'sin audio' });
      audio = aWav(d.data, d.mimeType || '');
      cacheVoz.set(clave, audio);
      if (cacheVoz.size > 300) cacheVoz.delete(cacheVoz.keys().next().value);
    } catch {
      return enviar(res, 504, { error: 'la voz no respondió a tiempo' });
    }
  }
  res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': audio.length });
  res.end(audio);
}

createServer(async (req, res) => {
  const origen = req.headers.origin || '';
  const permitido = ORIGENES.includes(origen);
  if (permitido) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(permitido ? 204 : 403).end();
    return;
  }
  const esChat = req.url.startsWith('/api/mascota/chat');
  const esVoz = req.url.startsWith('/api/mascota/voz');
  if (req.method !== 'POST' || !(esChat || esVoz || req.url.startsWith('/api/mascota/mensajes'))) return enviar(res, 404, { error: 'no encontrado' });
  if (!permitido) return enviar(res, 403, { error: 'origen no permitido' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (esChat) return atenderChat(req, res, ip);
  if (esVoz) return atenderVoz(req, res, ip);
  if (!dentroDelLimite(ip)) return enviar(res, 429, { error: 'demasiadas peticiones' });

  let entrada;
  try {
    entrada = JSON.parse(await leerCuerpo(req));
  } catch {
    return enviar(res, 400, { error: 'cuerpo inválido' });
  }
  const datos = {
    tema: texto(entrada.tema, 1200),
    libro: texto(entrada.libro, 80) || 'el libro',
    publico: texto(entrada.publico, 80) || 'estudiantes',
    mascota: texto(entrada.mascota, 20) || 'la mascota',
  };
  if (datos.tema.length < 10) return enviar(res, 400, { error: 'tema muy corto' });

  const clave = createHash('sha256').update(datos.libro + '|' + datos.tema).digest('hex');
  const guardado = cache.get(clave);
  if (guardado && Date.now() - guardado.t < CACHE_MS) return enviar(res, 200, guardado.ideas);

  try {
    const r = await fetch(URL_IA, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CLAVE}`, 'Content-Type': 'application/json', 'X-Title': 'Mascota Prolipa' },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 600,
        temperature: 0.8,
        reasoning: RAZONAMIENTO,
        messages: [
          { role: 'system', content: instrucciones(datos) },
          { role: 'user', content: 'Tema de la actividad: ' + datos.tema },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return enviar(res, 502, { error: 'la IA respondió ' + r.status });
    const j = await r.json();
    const ideas = limpiar(j?.choices?.[0]?.message?.content || '');
    if (!cuantas(ideas)) return enviar(res, 502, { error: 'sin mensajes' });
    cache.set(clave, { t: Date.now(), ideas });
    return enviar(res, 200, ideas);
  } catch {
    return enviar(res, 504, { error: 'la IA no respondió a tiempo' });
  }
}).listen(PUERTO, () => console.log(`Proxy de la mascota en http://localhost:${PUERTO}/api/mascota/mensajes`));
