// QA-AD-02: investiga el FAIL intermitente "axe Carta vacia 360: document-title" de quality-4b.
// Carga /admin/menu (carta vacia, restaurante B) N veces y lee document.title apenas aparece el estado vacio.
// Uso: TOOLS_DIR=... APP_URL=... MOCK_URL=<proxy> node probe-titulo.mjs [N]
import { launch, login, APP, resetMock } from "../../../design/admin/evidencia/carta-4a/lib.mjs";
import { emptyRestaurantB } from "../../../design/admin/evidencia/inicio-apariencia-4b/lib4b.mjs";
const N = Number(process.argv[2] ?? 20);
await resetMock(); await emptyRestaurantB({ menu: true });
const browser = await launch();
let empty = 0; const seen = [];
for (const [w, h] of [[360, 640], [1440, 900]]) {
  let e = 0;
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768, isMobile: w < 768 });
    const p = await ctx.newPage();
    await login(p, "admin-b@demo.test", "/admin/menu");
    await p.getByText("Tu carta está vacía").waitFor();
    const t0 = await p.title();
    if (!t0) { e++; await p.waitForTimeout(1500); seen.push(`${w}px intento ${i + 1}: titulo vacio al aparecer el estado vacio; 1,5 s despues: "${await p.title()}"`); }
    await ctx.close();
  }
  console.log(`${w}x${h}: ${e}/${N} cargas con document.title vacio en el momento en que aparece 'Tu carta esta vacia'`);
}
seen.forEach((s) => console.log(s));
await browser.close();
