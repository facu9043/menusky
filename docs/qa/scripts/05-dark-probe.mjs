// Investigate the 36 px light-vs-dark difference at mobile scroll step 10 (y = 6400)
import { launch, BASE } from "./lib.mjs";
import fs from "node:fs";
const br = await launch({ headless: true });
const out = {};
for (const scheme of ["light", "dark"]) {
  const ctx = await br.newContext({ viewport: { width: 360, height: 640 }, colorScheme: scheme, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(1000);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 640) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(350); }
  await page.evaluate(() => scrollTo(0, 6400)); await page.waitForTimeout(500);
  const el = await page.evaluate(() => {
    const pts = [[40, 530], [180, 531], [300, 531]];
    return pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); const cs = getComputedStyle(e); return { tag: e.tagName, cls: String(e.className).slice(0, 50), text: e.textContent.trim().slice(0, 50), color: cs.color, bg: cs.backgroundColor, font: cs.fontFamily.slice(0, 30), scheme: cs.colorScheme }; });
  });
  out[scheme] = el;
  fs.mkdirSync("out", { recursive: true });
  await page.screenshot({ path: `out/probe-${scheme}.png`, clip: { x: 0, y: 500, width: 360, height: 60 } });
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await br.close();
