// Prueba de punta a punta de Shell + Carta + hoja de edición (parte 4a)
// contra el Supabase simulado. Uso:
//   TOOLS_DIR=<carpeta con playwright> node carta-e2e.mjs
// Requiere: mock detrás de fault-proxy en 3431 (ver README.md de esta carpeta)
// y la app compilada con esas variables en 3432.
import { launch, login, APP, MOCK, resetMock, mockEvent, check, note, summary } from "./lib.mjs";

const A = "11111111-1111-4111-8111-111111111111";
const H = { apikey: "mock-anon-key" };

async function menu(restaurant = A) {
  const r = await fetch(
    `${MOCK}/rest/v1/categories?select=id,name,sort_order,restaurant_id,menu_items(id,name,price,is_available,sort_order,photo_url,description,item_option_groups(id,name,selection_type,is_required,item_option_choices(id,name,extra_price)))`,
    { headers: H }
  );
  const rows = await r.json();
  return rows
    .filter((c) => c.restaurant_id === restaurant)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ ...c, menu_items: [...c.menu_items].sort((a, b) => a.sort_order - b.sort_order) }));
}
async function item(name) {
  return (await menu()).flatMap((c) => c.menu_items).find((i) => i.name === name);
}
async function fault(body) {
  await fetch(`${MOCK}/__fault`, { method: "POST", body: JSON.stringify(body) });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return true;
    await wait(150);
  }
  return false;
}

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64"
);

await resetMock();
await fault({ categories: false, menuItemsWrite: false });
const browser = await launch();

// ======================================================================
// Acceso (CA-NR.01)
// ======================================================================
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  for (const route of ["/admin", "/admin/menu", "/admin/mesas", "/admin/apariencia"]) {
    await p.goto(`${APP}${route}`);
    const u = new URL(p.url());
    check(`CA-NR.01 sin sesión ${route}`, u.pathname === "/login" && u.searchParams.get("redirect") === route, p.url());
  }
  await ctx.close();
}
for (const [email, text] of [
  ["mozo@demo.test", "Esta sección es solo para administradores"],
  ["cocina@demo.test", "Esta sección es solo para administradores"],
  ["sinstaff@demo.test", "no está vinculada a ningún restaurante"],
]) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await login(p, email, "/admin/menu");
  if (!p.url().includes("/admin/menu")) await p.goto(`${APP}/admin/menu`);
  const html = await p.content();
  check(
    `CA-NR.01 ${email} ve el aviso y ningún dato`,
    html.includes(text) && !html.includes("Provoleta") && !html.includes("Pedidos hoy") && !html.includes("mesas ocupadas"),
    p.url()
  );
  await ctx.close();
}

// ======================================================================
// Escritorio 1440x900
// ======================================================================
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await login(page, "admin@demo.test", "/admin");

// ---- Shell (HU-5) ----
{
  const u = new URL(page.url());
  check("CA-5.7 /admin muestra Inicio (no redirige)", u.pathname === "/admin", page.url());
  await page.waitForFunction(() => document.title === "Inicio | MenuSky", null, { timeout: 5000 }).catch(() => {});
  check("CA-5.7 título Inicio", (await page.title()) === "Inicio | MenuSky", await page.title());
  check("CA-5.7 un h1 en Inicio", (await page.locator("h1").count()) === 1);
  await page.click(".adm-side a[href='/admin/menu']");
  await page.waitForURL("**/admin/menu");
  await page.waitForSelector(".adm-dish");
  check("CA-5.7 título Carta", (await page.title()) === "Carta | MenuSky", await page.title());
  check("CA-5.7 un h1 en Carta", (await page.locator("h1").count()) === 1);
  const current = await page.locator(".adm-side [aria-current='page']").allTextContents();
  check("CA-5.6 Carta activa con aria-current (uno solo)", current.length === 1 && current[0].includes("Carta"), JSON.stringify(current));
  check("CA-5.8 nav 'Principal'", (await page.locator(".adm-side nav[aria-label='Principal']").count()) === 1);
  const local = await page.locator(".adm-local").innerText();
  check("CA-5.2 tarjeta del local con 'X de Y mesas ocupadas'", /El Buen Sabor/.test(local) && /\d+ de 3 mesas ocupadas/.test(local), local.replace(/\n/g, " / "));
  const who = await page.locator(".adm-who").innerText();
  check("CA-NR.03 nombre y rol Admin", /Admin/.test(who), who.replace(/\n/g, " / "));
  check("CA-NR.04 enlaces a Cocina y Salón", (await page.locator(".adm-side a[href='/kitchen']").count()) === 1 && (await page.locator(".adm-side a[href='/floor']").count()) === 1);
  const dots = await page.locator(".adm-side a[href='/kitchen'] .adm-dot, .adm-side a[href='/floor'] .adm-dot").count();
  check("CA-NR.04 indicador de pendientes (hay pedido recibido y uno listo)", dots === 2, `puntos=${dots}`);
  check("CA-5.8 'Saltar al contenido' apunta a main", (await page.locator("a.adm-skip[href='#contenido']").count()) === 1 && (await page.locator("main#contenido").count()) === 1);
  // Navegación sin recarga del documento (CA-5.9)
  await page.evaluate(() => (window.__noReload = 1));
  await page.click(".adm-side a[href='/admin/mesas']");
  await page.waitForURL("**/admin/mesas");
  await page.click(".adm-side a[href='/admin/menu']");
  await page.waitForURL("**/admin/menu");
  await page.waitForSelector(".adm-dish");
  check("CA-5.9 cambiar de sección no recarga el documento", (await page.evaluate(() => window.__noReload)) === 1);
  await page.goBack();
  await page.waitForURL("**/admin/mesas");
  check("CA-5.7 Atrás entre secciones", new URL(page.url()).pathname === "/admin/mesas");
  await page.goForward();
  await page.waitForURL("**/admin/menu");
  await page.waitForSelector(".adm-dish");
}

