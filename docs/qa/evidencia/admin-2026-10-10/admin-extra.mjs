// QA 5b: verificaciones propias que las suites del Frontend no cubren (CA-5.1, CA-4.3/4.6/NR.40, RNF-S4 en mesas/categoria,
// CA-11.7 sin conexion, CA-13.7/13.8, CA-13.5 y CA-5.10 en 768, CA-13.9 sin emojis, RNF-S7 cabeceras, RNF-S1 service_role).
// Uso: TOOLS_DIR=... APP_URL=... MOCK_URL=<proxy> node admin-extra.mjs   (desde la raiz del repo)
import { launch, login, APP, resetMock, check, note, summary } from "../../../design/admin/evidencia/carta-4a/lib.mjs";
import { noHScroll } from "../../../design/admin/evidencia/inicio-apariencia-4b/lib4b.mjs";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const SHOTS = "docs/qa/capturas/admin";
await resetMock();
const browser = await launch();
const ctx = async (w, h, o = {}) => browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1024, isMobile: w < 768, ...o });
const colors = (p) => p.evaluate(() => {
  const g = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).backgroundColor : null; };
  return { body: getComputedStyle(document.querySelector(".adm-root")).backgroundColor, side: g(".adm-side"), active: g(".adm-side [aria-current='page']"), h1: getComputedStyle(document.querySelector("h1")).color };
});
const hasBg = (page, rgb) => page.evaluate((c) => [...document.querySelectorAll("*")].some((x) => getComputedStyle(x).backgroundColor === c), rgb);

