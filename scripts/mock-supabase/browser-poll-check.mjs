// Verifica en un navegador real (Chrome headless por CDP) el sondeo de "Tu pedido"
// (useOrderStatus): cadencia de 3 s, demora <= 5 s, sin solapar, se detiene en
// delivered/cancelled, y se pausa con la pestaña oculta. Contra el mock + la app.
//   node scripts/mock-supabase/browser-poll-check.mjs
// Variables: MOCK_URL, APP_URL, CHROME_PATH, CDP_PORT (def. 3410).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MOCK = process.env.MOCK_URL || "http://127.0.0.1:3401";
const APP = process.env.APP_URL || "http://127.0.0.1:3402";
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP = Number(process.env.CDP_PORT || 3410);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mockPost = (body) => fetch(MOCK + "/__mock/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

let n = 0, bad = 0;
function check(name, ok, detail = "") {
  n++;
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}

await fetch(MOCK + "/__mock/reset", { method: "POST" });
const { orderId } = await mockPost({ type: "new_order", table: "Mesa 1", items: [{ name: "Provoleta", quantity: 1 }] });

const profile = mkdtempSync(join(tmpdir(), "ms-chrome-"));
const chrome = spawn(CHROME, [`--headless=new`, `--remote-debugging-port=${CDP}`, `--remote-allow-origins=*`, `--user-data-dir=${profile}`, "--no-first-run", "--disable-gpu", "--window-size=390,844", "about:blank"], { stdio: "ignore" });
let ws;
try {
  let list;
  for (let i = 0; i < 50; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json(); if (list.some((t) => t.type === "page")) break; } catch { /* aún no */ }
    await sleep(200);
  }
  const page = list.find((t) => t.type === "page");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const polls = []; // { t, inflight }
  let inflight = 0, maxInflight = 0;
  const reqIds = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); return; }
    if (m.method === "Network.requestWillBeSent" && m.params.request.url.includes("get_public_order_status")) {
      if (m.params.request.method === "OPTIONS") return;
      polls.push(Date.now());
      reqIds.set(m.params.requestId, true);
      inflight++;
      maxInflight = Math.max(maxInflight, inflight);
    }
    if ((m.method === "Network.loadingFinished" || m.method === "Network.loadingFailed") && reqIds.has(m.params.requestId)) {
      reqIds.delete(m.params.requestId);
      inflight--;
    }
  };
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.value;
  await send("Network.enable");
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: `${APP}/m/mesa-1-demo0001/pedido/${orderId}` });
  await sleep(2500);

  // Cantidad de pasos "hechos" del seguimiento (círculos con bg-primary)
  const steps = () => evalJs(`document.querySelectorAll('div.rounded-full.bg-primary.text-primary-foreground').length`);
  check('"Tu pedido" cargó con el paso 1 (Recibido) activo', (await steps()) === 1, String(await steps()));

  // 1) cadencia
  const t0 = Date.now();
  await sleep(10000);
  const inWindow = polls.filter((t) => t >= t0);
  const gaps = inWindow.slice(1).map((t, i) => t - inWindow[i]);
  check(`cadencia: ${inWindow.length} consultas en 10 s (esperado 3 o 4), separación ${gaps.map((g) => (g / 1000).toFixed(1)).join("/")} s`, inWindow.length >= 3 && inWindow.length <= 4 && gaps.every((g) => g >= 2500 && g <= 3800), JSON.stringify(gaps));
  check("sin solapar: nunca hubo más de 1 consulta en vuelo", maxInflight <= 1, String(maxInflight));

  // 2) demora de un cambio de estado (5 cambios, <= 5 s)
  const delays = [];
  for (const status of ["in_kitchen", "ready", "delivered"]) {
    const expected = { in_kitchen: 2, ready: 3, delivered: 4 }[status];
    const tChange = Date.now();
    await mockPost({ type: "order_status", orderId, status });
    let seen = null;
    while (Date.now() - tChange < 8000) {
      if ((await steps()) >= expected) { seen = Date.now() - tChange; break; }
      await sleep(100);
    }
    delays.push(seen);
    check(`cambio a ${status}: el cliente lo muestra en ${seen == null ? "(no apareció)" : (seen / 1000).toFixed(1) + " s"} (<= 5 s)`, seen != null && seen <= 5000, String(seen));
  }

  // 3) se detiene en delivered
  const after = polls.length;
  await sleep(8000);
  check("tras 'delivered' ya no consulta más (8 s sin pedidos de estado)", polls.length === after, `${polls.length - after} consultas de más`);

  // 4) cancelado + pestaña oculta: pedido nuevo
  const o2 = await mockPost({ type: "new_order", table: "Mesa 2", items: [{ name: "Agua mineral 500ml", quantity: 1 }] });
  await send("Page.navigate", { url: `${APP}/m/mesa-2-demo0002/pedido/${o2.orderId}` });
  await sleep(2500);
  await evalJs(`Object.defineProperty(document,'visibilityState',{get:()=>'hidden',configurable:true}); document.dispatchEvent(new Event('visibilitychange')); 1`);
  const beforeHidden = polls.length;
  await sleep(8000);
  check("pestaña oculta: no consulta (8 s, 0 consultas)", polls.length === beforeHidden, `${polls.length - beforeHidden}`);
  await mockPost({ type: "order_status", orderId: o2.orderId, status: "cancelled" });
  const tVis = Date.now();
  await evalJs(`Object.defineProperty(document,'visibilityState',{get:()=>'visible',configurable:true}); document.dispatchEvent(new Event('visibilitychange')); 1`);
  let cancelledAt = null;
  while (Date.now() - tVis < 5000) {
    if ((await evalJs(`document.body.innerText.includes('Este pedido fue cancelado.')`))) { cancelledAt = Date.now() - tVis; break; }
    await sleep(100);
  }
  check(`al volver a la pestaña consulta de inmediato y muestra "Este pedido fue cancelado." (${cancelledAt} ms)`, cancelledAt != null && cancelledAt < 2000, String(cancelledAt));
  const afterCancel = polls.length;
  await sleep(6000);
  check("tras 'cancelled' ya no consulta más", polls.length === afterCancel, `${polls.length - afterCancel}`);
} finally {
  try { ws?.close(); } catch { /* ya cerrado */ }
  chrome.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* en uso en Windows: se limpia solo */ }
}
console.log(`\n${n - bad}/${n} OK`);
process.exit(bad ? 1 : 0);
