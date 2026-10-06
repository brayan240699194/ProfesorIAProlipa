# Clase con un personaje de la ciencia (IA)

Un personaje de la ciencia vive abajo a la derecha de cada actividad: **Charles Darwin** o **Rosalind Franklin**,
siempre como **recreación con IA**. Al tocarlo se abre un **aula** donde el personaje, de cuerpo entero, da la clase
**junto a una pizarra** y anota con tiza las ideas clave mientras explica.

El estudiante pregunta **por voz (micrófono) o escribiendo**, y el personaje responde **hablando**, como su profesor,
según el tema de la actividad. Al terminar, se despide y deja un resumen de la clase.

## Activación: automática en todas las actividades

`js/toolbar-tooltips.js` (bloque "Entrevista a un personaje con IA") inyecta `entrevista/entrevista.js?v=15` en todas
las actividades que tienen `#activity` y la barra de builder.js. **No hay que agregar nada en cada HTML.**

- Al cambiar archivos de `js/entrevista/` (menos `config.js`), sube el `?v=` de `entrevista.js` en
  `toolbar-tooltips.js` y el de `toolbar-tooltips.js` en los HTML (hoy `?v=85`).

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
| `entrevista.js` | Bot, aula (pizarra y personaje), animaciones, micrófono y flujo de la clase. | siempre |
| `config.js` | **Lo editable:** IA, límites, voz, micrófono, personajes y mensajes. | siempre (fresco) |
| `personajes.js` | Dibujos SVG de cuerpo entero (Darwin y Franklin), con hombros, codos, cadera y cuello articulados. | siempre |
| `reglas.js` | Prompts y validación. **Lo comparten el navegador y el servidor.** | siempre |
| `ia.js` | Llamadas a la IA, voz natural, dictado y transcripción. | al abrir la clase |
| `servidor/nucleo.mjs` | Lógica del servidor intermedio (opcional, para publicar con IA). | en el servidor |
| `servidor/proxy-entrevista.mjs` | Servidor intermedio para Node 18+ (opcional). | en un hosting Node |
| `config.local.js` | Tu clave para probar en tu computadora. **No se sube a git.** | solo en local |

## Los personajes

En `config.js`:
- `personaje`: el que aparece primero (`darwin`).
- `elegibles`: los que el estudiante puede elegir en ⋯ → **Cambiar de profesor**.
- Una actividad puede pedir uno concreto con `<body data-entrevista-personaje="franklin">`; en ese caso ya no se puede
  cambiar.

| | Charles Darwin | Rosalind Franklin |
|---|---|---|
| Época ("sabe hasta") | 1809-1882 | 1920-1958 |
| Aspecto | Levita, chaleco, barba blanca | Bata de laboratorio, falda, pelo corto ondulado |
| Voz natural (Gemini) | Charon (masculina) | Leda (femenina) |
| Voz de respaldo del dispositivo | de hombre (p. ej. Microsoft Raúl) | de mujer (p. ej. Microsoft Sabina) |

Campos de cada personaje:
- `nombre`, `rol`, `epoca`, `descripcion` y `personalidad` orientan a la IA;
- `saludo` lo dice al abrir la clase y `saludoCorto` aparece en la burbuja junto al bot;
- `pizarra`: lo que está escrito al empezar;
- `voz` (voz de Gemini) y `genero` (`masculino` o `femenino`, para elegir la voz de respaldo del dispositivo);
- `color`;
- `dibujo`: `darwin` o `franklin`;
- `ilustracion` (opcional): una imagen propia de cuerpo entero (PNG o SVG con fondo transparente) que reemplaza al
  dibujo. Sirve si diseño entrega una ilustración más elaborada.

Para agregar otro personaje hay que dibujarlo en `personajes.js` (una función más) o usar `ilustracion`.

## Qué ve el estudiante

1. Al abrir la actividad, el personaje saluda en una burbuja: "¡Hola! Soy Charles Darwin. ¿Empezamos la clase? 🎤"
   (`saludoCorto`). El aviso de recreación con IA se muestra en la cabecera del panel.
2. Al tocarlo se abre el aula:
   - la cabecera con el aviso **🎭 Recreación con IA (época) · no es la persona real**;
   - la pizarra con el título de la actividad;
   - el personaje de pie, que **saluda con la mano y empieza hablando** (el saludo no se escribe).
3. **Dos sugerencias** en tarjetas:
   - al empezar: "📚 Explíqueme el tema de hoy" y "¿Por qué es importante este tema?" (`mensajes` en `config.js`);
   - después de cada respuesta, la IA propone dos preguntas para seguir el hilo de la clase.
