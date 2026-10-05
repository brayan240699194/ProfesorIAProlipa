# BioCabeza: el juego de los sombreros biológicos

Funciona como un filtro de TikTok, pero para aprender. La cámara frontal muestra al estudiante. Arriba aparece una
**nube** con una pregunta creada por la IA, y sobre su cabeza flotan **tres sombreros** con las opciones. El estudiante
mueve la cabeza a la izquierda o a la derecha hasta quedar bajo una opción y se queda **quieto 1,5 s**: esa es su
respuesta. Si acierta, el sombrero explota en confeti y la cámara hace zoom.

Página: `biocabeza.html` (enlazada desde `index.html`).

## Botón "Juego" en el menú de cada actividad

En la barra flotante (Ayudas, Guardar, Reiniciar, Calificar, Info) hay un botón **Juego**, celeste, con el símbolo del
logo de Prolipa (los tres libros) en blanco. Tiene un punto azul hasta que se usa por primera vez. Lo agrega
`js/toolbar-tooltips.js` en todas las actividades, sin tocar cada HTML ni `builder.js`. También aparece en el recorrido
de **Info**.

- **Qué juegos se muestran:** en `js/juegos/config.js`, con `biocabeza: true/false` y `biosalto: true/false`. Vale
  para todas las actividades y se aplica al recargar.
  - Los dos en `true`: el botón **Juegos** abre el menú para elegir.
  - Solo uno en `true`: el botón lleva el nombre del juego ("BioCabeza" o "BioSalto") y lo abre directo, sin menú.
    El juego no muestra **← Juegos**.
  - Los dos en `false`: el botón no aparece, tampoco en el recorrido de Info.
  - Para **una sola actividad**, sin tocar ese archivo, se pone en su `<body>`: `data-juegos="biocabeza"`,
    `data-juegos="biosalto"`, `data-juegos="biocabeza,biosalto"` o `data-juegos="ninguno"`.
- Abre el **menú de juegos** (`juegos.html`) **en un marco sobre la actividad**: no se sale de la página ni se pierde
  lo que el estudiante ya respondió. Ahí se elige **BioCabeza** (cámara) o **BioSalto**, la gallina (micrófono, ver
  `js/biosalto/README.md`). Cada juego tiene **← Juegos** para volver al menú. Al cerrar, se apagan la cámara y el
  micrófono.
- **El tema no se elige.** Cada actividad le manda al juego su **título y su texto** (hasta 2500 caracteres, sin campos
  ni botones), y la IA pregunta solo sobre **ese contenido**: desde uni1act1, preguntas de uni1act1, y así con todas.
  El inicio muestra "📘 Las preguntas son de tu actividad: «…»". No hay campo de tema ni temas sugeridos.
- Abierto con el QR en el celular, el tema llega en la dirección (`?tema=`). Allí la IA usa el título de la actividad;
  el texto completo no viaja en el QR. Abierto sin actividad ni `?tema=` (por ejemplo desde `index.html`), las
  preguntas son sobre la célula.
- Las preguntas de la actividad se piden **apenas se abre el juego**, así ya están listas al pulsar ▶.
- **Pantallas de carga** (nunca se ve el marco en blanco):
  - el marco muestra el logo de Prolipa con un giro mientras carga su página, y la página entra con un fundido;
  - al elegir un juego, el menú avisa `juego:navegando` y muestra "Cargando BioSalto…";
  - cada juego trae su propia pantalla de carga (`#precarga`) hasta terminar de iniciar.
- Se vuelve a la actividad con la ✕ del inicio o del menú, con **📘 Volver a la actividad** al final o con Esc. En la
  actividad aparece un aviso con el resultado, por ejemplo "🎩 BioCabeza: 4 de 5 aciertos".
- Mensajes entre la actividad y las páginas del marco (`postMessage`), iguales para el menú y los dos juegos:
  - `juego:listo`: la página cargó;
  - `juego:actividad`: la actividad le manda el título y el texto;
  - `juego:resultado`: el juego terminó (`juego`, `aciertos`, `total`);
  - `juego:navegando`: el marco va a cambiar de página (muestra la pantalla de carga);
  - `juego:cerrar`: volver a la actividad.
