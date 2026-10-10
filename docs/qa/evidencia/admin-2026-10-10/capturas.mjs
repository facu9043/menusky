// QA 5b: capturas del admin (build de produccion, sin distintivo de next dev) en docs/qa/capturas/admin/.
// Uso: TOOLS_DIR=... APP_URL=... MOCK_URL=<proxy> node capturas.mjs   (desde la raiz del repo)
import { launch, login, APP, resetMock } from "../../../design/admin/evidencia/carta-4a/lib.mjs";
const OUT = "docs/qa/capturas/admin";
await resetMock();
const browser = await launch();
let n = 0;
for (const [w, h] of [[1440, 900], [390, 844], [360, 640]]) {
  const mobile = w < 768;
  const c = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile });
  const p = await c.newPage();
  await login(p, "admin@demo.test", "/admin");
  const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/${name}-${w}x${h}.png` }); n++; };
  await shot("inicio");
  await p.goto(`${APP}/admin/menu`, { waitUntil: "networkidle" }); await shot("carta");
  await p.getByRole("button", { name: /^Editar / }).first().click().catch(async () => { await p.getByLabel(/^Editar /).first().click(); });
  await p.waitForSelector("[role=dialog]"); await shot("carta-hoja");
  await p.keyboard.press("Escape"); await p.waitForTimeout(500);
  await p.goto(`${APP}/admin/mesas`, { waitUntil: "networkidle" }); await shot("mesas");
  if (mobile) { await p.locator(".adm-table__row").first().click(); await p.waitForSelector("[role=dialog]"); await shot("mesas-hoja"); await p.keyboard.press("Escape"); }
  await p.goto(`${APP}/admin/mesas?imprimir=1`, { waitUntil: "networkidle" }); await shot("mesas-imprimir");
  await p.goto(`${APP}/admin/apariencia`, { waitUntil: "networkidle" }); await shot("apariencia");
  if (mobile) { await p.goto(`${APP}/admin`, { waitUntil: "networkidle" }); await p.locator(".adm-account-btn").click(); await shot("menu-cuenta"); }
  await c.close();
}
console.log(`${n} capturas en ${OUT}`);
await browser.close();