// ---- Datos rápidos (CA-6.2) y lista completa (CA-NR.10) ----
const stat = async (label) =>
  (await page.locator(".adm-stat", { hasText: label }).locator(".adm-stat__value").innerText()).trim();
{
  const m = await menu();
  const all = m.flatMap((c) => c.menu_items);
  check("CA-6.2 Platos en carta", (await stat("Platos en carta")) === String(all.length), `${await stat("Platos en carta")} vs ${all.length}`);
  check("CA-6.2 Sin stock hoy", (await stat("Sin stock hoy")) === String(all.filter((i) => !i.is_available).length), await stat("Sin stock hoy"));
  check("CA-6.2 Pedidos hoy (4 del día sin cancelados)", (await stat("Pedidos hoy")) === "4", await stat("Pedidos hoy"));
  const headings = await page.locator(".adm-cat h2").evaluateAll((els) => els.map((e) => e.firstChild.textContent.trim()));
  check("CA-NR.10 categorías en el orden de sort_order", JSON.stringify(headings) === JSON.stringify(m.map((c) => c.name)), JSON.stringify(headings));
  const names = await page.locator(".adm-dish__name").allTextContents();
  check("CA-NR.10 todos los platos (incluye sin stock) en orden", JSON.stringify(names) === JSON.stringify(all.map((i) => i.name)), `${names.length} platos`);
  await mockEvent({ type: "new_order", table: "Mesa 1", items: [{ name: "Provoleta", quantity: 1 }] });
  const live = await until(async () => (await stat("Pedidos hoy")) === "5", 10000);
  check("CA-6.2 'Pedidos hoy' sube en vivo con un pedido nuevo", live, await stat("Pedidos hoy"));
}

// ---- Categoría nueva (CA-NR.11) ----
{
  const before = (await menu()).length;
  await page.getByRole("button", { name: "Nueva Categoría" }).click();
  const dlg = page.getByRole("dialog", { name: "Nueva categoría" });
  await dlg.waitFor();
  await dlg.getByRole("button", { name: "Crear categoría" }).click();
  check("CA-NR.11 nombre vacío no crea (aviso en línea)", (await dlg.getByRole("alert").innerText()).includes("Escribí un nombre") && (await menu()).length === before);
  await dlg.getByLabel("Nombre").fill("   ");
  await dlg.getByRole("button", { name: "Crear categoría" }).click();
  check("CA-NR.11 solo espacios no crea", (await menu()).length === before);
  await dlg.getByLabel("Nombre").fill("  Postres  ");
  await dlg.getByRole("button", { name: "Crear categoría" }).click();
  await dlg.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: /^Postres, 0 platos/ }).waitFor();
  const m = await menu();
  check("CA-NR.11 se crea 'Postres' recortado y al final", m.at(-1).name === "Postres" && m.length === before + 1, JSON.stringify(m.map((c) => c.name)));
  const pills = await page.locator(".adm-pills button").allTextContents();
  check("CA-6.3 píldora nueva al final, antes de '+ Categoría'", pills.at(-2).startsWith("Postres") && /Categoría/.test(pills.at(-1)), JSON.stringify(pills));
}

