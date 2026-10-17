// SEC-CS-01: códigos HTTP de /kitchen y /floor por rol (HTML y RSC), sin seguir redirecciones, y que la
// pantalla de carga siga apareciendo para el rol correcto. Build de producción + mock.
// Uso: TOOLS_DIR=... APP_URL=... MOCK_URL=... node docs/design/cocina-salon/evidencia/sec-cs-01/redirect-check.mjs
import { launch, login, check, note, summary, APP, resetMock } from "../lib-staff.mjs";

await resetMock();
const browser = await launch();
const MARKS = { kitchen: "Cargando los pedidos", floor: "Cargando el salón" };

async function probe(request, who, route) {
  const out = {};
  for (const kind of ["HTML", "RSC"]) {
    const headers = kind === "RSC" ? { RSC: "1" } : {};
    let r = await request.get(`${APP}${route}`, { maxRedirects: 0, headers });
    // Next 16 primero manda el pedido RSC a la misma ruta con ?_rsc= (307 propio del protocolo RSC, no de
    // la app); se sigue ESE paso para medir la respuesta real de la ruta.
    const l = r.headers()["location"] ?? "";
    if (kind === "RSC" && r.status() === 307 && l.startsWith(`${route}?_rsc`)) r = await request.get(`${APP}${l}`, { maxRedirects: 0, headers });
    const body = await r.text();
    out[kind] = { status: r.status(), loc: r.headers()["location"] ?? "-", body };
    note(`${kind.padEnd(4)} ${who.padEnd(6)} ${route.padEnd(8)} -> ${r.status()} loc=${out[kind].loc} | meta-refresh=${/__next-page-redirect/.test(body) ? "sí" : "no"} | "Cargando los pedidos"=${body.includes(MARKS.kitchen) ? "sí" : "no"} | "Cargando el salón"=${body.includes(MARKS.floor) ? "sí" : "no"} | "El Buen Sabor"=${body.includes("El Buen Sabor") ? "sí" : "no"} | "Cocina"=${body.includes("Cocina") ? "sí" : "no"} | "Salón"=${body.includes("Salón") ? "sí" : "no"} | ${body.length} bytes`);
  }
  return out;
}

// Anónimo
{
  const ctx = await browser.newContext();
  const r = await probe(ctx.request, "anon", "/kitchen");
  check("anon /kitchen -> 307 a /login?redirect=%2Fkitchen (proxy.ts, como hoy)", r.HTML.status === 307 && r.HTML.loc.includes("/login?redirect=%2Fkitchen"));
  const f = await probe(ctx.request, "anon", "/floor");
  check("anon /floor -> 307 a /login?redirect=%2Ffloor", f.HTML.status === 307 && f.HTML.loc.includes("/login?redirect=%2Ffloor"));
  await ctx.close();
}

for (const [email, who] of [["mozo@demo.test", "mozo"], ["cocina@demo.test", "cocina"], ["admin@demo.test", "admin"], ["sinstaff@demo.test", "sinstaff"]]) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, email, "/kitchen");
  const k = await probe(ctx.request, who, "/kitchen");
  const f = await probe(ctx.request, who, "/floor");
  if (who === "mozo") {
    // El cuerpo de un 307 no se muestra; trae solo el árbol del router de Next (donde figura el título del
    // loading de Cocina como dato, no como HTML). Se exige que no haya HTML del esqueleto ni datos.
    check("mozo /kitchen -> 307 Location /floor (HTML), sin esqueleto ni datos de cocina; RSC sin esqueleto ni datos", k.HTML.status === 307 && k.HTML.loc.endsWith("/floor") && !k.HTML.body.includes(MARKS.kitchen) && !k.HTML.body.includes("El Buen Sabor") && !k.RSC.body.includes(MARKS.kitchen) && !k.RSC.body.includes("El Buen Sabor"));
    check("mozo /floor -> 200 con su pantalla de carga en el stream y sus datos", f.HTML.status === 200 && f.HTML.body.includes(MARKS.floor) && f.HTML.body.includes("El Buen Sabor"));
  }
  if (who === "cocina") {
    check("cocina /floor -> 307 Location /kitchen (HTML), sin esqueleto ni datos de salón; RSC sin esqueleto ni datos", f.HTML.status === 307 && f.HTML.loc.endsWith("/kitchen") && !f.HTML.body.includes(MARKS.floor) && !f.HTML.body.includes("El Buen Sabor") && !f.RSC.body.includes(MARKS.floor) && !f.RSC.body.includes("El Buen Sabor"));
    check("cocina /kitchen -> 200 con su pantalla de carga en el stream y sus datos", k.HTML.status === 200 && k.HTML.body.includes(MARKS.kitchen) && k.HTML.body.includes("El Buen Sabor"));
  }
  if (who === "admin") {
    check("admin /kitchen y /floor -> 200 sin redirección, con su pantalla de carga y datos", k.HTML.status === 200 && f.HTML.status === 200 && k.HTML.body.includes(MARKS.kitchen) && f.HTML.body.includes(MARKS.floor) && k.HTML.body.includes("El Buen Sabor") && f.HTML.body.includes("El Buen Sabor"));
  }
  if (who === "sinstaff") {
    check("sin fila de staff /kitchen y /floor -> 200 con 'Tu cuenta no está vinculada...' y sin esqueleto", k.HTML.status === 200 && f.HTML.status === 200 && k.HTML.body.includes("Tu cuenta no está vinculada a ningún restaurante") && f.HTML.body.includes("Tu cuenta no está vinculada a ningún restaurante") && !k.HTML.body.includes(MARKS.kitchen) && !f.HTML.body.includes(MARKS.floor));
  }
  // En el navegador: termina en el panel correcto
  await page.goto(`${APP}/kitchen`);
  await page.waitForLoadState("domcontentloaded");
  const endK = new URL(page.url()).pathname;
  await page.goto(`${APP}/floor`);
  await page.waitForLoadState("domcontentloaded");
  const endF = new URL(page.url()).pathname;
  const want = { mozo: ["/floor", "/floor"], cocina: ["/kitchen", "/kitchen"], admin: ["/kitchen", "/floor"], sinstaff: ["/kitchen", "/floor"] }[who];
  check(`${who}: navegador en /kitchen termina en ${want[0]} y en /floor termina en ${want[1]}`, endK === want[0] && endF === want[1], `${endK} ${endF}`);
  await ctx.close();
}

// Sin JavaScript: el mozo no ve nada de cocina (sin meta refresh ni esqueleto)
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  const js = await browser.newContext();
  const lp = await js.newPage();
  await login(lp, "mozo@demo.test", "/floor");
  await ctx.addCookies(await js.cookies());
  const seen = [];
  page.on("response", (r) => seen.push(`${r.status()} ${new URL(r.url()).pathname}`));
  await page.goto(`${APP}/kitchen`);
  const text = await page.locator("body").innerText();
  check("sin JS: mozo en /kitchen termina en /floor de una (307) y nunca ve 'Cocina'", new URL(page.url()).pathname === "/floor" && seen[0] === "307 /kitchen" && !text.includes("Cargando los pedidos"), seen.slice(0, 2).join(", "));
  await js.close();
  await ctx.close();
}

await browser.close();
await resetMock();
process.exitCode = summary() ? 1 : 0;
