# Mascota virtual — integración

Una mascota original acompaña al estudiante por todo el libro. Hay 10 personajes (5 para jóvenes de bachillerato, que salen primero: Astronauta, Lobo urbano, Nova IA, Fénix y Mapache; y 5 para niños: Zorrito, Gatito, Dragón bebé, Pingüino y Ajolote), 11 colores y 11 accesorios
combinables. La mascota reacciona a lo que el estudiante hace y puede dar ideas cortas sobre el tema con IA.
No cambia la calificación ni el PDF.

## Activación: automática en todas las actividades

La carga `js/toolbar-tooltips.js` (bloque final "Mascota virtual"), que usan las 18 actividades y cualquier
archivo nuevo hecho con la plantilla. **No hay que agregar nada en cada HTML** ni tocar builder.js:

- solo se activa en páginas de actividad (con `#activity` y la barra de builder.js);
- `mascota.js` se protege para no cargarse dos veces;
- al cambiar `toolbar-tooltips.js`, se sube su `?v=` en los HTML (hoy `?v=81`).

### Encender o apagar la mascota

- **En todas las actividades:** `activa: true` o `false`, al inicio de **`js/pet/config.js`**. Se aplica al
  recargar. Apagada, no aparece ni la mascota ni su botón en la barra.
- **Solo en una actividad:** en su `<body>`, `data-mascota="no"` (o `"si"` para mostrarla ahí aunque esté apagada
  en `config.js`). Manda sobre `config.js`.
- Se combina con los otros interruptores del libro:

  ```html
  <body class="bg-stone-50" data-mascota="no" data-entrevista="si" data-juegos="biosalto">
  ```

  | Atributo | Qué controla | Dónde está el interruptor general |
  |---|---|---|
  | `data-mascota` | la mascota | `js/pet/config.js` → `activa` |
  | `data-entrevista` | el profesor con IA | `js/entrevista/config.js` → `entrevista.activo` |
  | `data-juegos` | los juegos | `js/juegos/config.js` |

Otro libro sin ese archivo puede incluirla a mano:
`<script src="js/pet/mascota.js?v=3" data-libro="id-del-libro" defer></script>`.
Opcionalmente, `data-config="js/pet/otra-config.js"` usa otra configuración.

## Materia automática (`js/materia.js`)

La mascota, el profesor con IA y los dos juegos **se adaptan solos a la materia del libro**: no hay que configurar
"Biología" en ningún lado. Si se copia la carpeta a un libro de Matemática, todos hablan de Matemática.

- **Los temas ya eran automáticos:** cada IA lee el texto de la actividad abierta.
- **La materia la deduce `js/materia.js`** sin internet, de más a menos seguro:
  1. `<body data-materia="Matemática">` en una actividad: manda siempre.
  2. **El libro entero:** suma lo que encuentra en las actividades abiertas de la carpeta y en la portada
     (`index.html`, que solo se puede leer publicada o con un servidor). Necesita al menos dos actividades o la portada.
     Así, una actividad que mezcla materias ("El origen de la vida" habla de moléculas; "Nuevas energías", de
     circuitos) no confunde al libro. Se recuerda en el navegador, por carpeta.
  3. El nombre de la materia escrito **como materia** en la página ("Objetivo de Biología", "Biología 1"). "Evolución
     química" no cuenta.
  4. Si aún no está seguro, no nombra ninguna materia y cada IA la deduce sola del texto de la actividad.
- Reconoce Biología, Matemática, Física, Química, Lengua y Literatura, Estudios Sociales e Inglés.
- `js/entrevista/config.js` → `libro.nombre` y `js/pet/config.js` → `nombreLibro` quedan **vacíos** (automático).
  Si se escribe un nombre ahí, se usa ese.
- La mascota suma a sus consejos de estudio los de la materia detectada (`mensajes.consejoPorMateria` en
  `js/pet/config.js`).
- **Lo que sigue siendo de Biología** y habría que cambiar a mano en un libro de otra materia:
  - los personajes del profesor (Charles Darwin y Rosalind Franklin);
  - las preguntas de ejemplo de los juegos (solo se usan sin IA);
  - los nombres "BioCabeza" y "BioSalto".

## Archivos

