import { launch, BASE } from "./lib.mjs";
const br = await launch({ headless: true });
const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "load" });
await page.evaluate(async () => { for (let y = 0; y <= document.documentElement.scrollHeight; y += 250) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } });
const r = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const info = (e) => { const cs = getComputedStyle(e); let bg = null, n = e; while (n && !bg) { const b = getComputedStyle(n).backgroundColor; const bi = getComputedStyle(n).backgroundImage; if (b !== "rgba(0, 0, 0, 0)" || bi !== "none") bg = n.tagName + "." + String(n.className).slice(0, 30) + " " + b + " " + bi.slice(0, 90); n = n.parentElement; } return { text: e.textContent.trim().slice(0, 40), color: cs.color, opacity: cs.opacity, size: cs.fontSize, weight: cs.fontWeight, bg }; };
  return { cuentaP: info(q(".ms-tile--cuenta .ms-tile__copy > p:nth-child(2)")), note: info(q(".ms-tile__note")), theme: info(q(".ms-themes__card:nth-child(1) .ms-themes__btn")), themeParentOpacity: getComputedStyle(q(".ms-themes__card:nth-child(1)")).opacity };
});
console.log(JSON.stringify(r, null, 1));
await br.close();
