// Calidad de Cocina y Salón sobre el build de producción + mock: axe, scroll horizontal, animaciones con
// reduce, fuente del cuerpo, tamaños (CA-3.1, CA-3.2), columnas (CA-3.4, CA-8.5), teclado y foco; y capturas
// comparables con las maquetas en docs/design/cocina-salon/capturas/.
// Uso: TOOLS_DIR=... APP_URL=... MOCK_URL=... node docs/design/cocina-salon/evidencia/quality-staff.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch, login, check, note, summary, APP, resetMock, mockEvent, AxeBuilder, tokenFor, rest, waitFor } from "./lib-staff.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.resolve(HERE, "../capturas");
fs.mkdirSync(SHOTS, { recursive: true });

const ALL = [
  [1440, 900],
  [1280, 800],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [360, 640],
];
const TWO = [
  [1280, 800],
  [390, 844],
];

// ---------- Escenarios (datos del mock) ----------
async function seedRich() {
  await resetMock();
  const tok = await tokenFor("admin@demo.test");
  const rid = (await rest(tok, "GET", "staff_users?select=restaurant_id")).body[0].restaurant_id;
  const extra = ["Mesa 4", "Mesa 5", "Mesa 6", "Mesa 7", "Mesa 8", "Mesa 9", "Mesa 10", "Terraza, mesa larga del fondo"];
  for (const [i, label] of extra.entries()) await rest(tok, "POST", "tables", { restaurant_id: rid, label, qr_token: `extra-${i}-qa000${i}` });
  const groups = (await rest(tok, "GET", "item_option_groups?select=menu_items(name),item_option_choices(id,name)")).body;
  // Id de la opción de ESE plato (hay opciones con el mismo nombre en varios platos).
  const ch = (item, n) => groups.filter((g) => g.menu_items?.name === item).flatMap((g) => g.item_option_choices).find((c) => c.name === n).id;
  await mockEvent({ type: "new_order", table: "Mesa 4", items: [{ name: "Bife de chorizo", quantity: 1, choice_ids: [ch("Bife de chorizo", "Puré de papas"), ch("Bife de chorizo", "Jugoso")] }, { name: "Ensalada César", quantity: 1, note: "Sin crutones, es celíaca" }] });
  await mockEvent({ type: "order_status", table: "Mesa 4", status: "in_kitchen" });
  await mockEvent({ type: "new_order", table: "Terraza, mesa larga del fondo", items: [{ name: "Empanadas (x3)", quantity: 12, choice_ids: [ch("Empanadas (x3)", "Salsa criolla"), ch("Empanadas (x3)", "Ajíes en vinagre")] }, { name: "Gaseosa línea Coca-Cola 500ml", quantity: 4 }] });
  await mockEvent({ type: "new_order", table: "Mesa 6", items: [{ name: "Milanesa napolitana", quantity: 1, choice_ids: [ch("Milanesa napolitana", "Ensalada mixta")] }] });
  await mockEvent({ type: "order_status", table: "Mesa 6", status: "ready" });
  await mockEvent({ type: "waiter_call", table: "Mesa 9", reason: "consulta" });
  await mockEvent({ type: "waiter_call", table: "Mesa 5", reason: "otro" });
  return { tok, rid };
}
async function seedQuiet() {
  await resetMock();
  await mockEvent({ type: "attend_call", table: "Mesa 2" });
  await mockEvent({ type: "order_status", table: "Mesa 3", status: "delivered" });
}
async function seedNoTables() {
  await resetMock();
  const tok = await tokenFor("admin@demo.test");
  const rid = (await rest(tok, "GET", "staff_users?select=restaurant_id")).body[0].restaurant_id;
  await rest(tok, "DELETE", `tables?restaurant_id=eq.${rid}`);
}