| Archivo | Qué contiene | Cuándo se carga |
|---|---|---|
| `mascota.js` | Interfaz, panel, arrastre, estados de ánimo, animaciones, eventos y almacenamiento (`PetStorage`, `LocalStorageAdapter`, `MongoAdapter`). | siempre |
| `config.js` | **Lo editable:** IA, tiempos, frecuencias, personajes, colores, accesorios y banco de mensajes. | siempre |
| `personajes.js` | Los 10 dibujos en SVG y los 12 accesorios. | siempre |
| `ia.js` | Ideas del tema con OpenRouter y su caché. | solo si la IA está configurada |
| `servidor/proxy-openrouter.mjs` | Servidor intermedio que guarda la clave (Node 18+, sin dependencias). | en tu servidor, no en el navegador |

## Panel "Mascota" (botón de la barra o ⋯ sobre la mascota)

Estilo del proyecto: cabecera con degradado celeste → azul. Los cambios se guardan solos; solo la primera visita
tiene "Ahora no" y "¡Listo!".

- **Cabecera:**
  - la mascota (**tócala y salta**) con una **bolita discreta**: 🟢 IA conectada · 🟡 sin conexión;
  - su nombre, con los botones **💬 Chat** y **✏️ Editar** debajo;
  - a la derecha, **⚙️ Opciones** junto a la **✕**.
- **💬 Chat (se abre por defecto):** solo la conversación y el campo para escribir.
- **✏️ Editar:** **Nombres** (tu nombre, el de la mascota y **tu colegio**) · **Personaje** · **Color** ·
  **Accesorios**.
- **⚙️ Opciones:** mostrar u ocultar, sonido, cuánto habla, tamaño y volver a la esquina. La IA está siempre
  activa si está configurada en `config.js`.

- **Logo de Prolipa** en la cabecera, junto a ⚙️ (`img/prolipa-icono.png`, el mismo de los juegos).

**Chompa del colegio:**
- Al escribir el colegio en Editar → Nombres, se desbloquea en Accesorios → Cuerpo la **"Chompa del colegio"**
  con su **inicial** en el pecho. La inicial se toma de la primera palabra que no sea genérica: "Unidad
  Educativa San José" → **S**, "Colegio Benalcázar" → **B**.
- Es opcional, se elige su color (`coloresChompa` en `config.js`) y las mangas también toman ese color.
- Si se borra el colegio, la chompa se quita.
- El colegio, igual que el nombre, se guarda **solo en este dispositivo**.

**Posición:** con `recordarPosicion: 'nunca'` (por defecto), la mascota aparece siempre en la posición de
`config.js` al abrir cada actividad. Si la arrastras, se queda ahí solo en esa página.

- La esquina de abajo a la derecha es del **profesor con IA** (`js/entrevista/`, un botón de 72 px). Para que no se
  tapen:
  - en la computadora, la mascota va **encima** de él (`posicion: { derecha: 16, abajo: 104 }`);
  - en el celular (menos de 640 px), va a su **izquierda** (`posicionCelular: { derecha: 100, abajo: 16 }`), porque ahí
    el saludo del profesor sale encima de él.
- Los dos valores están en píxeles, desde la esquina inferior derecha. **⚙️ Opciones → Volver a la esquina** la
  regresa a esa posición.

## Tu nombre

- En el panel, **Editar → Nombres → Tu nombre**. Si no lo escribiste, la mascota lo pide **una sola vez**.
- La mascota lo usa en saludos, felicitaciones y a veces en las ideas ("Ana, ¿sabías que…?").
- Sin nombre, los mensajes se ajustan solos: "¡Hola, {alumno}!" queda en "¡Hola!".
- El campo "¿Cómo te llamas?" del modal Guardar sale lleno con ese nombre (se puede cambiar).
- **Privacidad:** se guarda solo en este dispositivo (`localStorage`, clave `prolipa-mascota-alumno:<id>`). Nunca se
  envía a la IA ni al servidor (ni con `almacenamiento: 'mongo'`).
- En los mensajes de `config.js` se usa el marcador `{alumno}`.

## Continuidad entre actividades

- **Para siempre** (localStorage o Mongo): personaje, nombre, color, accesorios y opciones.
- **Durante la sesión** (sessionStorage, hasta cerrar el libro): posición, actividades calificadas hoy y mensajes
  ya dichos, para no repetirlos al cambiar de página.

