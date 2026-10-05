// Calidad del paso 4b: sin scroll horizontal (320-1440), teclado y foco visible,
// prefers-reduced-motion y axe (WCAG 2.2 AA) en Inicio, Apariencia y cada estado, a 1440 y 360.
// Uso: TOOLS_DIR=... APP_URL=... MOCK_URL=<proxy> node quality-4b.mjs
import { launch, login, APP, AxeBuilder, resetMock, check, note, summary } from "../carta-4a/lib.mjs";
import { fault, NO_FAULTS, emptyRestaurantB, wait, noHScroll } from "./lib4b.mjs";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
await resetMock();
await fault(NO_FAULTS);
const browser = await launch();
let axePasses = 0;

async function session(w, h, email = "admin@demo.test", start = "/admin", reduced = "no-preference") {
  const mobile = w < 768;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, reducedMotion: reduced });
  const page = await ctx.newPage();
  await login(page, email, start);
  return { ctx, page };
}
async function axe(p, label) {
  const r = await new AxeBuilder({ page: p }).withTags(TAGS).analyze();
  axePasses++;
  const v = r.violations.map((x) => `${x.id}(${x.impact}) x${x.nodes.length}: ${x.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" ; ")}`);
  check(`axe ${label}: 0 violaciones`, r.violations.length === 0, v.join(" | ") || `${r.passes.length} reglas pasan`);
}
async function softNav(p, href) {
  await p.locator(`a[href='${href}']:visible`).last().click();
}

// Estados que se recorren (cada uno: cómo llegar y qué esperar)
const STATES = [
  ["Inicio", async (p) => { await p.goto(`${APP}/admin`); await p.waitForSelector(".adm-kpis"); }],
  ["Inicio con error parcial", async (p) => { await fault({ categories: true }); await p.goto(`${APP}/admin`); await p.waitForSelector(".adm-kpi__err"); await fault(NO_FAULTS); }],
  ["Inicio sin poder leer nada", async (p) => { await fault({ categories: true, calls: true }); await p.goto(`${APP}/admin`); await p.getByText("No pudimos cargar el resumen").waitFor(); await fault(NO_FAULTS); }],
  ["Apariencia", async (p) => { await p.goto(`${APP}/admin/apariencia`); await p.waitForSelector(".adm-presets"); }],
  ["Apariencia con hex inválido y aviso de contraste", async (p) => {
    await p.goto(`${APP}/admin/apariencia`); await p.waitForSelector(".adm-presets");
    await p.getByLabel("Texto secundario", { exact: true }).fill("#C9B8AE");
    const acc = p.getByLabel("Acento secundario (navegación, tabs)", { exact: true });
    await acc.fill("#FFC2"); await acc.blur(); await p.locator(".adm-look__warn").waitFor();
  }],
  ["Apariencia error del tema", async (p) => { await fault({ theme: true }); await p.goto(`${APP}/admin/apariencia`); await p.getByText("No pudimos cargar el tema").waitFor(); await fault(NO_FAULTS); }],
  ["Carta error", async (p) => { await fault({ categories: true }); await p.goto(`${APP}/admin/menu`); await p.getByText("No pudimos cargar la carta").waitFor(); await fault(NO_FAULTS); }],
  ["Mesas error", async (p) => { await fault({ tables: true }); await p.goto(`${APP}/admin/mesas`); await p.getByText("No pudimos cargar las mesas").waitFor(); await fault(NO_FAULTS); }],
  ["Carta búsqueda sin resultados", async (p) => { await p.goto(`${APP}/admin/menu`); await p.waitForSelector(".adm-dish"); await p.getByRole("searchbox").first().fill("sushi"); await p.getByText('No encontramos platos con "sushi".').waitFor(); }],
  ["Mesas filtro sin resultados", async (p) => { await p.goto(`${APP}/admin/mesas?filtro=libres`); await p.getByText("No hay mesas libres ahora.").waitFor(); }],
];
const LOADING = [
  ["Inicio cargando", "/admin/menu", "/admin"],
  ["Apariencia cargando", "/admin", "/admin/apariencia"],
  ["Carta cargando", "/admin", "/admin/menu"],
  ["Mesas cargando", "/admin", "/admin/mesas"],
];

for (const [w, h] of [[1440, 900], [360, 640]]) {
  await resetMock();
  const { ctx, page: p } = await session(w, h);
  for (const [name, go] of STATES) {
    await go(p);
    await wait(400);
    await axe(p, `${name} ${w}`);
  }
  for (const [name, from, to] of LOADING) {
    await p.goto(`${APP}${from}`);
    await p.waitForSelector(".adm-page");
    await wait(1500);
    await fault({ delay: 5000 });
    await softNav(p, to);
    await p.waitForSelector(".adm-page[aria-busy='true']", { timeout: 4000 });
    await axe(p, `${name} ${w}`);
    await fault({ delay: 0 });
    await p.waitForSelector(".adm-page:not([aria-busy])", { timeout: 15000 });
  }
  await ctx.close();

  // Vacíos con el restaurante B vaciado solo para la prueba
  await resetMock();
  await emptyRestaurantB({ menu: false, tables: ["Mesa 1"] });
  let s = await session(w, h, "admin-b@demo.test");
  await s.page.waitForSelector(".adm-empty");
  await axe(s.page, `Inicio sin pedidos ${w}`);
  await s.ctx.close();
  await resetMock();
  await emptyRestaurantB({ menu: true });
  s = await session(w, h, "admin-b@demo.test", "/admin/menu");
  await s.page.getByText("Tu carta está vacía").waitFor();
  await axe(s.page, `Carta vacía ${w}`);
  await s.page.goto(`${APP}/admin/mesas`);
  await s.page.getByText("Todavía no hay mesas.").waitFor();
  await axe(s.page, `Mesas vacía ${w}`);
  await s.ctx.close();
}

