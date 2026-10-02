/* =========================================================================
   Servidor intermedio en Cloudflare Workers (js/entrevista/servidor/worker.js)
   -------------------------------------------------------------------------
   Gratis (plan Free: 100 000 peticiones al día), sin servidor que mantener
   y con la clave guardada como SECRETO en Cloudflare: nunca va a GitHub.
   La lógica está en nucleo.mjs (la misma que usa Node).
   Pasos: ver README.md → "Publicar en GitHub Pages".
   ========================================================================= */
import { crearServidor } from './nucleo.mjs';

let atender = null;

export default {
  async fetch(request, env) {
    atender = atender || crearServidor(env);
    return atender(request, request.headers.get('CF-Connecting-IP'));
  },
};
