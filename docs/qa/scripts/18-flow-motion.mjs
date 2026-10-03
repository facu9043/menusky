// QA-07 cycle 2: reduced-motion does not start; Pause freezes / Resume resumes.
import { launch, BASE, check } from "./lib.mjs";
const br = await launch({ headless: false });
const gotoFlow = async (page) => { await page.goto(BASE + "/", { waitUntil: "load" }); await page.evaluate(() => { const f = document.querySelector("#como-funciona .ms-flow"); scrollTo(0, f.getBoundingClientRect().top + scrollY + 300); }); };
const step = (page) => page.evaluate(() => document.querySelector("#como-funciona .ms-flow").dataset.step);
for (const [w, h] of [[360, 640], [1440, 900]]) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  const page = await ctx.newPage(); await gotoFlow(page);
  const seen = new Set(); const t0 = Date.now();
  while (Date.now() - t0 < 12000) { seen.add(await step(page)); await page.waitForTimeout(250); }
  check(`reduced-motion ${w}: FlowDemo no arranca (solo paso estatico 4)`, seen.size === 1 && seen.has("4"), [...seen]);
  await ctx.close();
}
for (const [w, h] of [[360, 640], [1440, 900]]) {
  const ctx = await br.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage(); await gotoFlow(page);
  await page.waitForFunction(() => document.querySelector("#como-funciona .ms-flow").dataset.step !== "4", null, { timeout: 8000 });
  const btn = page.getByRole("button", { name: /Pausar animación/ });
  await btn.scrollIntoViewIfNeeded(); await btn.click();
  const s0 = await step(page); const seen = new Set(); const t0 = Date.now();
  while (Date.now() - t0 < 8000) { seen.add(await step(page)); await page.waitForTimeout(250); }
  const paused = await page.evaluate(() => document.querySelector("#como-funciona .ms-flow").dataset.paused);
  check(`pausa ${w}: congela (data-paused=${paused}, pasos vistos en 8s)`, seen.size === 1 && seen.has(s0), [...seen]);
  const rb = page.getByRole("button", { name: /Reanudar animación/ });
  check(`pausa ${w}: el boton pasa a "Reanudar animación"`, await rb.count() === 1, "");
  await rb.click();
  const seen2 = new Set(); const t1 = Date.now();
  while (Date.now() - t1 < 9000) { seen2.add(await step(page)); await page.waitForTimeout(250); }
  check(`reanudar ${w}: avanza de nuevo`, seen2.size >= 2, [...seen2]);
  await ctx.close();
}
await br.close();
