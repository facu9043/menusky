// Mide el peso de la primera carga de /login (HTML + JS/CSS/fuentes de /_next/static, gzip).
// Uso: npm run build && npx next start -p 3200 -H 127.0.0.1, luego: node scripts/measure-login-weight.mjs [baseUrl]
// No mide SVG inline (va dentro del HTML) ni la peticion de auth.
// OJO: NO cuenta las fuentes (Next 16 las precarga por cabecera HTTP Link, no en el HTML). Medirlas aparte (DevTools Network o CDP).
import zlib from "node:zlib";
const base = process.argv[2] || "http://127.0.0.1:3200";
const html = await (await fetch(base + "/login")).text();
const urls = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css|woff2))"/g)].map(m => m[1]))];
let js = 0, css = 0, font = 0;
for (const u of urls) {
  const b = Buffer.from(await (await fetch(base + u)).arrayBuffer());
  const g = u.endsWith(".woff2") ? b.length : zlib.gzipSync(b).length;
  if (u.endsWith(".js")) js += g; else if (u.endsWith(".css")) css += g; else font += g;
}
const h = zlib.gzipSync(Buffer.from(html)).length;
console.log(JSON.stringify({ files: urls.length, js_gzip_kb: +(js/1024).toFixed(1), css_gzip_kb: +(css/1024).toFixed(1), fonts_kb: +(font/1024).toFixed(1), html_gzip_kb: +(h/1024).toFixed(1), total_kb: +((js+css+font+h)/1024).toFixed(1) }));
