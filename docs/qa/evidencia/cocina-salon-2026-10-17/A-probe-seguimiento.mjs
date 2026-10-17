// QA A: seguimiento de 3 FAIL de A-probe-extra.mjs (para separar prueba mal armada de defecto real).
// (1) que region aria-live es la segunda; (2) que parte del caso 'nombre largo / nota / 7 cifras' falla; (3) doble toque real (dblclick y 3 clics espaciados 30 ms).
import { launch, login, check, note, summary, resetMock, mockEvent, tokenFor, rest } from "../../../design/cocina-salon/evidencia/lib-staff.mjs";
const b = await launch();
await resetMock();
{
  const adm = await tokenFor("admin@demo.test");
  const LONGDISH = "Plato con un nombre extremadamente largo para probar el corte de linea en la comanda de cocina ok";
  await rest(adm, "PATCH", "menu_items?name=eq.Provoleta", { name: LONGDISH, price: 1234567 });
  await mockEvent({ type: "new_order", table: "Mesa 3", items: [{ name: LONGDISH, quantity: 9, note: "Sin sal ".repeat(30) + "FIN" }] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await login(p, "cocina@demo.test", "/kitchen"); await p.waitForTimeout(1500);
  const live = await p.evaluate(() => [...document.querySelectorAll("[aria-live]")].map((e) => ({ tag: e.tagName, cls: e.className, parent: e.parentElement?.tagName + "." + e.parentElement?.className, sonner: !!e.closest("section") || e.hasAttribute("data-sonner-toaster"), attrs: [...e.attributes].map((a) => a.name).join(",") })));
  note(`regiones aria-live en Cocina: ${JSON.stringify(live)}`);
  const t = await p.evaluate(() => document.body.textContent.replace(/\s+/g, " "));
  const card = await p.evaluate(() => document.querySelector('.st-order[data-status="received"]')?.textContent.replace(/\s+/g, " ") ?? "");
  note(`tarjeta Mesa 3: ${card.slice(0, 700)}`);
  check("plato largo completo", t.includes("nombre extremadamente largo para probar el corte de linea en la comanda de cocina ok"));
  check("nota larga completa con FIN", t.includes("FIN"));
  check("precio de 7 cifras en la cuenta de la mesa (1.234.567 o 11.111.103)", /\$\s?\d{1,2}\.\d{3}\.\d{3}/.test(t), (t.match(/\$\s?[\d.]+/g) ?? []).join(" "));
  await p.screenshot({ path: "docs/qa/capturas/cocina-salon/limite-cocina-390x844-seguimiento.png" });
  await ctx.close();
}
await resetMock();
for (const mode of ["dblclick", "tres clics espaciados 30 ms"]) {
  await resetMock();
  await mockEvent({ type: "new_order", table: "Mesa 3", items: [{ name: "Provoleta", quantity: 1 }] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await login(p, "cocina@demo.test", "/kitchen"); await p.waitForTimeout(1500);
  await p.evaluate(() => { window.__patches = 0; const f = window.fetch; window.fetch = function (u, o) { if ((o?.method ?? "GET") === "PATCH") window.__patches++; return f.apply(this, arguments); }; });
  const btn = p.getByRole("button", { name: /Tomar pedido, Mesa 3/ });
  if (mode === "dblclick") await btn.dblclick();
  else { const r = await btn.boundingBox(); const x = r.x + r.width / 2, y = r.y + r.height / 2; for (let i = 0; i < 3; i++) { await p.mouse.click(x, y); await p.waitForTimeout(30); } }
  await p.waitForTimeout(1500);
  const n = await p.evaluate(() => window.__patches);
  const toasts = await p.evaluate(() => [...document.querySelectorAll("[data-sonner-toast]")].map((e) => e.textContent.trim()));
  check(`doble toque real (${mode}): una sola actualizacion`, n === 1, `${n} PATCH; toasts ${JSON.stringify(toasts)}`);
  await ctx.close();
}
await b.close();
summary();
