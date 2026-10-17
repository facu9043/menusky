// Copia del e2e de QA (docs/qa/evidencia/cocina-salon-2026-10-17/copia-sec-af-02-qr-e2e.mjs) con un solo cambio:
// chromium.launch usa el Chrome instalado (channel "chrome"), porque el Chromium de Playwright 1.64.1 no está instalado.
// e2e SEC-AF-02 / D-21: flujo del cliente por QR sin lectura publica de `tables`.
// Requiere: mock en MOCK (3401) y build de produccion servido en APP (3402), y Playwright
// instalado FUERA del repo (PW_DIR = carpeta con node_modules/playwright).
// Con LEGACY=1 el mock corre con MOCK_LEGACY=1 (base sin 0004): prueba el fallback TEMP-COMPAT-0004.
// Uso: PW_DIR=C:/Users/.../pwe2e node docs/evidencia/backend/sec-af-02-qr-e2e.mjs
import { createRequire } from "node:module";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";

const MOCK = process.env.MOCK ?? "http://127.0.0.1:3401";
const APP = process.env.APP ?? "http://127.0.0.1:3402";
const LEGACY = process.env.LEGACY === "1";
const require = createRequire(join(process.env.PW_DIR, "package.json"));
const { chromium } = require("playwright");
const ANON = "mock-anon-key";
const QR = "mesa-1-demo0001";

let n = 0, bad = 0;
const check = (name, ok, extra = "") => {
  n++;
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra && !ok ? `  [${extra}]` : ""}`);
};
const mock = (path, body) => fetch(MOCK + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) }).then((r) => r.json());
const rest = (path, init = {}) => fetch(`${MOCK}/rest/v1/${path}`, { ...init, headers: { apikey: ANON, "content-type": "application/json", ...(init.headers ?? {}) } });
const post = (path, body) => fetch(APP + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

async function login(email) {
  const jar = new Map();
  const supa = createServerClient(MOCK, ANON, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (l) => l.forEach(({ name, value }) => jar.set(name, value)) } });
  const { error } = await supa.auth.signInWithPassword({ email, password: "demo-1234" });
  if (error) throw new Error(error.message);
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

console.log(`# modo del mock: ${LEGACY ? "LEGADO (sin 0004: fallback TEMP-COMPAT-0004)" : "con 0004 (SEC-AF-02 aplicado)"}`);
await mock("/__mock/reset");
const menu = await (await rest("menu_items?select=id,name")).json();
const idOf = (name) => menu.find((m) => m.name === name).id;

// ---- 1. El anonimo no lista mesas ni tokens (solo con 0004)
{
  const all = await (await rest("tables?select=id,label,qr_token")).json();
  const like = await (await rest("tables?select=qr_token&qr_token=like.mesa*")).json();
  if (!LEGACY) {
    check("anon: GET /rest/v1/tables -> [] (no lista mesas ni qr_token)", Array.isArray(all) && all.length === 0, JSON.stringify(all).slice(0, 120));
    check("anon: filtro like sobre qr_token -> []", Array.isArray(like) && like.length === 0);
    const rpc = await (await rest("rpc/get_table_by_token", { method: "POST", body: JSON.stringify({ p_qr_token: QR }) })).json();
    check("anon: RPC get_table_by_token(token exacto) -> {id,label,restaurant_id}", rpc?.label === "Mesa 1" && !("qr_token" in rpc) && Object.keys(rpc).length === 3, JSON.stringify(rpc));
    for (const tok of ["mesa-%", "%", "mesa-1", "", "zzz"]) {
      const r = await (await rest("rpc/get_table_by_token", { method: "POST", body: JSON.stringify({ p_qr_token: tok }) })).json();
      check(`anon: RPC get_table_by_token('${tok}') -> null (no enumera)`, r === null, JSON.stringify(r));
    }
    // Ataque SEC-AF-02: sin lista de tokens no hay forma de agotar el cupo de otras mesas
    check("ataque SEC-AF-02: 0 tokens obtenidos por el anonimo", all.length === 0);
  } else {
    check("LEGADO: el anonimo todavia lista mesas (base sin 0004, estado actual)", Array.isArray(all) && all.length === 4, `${all.length}`);
    const r = await rest("rpc/get_table_by_token", { method: "POST", body: JSON.stringify({ p_qr_token: QR }) });
    check("LEGADO: la RPC no existe (PGRST202) -> la app usa el fallback", r.status === 404 && (await r.json()).code === "PGRST202");
  }
}