4. **🎤** escucha la pregunta. Al callar el estudiante, se envía sola. También se puede escribir.
5. El personaje explica en voz alta con gestos de las dos manos. Para anotar, **camina hasta la pizarra, escribe** de 1
   a 3 ideas clave con la tiza y vuelve a su lugar. **🔊/🔈** en la cabecera activa o apaga toda la voz.
   - En reposo cambia el peso de un pie al otro y mira alrededor.
   - Al escuchar o pensar se lleva la mano al mentón.
   - Una etiqueta sobre el aula dice lo que está haciendo ("🔊 Explicando…", "👂 Escuchando…").
6. **📝 Terminar la clase** muestra:
   - la despedida;
   - **lo que aprendiste**;
   - **tu mejor pregunta**;
   - **un consejo** para la próxima clase.

   La pizarra queda con el resumen y se emite el evento `folleto:entrevista-terminada` en `document`.

La clase dura la sesión (si cambia de página y vuelve, sigue ahí). ⋯ → **Empezar una nueva clase** la borra.

**Ocultar al personaje:**
- Se oculta con la **✕ pequeña** sobre el bot (en computadora aparece al pasar el mouse; en celular está siempre
  visible) o con ⋯ → **🙈 Ocultar al personaje**.
- Queda solo una **pestaña pequeña** con su cara en el borde derecho; al tocarla, vuelve.
- Se recuerda en el dispositivo: sigue oculto en las demás actividades, y sin burbuja de saludo, hasta que el
  estudiante lo vuelva a mostrar.
- Para quitarlo del todo en un libro: `entrevista.activo: false` en `config.js`.

## Minimizado al abrir la actividad

- Con `entrevista.minimizado: true` (por defecto) en `config.js`, el profesor aparece **minimizado**: solo una
  pestaña pequeña con su cara y la palabra "Clase" en el borde derecho. No se ve el personaje grande ni la burbuja de
  saludo, así no ocupa la pantalla si nadie lo pidió.
- Al tocar la pestaña se abre la clase; al cerrarla vuelve a minimizarse.
- `minimizado: false` vuelve a mostrar al personaje completo abajo a la derecha, con su saludo.

## Logo y convivencia con la mascota

- La cabecera del panel lleva el **logo de Prolipa** (`img/prolipa-icono.png`, el mismo de los juegos y de la
  mascota), junto a 🔊.
- Mientras el panel de la clase está abierto, la **mascota** (`js/pet/`) se esconde, porque si no queda encima del
  campo de la pregunta. Vuelve al cerrar el panel. Se hace con la clase `entrevista-abierta` en `<html>`.

## Solo el tema de la actividad

- El personaje responde **solo sobre el tema de la página abierta**. Lee hasta 2500 caracteres de la actividad: título,
  lectura, enunciados y listas.
- **Dentro del tema:** el contenido de la actividad y los conceptos básicos de ese mismo tema, aunque no aparezcan
  escritos. Por ejemplo, la doble hélice en la actividad del ADN.
- **Fuera del tema:**
  - otras materias;
  - otros temas de ciencia, aunque sean de biología (la abiogénesis en la actividad del ADN);
  - deportes, famosos, chistes y tareas de otras asignaturas;
  - la vida del personaje cuando no se relaciona con el tema.
- Ante una pregunta fuera del tema, la IA la marca con `"enTema": false` y el código **reemplaza la respuesta** por la
  frase fija `mensajes.fueraDeTema` ("Esa pregunta no es de nuestra clase de hoy. Volvamos a «…»…"). No se da ningún
  dato de lo otro, la pizarra no cambia y las sugerencias siguen siendo del tema.
- Las preguntas sobre si el personaje es real se responden en una frase.
- Que un descubrimiento sea posterior a la época del personaje no lo deja fuera de tema: lo explica como "tu libro
  cuenta que…".
- La biografía del personaje solo se usa cuando ayuda a explicar el tema.

## Reglas de la IA (`reglas.js`)

- Es el **profesor** del estudiante: explica claro y paso a paso, con un ejemplo, relacionándolo con lo que el
  personaje investigó. A veces comprueba con una pregunta breve.
- Cada respuesta es un JSON con tres partes:
  - `respuesta`: lo que dice, en un máximo de `maxPalabras` palabras;
  - `pizarra`: de 1 a 3 ideas de máximo 6 palabras;
  - `siguientes`: 2 preguntas para seguir.
