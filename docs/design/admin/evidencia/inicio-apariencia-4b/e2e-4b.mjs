// Punta a punta del paso 4b: Inicio (HU-9), accesos a Mesas/Carta, Apariencia (HU-10) y
// estados vacíos/de error (HU-11) contra el Supabase simulado detrás de fault-proxy.
// Uso: TOOLS_DIR=... APP_URL=... MOCK_URL=<proxy> node e2e-4b.mjs
import { launch, login, APP, MOCK, resetMock, mockEvent, check, note, summary } from "../carta-4a/lib.mjs";
import { fault, NO_FAULTS, emptyRestaurantB, until, wait, token, H, RID_A, noHScroll } from "./lib4b.mjs";

await resetMock();
await fault(NO_FAULTS);
const browser = await launch();

const kpi = (p, label) => p.locator(".adm-kpi", { has: p.locator(".adm-stat__label", { hasText: label }) });
const kpiValue = async (p, label) => (await kpi(p, label).locator(".adm-stat__value").innerText()).replace(/\s+/g, " ").trim();
const pressed = (p, key) => p.locator(`.adm-pill[data-filter='${key}']`).getAttribute("aria-pressed");

async function newPage(w = 1440, h = 900, email = "admin@demo.test", start = "/admin") {
  const mobile = w < 768;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, email, start);
  return { ctx, page, errors };
}