Al pasar de una actividad a otra, la mascota aparece en el mismo lugar y no vuelve a saludar. Con
`recordarPosicion: 'siempre'` la posición también se guarda para siempre.

## Reacciones

| Qué pasa | Reacción |
|---|---|
| Llega (visita nueva) | Saludo según la hora · 1–4 días sin venir: "¡Te extrañé!" · 5+ días: celebra el reencuentro |
| Califica todo bien | Voltereta, cohete o doble salto con confeti; con racha ≥ `rachaParaBailar`, baila con 🔥 |
| Califica con errores | "Vas bien" o palabras de ánimo, nunca reproches; después, "¡Actividad terminada!" |
| 3, 5, 8, 12 y 18 actividades en la sesión | Celebra el avance ("¡Ya van 5 actividades hoy!") |
| Pregunta abierta completa | Late y felicita (una vez por campo) |
| Clic | Uno de 8 movimientos, sonido corto (desactivable) y a veces una idea del tema |
| 5 clics seguidos | Se marea y se ríe |
| Sin actividad (`dormirMinutos`) | Se duerme; al volver, se estira y saluda |
| Llega al final sin calificar | Recuerda calificar (una vez; no con "pocos") |
| Mucho rato estudiando (`descansoMinutos`) | Sugiere un descanso corto (una vez) |
| En reposo | Respira, parpadea, mueve los piecitos, balancea los brazos, mueve la cola o las alas, mira alrededor y a veces saluda con la mano |
| Brazos | 👋 saluda con la mano · 🙌 levanta los dos brazos al festejar · 👏 aplaude · 💃 mueve los brazos al bailar · 💪 brazo de "¡tú puedes!" cuando hay errores. El fénix usa sus alas y el pingüino sus aletas. |

Siempre en positivo: nunca se enferma, no reclama ni culpa. Solo habla sola si el estudiante estuvo activo en el
último minuto, y con la pausa que marca la frecuencia elegida.

## IA con OpenRouter

Por cada actividad, la mascota pide mensajes de máximo 20 palabras en tres grupos:

| Grupo | Ejemplo | Cuándo sale |
|---|---|---|
| 🤓 Datos curiosos | "Tu corazón late unas 100 000 veces al día, ¡sin descanso!" | lo más seguido; y como premio después de calificar |
| 💡 Consejos o pistas | "Dibuja el recorrido del alimento: boca, esófago, estómago…" | al tocarla, sola y con "Idea del tema" |
| 💪 Ánimo del tema | "¡Cada célula que entiendes te acerca a entender la vida!" | también, la mitad de las veces, cuando hay errores al calificar |

El libro es **Biología 1 · BGU** (`idLibro: 'bio1-bgu'`, `nombreLibro` en `config.js`, el mismo del profesor con IA):
la IA recibe esa materia y el texto de cada página. Los mensajes `consejo` (sin IA) son datos y consejos de
biología.

**Reglas del prompt:**
- nunca da la respuesta de los ejercicios ni usa sus números;
- los datos curiosos deben ser verdaderos: no inventa cifras, porcentajes ni estudios;
- nada negativo;
- como máximo un emoji por mensaje.

Solo se envía el texto de la página (títulos y enunciados), nunca datos ni respuestas del estudiante; su nombre
se agrega en el navegador.

**Caché:**
- Una petición por actividad cada `cacheHoras` (72 h) por dispositivo.
- El servidor intermedio además comparte las ideas entre estudiantes durante 24 h.
- Si no hay IA, falla o tarda más de `tiempoMaximoMs`, usa los mensajes `consejo` de `config.js`.
- **Reintentos:**
  - Gemini a veces tarda ~20 s en una petición y la siguiente sale en 1–2 s. Por eso cada intento tiene su propio
    tiempo (`tiempoMaximoMs`) y, si se agota, se repite al instante con 6 s más. Con 429 o 500/503, se repite tras 2 s.
  - Si aun así falla por algo **pasajero** (tiempo, internet o límite por minuto), la mascota **vuelve a intentar
    sola** a los 20, 40 y 60 s, y no guarda el fallo.
  - Solo los fallos que no se arreglan solos (clave no válida, sin crédito, modelo inexistente: 400, 401, 402, 403 y
    404) se recuerdan 10 minutos.
  - **⚙️ Opciones → Probar conexión** prueba en el momento, sin esperar.