// ---------- Sin scroll horizontal (CA-13.6)
await resetMock();
for (const w of [320, 360, 390, 768, 1440]) {
  const { ctx, page: p } = await session(w, 800);
  const bad = [];
  for (const [name, go] of STATES) {
    await go(p);
    await wait(200);
    if (!(await noHScroll(p))) bad.push(name);
  }
  check(`Sin scroll horizontal a ${w}px en ${STATES.length} pantallas/estados`, bad.length === 0, bad.join(", "));
  await ctx.close();
}

// ---------- Teclado y foco visible
{
  await resetMock();
  const { ctx, page: p } = await session(1440, 900);
  await p.waitForSelector(".adm-kpis");
  await p.locator("h1").click(); // punto de partida dentro del contenido
  const seen = [];
  for (let i = 0; i < 12; i++) {
    await p.keyboard.press("Tab");
    seen.push(await p.evaluate(() => {
      const a = document.activeElement;
      const cs = getComputedStyle(a);
      return { t: (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28), w: parseFloat(cs.outlineWidth), s: cs.outlineStyle };
    }));
  }
  const order = seen.map((x) => x.t);
  note(`orden de Tab desde el h1: ${order.join(" > ")}`);
  const want = ["Mesas ocupadas", "Llamados pendientes", "Platos sin stock", "Nuevo plato", "Nueva mesa", "Imprimir todos los QR", "Ir al Salón"];
  let idx = 0;
  for (const t of order) if (idx < want.length && t.startsWith(want[idx])) idx++;
  check("Teclado Inicio: Tab recorre los 3 datos enlace y los 4 accesos en orden visual", idx === want.length);
  check("Foco visible >= 2 px en los enlaces de Inicio", seen.filter((x) => want.some((t) => x.t.startsWith(t))).every((x) => x.w >= 2 && x.s !== "none"));
  await p.getByRole("link", { name: "Nueva mesa" }).focus();
  await p.keyboard.press("Enter");
  await p.getByRole("dialog", { name: "Nueva mesa" }).waitFor({ timeout: 10000 });
  check("Teclado: Enter en 'Nueva mesa' abre el alta", true);
  await p.keyboard.press("Escape");

  await p.goto(`${APP}/admin/apariencia`);
  await p.waitForSelector(".adm-presets");
  const picker = p.getByLabel("Fondo: selector de color");
  await picker.focus();
  const ring = await p.locator(".adm-swatch").first().evaluate((e) => {
    const cs = getComputedStyle(e);
    return { w: parseFloat(cs.outlineWidth), s: cs.outlineStyle };
  });
  check("Teclado Apariencia: el selector de color se alcanza y su muestra muestra el foco (>= 2 px)", ring.w >= 2 && ring.s !== "none", JSON.stringify(ring));
  await p.keyboard.press("Tab");
  check("Tab del selector va a su campo hex", (await p.evaluate(() => document.activeElement.id)) === (await p.getByLabel("Fondo", { exact: true }).getAttribute("id")));
  const tema = p.getByRole("button", { name: "Usar este tema" }).first();
  await tema.focus();
  const tf = await tema.evaluate((e) => parseFloat(getComputedStyle(e).outlineWidth));
  check("Foco visible en 'Usar este tema'", tf >= 2, `${tf}px`);
  await ctx.close();
}

// ---------- prefers-reduced-motion
{
  await resetMock();
  await emptyRestaurantB({ menu: false, tables: ["Mesa 1"] });
  for (const mode of ["reduce", "no-preference"]) {
    const { ctx, page: p } = await session(1440, 900, "admin-b@demo.test", "/admin", mode);
    await p.waitForSelector(".adm-empty");
    const r = await p.evaluate(() => ({
      tile: getComputedStyle(document.querySelector(".adm-tile")).transitionDuration,
      kpi: getComputedStyle(document.querySelector("a.adm-kpi")).transitionDuration,
      pomo: getComputedStyle(document.querySelector(".adm-empty .adm-pomo")).animationName,
    }));
    if (mode === "reduce") check("reduced-motion: accesos y datos sin transición, Pomo sin entrada", r.tile === "0s" && r.kpi === "0s" && r.pomo === "none", JSON.stringify(r));
    else check("Sin reduced-motion: hundido de accesos (transform) y entrada de Pomo activos", r.tile !== "0s" && r.pomo !== "none", JSON.stringify(r));
    await ctx.close();
  }
}

await fault(NO_FAULTS);
await resetMock();
await browser.close();
note(`pasadas de axe: ${axePasses}`);
process.exitCode = summary() ? 1 : 0;