// ======================================================================= Inicio
{
  const { ctx, page: p, errors } = await newPage();
  await p.waitForSelector(".adm-kpis");
  check("CA-9.1 rótulo 'Inicio' y h1 'Así viene el día'",
    (await p.locator(".adm-eyebrow").first().innerText()).trim().toLowerCase() === "inicio" &&
      (await p.locator("h1").innerText()) === "Así viene el día");
  const expected = (() => {
    const parts = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" }).formatToParts(new Date());
    const g = (t) => parts.find((x) => x.type === t).value;
    return `${g("weekday")} ${g("day")} de ${g("month")}`;
  })();
  const date = await p.locator(".adm-home__date").innerText();
  check("CA-9.1 fecha de hoy en hora de Argentina, formato de la maqueta (sin coma)", date === expected, date);

  const v0 = {
    orders: await kpiValue(p, "Pedidos de hoy"),
    occ: await kpiValue(p, "Mesas ocupadas"),
    calls: await kpiValue(p, "Llamados pendientes"),
    stock: await kpiValue(p, "Platos sin stock"),
  };
  check("CA-9.2 cuatro datos con los valores del mock (4 / 3 de 3 / 1 / 1)",
    v0.orders === "4" && v0.occ === "3 de 3" && v0.calls === "1" && v0.stock === "1", JSON.stringify(v0));
  check("CA-9.2 'Pedidos de hoy' en tomate y no es enlace",
    (await kpi(p, "Pedidos de hoy").evaluate((el) => el.tagName + " " + el.className)).startsWith("DIV") &&
      (await kpi(p, "Pedidos de hoy").getAttribute("class")).includes("adm-stat--hot"));
  const hrefs = {
    occ: await kpi(p, "Mesas ocupadas").getAttribute("href"),
    calls: await kpi(p, "Llamados pendientes").getAttribute("href"),
    stock: await kpi(p, "Platos sin stock").getAttribute("href"),
  };
  check("CA-9.5 enlaces de los datos: ocupadas, llamando y la Carta SIN filtro (decisión 4 del Director)",
    hrefs.occ === "/admin/mesas?filtro=ocupadas" && hrefs.calls === "/admin/mesas?filtro=llamando" && hrefs.stock === "/admin/menu",
    JSON.stringify(hrefs));
  check("Textos de enlace 'Ver ocupadas', 'Ver mesas llamando', 'Ver en la carta'",
    (await p.locator(".adm-kpi__go").allInnerTexts()).map((t) => t.trim()).join("|") === "Ver ocupadas|Ver mesas llamando|Ver en la carta");
  check("Sin el mensaje de 'sin pedidos' cuando hay pedidos", (await p.getByText("Todavía no entraron pedidos hoy.").count()) === 0);
  const tiles = p.locator(".adm-tile");
  const tileInfo = await tiles.evaluateAll((els) => els.map((e) => ({ t: e.textContent.trim(), h: e.getBoundingClientRect().height, href: e.getAttribute("href") })));
  check("CA-9.5 cuatro accesos con su destino y >= 44 px",
    tileInfo.map((x) => `${x.t}>${x.href}`).join("|") ===
      "Nuevo plato>/admin/menu?nuevo=plato|Nueva mesa>/admin/mesas?nueva=1|Imprimir todos los QR>/admin/mesas?imprimir=1|Ir al Salón>/floor" &&
      tileInfo.every((x) => x.h >= 44),
    tileInfo.map((x) => `${x.t} ${Math.round(x.h)}px`).join(", "));

  // ---- En vivo (CA-9.4)
  await mockEvent({ type: "new_order", table: "Mesa 1", items: [{ name: "Provoleta", quantity: 1 }] });
  const tOrder = await until(async () => (await kpiValue(p, "Pedidos de hoy")) === "5");
  check("CA-9.4 un pedido nuevo suma 1 a 'Pedidos de hoy' sin recargar", tOrder !== false, `${tOrder} ms`);
  await mockEvent({ type: "waiter_call", table: "Mesa 3", reason: "cuenta" });
  const tCall = await until(async () => (await kpiValue(p, "Llamados pendientes")) === "2");
  check("CA-9.4 un llamado nuevo suma 1 a 'Llamados pendientes'", tCall !== false, `${tCall} ms`);
  await mockEvent({ type: "attend_call", table: "Mesa 3" });
  const tAtt = await until(async () => (await kpiValue(p, "Llamados pendientes")) === "1");
  check("CA-9.4 al atenderse se resta", tAtt !== false, `${tAtt} ms`);

  // ---- Sin stock desde la Carta, al volver a Inicio
  await p.locator("a[href='/admin/menu']:visible").first().click();
  await p.waitForSelector(".adm-dish");
  const sw = p.locator("[role='switch'][aria-checked='true']").first();
  const swName = await sw.getAttribute("aria-label");
  await sw.click();
  await until(async () => (await sw.getAttribute("aria-checked")) === "false");
  await wait(1200); // que se guarde
  await p.locator("a[href='/admin']:visible").last().click();
  await p.waitForSelector(".adm-kpis");
  const tStock = await until(async () => (await kpiValue(p, "Platos sin stock")) === "2", 8000);
  check("CA-9.4 marcar un plato sin stock en Carta se refleja al volver a Inicio (navegación sin recarga)", tStock !== false, swName);

  // ---- Enlaces de los datos y accesos (Mesas lee ?filtro=, ?imprimir=, ?nueva=)
  await kpi(p, "Mesas ocupadas").click();
  await p.waitForSelector(".adm-tables, .adm-empty");
  check("?filtro=ocupadas abre Mesas con 'Ocupadas' activa", (await pressed(p, "occupied")) === "true");
  check("La URL de Mesas queda limpia (recargar no repite el acceso)", new URL(p.url()).search === "", p.url());
  await p.goBack();
  await p.waitForSelector(".adm-kpis");
  await kpi(p, "Llamados pendientes").click();
  await p.waitForSelector(".adm-pills");
  check("?filtro=llamando abre Mesas con 'Llamando' activa", (await pressed(p, "calling")) === "true");
  for (const bad of ["xyz", "constructor", "OCUPADAS", ""]) {
    await p.goto(`${APP}/admin/mesas?filtro=${bad}&imprimir=no&nueva=si`);
    await p.waitForSelector(".adm-pills");
    check(`Valores desconocidos (?filtro=${bad}&imprimir=no&nueva=si) se ignoran: 'Todas', sin diálogos ni error`,
      (await pressed(p, "all")) === "true" && (await p.getByRole("dialog").count()) === 0 && (await p.locator("h1").innerText()) === "Tu salón, de un vistazo");
  }
  await p.goto(`${APP}/admin/mesas?filtro=libres`);
  await p.waitForSelector(".adm-pills");
  check("?filtro=libres (sin mesas libres) muestra el vacío del filtro", (await pressed(p, "free")) === "true" && (await p.getByText("No hay mesas libres ahora.").count()) === 1);

  await p.goto(`${APP}/admin`);
  await p.getByRole("link", { name: "Imprimir todos los QR" }).click();
  await p.getByRole("dialog", { name: "Imprimir todos los QR" }).waitFor({ timeout: 10000 });
  check("Acceso 'Imprimir todos los QR' abre la vista de imprimir todos", (await p.locator(".adm-print__grid li").count()) >= 3);
  await p.keyboard.press("Escape");
  await p.getByRole("dialog").waitFor({ state: "hidden" });
  check("Al cerrar la vista de impresión, la URL no la vuelve a abrir", new URL(p.url()).search === "");

  await p.goto(`${APP}/admin`);
  await p.getByRole("link", { name: "Nueva mesa" }).click();
  await p.getByRole("dialog", { name: "Nueva mesa" }).waitFor({ timeout: 10000 });
  check("Acceso 'Nueva mesa' abre Mesas con el alta abierta", true);
  await p.keyboard.press("Escape");

  await p.goto(`${APP}/admin`);
  await p.getByRole("link", { name: "Nuevo plato" }).click();
  await p.getByRole("dialog", { name: "¿En qué categoría va?" }).waitFor({ timeout: 10000 });
  check("Acceso 'Nuevo plato' abre la Carta con el alta de plato (elegir categoría, flujo de siempre)", new URL(p.url()).search === "", p.url());
  await p.keyboard.press("Escape");
  await p.getByRole("dialog").waitFor({ state: "hidden" });
  check("Cancelar el alta desde el acceso no crea platos", (await p.locator(".adm-dish").count()) >= 7);

  await p.goto(`${APP}/admin`);
  await p.getByRole("link", { name: "Ir al Salón" }).click();
  await p.waitForURL((u) => u.pathname === "/floor", { timeout: 15000 });
  check("Acceso 'Ir al Salón' lleva a /floor", true);

  // ---- Error parcial (CA-9.7) y Reintentar
  await fault({ categories: true });
  await p.goto(`${APP}/admin`);
  await p.waitForSelector(".adm-kpi__err");
  const errStock = kpi(p, "Platos sin stock");
  check("CA-9.7 falla la carta: 'Platos sin stock' dice 'No pudimos cargar' (role=alert) y los otros 3 siguen",
    (await errStock.getAttribute("role")) === "alert" && (await errStock.innerText()).includes("No pudimos cargar") &&
      (await p.locator(".adm-kpi__err").count()) === 1 && (await kpiValue(p, "Pedidos de hoy")) === "5");
  await fault({ categories: false });
  await errStock.getByRole("button", { name: /^Reintentar/ }).click();
  const tRetry = await until(async () => (await p.locator(".adm-kpi__err").count()) === 0 && (await kpiValue(p, "Platos sin stock")) === "2", 10000);
  check("'Reintentar' vuelve a leer sin recargar la página y muestra el dato", tRetry !== false, `${tRetry} ms`);

  await fault({ calls: true });
  await p.goto(`${APP}/admin`);
  await p.waitForSelector(".adm-kpi__err");
  check("Falla la instantánea en vivo: sus 3 tarjetas muestran el error y 'Platos sin stock' sigue",
    (await p.locator(".adm-kpi__err").count()) === 3 && (await kpiValue(p, "Platos sin stock")) === "2");
  check("Cada 'Reintentar' nombra su dato (Reintentar Pedidos de hoy, ...)",
    (await p.getByRole("button", { name: "Reintentar Mesas ocupadas" }).count()) === 1);
  await fault({ calls: false });
  await p.getByRole("button", { name: "Reintentar Mesas ocupadas" }).click();
  const tRetry2 = await until(async () => (await p.locator(".adm-kpi__err").count()) === 0 && (await kpiValue(p, "Pedidos de hoy")) === "5", 10000);
  check("'Reintentar' recupera los 3 datos en vivo con sus valores", tRetry2 !== false, `${tRetry2} ms, ${await kpiValue(p, "Mesas ocupadas")}`);

  await fault({ calls: true, categories: true });
  await p.goto(`${APP}/admin`);
  await p.getByText("No pudimos cargar el resumen").waitFor();
  check("CA-11.5 fallan las dos lecturas: 'No pudimos cargar el resumen' con Pomo 'uy' y role=alert, nunca 'sin pedidos'",
    (await p.locator(".adm-empty[role='alert'] .adm-pomo[data-face='oops']").count()) === 1 &&
      (await p.getByText("Todavía no entraron pedidos hoy.").count()) === 0 && (await p.locator("h1").innerText()) === "Así viene el día");
  check("El menú sigue usable durante el error", await p.locator(".adm-side a[href='/admin/menu']").isVisible());
  await fault({ calls: false, categories: false });
  await p.getByRole("button", { name: "Reintentar" }).click();
  const tRetry3 = await until(async () => (await p.locator(".adm-kpis").count()) === 1, 10000);
  check("'Reintentar' del resumen vuelve a Inicio sin recargar", tRetry3 !== false && (await kpiValue(p, "Pedidos de hoy")) === "5", `${tRetry3} ms`);
  check("Sin errores de JavaScript en Inicio", errors.length === 0, errors.join(" / "));
  await ctx.close();
}