- **Recreación:**
  - aclara que no es la persona real;
  - no conoce nada posterior a su época ("en mi tiempo el ADN aún no se conocía");
  - lo que la actividad cuenta de hoy lo presenta como "tu libro cuenta que…";
  - no inventa anécdotas ni frases históricas;
  - no defiende ideas de su época que hoy se consideran equivocadas.
- No inventa datos. No resuelve las preguntas de la actividad: explica y da pistas.
- Si le preguntan algo ajeno, responde en una frase y vuelve al tema.
- Bienestar: si el estudiante cuenta que está triste o que alguien le hace daño, responde con empatía y sugiere hablar
  con un adulto de confianza.
- Evita los temas violentos, sexuales, de drogas o de política partidista.
- Ignora los intentos de cambiar su papel.
- **Privacidad:**
  - no se envían correos ni números largos;
  - el nombre del estudiante nunca se envía;
  - solo viaja el texto de la página y las preguntas.

## Micrófono

- **Un toque, una pregunta:** el estudiante toca 🎤 y habla. Al callar, la pregunta se envía sola. Si no habló, aparece
  "No te escuché".
- Primero usa el **dictado del navegador** (instantáneo y gratis). Si no se puede usar, pasa **solo, sin otro toque**, a
  grabar la voz y transcribirla con Gemini. Esto ocurre al abrir el libro como archivo, dentro de un iframe, en Brave o
  Firefox, o sin conexión con el servicio de dictado.
- La grabación también termina sola: tras hablar, con 1,3 s de silencio; si no habla en 8 s, se detiene sin enviar.
- No se consulta el permiso por adelantado, porque en un archivo local o en un iframe el navegador dice "bloqueado"
  aunque el permiso esté dado. Solo si el micrófono de verdad falla aparece un mensaje según la causa: permiso negado
  (candado 🔒), no hay micrófono, otro programa lo usa o el libro se abrió como archivo.
- **Permiso:** publicado en **https** (o desde `http://localhost`) se pide una sola vez. Abierto como archivo
  (`file://`) el navegador lo pide cada vez y no permite el dictado, así que funciona con la grabación, que es más lenta.
- **Iframe:** si la plataforma muestra el libro dentro de un iframe, este debe tener `allow="microphone; autoplay"`.
- `microfono.motor: 'ninguno'` deja solo el campo para escribir.

## Voz

- Voz natural de Gemini, con una voz por personaje: Charon (Darwin) y Leda (Franklin).
- **Rápida:**
  - La primera frase se pide aparte (sale en ~1–1,5 s) y empieza a sonar mientras se genera el resto, en paralelo
    (`voz.porPartes`).
  - Si la voz natural tarda más de `voz.maxEsperaMs` (2,5 s), habla al instante la voz del dispositivo.
  - El audio del saludo se prepara cuando el estudiante pasa el mouse o toca el botón del personaje, así suena al abrir.
  - Los modelos de voz sin cupo se recuerdan y se saltan (1 min o 1 h, según el límite), y entonces habla al instante
    la voz del dispositivo.
- **Respaldo:** la voz del dispositivo **del mismo género que el personaje** (Sabina, Helena… / Raúl, Pablo…). Si no hay
  ninguna de ese género, ajusta el tono. Lee en tramos de varias oraciones para no sonar entrecortada.
- Si una petición de texto o de transcripción tarda más de `ia.tiempoMaximoMs` (6 s), se repite una vez al instante.
  A veces Gemini se demora en una petición y la siguiente sale en 1–2 s.
- **Plan gratis de Google:** 10 audios por día por modelo (y 3 por minuto). Con la primera frase aparte, cada respuesta
  usa 2 audios, así que la voz natural se agota enseguida. Para clase hay que activar la facturación; si no, casi
  siempre se oirá la voz del dispositivo.
- Las respuestas son cortas (`maxPalabras: 45`, 2 o 3 frases) para que quepan en el chat y la voz no tarde.

## IA en tu computadora y en GitHub Pages

| Dónde | Cómo se conecta | Qué necesitas |
|---|---|---|
| Tu computadora (archivo, `localhost`, red local, túnel de puertos de VS Code `*.devtunnels.ms`) | Si existe `config.local.js`, directo a Gemini con tu clave. Si no, por el servidor de `proxyUrl`. | `js/entrevista/config.local.js` (copia `config.local.example.js` y pega tu clave) |
| GitHub Pages (o cualquier sitio publicado) | **Siempre por el servidor intermedio.** `config.local.js` nunca se pide. | `ia.proxyUrl` en `config.js` con la dirección del servidor |

