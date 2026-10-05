# BioSalto: la gallina saltarina

Juego de voz inspirado en el de TikTok de la gallina que salta entre montañas. Una gallina está en una montaña, frente
a un barranco, y la IA hace una pregunta cuya respuesta es **una sola palabra**, corta y obvia.

- Si el estudiante **dice** la respuesta correcta por el micrófono, la gallina **salta** a la otra montaña.
- Si dice otra cosa, la gallina **cae al barranco** («¡Plop!») y vuelve a aparecer en su montaña para la siguiente
  pregunta.

Página: `biosalto.html`. Se abre desde el **menú de juegos** (`juegos.html`), que abre el botón **Juego** de cada
actividad (ver `js/biocabeza/README.md`). También está enlazada en `index.html`.

## Archivos

| Archivo | Qué contiene |
|---|---|
| `biosalto.html` | Escena (cielo, montañas, barranco, gallina), panel del micrófono, inicio, final, QR y estilos. |
| `js/biosalto/biosalto.js` | Juego, animaciones, micrófono (dictado o grabación), IA y QR. Al inicio está `JUEGO` con los ajustes. |
| `js/biosalto/reglas.js` | Prompt y validación de las preguntas de una palabra. **Lo comparten el navegador y el servidor.** |
| `js/biosalto/config.local.js` | Clave de Gemini para probar en tu computadora. **Git no lo sube.** |
| `js/entrevista/servidor/nucleo.mjs` | Ruta `POST /api/biosalto/preguntas` del servidor intermedio. |
| `juegos.html` | Menú para elegir entre BioCabeza y BioSalto. |

## Cómo se juega

1. Aparece la pregunta en la nube y, debajo, una ayuda siempre visible:
   - la **💡 pista** de la IA, que no dice la respuesta;
   - la **primera letra y los espacios** de la palabra ("🔤 M _ _ _ _ _ _ _ _ _ _ · 11 letras"), calculados por el código.

   La voz del dispositivo lee la pregunta. El 🔊 de arriba apaga la voz.
2. El micrófono **escucha solo y seguido**, sin tocar nada ni repetir:
   - con el dictado del navegador, **desde que aparece la pregunta** ("🎤 Te escucho… puedes responder ya"); si el
     estudiante responde mientras la voz lee, la voz se calla y la gallina salta;
   - con la grabación, apenas la voz termina de leer.

   Las ondas alrededor de la gallina y la barra del panel muestran el volumen.
3. El estudiante dice la respuesta y pasa una de estas cosas:
   - **Correcta:** la gallina salta. **Basta con hablar normal y claro**; gritar no hace falta, solo hace que salte más
     alto. Luego la escena avanza a la siguiente montaña.
   - **Incorrecta:** la gallina cae al barranco soltando plumas y aparece en su montaña.
   - **Muletillas o ruido** ("eh…", "este…"): no cuentan; sigue escuchando.
   - **Nadie habla en 25 s:** el micrófono se pausa ("Toca el micrófono cuando quieras responder").
4. Botones del panel:
   - **🎤**: empieza a escuchar o termina la respuesta. La tecla Espacio hace lo mismo.
   - **⌨️ Escribir**: responder escribiendo.
5. Tras cada respuesta se muestra la explicación. **Siguiente ▶** (o Enter) adelanta.
6. **Final:** de 1 a 3 estrellas, puntaje, mejor racha, récord por tema y repaso con lo que dijo el estudiante.

**Marcador:** en aciertos, no en puntos: "✅ 2 de 5 aciertos" arriba y "4 de 5 aciertos" al final.

**Paisajes:** cambian con cada salto para que el recorrido no aburra:

| Paisaje | Cómo se ve |
|---|---|
| ☀️ Montañas azules | cielo de día, pasto verde, 🌳 🌲 🌼 |
| 🌅 Cañón al atardecer | cielo naranja, sol grande, roca rojiza y arena, 🌵 🪨 |
| ❄️ Cumbres nevadas | cielo gris claro, nieve en las cimas, 🌲 ⛄ |
| 🌴 Selva tropical | cielo turquesa, verde tupido, 🌴 🌺 🦜 |
| 🌙 Noche estrellada | cielo oscuro con estrellas, luna, 🍄 🦉 |

