// QA-01 re-test: contrast computed from computed styles (not axe) for the 7 theme "Ver pedido" buttons and the "Pedir la cuenta" tile (p + note).
import { launch, BASE, check } from "./lib.mjs";
const br = await launch({ headless: true });
const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "load" });
await page.evaluate(async () => { for (let y = 0; y <= document.documentElement.scrollHeight; y += 250) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } });
await page.waitForTimeout(800);
const data = await page.evaluate(() => {
  const parse = (c) => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) });
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const effBg = (el) => { let e = el; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c.a > 0) { return blend(c, c.a < 1 ? effBg(e.parentElement) : { r: 255, g: 255, b: 255 }); } e = e.parentElement; } return { r: 255, g: 255, b: 255 }; };
  const one = (el, label) => { const cs = getComputedStyle(el); const bg = effBg(el); const fgc = parse(cs.color); const fg = blend(fgc, bg); return { label, text: el.textContent.trim().slice(0, 40), color: cs.color, bg: cs.backgroundColor, size: cs.fontSize, ratio: +ratio(fg, bg).toFixed(2) }; };
  const out = [];
  document.querySelectorAll(".ms-themes__card").forEach((c, i) => out.push(one(c.querySelector(".ms-themes__btn"), "theme-btn-" + (i + 1) + " " + c.querySelector(".ms-themes__name").textContent)));
  const tile = document.querySelector(".ms-tile--cuenta");
  tile.querySelectorAll("p, .ms-tile__note").forEach((p, i) => out.push(one(p, "tile-cuenta-" + i)));
  return out;
});
for (const d of data) check(`QA-01 contraste ${d.label} >= 4,5`, d.ratio >= 4.5, d);
check("QA-01 7 botones de tema medidos", data.filter((d) => d.label.startsWith("theme-btn")).length === 7, data.length);
await br.close();
