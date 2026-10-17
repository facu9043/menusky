// QA B: tiempo real tras RECARGAR (y tras reabrir con la sesion guardada) en /kitchen, /floor y /admin.
// Por cada caso: login, [recarga | storageState en contexto nuevo], evento del mock a los 2,5 s, el cambio debe verse en <= 5 s
// y todos los phx_join del websocket deben llevar access_token. Control: docs/evidencia/backend/realtime-recarga-2026-10-15.txt
// (master d66b639: 4/6, falla con recarga en /kitchen y /floor).
// Uso: TOOLS_DIR=<tools> APP_URL=.. MOCK_URL=.. node B-realtime-recarga.mjs
import { launch, login, check, summary, APP, resetMock, mockEvent, waitFor, toastText } from "../../../design/cocina-salon/evidencia/lib-staff.mjs";
const b = await launch();
const cases = [
  { route: "/kitchen", email: "cocina@demo.test", ev: { type: "new_order", table: "Mesa 3", items: [{ name: "Provoleta", quantity: 2 }] }, seen: async (p) => (await p.getByText("Provoleta").count()) > 0, what: "pedido nuevo visible en Cocina" },
  { route: "/floor", email: "mozo@demo.test", ev: { type: "waiter_call", table: "Mesa 3", reason: "cuenta" }, seen: async (p) => /Una mesa está llamando al mozo/.test(await toastText(p)) || /Llamados de mozo · 2/.test(await p.evaluate(() => document.body.textContent)), what: "llamado nuevo en Salon (toast o contador 2)" },
  { route: "/floor", email: "mozo@demo.test", ev: { type: "order_status", table: "Mesa 1", status: "ready" }, seen: async (p) => /Listos para llevar · 2/.test(await p.evaluate(() => document.body.textContent)), what: "pedido listo nuevo en Salon (contador 2)" },
  { route: "/admin", email: "admin@demo.test", ev: { type: "new_order", table: "Mesa 3", items: [{ name: "Provoleta", quantity: 1 }] }, seen: async (p) => (await p.locator(".adm-stat--hot .adm-stat__value").first().textContent().catch(() => "")).trim() === "5", what: "Pedidos de hoy 4 -> 5 en Inicio" },
];
for (const c of cases) for (const mode of ["sin recarga", "recarga", "reapertura (storageState)"]) {
  await resetMock();
  let ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  let p = await ctx.newPage();
  await login(p, c.email, c.route);
  if (mode === "reapertura (storageState)") { const st = await ctx.storageState(); await ctx.close(); ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, storageState: st }); p = await ctx.newPage(); }
  const joins = [];
  p.on("websocket", (ws) => ws.on("framesent", (f) => { try { const m = JSON.parse(f.payload); const arr = Array.isArray(m) ? m : [m]; const ev = m.event ?? m[3]; const pl = m.payload ?? m[4]; if (ev === "phx_join") joins.push({ topic: m.topic ?? m[2], tok: !!pl?.access_token }); } catch {} }));
  if (mode !== "sin recarga") await p.goto(APP + c.route); 
  await p.waitForTimeout(2500);
  await mockEvent(c.ev);
  const r = await waitFor(() => c.seen(p), 5000);
  check(`B ${c.route} [${mode}]: ${c.what} <= 5 s`, r.ok, `${r.ms} ms`);
  check(`B ${c.route} [${mode}]: todos los phx_join con access_token (${joins.length} joins)`, joins.length > 0 && joins.every((j) => j.tok), JSON.stringify(joins));
  await ctx.close();
}
await b.close();
summary();