// ============================================== Estados vacíos (restaurante B, solo en la prueba)
{
  await resetMock();
  await emptyRestaurantB({ menu: false, tables: ["Mesa 1", "Mesa 2"] });
  const { ctx, page: p } = await newPage(1440, 900, "admin-b@demo.test");
  await p.waitForSelector(".adm-kpis");
  check("CA-9.6 sin pedidos hoy: el dato muestra 0 y Pomo con 'Todavía no entraron pedidos hoy.'",
    (await kpiValue(p, "Pedidos de hoy")) === "0" && (await p.locator(".adm-empty .adm-pomo").count()) === 1 &&
      (await p.locator(".adm-empty__text").innerText()) === "Todavía no entraron pedidos hoy.");
  check("CA-9.6 con 0 llamados: 'Sin llamados'", (await kpi(p, "Llamados pendientes").innerText()).includes("Sin llamados"));
  check("CA-9.8 solo datos del restaurante B (0 de 2 mesas)", (await kpiValue(p, "Mesas ocupadas")) === "0 de 2");
  check("Los accesos rápidos siguen bajo el vacío", (await p.locator(".adm-tile").count()) === 4);
  await ctx.close();

  await resetMock();
  await emptyRestaurantB({ menu: true });
  const s2 = await newPage(1440, 900, "admin-b@demo.test");
  const q = s2.page;
  await q.waitForSelector(".adm-kpis");
  check("Restaurante sin mesas ni platos: Inicio '0 de 0' y 0 sin stock",
    (await kpiValue(q, "Mesas ocupadas")) === "0 de 0" && (await kpiValue(q, "Platos sin stock")) === "0");
  await q.goto(`${APP}/admin/menu`);
  check("CA-11.1 Carta vacía con Pomo y 'Nueva categoría'",
    (await q.getByText("Tu carta está vacía. Creá la primera categoría y empezá a sumar platos.").count()) === 1 &&
      (await q.locator(".adm-empty .adm-pomo").count()) === 1);
  await q.goto(`${APP}/admin/mesas`);
  check("CA-11.1 Mesas vacía con Pomo y 'Nueva mesa'",
    (await q.getByText("Todavía no hay mesas. Creá la primera y bajá su QR.").count()) === 1);
  await q.goto(`${APP}/admin/mesas?imprimir=1`);
  await q.waitForSelector(".adm-empty");
  check("?imprimir=1 sin mesas no abre la vista de impresión", (await q.getByRole("dialog").count()) === 0);
  await q.goto(`${APP}/admin`);
  await q.getByRole("link", { name: "Nuevo plato" }).click();
  await q.getByRole("dialog", { name: "Nueva categoría" }).waitFor({ timeout: 10000 });
  check("'Nuevo plato' sin categorías abre 'Nueva categoría' (mismo flujo que el botón de la Carta)", true);
  await s2.ctx.close();
}

