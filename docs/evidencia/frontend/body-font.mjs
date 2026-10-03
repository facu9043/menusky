// Medición de la fuente del body (D-19). No es parte de la app.
// Uso: TOOLS_DIR=<carpeta con playwright> APP_URL=http://127.0.0.1:3420 MOCK_URL=http://127.0.0.1:3421 \
//      node docs/evidencia/frontend/body-font.mjs <antes|despues>
// Por cada pantalla informa getComputedStyle().fontFamily del body y de textos de cuerpo
// representativos, y la fuente realmente usada al pintar (CDP CSS.getPlatformFontsForNode).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch, login, APP, resetMock } from "../../design/admin/evidencia/carta-4a/lib.mjs";

const tag = process.argv[2] ?? "medicion";
const OUT = path.dirname(fileURLToPath(import.meta.url));
const SCREENS = [
  { name: "/ (landing)", path: "/" },
  { name: "/login", path: "/login" },
  { name: "/admin/menu", path: "/admin/menu", user: "admin@demo.test" },
  { name: "/kitchen", path: "/kitchen", user: "cocina@demo.test", shot: "kitchen" },
  { name: "/floor", path: "/floor", user: "mozo@demo.test", shot: "floor" },
  { name: "/m/mesa-1-demo0001 (carta cliente)", path: "/m/mesa-1-demo0001" },
];

await resetMock();
const browser = await launch();
for (const s of SCREENS) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  if (s.user) await login(page, s.user, s.path);
  await page.goto(`${APP}${s.path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  // Marca hasta 4 elementos de texto visibles: el primer p, li, button y span/div con texto directo.
  const { out: samples, totals } = await page.evaluate(() => {
    const out = [{ label: "body", sel: "body", ff: getComputedStyle(document.body).fontFamily }];
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2);
    let i = 0;
    for (const q of ["main p, p", "main li, li", "main button, button", "main span, main div, span, div"]) {
      const el = [...document.querySelectorAll(q)].find((e) => visible(e) && hasOwnText(e) && !e.closest("[data-sonner-toaster]"));
      if (!el) continue;
      el.setAttribute("data-font-probe", String(i));
      const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim().slice(0, 40);
      out.push({ label: `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : ""} "${text}"`, sel: `[data-font-probe="${i}"]`, ff: getComputedStyle(el).fontFamily });
      i++;
    }
    // Conteo global: elementos visibles con texto propio cuya fuente computada empieza por "Times New Roman".
    const all = [...document.querySelectorAll("body *")].filter((e) => visible(e) && hasOwnText(e));
    const times = all.filter((e) => getComputedStyle(e).fontFamily.startsWith('"Times New Roman"'));
    const totals = { all: all.length, times: times.length, examples: times.slice(0, 3).map((e) => e.tagName.toLowerCase() + ' "' + e.textContent.trim().slice(0, 25) + '"') };
    return { out, totals };
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  console.log(`\n== ${s.name}  (URL final: ${new URL(page.url()).pathname})`);
  const t = totals;
  console.log(`  elementos visibles con texto propio: ${t.all}; con fuente computada Times New Roman: ${t.times}${t.examples.length ? " (p. ej. " + t.examples.join(", ") + ")" : ""}`);
  for (const smp of samples) {
    let used = "-";
    try {
      const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: smp.sel });
      // Para body se mide el primer nodo de texto que hereda directamente (si no hay, queda "-").
      const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
      used = fonts.length ? fonts.map((f) => `${f.familyName}${f.isCustomFont ? " (web)" : ""} x${f.glyphCount}`).join(", ") : "- (sin texto propio)";
    } catch (e) {
      used = `error: ${e.message}`;
    }
    console.log(`  ${smp.label}\n      computed: ${smp.ff}\n      pintada:  ${used}`);
  }
  if (s.shot) await page.screenshot({ path: path.join(OUT, `body-font-${s.shot}-${tag}.png`) });
  await ctx.close();
}
await browser.close();
