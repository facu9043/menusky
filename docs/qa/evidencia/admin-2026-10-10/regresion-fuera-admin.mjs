// QA 5b: regresion fuera del admin (/kitchen, /floor, /m/<token>, 429, "Tu pedido" con sondeo, login por rol).
// Uso: TOOLS_DIR=<carpeta con playwright> APP_URL=http://127.0.0.1:3470 MOCK_URL=http://127.0.0.1:3471 node regresion-fuera-admin.mjs
// Reinicia el mock al empezar: usar un mock propio. Usuarios ficticios del README de scripts/mock-supabase.
import { createRequire } from "node:module";
import path from "node:path";
const pw = createRequire(path.join(process.env.TOOLS_DIR, "package.json"))("playwright");
const APP = process.env.APP_URL ?? "http://127.0.0.1:3470", MOCK = process.env.MOCK_URL ?? "http://127.0.0.1:3471";
const SHOTS = process.env.SHOTS ?? "docs/qa/capturas/admin";
let ok = 0, bad = 0;
const check = (id, cond, d = "") => { cond ? ok++ : bad++; console.log(`${cond ? "OK  " : "FAIL"} ${id}${d ? " | " + d : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (b) => (await fetch(MOCK + "/__mock/event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) })).json();
await fetch(MOCK + "/__mock/reset", { method: "POST" });
const browser = await pw.chromium.launch({ channel: "chrome", headless: true });

async function loginAs(email, redirect) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${APP}/login${redirect ? "?redirect=" + encodeURIComponent(redirect) : ""}`);
  await page.fill("#email", email);
  await page.fill("#password", "demo-1234");
  await page.click("#lg-submit");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(2000);
  return { ctx, page };
}
const fonts = (page) => page.evaluate(() => {
  const bad = [], seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n, total = 0;
  while ((n = w.nextNode())) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el); total++;
    const ff = getComputedStyle(el).fontFamily;
    if (/times/i.test(ff.split(",")[0]) || ff.trim() === "") bad.push(ff);
  }
  return { total, times: bad.length, body: getComputedStyle(document.body).fontFamily.slice(0, 80) };
});

// 1) Login por rol (CA-3.7) + paneles (CA-3.1..3.6)
const dest = {};
for (const [email, expected] of [["admin@demo.test", "/admin"], ["mozo@demo.test", "/floor"], ["cocina@demo.test", "/kitchen"], ["sinstaff@demo.test", "/kitchen"]]) {
  const { ctx, page } = await loginAs(email);
  dest[email] = new URL(page.url()).pathname;
  check(`CA-3.7 login ${email} sin redirect -> ${expected}`, dest[email] === expected, dest[email]);
  await ctx.close();
}
async function visit(email, route, expectPath, tag) {
  const { ctx, page } = await loginAs(email);
  const resp = await page.goto(APP + route, { waitUntil: "networkidle" });
  const p = new URL(page.url()).pathname;
  check(`${tag} ${email} en ${route} -> ${expectPath}`, p === expectPath, p);
  return { ctx, page, resp };
}
{ const r = await visit("mozo@demo.test", "/kitchen", "/floor", "CA-3.1"); await r.ctx.close(); }
{ const r = await visit("cocina@demo.test", "/floor", "/kitchen", "CA-3.2"); await r.ctx.close(); }
{ const r = await visit("mozo@demo.test", "/admin", "/admin", "CA-NR.01"); const t = await r.page.textContent("body"); check("CA-NR.01 mozo en /admin ve NotAdminAccess", /solo para administradores/i.test(t) && !/Provoleta|Provoleta/.test(t)); await r.ctx.close(); }
{ const r = await visit("sinstaff@demo.test", "/floor", "/floor", "CA-3.5"); const t = await r.page.textContent("body"); check("CA-3.5 sin staff ve sin acceso, sin datos", /no está vinculada/i.test(t) && !/Mesa 1/.test(t), t.replace(/\s+/g, " ").slice(0, 100)); await r.ctx.close(); }
// redirect=
{ const { ctx, page } = await loginAs("mozo@demo.test", "/kitchen"); check("CA-3.7 mozo ?redirect=/kitchen termina en /floor", new URL(page.url()).pathname === "/floor", page.url()); await ctx.close(); }
{ const { ctx, page } = await loginAs("cocina@demo.test", "/floor"); check("CA-3.7 cocina ?redirect=/floor termina en /kitchen", new URL(page.url()).pathname === "/kitchen", page.url()); await ctx.close(); }
{ const { ctx, page } = await loginAs("mozo@demo.test", "/admin"); const t = await page.textContent("body"); check("CA-3.7 mozo ?redirect=/admin ve NotAdminAccess", new URL(page.url()).pathname === "/admin" && /solo para administradores/i.test(t)); await ctx.close(); }
// anonimo
{ const ctx = await browser.newContext(); const p = await ctx.newPage(); for (const r of ["/kitchen", "/floor", "/admin", "/admin/menu", "/admin/mesas", "/admin/apariencia"]) { await p.goto(APP + r); const u = new URL(p.url()); check(`CA-NR.01 anonimo ${r} -> /login?redirect`, u.pathname === "/login" && u.searchParams.get("redirect") === r, u.pathname + u.search); } await ctx.close(); }

