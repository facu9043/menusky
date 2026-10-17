// Hora de pedidos y llamados en 24 h ("13:13") en /kitchen y /floor (decisión del Director, 2026-10-17).
// Mira el HTML del servidor y la página ya hidratada (los dos usan el mismo formateador).
import { launch, login, check, note, summary, APP, resetMock, mockEvent, waitFor } from "../lib-staff.mjs";
await resetMock();
const H24 = /^([01]\d|2[0-3]):[0-5]\d$/;
const b = await launch();
for (const [email, route, sel] of [["cocina@demo.test", "/kitchen", ".st-order__time"], ["mozo@demo.test", "/floor", ".st-order__time, .st-call__why"]]) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await login(p, email, route);
  const html = await (await ctx.request.get(`${APP}${route}`)).text();
  const ampm = /[ap]\.\s?m\./.test(html);
  await p.waitForTimeout(1500);
  if (route === "/floor") await mockEvent({ type: "waiter_call", table: "Mesa 3", reason: "consulta" });
  else await mockEvent({ type: "new_order", table: "Mesa 3", items: [{ name: "Provoleta", quantity: 1 }] });
  await waitFor(async () => (await p.locator(sel).count()) >= 3);
  const times = (await p.locator(sel).allTextContents()).map((t) => t.split("·").pop().trim());
  note(`${route}: horas en pantalla: ${times.join(", ")}`);
  check(`${route}: todas las horas en 24 h (HH:MM, sin "a. m."/"p. m."), incluida la que llegó por tiempo real`, times.length >= 3 && times.every((t) => H24.test(t)), times.join(", "));
  check(`${route}: el HTML del servidor no trae "a. m."/"p. m."`, !ampm);
  await ctx.close();
}
await b.close();
await resetMock();
process.exitCode = summary() ? 1 : 0;