// ============================================================ Apariencia
{
  await resetMock();
  const { ctx, page: p, errors } = await newPage(1440, 900, "admin@demo.test", "/admin/apariencia");
  await p.waitForSelector(".adm-presets");
  check("CA-10.2 rótulo 'Apariencia' y h1 'Tu carta, a tu estilo'",
    (await p.locator("h1").innerText()) === "Tu carta, a tu estilo" &&
      (await p.locator(".adm-eyebrow").first().innerText()).trim().toLowerCase() === "apariencia");
  const names = await p.locator(".adm-preset__name").allInnerTexts();
  check("8 temas, MenuSky primero", names.length === 8 && names[0] === "MenuSky", names.join(", "));
  const first = p.locator(".adm-preset").first();
  check("CA-10.2 MenuSky con 'Predeterminado' y, activo, 'Activo' + ícono + 'Tema actual' deshabilitado",
    (await first.innerText()).toUpperCase().includes("PREDETERMINADO") &&
      (await first.locator(".adm-tag--active svg").count()) === 1 &&
      (await first.getByRole("button", { name: "Tema actual" }).isDisabled()) &&
      (await first.getAttribute("data-active")) !== null);
  check("Los otros 7 dicen 'Usar este tema'", (await p.getByRole("button", { name: "Usar este tema" }).count()) === 7);

  // Elegir tema: todos deshabilitados y 'Aplicando...' (CA-10.4)
  let release;
  const gate = new Promise((r) => (release = r));
  await p.route("**/rest/v1/restaurants**", async (route) => {
    if (route.request().method() === "PATCH") await gate;
    await route.continue();
  });
  const glaciar = p.locator(".adm-preset", { has: p.locator(".adm-preset__name", { hasText: "Glaciar" }) });
  await glaciar.getByRole("button", { name: "Usar este tema" }).click();
  await glaciar.getByRole("button", { name: "Aplicando..." }).waitFor();
  const enabledDuring = await p.locator(".adm-preset .adm-btn:not([disabled])").count();
  check("CA-10.4 mientras se aplica: el elegido dice 'Aplicando...' y todos los botones de tema quedan deshabilitados", enabledDuring === 0);
  release();
  await p.getByText("Tema aplicado").waitFor();
  await until(async () => (await glaciar.getAttribute("data-active")) !== null, 8000);
  check("Al terminar: 'Tema aplicado' y Glaciar queda activo; MenuSky ya no",
    (await glaciar.locator(".adm-tag--active").count()) === 1 && (await first.getAttribute("data-active")) === null);
  await p.unroute("**/rest/v1/restaurants**");

  // Paleta: etiquetas, selector y hex (CA-10.5)
  const fondo = p.getByLabel("Fondo", { exact: true });
  const fondoBefore = await fondo.inputValue();
  check("Tras aplicar Glaciar, la paleta muestra sus colores", fondoBefore.toLowerCase() !== "#fff5e1", fondoBefore);
  const labelled = await p.locator(".adm-colors .adm-input").evaluateAll((els) =>
    els.every((e) => e.id && document.querySelector(`label[for='${e.id}']`))
  );
  check("CA-10.5 los 7 campos hex tienen <label for>", labelled && (await p.locator(".adm-colors .adm-input").count()) === 7);
  check("CA-10.5 cada selector de color tiene nombre accesible", (await p.getByLabel("Fondo: selector de color").count()) === 1);
  await p.getByLabel("Fondo: selector de color").fill("#00ff00");
  check("El selector de color escribe el hex", (await fondo.inputValue()).toLowerCase() === "#00ff00");
  await fondo.fill("#123456");
  const sw = await p.locator(".adm-color").first().locator(".adm-swatch").evaluate((e) => getComputedStyle(e).backgroundColor);
  const prevBg = await p.locator(".adm-preview [inert]").first().evaluate((e) => getComputedStyle(e).backgroundColor);
  check("Escribir el hex actualiza la muestra y la vista previa", sw === "rgb(18, 52, 86)" && prevBg === "rgb(18, 52, 86)", `${sw} / ${prevBg}`);

  // Hex inválido (CA-10.6)
  const acc = p.getByLabel("Acento secundario (navegación, tabs)", { exact: true });
  const save = p.getByRole("button", { name: "Guardar", exact: true });
  await acc.fill("#FFC2");
  check("Mientras se escribe (5 caracteres) el error aún no aparece, pero 'Guardar' ya se bloquea",
    (await p.getByText("Usá un color con el formato #RRGGBB (por ejemplo #FFC21A).").count()) === 0 && (await save.isDisabled()));
  await acc.blur();
  const err = p.getByText("Usá un color con el formato #RRGGBB (por ejemplo #FFC21A).");
  const errId = await err.getAttribute("id");
  check("CA-10.6 al salir del campo: error en línea, aria-invalid y aria-describedby al error",
    (await err.count()) === 1 && (await acc.getAttribute("aria-invalid")) === "true" && (await acc.getAttribute("aria-describedby")) === errId);
  check("La muestra del color inválido se ve rayada (no un color falso)",
    (await p.locator(".adm-swatch--invalid").count()) === 1);
  await acc.fill("zzzzzzz");
  check("Con 7 caracteres inválidos el error aparece sin salir del campo", (await err.count()) === 1);
  await acc.fill("#FFC21A");
  check("Con un hex válido el error se va y 'Guardar' se habilita", (await err.count()) === 0 && !(await save.isDisabled()));

  // Aviso de contraste (mismas reglas)
  await fondo.fill("#FFF5E1");
  await p.getByLabel("Texto secundario", { exact: true }).fill("#C9B8AE");
  const warn = p.getByText('"Texto secundario" puede ser difícil de leer sobre "Fondo".');
  await warn.waitFor();
  const warnBox = p.locator(".adm-look__warn");
  check("CA-10.5 aviso de contraste como texto, en role=status y asociado a la vista previa",
    (await warnBox.getAttribute("role")) === "status" &&
      (await p.locator(".adm-preview").getAttribute("aria-describedby")) === (await warnBox.getAttribute("id")));

  // Restablecer
  await p.getByRole("button", { name: "Restablecer" }).click();
  check("'Restablecer' vuelve a lo guardado (Glaciar)", (await fondo.inputValue()) === fondoBefore && (await warn.count()) === 0);

  // Guardar con error de red
  await p.getByLabel("Texto secundario", { exact: true }).fill("#C9B8AE");
  await p.route("**/rest/v1/restaurants**", (route) =>
    route.request().method() === "PATCH" ? route.fulfill({ status: 500, contentType: "application/json", body: '{"message":"x"}' }) : route.continue()
  );
  await save.click();
  await p.getByText("No se pudo guardar la paleta").waitFor();
  check("Error al guardar: aviso 'No se pudo guardar la paleta' y el botón vuelve a 'Guardar'", !(await save.isDisabled()));
  await p.unroute("**/rest/v1/restaurants**");

  // Guardar
  await save.click();
  await p.getByText("Paleta guardada").waitFor();
  await p.reload();
  await p.waitForSelector(".adm-presets");
  check("Guardar: tras recargar se conserva el color y ningún tema queda 'Activo' (paleta propia)",
    (await p.getByLabel("Texto secundario", { exact: true }).inputValue()).toUpperCase() === "#C9B8AE" &&
      (await p.locator(".adm-preset[data-active]").count()) === 0);
  // conserva style (CA-10.1): el tema guardado sigue con el estilo de Glaciar
  const tok = await token("admin@demo.test");
  const th = await (await fetch(`${MOCK}/rest/v1/restaurants?select=theme&id=eq.${RID_A}`, { headers: { ...H, Authorization: `Bearer ${tok}` } })).json();
  note(`tema guardado: ${JSON.stringify(th[0]?.theme)}`);
  check("El guardado conserva las claves del tema (style incluido si existía)", th[0]?.theme && th[0].theme.textSecondary.toUpperCase() === "#C9B8AE");

  // Error de carga del tema (CA-11.5)
  await fault({ theme: true });
  await p.reload();
  await p.getByText("No pudimos cargar el tema").waitFor();
  check("CA-11.5 falla la lectura del tema: Pomo 'uy', role=alert, sin editor (nunca el tema por defecto)",
    (await p.locator(".adm-empty[role='alert'] .adm-pomo[data-face='oops']").count()) === 1 && (await p.locator(".adm-presets").count()) === 0);
  await fault({ theme: false });
  await p.getByRole("button", { name: "Reintentar" }).click();
  const tTheme = await until(async () => (await p.locator(".adm-presets").count()) === 1, 10000);
  check("'Reintentar' carga el editor sin recargar la página", tTheme !== false, `${tTheme} ms`);
  check("Sin errores de JavaScript en Apariencia", errors.length === 0, errors.join(" / "));
  await ctx.close();
}