// ---- Categoría vacía + nuevo plato (CA-11.1, CA-6.13, CA-NR.13) ----
{
  await page.getByRole("button", { name: /^Postres, 0 platos/ }).click();
  check("CA-6.3 píldora activa anunciada (aria-pressed)", (await page.getByRole("button", { name: /^Postres, 0 platos/ }).getAttribute("aria-pressed")) === "true");
  check("CA-11.1 vacío de categoría con Pomo", (await page.locator(".adm-empty", { hasText: "Esta categoría todavía no tiene platos." }).locator(".adm-pomo").count()) === 1);
  await page.locator(".adm-carta__new").click();
  const sheet = page.getByRole("dialog");
  await sheet.waitFor();
  const nameInput = sheet.getByLabel("Nombre", { exact: true });
  await nameInput.waitFor();
  await page.waitForTimeout(200);
  const sel = await page.evaluate(() => {
    const el = document.activeElement;
    return { id: el?.id, v: el?.value, s: el?.selectionStart, e: el?.selectionEnd };
  });
  check("CA-6.13 hoja del plato nuevo con el nombre seleccionado", sel.v === "Nuevo plato" && sel.s === 0 && sel.e === "Nuevo plato".length, JSON.stringify(sel));
  const postres = (await menu()).find((c) => c.name === "Postres");
  const created = postres.menu_items[0];
  check("CA-NR.13 'Nuevo plato', precio 0, orden 0, en Postres", created && created.name === "Nuevo plato" && created.price === 0 && created.sort_order === 0);

  // Validación (CA-7.7)
  await nameInput.fill("");
  await sheet.getByRole("button", { name: "Guardar cambios" }).click();
  check("CA-7.7 nombre vacío: aviso en línea y no se guarda", (await sheet.getByText("El plato necesita un nombre.").count()) === 1 && (await item("Nuevo plato")) !== undefined);
  await nameInput.fill("Flan casero");
  await sheet.getByLabel("Precio").fill("-5");
  await sheet.getByRole("button", { name: "Guardar cambios" }).click();
  check("CA-7.7 precio negativo: aviso y no se guarda", (await sheet.getByText("El precio no puede ser negativo.").count()) === 1 && (await item("Flan casero")) === undefined);
  check("CA-7.7 precio con teclado numérico", (await sheet.getByLabel("Precio").getAttribute("inputmode")) === "numeric");

  // Guardar (CA-NR.16, CA-7.3)
  await sheet.getByLabel("Precio").fill("4500");
  await sheet.getByLabel("Descripción").fill("Con dulce de leche");
  await sheet.getByRole("button", { name: "Guardar cambios" }).click();
  await page.getByText("Guardado").first().waitFor({ timeout: 8000 });
  await sheet.waitFor({ state: "hidden" });
  const flan = await item("Flan casero");
  check("CA-NR.16 se guardan nombre, precio y descripción", flan && flan.price === 4500 && flan.description === "Con dulce de leche");
  const card = page.locator(".adm-dish", { hasText: "Flan casero" });
  check("CA-7.3 la tarjeta muestra nombre y precio nuevos", (await card.count()) === 1 && /4\.500/.test(await card.innerText()));
  check("CA-7.11 al cerrar queda en Carta sin ?plato", new URL(page.url()).pathname === "/admin/menu" && !page.url().includes("plato="), page.url());

  // Descripción vacía -> null
  await card.locator(".adm-dish__open").click();
  await sheet.waitFor();
  await sheet.getByLabel("Descripción").fill("");
  await sheet.getByRole("button", { name: "Guardar cambios" }).click();
  await sheet.waitFor({ state: "hidden" });
  check("CA-NR.16 descripción vacía se guarda como nulo", (await item("Flan casero")).description === null);
}

