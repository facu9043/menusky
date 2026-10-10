// Prueba de punta a punta de Mesas (HU-8) contra el Supabase simulado.
// Uso: TOOLS_DIR=<carpeta con playwright> APP_URL=... MOCK_URL=... node mesas-e2e.mjs
// Requiere el mock detrás de fault-proxy y la app compilada con esas variables (ver README.md).
import { launch, login, APP, MOCK, resetMock, mockEvent, mockState, check, note, summary } from "../carta-4a/lib.mjs";

const H = { apikey: "mock-anon-key", "content-type": "application/json" };
const A = "11111111-1111-4111-8111-111111111111";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return Date.now() - t0;
    await wait(100);
  }
  return false;
}
async function fault(body) {
  await fetch(`${MOCK}/__fault`, { method: "POST", body: JSON.stringify(body) });
}
async function token(email) {
  const r = await fetch(`${MOCK}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ email, password: "demo-1234" }),
  });
  return (await r.json()).access_token;
}
async function insertTable(tok, restaurant, label, qr) {
  const r = await fetch(`${MOCK}/rest/v1/tables`, {
    method: "POST",
    headers: { ...H, Authorization: `Bearer ${tok}` },
    body: JSON.stringify({ restaurant_id: restaurant, label, qr_token: qr }),
  });
  if (!r.ok) throw new Error(`insert table ${r.status}`);
}
const tablesOf = async (restaurant = A) => (await mockState()).tables.filter((t) => t.restaurant_id === restaurant);
const pillCount = async (p, key) => Number(await p.locator(`.adm-pill[data-filter='${key}'] .adm-pill__count`).innerText());
const counts = async (p) => ({
  all: await pillCount(p, "all"),
  free: await pillCount(p, "free"),
  occupied: await pillCount(p, "occupied"),
  calling: await pillCount(p, "calling"),
});
const card = (p, label) => p.locator(".adm-table", { has: p.locator(".adm-table__title", { hasText: new RegExp(`^${label}$`) }) });
const stateOf = (p, label) => card(p, label).getAttribute("data-state");
const focusIsBody = (p) => p.evaluate(() => document.activeElement === document.body || document.activeElement === null);

await resetMock();
await fault({ categories: false, menuItemsWrite: false, tables: false });
const browser = await launch();

// ======================================================================
// Escritorio 1440x900
// ======================================================================
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
await login(page, "admin@demo.test", "/admin/mesas");
await page.waitForSelector(".adm-table__card");

// ---- Encabezado y lista (CA-8.1, CA-NR.30) ----
check("CA-8.1 rótulo 'Mesas' y h1 'Tu salón, de un vistazo'",
  (await page.locator(".adm-eyebrow").innerText()).trim().toUpperCase() === "MESAS" &&
  (await page.locator("h1").innerText()) === "Tu salón, de un vistazo");
check("CA-8.1 botones 'Imprimir todos' y 'Nueva mesa'",
  (await page.getByRole("button", { name: "Imprimir todos" }).isVisible()) && (await page.getByRole("button", { name: "Nueva mesa" }).isVisible()));
const titles = await page.locator(".adm-table__title").allInnerTexts();
check("CA-NR.30 mesas ordenadas por nombre", JSON.stringify(titles) === JSON.stringify(["Mesa 1", "Mesa 2", "Mesa 3"]), JSON.stringify(titles));

// ---- Estados y conteos (CA-8.2, CA-8.3) ----
let c = await counts(page);
check("CA-8.2 conteos iniciales (Todas 3, Libres 0, Ocupadas 2, Llamando 1)", c.all === 3 && c.free === 0 && c.occupied === 2 && c.calling === 1, JSON.stringify(c));
check("CA-8.2 Libres + Ocupadas + Llamando = Todas", c.free + c.occupied + c.calling === c.all);
const m2 = await card(page, "Mesa 2").locator(".adm-state").innerText();
check("CA-8.3 llamado: 'Llama al mozo' + motivo 'Pide la cuenta' (prioridad sobre el pedido activo)",
  (await stateOf(page, "Mesa 2")) === "calling" && /Llama al mozo/.test(m2) && /Pide la cuenta/.test(m2), m2.replace(/\n/g, " / "));
const m1 = await card(page, "Mesa 1").locator(".adm-state").innerText();
check("CA-8.3 ocupada: 'Ocupada' + 'N pedido(s) · $total'", (await stateOf(page, "Mesa 1")) === "occupied" && /Ocupada/.test(m1) && /\d+ pedidos? · \$\s?[\d.]+/.test(m1), m1.replace(/\n/g, " / "));
check("CA-8.3 'Listo' del salón (Mesa 3, pedido ready) cuenta como Ocupada", (await stateOf(page, "Mesa 3")) === "occupied");
check("CA-8.3 estado con ícono además del color", (await card(page, "Mesa 2").locator(".adm-state__label svg").count()) === 1);

// ---- Filtro sin resultados (CA-8.2, CA-11.1) ----
await page.locator(".adm-pill[data-filter='free']").click();
check("CA-11.1 filtro vacío: 'No hay mesas libres ahora.' con Pomo y 'Ver todas'",
  (await page.locator(".adm-empty", { hasText: "No hay mesas libres ahora." }).count()) === 1 && (await page.locator(".adm-empty .adm-pomo").count()) === 1);
await page.getByRole("button", { name: "Ver todas" }).click();
check("CA-11.1 'Ver todas' vuelve a todas", (await page.locator(".adm-table").count()) === 3 && (await page.locator(".adm-pill[data-filter='all']").getAttribute("aria-pressed")) === "true");
await page.locator(".adm-pill[data-filter='calling']").click();
check("CA-8.2 filtro Llamando muestra solo las que llaman", JSON.stringify(await page.locator(".adm-table__title").allInnerTexts()) === '["Mesa 2"]');
await page.locator(".adm-pill[data-filter='all']").click();

// ---- Tarjeta (CA-8.7, CA-13.2) ----
const c1 = card(page, "Mesa 1");
check("CA-8.7 QR con alt 'QR de Mesa 1', diferido y con espacio reservado",
  (await c1.locator("img[alt='QR de Mesa 1']").getAttribute("loading")) === "lazy" &&
  (await c1.locator(".adm-table__body .adm-table__qr").evaluate((e) => getComputedStyle(e).height)) === "124px");
const ver = c1.getByRole("link", { name: "Ver carta de Mesa 1" });
check("CA-NR.33 'Ver carta' en pestaña nueva con noopener noreferrer",
  (await ver.getAttribute("target")) === "_blank" && (await ver.getAttribute("rel")) === "noopener noreferrer" && (await ver.getAttribute("href")) === "/m/mesa-1-demo0001");
{
  const before = page.url();
  const [popup] = await Promise.all([ctx.waitForEvent("page"), ver.click()]);
  await popup.waitForLoadState("domcontentloaded");
  check("CA-NR.33 abre /m/<qrToken> y el admin no se mueve", new URL(popup.url()).pathname === "/m/mesa-1-demo0001" && page.url() === before, popup.url());
  await popup.close();
}
{
  const [dl] = await Promise.all([page.waitForEvent("download"), c1.getByRole("link", { name: "Descargar QR de Mesa 1" }).click()]);
  const path = await dl.path();
  const { readFileSync } = await import("node:fs");
  const buf = readFileSync(path);
  check("CA-NR.32 descarga 'qr-mesa-1.png' (PNG)", dl.suggestedFilename() === "qr-mesa-1.png" && buf.subarray(1, 4).toString() === "PNG", dl.suggestedFilename());
  const r404 = await fetch(`${APP}/api/qr/no-existe-123`);
  check("CA-NR.32 token inexistente: 404 JSON", r404.status === 404 && (r404.headers.get("content-type") ?? "").includes("json"));
}

// ---- Nueva mesa (CA-8.10, CA-NR.31) ----
await page.getByRole("button", { name: "Nueva mesa" }).click();
const dlg = page.getByRole("dialog", { name: "Nueva mesa" });
await dlg.waitFor();
await dlg.getByLabel("Nombre de la mesa").fill("   ");
await dlg.getByRole("button", { name: "Crear mesa" }).click();
check("CA-8.10 nombre vacío no se crea", (await dlg.getByText("Escribí un nombre para la mesa.").count()) === 1 && (await tablesOf()).length === 3);
await dlg.getByLabel("Nombre de la mesa").fill("  Mesa 7  ");
await dlg.getByLabel("Nombre de la mesa").press("Enter");
await dlg.waitFor({ state: "hidden" });
const tCreate = await until(async () => (await page.locator(".adm-table__title", { hasText: /^Mesa 7$/ }).count()) === 1, 8000);
const m7 = (await tablesOf()).find((t) => t.label === "Mesa 7");
check("CA-NR.31 'Mesa 7' recortada, con qr_token propio 'mesa-7-xxxxxx'", !!m7 && /^mesa-7-[a-z0-9]+$/.test(m7.qr_token), m7?.qr_token);
check("CA-8.10 aparece sin recargar, como Libre y con su QR", tCreate !== false && (await stateOf(page, "Mesa 7")) === "free" && (await card(page, "Mesa 7").locator("img[alt='QR de Mesa 7']").count()) === 1, `${tCreate} ms`);
c = await counts(page);
check("CA-8.2 conteos tras crear (Todas 4, Libres 1)", c.all === 4 && c.free === 1, JSON.stringify(c));
const tops = await page.locator(".adm-table").evaluateAll((els) => els.slice(0, 4).map((e) => Math.round(e.getBoundingClientRect().top)));
check("CA-8.7 4 tarjetas por fila en 1440x900", new Set(tops).size === 1, JSON.stringify(tops));

// ---- En vivo (CA-8.4, CA-8.6) ----
const timed = async (label, fn, expect) => {
  await fn();
  const ms = await until(async () => (await stateOf(page, label)) === expect, 8000);
  return ms;
};
let ms = await timed("Mesa 3", () => mockEvent({ type: "waiter_call", table: "Mesa 3", reason: "consulta" }), "calling");
check("CA-8.4a llamado -> 'Llama al mozo' sin recargar (<= 3 s)", ms !== false && ms <= 3000, `${ms} ms`);
check("CA-8.3 motivo 'Tiene una consulta'", /Tiene una consulta/.test(await card(page, "Mesa 3").locator(".adm-state").innerText()));
c = await counts(page);
check("CA-8.4a conteo Llamando sube a 2", c.calling === 2, JSON.stringify(c));
check("CA-8.6 anuncio aria-live 'Mesa 3 llama al mozo'", (await page.locator("p.sr-only[role=status]", { hasText: "Mesa 3 llama al mozo" }).count()) === 1);
check("CA-8.6 sin toast de llamado dentro del admin", (await page.getByText("Una mesa está llamando al mozo").count()) === 0);
ms = await timed("Mesa 3", () => mockEvent({ type: "attend_call", table: "Mesa 3" }), "occupied");
check("CA-8.4b llamado atendido -> vuelve a su estado anterior (Ocupada)", ms !== false && ms <= 3000, `${ms} ms`);
ms = await timed("Mesa 7", () => mockEvent({ type: "new_order", table: "Mesa 7", items: [{ name: "Provoleta", quantity: 2 }] }), "occupied");
const m7txt = await card(page, "Mesa 7").locator(".adm-state").innerText();
check("CA-8.4c pedido nuevo -> 'Ocupada' con '1 pedido · $total'", ms !== false && ms <= 3000 && /1 pedido · \$\s?10\.400/.test(m7txt), `${ms} ms | ${m7txt.replace(/\n/g, " / ")}`);
ms = await timed("Mesa 7", () => mockEvent({ type: "order_status", table: "Mesa 7", status: "delivered" }), "free");
check("CA-8.4d pedido entregado sin otros activos -> 'Libre'", ms !== false && ms <= 3000, `${ms} ms`);

// ---- Menú ⋯ con teclado (CA-8.16) y eliminar (CA-NR.34, CA-8.13, CA-8.14) ----
{
  const trigger = card(page, "Mesa 7").getByRole("button", { name: "Más acciones de Mesa 7" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await menu.waitFor();
  await page.keyboard.press("ArrowDown");
  const hi = await page.evaluate(() => document.activeElement?.textContent?.trim());
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden" });
  const back = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  check("CA-8.16 ⋯ se abre con teclado, flechas recorren, Escape cierra y devuelve el foco", hi === "Eliminar mesa" && back === "Más acciones de Mesa 7", `${hi} | ${back}`);

  // Mesa 1 tiene pedidos: la confirmación avisa que se borran (CA-8.14)
  await card(page, "Mesa 1").getByRole("button", { name: "Más acciones de Mesa 1" }).click();
  await page.getByRole("menuitem", { name: "Eliminar mesa" }).click();
  const conf = page.getByRole("alertdialog");
  await conf.waitFor();
  check("CA-8.14 mesa con pedidos: 'También se borran sus pedidos.'", (await conf.innerText()).includes("También se borran sus pedidos."));
  await conf.getByRole("button", { name: "Cancelar" }).click();
  await conf.waitFor({ state: "hidden" });

  await trigger.click();
  await page.getByRole("menuitem", { name: "Eliminar mesa" }).click();
  await conf.waitFor();
  check("CA-NR.34 texto '¿Eliminar \"Mesa 7\"? El QR impreso dejará de funcionar.'", (await conf.innerText()).includes('¿Eliminar "Mesa 7"? El QR impreso dejará de funcionar.'));
  check("CA-8.9 foco inicial en Cancelar", (await until(async () => (await page.evaluate(() => document.activeElement?.textContent)) === "Cancelar", 2000)) !== false);
  await conf.getByRole("button", { name: "Cancelar" }).click();
  await conf.waitFor({ state: "hidden" });
  check("CA-NR.34 cancelar no borra", (await tablesOf()).some((t) => t.label === "Mesa 7"));
  await trigger.click();
  await page.getByRole("menuitem", { name: "Eliminar mesa" }).click();
  await conf.getByRole("button", { name: "Eliminar mesa" }).click();
  await conf.waitFor({ state: "hidden" });
  const gone = await until(async () => (await page.locator(".adm-table__title", { hasText: /^Mesa 7$/ }).count()) === 0);
  check("CA-8.13 confirmar: la tarjeta desaparece y la mesa se borra", gone !== false && !(await tablesOf()).some((t) => t.label === "Mesa 7"));
  c = await counts(page);
  check("CA-8.13 conteos actualizados (Todas 3)", c.all === 3 && c.free + c.occupied + c.calling === 3, JSON.stringify(c));
  const r = await fetch(`${APP}/api/qr/${m7.qr_token}`);
  check("CA-NR.34 su QR da 'no encontrada'", r.status === 404);
  check("H-AD-1 (Mesas) tras borrar el foco no cae a <body>", !(await focusIsBody(page)), await page.evaluate(() => document.activeElement?.tagName));
}

// ---- Imprimir todos (CA-8.11, CA-8.12) ----
{
  await page.locator(".adm-pill[data-filter='calling']").click();
  await page.getByRole("button", { name: "Imprimir todos" }).click();
  const pv = page.getByRole("dialog", { name: "Imprimir todos los QR" });
  await pv.waitFor();
  const printBtn = pv.getByRole("button", { name: "Imprimir", exact: true });
  await printBtn.waitFor({ timeout: 10000 });
  const names = await pv.locator(".adm-print__name").allInnerTexts();
  check("CA-8.11 todas las mesas aunque haya filtro, en el orden de la lista", JSON.stringify(names) === '["Mesa 1","Mesa 2","Mesa 3"]', JSON.stringify(names));
  const imgs = await pv.locator(".adm-print__cell img").evaluateAll((els) => els.map((e) => ({ ok: e.complete && e.naturalWidth > 0, src: e.getAttribute("src") })));
  const st = await tablesOf();
  check("CA-8.11 un QR por mesa, de /api/qr/<qrToken> de esa mesa (mismo PNG que 'Descargar')",
    imgs.length === 3 && imgs.every((i) => i.ok) && imgs.every((i, k) => i.src === `/api/qr/${st.find((t) => t.label === names[k]).qr_token}`), JSON.stringify(imgs));
  check("CA-8.11 nombre DEBAJO del QR y borde punteado", await pv.locator(".adm-print__cell").first().evaluate((el) => {
    const img = el.querySelector("img").getBoundingClientRect();
    const name = el.querySelector(".adm-print__name").getBoundingClientRect();
    return name.top >= img.bottom && getComputedStyle(el).borderTopStyle === "dashed";
  }));
  await page.emulateMedia({ media: "print" });
  const pr = await page.evaluate(() => ({
    side: getComputedStyle(document.querySelector(".adm-side") ?? document.body).display,
    shell: [...document.body.children].filter((e) => !e.classList.contains("adm-print-root") && getComputedStyle(e).display !== "none").map((e) => e.tagName + "." + e.className),
    bar: getComputedStyle(document.querySelector(".adm-print__bar")).display,
    bg: getComputedStyle(document.querySelector(".adm-print")).backgroundColor,
    paperShadow: getComputedStyle(document.querySelector(".adm-print__paper")).boxShadow,
    nameColor: getComputedStyle(document.querySelector(".adm-print__name")).color,
    qrMm: Math.round((document.querySelector(".adm-print__cell img").getBoundingClientRect().width * 25.4) / 96),
  }));
  check("CA-8.12 al imprimir: sin menú, barra ni botones; fondo blanco; sin sombras; nombre negro",
    pr.shell.length === 0 && pr.bar === "none" && pr.bg === "rgb(255, 255, 255)" && pr.paperShadow === "none" && pr.nameColor === "rgb(0, 0, 0)", JSON.stringify(pr));
  note(`tamaño impreso del QR: ${pr.qrMm} mm (CA-8.12: lo valida el Líder escaneando una hoja real)`);
  await page.emulateMedia({ media: "screen" });
  await pv.getByRole("button", { name: "Cerrar" }).click();
  await pv.waitFor({ state: "hidden" });
  check("CA-8.12 al volver de la impresión se conserva el filtro", (await page.locator(".adm-pill[data-filter='calling']").getAttribute("aria-pressed")) === "true");
  await page.locator(".adm-pill[data-filter='all']").click();
}

// ---- 60 mesas: paginado (CA-8.12) ----
{
  const tok = await token("admin@demo.test");
  for (let i = 4; i <= 60; i++) await insertTable(tok, A, `Mesa ${String(i).padStart(2, "0")}`, `mesa-${i}-print${i}`);
  await page.reload();
  await page.waitForSelector(".adm-table__card");
  await page.getByRole("button", { name: "Imprimir todos" }).click();
  const pv = page.getByRole("dialog", { name: "Imprimir todos los QR" });
  await pv.getByRole("button", { name: "Imprimir", exact: true }).waitFor({ timeout: 60000 });
  const n = await pv.locator(".adm-print__cell img").count();
  await page.emulateMedia({ media: "print" });
  const cellMm = await pv.locator(".adm-print__cell").first().evaluate((e) => (e.getBoundingClientRect().height * 25.4) / 96);
  const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true });
  await page.emulateMedia({ media: "screen" });
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const rowsPerPage = Math.floor((297 - 24) / cellMm);
  const expected = Math.ceil(Math.ceil(n / 3) / rowsPerPage);
  check("CA-8.12 60 mesas: 60 QR y paginado sin partir filas", n === 60 && pages === expected, `QR=${n}, celda=${cellMm.toFixed(1)} mm, ${rowsPerPage} filas x 3 por hoja, páginas PDF=${pages} (esperadas ${expected})`);
  await pv.getByRole("button", { name: "Cerrar" }).click();
}
await ctx.close();
await resetMock();

// ======================================================================
// Error de carga (CA-11.5) y restaurante sin mesas (CA-11.1, CA-8.12)
// ======================================================================
{
  const e = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await e.newPage();
  await login(p, "admin@demo.test", "/admin/menu");
  await fault({ tables: true });
  await p.goto(`${APP}/admin/mesas`);
  await p.getByText("No pudimos cargar las mesas").waitFor({ timeout: 10000 });
  check("CA-11.5 error de lectura: 'No pudimos cargar las mesas' (no el vacío)", (await p.getByText("Todavía no hay mesas").count()) === 0);
  await fault({ tables: false });
  await p.getByRole("button", { name: "Reintentar" }).click();
  const ok = await until(async () => (await p.locator(".adm-table").count()) === 3, 10000);
  check("CA-11.5 'Reintentar' vuelve a pedir sin recargar la página", ok !== false);
  await e.close();

  // Restaurante B sin mesas
  const tokB = await token("admin-b@demo.test");
  const tb = (await mockState()).tables.filter((t) => t.restaurant_id !== A);
  for (const t of tb) await fetch(`${MOCK}/rest/v1/tables?id=eq.${t.id}`, { method: "DELETE", headers: { ...H, Authorization: `Bearer ${tokB}` } });
  const b = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pb = await b.newPage();
  await login(pb, "admin-b@demo.test", "/admin/mesas");
  await pb.locator(".adm-empty").waitFor();
  check("CA-11.1 sin mesas: 'Todavía no hay mesas. Creá la primera y bajá su QR.' con 'Nueva mesa'",
    (await pb.getByText("Todavía no hay mesas. Creá la primera y bajá su QR.").count()) === 1 && (await pb.locator(".adm-empty").getByRole("button", { name: "Nueva mesa" }).count()) === 1);
  check("CA-8.12 con 0 mesas 'Imprimir todos' deshabilitado y explica 'Creá una mesa para imprimir'",
    (await pb.getByRole("button", { name: "Imprimir todos" }).isDisabled()) && (await pb.getByText("Creá una mesa para imprimir").isVisible()));
  await b.close();
  await resetMock();
}

// ======================================================================
// Celular 360x640: lista, hoja, Atrás, borrar desde la hoja
// ======================================================================
{
  const m = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  const p = await m.newPage();
  await login(p, "admin@demo.test", "/admin/mesas");
  await p.waitForSelector(".adm-table__row");
  check("CA-8.8 celular: filas compactas visibles y tarjetas ocultas",
    (await p.locator(".adm-table__row").first().isVisible()) && !(await p.locator(".adm-table__card").first().isVisible()));
  const rowTxt = await p.locator(".adm-table__row").nth(1).innerText();
  check("CA-8.8 fila con nombre, resumen y estado", /Mesa 2/.test(rowTxt) && /Pide la cuenta/.test(rowTxt) && /Llama al mozo/.test(rowTxt), rowTxt.replace(/\n/g, " / "));
  const vw = await p.evaluate(() => window.innerWidth);
  const hb = await p.locator(".adm-mesas__actions .adm-btn").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right));
  check("CA-8.1 en celular los dos botones caben sin desbordar", hb.length === 2 && hb.every((r) => r <= vw), JSON.stringify(hb));

  const row1 = p.locator(".adm-table__row").first();
  await row1.click();
  const sheet = p.getByRole("dialog", { name: "Mesa 1" });
  await sheet.waitFor();
  const qr = sheet.locator("img[alt='QR de Mesa 1']");
  const panelBg = await sheet.locator(".adm-qrpanel").evaluate((e) => getComputedStyle(e).backgroundColor);
  const frameBg = await sheet.locator(".adm-qrpanel__frame").evaluate((e) => getComputedStyle(e).backgroundColor);
  check("CA-8.8 hoja: QR grande en recuadro blanco sobre tomate + 'Escaneá y pedí desde la mesa'",
    (await qr.isVisible()) && (await qr.boundingBox()).width >= 200 && panelBg === "rgb(215, 38, 30)" && frameBg === "rgb(255, 255, 255)" && (await sheet.getByText("Escaneá y pedí desde la mesa").isVisible()),
    `${panelBg} / ${frameBg}`);
  check("CA-8.8 hoja: estado, resumen, Descargar, Ver carta y Eliminar mesa",
    /Ocupada/.test(await sheet.locator(".adm-state").innerText()) &&
    (await sheet.getByRole("link", { name: "Descargar QR de Mesa 1" }).isVisible()) &&
    (await sheet.getByRole("link", { name: "Ver carta de Mesa 1" }).isVisible()) &&
    (await sheet.getByRole("button", { name: "Eliminar mesa" }).isVisible()));
  check("CA-8.9 role=dialog, aria-modal y 'Cerrar' >= 44 px",
    (await sheet.getAttribute("aria-modal")) === "true" && (await sheet.getByRole("button", { name: "Cerrar" }).boundingBox()).height >= 44);
  await p.keyboard.press("Escape");
  await sheet.waitFor({ state: "hidden" });
  check("CA-8.9 Escape cierra y el foco vuelve a la fila", (await until(() => row1.evaluate((e) => e === document.activeElement), 1500)) !== false,
    await p.evaluate(() => `${document.activeElement?.tagName}.${document.activeElement?.className} "${document.activeElement?.textContent?.slice(0, 30)}"`));
  await row1.click();
  await sheet.waitFor();
  check("CA-8.9 la hoja vive en la URL (?mesa=)", new URL(p.url()).searchParams.has("mesa"));
  await p.goBack();
  await sheet.waitFor({ state: "hidden" });
  check("CA-8.9 Atrás cierra la hoja sin salir de Mesas", new URL(p.url()).pathname === "/admin/mesas" && !new URL(p.url()).searchParams.has("mesa"));

  // Crear desde el celular y borrar desde la hoja
  await p.getByRole("button", { name: "Nueva mesa" }).first().click();
  const d = p.getByRole("dialog", { name: "Nueva mesa" });
  await d.getByLabel("Nombre de la mesa").fill("Barra");
  await d.getByLabel("Nombre de la mesa").press("Enter");
  await d.waitFor({ state: "hidden" });
  await p.locator(".adm-table__row", { hasText: "Barra" }).waitFor({ timeout: 8000 });
  await p.locator(".adm-table__row", { hasText: "Barra" }).click();
  const sb = p.getByRole("dialog", { name: "Barra" });
  await sb.waitFor();
  await sb.getByRole("button", { name: "Eliminar mesa" }).click();
  const conf = p.getByRole("alertdialog");
  await conf.waitFor();
  check("CA-8.9 'Eliminar mesa' abre la confirmación propia (texto CA-NR.34)", (await conf.innerText()).includes('¿Eliminar "Barra"? El QR impreso dejará de funcionar.'));
  await conf.getByRole("button", { name: "Eliminar mesa" }).click();
  await sb.waitFor({ state: "hidden" });
  const gone = await until(async () => (await p.locator(".adm-table__row", { hasText: "Barra" }).count()) === 0);
  check("CA-8.13 borrar desde la hoja: la hoja se cierra y la fila desaparece", gone !== false && !(await tablesOf()).some((t) => t.label === "Barra"));
  check("H-AD-1 (Mesas) tras borrar desde la hoja el foco no cae a <body>", !(await focusIsBody(p)), await p.evaluate(() => document.activeElement?.tagName));

  // Objetivos táctiles (CA-13.5)
  for (const sel of [".adm-mesas__actions .adm-btn", ".adm-pill", ".adm-table__row"]) {
    const boxes = await p.locator(sel).evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    const small = boxes.filter(([w, h]) => w < 44 || h < 44);
    check(`CA-13.5 ${sel} >= 44x44`, boxes.length > 0 && small.length === 0, `${boxes.length} medidos, chicos=${JSON.stringify(small)}`);
  }
  await m.close();
}

// ======================================================================
// Teclado: crear una mesa solo con teclado (CA-13.3)
// ======================================================================
{
  const k = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await k.newPage();
  await login(p, "admin@demo.test", "/admin/mesas");
  await p.waitForSelector(".adm-table__card");
  let found = false;
  for (let i = 0; i < 25 && !found; i++) {
    await p.keyboard.press("Tab");
    found = (await p.evaluate(() => document.activeElement?.textContent?.trim())) === "Nueva mesa";
  }
  await p.keyboard.press("Enter");
  await p.getByRole("dialog", { name: "Nueva mesa" }).waitFor();
  await p.keyboard.type("Patio");
  await p.keyboard.press("Enter");
  const ok = await until(async () => (await p.locator(".adm-table__title", { hasText: /^Patio$/ }).count()) === 1, 8000);
  check("CA-13.3 'Nueva mesa' alcanzable con Tab y la mesa se crea con Enter", found && ok !== false);
  await k.close();
}

await browser.close();
await resetMock();
process.exitCode = summary() ? 1 : 0;
