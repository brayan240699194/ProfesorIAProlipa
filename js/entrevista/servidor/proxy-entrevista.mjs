/* =========================================================================
   Servidor intermedio en Node 18+ (js/entrevista/servidor/proxy-entrevista.mjs)
   -------------------------------------------------------------------------
   Alternativa al Worker de Cloudflare (worker.js) para un hosting con Node
   (Render, Railway, un VPS) o para probar en tu computadora. Sin
   dependencias. La lógica está en nucleo.mjs (la misma del Worker).

   Ejecutar:
     GOOGLE_API_KEY=… ORIGENES_PERMITIDOS="https://usuario.github.io,http://localhost:*" node js/entrevista/servidor/proxy-entrevista.mjs
   Variables: las de nucleo.mjs, más PORT (por defecto 8789).
   En js/entrevista/config.js:  ia.proxyUrl = 'https://tu-servidor'
   ========================================================================= */
import { createServer } from 'node:http';
import { crearServidor } from './nucleo.mjs';

const PUERTO = Number(process.env.PORT || 8789);
if (!process.env.GOOGLE_API_KEY) { console.error('Falta la variable de entorno GOOGLE_API_KEY'); process.exit(1); }
if (!process.env.ORIGENES_PERMITIDOS) console.warn('Aviso: ORIGENES_PERMITIDOS está vacío; se rechazarán las peticiones del navegador.');
const atender = crearServidor(process.env);

createServer((req, res) => {
  const trozos = [];
  let tam = 0;
  req.on('data', (c) => {
    tam += c.length;
    if (tam > 4 * 1024 * 1024) { res.writeHead(413).end(); req.destroy(); } else trozos.push(c);
  });
  req.on('end', async () => {
    if (res.writableEnded) return;
    const cuerpo = ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(trozos);
    const peticion = new Request('http://localhost' + req.url, { method: req.method, headers: req.headers, body: cuerpo });
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const r = await atender(peticion, ip);
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  });
}).listen(PUERTO, () => console.log(`Entrevista con IA en http://localhost:${PUERTO}/api/salud`));