// ---------- Mediciones en la página ----------
const MEASURE = () => {
  const px = (el) => parseFloat(getComputedStyle(el).fontSize);
  const all = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length);
  const min = (arr) => (arr.length ? Math.min(...arr) : null);
  let minText = Infinity;
  let minWhat = "";
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const t = w.currentNode;
    const el = t.parentElement;
    if (!t.textContent.trim() || !el.closest(".st-root, .st-menu") || el.closest(".sr-only, .adm-skip, [data-sonner-toaster]")) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") continue;
    if (px(el) < minText) {
      minText = px(el);
      minWhat = t.textContent.trim().slice(0, 30);
    }
  }
  const acts = all(".st-act").map((b) => {
    const card = b.closest(".st-order, .st-call");
    const cr = card.getBoundingClientRect();
    const r = b.getBoundingClientRect();
    return { h: r.height, fullWidth: card.classList.contains("st-order") ? r.width >= cr.width - 2 * 16 - 6 : true };
  });
  // Controles táctiles (botones y enlaces visibles) >= 44x44, sin contar el enlace de saltar.
  const controls = all(".st-root button, .st-root a, .st-menu [role=menuitem]").filter((e) => !e.classList.contains("adm-skip"));
  const small = controls.map((e) => e.getBoundingClientRect()).filter((r) => r.width < 44 || r.height < 44).length;
  // Separación vertical entre botones de acción de tarjetas distintas en la misma columna.
  const ab = all(".st-act").map((b) => b.getBoundingClientRect());
  let minGap = null;
  for (const a of ab) for (const b of ab) if (a !== b && Math.abs(a.left - b.left) < 2 && b.top > a.bottom) minGap = minGap === null ? b.top - a.bottom : Math.min(minGap, b.top - a.bottom);
  const cols = (sel) => {
    const g = document.querySelector(sel);
    return g && g.getClientRects().length ? getComputedStyle(g).gridTemplateColumns.split(" ").length : null;
  };
  const clipped = all(".st-table__name, .st-table__state, .st-order__table, .st-item__line").filter((e) => e.scrollWidth > e.clientWidth + 1).length;
  return {
    sw: document.documentElement.scrollWidth,
    bodyFont: getComputedStyle(document.body).fontFamily.split(",")[0],
    anim: document.getAnimations().length,
    minText,
    minWhat,
    table: min(all(".st-order__table, .st-call__table, .st-table__name").map(px)),
    line: min(all(".st-item__line").map(px)),
    small16: min(all(".st-item__opts, .st-item__note, .st-order__time, .st-order__bill, .st-call__why, .st-call__bill").map(px)),
    stateText: min(all(".st-table__state").map(px)),
    actH: min(acts.map((a) => a.h)),
    actFull: acts.every((a) => a.fullWidth),
    smallControls: small,
    minGap,
    orderCols: cols(".st-floor .st-orders") ?? cols(".st-orders"),
    tableCols: cols(".st-tables"),
    pageCols: document.querySelector(".st-floor") ? getComputedStyle(document.querySelector(".st-floor")).gridTemplateColumns.split(" ").length : null,
    clipped,
  };
};

