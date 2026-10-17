// "Tu pedido" (/m/[token]/pedido/[id]) con la hora en 24 h (decisión del Director, 2026-10-17).
// La hora la arma el servidor ("Hecho a las HH:MM"); el estado se actualiza por sondeo y la hora no se re-formatea
// en el cliente. Para que el caso pruebe de verdad 24 h, el pedido se lleva a las 15:xx (hora de Argentina) con
// el evento age_orders del mock.
import { launch, check, note, summary, APP, resetMock, mockEvent } from "../lib-staff.mjs";
const H24 = /Hecho a las ([01]\d|2[0-3]):[0-5]\d(?!\s*[ap]\.)/;
const AMPM = /[ap]\.\s?m\./;
await resetMock();
const { orderId } = await mockEvent({ type: "new_order", table: "Mesa 1", items: [{ name: "Provoleta", quantity: 1 }] });
// Minutos hasta las 15:10 (Argentina, UTC-3) de hoy o de ayer.
const now = new Date();
const ar = new Date(now.getTime() - 3 * 3600e3);
let target = Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate(), 15, 10) + 3 * 3600e3;
if (target > now.getTime()) target -= 24 * 3600e3;
const minutes = Math.round((now.getTime() - target) / 60000);
await mockEvent({ type: "age_orders", table: "Mesa 1", minutes });
note(`pedido ${orderId}; se atrasó ${minutes} min para quedar a las 15:10 de Argentina`);

const url = `${APP}/m/mesa-1-demo0001/pedido/${orderId}`;
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "America/Argentina/Buenos_Aires" });
const p = await ctx.newPage();
const html = await (await ctx.request.get(url)).text();
// React separa el texto fijo del valor con <!-- -->.
const m = html.replace(/<!-- -->/g, "").match(/Hecho a las [^<]*/);
check('HTML del servidor: "Hecho a las 15:xx" en 24 h, sin "a. m."/"p. m."', !!m && /^Hecho a las 15:(0\d|1\d)$/.test(m[0].trim()) && !AMPM.test(m[0]), m?.[0]);
await p.goto(url);
const before = (await p.locator("text=/Hecho a las/").textContent()).trim();
check("en el navegador, al cargar: 24 h", H24.test(before), before);
await mockEvent({ type: "order_status", orderId, status: "in_kitchen" });
// El sondeo de "Tu pedido" pide el estado al servidor; se espera la respuesta que ya trae "in_kitchen".
const t0 = Date.now();
const resp = await p.waitForResponse(async (r) => /get_public_order_status/.test(r.url()) && (await r.text().catch(() => "")).includes("in_kitchen"), { timeout: 10000 }).catch(() => null);
await p.waitForTimeout(300);
const upd = { ok: !!resp, ms: Date.now() - t0 };
const after = (await p.locator("text=/Hecho a las/").textContent()).trim();
check(`tras actualizarse el estado por sondeo (${upd.ms} ms): la hora sigue en 24 h`, upd.ok && H24.test(after) && after === before, after);
await b.close();
await resetMock();
process.exitCode = summary() ? 1 : 0;