// ---- Foto (CA-NR.17, CA-7.6) ----
{
  const sheet = page.getByRole("dialog");
  await page.locator(".adm-dish", { hasText: "Flan casero" }).locator(".adm-dish__open").click();
  await sheet.waitFor();
  const file = sheet.locator("input[type=file]");
  check("CA-7.6 el selector acepta solo imágenes", (await file.getAttribute("accept")) === "image/jpeg,image/png,image/webp,image/gif");
  await file.setInputFiles({ name: "nota.txt", mimeType: "text/plain", buffer: Buffer.from("hola") });
  check("CA-7.6 archivo que no es imagen: mensaje claro", (await sheet.getByRole("alert").innerText()).includes("no es una foto"));
  await file.setInputFiles({ name: "grande.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 10) });
  check("CA-7.6 imagen de más de 5 MB: mensaje claro", (await sheet.getByRole("alert").innerText()).includes("más de 5 MB"));
  await file.setInputFiles({ name: "flan.png", mimeType: "image/png", buffer: PNG_1x1 });
  await sheet.locator(".adm-photo__frame img").waitFor({ timeout: 8000 });
  const src = await sheet.locator(".adm-photo__frame img").getAttribute("src");
  check("CA-NR.17 subida: vista previa con la URL del bucket", /menu-photos/.test(src), src);
  check("CA-7.6 botón 'Cambiar foto' con foto cargada", (await sheet.getByRole("button", { name: "Cambiar foto" }).count()) === 1);
  await sheet.getByRole("button", { name: "Guardar cambios" }).click();
  await sheet.waitFor({ state: "hidden" });
  check("CA-NR.17 la URL queda en el plato al guardar", /menu-photos/.test((await item("Flan casero")).photo_url ?? ""));

  // Link pegado no http(s) (RNF-S5) y quitar foto
  await page.locator(".adm-dish", { hasText: "Flan casero" }).locator(".adm-dish__open").click();
  await sheet.waitFor();
  await sheet.getByRole("button", { name: "Pegar un link" }).click();
  await sheet.getByLabel("Link de la foto").fill("javascript:alert(1)");
  await sheet.getByRole("button", { name: "Guardar cambios" }).click();
  check("RNF-S5 link de foto solo http/https", (await sheet.getByText("tiene que empezar con http").count()) === 1 && /menu-photos/.test((await item("Flan casero")).photo_url ?? ""));
  await sheet.getByRole("button", { name: "Quitar foto" }).click();
  await sheet.getByRole("button", { name: "Guardar cambios" }).click();
  await sheet.waitFor({ state: "hidden" });
  check("CA-NR.17 vaciar la URL deja el plato sin foto", (await item("Flan casero")).photo_url === null);
}

// ---- Grupos y opciones (CA-NR.18, CA-NR.19, CA-7.8) ----
{
  const sheet = page.getByRole("dialog").first();
  await page.locator(".adm-dish", { hasText: "Flan casero" }).locator(".adm-dish__open").click();
  await sheet.waitFor();
  await sheet.getByRole("button", { name: "Nuevo grupo" }).click();
  await sheet.getByRole("button", { name: "Crear grupo" }).click();
  check("CA-NR.18 grupo sin nombre no se crea", (await sheet.getByText("Escribí un nombre para el grupo.").count()) === 1);
  await sheet.getByLabel("Nombre del grupo").fill("Salsa");
  await sheet.getByRole("radio", { name: "Varias opciones" }).check();
  const reqSwitch = sheet.getByRole("switch", { name: "Obligatorio" });
  await reqSwitch.click();
  check("CA-7.8 'Obligatorio' es interruptor con estado", (await reqSwitch.getAttribute("aria-checked")) === "true");
  await sheet.getByRole("button", { name: "Crear grupo" }).click();
  const groupInput = sheet.getByLabel("Grupo", { exact: true });
  await groupInput.waitFor({ timeout: 8000 });
  let g = (await item("Flan casero")).item_option_groups[0];
  check("CA-NR.18 grupo creado (varias, obligatorio)", g && g.name === "Salsa" && g.selection_type === "multiple" && g.is_required === true, JSON.stringify(g));
  check("CA-7.8 alta anunciada", (await sheet.locator("[role=status]", { hasText: "Grupo \"Salsa\" creado" }).count()) === 1);
  check("CA-NR.18 sin cambios no hay botón de guardar grupo", (await sheet.getByRole("button", { name: "Guardar grupo" }).count()) === 0);
  await groupInput.fill("Salsas");
  await sheet.getByRole("radio", { name: "Una opción" }).first().check();
  await sheet.getByRole("button", { name: "Guardar grupo" }).click();
  await until(async () => (await item("Flan casero")).item_option_groups[0]?.name === "Salsas");
  g = (await item("Flan casero")).item_option_groups[0];
  check("CA-NR.18 editar nombre y tipo", g.name === "Salsas" && g.selection_type === "single", JSON.stringify(g));

  await sheet.getByLabel("Nueva opción").fill("Dulce de leche");
  await sheet.getByLabel("Extra $").fill("500");
  await sheet.getByRole("button", { name: "Agregar" }).click();
  await sheet.getByText(/Dulce de leche \(\+\$\s500\)/).waitFor({ timeout: 8000 });
  await sheet.getByLabel("Nueva opción").fill("Crema");
  await sheet.getByLabel("Extra $").fill("");
  await sheet.getByRole("button", { name: "Agregar" }).click();
  await sheet.getByText("Crema", { exact: true }).waitFor({ timeout: 8000 });
  g = (await item("Flan casero")).item_option_groups[0];
  const ch = g.item_option_choices.map((c) => `${c.name}:${c.extra_price}`).sort();
  check("CA-NR.19 opciones con extra (vacío = 0)", JSON.stringify(ch) === JSON.stringify(["Crema:0", "Dulce de leche:500"]), JSON.stringify(ch));
  await sheet.getByLabel("Nueva opción").fill("   ");
  await sheet.getByRole("button", { name: "Agregar" }).click();
  await page.waitForTimeout(500);
  check("CA-NR.19 nombre vacío no agrega", (await item("Flan casero")).item_option_groups[0].item_option_choices.length === 2);
  await sheet.getByRole("button", { name: "Eliminar opción Crema" }).click();
  await until(async () => (await item("Flan casero")).item_option_groups[0].item_option_choices.length === 1);
  check("CA-NR.19 eliminar opción sin confirmación", (await item("Flan casero")).item_option_groups[0].item_option_choices.length === 1);
  {
    await until(async () => (await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) === "Eliminar opción Dulce de leche", 2000);
    const f = await page.evaluate(() => ({ label: document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.textContent?.trim(), inSheet: !!document.activeElement?.closest(".adm-sheet") }));
    check("H-AD-1 tras eliminar una opción el foco queda en la hoja (opción vecina)", f.inSheet && f.label === "Eliminar opción Dulce de leche", JSON.stringify(f));
  }
  const delBtn = sheet.getByRole("button", { name: "Eliminar el grupo Salsas" });
  check("CA-13.5 botón de eliminar opción >= 44 px", ((await sheet.getByRole("button", { name: "Eliminar opción Dulce de leche" }).boundingBox()).height) >= 44);
  await delBtn.click();
  const conf = page.getByRole("alertdialog");
  await conf.waitFor();
  check("CA-NR.18 confirmación '¿Eliminar el grupo \"Salsas\"?'", (await conf.innerText()).includes('¿Eliminar el grupo "Salsas"?'));
  check("CA-7.12 foco inicial en Cancelar", await until(async () => (await page.evaluate(() => document.activeElement?.textContent)) === "Cancelar", 2000));
  await conf.getByRole("button", { name: "Cancelar" }).click();
  await conf.waitFor({ state: "hidden" });
  check("CA-NR.18 cancelar no borra", (await item("Flan casero")).item_option_groups.length === 1);
  await delBtn.click();
  await conf.getByRole("button", { name: "Eliminar grupo" }).click();
  await until(async () => (await item("Flan casero")).item_option_groups.length === 0);
  check("CA-NR.18 confirmar borra el grupo", (await item("Flan casero")).item_option_groups.length === 0);
  // Con el build de producción el Escape llegaba mientras la confirmación todavía se cerraba.
  await conf.waitFor({ state: "hidden" });
  {
    await until(async () => (await page.evaluate(() => document.activeElement?.textContent?.trim())) === "Nuevo grupo", 2000);
    const f = await page.evaluate(() => ({ text: document.activeElement?.textContent?.trim(), inSheet: !!document.activeElement?.closest(".adm-sheet"), body: document.activeElement === document.body }));
    check("H-AD-1 tras eliminar un grupo el foco va a 'Nuevo grupo' (no a <body>)", f.inSheet && !f.body && f.text === "Nuevo grupo", JSON.stringify(f));
  }
  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "hidden" });
}