- Después del quinto vuelve al primero.
- Al llegar a cada paisaje aparece su nombre en el centro.
- Los colores cambian con una transición suave: son propiedades CSS registradas con `@property`, y el código pone
  `data-paisaje` en `#escenario`. Se agregan o cambian en `biosalto.html` (los colores) y en `PAISAJES` de
  `biosalto.js` (el nombre y los adornos).

## Cómo se reconoce la respuesta

- Primero se usa el **dictado del navegador** (Chrome, Edge y Safari): gratis y casi instantáneo, unos 0,3 s tras decir
  la palabra.
  - Escucha **continuo**: si el navegador corta la sesión tras un silencio, se vuelve a abrir sola.
  - Acepta **en cuanto lo dicho, aunque sea parcial, contiene la respuesta**, sin esperar a que el estudiante se calle.
  - Si es otra palabra, toma la primera frase completa que no sea solo muletillas.
  - Mientras la voz lee la pregunta, solo cuenta la respuesta correcta y dicha corta (hasta 3 palabras). La pregunta
    nunca contiene la respuesta, así la voz del juego no se "responde" sola.
- **⚠ Abierto como archivo** (doble clic, `file://`), Chrome no permite el dictado. Entonces se usa la grabación, que
  tarda un poco más. Para la versión rápida, ábrelo con un servidor: Live Server de VS Code, `npx serve`, el túnel de
  VS Code o GitHub Pages.
- Si el navegador no tiene dictado (Firefox, Brave, archivo local o sin servicio), **graba la voz y la transcribe
  Gemini**, en ~1 s por frase:
  - **no hace falta gritar**: la voz se detecta comparando con el ruido del lugar, que se mide solo
    (`umbralMinimo`, `factorRuido`); una voz normal, e incluso baja, se detecta;
  - la frase termina sola tras **0,6 s** de silencio, o a los 4 s;
  - si lo transcrito es solo ruido o muletillas, sigue escuchando.
- **Escucha inteligente, para no tener que repetir:**
  - **Compara cómo suena, no cómo se escribe.** En español, b = v, c/s/z, ll = y, g/j ante e/i y la h muda: "vacteria",
    "selula", "serebro" u "oxijeno" cuentan como correctas. Los errores tolerados crecen con el largo de la palabra.
    También acepta palabras separadas o juntadas por el dictado ("mito condria", "a d n"). Probado con 24 casos: acepta
    todo lo bien dicho y rechaza las respuestas de verdad distintas (ribosoma, ARN, cloroplasto…).
  - **No se confunde con su propia voz.** Lo que el micrófono capta de la pregunta leída no cuenta como respuesta. Al
    terminar de leer, empieza una escucha limpia.
  - **Se puede responder encima de la voz:** mientras lee, quita las palabras de la pregunta y compara lo demás. "Creo
    que es la mitocondria" dicho antes de que termine de leer hace saltar a la gallina.
  - **Si el dictado no está seguro** de lo que oyó (confianza baja), no cuenta como error: pide decirlo otra vez.
  - **Le dice al dictado qué palabra esperar** (`SpeechRecognitionPhrase`, en Chrome reciente) para que la reconozca
    mejor.
  - **Con grabación**, Gemini recibe la palabra esperada para escribirla bien si suena como ella, y si tarda más de
    2,5 s se lanza un segundo pedido en paralelo (la primera transcripción puede tardar ~5 s).
- La comparación tolera:
  - mayúsculas, tildes y signos ("oxigeno" = "oxígeno");
  - muletillas ("creo que es la mitocondria");
  - plurales y variantes que la IA da en `aceptadas`;
  - pequeños errores del dictado (1 letra en palabras de 5 a 7 letras, 2 letras en las de 8 o más).

