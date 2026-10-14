# Publicar el libro con IA en GitHub Pages

Guía paso a paso para que la IA (Profesor IA, mascota y juegos) funcione en la versión publicada.
La clave de Gemini se guarda como **secreto de GitHub** y el workflow `.github/workflows/pages.yml` la escribe
en `js/entrevista/config.js` y `js/pet/config.js` **solo en la copia que se publica**: nunca queda en el código.

---

## Parte A · Crear la clave de Gemini

1. Entra a [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Pulsa **Create API key** y copia la clave.
3. ⚠ No la pegues en ningún archivo del proyecto ni en chats.

## Parte B · Guardar la clave en GitHub

4. Abre tu repositorio en GitHub y entra a **Settings**.
5. En el menú izquierdo: **Secrets and variables → Actions**.
6. Pulsa **New repository secret**.
7. En *Name* escribe exactamente `GEMINI_API_KEY`.
8. En *Secret* pega la clave.
9. Pulsa **Add secret**.

## Parte C · Hacer que Pages publique con el workflow

10. En **Settings**, entra a **Pages** (menú izquierdo).
11. En *Build and deployment → Source*, elige **GitHub Actions**.

## Parte D · Subir el workflow (solo la primera vez)

12. Comprueba que el proyecto tiene el archivo `.github/workflows/pages.yml`. En otro libro, cópialo desde este proyecto.
13. En la terminal de VS Code, dentro de la carpeta del proyecto:

    ```bash
    git add .github/workflows/pages.yml
    git commit -m "Publicar en Pages con la clave desde el secreto"
    git push origin main
    ```

## Parte E · Comprobar que funcionó

14. En GitHub, abre la pestaña **Actions**.
15. Espera a que **"Publicar en GitHub Pages"** quede con ✅ verde (unos 20 s).
16. Abre tu página y recarga con **Ctrl+F5**.
17. Entra a una actividad, abre **"Clase"** (borde derecho) y haz una pregunta. Si responde, la IA está conectada.

## Parte F · Si algo falla

| Qué pasa | Qué hacer |
|---|---|
| Actions en rojo ❌ | Abre la ejecución y mira qué paso falló. |
| Aviso "No hay secreto GEMINI_API_KEY" | El secreto no existe o tiene otro nombre: repite la Parte B. |
| La IA no responde | **F12 → Consola** y revisa los mensajes en rojo. |
| Error `401` | Clave anulada o mal copiada: crea otra y actualiza el secreto. |
| Error `429` | Se acabó el cupo gratis de Google: espera o activa la facturación. |
| Volver a publicar sin cambios | **Actions → Publicar en GitHub Pages → Run workflow**. |

Al cambiar el secreto, hay que volver a publicar (Run workflow) para que se use la clave nueva.

## Parte G · Al terminar la exposición

18. Borra la clave en AI Studio.
19. Borra el secreto `GEMINI_API_KEY` en GitHub.
20. Para volver como antes: **Settings → Pages → Source** → *Deploy from a branch* → `main` / `(root)`.

---

## Reglas de oro

- ❌ **Nunca** escribas la clave en el código: Google anula en minutos las claves que aparecen en un repositorio
  público de GitHub.
- 👀 En la página publicada la clave **se ve con F12**: sirve para demos y exposiciones, no para estudiantes.
- 🏠 En tu computadora la IA usa los `config.local.js` (git no los sube); ver `js/entrevista/README.md`.
- ✅ Para dejarlo publicado de verdad: un **servidor intermedio** (`js/entrevista/servidor/nucleo.mjs`, por ejemplo en
  Cloudflare Workers) con la clave guardada en el servidor y su dirección en `ia.proxyUrl`. Así nadie ve la clave.
