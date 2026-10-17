// SEC-AF-01 (Frontend). Adaptado de docs/security/evidencia/admin-final-2026-10-10/rol-admin-rsc.mjs.txt.
// Para mozo, cocina y admin, en las 5 rutas del admin: carga directa (HTML), petición RSC "plana"
// (rsc: 1, árbol completo) y la petición RSC real de una navegación de cliente capturada al admin.
// Uso: TOOLS_DIR=<carpeta con playwright> APP_URL=http://127.0.0.1:3420 MOCK_URL=http://127.0.0.1:3421 node rol-admin-rsc.mjs
import { createRequire } from "node:module";
import path from "node:path";
const req = createRequire(path.resolve("package.json"));
const pw = createRequire(path.join(process.env.TOOLS_DIR, "package.json"))("playwright");
const { createServerClient } = req("@supabase/ssr");
const MOCK = process.env.MOCK_URL ?? "http://127.0.0.1:3421", APP = process.env.APP_URL ?? "http://127.0.0.1:3420", ANON = "mock-anon-key";
await fetch(MOCK + "/__mock/reset", { method: "POST" });
const itemId = (await (await fetch(`${MOCK}/rest/v1/menu_items?select=id&name=eq.Provoleta`, { headers: { apikey: ANON, authorization: `Bearer ${ANON}` } })).json())[0].id;
const ROUTES = ["/admin", "/admin/menu", "/admin/mesas", "/admin/apariencia", `/admin/menu/${itemId}`];
// Datos de cada página: carta (platos, disponibilidad), mesas (qr), tema, contador sin stock de Inicio.
// El id del plato NO cuenta como dato: está en la URL que pidió el propio cliente y Next lo repite.
const DATA = /Provoleta|Limonada|mesa-\d-demo\d+|qrToken|qr_token|accentPrimary|isAvailable|outOfStock|liveOk/;
async function login(email) {
  const jar = new Map();
  const s = createServerClient(MOCK, ANON, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (l) => l.forEach(({ name, value }) => jar.set(name, value)) } });
  const { error } = await s.auth.signInWithPassword({ email, password: "demo-1234" });
  if (error) throw error;
  return [...jar];
}
// 1) Capturar las peticiones RSC de navegación de cliente del admin (4 rutas con enlace en el shell).
const adminJar = await login("admin@demo.test");
const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM_EXE });
const ctx = await browser.newContext();
await ctx.addCookies(adminJar.map(([name, value]) => ({ name, value, domain: "127.0.0.1", path: "/" })));
const page = await ctx.newPage();
const captured = new Map();
page.on("request", (r) => { const h = r.headers(); const p = new URL(r.url()).pathname; if (h["rsc"] && ROUTES.includes(p) && !h["next-router-prefetch"] && !captured.has(p)) captured.set(p, { url: r.url(), headers: h }); });
for (const [from, target] of [["/admin", "/admin/menu"], ["/admin", "/admin/mesas"], ["/admin", "/admin/apariencia"], ["/admin/menu", "/admin"]]) {
  await page.goto(APP + from, { waitUntil: "networkidle" });
  await page.evaluate((t) => { [...document.querySelectorAll(`a[href="${t}"]`)][0].click(); }, target);
  await page.waitForURL((u) => u.pathname === target, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
}
await browser.close();
console.log(`peticiones RSC de navegación capturadas (admin): ${captured.size} -> ${[...captured.keys()].join(", ")}`);
// 2) Repetir con la cookie de cada rol.
let fails = 0, leaks = 0, checks = 0;
for (const who of ["mozo@demo.test", "cocina@demo.test", "admin@demo.test"]) {
  const cookie = (await login(who)).map(([k, v]) => `${k}=${v}`).join("; ");
  const isAdmin = who.startsWith("admin");
  for (const p of ROUTES) {
    const modes = [["directa", { cookie }], ["RSC-plana", { cookie, rsc: "1" }]];
    const c = captured.get(p);
    if (c) {
      const h = { cookie, rsc: c.headers["rsc"], "next-router-state-tree": c.headers["next-router-state-tree"] };
      if (c.headers["next-url"]) h["next-url"] = c.headers["next-url"];
      modes.push(["RSC-nav", h]);
    }
    for (const [mode, headers] of modes) {
      let r = await fetch(APP + p + (mode === "RSC-nav" ? new URL(c.url).search : ""), { redirect: "manual", headers });
      // RSC-plana: Next responde 307 a la misma ruta con el ?_rsc= correcto; se sigue una vez con los mismos encabezados.
      if (mode === "RSC-plana" && r.status === 307) { const loc = r.headers.get("location"); console.log(`     (307 -> ${loc})`); r = await fetch(new URL(loc, APP), { redirect: "manual", headers }); }
      const body = await r.text();
      const data = body.match(DATA);
      const notAdmin = /solo para administradores/.test(body);
      const isItem = p.startsWith("/admin/menu/");
      let ok;
      if (!isAdmin) { ok = !data && (mode !== "directa" || notAdmin); if (data) leaks++; }
      // Admin: ve sus datos y nunca NotAdminAccess; /admin/menu/<id> redirige a /admin/menu?plato=<id>.
      else ok = !notAdmin && (isItem ? (r.headers.get("location") ?? body).includes(`plato=${itemId}`) : !!data);
      checks++; if (!ok) fails++;
      console.log(`${ok ? "OK  " : "FAIL"} ${mode.padEnd(9)} ${who.padEnd(17)} ${(isItem ? "/admin/menu/<id>" : p).padEnd(18)} -> ${r.status} | NotAdminAccess=${notAdmin} | datos: ${data ? data[0] : "no"} | ${body.length} bytes`);
    }
  }
}
console.log(`\n${checks - fails} OK, ${fails} FAIL | respuestas de mozo/cocina con datos de la página: ${leaks}`);