// ============================================================ Celular
{
  await resetMock();
  const { ctx, page: p } = await newPage(390, 844);
  await p.waitForSelector(".adm-kpis");
  check("Inicio 390: sin scroll horizontal", await noHScroll(p));
  const tile = await p.locator(".adm-tile").first().boundingBox();
  check("Inicio 390: accesos en 2 columnas y >= 44 px", tile.width < 200 && tile.height >= 44, `${Math.round(tile.width)}x${Math.round(tile.height)}`);
  await p.getByRole("link", { name: /Mesas ocupadas/ }).tap();
  await p.waitForSelector(".adm-pills");
  check("Inicio 390: tocar 'Mesas ocupadas' filtra Mesas", (await pressed(p, "occupied")) === "true");
  await p.goto(`${APP}/admin/apariencia`);
  await p.waitForSelector(".adm-presets");
  await p.getByLabel("Fondo", { exact: true }).evaluate((e) => e.scrollIntoView({ block: "center" }));
  await wait(200);
  const bar = await p.locator(".adm-look__actions").boundingBox();
  const tabs = await p.locator(".adm-tabbar").boundingBox();
  check("CA-10.3 celular: Guardar/Restablecer en barra fija visible sobre las pestañas", bar.y + bar.height <= tabs.y && bar.y > 0,
    `barra ${Math.round(bar.y)}-${Math.round(bar.y + bar.height)}, pestañas desde ${Math.round(tabs.y)}`);
  const cols = await p.locator(".adm-preset").evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().x))).size);
  check("CA-10.3 celular: temas en 1 columna", cols === 1);
  check("Apariencia 390: sin scroll horizontal", await noHScroll(p));
  await ctx.close();
}

await fault(NO_FAULTS);
await resetMock();
await browser.close();
process.exitCode = summary() ? 1 : 0;
