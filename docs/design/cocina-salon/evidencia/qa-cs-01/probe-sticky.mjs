// Copia de la sonda de QA (docs/qa/evidencia/cocina-salon-2026-10-17/A-probe-sticky.mjs) con 2 cambios: ruta de
// lib-staff.mjs y tamaños 360x640, 390x844, 768x1024 y 1280x800. La lógica de medición no cambió.
// QA A: CA-2.4 (el encabezado no tapa el boton de la ultima tarjeta) y foco no tapado por el encabezado fijo (WCAG 2.4.11 / CA-13.3 del admin).
// Con 32 pedidos en Cocina a 360x640 y 1280x800: (1) scroll al final: el boton de la ultima comanda queda completo y a >= 0 px del borde inferior;
// (2) Tab hacia adelante y Shift+Tab hacia atras por todos los botones: el elemento enfocado nunca queda (total o parcialmente) bajo el encabezado sticky.
import { launch, login, check, note, summary, resetMock, mockEvent } from "../lib-staff.mjs";
await resetMock();
for (let i = 0; i < 30; i++) await mockEvent({ type: "new_order", table: `Mesa ${1 + (i % 3)}`, items: [{ name: "Provoleta", quantity: 1 + (i % 3) }, { name: "Empanadas (x3)", quantity: 2 }] });
const b = await launch();
for (const [w, h] of [[360, 640], [390, 844], [768, 1024], [1280, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768, isMobile: w < 768 });
  const p = await ctx.newPage();
  await login(p, "cocina@demo.test", "/kitchen"); await p.waitForTimeout(2000);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(300);
  const last = await p.evaluate(() => { const btns = [...document.querySelectorAll(".st-order button")]; const r = btns.at(-1).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight, n: btns.length }; });
  check(`CA-2.4 ${w}x${h}: al final del scroll el boton de la ultima comanda se ve completo`, last.top >= 0 && last.bottom <= last.vh, JSON.stringify(last));
  await p.evaluate(() => window.scrollTo(0, 0));
  const headH = await p.evaluate(() => document.querySelector(".st-head").getBoundingClientRect().height);
  await p.keyboard.press("Tab"); await p.waitForTimeout(500);
  const sk = await p.evaluate(() => { const e = document.activeElement; const r = e.getBoundingClientRect(); return { txt: e.textContent.trim(), top: r.top, left: r.left, h: r.height }; });
  check(`skip link ${w}x${h}: al enfocarlo con Tab se hace visible (top >= 0; excluido luego del barrido por ser el enlace que aparece al enfocar)`, /Saltar/.test(sk.txt) && sk.top >= 0, JSON.stringify(sk));
  await p.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
  const hidden = [], total = [];
  const probe = async (dir) => {
    for (let i = 0; i < 90; i++) {
      await p.keyboard.press(dir === "f" ? "Tab" : "Shift+Tab");
      const r = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const b = e.getBoundingClientRect(); const hd = document.querySelector(".st-head")?.getBoundingClientRect(); const inHead = !!e.closest(".st-head"); return { n: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 30), top: b.top, bottom: b.bottom, headBottom: hd?.bottom ?? 0, inHead }; });
      if (r && !r.inHead && !/^Saltar/.test(r.n) && r.top < r.headBottom - 1) { hidden.push(`${dir} ${r.n} top ${r.top.toFixed(0)} bottom ${r.bottom.toFixed(0)} < header ${r.headBottom.toFixed(0)}`); if (r.bottom <= r.headBottom) total.push(r.n); };
    }
  };
  await probe("f"); await probe("b");
  note(`${w}x${h}: alto del encabezado sticky ${headH} px; casos de foco tapado: ${hidden.length}`);
  check(`WCAG 2.4.11 (AA, no TOTALMENTE tapado) ${w}x${h}: casos totalmente tapados = ${total.length}`, total.length === 0, total.join(" | "));
  check(`WCAG 2.4.12 (AAA, nada tapado) ${w}x${h}: el foco por teclado (Tab y Shift+Tab, 180 pasos) nunca queda bajo el encabezado fijo`, hidden.length === 0, hidden.slice(0, 3).join(" | "));
  await ctx.close();
}
await b.close();
summary();
