// CA-8.12: pixel diff between prefers-color-scheme light and dark (desktop + mobile, several scroll positions, reduced motion to freeze animations)
import { launch, BASE, check } from "./lib.mjs";
import { createRequire } from "node:module";
const require = createRequire("C:/Users/Windows10/Desktop/menusky/package.json");
const sharp = require("sharp"); // sharp is already in the app's node_modules (next dependency); no new dependency

const br = await launch({ headless: true });
async function shots(scheme, vp) {
  const ctx = await br.newContext({ viewport: vp, colorScheme: scheme, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(1000);
  const out = [];
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += vp.height) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(350);
    out.push(await page.screenshot());
  }
  const cs = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  await ctx.close();
  return { out, cs };
}
for (const [name, vp] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 360, height: 640 }]]) {
  const L = await shots("light", vp), D = await shots("dark", vp), L2 = await shots("light", vp);
  const cmp = async (A, B, label) => {
  let worst = 0, diffShots = 0;
  for (let i = 0; i < A.out.length; i++) {
    const a = await sharp(A.out[i]).raw().toBuffer({ resolveWithObject: true });
    const b = await sharp(B.out[i]).raw().toBuffer({ resolveWithObject: true });
    let n = 0; const w = a.info.width, h = a.info.height, c = a.info.channels;
    let minx = w, maxx = 0, miny = h, maxy = 0;
    for (let p = 0; p < w * h; p++) {
      const o = p * c;
      if (Math.abs(a.data[o] - b.data[o]) + Math.abs(a.data[o + 1] - b.data[o + 1]) + Math.abs(a.data[o + 2] - b.data[o + 2]) > 6) { n++; const x = p % w, y = (p / w) | 0; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    }
    if (n) { diffShots++; console.log(label, name, "shot", i, "differing px", n, "bbox", minx, miny, maxx, maxy, "of", w, h); }
    worst = Math.max(worst, n);
  }
  return { worst, diffShots };
  };
  const base = await cmp(L, L2, "light-vs-light(baseline noise)");
  const dk = await cmp(L, D, "light-vs-dark");
  console.log(name, "color-scheme light/dark:", L.cs, "/", D.cs, "shots", L.out.length);
  check(`CA-8.12 ${name} dark difiere <= 0,05% de píxeles por captura (ruido de decodificación de foto lazy; ver 05-dark-probe.mjs)`, dk.worst <= Math.max(base.worst, vp.width * vp.height * 0.0005), { baselineNoisePx: base.worst, darkVsLightPx: dk.worst, total: L.out.length });
}
await br.close();
