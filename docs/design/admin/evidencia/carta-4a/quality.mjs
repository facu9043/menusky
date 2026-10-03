// Calidad de la parte 4a: scroll horizontal (CA-13.6), movimiento reducido
// (CA-12.4), foco visible (CA-5.8) y axe (CA-13.10).
// Uso: TOOLS_DIR=... node quality.mjs
import { launch, login, APP, MOCK, AxeBuilder, resetMock, check, note, summary } from "./lib.mjs";

const H = { apikey: "mock-anon-key" };
const LONG = "Milanesa a la napolitana con papas fritas, huevo frito y ensalada mixta de la casa"; // 83
const LONG80 = LONG.slice(0, 80);

async function menuItems() {
  const r = await fetch(`${MOCK}/rest/v1/menu_items?select=id,name,price`, { headers: H });
  return r.json();
}

await resetMock();
const browser = await launch();

// ---------- Preparación: un plato con nombre de 80 caracteres y precio de 7 cifras ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await login(p, "admin@demo.test", "/admin/menu");
  await p.locator(".adm-dish", { hasText: "Milanesa napolitana" }).locator(".adm-dish__open").click();
  const sheet = p.getByRole("dialog");
  await sheet.getByLabel("Nombre", { exact: true }).fill(LONG80);
  await sheet.getByLabel("Precio").fill("1234567");
  await sheet.getByRole("button", { name: "Guardar cambios" }).click();
  await sheet.waitFor({ state: "hidden" });
  const ok = (await menuItems()).some((i) => i.name === LONG80 && i.price === 1234567);
  check("preparación: plato de 80 caracteres y $1.234.567", ok);
  await ctx.close();
}

// ---------- Scroll horizontal (CA-13.6) ----------
const overflow = (p) =>
  p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
for (const w of [320, 360, 390, 768, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 768 ? 700 : 900 } });
  const p = await ctx.newPage();
  await login(p, "admin@demo.test", "/admin/menu");
  await p.waitForSelector(".adm-dish");
  const states = [];
  const probe = async (label) => {
    const o = await overflow(p);
    states.push(`${label}:${o.sw}/${o.iw}`);
    return o.sw <= o.iw;
  };
  let all = true;
  all = (await probe("carta")) && all;
  await p.locator(".adm-dish").first().locator(".adm-dish__open").click();
  await p.getByRole("dialog").waitFor();
  await p.waitForTimeout(80); // en plena animación de entrada
  all = (await probe("hoja-animando")) && all;
  await p.waitForTimeout(400);
  all = (await probe("hoja")) && all;
  await p.getByRole("dialog").getByRole("button", { name: "Eliminar plato" }).click();
  await p.getByRole("alertdialog").waitFor();
  all = (await probe("confirmación")) && all;
  await p.keyboard.press("Escape");
  await p.keyboard.press("Escape");
  await p.getByRole("dialog").waitFor({ state: "hidden" });
  await p.getByRole("button", { name: "Nueva Categoría" }).click();
  await p.getByRole("dialog").waitFor();
  all = (await probe("nueva-categoría")) && all;
  await p.keyboard.press("Escape");
  for (const route of ["/admin", "/admin/mesas", "/admin/apariencia"]) {
    await p.goto(`${APP}${route}`);
    await p.locator("h1").first().waitFor();
    all = (await probe(route)) && all;
  }
  check(`CA-13.6 sin scroll horizontal a ${w}px`, all, states.join(" "));
  await ctx.close();
}

