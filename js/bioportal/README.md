# 🌀 BioPortal — un portal al mundo del tema

Uno de los juegos del menú **Juegos** de cada actividad. Se abre un portal circular brillante (energía,
burbujas y vapor). A través de él se ve, en 3D, el mundo del tema de la actividad. Una **guía** (con voz) hace un
tour narrado parada por parada. El estudiante puede preguntarle lo que quiera, escribiendo o con el 🎤.

## Cómo se ve

| Dispositivo | Qué pasa |
|---|---|
| **Celular Android (Chrome)** | **📱 Abrirlo en mi cuarto**: realidad aumentada. Se apunta al piso y se toca la pantalla, y el portal aparece en el salón. Se ve el mundo a través de él, y se puede **caminar a través del portal** para quedar dentro. |
| **Computadora / iPhone** | **🌀 Entrar al portal**: el portal flota en la pantalla y la cámara "vuela" a través de él. Se mira alrededor arrastrando. En la computadora, **📱 Verlo en mi cuarto con el celular** muestra un QR. |

En cada parada, un anillo que late marca lo que se está mirando. Si queda fuera de la pantalla, una flecha indica
hacia dónde girar. Teclado: ← → para cambiar de parada, Esc para cerrar.

## Experiencia

| Qué | Cómo |
|---|---|
| 🎵 **Sonido del mundo** | Sintetizado en el navegador, sin archivos. Tierra primitiva: océano hirviente, volcanes y **truenos que llegan un poco después de cada rayo** (como en la realidad). Célula: zumbido y burbujitas. Cuerpo: latido y la sangre que corre. Selva: viento, río y pájaros. Molecular: destellos. Suena fuerte adentro, suave afuera ("a través" del portal) y baja mientras habla la guía. El botón 🎵 lo apaga. |
| 🌌 **Hiperespacio** | Al cruzar el portal en la pantalla, la vista se estira y pasan estelas de luz del color del mundo. En el celular, además, **vibra**. |
| ✨ **Puntos interactivos** | Cada parada flota en el mundo como un ícono brillante, con su emoji. **Tocarlo lleva a esa parada**, también en realidad aumentada. Las ya visitadas se ven más tenues. |
| ⏯ **Auto** | Recorrido automático: al terminar de narrar, pasa solo a la siguiente parada. Se detiene si el estudiante pregunta, escribe o cambia de parada. |
| 📸 **Postal** | Guarda una foto del viaje (JPG) con el título del tour, la parada y la fecha. Solo en la pantalla: en realidad aumentada, el navegador no deja fotografiar la cámara. |

Las mejoras están en el bloque `extra` de `bioportal.js`. Cada una está protegida: si una falla en algún
dispositivo, el portal y el tour siguen funcionando igual. Los botones 🎵 y ⏯ recuerdan su estado.

## Los mundos (la IA elige el que mejor muestra el tema)

| id | Mundo | Puntos que se pueden mirar |
|---|---|---|
| `tierra-primitiva` | Océano hirviente, rayos, volcanes, cielo naranja | oceano, rayos, volcanes, atmosfera, charca, moleculas |
| `celula` | Dentro de una célula eucariota | nucleo, mitocondria, ribosomas, reticulo, golgi, membrana, citoplasma |
| `cuerpo` | Dentro de un vaso sanguíneo | corriente, globulos-rojos, globulos-blancos, plaquetas, pared, fondo |
| `ecosistema` | Selva con río, sol, flores y animales | arboles, rio, sol, suelo, flores, animales |
| `molecular` | ADN, enzima con sustrato, proteína, agua | adn, bases, enzima, sustrato, proteina, agua |

Las narraciones salen **solo del contenido de la actividad** (título y texto que manda la barra). Si no hay
conexión, se usa un tour de ejemplo sobre la Tierra primitiva.

## Activar o desactivar

- **Para todo el libro:** en `js/juegos/config.js`, pon `bioportal: true` o `bioportal: false`.
- **En una sola actividad:** pon en su `<body>` la lista de juegos que quieras, sin `bioportal`, por ejemplo
  `data-juegos="biocabeza,biosalto"`.

## IA

- Usa la misma conexión que la Entrevista (`js/entrevista/config.js`).
- **Pruebas en tu computadora:** busca la clave en este orden:
  1. `js/bioportal/config.local.js` (copia `config.local.example.js`);
  2. `js/entrevista/config.local.js`;
  3. `js/biosalto/config.local.js`.

  Estos archivos están en `.gitignore`: **nunca se suben**.
- **Publicado:** servidor intermedio (`js/entrevista/servidor/nucleo.mjs`), con dos rutas:
  - `POST /api/bioportal/tour` `{ tema, paradas, contexto, libro, publico }` → `{ mundo, titulo, bienvenida, paradas[{punto, titulo, emoji, narracion}], despedida }`
  - `POST /api/bioportal/pregunta` `{ tema, mundo, parada, pregunta, libro, publico }` → `{ respuesta }`

## Archivos

| Archivo | Para qué |
|---|---|
| `bioportal.html` | La página (inicio, tarjeta del tour, QR). |
| `js/bioportal/bioportal.js` | Portal, cámara, realidad aumentada (WebXR), tour, voz, preguntas e IA. |
| `js/bioportal/mundos.js` | Los 5 mundos en 3D (three.js, sin modelos externos) y la posición de cada punto. |
| `js/bioportal/reglas.js` | Instrucciones para la IA y revisión de lo que responde (navegador y servidor). |

**Realidad aumentada estable:** usa `js/realidad-aumentada.js`. El portal queda anclado al cuarto aunque camines o gires 360°. Si el celular pierde el seguimiento, el portal no desaparece y vuelve a su sitio al recuperarse. Por detrás se ve como un disco de energía.

**Cómo funciona el portal:** el disco del portal se dibuja en el *stencil*, y el mundo solo se pinta donde está
ese disco. Al entrar, se quita esa condición y el mundo llena toda la vista. Para ajustar el tamaño o la altura
del portal, cambia `PORTAL` al inicio de `bioportal.js`, por ejemplo `paradas`, `radio` y `altura`.

**Requisitos:**
- Internet: carga three.js desde jsdelivr.
- Realidad aumentada: Android con Chrome y "Servicios de Google Play para RA", en `https` (GitHub Pages).
- En `file://` o `localhost` funciona el modo pantalla, y el QR lleva a la versión publicada.
