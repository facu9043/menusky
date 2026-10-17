// QA A: intento de provocar app/{kitchen,floor}/error.tsx cortando la base (mock) con la sesion ya abierta, y probar "Reintentar" al volver.
// Paso 1 (este script, fase "antes"): login y guarda storageState en el scratch. El corte y la reanudacion del mock los hace el operador (taskkill / node server.mjs).
// Uso: FASE=login|cortado|vuelta STATE=<archivo> TOOLS_DIR=.. APP_URL=.. MOCK_URL=.. node A-error-intento.mjs
import { launch, login, check, note, summary, APP } from "../../../design/cocina-salon/evidencia/lib-staff.mjs";
const b = await launch();
const FASE = process.env.FASE, STATE = process.env.STATE;
const route = process.env.ROUTE ?? "/kitchen";
if (FASE === "login") {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await login(p, route === "/kitchen" ? "cocina@demo.test" : "mozo@demo.test", route);
  await ctx.storageState({ path: STATE });
  note(`sesion guardada en ${STATE}`);
} else if (FASE === "cortado") {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, storageState: STATE });
  const p = await ctx.newPage();
  const resp = await p.goto(APP + route, { waitUntil: "load" }).catch((e) => ({ status: () => "ERR " + e.message }));
  await p.waitForTimeout(2500);
  const t = await p.evaluate(() => document.body.textContent.replace(/\s+/g, " "));
  note(`con la base cortada: status ${resp.status?.()} url ${p.url()} texto: ${t.slice(0, 300)}`);
  check("error: se ve 'No pudimos cargar ...' y 'Reintentar' (no un tablero vacio)", /No pudimos cargar/.test(t) && /Reintentar/.test(t));
  check("error: 'Puede ser la conexión o un problema del servicio.'", /Puede ser la conexión o un problema del servicio\./.test(t));
  check("error: sin detalles tecnicos (message/stack/digest)", !/TypeError|fetch failed|ECONNREFUSED|digest|at \w+ \(/.test(t));
  check("error: role=alert", (await p.locator('[role="alert"]').count()) >= 1);
  await p.screenshot({ path: `docs/qa/capturas/cocina-salon/error-${route.slice(1)}-1280x800.png` });
  await ctx.storageState({ path: STATE + ".2" });
} else if (FASE === "vuelta") {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, storageState: STATE });
  const p = await ctx.newPage();
  // se vuelve a abrir la pagina con la base ya arriba: debe cargar normal (no queda pegado el error)
  await p.goto(APP + route, { waitUntil: "load" });
  await p.waitForTimeout(2000);
  const t = await p.evaluate(() => document.body.textContent.replace(/\s+/g, " "));
  check("tras volver la base, la pagina carga el tablero", !/No pudimos cargar/.test(t) && new RegExp(route === "/kitchen" ? "Cocina" : "Salón").test(t));
}
await b.close();
summary();
