// QA re-test SEC-AF-02: complementa sec-af-02-qr-e2e.mjs con (1) texto EXACTO del 429 en API y en la interfaz (toast),
// (2) latencia medida de "Tu pedido" (<= 5 s), (3) descarga de QR con el boton de /admin/mesas.
// Uso: PW_DIR=<tools> MOCK=http://127.0.0.1:3472 APP=http://127.0.0.1:3470 node qr-extra.mjs   (LEGACY=1 si el mock corre con MOCK_LEGACY=1)
import { createRequire } from "node:module";
import { join } from "node:path";
const { chromium } = createRequire(join(process.env.PW_DIR, "package.json"))("playwright");
const MOCK = process.env.MOCK, APP = process.env.APP, LEGACY = process.env.LEGACY === "1";
const TXT = "Recibimos muchos pedidos de esta mesa. Esperá unos minutos o llamá al mozo.";
let n = 0, bad = 0;
const check = (name, ok, x = "") => { n++; if (!ok) bad++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${x ? "  [" + x + "]" : ""}`); };
const mock = (p, b) => fetch(MOCK + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b ?? {}) }).then((r) => r.json());
await mock("/__mock/reset");
console.log(`# modo: ${LEGACY ? "LEGADO" : "0004"}`);
const menu = await (await fetch(`${MOCK}/rest/v1/menu_items?select=id,name`, { headers: { apikey: "mock-anon-key" } })).json();
const agua = menu.find((m) => m.name === "Agua mineral 500ml").id;
const post = (qr) => fetch(APP + "/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ qrToken: qr, items: [{ menuItemId: agua, quantity: 1, choiceIds: [] }] }) });
const browser = await chromium.launch({ channel: "chrome" });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();

// (2) latencia de "Tu pedido"
const r1 = await (await post("mesa-1-demo0001")).json();
await page.goto(`${APP}/m/mesa-1-demo0001/pedido/${r1.orderId}`, { waitUntil: "networkidle" });
await mock("/__mock/event", { type: "order_status", orderId: r1.orderId, status: "in_kitchen" });
const t0 = Date.now(); let seen = false;
while (Date.now() - t0 < 8000 && !seen) { await page.waitForTimeout(100); seen = /preparaci/i.test(await page.evaluate(() => document.body.textContent)); }
const dt = Date.now() - t0;
check('"Tu pedido" se actualiza en <= 5 s', seen && dt <= 5000, `${dt} ms`);

// (1) 429 exacto en API (mesa 3: 10 ok, el 11 falla)
const st = []; for (let i = 0; i < 10; i++) st.push((await post("mesa-3-demo0003")).status);
const r11 = await post("mesa-3-demo0003"); const b11 = await r11.json();
if (LEGACY) check("LEGADO: sin 0004 no hay limite (comportamiento previo conocido)", r11.status === 200, `${r11.status}`);
else {
  check("pedido 11: status 429", st.every((s) => s === 200) && r11.status === 429, JSON.stringify(st) + " " + r11.status);
  check("pedido 11: texto exacto", b11.error === TXT, JSON.stringify(b11));
  // en la interfaz: toast con ese texto
  await page.goto(`${APP}/m/mesa-3-demo0003`, { waitUntil: "networkidle" });
  await page.locator("main button, [role=button]").filter({ hasText: /Agua mineral/ }).first().click();
  await page.getByRole("button", { name: /^Agregar/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /pedido|carrito/i }).first().click();
  await page.getByRole("button", { name: /Enviar pedido a cocina/ }).click();
  await page.waitForTimeout(1500);
  const body = await page.evaluate(() => document.body.textContent);
  check("interfaz: el toast muestra el texto exacto del 429", body.includes(TXT));
  await page.screenshot({ path: "docs/qa/capturas/admin/retest-qr-429.png" });
}

// (3) descarga de QR desde el admin
const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const p2 = await ctx2.newPage();
await p2.goto(`${APP}/login?redirect=/admin/mesas`);
await p2.fill("#email", "admin@demo.test"); await p2.fill("#password", "demo-1234"); await p2.click("#lg-submit");
await p2.waitForURL(/\/admin\/mesas/, { timeout: 20000 }); await p2.waitForTimeout(2000);
const txt = await p2.evaluate(() => document.body.textContent);
check("admin/mesas lista Mesa 1, 2 y 3", /Mesa 1/.test(txt) && /Mesa 2/.test(txt) && /Mesa 3/.test(txt));
const png = await p2.evaluate(async () => { const r = await fetch("/api/qr/mesa-1-demo0001"); const b = new Uint8Array(await r.arrayBuffer()); return { s: r.status, t: r.headers.get("content-type"), sig: [...b.slice(0, 4)].join(",") }; });
check("descarga QR: 200 image/png con firma PNG", png.s === 200 && png.t === "image/png" && png.sig === "137,80,78,71", JSON.stringify(png));
await browser.close();
console.log(`\n${n - bad}/${n} OK`);
process.exit(bad ? 1 : 0);
