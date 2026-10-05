// Capturas del paso 4b para el Director (1440x900 y 390x844), desde el build de producción.
// Salida: docs/design/admin/capturas/{inicio,apariencia,estado}-*.png
// Uso: TOOLS_DIR=... APP_URL=... MOCK_URL=<proxy> node captures.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch, login, APP, resetMock } from "../carta-4a/lib.mjs";
import { fault, NO_FAULTS, emptyRestaurantB, wait } from "./lib4b.mjs";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../capturas");
const only = process.argv[2]; // opcional: prefijo para rehacer solo algunas
const done = [];

await resetMock();
await fault(NO_FAULTS);
const browser = await launch();

async function session(w, h, email = "admin@demo.test", start = "/admin") {
  const mobile = w < 768;
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
    hasTouch: mobile,
    isMobile: mobile,
  });
  const page = await ctx.newPage();
  await login(page, email, start);
  return { ctx, page };
}
async function shot(page, name, tag, full = false) {
  if (only && !name.startsWith(only)) return;
  await page.evaluate(() => document.fonts.ready);
  await wait(300);
  const file = `${name}-${tag}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage: full });
  done.push(file);
}
/** Navegación del lado del cliente (con el menú), para ver el esqueleto de loading.tsx. */
async function softNav(page, href) {
  await page.locator(`a[href='${href}']:visible`).last().click();
}

for (const [w, h] of [
  [1440, 900],
  [390, 844],
]) {
  const tag = `${w}x${h}`;

  // ---------- Restaurante A ----------
  await resetMock();
  let { ctx, page } = await session(w, h);
  await page.waitForSelector(".adm-kpis");
  await shot(page, "inicio", tag, w < 768);

  await page.goto(`${APP}/admin/apariencia`);
  await page.waitForSelector(".adm-presets");
  await shot(page, "apariencia", tag, true);

  // Hex inválido + aviso de contraste
  const hex = page.getByLabel("Acento secundario (navegación, tabs)", { exact: true });
  await page.getByLabel("Texto secundario", { exact: true }).fill("#C9B8AE");
  await hex.fill("#FFC2");
  await hex.blur();
  await hex.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await shot(page, "apariencia-hex-invalido", tag);

  // Inicio con un dato que falló (la carta): "Platos sin stock" muestra el error
  await fault({ categories: true });
  await page.goto(`${APP}/admin`);
  await page.waitForSelector(".adm-kpi__err");
  await shot(page, "inicio-error-parcial", tag);

  // Inicio: no se pudo leer nada (carta + instantánea)
  await fault({ categories: true, calls: true });
  await page.goto(`${APP}/admin`);
  await page.getByText("No pudimos cargar el resumen").waitFor();
  await shot(page, "estado-inicio-error", tag);

  // Carta y Mesas: error de lectura (ya construidos)
  await fault({ ...NO_FAULTS, categories: true });
  await page.goto(`${APP}/admin/menu`);
  await page.getByText("No pudimos cargar la carta").waitFor();
  await shot(page, "estado-carta-error", tag);
  await fault({ ...NO_FAULTS, tables: true });
  await page.goto(`${APP}/admin/mesas`);
  await page.getByText("No pudimos cargar las mesas").waitFor();
  await shot(page, "estado-mesas-error", tag);

  // Apariencia: no se pudo leer el tema
  await fault({ ...NO_FAULTS, theme: true });
  await page.goto(`${APP}/admin/apariencia`);
  await page.getByText("No pudimos cargar el tema").waitFor();
  await shot(page, "estado-apariencia-error", tag);
  await fault(NO_FAULTS);

  // Esqueletos de carga (lecturas demoradas, navegación del cliente)
  for (const [from, href, name] of [
    ["/admin/menu", "/admin", "estado-inicio-cargando"],
    ["/admin", "/admin/apariencia", "estado-apariencia-cargando"],
    ["/admin", "/admin/menu", "estado-carta-cargando"],
    ["/admin", "/admin/mesas", "estado-mesas-cargando"],
  ]) {
    await page.goto(`${APP}${from}`);
    await page.waitForSelector(".adm-page");
    await wait(1500); // que termine el prefetch de los enlaces
    await fault({ delay: 4000 });
    await softNav(page, href);
    await page.waitForSelector(".adm-page[aria-busy='true']", { timeout: 4000 });
    await shot(page, name, tag);
    await fault({ delay: 0 });
    await page.waitForSelector(".adm-page:not([aria-busy])", { timeout: 15000 });
  }

  // Carta: búsqueda sin resultados; Mesas: filtro sin resultados (ya construidos)
  await page.goto(`${APP}/admin/menu`);
  await page.waitForSelector(".adm-dish");
  await page.getByRole("searchbox").first().fill("sushi");
  await page.getByText('No encontramos platos con "sushi".').waitFor();
  await shot(page, "estado-carta-busqueda", tag);
  await page.goto(`${APP}/admin/mesas?filtro=libres`);
  await page.getByText("No hay mesas libres ahora.").waitFor();
  await shot(page, "estado-mesas-filtro", tag);
  await ctx.close();

  // ---------- Restaurante B vaciado para la prueba ----------
  await resetMock();
  await emptyRestaurantB({ menu: false, tables: ["Mesa 1", "Mesa 2"] });
  ({ ctx, page } = await session(w, h, "admin-b@demo.test"));
  await page.waitForSelector(".adm-kpis");
  await shot(page, "estado-inicio-sin-pedidos", tag, w < 768);
  await ctx.close();

  await resetMock();
  await emptyRestaurantB({ menu: true });
  ({ ctx, page } = await session(w, h, "admin-b@demo.test", "/admin/menu"));
  await page.getByText("Tu carta está vacía").waitFor();
  await shot(page, "estado-carta-vacia", tag);
  await page.goto(`${APP}/admin/mesas`);
  await page.getByText("Todavía no hay mesas.").waitFor();
  await shot(page, "estado-mesas-vacio", tag);
  await ctx.close();
}

await fault(NO_FAULTS);
await resetMock();
await browser.close();
console.log(`${done.length} capturas en docs/design/admin/capturas/:`);
for (const f of done) console.log(`  ${f}`);