// ---- 2. Carta por QR (navegador real)
const browser = await chromium.launch({ channel: "chrome",  executablePath: process.env.CHROMIUM_EXE });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
{
  const resp = await page.goto(`${APP}/m/${QR}`, { waitUntil: "networkidle" });
  const text = await page.innerText("body");
  check("/m/{token}: 200 y la carta se abre (restaurante, mesa y platos)", resp.status() === 200 && text.includes("El Buen Sabor") && text.includes("Mesa 1") && text.includes("Provoleta"), `${resp.status()}`);
  check("/m/{token}: no muestra platos de otro restaurante", !text.includes("Plato de B"));
  const bad404 = await page.goto(`${APP}/m/token-inexistente`, { waitUntil: "networkidle" });
  check("/m/{token inexistente} -> 404", bad404.status() === 404, `${bad404.status()}`);
  const other = await page.goto(`${APP}/m/mesa-b1-demo0001`, { waitUntil: "networkidle" });
  const otherText = await page.innerText("body");
  check("/m/{token de otro restaurante} abre la carta de ESE restaurante (el token es la credencial)", other.status() === 200 && otherText.includes("Mesa B1") && !otherText.includes("Provoleta"), otherText.slice(0, 80));
}

// ---- 3. Pedir desde el navegador (mismo fetch que hace la app) y "Tu pedido"
let orderId;
{
  await page.goto(`${APP}/m/${QR}`, { waitUntil: "networkidle" });
  const res = await page.evaluate(async ({ qr, id }) => {
    const r = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ qrToken: qr, items: [{ menuItemId: id, quantity: 1, choiceIds: [] }] }) });
    return { status: r.status, body: await r.json() };
  }, { qr: QR, id: idOf("Provoleta") });
  orderId = res.body.orderId;
  check("pedir: POST /api/orders (sin sesion) -> 200 { orderId }", res.status === 200 && !!orderId, JSON.stringify(res));
  await page.goto(`${APP}/m/${QR}/pedido/${orderId}`, { waitUntil: "networkidle" });
  const text = await page.innerText("body");
  check('"Tu pedido": se ve el pedido (Provoleta) con el token de su mesa', text.includes("Tu pedido") && text.includes("Provoleta"));
  await mock("/__mock/event", { type: "order_status", orderId, status: "in_kitchen" });
  let seen = false;
  for (let i = 0; i < 12 && !seen; i++) { await new Promise((r) => setTimeout(r, 500)); seen = /preparaci/i.test(await page.innerText("body")); }
  check('"Tu pedido": el estado se actualiza solo por sondeo (en preparacion) <= 6 s', seen);
  const wrong = await page.goto(`${APP}/m/mesa-2-demo0002/pedido/${orderId}`, { waitUntil: "networkidle" });
  check('"Tu pedido" con el token de OTRA mesa -> 404', wrong.status() === 404, `${wrong.status()}`);
}

// ---- 4. Llamar al mozo
{
  const before = (await (await fetch(MOCK + "/__mock/state")).json()).counts.waiter_calls;
  const ok = await post("/api/waiter-calls", { qrToken: QR, reason: "cuenta" });
  const after = (await (await fetch(MOCK + "/__mock/state")).json()).counts.waiter_calls;
  check("llamar al mozo (sin sesion) -> 200 { ok } y se crea el llamado", ok.status === 200 && after === before + 1, `${ok.status} ${before}->${after}`);
  const nf = await post("/api/waiter-calls", { qrToken: "nope", reason: "cuenta" });
  check("llamar al mozo con token inexistente -> 404 Mesa no encontrada", nf.status === 404 && (await nf.json()).error === "Mesa no encontrada");
  const bad = await post("/api/waiter-calls", { qrToken: QR, reason: "xxx" });
  check("llamar al mozo con motivo invalido -> 400", bad.status === 400);
}