- El marco tiene permiso de cámara y micrófono (`allow="camera; microphone; autoplay"`).
- Al cambiar `js/toolbar-tooltips.js`, sube su `?v=` en los HTML (hoy `?v=81`).

## Sin menciones de la IA en pantalla

El estudiante no ve ningún texto sobre la IA: ni "creadas con IA", ni "La IA está creando…", ni si está conectada.
Mientras se preparan las preguntas, la nube dice "Preparando tus preguntas…". Si no hay conexión con la IA, el juego
usa las preguntas de ejemplo sin avisar en pantalla; el aviso queda solo en la consola del navegador (F12), para
quien lo configura.

## Colores y logo

- La interfaz usa **azul y celeste**, la gama de la barra de las actividades y del logo. Los colores están como
  variables al inicio del `<style>` de `biocabeza.html` (`--acento`, `--heroe`, `--boton`…).
- El **verde** y el **rojo** quedan solo para "correcto" e "incorrecto".
- Imágenes del logo, en `img/`:
  - `logo prolipa.png`: el logo original. Aparece completo al pie del inicio y del final.
  - `prolipa-icono.png`: el símbolo de los libros, cuadrado y a color. Es el ícono de la pestaña, el del encabezado
    del juego y el de la portada (`index.html`).
  - `prolipa-silueta.png`: el mismo símbolo en blanco, para el botón del menú.

  Las dos últimas se recortaron del original. Si cambia el logo, hay que volver a generarlas.

## Lo que hace el juego más vistoso

- Cuenta regresiva **3, 2, 1, ¡Ya!** antes de la primera pregunta.
- Los sombreros entran uno tras otro, sus emojis flotan y el que está sobre la cabeza brilla. La marca sobre la cabeza
  muestra el emoji de esa opción.
- **Al acertar, el sombrero vuela y se pone sobre la cabeza**, la sigue mientras se mueve y explota en confeti.
- **Marcador en aciertos, no en puntos:** arriba dice "✅ 2 de 5 aciertos". Cada acierto muestra "+1 acierto"
  flotando, y la racha se ve arriba (🔥 x3). El final muestra "4 de 5 aciertos" y el récord por tema es la mejor
  proporción ("Tu récord en este tema: 4 de 5 aciertos").
- Puntitos de progreso arriba: verde si acertó, rojo si falló.
- **Final:** de 1 a 3 estrellas, el puntaje sube con una animación y se guarda el récord por tema (solo en ese
  navegador).

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

| Archivo | Qué contiene |
|---|---|
| `biocabeza.html` | Pantallas (inicio, juego, final, QR) y estilos. |
| `js/biocabeza/biocabeza.js` | Cámara, seguimiento de la cara, selección con la cabeza, confeti, voz, IA y QR. Al inicio está `JUEGO` con los ajustes. |
| `js/biocabeza/reglas.js` | Prompt y validación de las preguntas. **Lo comparten el navegador y el servidor.** |
| `js/entrevista/servidor/nucleo.mjs` | Ruta `POST /api/biocabeza/preguntas` del servidor intermedio. |

## Cómo se detecta la respuesta

- **MediaPipe Face Landmarker** (malla facial de 478 puntos, la versión actual de Face Mesh) se carga desde el CDN de
  jsDelivr y sigue la **nariz** y la **frente**.
- La pantalla se divide en tres columnas. La opción de la columna donde está la nariz se ilumina.
  - `ganancia: 1.7` amplifica el movimiento, así no hace falta salirse de la imagen.
  - Hay un margen en los bordes para que la opción no salte entre dos columnas.
- Los sombreros suben y bajan con la cabeza y se quedan justo encima de ella. Nunca tapan la nube.
- Para elegir hay que quedarse quieto `segundosQuieto: 1.5`. Quieto significa que la nariz se mueve menos del 6 % del
  ancho (`toleranciaQuieto`). Un anillo sobre la cabeza y una barra en el sombrero muestran el avance.