const browser = await launch();
const axeLines = [];
async function visit({ name, email, route, sizes, seed, after, shots = sizes, menu = false }) {
  note(`== ${name} ==`);
  for (const [w, h] of sizes) {
    await seed();
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    // Sin recargar después del login: tras una recarga el tiempo real del mock no entrega eventos (hallazgo
    // preexistente, ver realtime-recarga-salida.txt).
    await login(page, email, route);
    await page.waitForSelector("h1");
    if (after) await after(page);
    if (menu) {
      await page.locator(".adm-account-btn").click();
      await page.waitForSelector(".st-menu");
    }
    await page.waitForTimeout(600);
    const m = await page.evaluate(MEASURE);
    const tag = `${name} ${w}x${h}`;
    check(`${tag}: sin scroll horizontal, cuerpo Geist, 0 animaciones con reduce`, m.sw <= w && m.bodyFont === "Geist" && m.anim === 0, `ancho ${m.sw}/${w}; fuente ${m.bodyFont}; animaciones ${m.anim}`);
    const sizeOk =
      m.minText >= 14 &&
      (m.table === null || m.table >= 24) &&
      (m.line === null || m.line >= (w >= 768 ? 20 : 18)) &&
      (m.small16 === null || m.small16 >= 16) &&
      (m.actH === null || m.actH >= 56) &&
      m.actFull &&
      m.smallControls === 0 &&
      (m.minGap === null || m.minGap >= 12) &&
      m.clipped === 0;
    check(
      `${tag}: tamaños CA-3.1/3.2`,
      sizeOk,
      `texto mín ${m.minText}px ("${m.minWhat}"); mesa ${m.table ?? "-"}; renglón ${m.line ?? "-"}; opciones/nota/hora/cuenta ${m.small16 ?? "-"}; estado de mesa ${m.stateText ?? "-"}; botón acción ${m.actH ?? "-"}px ancho completo ${m.actFull}; controles < 44 px: ${m.smallControls}; separación entre botones ${m.minGap ?? "-"}px; textos cortados ${m.clipped}`
    );
    note(`${tag}: columnas comandas ${m.orderCols ?? "-"}, mesas ${m.tableCols ?? "-"}, página ${m.pageCols ?? "-"}`);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const serious = axe.violations.filter((v) => ["critical", "serious"].includes(v.impact));
    check(`${tag}: axe 0 críticos/serios`, serious.length === 0, `${axe.violations.length} violaciones (${axe.violations.map((v) => `${v.impact}:${v.id}`).join(", ") || "ninguna"}); ${axe.passes.length} reglas pasan; ${axe.incomplete.length} a revisar`);
    axeLines.push(`${tag}: ${axe.violations.length} violaciones; ${axe.passes.length} pasan; ${axe.incomplete.length} a revisar a mano`);
    for (const v of axe.violations) axeLines.push(`  - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    for (const v of axe.incomplete) axeLines.push(`  ? ${v.id}: ${v.nodes.length} nodos (${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")})`);
    if (shots.some(([sw, sh]) => sw === w && sh === h)) await page.screenshot({ path: path.join(SHOTS, `${name}-${w}x${h}.png`), fullPage: !menu });
    await ctx.close();
  }
}

const newOrder = async (page) => {
  await page.waitForTimeout(1500); // que la suscripción de tiempo real ya esté abierta
  await mockEvent({ type: "new_order", table: "Mesa 7", items: [{ name: "Provoleta", quantity: 2 }] });
  const ok = await waitFor(async () => (await page.locator(".st-new").count()) > 0);
  check("cocina: llegó el pedido nuevo con \"Nuevo\" antes de medir", ok.ok, `${ok.ms} ms`);
};

await visit({ name: "cocina", email: "cocina@demo.test", route: "/kitchen", sizes: ALL, seed: seedRich, after: newOrder });
await visit({ name: "cocina-vacia", email: "cocina@demo.test", route: "/kitchen", sizes: ALL, seed: seedNoTables, shots: TWO });
await visit({ name: "salon", email: "mozo@demo.test", route: "/floor", sizes: ALL, seed: seedRich });
await visit({ name: "salon-sin-acciones", email: "mozo@demo.test", route: "/floor", sizes: ALL, seed: seedQuiet, shots: TWO });
await visit({ name: "salon-sin-mesas", email: "mozo@demo.test", route: "/floor", sizes: ALL, seed: seedNoTables, shots: TWO });
await visit({ name: "menu-cuenta", email: "admin@demo.test", route: "/kitchen", sizes: [[390, 844], [360, 640]], seed: resetMock, menu: true });
await visit({ name: "admin-cocina", email: "admin@demo.test", route: "/kitchen", sizes: [[1024, 768], [768, 1024]], seed: resetMock });
await visit({ name: "sin-staff", email: "sinstaff@demo.test", route: "/kitchen", sizes: ALL, seed: resetMock, shots: TWO });
await visit({ name: "solo-admin", email: "mozo@demo.test", route: "/admin", sizes: TWO, seed: resetMock });

// ---------- Teclado y foco (1280x800, Cocina y Salón) ----------
note("== Teclado ==");
for (const [email, route] of [["cocina@demo.test", "/kitchen"], ["admin@demo.test", "/floor"]]) {
  await resetMock();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await login(page, email, route);
  await page.goto(`${APP}${route}`);
  await page.waitForSelector("h1");
  const seq = [];
  let outlinesOk = true;
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const f = await page.evaluate(() => {
      const a = document.activeElement;
      const cs = getComputedStyle(a);
      return { name: (a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 28), outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2, tag: a.tagName };
    });
    if (f.tag === "BODY") break;
    seq.push(f.name);
    if (!f.outline) outlinesOk = false;
  }
  check(`Teclado ${route}: salto al contenido primero, todo con foco visible (contorno >= 2 px)`, seq[0] === "Saltar al contenido" && outlinesOk, seq.join(" > "));
  await page.goto(`${APP}${route}`);
  await page.waitForSelector("h1");
  await page.waitForTimeout(800); // hidratado antes de usar el teclado
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  const focused = await page.evaluate(() => document.activeElement.id);
  check(`Teclado ${route}: "Saltar al contenido" lleva el foco a main#contenido`, focused === "contenido", focused);
  await ctx.close();
}

await browser.close();
await resetMock();
const stamp = `Generado ${new Date().toISOString()} con Chrome (Playwright channel "chrome"), build de producción en ${APP}, reducedMotion "reduce".\n`;
fs.writeFileSync(path.join(HERE, "axe-staff-salida.txt"), stamp + axeLines.join("\n") + "\n");
process.exitCode = summary() ? 1 : 0;