// ---- 5. Limite 10/10min y cancelados (D-21)
{
  const MESA3 = "mesa-3-demo0003";
  const body = { qrToken: MESA3, items: [{ menuItemId: idOf("Agua mineral 500ml"), quantity: 1, choiceIds: [] }] };
  const st = [];
  for (let i = 0; i < 10; i++) st.push((await post("/api/orders", body)).status);
  const r11 = await post("/api/orders", body);
  if (LEGACY) check("LEGADO: sin 0004 no hay limite (el 11 -> 200; el limite vive en create_order de 0004, igual que antes de este cambio)", st.every((s) => s === 200) && r11.status === 200, JSON.stringify(st) + r11.status);
  else check("limite: 10 pedidos -> 200; el 11 -> 429", st.every((s) => s === 200) && r11.status === 429, JSON.stringify(st) + r11.status);
  if (!LEGACY) {
    const ords = (await (await fetch(MOCK + "/__mock/state")).json()).orders;
    const mesa3Id = (await (await fetch(MOCK + "/__mock/state")).json()).tables.find((t) => t.qr_token === MESA3).id;
    const one = ords.find((o) => o.table_id === mesa3Id && o.status === "received");
    await mock("/__mock/event", { type: "order_status", orderId: one.id, status: "cancelled" });
    const afterCancel = await post("/api/orders", body);
    check("D-21: cancelar 1 pedido libera 1 lugar (el siguiente -> 200)", afterCancel.status === 200, `${afterCancel.status}`);
    const next = await post("/api/orders", body);
    check("D-21: y el que sigue vuelve a dar 429", next.status === 429, `${next.status}`);
  }
}

// ---- 6. QR del admin (sin sesion, como hoy) y vistas de staff
{
  const r = await fetch(`${APP}/api/qr/${QR}`);
  const buf = Buffer.from(await r.arrayBuffer());
  check("/api/qr/{token}: 200 image/png (PNG real) sin sesion, igual que hoy", r.status === 200 && r.headers.get("content-type") === "image/png" && buf.subarray(1, 4).toString() === "PNG" && /qr-mesa-1\.png/.test(r.headers.get("content-disposition") ?? ""), `${r.status}`);
  const nf = await fetch(`${APP}/api/qr/nope`);
  check("/api/qr/{token inexistente} -> 404", nf.status === 404);
  const adminCookie = await login("admin@demo.test");
  const mesas = await (await fetch(`${APP}/admin/mesas`, { headers: { cookie: adminCookie } })).text();
  check("admin: /admin/mesas lista sus mesas (Mesa 1, 2, 3) y no las de B", ["Mesa 1", "Mesa 2", "Mesa 3"].every((m) => mesas.includes(m)) && !mesas.includes("Mesa B1"));
  const home = await fetch(`${APP}/admin`, { headers: { cookie: adminCookie }, redirect: "manual" });
  check("admin: /admin -> 200", home.status === 200, `${home.status}`);
  const mozo = await login("mozo@demo.test");
  const floor = await (await fetch(`${APP}/floor`, { headers: { cookie: mozo } })).text();
  check("mozo: /floor ve las mesas de su restaurante (Mesa 1, 2, 3)", ["Mesa 1", "Mesa 2", "Mesa 3"].every((m) => floor.includes(m)) && !floor.includes("Mesa B1"));
  const cocina = await login("cocina@demo.test");
  const kitchen = await (await fetch(`${APP}/kitchen`, { headers: { cookie: cocina } })).text();
  check("cocina: /kitchen ve los pedidos con la etiqueta de su mesa (join orders -> tables)", kitchen.includes("Mesa 1") && kitchen.includes("Provoleta"));
  const b = await login("admin-b@demo.test");
  const mesasB = await (await fetch(`${APP}/admin/mesas`, { headers: { cookie: b } })).text();
  check("admin B: /admin/mesas ve Mesa B1 y ninguna de A", mesasB.includes("Mesa B1") && !mesasB.includes("Mesa 2"));
}

await browser.close();
console.log(`\n${n - bad}/${n} OK`);
process.exit(bad ? 1 : 0);
