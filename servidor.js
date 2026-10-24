import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('.', import.meta.url));
const puerto = Number(process.env.PORT || 8080);
const tipos = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

http.createServer(async (peticion, respuesta) => {
  try {
    const ruta = decodeURIComponent(new URL(peticion.url, 'http://localhost').pathname);
    const archivo = resolve(raiz, '.' + (ruta === '/' ? '/index.html' : ruta));
    if (!archivo.startsWith(raiz.endsWith(sep) ? raiz : raiz + sep) || !tipos[extname(archivo)]) {
      respuesta.writeHead(404).end('Archivo no encontrado');
      return;
    }
    const contenido = await readFile(archivo);
    respuesta.writeHead(200, { 'Content-Type': tipos[extname(archivo)] + '; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    respuesta.end(contenido);
  } catch {
    respuesta.writeHead(404).end('Archivo no encontrado');
  }
}).listen(puerto, '127.0.0.1', () => console.log(`Pokédex disponible en http://127.0.0.1:${puerto}`));
