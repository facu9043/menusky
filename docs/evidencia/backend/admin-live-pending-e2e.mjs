// e2e del paso 3 (D-20): los indicadores de Cocina/Salón del menú del admin salen de
// AdminLiveProvider (un solo canal Realtime) y siguen a pedidos y llamados.
// Requiere: mock en MOCK (3401) y build de producción servido en APP (3400), y Playwright
// instalado FUERA del repo (PW_DIR = carpeta con node_modules/playwright).
// Uso: PW_DIR=C:/Users/.../pwe2e node docs/evidencia/backend/admin-live-pending-e2e.mjs
import { createRequire } from "node:module";
import { join } from "node:path";

const MOCK = process.env.MOCK ?? "http://127.0.0.1:3401";
const APP = process.env.APP ?? "http://127.0.0.1:3400";
const require = createRequire(join(process.env.PW_DIR, "package.json"));
const { chromium } = require("playwright");

let n = 0, bad = 0;
const check = (name, ok, extra = "") => {
  n++;
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  [${extra}]` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (body) => {
  const r = await fetch(`${MOCK}/__mock/event`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${JSON.stringify(body)} -> ${r.status} ${await r.text()}`);
  return r.json();
};

await fetch(`${MOCK}/__mock/reset`, { method: "POST" });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Frames del WebSocket de Realtime: cuenta los phx_join por tópico.
const joins = [];
const sockets = [];
page.on("websocket", (ws) => {
  sockets.push(ws.url());
  ws.on("framesent", (f) => {
    try {
      const m = JSON.parse(String(f.payload));
      if (m[3] === "phx_join") joins.push(m[2]);
    } catch {}
  });
});

await page.goto(`${APP}/login`);
await page.fill("#email", "admin@demo.test");
await page.fill("#password", "demo-1234");
await page.click("#lg-submit");
await page.waitForURL("**/admin**", { timeout: 20000 });
await page.waitForSelector('.adm-side a[href="/kitchen"]');
await sleep(1500);

const dot = (href) => page.locator(`.adm-side a[href="${href}"] .adm-dot`).count().then((c) => c > 0);
const waitDot = async (href, want, ms = 4000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if ((await dot(href)) === want) return Date.now() - t0;
    await sleep(100);
  }
  return null;
};
const expectDots = async (name, kitchen, floor) => {
  const k = await waitDot("/kitchen", kitchen);
  const f = await waitDot("/floor", floor);
  check(`${name}: Cocina=${kitchen ? "punto" : "sin punto"}, Salón=${floor ? "punto" : "sin punto"}`, k !== null && f !== null, `k=${await dot("/kitchen")} f=${await dot("/floor")}`);
};

// Datos de partida: received (Mesa 1), ready (Mesa 3), llamado pendiente (Mesa 2) => ambos con punto.
await expectDots("carga inicial (received + ready + llamado)", true, true);

// Canales Realtime de la página del admin.
const adminJoins = joins.filter((t) => t.startsWith("realtime:admin-live-"));
const otherJoins = joins.filter((t) => !t.startsWith("realtime:admin-live-"));
check("un solo canal Realtime en /admin (phx_join de admin-live-*)", adminJoins.length === 1, `joins=${JSON.stringify(joins)}`);
check("ningún otro canal (p. ej. staff-pending-*)", otherJoins.length === 0, JSON.stringify(otherJoins));
check("un solo WebSocket abierto", sockets.length === 1, JSON.stringify(sockets));

// Dejar todo sin pendientes.
await ev({ type: "order_status", table: "Mesa 1", status: "delivered" }); // el received
await ev({ type: "order_status", table: "Mesa 3", status: "delivered" }); // el ready
await ev({ type: "attend_call", table: "Mesa 2" });
await expectDots("todo atendido", false, false);

// Pedido nuevo -> Cocina.
const o = await ev({ type: "new_order", table: "Mesa 1", items: [{ name: "Provoleta", quantity: 1 }] });
await expectDots("pedido nuevo (received)", true, false);

// Pasa a in_kitchen -> Cocina se apaga (ya no está "sin tomar").
await ev({ type: "order_status", orderId: o.orderId, status: "in_kitchen" });
await expectDots("pasa a in_kitchen", false, false);

// Pasa a ready -> Salón.
await ev({ type: "order_status", orderId: o.orderId, status: "ready" });
await expectDots("pasa a ready", false, true);

// Entregado -> Salón se apaga.
await ev({ type: "order_status", orderId: o.orderId, status: "delivered" });
await expectDots("entregado", false, false);

// Llamado -> Salón; atendido -> se apaga.
await ev({ type: "waiter_call", table: "Mesa 3", reason: "cuenta" });
await expectDots("llamado de mozo (pending)", false, true);
await ev({ type: "attend_call", table: "Mesa 3" });
await expectDots("llamado atendido", false, false);

// Pedido de un día anterior (created_at atrasado 3 días) sigue contando (cualquier fecha).
const old = await ev({ type: "new_order", table: "Mesa 2", items: [{ name: "Provoleta", quantity: 1 }] });
await ev({ type: "age_orders", table: "Mesa 2", minutes: 3 * 24 * 60 });
// age_orders no emite evento: se fuerza una relectura con un llamado que luego se atiende.
await ev({ type: "waiter_call", table: "Mesa 1", reason: "otro" });
await ev({ type: "attend_call", table: "Mesa 1" });
await sleep(800);
await expectDots("received de hace 3 días (relectura posterior): sigue contando en Cocina", true, false);
await ev({ type: "order_status", orderId: old.orderId, status: "ready" });
await expectDots("ese pedido viejo pasa a ready: Salón", false, true);

// Navegar dentro del admin (navegación del cliente, sin recargar) no abre canales nuevos.
for (const [label, path] of [["Carta", "/admin/menu"], ["Mesas", "/admin/mesas"], ["Inicio", "/admin"]]) {
  await page.locator(`.adm-side a[href="${path}"]`).first().click();
  await page.waitForURL(`**${path}`, { timeout: 20000 });
  await sleep(1200);
}
check("navegar Carta > Mesas > Inicio sin recargar: siguen 1 join y 1 WebSocket", joins.length === 1 && sockets.length === 1, `joins=${joins.length} sockets=${sockets.length}`);
await expectDots("tras navegar, los indicadores siguen vigentes (ready viejo => Salón)", false, true);

await browser.close();
console.log(`\n${n - bad}/${n} OK`);
process.exit(bad ? 1 : 0);