## Sin micrófono: QR para el celular

- Al abrir el juego se revisa si la computadora tiene micrófono. Si **no tiene**, aparece un aviso y, al pulsar ▶, se
  abre el **código QR** para jugar en el celular.
- Lo mismo pasa si el micrófono está bloqueado (🔒) u ocupado por otro programa.
- En la computadora se puede jugar **escribiendo** las respuestas.
- **📱 Jugar en el celular** está siempre disponible en el inicio (no aparece en el celular). Muestra **solo el código**,
  que lleva al juego con el tema elegido:
  - publicado (https), a esa misma dirección;
  - desde la computadora, a la dirección pública `JUEGO.urlPublica` (GitHub Pages).

  El celular solo deja usar el micrófono en https.

## La IA

- Usa la misma conexión que la Entrevista: `js/entrevista/config.js` (modelo y `proxyUrl`).
- **Clave para probar en tu computadora:** `js/biosalto/config.local.js`, que define `window.BIOSALTO_SECRETOS`. Si no
  existe, usa la de `js/entrevista/config.local.js`. Git no sube ninguno de los dos. Para otra computadora, copia
  `config.local.example.js` como `config.local.js` y pega la clave.
- **Publicado:** las preguntas van por `POST /api/biosalto/preguntas` y la transcripción por `POST /api/transcribir`,
  ambas en el servidor intermedio.
- **Preguntas:**
  - respuesta de una palabra, fácil de pronunciar, sin números ni nombres propios difíciles;
  - la respuesta no puede estar escrita en la pregunta (el código descarta las que la tienen);
  - respuestas **obvias**: palabras cortas y muy conocidas (célula, núcleo, corazón, oxígeno…), con ejemplos de qué sí y
    qué no en el prompt;
  - el código descarta las respuestas de más de 11 letras y los nombres propios (sí acepta siglas como ADN); por eso
    se piden 3 preguntas de más;
  - el nivel empieza en **Básico**;
  - cada una trae `aceptadas` (variantes), `pista`, `emoji` y `explicacion`.
- **El tema no se elige:** es el de la actividad desde la que se abrió (su título y su texto), igual que en BioCabeza.
  Las preguntas se piden apenas se abre el juego. El estudiante solo elige la cantidad y el nivel.
- Si la IA tarda más de 6 s, se lanza un segundo intento en paralelo. Sin IA, se juega con 10 preguntas de ejemplo.
- En pantalla no se menciona la IA. Los avisos técnicos van a la consola (F12).

## Ajustes (`JUEGO` en `biosalto.js`)

| Ajuste | Para qué |
|---|---|
| `esperaTrasLeer` | Grabación: pausa entre que la voz termina de leer y el micrófono empieza a escuchar (120 ms). |
| `esperaSinVoz` | Sin voz, pausa antes de escuchar (0,6 s). |
| `maxEscuchaMs` | Tiempo escuchando seguido sin oír nada antes de pausar el micrófono (25 s). |
| `silencioMs` | Grabación: silencio que termina la frase (0,6 s). |
| `umbralMinimo`, `factorRuido` | Grabación: volumen mínimo y cuántas veces más fuerte que el ruido del lugar debe ser la voz. |
| `maxFraseMs` | Grabación: duración máxima de una frase (4 s). |
| `segundosRevelar` | Tiempo mínimo con la explicación en pantalla (4,5 s). |
| `urlPublica` | Dirección pública del libro para el QR. |

## Privacidad y accesibilidad

- **La voz no se guarda.** Con el dictado del navegador, el audio lo procesa el navegador. Con la grabación, se envía
  solo ese audio corto a Gemini para transcribirlo.
- Se puede jugar sin micrófono, escribiendo. El panel y la nube se anuncian a los lectores de pantalla.
- Con `prefers-reduced-motion` no hay saltos animados ni cuenta regresiva, y hay menos confeti.