// ---------- Movimiento reducido (CA-12.4) ----------
async function motionRun(reduce) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: reduce ? "reduce" : "no-preference",
  });
  const p = await ctx.newPage();
  await login(p, "admin@demo.test", "/admin/menu");
  await p.waitForSelector(".adm-dish");
  const counts = {};
  const count = async (label, settle = 60) => {
    await p.waitForTimeout(settle);
    counts[label] = await p.evaluate(() => document.getAnimations().length);
  };
  await count("reposo", 600);
  await p.locator(".adm-dish").first().locator(".adm-dish__open").click();
  await count("abrir hoja", 30);
  await p.waitForTimeout(500);
  await p.keyboard.press("Escape");
  await count("cerrar hoja", 30);
  await p.waitForTimeout(500);
  await p.getByRole("switch").nth(1).click();
  await count("interruptor", 30);
  await p.waitForTimeout(800);
  await p.getByRole("switch").nth(1).click();
  await p.waitForTimeout(800);
  await p.getByRole("button", { name: /^Bebidas, / }).click();
  await count("píldora", 30);
  await p.getByRole("searchbox").fill("zzz");
  await count("vacío con Pomo", 30);
  await p.getByRole("searchbox").fill("");
  await p.locator(".adm-tabbar a[href='/admin/mesas']").click();
  await p.waitForURL("**/admin/mesas");
  await count("cambiar de sección", 30);
  await ctx.close();
  return counts;
}
const reduced = await motionRun(true);
check("CA-12.4 con reduce: getAnimations() = 0 en reposo y tras cada acción", Object.values(reduced).every((n) => n === 0), JSON.stringify(reduced));
const normal = await motionRun(false);
note(`sin reduce (control: el movimiento existe): ${JSON.stringify(normal)}`);
check("HU-12 sin reduce hay animación al abrir la hoja e interruptor", normal["abrir hoja"] > 0 && normal["interruptor"] > 0);

// ---------- Foco visible (CA-5.8) ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await login(p, "admin@demo.test", "/admin/menu");
  await p.waitForSelector(".adm-dish");
  const rings = [];
  for (let i = 0; i < 14; i++) {
    await p.keyboard.press("Tab");
    rings.push(
      await p.evaluate(() => {
        const el = document.activeElement;
        const cs = getComputedStyle(el);
        return {
          el: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 24),
          w: parseFloat(cs.outlineWidth),
          style: cs.outlineStyle,
          color: cs.outlineColor,
        };
      })
    );
  }
  const bad = rings.filter((r) => r.style === "none" || r.w < 2);
  check("CA-5.8 foco visible >= 2 px en los primeros 14 Tab", bad.length === 0, rings.map((r) => `${r.el}=${r.w}px ${r.color}`).join(" | "));
  const first = rings[0];
  check("CA-5.8 primer Tab = 'Saltar al contenido'", first.el === "Saltar al contenido", first.el);
  await ctx.close();
}

// ---------- axe (CA-13.10) ----------
const axeRuns = [];
async function axe(p, label, include) {
  let builder = new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]);
  if (include) builder = builder.include(include);
  const r = await builder.analyze();
  const serious = r.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  axeRuns.push({ label, violations: r.violations.map((v) => `${v.id}(${v.impact}) x${v.nodes.length}`) });
  check(`CA-13.10 axe ${label}: 0 críticos/serios`, serious.length === 0, r.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`).join(", ") || "sin violaciones");
  for (const v of serious) for (const n of v.nodes.slice(0, 3)) note(`${v.id} -> ${n.target.join(" ")} | ${n.failureSummary?.split("\n")[1] ?? ""}`);
}
for (const [w, h] of [
  [1440, 900],
  [360, 640],
]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await login(p, "admin@demo.test", "/admin/menu");
  await p.waitForSelector(".adm-dish");
  await axe(p, `carta ${w}`);
  await p.locator(".adm-dish", { hasText: "Bife de chorizo" }).locator(".adm-dish__open").click();
  await p.getByRole("dialog").waitFor();
  await p.waitForTimeout(300);
  await axe(p, `hoja abierta ${w}`);
  await p.getByRole("dialog").getByRole("button", { name: "Eliminar plato" }).click();
  await p.getByRole("alertdialog").waitFor();
  await p.waitForTimeout(300);
  await axe(p, `confirmación ${w}`);
  await p.keyboard.press("Escape");
  await p.keyboard.press("Escape");
  await p.getByRole("searchbox").fill("zzz");
  await axe(p, `vacío ${w}`);
  await p.goto(`${APP}/admin`);
  await p.locator("h1").waitFor();
  await axe(p, `inicio provisorio ${w}`);
  await ctx.close();
}

await browser.close();
await resetMock();
process.exitCode = summary() ? 1 : 0;