// ---- Hoja: accesibilidad, descarte, Atrás, foco (CA-7.4, 7.9, 7.11) ----
{
  const trigger = page.locator(".adm-dish", { hasText: "Flan casero" }).locator(".adm-dish__open");
  await trigger.focus();
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Flan casero" });
  await sheet.waitFor();
  check("CA-7.9 role=dialog con el nombre del plato", (await sheet.count()) === 1);
  check("CA-7.9 aria-modal", (await sheet.getAttribute("aria-modal")) === "true", String(await sheet.getAttribute("aria-modal")));
  const closeBox = await sheet.getByRole("button", { name: "Cerrar" }).boundingBox();
  check("CA-7.9 botón Cerrar >= 44 px", closeBox.width >= 44 && closeBox.height >= 44);
  check("CA-7.11 la URL refleja la hoja", page.url().includes("plato="));
  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "hidden" });
  await page.waitForTimeout(150);
  const back = await page.evaluate(() => document.activeElement?.closest(".adm-dish")?.textContent ?? "");
  check("CA-7.9 Escape cierra sin cambios y el foco vuelve al plato", back.includes("Flan casero"));

  await trigger.click();
  await sheet.waitFor();
  await sheet.getByLabel("Nombre", { exact: true }).fill("Flan editado");
  await page.keyboard.press("Escape");
  const ask = page.getByRole("alertdialog", { name: "Tenés cambios sin guardar. ¿Descartarlos?" });
  await ask.waitFor();
  check("CA-7.4 Escape con cambios pide confirmar", true);
  await ask.getByRole("button", { name: "Cancelar" }).click();
  await ask.waitFor({ state: "hidden" });
  check("CA-7.4 cancelar conserva lo escrito", (await page.getByRole("dialog").getByLabel("Nombre", { exact: true }).inputValue()) === "Flan editado");
  await page.goBack();
  await ask.waitFor();
  check("CA-7.4 Atrás con cambios pide confirmar", true);
  await ask.getByRole("button", { name: "Descartar" }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.waitForTimeout(300);
  check("CA-7.4 descartar cierra y no guarda", (await item("Flan casero")) !== undefined && new URL(page.url()).pathname === "/admin/menu");

  await trigger.click();
  await sheet.waitFor();
  await page.goBack();
  await sheet.waitFor({ state: "hidden" });
  await page.waitForTimeout(300);
  check("CA-7.11 Atrás cierra la hoja y deja en Carta", new URL(page.url()).pathname === "/admin/menu" && !page.url().includes("plato="), page.url());
  check("CA-6.10 la píldora activa se mantiene", (await page.getByRole("button", { name: /^Postres, 1 plato/ }).getAttribute("aria-pressed")) === "true");
}