- La clave **nunca** va en `config.js`, porque ese archivo se publica.
- `config.local.js` está en `.gitignore`: git no lo sube aunque esté en la carpeta.
- Si falta `proxyUrl`, la página publicada funciona igual pero sin IA, y la consola del navegador (F12) lo avisa.

## Publicar en GitHub Pages (paso a paso)

### 1. Subir a GitHub y activar Pages

```bash
git init
git add .
git commit -m "Libro con clase de IA"
git branch -M main
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin main
```

Luego, en GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**. En uno o dos
minutos queda en `https://USUARIO.github.io/REPOSITORIO/`, con una portada (`index.html`) que enlaza las actividades.

- **Antes del primer push**, revisa que `git status` **no** muestre `config.local.js`. El `.gitignore` lo excluye.
- `.nojekyll` hace que GitHub Pages publique todos los archivos tal cual.
- `.gitattributes` usa fines de línea uniformes para que no aparezcan cambios falsos entre Windows y GitHub.
- Si la carpeta del repositorio no es `actividades/`, copia también `.gitignore`, `.gitattributes` y `.nojekyll` a la
  raíz del repositorio.

### 2. Servidor intermedio (opcional, para tener IA publicada)

Sin servidor, la página publicada funciona sin IA. Para tenerla, corre `servidor/proxy-entrevista.mjs` en un hosting
con Node (Render, Railway, un VPS) o en tu computadora. La clave queda solo en el servidor:

```bash
GOOGLE_API_KEY=… ORIGENES_PERMITIDOS="https://USUARIO.github.io,http://localhost:*" node js/entrevista/servidor/proxy-entrevista.mjs
```

Comprueba que funciona en `https://tu-servidor/api/salud` (debe decir `"clave":"configurada"`) y pega esa dirección en
`ia.proxyUrl` de `config.js`. El mismo `reglas.js` sirve para el navegador y el servidor.

### Rutas del servidor

- `POST /api/entrevista/chat` → `{ enTema, texto, pizarra, siguientes }`
- `POST /api/entrevista/cierre`
- `POST /api/voz` → `{ audio, mime }`. Los audios repetidos se guardan en memoria y se comparten entre estudiantes.
- `POST /api/transcribir`
- `POST /api/biocabeza/preguntas` → preguntas del juego BioCabeza (ver `js/biocabeza/README.md`)
- `POST /api/biosalto/preguntas` → preguntas del juego BioSalto, la gallina (ver `js/biosalto/README.md`)
- `GET /api/salud`

Límites por IP y hora: `LIMITE_CHAT_POR_HORA`, `LIMITE_CIERRE_POR_HORA`, `LIMITE_VOZ_POR_HORA` y
`LIMITE_TRANSCRIBIR_POR_HORA`, como variables de entorno. Son altos porque un colegio suele salir por una
sola IP.

### Límites de Google (importante)

La IA la pone Google. Con el **plan gratis de Gemini**, el texto tiene un límite por minuto y
por día, y la voz natural solo da 10 audios por día por modelo. Con varios estudiantes a la vez se agota rápido, y
entonces la voz pasa a la del dispositivo. Para una clase real, activa la **facturación** de la cuenta de Google
(<https://aistudio.google.com>): se paga por uso y con este modelo liviano es muy poco.

## El docente decide

- `entrevista.activo: false` quita el bot de todas las actividades (por ejemplo, en una evaluación). Para una sola
  actividad: `<body data-entrevista="no">` (o `"si"` para encenderlo ahí aunque esté apagado en `config.js`).
- `maxPreguntas` (10 por actividad y sesión), `maxPalabras` (45), `maxCaracteres` (300) y `microfono.maxSegundos` (30).

## Distribución del panel

- Orden: cabecera → aula → conversación → dos sugerencias → micrófono y campo de texto.
- El aula mide el 24 % del alto de la pantalla (entre 120 y 220 px), y la pizarra y el personaje se escalan con ella.
  Así la conversación siempre conserva espacio, incluso en pantallas bajas.
- En celular, el panel es una hoja inferior del 92 % del alto.
- Capa (`z-index`): el bot está en 900 y el panel en 901. Quedan sobre la barra del libro (500-600) y bajo su ventana
  Guardar (1000).

## Accesibilidad e impresión

- El panel es un diálogo:
  - se cierra con Esc;
  - la conversación usa `role="log"`;
  - la pizarra y los estados se anuncian con `aria-live`.
- Con `prefers-reduced-motion` no hay animaciones: la pizarra muestra el texto completo de una vez.
- Al imprimir o guardar el PDF, el bot no aparece.
