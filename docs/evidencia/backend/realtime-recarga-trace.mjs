// Traza de WebSocket de Realtime con y sin recarga (task fix/realtime-session-token).
// Para cada ruta de staff: entra por /login, (opcional) recarga con la sesion guardada, espera, dispara un pedido
// nuevo por el mock y registra (a) los frames SALIENTES phx_join / access_token (con o sin token) y (b) si
// llego algun frame postgres_changes de orders al navegador en <= 5 s.
// Uso: PW_DIR=... APP=http://127.0.0.1:3402 MOCK=http://127.0.0.1:3401 node realtime-recarga-trace.mjs
import { createRequire } from "node:module";
import { join } from "node:path";
const require = createRequire(join(process.env.PW_DIR, "package.json"));
const { chromium } = require("playwright");
const APP = process.env.APP ?? "http://127.0.0.1:3402";
const MOCK = process.env.MOCK ?? "http://127.0.0.1:3401";
const ROUTES = [["cocina@demo.test", "/kitchen"], ["mozo@demo.test", "/floor"], ["admin@demo.test", "/admin"]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mockPost = (b) => fetch(MOCK + "/__mock/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
const t0 = Date.now();
const browser = await chromium.launch();
let bad = 0;
for (const [email, path] of ROUTES) for (const reload of [false, true]) {
  await fetch(MOCK + "/__mock/reset", { method: "POST" });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let frames = [];          // por pagina vigente
  page.on("websocket", (ws) => {
    ws.on("framesent", (f) => {
      try {
        const [, , topic, ev, payload] = JSON.parse(f.payload);
        if (ev === "phx_join") frames.push(`join   ${topic.replace("realtime:", "")} token=${payload?.access_token ? (payload.access_token.length > 40 ? "SI(user)" : "SI") : "NO"}`);
        if (ev === "access_token") frames.push(`push   ${topic.replace("realtime:", "")} access_token=${payload?.access_token ? "SI" : "NO"}`);
      } catch {}
    });
    ws.on("framereceived", (f) => { try { const [, , topic, ev, p] = JSON.parse(f.payload); if (ev === "postgres_changes" && p?.data?.table === "orders") frames.push(`RECV   ${topic.replace("realtime:", "")} orders ${p.data.type}`); } catch {} });
  });
  await page.goto(`${APP}/login?redirect=${encodeURIComponent(path)}`);
  await page.fill("#email", email); await page.fill("#password", "demo-1234"); await page.click("#lg-submit");
  await page.waitForURL((u) => u.pathname.startsWith(path), { timeout: 20000 });
  frames = [];
  if (reload) await page.goto(`${APP}${path}`);
  await sleep(2500);
  const beforeEvent = frames.length;
  const t = Date.now();
  await mockPost({ type: "new_order", table: "Mesa 3", items: [{ name: "Provoleta", quantity: 2 }] });
  let got = false;
  while (Date.now() - t < 5000 && !got) { got = frames.slice(beforeEvent).some((x) => x.startsWith("RECV")); if (!got) await sleep(50); }
  const ms = Date.now() - t;
  if (!got) bad++;
  console.log(`${got ? "PASS" : "FAIL"}  ${path.padEnd(8)} ${reload ? "con recarga" : "sin recarga"}  evento entregado=${got} (${got ? ms + " ms" : ">5000 ms"})`);
  for (const l of frames.slice(0, beforeEvent)) console.log(`        ${l}`);
  await ctx.close();
}
await browser.close();
console.log(`\n${ROUTES.length * 2 - bad}/${ROUTES.length * 2} OK  (${Math.round((Date.now() - t0) / 1000)} s)`);
process.exit(bad ? 1 : 0);
