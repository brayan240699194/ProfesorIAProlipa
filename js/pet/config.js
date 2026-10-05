/* =========================================================================
   MASCOTA VIRTUAL — configuración (js/pet/config.js)
   -------------------------------------------------------------------------
   Lo que se ajusta por libro. Otro libro puede usar su propia copia con
   <script src="js/pet/mascota.js" data-config="js/pet/config-otro.js">.
   La mascota se activa sola en todas las actividades desde
   js/toolbar-tooltips.js (no hay que agregar nada en cada HTML).
   ========================================================================= */
window.MASCOTA_CONFIG = {
  // ---------- ¿Se muestra la mascota? ----------
  // true = aparece en TODAS las actividades · false = no aparece (ni su botón
  // en la barra). Solo en una actividad: <body data-mascota="no"> (o "si"),
  // que manda sobre esto.
  activa: true,

  // ---------- Dónde aparece al abrir cada actividad ----------
  // Distancia en píxeles desde la esquina inferior derecha. Abajo a la derecha
  // está el profesor con IA (js/entrevista/, botón de 72 px): la mascota va
  // ENCIMA de él en la computadora y a su IZQUIERDA en el celular (ahí el
  // saludo del profesor sale encima de él), así no se tapan.
  posicion: { derecha: 16, abajo: 104 },
  posicionCelular: { derecha: 100, abajo: 16 }, // pantallas de menos de 640 px

  // ╔═══════════════════════════════════════════════════════════════════╗
  // ║  IA (OpenRouter) — AQUÍ SE CONFIGURA TU API KEY                    ║
  // ╠═══════════════════════════════════════════════════════════════════╣
  // ║  Opción A · PRUEBAS: pon tu clave en js/pet/config.local.js      ║
  // ║    (copia config.local.example.js; git lo ignora, no se sube).   ║
  // ║    ⚠ Cualquiera que abra el libro puede verla (F12): bórrala       ║
  // ║      antes de publicar y ponle límite de crédito en OpenRouter.     ║
  // ║  Opción B · PUBLICADO (recomendado): deja apiKey vacío y pon la     ║
  // ║    dirección de tu servidor intermedio (js/pet/servidor/), que      ║
  // ║    guarda la clave en una variable de entorno:                      ║
  // ║    proxyUrl: 'https://tu-servidor/api/mascota/mensajes',            ║
  // ║  Para comprobarla: panel Mascota → Opciones → "Probar conexión".   ║
  // ║  Si conecta, la mascota dice "¡Estoy conectado a la IA!".          ║
  // ╚═══════════════════════════════════════════════════════════════════╝
  ia: {
    activa: true,
    apiKey: '', // NO pongas la clave aquí: va en js/pet/config.local.js (no se sube a git)
    proxyUrl: '', // Opción B (publicado). Si hay proxyUrl, se usa este.
    // 'google' = Gemini con clave de Google AI Studio · 'openrouter' = clave sk-or-…
    proveedor: 'google',
    // Google: gemini-3.5-flash-lite (rápido y liviano). gemini-2.5-flash ya NO existe
    // para cuentas nuevas (da 404). Otros: gemini-3.8-flash, gemini-3.5-flash.
    // OpenRouter: cualquier id de openrouter.ai/models (ej. anthropic/claude-haiku-4.5).
    modelo: 'gemini-3.5-flash-lite',
    cacheHoras: 72, // las ideas de cada actividad se guardan y reutilizan
    tiempoMaximoMs: 8000,
  },

  // ---------- Chat "Preguntar" (tutor con IA) ----------
  // Pestaña del panel donde el estudiante pregunta y la mascota responde
  // con pistas y ejemplos, SIN dar las respuestas de los ejercicios (si la
  // IA escribe una respuesta de la página, se bloquea y da una pista).
  // Necesita la IA configurada. Publicado: SOLO con proxyUrl (con la clave
  // en el navegador, cualquiera podría usarla como chat gratis).
  chat: {
    activo: true, // el docente puede apagarlo (por ejemplo, en una evaluación)
    maxPreguntas: 10, // por actividad y por sesión
    maxPalabras: 50, // largo de cada respuesta
    maxCaracteres: 300, // largo de cada pregunta
  },

  // ---------- Voz del chat (botón 🔊 Escuchar) ----------
  // 'ia' = voz NATURAL de Google Gemini (suena humana; usa la misma clave
  //        de Google de arriba o el servidor intermedio). Si falla o se acaba
  //        el límite, usa la voz del dispositivo.
  // 'dispositivo' = solo la voz del navegador (gratis, sin internet, más robótica).
  voz: {
    motor: 'ia',
    // Modelos de voz, en orden. Plan gratis de Google: 3 audios por minuto
    // POR MODELO; si uno se llena, usa el siguiente (≈ 12 por minuto en total).
    modelos: ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'],
    vozIA: 'Achird', // voz por defecto (amigable)
    // Una voz para cada personaje (voces de Gemini: Achird, Puck, Leda, Aoede,
    // Fenrir, Kore, Laomedeia, Sadachbia, Sulafat, Zubenelgenubi…)
    porPersonaje: {
      astronauta: 'Puck', lobo: 'Achird', nova: 'Leda', fenix: 'Fenrir', mapache: 'Zubenelgenubi',
      zorro: 'Laomedeia', gato: 'Aoede', dragon: 'Sadachbia', pinguino: 'Puck', ajolote: 'Leda',
    },
  },

  // nombreLibro le dice a la IA de qué materia son los datos curiosos, las
  // pistas y el chat. Vacío = se detecta solo del texto de cada actividad
  // (js/materia.js): copia el libro a otra materia y la mascota se adapta
  // sola. Escribe un nombre (ej. 'Biología 1 · BGU') solo si quieres fijarlo.
  idLibro: 'bio1-bgu', // guarda la mascota del estudiante (si el <script> trae data-libro, gana ese)
  nombreLibro: '',
  publico: 'estudiantes de bachillerato de 15 a 16 años',

  // ---------- Almacenamiento ----------
  // 'local' = este navegador · 'mongo' = backend propio (GET/PUT
  // {apiBase}/api/pet/:studentId?libro=…). Nunca se conecta directo a MongoDB.
  almacenamiento: 'local',
  apiBase: '',
  // 'nunca' = siempre aparece en "posicion" (arriba) al abrir cada actividad (si
  // la arrastras, se queda ahí solo en esa página) · 'sesion' = se mantiene
  // al cambiar de actividad · 'siempre' = se recuerda para siempre.
  recordarPosicion: 'nunca',

  // Hoy no llega id del estudiante: 'anonimo' = este dispositivo. Si la
  // plataforma abre las actividades con ?estudiante=123, se usa ese.
  studentId: null,
  parametroUrlEstudiante: 'estudiante',

  // ---------- Comportamiento ----------
  tiempos: {
    dormirMinutos: 5,
    nuevaVisitaMinutos: 30, // menos = misma visita (no vuelve a saludar)
    extranarDias: 1, // desde 1 día sin venir → "¡Te extrañé!"
    reencuentroDias: 5, // desde 5 días → celebra el reencuentro
    burbujaSegundos: 5,
    descansoMinutos: 45, // sugiere (una vez) un descanso corto
  },
  // Cuánto habla por su cuenta (el estudiante lo elige en el panel).
  //   minimo: segundos entre mensajes · espontaneo: minutos entre ideas
  //   que dice sola (null = nunca).
  frecuencias: {
    pocos: { nombre: 'Pocos', minimo: 14, espontaneo: null },
    normal: { nombre: 'Normal', minimo: 7, espontaneo: 5 },
    muchos: { nombre: 'Muchos', minimo: 4, espontaneo: 2.5 },
  },
  minCaracteresAbierta: 30,
  rachaParaBailar: 3,

  // ---------- Personajes, colores y accesorios ----------
  personajes: [
    // Para jóvenes de bachillerato
    { id: 'astronauta', nombre: 'Astronauta', nombreSugerido: 'Orion', color: 'celeste' },
    { id: 'lobo', nombre: 'Lobo urbano', nombreSugerido: 'Kai', color: 'marino' },
    { id: 'nova', nombre: 'Nova IA', nombreSugerido: 'Nova', color: 'morado' },
    { id: 'fenix', nombre: 'Fénix', nombreSugerido: 'Blaze', color: 'rojo' },
    { id: 'mapache', nombre: 'Mapache urbano', nombreSugerido: 'Zeta', color: 'azul' },
    // Para niños
    { id: 'zorro', nombre: 'Zorrito', nombreSugerido: 'Chispa', color: 'naranja' },
    { id: 'gato', nombre: 'Gatito', nombreSugerido: 'Miel', color: 'amarillo' },
    { id: 'dragon', nombre: 'Dragón bebé', nombreSugerido: 'Brasa', color: 'verde' },
    { id: 'pinguino', nombre: 'Pingüino', nombreSugerido: 'Hielo', color: 'grafito' },
    { id: 'ajolote', nombre: 'Ajolote', nombreSugerido: 'Axo', color: 'chicle' },
  ],
  colores: [
    { id: 'rojo', nombre: 'Rojo', hex: '#ef4444' },
    { id: 'naranja', nombre: 'Naranja', hex: '#f97316' },
    { id: 'amarillo', nombre: 'Amarillo', hex: '#f59e0b' },
    { id: 'rosa', nombre: 'Rosa', hex: '#ec4899' },
    { id: 'chicle', nombre: 'Chicle', hex: '#f9a8d4' },
    { id: 'morado', nombre: 'Morado', hex: '#a855f7' },
    { id: 'azul', nombre: 'Azul', hex: '#3b82f6' },
    { id: 'celeste', nombre: 'Celeste', hex: '#0ea5e9' },
    { id: 'marino', nombre: 'Azul marino', hex: '#1e3a8a' },
    { id: 'verde', nombre: 'Verde', hex: '#22c55e' },
    { id: 'grafito', nombre: 'Grafito', hex: '#334155' },
  ],
  // Se pueden llevar varios a la vez: uno por zona.
  zonas: [
    { id: 'cabeza', nombre: 'Cabeza' },
    { id: 'orejas', nombre: 'Orejas' },
    { id: 'cara', nombre: 'Cara' },
    { id: 'cuello', nombre: 'Cuello' },
    { id: 'cuerpo', nombre: 'Cuerpo' },
  ],
  accesorios: [
    { id: 'gorra', nombre: 'Gorra', zona: 'cabeza' },
    { id: 'birrete', nombre: 'Birrete', zona: 'cabeza' },
    { id: 'corona', nombre: 'Corona', zona: 'cabeza' },
    { id: 'gorroFiesta', nombre: 'Gorro de fiesta', zona: 'cabeza' },
    { id: 'mono', nombre: 'Moño', zona: 'cabeza' },
    { id: 'audifonos', nombre: 'Audífonos', zona: 'orejas' },
    { id: 'lentes', nombre: 'Lentes', zona: 'cara' },
    { id: 'gafasSol', nombre: 'Gafas de sol', zona: 'cara' },
    { id: 'bufanda', nombre: 'Bufanda', zona: 'cuello' },
    { id: 'corbatin', nombre: 'Corbatín', zona: 'cuello' },
    { id: 'medalla', nombre: 'Medalla', zona: 'cuello' },
    { id: 'chompa', nombre: 'Chompa del colegio', zona: 'cuerpo' }, // con la inicial del colegio del estudiante
  ],

  // Colores de la chompa del colegio.
  coloresChompa: [
    { id: 'rojo', nombre: 'Rojo', hex: '#ef4444' },
    { id: 'naranja', nombre: 'Naranja', hex: '#f97316' },
    { id: 'amarillo', nombre: 'Amarillo', hex: '#f59e0b' },
    { id: 'rosa', nombre: 'Rosa', hex: '#ec4899' },
    { id: 'chicle', nombre: 'Chicle', hex: '#f9a8d4' },
    { id: 'morado', nombre: 'Morado', hex: '#a855f7' },
    // { id: 'azul', nombre: 'Azul', hex: '#3b82f6' },
    { id: 'celeste', nombre: 'Celeste', hex: '#0ea5e9' },
    { id: 'marino', nombre: 'Azul marino', hex: '#1e3a8a' },
    { id: 'verde', nombre: 'Verde', hex: '#22c55e' },
    { id: 'grafito', nombre: 'Grafito', hex: '#334155' },
  ],

  // ---------- Banco de mensajes ----------
  // Siempre en positivo: nunca se enferma, no reclama ni culpa. Dentro de
  // cada categoría no se repite hasta que salieron todos.
  // Marcadores: {nombre} = la mascota · {alumno} = el nombre del estudiante
  // (si no lo escribió, se quita solo: "¡Hola, {alumno}!" → "¡Hola!") ·
  // {aciertos} {total} al calificar · {n} contador.
  mensajes: {
    bienvenida: ['¡Hola, {alumno}! Soy {nombre}. Te acompaño en todo el libro.', '¡Qué bueno conocerte, {alumno}! Soy {nombre}. Vamos con todo.'],
    pedirNombre: ['¿Cómo te llamas? Escríbelo en mi panel 🐾 → Editar y te llamaré por tu nombre.', 'Me encantaría saber tu nombre: ponlo en mi panel 🐾 (Editar).'],
    saludoManana: ['¡Buenos días, {alumno}! Mente fresca, gran día.', '¡Buen día! Hoy aprendemos algo nuevo.', '¡Arriba ese ánimo, {alumno}! Empezamos.'],
    saludoTarde: ['¡Buenas tardes, {alumno}! ¿Seguimos?', '¡Hola! Esta tarde va a rendir.', '¡Qué bueno verte, {alumno}! Vamos paso a paso.'],
    saludoNoche: ['¡Buenas noches, {alumno}! Un ratito y a descansar.', '¡Hola! Trabajemos tranquilos.', '¡Aquí estoy, {alumno}! Sin prisa, pero sin pausa.'],
    teExtrane: ['¡{alumno}, te extrañé! Qué bueno que volviste.', '¡Volviste, {alumno}! Te estaba esperando.', '¡Hola! Me alegra mucho verte de nuevo.'],
    reencuentro: ['¡{alumno}, volviste! ¡Qué alegría! Te guardé tu lugar.', '¡Hola, hola, {alumno}! ¡Qué bueno verte otra vez!', '¡Reencuentro! Hoy es un gran día para aprender.'],
    clic: ['¡Jeje, cosquillas!', '¡Boing!', '¡Aquí sigo contigo, {alumno}!', '¡Qué energía!', '¡Vas muy bien, {alumno}!', '¡Choca esos cinco!', '¡Wiii!', '¿Viste mi salto?', '¡Tú puedes con esto!', '¡Me encanta acompañarte, {alumno}!'],
    mareo: ['¡Jaja, me mareé! Qué divertido.', '¡Uy, cuántas vueltas, {alumno}! Sigamos.', '¡Wooow! Ya, ya, estoy bien 😄'],
    correcto: ['¡Bien hecho, {alumno}! {aciertos} de {total}.', '¡Excelente! Lo lograste.', '¡Eso, {alumno}! Se nota que lo entendiste.', '¡Muy bien! Tu esfuerzo se nota.', '¡Perfecto! Así se hace.', '¡Genial, {alumno}! Todo en su lugar.'],
    racha: ['¡Qué racha, {alumno}! Esto merece un baile.', '¡Una tras otra! Estás en tu mejor momento.', '¡Imparable! {aciertos} de {total}.', '¡Uff, qué nivel, {alumno}! Bailemos.', '¡Racha de campeón!'],
    mixto: ['¡Vas bien, {alumno}! {aciertos} de {total}. Las rojas son para repasar.', '¡Buen trabajo! Revisa las casillas en rojo con calma.', '¡Casi! Cada error te enseña algo nuevo.', '¡Buen avance, {alumno}! Ya casi lo dominas.'],
    animo: ['¡Casi, {alumno}! Mira las casillas en rojo: la próxima te sale.', 'Los errores también enseñan. ¡Tú puedes!', 'Respira, repasa la lección y vuelve a intentarlo.', 'Aprender lleva su tiempo. ¡Aquí estoy contigo, {alumno}!', 'Cada intento te acerca. ¡Ánimo!'],
    abierta: ['¡Qué buena respuesta escribiste, {alumno}!', '¡Me gusta cómo explicas tus ideas!', '¡Bien! Escribir lo que piensas ayuda a aprender.', '¡Muy completo, {alumno}! Sigue así.', '¡Esa idea está muy bien contada!'],
    actividadTerminada: ['¡Actividad terminada! ¡A celebrar, {alumno}!', '¡Lo terminaste! Buen trabajo hoy.', '¡Listo, {alumno}! Una actividad más en tu cuenta.', '¡Misión cumplida!'],
    progreso: ['¡Ya van {n} actividades hoy, {alumno}! Qué constancia.', '¡{n} actividades hoy! Estás en racha.', '¡Wow, {n} hoy! Me siento orgulloso de ti, {alumno}.'],
    final: ['Cuando termines, pulsa Calificar ✔️ en el menú.', '¡Llegaste al final, {alumno}! Revisa y luego califica.'],
    descanso: ['Llevas un buen rato, {alumno}. ¿Te estiras un minuto? 🙆', '¡Buen trabajo! Un vaso de agua y seguimos.'],
    chatSaludo: ['¡Hola, {alumno}! Pregúntame sobre este tema: te ayudo con pistas y ejemplos, sin darte la respuesta. 😉'],
    chatListo: ['💬 Te respondí en mi panel.', '💬 ¡Ya tengo tu respuesta! Mírala en el chat.'],
    chatSinPreguntas: ['Ya usaste tus preguntas de esta actividad. ¡Tú puedes con lo demás! 💪'],
    chatBloqueado: ['🤐 ¡Uy, casi se me escapa la respuesta! Mejor una pista: vuelve a leer la consigna y piensa qué te pide.'],
    chatPrivado: ['Por tu seguridad no envío correos ni números de teléfono. Pregúntame solo sobre el tema. 😊'],
    iaConectada: ['¡Estoy conectado a la IA, {alumno}! 🤖 Te traeré datos curiosos del tema.', '¡Conexión con la IA lista! Ahora sé muchas curiosidades de este tema.', '¡IA conectada! Ahora puedes preguntarme en mi panel 💬.'],
    cambio: ['¡Me encanta mi nuevo look!', '¡Listo, {alumno}! ¿Cómo me veo?', '¡Qué estilo! Gracias.', '¡Me siento como nuevo!'],
    nombreNuevo: ['¡Mucho gusto, {alumno}! Ahora te llamaré así.', '¡Qué lindo nombre, {alumno}!'],
    despertar: ['¡Uy, me dormí! Ya estoy aquí, {alumno}.', '¡Buenas! Desperté con energía.', '¡Desperté! ¿En qué vamos, {alumno}?', '*bostezo* ¡Listo, seguimos!'],
    // Sin IA (o mientras conecta): consejos de estudio para CUALQUIER materia,
    // más los de la materia de la actividad (consejoPorMateria, se detecta
    // sola). Con IA, la mascota además trae ideas del tema de cada página.
    consejo: [
      'Lee la consigna con calma y subraya las palabras clave.',
      'Si algo no queda claro, vuelve a leerlo por partes.',
      'Explicar una idea con tus palabras ayuda a entenderla.',
      'Un esquema o un dibujo ordena mucho las ideas.',
      'Revisa tu respuesta: ¿responde a lo que se pidió?',
      'Relaciona lo que aprendes con algo de tu vida diaria.',
      'Preguntar también es aprender. ¡Hazlo sin miedo!',
      'Equivocarse es parte de aprender. ¡Sigue!',
    ],
    // Por materia (el id que detecta js/materia.js). Se suman a "consejo".
    consejoPorMateria: {
      biologia: [
        '🧬 ¿Sabías que casi todas tus células guardan el mismo ADN?',
        'En biología, la forma de algo suele explicar su función. ¡Fíjate en eso!',
        '🌿 Las plantas fabrican su alimento con luz, agua y CO₂: eso es la fotosíntesis.',
        'Para entender un proceso, dibújalo paso a paso, como una receta.',
        'Relaciona cada órgano con su función: así se entiende el sistema completo.',
        '🔬 Los científicos observan, se preguntan y comprueban. ¡Haz lo mismo con cada tema!',
        'Las palabras de biología vienen del griego y el latín: "bio" significa vida.',
        'Busca la biología a tu alrededor: en la cocina, el patio o tu propio cuerpo.',
      ],
      matematica: [
        '📐 Antes de calcular, estima: ¿el resultado debería ser grande o pequeño?',
        'Escribe los datos que te dan y lo que te piden: ya tienes medio problema.',
        'Revisa tu resultado reemplazándolo en el problema.',
        'Un dibujo o una gráfica aclaran muchísimo un problema.',
      ],
      fisica: [
        '🪐 Anota las unidades en cada paso: te avisan si algo va mal.',
        'Haz un dibujo con las fuerzas o el movimiento antes de calcular.',
        'La física está en todo: al caminar, al frenar o al lanzar una pelota.',
      ],
      quimica: [
        '⚗️ En una reacción, la materia no se crea ni se destruye: se transforma.',
        'Fíjate en la tabla periódica: el lugar de un elemento dice mucho de él.',
        'Revisa que tu ecuación química esté balanceada.',
      ],
      lengua: [
        '📖 Lee dos veces: la primera para entender, la segunda para fijarte en los detalles.',
        'Subraya las ideas principales de cada párrafo.',
        'Al escribir, relee en voz alta: así encuentras lo que suena raro.',
      ],
      sociales: [
        '🌎 Ubica los hechos en una línea de tiempo: se entienden mejor.',
        'Pregúntate siempre por qué pasó algo y qué cambió después.',
        'Un mapa ayuda a entender dónde y por qué ocurrieron las cosas.',
      ],
      ingles: [
        '🇬🇧 Read the question twice before answering.',
        'Aprende palabras nuevas con ejemplos: se recuerdan mejor.',
        'Leer en voz alta en inglés mejora tu pronunciación.',
      ],
    },
  },
};