// 2) /kitchen y /floor: fuente y contenido (D-19, CA-RNF.7)
for (const [email, route] of [["cocina@demo.test", "/kitchen"], ["mozo@demo.test", "/floor"], ["admin@demo.test", "/kitchen"], ["admin@demo.test", "/floor"]]) {
  const { ctx, page } = await loginAs(email, route);
  await page.waitForTimeout(1200);
  const f = await fonts(page);
  check(`D-19 ${route} (${email}): 0 textos en Times, body Geist`, f.times === 0 && /geist/i.test(f.body), JSON.stringify(f));
  const txt = (await page.textContent("body")).replace(/\s+/g, " ");
  check(`${route} (${email}) muestra pedidos/mesas del mock`, route === "/kitchen" ? /Mesa 1/.test(txt) : /Mesa 1/.test(txt) && /Mesa 2/.test(txt), txt.slice(0, 140));
  if (email.startsWith("admin")) await page.screenshot({ path: `${SHOTS}/regresion${route.replace("/", "-")}-1440x900.png` });
  await ctx.close();
}

// 3) /m/<token>: carta, pedir, "Tu pedido" con sondeo, 429
const TOKEN = "mesa-1-demo0001";
const cctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const c = await cctx.newPage();
await c.goto(`${APP}/m/${TOKEN}`, { waitUntil: "networkidle" });
const mtxt = await c.textContent("body");
check("/m carta del cliente se ve (platos del seed)", /Provoleta/.test(mtxt) && !/Limonada/.test(mtxt) , mtxt.replace(/\s+/g, " ").slice(0, 90));
await c.screenshot({ path: `${SHOTS}/regresion-m-carta-390x844.png` });
const fm = await fonts(c);
check("/m sin textos en Times", fm.times === 0, JSON.stringify(fm));
// plato sin opciones obligatorias: Provoleta
await c.getByText("Provoleta", { exact: false }).first().click();
await c.waitForTimeout(500);
await c.getByRole("button", { name: /Agregar/ }).first().click();
await c.waitForTimeout(500);
await c.locator("button").filter({ hasText: /pedido|carrito|ver/i }).last().click().catch(() => {});
await c.waitForTimeout(600);
await c.screenshot({ path: `${SHOTS}/regresion-m-carrito-390x844.png` });
await c.getByRole("button", { name: /Enviar pedido/i }).click();
await c.waitForURL(/\/pedido\//, { timeout: 15000 });
const orderUrl = c.url();
await c.waitForLoadState("networkidle");
const ptxt = (await c.textContent("body")).replace(/\s+/g, " ");
check("CA-2.3 el cliente llega a 'Tu pedido' con hora y total", /Tu pedido/.test(ptxt) && /Hecho a las \d\d:\d\d/.test(ptxt) && /Provoleta/.test(ptxt), ptxt.slice(0, 160));
check("CA-2.6 seguimiento 'Recibido' visible", /Recibido/.test(ptxt));
await c.screenshot({ path: `${SHOTS}/regresion-m-tu-pedido-390x844.png` });
// sondeo: cambiar el estado del pedido sin recargar
const orderId = orderUrl.split("/").pop();
const reqs = []; c.on("request", (r) => { if (/rpc\/get_public_order_status|orders/.test(r.url())) reqs.push(Date.now()); });
const t0 = Date.now();
await ev({ type: "order_status", orderId, status: "in_kitchen" });
await c.waitForFunction(() => /En preparaci/i.test(document.body.innerText) && document.querySelector("[aria-current='step'], [data-current='true'], [data-state='current']") !== null || /En preparaci/i.test(document.body.innerText), null, { timeout: 8000 }).catch(() => {});
const dt1 = Date.now() - t0;
const sawPrep = await c.evaluate(() => document.body.innerText);
await ev({ type: "order_status", orderId, status: "ready" });
const t1 = Date.now();
await c.waitForFunction(() => /Listo/.test(document.body.innerText), null, { timeout: 8000 }).catch(() => {});
await ev({ type: "order_status", orderId, status: "cancelled" });
const t2 = Date.now();
await c.waitForFunction(() => /fue cancelado/.test(document.body.innerText), null, { timeout: 8000 }).catch(() => {});
const dt3 = Date.now() - t2;
check("CA-2.7 'Tu pedido' refleja cancelado sin recargar en <= 5 s", /Este pedido fue cancelado\./.test(await c.evaluate(() => document.body.innerText)) && dt3 <= 5000, `${dt3} ms; en preparacion visto: ${/preparaci/i.test(sawPrep)} (${dt1} ms)`);
check("D-12/CA-2.7 hubo sondeo (pedidos periodicos al estado)", reqs.length >= 1, `${reqs.length} pedidos de red observados`);
check("CA-2.6 orderId inexistente -> 404", (await (await cctx.newPage()).goto(`${APP}/m/${TOKEN}/pedido/00000000-0000-0000-0000-000000000000`)).status() === 404);
// el pedido aparecio en cocina (admin)
// 429: 10 pedidos por mesa/10 min; ya se hizo 1 por UI
const body = { qrToken: TOKEN, items: [{ menuItemId: null, quantity: 1 }] };
const st = await (await fetch(`${MOCK}/rest/v1/menu_items?select=id&name=eq.Provoleta`, { headers: { apikey: "mock-anon-key" } })).json();
body.items[0].menuItemId = st[0].id;
const codes = [];
let last;
for (let i = 0; i < 11; i++) { const r = await fetch(`${APP}/api/orders`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tableId: TOKEN, qrToken: TOKEN, items: body.items.map((x) => ({ ...x, choiceIds: [] })) }) }); codes.push(r.status); last = await r.json(); }
console.log("codigos:", codes.join(","));
check("CA-2.x 429 al pasar el limite (10/mesa/10 min) con el texto exacto", codes.includes(429) && last.error === "Recibimos muchos pedidos de esta mesa. Esperá unos minutos o llamá al mozo.", `${codes.join(",")} | ${last.error}`);
// Semilla del mock (server.mjs:205-210): Mesa 1 tiene 1 pedido dentro de los 10 min (hace 3 min) y 1 fuera (hace 90 min). 1 semilla + 1 por UI + 8 por API = 10 -> el 9.o de la tanda recibe 429.
check("429 llega exactamente al 11.o pedido de la ventana (1 semilla + 1 UI + 8 API = 10, el siguiente 429)", codes.indexOf(429) === 8 && codes.slice(0, 8).every((c) => c === 200), `primer 429 en el intento ${codes.indexOf(429) + 1} de la tanda`);
// UI: el cliente ve el texto en un toast al pedir
await c.goto(`${APP}/m/${TOKEN}`, { waitUntil: "networkidle" });
await c.getByText("Provoleta", { exact: false }).first().click();
await c.waitForTimeout(400);
await c.getByRole("button", { name: /Agregar/ }).first().click();
await c.waitForTimeout(400);
await c.locator("button").filter({ hasText: /pedido|carrito|ver/i }).last().click().catch(() => {});
await c.getByRole("button", { name: /Enviar pedido/i }).click();
await c.waitForTimeout(1500);
const ttxt = await c.evaluate(() => document.body.innerText);
check("CA-2.x el cliente ve en pantalla el texto del 429", /Recibimos muchos pedidos de esta mesa\. Esperá unos minutos o llamá al mozo\./.test(ttxt));
await c.screenshot({ path: `${SHOTS}/regresion-m-429-390x844.png` });
await cctx.close();
console.log(`\n${ok} OK, ${bad} FAIL`);
await browser.close();
process.exit(bad ? 1 : 0);
