/* =========================================================================
   ENTREVISTA A UN PERSONAJE CON IA — configuración (js/entrevista/config.js)
   -------------------------------------------------------------------------
   Lo que se ajusta por libro: la conexión con la IA y los personajes de la
   ciencia (recreaciones con IA) que dan la clase junto a la pizarra. El bot
   se activa solo en todas las actividades desde js/toolbar-tooltips.js.
   Este archivo se pide siempre fresco (?t=): un cambio se aplica al recargar.
   Una actividad puede pedir un personaje: <body data-entrevista-personaje="franklin">
   ========================================================================= */
window.ENTREVISTA_CONFIG = {
  // ╔═══════════════════════════════════════════════════════════════════╗
  // ║  IA — AQUÍ SE CONFIGURA LA CONEXIÓN                                ║
  // ╠═══════════════════════════════════════════════════════════════════╣
  // ║  PUBLICADO (GitHub Pages): pega en proxyUrl la dirección de tu     ║
  // ║    Worker de Cloudflare (js/entrevista/servidor/, ver README):    ║
  // ║    proxyUrl: 'https://entrevista-ia.TU-CUENTA.workers.dev',       ║
  // ║    La clave queda guardada en Cloudflare, NUNCA en este archivo.  ║
  // ║  EN TU COMPUTADORA: si existe js/entrevista/config.local.js (con  ║
  // ║    tu clave; git no lo sube), se usa esa clave directo. Si no     ║
  // ║    existe, se usa el Worker de proxyUrl.                          ║
  // ║  ⚠ NUNCA pongas la clave en apiKey: este archivo se publica.      ║
  // ╚═══════════════════════════════════════════════════════════════════╝
  ia: {
    activa: true,
    apiKey: '', // ⚠ siempre vacío (la clave va en config.local.js o en Cloudflare)
    proxyUrl: '', // dirección del Worker, sin /api al final
    // Google Gemini: texto, voz y transcripción con la misma clave.
    modelo: 'gemini-3.5-flash-lite',
    tiempoMaximoMs: 6000, // por intento (lo normal es 1-2 s); si tarda más, se repite una vez al instante
  },

  // Datos del libro que se mencionan a la IA (nunca datos del estudiante).
  libro: {
    id: 'bio1-bgu',
    nombre: 'Biología 1 · BGU',
    publico: 'estudiantes de bachillerato de 15 a 16 años',
  },

  // ---------- La clase ----------
  entrevista: {
    activo: true, // el docente puede apagarlo (por ejemplo, en una evaluación)
    maxPreguntas: 10, // por actividad y por sesión
    maxPalabras: 40, // largo de cada explicación: 2 o 3 frases (≈ 15 s de voz); la pizarra completa la idea
    maxCaracteres: 260, // largo de cada pregunta del estudiante
    historialTurnos: 8, // mensajes anteriores que se envían a la IA
    enviarAlTerminarDictado: true, // al callar el estudiante, la pregunta se envía sola
    saludoAlCargar: true, // burbuja de saludo junto al bot al abrir cada actividad
    burbujaSegundos: 8,
  },

  // ---------- Voz del personaje ----------
  // 'ia' = voz NATURAL de Google Gemini (si falla o se acaba el cupo, usa la
  //        del dispositivo) · 'dispositivo' = solo la voz del navegador.
  voz: {
    motor: 'ia',
    // En orden. Plan gratis de Google: 3 audios por minuto POR MODELO; si uno
    // se llena, usa el siguiente. Para una clase hace falta la facturación.
    modelos: ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'],
    leerRespuestas: true, // valor inicial del interruptor 🔊 (el estudiante lo cambia)
    // Rapidez: la primera frase se genera aparte y empieza a sonar mientras se
    // prepara el resto. Si la voz natural tarda más de maxEsperaMs, habla al
    // instante con la voz del dispositivo (del mismo género del personaje).
    porPartes: true,
    maxEsperaMs: 2500,
  },

  // ---------- Micrófono (voz del estudiante → texto) ----------
  // 'auto'      = dictado del navegador (gratis, texto en vivo; Chrome, Edge,
  //               Safari); si no hay, graba y lo transcribe Gemini (Firefox).
  // 'navegador' | 'grabacion' | 'ninguno' (solo escribir).
  microfono: {
    motor: 'auto',
    idioma: 'es-EC',
    maxSegundos: 30, // por pregunta; al llegar, se detiene solo
  },

  // ---------- Personajes de la ciencia (recreaciones con IA) ----------
  personaje: 'darwin', // el que aparece primero
  elegibles: ['darwin', 'franklin'], // el estudiante puede cambiar en ⋯ → Cambiar de profesor

  // nombre, rol, epoca (hasta cuándo "sabe"), descripcion y personalidad
  //   orientan a la IA. saludo: lo dice al abrir la clase · saludoCorto:
  //   burbuja junto al bot · pizarra: lo escrito en la pizarra al empezar.
  // dibujo: 'darwin' | 'franklin' (js/entrevista/personajes.js) ·
  //   ilustracion: opcional, imagen propia de cuerpo entero (PNG/SVG con
  //   fondo transparente) que reemplaza al dibujo.
  // voz: voces de Gemini. Femeninas: Leda, Kore, Aoede, Zephyr, Despina, Sulafat.
  //   Masculinas: Charon, Puck, Fenrir, Orus, Achird, Iapetus.
  // genero: 'femenino' | 'masculino' (para la voz del dispositivo de respaldo)
  personajes: {
    darwin: {
      nombre: 'Charles Darwin',
      corto: 'Darwin',
      rol: 'naturalista inglés, padre de la teoría de la evolución',
      epoca: '1809-1882; conoce solo lo publicado hasta 1882',
      descripcion: 'Viajó en el HMS Beagle (1831-1836), visitó las islas Galápagos en 1835 y publicó El origen de las especies en 1859. En una carta de 1871 imaginó que la vida pudo empezar en una "pequeña charca tibia".',
      personalidad: 'paciente, observador y amable; explica con calma, con ejemplos de sus viajes y de la naturaleza, y reconoce lo que en su tiempo no se sabía',
      saludo: 'Soy una recreación de Charles Darwin. Hoy seré su profesor: pregúnteme lo que quiera sobre el tema, y lo iremos anotando en la pizarra.',
      saludoCorto: '¡Hola! Soy Charles Darwin. ¿Empezamos la clase? 🎤',
      pizarra: ['Bienvenidos a clase', 'Observar · Preguntar · Explicar'],
      voz: 'Charon', // voz masculina de Gemini
      genero: 'masculino', // si falla la voz natural, se busca una voz del dispositivo de hombre
      color: '#196421',
      dibujo: 'darwin',
      ilustracion: '',
    },
    franklin: {
      nombre: 'Rosalind Franklin',
      corto: 'Rosalind',
      rol: 'química y cristalógrafa británica, pionera en el estudio del ADN',
      epoca: '1920-1958; conoce solo lo publicado hasta 1958',
      descripcion: 'Con la difracción de rayos X obtuvo en 1952 la Fotografía 51, clave para descubrir la estructura de doble hélice del ADN (1953). También estudió la estructura de los virus y del carbón.',
      personalidad: 'precisa, apasionada por la evidencia experimental y directa; explica paso a paso y pide pruebas antes de aceptar una idea',
      saludo: 'Hola. Soy una recreación con inteligencia artificial de Rosalind Franklin. Hoy les doy la clase: pregúntenme lo que quieran y anotaremos lo importante en la pizarra.',
      saludoCorto: '¡Hola! Soy Rosalind Franklin. ¿Empezamos la clase? 🎤',
      pizarra: ['Bienvenidos a clase', 'Sin evidencia no hay conclusión'],
      voz: 'Leda', // voz femenina de Gemini
      genero: 'femenino', // si falla la voz natural, se busca una voz del dispositivo de mujer
      color: '#1d4ed8',
      dibujo: 'franklin',
      ilustracion: '',
    },
  },

  // ---------- Mensajes fijos ----------
  mensajes: {
    sinIA: 'Ahora no puedo conectarme para dar la clase. Revisa el tema en tu libro y vuelve a intentarlo en un rato.',
    limite: 'Ya usaste tus {max} preguntas de esta actividad. ¡Buena clase! Puedes terminarla para ver tu resumen.',
    privado: 'Por tu seguridad no envío correos ni números de teléfono o cédula. Pregúntame solo sobre el tema.',
    // Las dos sugerencias iniciales (siempre sobre el tema de la actividad).
    explicar: 'Explíqueme el tema de hoy',
    importancia: '¿Por qué es importante este tema?',
    // Si la pregunta no es del tema de la actividad, el personaje dice esto
    // (no responde lo otro). {tema} = título de la actividad.
    fueraDeTema: 'Esa pregunta no es de nuestra clase de hoy. Volvamos a «{tema}»: ¿qué te gustaría saber de este tema?',
  },
};
