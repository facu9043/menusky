// Capturas de Mesas para el Director (1440x900 y 390x844), desde el build de producción.
// Salida: docs/design/admin/capturas/mesas-*.png. Uso: TOOLS_DIR=... APP_URL=... MOCK_URL=... node mesas-captures.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch, login, MOCK, resetMock } from "../carta-4a/lib.mjs";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../capturas");
const H = { apikey: "mock-anon-key", "content-type": "application/json" };

await resetMock();
// Una mesa libre más, para que se vean los tres estados (libre, ocupada, llamando).
{
  const t = await (await fetch(`${MOCK}/auth/v1/token?grant_type=password`, { method: "POST", headers: H, body: JSON.stringify({ email: "admin@demo.test", password: "demo-1234" }) })).json();
  await fetch(`${MOCK}/rest/v1/tables`, {
    method: "POST",
    headers: { ...H, Authorization: `Bearer ${t.access_token}` },
    body: JSON.stringify({ restaurant_id: "11111111-1111-4111-8111-111111111111", label: "Mesa 4", qr_token: "mesa-4-capt0004" }),
  });
}
const browser = await launch();
for (const [w, h] of [
  [1440, 900],
  [390, 844],
]) {
  const tag = `${w}x${h}`;
  const mobile = w < 768;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce", deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage();
  await login(page, "admin@demo.test", "/admin/mesas");
  await page.waitForSelector(".adm-table");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].filter((i) => i.getClientRects().length).every((i) => i.complete));
  const shot = async (name, full = false) => {
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, `${name}-${tag}.png`), fullPage: full });
  };

  await shot("mesas");
  if (mobile) {
    await page.locator(".adm-table__row", { hasText: "Mesa 2" }).click();
    await page.getByRole("dialog").waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll(".adm-sheet img")].every((i) => i.complete));
    await shot("mesas-hoja");
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar mesa" }).click();
  } else {
    await page.locator(".adm-table", { hasText: "Mesa 4" }).getByRole("button", { name: "Más acciones de Mesa 4" }).click();
    await page.getByRole("menuitem", { name: "Eliminar mesa" }).click();
  }
  await page.getByRole("alertdialog").waitFor();
  await shot("mesas-confirmar");
  await page.keyboard.press("Escape");
  await page.getByRole("alertdialog").waitFor({ state: "hidden" });
  if (mobile) {
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
  }

  await page.getByRole("button", { name: "Imprimir todos" }).click();
  await page.getByRole("button", { name: "Imprimir", exact: true }).waitFor({ timeout: 15000 });
  await shot("mesas-imprimir");
  if (!mobile) {
    // Cómo sale en papel: medio "print" emulado (solo la hoja, fondo blanco, QR negros).
    await page.emulateMedia({ media: "print" });
    await shot("mesas-imprimir-salida", true);
    await page.emulateMedia({ media: "screen" });
  }
  await ctx.close();
}
await browser.close();
await resetMock();
console.log(`capturas en ${OUT}`);