// --- tema: MenuSky por defecto (theme null) -> Galaxia
{
  const c = await ctx(1440, 900); const p = await c.newPage();
  await login(p, "admin@demo.test", "/admin/apariencia");
  await p.waitForSelector(".adm-preset");
  const active0 = await p.locator(".adm-preset[data-active] .adm-preset__name").allTextContents();
  check("CA-4.3 theme nulo: MenuSky figura activo en Apariencia", active0.join() === "MenuSky", active0.join());
  const c0 = await colors(p);
  const pm = await c.newPage(); await pm.goto(`${APP}/m/mesa-1-demo0001`, { waitUntil: "networkidle" });
  check("CA-4.3 /m con theme nulo usa el fondo MenuSky #FFF5E1", await hasBg(pm, "rgb(255, 245, 225)"));
  await pm.close();
  await p.locator(".adm-preset", { hasText: "Galaxia" }).getByRole("button", { name: "Usar este tema" }).click();
  await p.getByText("Tema aplicado").first().waitFor();
  await p.waitForTimeout(600);
  const c1 = await colors(p);
  check("CA-5.1 con tema Galaxia el admin conserva sus colores (fondo, menú lateral, ítem activo, h1)", JSON.stringify(c0) === JSON.stringify(c1), JSON.stringify(c0) + " -> " + JSON.stringify(c1));
  check("CA-5.1 colores del admin = MenuSky (fondo bun, menú patty, activo cheddar)", c1.body === "rgb(255, 245, 225)" && c1.side === "rgb(43, 23, 16)" && c1.active === "rgb(255, 194, 26)", JSON.stringify(c1));
  const af = await p.evaluate(() => getComputedStyle(document.querySelector("h1")).fontFamily + " || " + getComputedStyle(document.querySelector("main")).fontFamily);
  check("CA-5.1 títulos en Bricolage Grotesque y cuerpo Geist", /Bricolage/i.test(af.split("||")[0]) && /Geist/i.test(af.split("||")[1]), af);
  const pm2 = await c.newPage(); await pm2.goto(`${APP}/m/mesa-1-demo0001`, { waitUntil: "networkidle" });
  check("CA-NR.40/4.6 tras aplicar Galaxia la carta del cliente ya no usa el fondo MenuSky", !(await hasBg(pm2, "rgb(255, 245, 225)")));
  await pm2.screenshot({ path: `${SHOTS}/extra-m-tema-galaxia-1440x900.png` });
  await p.screenshot({ path: `${SHOTS}/extra-apariencia-con-galaxia-1440x900.png` });
  await p.locator(".adm-preset", { hasText: "MenuSky" }).getByRole("button", { name: "Usar este tema" }).click();
  await p.getByText("Tema aplicado").first().waitFor();
  await c.close();
}
// --- RNF-S4 en categoria y mesa (texto literal)
{
  const c = await ctx(1440, 900); const p = await c.newPage();
  const dialogs = []; p.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss(); });
  await login(p, "admin@demo.test", "/admin/mesas");
  const evil = `<img src=x onerror=alert(1)>"><script>alert(2)</script>`;
  await p.getByRole("button", { name: "Nueva mesa" }).first().click();
  await p.getByLabel("Nombre de la mesa").fill(evil);
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1500);
  check("RNF-S4 mesa con nombre HTML se ve literal (sin <img> ni <script> inyectados)", (await p.locator("main img[src='x']").count()) === 0 && (await p.locator("main script").count()) === 0 && (await p.getByText(evil, { exact: false }).count()) > 0, `dialogs=${dialogs.length}`);
  await p.goto(`${APP}/admin/menu`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Categoría/ }).last().click();
  await p.getByRole("textbox").first().fill(evil);
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1500);
  check("RNF-S4 categoría con nombre HTML se ve literal", (await p.locator("main img[src='x']").count()) === 0 && (await p.getByText(evil, { exact: false }).count()) > 0);
  check("RNF-S4 no se disparó ningún alert()", dialogs.length === 0, JSON.stringify(dialogs));
  await c.close();
}
// --- sin conexion (CA-11.7)
{
  const c = await ctx(390, 844); const p = await c.newPage();
  await login(p, "admin@demo.test", "/admin/mesas");
  await p.waitForTimeout(1500);
  await c.setOffline(true);
  await p.evaluate(() => window.dispatchEvent(new Event("offline")));
  await p.waitForTimeout(1500);
  const off = await p.locator("body").innerText();
  check("CA-11.7 Offline: aviso persistente 'Sin conexión'", /Sin conexión/i.test(off), off.replace(/\s+/g, " ").match(/Sin conexi[^.]{0,60}/i)?.[0] ?? "no aparece");
  await p.screenshot({ path: `${SHOTS}/extra-offline-390x844.png` });
  await c.setOffline(false);
  await p.evaluate(() => window.dispatchEvent(new Event("online")));
  await p.waitForTimeout(2500);
  check("CA-11.7 al volver la red el aviso desaparece", !/Sin conexión/i.test(await p.locator("body").innerText()));
  await c.close();
}
// --- zoom 200% (1280x720 equivale a 640x360 css px) y horizontal
{
  const c = await ctx(640, 360); const p = await c.newPage();
  await login(p, "admin@demo.test", "/admin");
  const res = [];
  for (const r of ["/admin", "/admin/menu", "/admin/mesas", "/admin/apariencia"]) { await p.goto(APP + r, { waitUntil: "networkidle" }); res.push(`${r}:${await noHScroll(p)}`); }
  check("CA-13.7/13.8 640x360 (zoom 200% de 1280x720 / celular horizontal): sin scroll horizontal en las 4 pantallas", res.every((x) => x.endsWith("true")), res.join(" "));
  await p.goto(APP + "/admin/menu", { waitUntil: "networkidle" });
  const bar = await p.evaluate(() => { const t = document.querySelector(".adm-tabbar"); const r = t?.getBoundingClientRect(); return r ? Math.round(r.height) : null; });
  check("CA-13.8 la barra inferior no se come la pantalla (<= 90 px de 360)", bar !== null && bar <= 90, `${bar}px`);
  await p.screenshot({ path: `${SHOTS}/extra-carta-640x360.png` });
  await c.close();
}
// --- tablet 768x1024
{
  const c = await ctx(768, 1024); const p = await c.newPage();
  await login(p, "admin@demo.test", "/admin/menu");
  const measure = async () => { await p.waitForTimeout(900); return measure0(); };
  const measure0 = () => p.evaluate(() => [...document.querySelectorAll("main button, main a, [role=switch], nav a, nav button")].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return { n: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.w < 44 || x.h < 44));
  const s1 = await measure();
  check("CA-13.5 768x1024 (táctil): controles visibles de Carta >= 44x44", s1.length === 0, JSON.stringify(s1).slice(0, 400));
  await p.screenshot({ path: `${SHOTS}/extra-carta-768x1024.png` });
  await p.goto(`${APP}/admin/mesas`, { waitUntil: "networkidle" });
  const s2 = await measure();
  check("CA-13.5 768x1024 (táctil): controles visibles de Mesas >= 44x44", s2.length === 0, JSON.stringify(s2).slice(0, 400));
  for (const r of ["/admin", "/admin/menu", "/admin/mesas", "/admin/apariencia"]) { await p.goto(APP + r, { waitUntil: "networkidle" }); check(`CA-5.10 768x1024 ${r} sin scroll horizontal`, await noHScroll(p)); }
  await c.close();
}
// --- CA-13.9 sin emojis + RNF-S7
{
  const c = await ctx(1440, 900); const p = await c.newPage();
  await login(p, "admin@demo.test", "/admin");
  const EM = /\p{Extended_Pictographic}/u; const found = [];
  for (const r of ["/admin", "/admin/menu", "/admin/mesas", "/admin/apariencia"]) { await p.goto(APP + r, { waitUntil: "networkidle" }); const t = await p.evaluate(() => document.body.textContent); if (EM.test(t)) found.push(r); }
  check("CA-13.9 sin emojis en el texto de las 4 pantallas", found.length === 0, found.join());
  const hs = {};
  for (const r of ["/admin", "/kitchen", "/floor", "/m/mesa-1-demo0001"]) { const h = (await fetch(APP + r, { redirect: "manual" })).headers; hs[r] = ["x-frame-options", "x-content-type-options", "referrer-policy", "content-security-policy"].map((k) => (h.get(k) ? 1 : 0)).join(""); }
  note("cabeceras (xfo,xcto,refpol,csp): " + JSON.stringify(hs));
  check("RNF-S7 cabeceras de seguridad presentes e iguales en /admin, /kitchen, /floor y /m", Object.values(hs).every((v) => v === hs["/admin"]) && hs["/admin"].slice(0, 3) === "111", JSON.stringify(hs));
  await c.close();
}
// --- RNF-S1 service_role en el build
{
  let hits = 0;
  const walk = (d) => { for (const f of readdirSync(d)) { const fp = join(d, f); if (statSync(fp).isDirectory()) walk(fp); else if (/\.(js|html|css|json|txt)$/.test(f) && /service_role/i.test(readFileSync(fp, "utf8"))) { hits++; note("service_role en " + fp); } } };
  walk(".next/static");
  check("RNF-S1 'service_role' en .next/static = 0", hits === 0, `${hits} archivos`);
}
await browser.close();
process.exit(summary() ? 1 : 0);