- `config.js` se pide siempre fresco: un cambio de clave o de mensajes se aplica al recargar.
- Los demás archivos de `js/pet/` usan `?v=` (subirlo en `toolbar-tooltips.js` al cambiarlos).

### ¿Dónde pongo la API key?

Todo está al inicio de **`js/pet/config.js`**, en el recuadro "AQUÍ SE CONFIGURA TU API KEY".

1. Crea la clave en **openrouter.ai/keys**.
   - Es larga: `sk-or-v1-` seguido de 64 letras y números.
   - Ponle un límite de crédito.
2. Elige cómo usarla:
   - **Pruebas en tu computadora:** copia `js/pet/config.local.example.js` como `js/pet/config.local.js` y pega
     allí la clave (`ia.apiKey`). Ese archivo está en `.gitignore`: **nunca se sube a GitHub**. La mascota lo carga
     sola cuando `config.js` no trae `apiKey` ni `proxyUrl`; si no existe, sigue sin IA. En `config.js` deja
     siempre `apiKey: ''`. Ojo: la clave igual se ve con F12 en el navegador; no subas `config.local.js` al servidor.
   - **Libro publicado (recomendado):** deja `apiKey` vacío y levanta el servidor intermedio:
     ```bash
     OPENROUTER_API_KEY=sk-or-v1-…  ORIGENES_PERMITIDOS=https://prolipadigital.com.ec  node js/pet/servidor/proxy-openrouter.mjs
     ```
     Después pon `ia.proxyUrl: 'https://tu-servidor/api/mascota/mensajes'`.
     - Opcionales: `OPENROUTER_MODELO`, `PORT` (8787) y `LIMITE_POR_HORA` (60 por IP).
     - Comparte las ideas de cada tema entre todos los estudiantes durante 24 h.
3. La IA se conecta sola al abrir la actividad. El estado se ve en la cabecera del panel y en **Opciones**.
   - Si conecta, la mascota dice "¡Estoy conectado a la IA!" (una vez por sesión) y aparece 🟢 "Conectada a la
     IA".
   - Si falla, 🔴 dice el motivo: clave no válida (401), sin crédito (402), modelo incorrecto (400/404),
     demasiadas peticiones (429), sin conexión o tiempo agotado. Mientras tanto usa las ideas del libro.
   - Al cambiar la clave, el servidor o el modelo, se vuelve a probar sola (la caché depende de esa
     configuración).

Con Google (`proveedor: 'google'`) el modelo actual es `gemini-3.5-flash-lite`. Con OpenRouter, `anthropic/claude-haiku-4.5` (verificado en openrouter.ai/models y probado con una clave real; rápido y barato). Se
cambia en `ia.modelo` o, con el servidor, en `OPENROUTER_MODELO`.

## Chat "Preguntar" (tutor con IA)

La pestaña **💬 Chat** del panel (la que se abre por defecto) permite escribir preguntas
sobre el tema. **Cómo protege al estudiante:**
- **No da respuestas.**
  - El prompt le pide guiar con pistas y preguntas, un paso a la vez.
  - Además, la mascota compara cada respuesta con las respuestas correctas de la página: los `data-valor` y
    `data-resp` que ya usa la calificación.
  - Si la IA escribe una de ellas, la vuelve a pedir con reglas estrictas; si insiste, muestra una pista del
    libro. El estudiante nunca la ve.
  - Los números de una cifra solo se bloquean en frases como "= 7" o "es 7", para no bloquear "paso 2".
- **Solo temas de estudio:** si le preguntan otra cosa, redirige al tema con amabilidad.
- **Bienestar:** si el estudiante dice que está triste, tiene miedo o alguien le hace daño, responde con empatía y
  sugiere hablar con su docente, su familia o un adulto de confianza.
- **Privacidad:**
  - no envía correos ni números largos (teléfonos, cédulas): los detecta antes de mandar;
  - el nombre del estudiante no se envía: la IA escribe `{alumno}` y se reemplaza en el dispositivo;
  - aviso fijo: "No escribas datos personales".
  - Ojo: lo demás que escriba el estudiante sí viaja a OpenRouter.
- **Límite:** `chat.maxPreguntas` (15) por actividad y sesión. Una pregunta que falla por conexión no se descuenta.
- **Respuestas:** máximo `chat.maxPalabras` (50), en tono cercano y sin asumir el género del estudiante. La
  conversación dura mientras el libro esté abierto (sesión).
