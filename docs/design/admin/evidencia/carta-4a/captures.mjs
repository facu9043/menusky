// Capturas de autoverificación de la parte 4a para el Director.
// Salida: docs/design/admin/capturas/. Uso: TOOLS_DIR=... node captures.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch, login, APP, MOCK, resetMock } from "./lib.mjs";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../capturas");
const fault = (body) => fetch(`${MOCK}/__fault`, { method: "POST", body: JSON.stringify(body) });
const SIZES = [
  [1440, 900],
  [390, 844],
  [360, 640],
];

await resetMock();
await fault({ categories: false, menuItemsWrite: false });
const browser = await launch();

for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce", deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await login(page, "admin@demo.test", "/admin/menu");
  await page.waitForSelector(".adm-dish");
  await page.evaluate(() => document.fonts.ready);
  const shot = async (name, full = false) => {
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, `${name}-${tag}.png`), fullPage: full });
  };

  await shot("carta");
  if (w < 768) await shot("carta-completa", true);

  // Hoja de edición abierta (plato con opciones)
  await page.locator(".adm-dish", { hasText: "Bife de chorizo" }).locator(".adm-dish__open").click();
  await page.getByRole("dialog").waitFor();
  await shot("carta-hoja");
  if (w < 768) {
    await page.getByRole("dialog").locator(".adm-sheet__body").evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await shot("carta-hoja-opciones");
  }
  // Confirmación propia
  await page.getByRole("dialog").getByRole("button", { name: "Eliminar plato" }).click();
  await page.getByRole("alertdialog").waitFor();
  await shot("carta-confirmar");
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("alertdialog").waitFor({ state: "hidden" });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });

  // Estado vacío (búsqueda sin resultados, con Pomo)
  await page.getByRole("searchbox", { name: "Buscar plato" }).fill("sushi");
  await page.locator(".adm-empty").waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot("carta-vacia");
  await page.getByRole("searchbox", { name: "Buscar plato" }).fill("");

  if (w < 768) {
    // Menú de cuenta
    await page.locator(".adm-account-btn").click();
    await page.getByRole("menu").waitFor();
    await shot("shell-cuenta");
    await page.keyboard.press("Escape");
  }

  // Error de carga
  await fault({ categories: true });
  await page.goto(`${APP}/admin/menu`);
  await page.getByText("No pudimos cargar la carta").waitFor();
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((n) => n.remove()));
  await shot("carta-error");
  await fault({ categories: false });

  // Pantallas que siguen con su componente actual hasta la parte 4b
  await page.goto(`${APP}/admin`);
  await page.locator("h1").waitFor();
  await shot("inicio-provisorio");
  await page.goto(`${APP}/admin/mesas`);
  await page.locator("h1").waitFor();
  await shot("mesas-provisorio");
  await ctx.close();
}

await browser.close();
console.log(`capturas en ${OUT}`);
