// QA-07 (hardened, cycle 2): FlowDemo must (a) NOT start before the section is in view and (b) ADVANCE
// (>=4 distinct data-step values incl. step 3 "Recibido"/kitchen) at EVERY width, 180 included.
import { launch, BASE, check } from "./lib.mjs";
const br = await launch({ headless: false });
const SIZES = [[180, 640], [260, 640], [320, 640], [360, 640], [768, 1024], [1440, 900]];
for (const [w, h] of SIZES) {
  const ctx = await br.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  const step = () => page.evaluate(() => document.querySelector("#como-funciona .ms-flow").dataset.step);
  // (b) before the section is in view: stays at the static step (4) and never starts
  const pre = new Set(); const tp = Date.now();
  while (Date.now() - tp < 5000) { pre.add(await step()); await page.waitForTimeout(250); }
  const inView = await page.evaluate(() => { const r = document.querySelector("#como-funciona .ms-flow").getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
  check(`FlowDemo ${w}x${h} no arranca antes de ver la seccion (seccion en vista=${inView})`, !inView && pre.size === 1 && pre.has("4"), [...pre]);
  await page.evaluate(() => { const f = document.querySelector("#como-funciona .ms-flow"); scrollTo(0, f.getBoundingClientRect().top + scrollY + 300); });
  const seen = []; const t0 = Date.now();
  while (Date.now() - t0 < 22000) {
    const s = await step();
    if (!seen.includes(s)) seen.push(s);
    await page.waitForTimeout(150);
  }
  const txt = await page.evaluate(() => document.querySelector("#como-funciona").textContent);
  const all = ["Recibido", "En preparación", "Listo", "Entregado"].every((n) => txt.includes(n));
  check(`FlowDemo ${w}x${h} la secuencia AVANZA (>=4 pasos distintos, pasa por 0..3)`, seen.length >= 4 && ["0", "1", "2", "3"].every((x) => seen.includes(x)), seen);
  check(`FlowDemo ${w}x${h} nombres de estados presentes`, all, "");
  await ctx.close();
}
await br.close();