- **Tiempo de lectura:** mientras se lee la pregunta, los sombreros se ven grises y no se pueden elegir con la cabeza.
  - Con voz, esperan a que la voz termine de leer la pregunta y las opciones, más 0,8 s (`esperaTrasLeer`).
  - Sin voz, esperan según el largo del texto: unas 3 palabras por segundo, entre 3,5 y 10 s (`msPorPalabra`,
    `lecturaMinima`, `lecturaMaxima`).
  - Cuando se pueden elegir suena un "tic". Tocar una opción funciona siempre.
- Tras responder, la explicación queda en pantalla hasta que la voz termina de leerla (+1,5 s), y nunca menos de 5 s
  (`segundosRevelar`). **Siguiente ▶** adelanta.
- **Sin cámara** (permiso negado, sin https o sin detector): se toca la opción o se usan las teclas 1, 2 y 3 (o ← ↓ →).
  Enter pasa a la siguiente pregunta.

## La IA

Usa **la misma conexión que la Entrevista**: `js/entrevista/config.js` (modelo y `proxyUrl`) y, en tu computadora,
`js/entrevista/config.local.js` (clave; git no lo sube).

| Dónde | Cómo se conecta |
|---|---|
| Archivo, `localhost`, red local o túnel de VS Code (`*.devtunnels.ms`) | Directo a Gemini con la clave de `config.local.js`. |
| GitHub Pages u otro sitio publicado | Servidor intermedio: `proxyUrl` + `/api/biocabeza/preguntas`. |
| Sin clave ni servidor | Juega con 10 **preguntas de ejemplo** sobre la célula. |

- El tema es el de la actividad (ver arriba). El estudiante solo elige la **cantidad** (3, 5, 8 o 10) y el **nivel**.
- La IA devuelve preguntas conceptuales con 3 opciones cortas, un emoji por opción y una explicación breve. El código
  valida el JSON y mezcla el orden de las opciones.
- Gemini a veces tarda ~20 s en una petición, y la siguiente sale en 2 o 3 s. Por eso, si a los 6 s no hay respuesta, se
  lanza un segundo intento en paralelo y se usa el primero que llegue.
- Si un tema no es de biología o no es apropiado, la IA hace las preguntas sobre la célula. No se envían correos ni
  números largos.
- La pregunta, las opciones y la explicación se leen en voz alta con la voz del dispositivo (gratis). El botón 🔊/🔈 lo
  apaga.

## Jugar en el celular (código QR)

En la computadora, **📱 Jugar en el celular** muestra **solo el código QR**, sin dirección, avisos ni botón de copiar.
El código abre el juego con el tema elegido.

- **A dónde lleva el QR:**
  - Si el juego está publicado (https, por ejemplo GitHub Pages o un túnel `*.devtunnels.ms`), a esa misma dirección.
  - Si se abre desde la computadora (archivo, `localhost` o red local por http), que el celular no puede abrir, a la
    dirección pública de `JUEGO.urlPublica` en `biocabeza.js`: hoy `https://brayan240699194.github.io/ProfesorIAProlipa/`.
- ⚠ Para que el QR funcione, **`biocabeza.html` y `js/biocabeza/` deben estar subidos a GitHub Pages**. Si el
  repositorio o el usuario cambian, actualiza `JUEGO.urlPublica`.
- El celular solo abre la cámara en https; GitHub Pages ya lo es.
- Publicado en GitHub Pages, la IA va por el servidor intermedio (`ia.proxyUrl` en `js/entrevista/config.js`). Sin
  servidor, el celular juega con las preguntas de ejemplo.

## Servidor intermedio

La ruta nueva es `POST /api/biocabeza/preguntas`, con el cuerpo `{ tema, cantidad, nivel }`. Devuelve
`{ tema, preguntas: [{ pregunta, opciones: [{ texto, emoji }×3], correcta, explicacion }] }`.

El límite por IP se ajusta con `LIMITE_PREGUNTAS_POR_HORA` (300 por defecto). Cada partida hace una sola petición.

## Privacidad y accesibilidad

- **La imagen de la cámara no sale del dispositivo**: MediaPipe la analiza dentro del navegador. A la IA solo viajan el
  tema, la cantidad y el nivel.
- Con `prefers-reduced-motion` no hay zoom ni animaciones, y hay menos confeti.
- Los sombreros son botones con su nombre accesible, y la nube se anuncia con `aria-live`.
