// Capturas y chequeos de las maquetas de Cocina y Salón (SOLO propuesta).
// Abre cada HTML por file:// (sin servidor) con Chrome de Playwright y guarda:
//   capturas/<maqueta>-<ancho>x<alto>.png (página completa)
//   capturas-salida.txt (scroll horizontal, fuentes, texto más chico, alto de botones, animaciones)
//   axe-salida.txt (axe-core, WCAG 2 A/AA + 2.1/2.2 AA)
// Uso: TOOLS_DIR=<carpeta con node_modules/playwright y @axe-core/playwright> node docs/design/cocina-salon/maquetas/capturar.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOLS = process.env.TOOLS_DIR;
if (!TOOLS) throw new Error("Falta TOOLS_DIR");
const req = createRequire(path.join(TOOLS, "package.json"));
const { chromium } = req("playwright");
const AxeBuilder = req("@axe-core/playwright").default;

const ALL = [
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [390, 844],
];
const PAGES = [
  ["cocina", ALL],
  ["cocina-vacia", ALL],
  ["salon", ALL],
  ["salon-vacio", ALL],
  ["shell", ALL],
  ["cocina-oscuro", ALL.slice(0, 3)], // pregunta 1: solo tablet
];

const out = [];
const axeOut = [];
const log = (s) => {
  out.push(s);
  console.log(s);
};
fs.mkdirSync(path.join(HERE, "capturas"), { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
for (const [name, sizes] of PAGES) {
  const url = pathToFileURL(path.join(HERE, `${name}.html`)).href;
  for (const [w, h] of sizes) {
    // 1) Con movimiento permitido: cuántas animaciones arranca la página.
    const ctxM = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "no-preference" });
    const pm = await ctxM.newPage();
    await pm.goto(url);
    const animOn = await pm.evaluate(() => document.getAnimations().length);
    await ctxM.close();

    // 2) Con reduce: captura estable y chequeos.
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce", deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const fonts = [...new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")))];
      const bodyFont = getComputedStyle(document.querySelector(".st-root")).fontFamily;
      // Texto visible más chico (sin contar rótulos de la maqueta ni sr-only).
      let min = Infinity;
      let minWhat = "";
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const t = walker.currentNode;
        const el = t.parentElement;
        if (!t.textContent.trim() || el.closest(".mq-cap, .sr-only, .adm-skip, .st-logout__text, .adm-account-btn")) continue;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height || getComputedStyle(el).visibility === "hidden") continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < min) {
          min = fs;
          minWhat = t.textContent.trim().slice(0, 30);
        }
      }
      const acts = [...document.querySelectorAll(".st-act")].map((b) => b.getBoundingClientRect().height);
      const tableNames = [...document.querySelectorAll(".st-order__table, .st-call__table, .st-table__name")].map((e) => parseFloat(getComputedStyle(e).fontSize));
      const lines = [...document.querySelectorAll(".st-item__line")].map((e) => parseFloat(getComputedStyle(e).fontSize));
      const cols = (sel) => {
        const g = document.querySelector(sel);
        return g ? getComputedStyle(g).gridTemplateColumns.split(" ").length : 0;
      };
      return {
        sw,
        fonts,
        bodyFont,
        min,
        minWhat,
        actMin: acts.length ? Math.min(...acts) : null,
        tableMin: tableNames.length ? Math.min(...tableNames) : null,
        lineMin: lines.length ? Math.min(...lines) : null,
        orderCols: cols(".st-orders"),
        tableCols: cols(".st-tables"),
        animReduce: document.getAnimations().length,
      };
    });
    const file = `capturas/${name}-${w}x${h}.png`;
    await page.screenshot({ path: path.join(HERE, file), fullPage: true });
    log(
      `${name} ${w}x${h}: scroll horizontal ${r.sw > w ? "SÍ" : "no"} (${r.sw}/${w}); fuentes cargadas: ${r.fonts.join(", ")}; cuerpo: ${r.bodyFont.split(",")[0]}; ` +
        `texto más chico ${r.min}px ("${r.minWhat}"); mesa min ${r.tableMin ?? "-"}px; renglón min ${r.lineMin ?? "-"}px; botón de acción min ${r.actMin ?? "-"}px; ` +
        `columnas pedidos ${r.orderCols || "-"}, mesas ${r.tableCols || "-"}; animaciones: ${animOn} con movimiento, ${r.animReduce} con reduce -> ${file}`
    );

    if (w === 1024 || w === 390) {
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const v = res.violations;
      axeOut.push(`${name} ${w}x${h}: ${v.length} violaciones; ${res.passes.length} reglas pasan; ${res.incomplete.length} a revisar a mano`);
      for (const x of v) axeOut.push(`  - [${x.impact}] ${x.id}: ${x.help} (${x.nodes.length} nodos) ${x.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      for (const x of res.incomplete) axeOut.push(`  ? ${x.id}: ${x.nodes.length} nodos (${x.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")})`);
    }
    await ctx.close();
  }
}
await browser.close();
const stamp = `Generado ${new Date().toISOString()} con Chrome (Playwright, channel "chrome"), file://, deviceScaleFactor 1.\n`;
fs.writeFileSync(path.join(HERE, "capturas-salida.txt"), stamp + out.join("\n") + "\n");
fs.writeFileSync(path.join(HERE, "axe-salida.txt"), stamp + axeOut.join("\n") + "\n");