- **El docente decide:** `chat.activo: false` lo apaga (por ejemplo, en una evaluación).
- **Voz (escuchar el chat):**
  - El interruptor **"Leer las respuestas en voz alta"** (arriba del chat) hace que lea sola cada respuesta nueva. Viene apagado y se recuerda en el dispositivo (`voz`). Debajo, un aviso dice "⏳ Preparando la voz…" o "🔊 Leyendo la respuesta…". Ponerlo en **No** la calla.
  - **Voz natural** (`config.voz.motor: 'ia'`): Google Gemini convierte el mensaje en audio con voz humana. Se envía solo el texto de la mascota, sin instrucciones (lo que se envía es exactamente lo que se lee). Cada personaje tiene su voz (`voz.porPersonaje`).
    - Tarda unos 5 s la primera vez. Si se vuelve a pedir el mismo mensaje, sale de la memoria al instante.
    - Pruebas: usa la clave de Google de `ia.apiKey` (en `config.local.js`). Publicado: el servidor intermedio, con la variable `GOOGLE_API_KEY` (ruta `/api/mascota/voz`, con caché compartida).
    - **Límite del plan gratis de Google:** 3 audios por minuto y un tope diario pequeño, POR MODELO. Por eso `voz.modelos` es una lista: si uno se llena, usa el siguiente. Para una clase entera hace falta activar la facturación de la cuenta de Google.
  - Si la voz natural no está disponible (sin clave de Google, sin cupo o sin internet), usa la voz del dispositivo (Web Speech API). Es gratis y no envía nada, pero suena más robótica; se elige la voz más natural que tenga el equipo.
  - `config.voz.motor: 'dispositivo'` usa siempre la voz del dispositivo.
  - Antes de leer quita los emojis y lee las fórmulas por letras: "CO₂" como "C O 2" y "C₆H₁₂O₆" como "C 6 H 12 O 6".
  - Se calla al cerrar el panel, al cambiar de pestaña o al salir de la página.
  - Si no hay ninguna voz disponible, el interruptor no aparece.
  - Si no se oye en el celular, revisar el volumen multimedia (y en iPhone, el modo silencio).

**Publicado: solo con el servidor intermedio.**
- Con la clave en el navegador, cualquiera podría usarla como chat gratis.
- El servidor atiende `POST …/api/mascota/chat` (la misma dirección de `proxyUrl` terminada en `/chat`).
- Valida los datos y aplica su propio límite: `LIMITE_CHAT_POR_HORA`, 40 por IP.

## Almacenamiento

- **`almacenamiento: 'local'`** (actual): clave `prolipa-mascota:<libro>:<studentId>`, todo con try/catch.
  - Hoy las actividades no reciben ningún id del estudiante, así que `studentId = 'anonimo'` (este dispositivo).
  - Con `?estudiante=<id>` en la URL se usa ese id (letras, números, `-` y `_`).
- **`almacenamiento: 'mongo'`** + `apiBase`: `GET` y `PUT {apiBase}/api/pet/:studentId?libro=…` con
  `credentials: 'include'`.
  - Nunca se conecta directo a MongoDB.
  - Si el servidor falla, sigue con una copia local.
  - El backend (no está construido) debe:
    - leer la cadena de conexión de una variable de entorno;
    - aceptar CORS solo del dominio de la plataforma;
    - comprobar que `:studentId` sea el usuario logueado (si no, 403);
    - validar los campos como lo hace `normalizar()` en `mascota.js`.

## Accesibilidad, rendimiento y PDF

- **Mensajes:** se leen en una región `aria-live="polite"`.
- **Panel:** es un diálogo con pestañas navegables con flechas; atrapa el foco, se cierra con Esc y devuelve el
  foco a donde estaba.
- **Teclado:** con la mascota enfocada, las flechas la mueven (Shift = paso grande).
- **`prefers-reduced-motion`:** sin animaciones ni partículas; las expresiones y los mensajes siguen.
- **Rendimiento:** usa un solo temporizador cada 15 s, animaciones con Web Animations API (sin librerías),
  eventos pasivos y la IA en tiempo libre del navegador (`requestIdleCallback`).
- **PDF:** todo lleva `print:hidden`; la mascota no aparece al guardar el PDF.
