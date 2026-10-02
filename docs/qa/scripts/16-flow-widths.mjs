// QA-02 regression: FlowDemo sequence runs (>=4 distinct current-step states, ticket reaches kitchen step) at 360/320/260; at 180 it must at least show all content statically (documented frontend observation).
import { launch, BASE, check } from "./lib.mjs";
const br = await launch({ headless: false });
for (const [w, h] of [[360, 640], [320, 640], [260, 640], [180, 640]]) {
  const ctx = await br.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  
  await page.evaluate(() => { const r = document.querySelector("#como-funciona"); const f = r.querySelector(".ms-flow"); scrollTo(0, f.getBoundingClientRect().top + scrollY + 300); });
  const seen = []; const t0 = Date.now();
  while (Date.now() - t0 < 22000) {
    const s = await page.evaluate(() => [...document.querySelectorAll("#como-funciona [aria-current], #como-funciona .is-current, #como-funciona .is-active, #como-funciona [data-active=true]")].map((e) => e.textContent.trim().replace(/\s+/g, " ").slice(0, 30)).join("|"));
    if (s && !seen.includes(s)) seen.push(s);
    await page.waitForTimeout(250);
  }
  const txt = await page.evaluate(() => document.querySelector("#como-funciona").textContent);
  const kitchen = seen.some((s) => /Cocina/.test(s)) ;
  const all = ["Recibido", "En preparación", "Listo", "Entregado"].every((n) => txt.includes(n));
  if (w >= 260) check(`FlowDemo ${w}px secuencia avanza (>=4 estados) y llega a cocina`, seen.length >= 4 && kitchen, seen);
  else check(`FlowDemo ${w}px contenido completo presente (estático aceptado), estados vistos=${seen.length}`, all, seen);
  check(`FlowDemo ${w}px nombres de estados presentes`, all, "");
  await ctx.close();
}
await br.close();
