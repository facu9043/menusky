// QA A: proporcion de las 2 columnas de Salon (aprobada 1.35:1) a 1024, 1280 y 1440, y que a 768 y 390 todo se apila.
import { launch, login, check, note, summary, resetMock } from "../../../design/cocina-salon/evidencia/lib-staff.mjs";
await resetMock();
const b = await launch();
for (const w of [1024, 1280, 1440, 768, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  const p = await ctx.newPage();
  await login(p, "mozo@demo.test", "/floor"); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const hs = [...document.querySelectorAll("h2")];
    const calls = hs.find((h) => /Llamados/.test(h.textContent))?.closest("section") ?? hs.find((h) => /Llamados/.test(h.textContent))?.parentElement;
    const mesas = hs.find((h) => h.textContent.trim() === "Mesas");
    const mp = mesas?.closest("section") ?? mesas?.parentElement;
    const a = calls?.getBoundingClientRect(), m = mp?.getBoundingClientRect();
    return a && m ? { aw: a.width, mw: m.width, aleft: a.left, mleft: m.left, atop: a.top, mtop: m.top } : null;
  });
  if (!r) { check(`Salon ${w}: se midieron las dos zonas`, false); continue; }
  const side = Math.abs(r.atop - r.mtop) < 40 && r.mleft > r.aleft;
  if (w >= 1024) { const ratio = r.aw / r.mw; note(`Salon ${w}: acciones ${r.aw.toFixed(0)} px, mesas ${r.mw.toFixed(0)} px, proporcion ${ratio.toFixed(2)}:1`); check(`Salon ${w}: 2 columnas lado a lado, acciones a la izquierda, proporcion cercana a 1.35:1 (1.2 a 1.5)`, side && ratio > 1.2 && ratio < 1.5, ratio.toFixed(2)); }
  else check(`Salon ${w}: zonas apiladas`, !side, JSON.stringify(r));
  await ctx.close();
}
await b.close();
summary();