// ---- Interruptor (CA-6.6 a CA-6.10, CA-NR.14) ----
{
  await page.getByRole("button", { name: /^Todas, / }).click();
  const sw = page.getByRole("switch", { name: "Disponible: Provoleta" });
  check("CA-6.6 interruptor con rol switch y nombre con el plato", (await sw.getAttribute("aria-checked")) === "true");
  const box = await sw.boundingBox();
  check("CA-13.5 interruptor >= 44x44", box.width >= 44 && box.height >= 44, `${box.width}x${box.height}`);
  await page.route("**/rest/v1/menu_items*", async (route) => {
    if (route.request().method() === "PATCH") await wait(1500);
    await route.continue();
  });
  const before = Number(await stat("Sin stock hoy"));
  await sw.click();
  const instant = await page.evaluate(() => {
    const s = document.querySelector("[aria-label='Disponible: Provoleta']");
    return s.getAttribute("aria-checked");
  });
  const counter = Number(await stat("Sin stock hoy"));
  const serverDuring = (await item("Provoleta")).is_available;
  check("CA-6.7 cambia antes de que responda el servidor (red lenta)", instant === "false" && counter === before + 1 && serverDuring === true, `ui=${instant} contador=${counter} server=${serverDuring}`);
  check("CA-6.6 texto 'Sin stock hoy' en la tarjeta", (await page.locator(".adm-dish", { hasText: "Provoleta" }).locator(".adm-dish__ctrl").innerText()).includes("Sin stock hoy"));
  await until(async () => (await item("Provoleta")).is_available === false);
  check("CA-NR.14 el servidor queda sin stock", (await item("Provoleta")).is_available === false);
  const carta = await (await fetch(`${APP}/m/mesa-1-demo0001`)).text();
  check("CA-NR.14 la carta del cliente ya no lo muestra", !carta.includes("Provoleta"));
  const prov = await item("Provoleta");
  const order = await fetch(`${APP}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ qrToken: "mesa-1-demo0001", items: [{ menuItemId: prov.id, quantity: 1, choiceIds: [] }] }),
  });
  const orderBody = await order.json().catch(() => ({}));
  check("CA-NR.14 pedir ese plato da 409", order.status === 409, `${order.status} ${JSON.stringify(orderBody)}`);
  await sw.click();
  await until(async () => (await item("Provoleta")).is_available === true);
  const carta2 = await (await fetch(`${APP}/m/mesa-1-demo0001`)).text();
  check("CA-NR.14 al volver a Disponible reaparece", carta2.includes("Provoleta"));
  await page.unroute("**/rest/v1/menu_items*");

  // Toques seguidos (CA-6.9)
  await page.route("**/rest/v1/menu_items*", async (route) => {
    if (route.request().method() === "PATCH") await wait(250 + Math.random() * 400);
    await route.continue();
  });
  const emp = page.getByRole("switch", { name: "Disponible: Empanadas (x3)" });
  for (let i = 0; i < 5; i++) {
    await emp.click();
    await page.waitForTimeout(120);
  }
  check("CA-6.9 5 toques: en pantalla queda invertido", (await emp.getAttribute("aria-checked")) === "false");
  await wait(3000);
  check("CA-6.9 tras 3 s el servidor coincide", (await item("Empanadas (x3)")).is_available === false);
  await page.unroute("**/rest/v1/menu_items*");
  await page.reload();
  await page.waitForSelector(".adm-dish");
  check("CA-6.9 tras recargar coincide", (await page.getByRole("switch", { name: "Disponible: Empanadas (x3)" }).getAttribute("aria-checked")) === "false");
  await page.getByRole("switch", { name: "Disponible: Empanadas (x3)" }).click();
  await until(async () => (await item("Empanadas (x3)")).is_available === true);

  // Falla (CA-6.8)
  await fault({ menuItemsWrite: true });
  await page.route("**/rest/v1/menu_items*", async (route) => {
    if (route.request().method() === "PATCH") await wait(800);
    await route.continue();
  });
  const agua = page.getByRole("switch", { name: "Disponible: Agua mineral 500ml" });
  const sinStock0 = await stat("Sin stock hoy");
  await agua.click();
  const flipped = await agua.getAttribute("aria-checked");
  await page.getByText("No se pudo actualizar la disponibilidad").first().waitFor({ timeout: 8000 });
  const reverted = await agua.getAttribute("aria-checked");
  check("CA-6.8 falla: cambia, revierte, avisa y el contador vuelve", flipped === "false" && reverted === "true" && (await stat("Sin stock hoy")) === sinStock0, `${flipped}->${reverted}`);
  check("CA-6.8 el control queda usable", !(await agua.isDisabled()));
  await fault({ menuItemsWrite: false });
  await page.unroute("**/rest/v1/menu_items*");
  await agua.click();
  await until(async () => (await item("Agua mineral 500ml")).is_available === false);
  check("CA-NR.50 se puede reintentar", (await item("Agua mineral 500ml")).is_available === false);
  await agua.click();
  await until(async () => (await item("Agua mineral 500ml")).is_available === true);
}

// ---- Búsqueda (CA-6.11, RNF-S4) ----
{
  const search = page.getByRole("searchbox", { name: "Buscar plato" });
  await search.fill("MILANESA");
  check("CA-6.11 sin distinguir mayúsculas", (await page.locator(".adm-dish").count()) === 1);
  await search.fill("milanésa");
  check("CA-6.11 sin distinguir tildes", (await page.locator(".adm-dish").count()) === 1);
  await search.fill("<img src=x onerror=alert(1)>");
  const empty = page.locator(".adm-empty");
  check("CA-11.1 sin resultados: Pomo + texto", (await empty.locator(".adm-pomo").count()) === 1 && (await empty.innerText()).includes('No encontramos platos con "<img src=x onerror=alert(1)>".'));
  check("RNF-S4 el texto se muestra literal (sin HTML)", (await empty.locator("img").count()) === 0);
  const clear = page.getByRole("button", { name: "Limpiar búsqueda" }).first();
  check("CA-6.11 'Limpiar' >= 44 px", (await clear.boundingBox()).height >= 44);
  await clear.click();
  check("CA-6.11 limpiar vuelve a todo", (await page.locator(".adm-dish").count()) === (await menu()).flatMap((c) => c.menu_items).length);
}

// ---- Eliminar plato (CA-NR.15, CA-7.12) ----
{
  await page.locator(".adm-dish", { hasText: "Flan casero" }).locator(".adm-dish__open").click();
  const sheet = page.getByRole("dialog", { name: "Flan casero" });
  await sheet.waitFor();
  await sheet.getByRole("button", { name: "Eliminar plato" }).click();
  const conf = page.getByRole("alertdialog");
  await conf.waitFor();
  check("CA-NR.15 confirmación '¿Eliminar \"Flan casero\" de la carta?'", (await conf.innerText()).includes('¿Eliminar "Flan casero" de la carta?'));
  check("CA-7.12 foco inicial en Cancelar", await until(async () => (await page.evaluate(() => document.activeElement?.textContent)) === "Cancelar", 2000));
  await page.keyboard.press("Escape");
  await conf.waitFor({ state: "hidden" });
  check("CA-NR.15 cancelar (Escape) no borra y la hoja sigue", (await item("Flan casero")) !== undefined && (await sheet.isVisible()));
  await sheet.getByRole("button", { name: "Eliminar plato" }).click();
  await conf.getByRole("button", { name: "Eliminar plato" }).click();
  await sheet.waitFor({ state: "hidden" });
  await until(async () => (await item("Flan casero")) === undefined);
  check("CA-NR.15 confirmar borra y vuelve a la carta", (await item("Flan casero")) === undefined && (await page.locator(".adm-dish", { hasText: "Flan casero" }).count()) === 0);
}

// ---- Eliminar categoría (CA-NR.12, CA-6.14) ----
{
  await page.getByRole("button", { name: "Más acciones de Postres" }).click();
  await page.getByRole("menuitem", { name: "Eliminar categoría" }).click();
  const conf = page.getByRole("alertdialog");
  await conf.waitFor();
  check("CA-NR.12 texto con recuento", (await conf.innerText()).includes('¿Eliminar la categoría "Postres" y sus 0 platos?'));
  await conf.getByRole("button", { name: "Cancelar" }).click();
  await conf.waitFor({ state: "hidden" });
  check("CA-NR.12 cancelar no cambia nada", (await menu()).some((c) => c.name === "Postres"));
  await page.getByRole("button", { name: "Más acciones de Postres" }).click();
  await page.getByRole("menuitem", { name: "Eliminar categoría" }).click();
  await conf.getByRole("button", { name: "Eliminar categoría" }).click();
  await conf.waitFor({ state: "hidden" });
  await until(async () => !(await menu()).some((c) => c.name === "Postres"));
  check("CA-NR.12 confirmar borra la categoría", !(await menu()).some((c) => c.name === "Postres"));
  await page.locator(".adm-pills", { hasNotText: "Postres" }).waitFor({ timeout: 8000 });
  check("CA-6.3 la píldora desaparece", (await page.getByRole("button", { name: /^Postres,/ }).count()) === 0);
}

// ---- Entrada directa (CA-NR.20) ----
{
  const bife = await item("Bife de chorizo");
  await page.goto(`${APP}/admin/menu/${bife.id}`);
  const sheet = page.getByRole("dialog", { name: "Bife de chorizo" });
  await sheet.waitFor();
  const groups = await sheet.getByLabel("Grupo", { exact: true }).count();
  check("CA-NR.20 /admin/menu/<id> abre la edición completa", groups === bife.item_option_groups.length && groups > 0, `grupos=${groups}`);
  await sheet.getByRole("button", { name: "Cerrar" }).click();
  await sheet.waitFor({ state: "hidden" });
  check("CA-7.11 cerrar deja en Carta", new URL(page.url()).pathname === "/admin/menu" && !page.url().includes("plato="), page.url());
  const r404 = await page.goto(`${APP}/admin/menu/00000000-0000-4000-8000-000000000000`);
  check("CA-NR.20 id inexistente: 404", r404.status() === 404, String(r404.status()));
  const bItem = (await menu("22222222-2222-4222-8222-222222222222")).flatMap((c) => c.menu_items)[0];
  if (bItem) {
    const rB = await page.goto(`${APP}/admin/menu/${bItem.id}`);
    const html = await page.content();
    check("CA-NR.20 plato de otro restaurante: 404 sin datos", rB.status() === 404 && !html.includes(bItem.name), String(rB.status()));
  } else {
    note("restaurante B: no se encontró su plato por REST pública (id de restaurante distinto); se omite");
  }
}

// ---- Error de carga (CA-11.5) ----
{
  await fault({ categories: true });
  await page.goto(`${APP}/admin/menu`);
  await page.getByText("No pudimos cargar la carta").waitFor({ timeout: 10000 });
  const html = await page.content();
  check("CA-11.5 error distinto del vacío", !html.includes("Tu carta está vacía") && (await page.locator(".adm-empty[role=alert] .adm-pomo[data-face=oops]").count()) === 1);
  check("CA-11.5 el menú sigue usable", await page.locator(".adm-side a[href='/admin/mesas']").isVisible());
  check("RNF-S3 sin detalle técnico", !html.includes("fault injected") && !html.includes("XX000"));
  await fault({ categories: false });
  await page.evaluate(() => (window.__noReload = 2));
  await page.getByRole("button", { name: "Reintentar" }).click();
  await page.locator(".adm-dish").first().waitFor({ timeout: 10000 });
  check("CA-11.5 Reintentar trae la carta sin recargar la página", (await page.evaluate(() => window.__noReload)) === 2);
}
// Solo con next dev: el indicador de errores de desarrollo tapa los clics.
await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((n) => n.remove()));

// ---- Cerrar sesión escritorio (CA-NR.02) ----
{
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL("**/login**", { timeout: 10000 });
  await page.goto(`${APP}/admin`);
  check("CA-NR.02 tras cerrar sesión /admin pide login", new URL(page.url()).pathname === "/login", page.url());
}
await ctx.close();

// ======================================================================
// Celular 360x640
// ======================================================================
{
  const m = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  const p = await m.newPage();
  await login(p, "admin@demo.test", "/admin/menu");
  await p.waitForSelector(".adm-dish");
  check("CA-5.3 sin menú lateral", !(await p.locator(".adm-side").isVisible()));
  const tabs = await p.locator(".adm-tabbar a").allTextContents();
  check("CA-5.3 4 pestañas Inicio/Carta/Mesas/Estilo", JSON.stringify(tabs.map((t) => t.trim())) === JSON.stringify(["Inicio", "Carta", "Mesas", "Estilo"]), JSON.stringify(tabs));
  check("CA-5.6 pestaña Carta activa", (await p.locator(".adm-tabbar [aria-current='page']").innerText()).includes("Carta"));
  // La píldora activa entra con adm-pop (scale 0.94 -> 1): medir con las animaciones terminadas.
  await p.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime !== Infinity).map((a) => a.finished.catch(() => {}))));
  for (const sel of [".adm-tabbar a", ".adm-pill", ".adm-dish .adm-switch", ".adm-fab", ".adm-account-btn"]) {
    const boxes = await p.locator(sel).evaluateAll((els) => els.filter((e) => e.offsetParent || e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }));
    const small = boxes.filter(([w, h]) => w < 44 || h < 44);
    check(`CA-13.5 ${sel} >= 44x44`, boxes.length > 0 && small.length === 0, `${boxes.length} medidos, chicos=${JSON.stringify(small)}`);
  }
  // Menú de cuenta
  await p.locator(".adm-account-btn").click();
  const menuPop = p.getByRole("menu");
  await menuPop.waitFor();
  const txt = await menuPop.innerText();
  check("CA-5.3 menú de cuenta: nombre, rol, Cocina, Salón, Cerrar sesión", /Admin/.test(txt) && /El Buen Sabor/.test(txt) && /Cocina/.test(txt) && /Salón/.test(txt) && /Cerrar sesión/.test(txt), txt.replace(/\n/g, " / "));
  await p.keyboard.press("Escape");
  // El último plato no queda tapado (CA-5.4)
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await p.waitForTimeout(300);
  const covered = await p.evaluate(() => {
    const items = [...document.querySelectorAll(".adm-dish")];
    const last = items[items.length - 1];
    const r = last.getBoundingClientRect();
    const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 6], [r.right - 4, r.bottom - 6]];
    return pts.map(([x, y]) => last.contains(document.elementFromPoint(x, y)));
  });
  check("CA-5.4 el último plato queda visible sobre la barra y el +", covered.every(Boolean), JSON.stringify(covered));
  // Hoja inferior
  await p.locator(".adm-dish", { hasText: "Provoleta" }).locator(".adm-dish__open").click();
  const sheet = p.getByRole("dialog", { name: "Provoleta" });
  await sheet.waitFor();
  await p.waitForTimeout(400);
  const sb = await sheet.boundingBox();
  const save = await sheet.getByRole("button", { name: "Guardar cambios" }).boundingBox();
  check("CA-7.1 hoja inferior pegada abajo", Math.abs(sb.y + sb.height - 640) < 2 && sb.width === 360, JSON.stringify(sb));
  check("CA-7.10 'Guardar cambios' a la vista al pie", save.y + save.height <= 640 && save.y > 400, JSON.stringify(save));
  await p.goBack();
  await sheet.waitFor({ state: "hidden" });
  check("CA-7.11 Atrás cierra la hoja en celular", new URL(p.url()).pathname === "/admin/menu");
  // Cerrar sesión desde el menú de cuenta
  await p.locator(".adm-account-btn").click();
  await p.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  await p.waitForURL("**/login**", { timeout: 10000 });
  check("CA-NR.02 cerrar sesión desde el celular", new URL(p.url()).pathname === "/login");
  await m.close();
}

await browser.close();
process.exitCode = summary() ? 1 : 0;
