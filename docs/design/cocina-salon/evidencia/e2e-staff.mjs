// e2e de Cocina y Salón sobre el build de producción y el Supabase simulado (tiempo real del mock).
// Uso: TOOLS_DIR=... APP_URL=http://127.0.0.1:3422 MOCK_URL=http://127.0.0.1:3421 node docs/design/cocina-salon/evidencia/e2e-staff.mjs
import { launch, login, check, note, summary, APP, resetMock, mockEvent, CHIME_COUNTER, waitFor, toastText, tokenFor, rest } from "./lib-staff.mjs";

const browser = await launch();
const newPage = async (viewport = { width: 1280, height: 800 }) => {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce" });
  await ctx.addInitScript(CHIME_COUNTER);
  return { ctx, page: await ctx.newPage() };
};
const chimes = (page) => page.evaluate(() => window.__chimes);
const live = (page) => page.evaluate(() => [...document.querySelectorAll(".st-root [aria-live].sr-only")].map((r) => r.textContent).filter(Boolean).join(" | "));
const txt = async (loc) => (await loc.textContent()).replace(/\s+/g, " ").trim();
const card = (page, mesa) => page.locator("article.st-order", { has: page.locator(".st-order__table", { hasText: new RegExp(`^${mesa}$`) }) });

// ======================= COCINA =======================
note("== Cocina (cocina@demo.test) ==");
await resetMock();
{
  const { ctx, page } = await newPage();
  await login(page, "cocina@demo.test", "/kitchen");
  await page.waitForSelector("h1");
  check("K.1 h1 'Cocina' y 'restaurante · persona'", (await page.locator("h1").textContent()) === "Cocina" && /El Buen Sabor · Cocina Demo/.test(await page.locator(".st-title__who").textContent()));
  const f = await page.evaluate(() => ({ body: getComputedStyle(document.body).fontFamily, root: getComputedStyle(document.querySelector(".st-root")).fontFamily, dark: !!document.querySelector(".dark"), h1: getComputedStyle(document.querySelector("h1")).fontFamily }));
  check("K.2 cuerpo en Geist, h1 en Bricolage, sin .dark (CA-1.2, CA-1.5)", f.body.startsWith("Geist") && f.root.startsWith("Geist") && /Bricolage/.test(f.h1) && !f.dark, JSON.stringify(f));
  const nav = await page.locator(".st-nav a").allTextContents();
  check("K.3 navegación del rol cocina: solo 'Cocina', activa, con pendientes", nav.length === 1 && nav[0].startsWith("Cocina") && (await page.locator(".st-nav a[aria-current=page]").count()) === 1 && /\(hay pendientes\)/.test(nav[0]), JSON.stringify(nav));
  check("K.4 persona, rol y 'Cerrar sesión' en el encabezado", (await page.locator(".st-who__name").textContent()) === "Cocina Demo" && (await page.locator(".st-who__role").textContent()) === "Cocina" && (await page.locator(".st-logout").innerText()).includes("Cerrar sesión"));
  check("K.5 región aria-live vacía al cargar (no anuncia el tablero) y sin sonido al cargar", (await live(page)) === "" && (await chimes(page)) === 0);
  const m1 = card(page, "Mesa 1");
  check("K.6 pedido received: 'Tomar pedido', sin píldora, nombre accesible con la mesa", (await m1.locator("button").getAttribute("aria-label")) === "Tomar pedido, Mesa 1" && (await m1.locator(".st-chip").count()) === 0);
  const m2 = card(page, "Mesa 2");
  check("K.7 pedido in_kitchen: píldora 'En preparación' y 'Marcar listo'", (await m2.locator(".st-chip").textContent()) === "En preparación" && (await m2.locator("button").innerText()).includes("Marcar listo"));
  check("K.8 'Cuenta de la mesa hoy: $ ...', renglón 'N× nombre', nota entre comillas", /^Cuenta de la mesa hoy: \$\s?[\d.]+$/.test((await m1.locator(".st-order__bill").innerText()).replace(/ /g, " ")) && /^1× Empanadas \(x3\)$/.test(await m1.locator(".st-item__line").first().innerText()) && (await m1.locator(".st-item__note").textContent()) === "“Sin cebolla”");

  // Pedido nuevo por tiempo real
  await mockEvent({ type: "new_order", table: "Mesa 3", items: [{ name: "Provoleta", quantity: 2, note: "Bien dorada" }] });
  const m3 = card(page, "Mesa 3");
  const arr = await waitFor(async () => (await m3.count()) === 1);
  check("K.9 pedido nuevo aparece sin recargar (<= 5 s)", arr.ok && arr.ms <= 5000, `${arr.ms} ms`);
  check("K.10 etiqueta 'Nuevo' visible con reduced-motion (CA-8.1, CA-5.2)", (await m3.locator(".st-new").isVisible()) && (await m3.locator(".st-new").innerText()) === "Nuevo");
  await waitFor(async () => (await chimes(page)) > 0, 2000);
  check("K.11 suena el aviso al llegar el pedido (CA-NR.7)", (await chimes(page)) === 1, `osciladores: ${await chimes(page)}`);
  check("K.12 anuncio 'Pedido nuevo: Mesa 3' (CA-5.1)", (await live(page)) === "Pedido nuevo: Mesa 3", await live(page));
  check("K.13 sin toast al llegar un pedido en cocina (K-12)", (await toastText(page)) === "", await toastText(page));
  check("K.14 0 animaciones con reduce tras llegar el pedido (CA-6.2)", (await page.evaluate(() => document.getAnimations().length)) === 0);

  // Tomar pedido -> En preparación -> Marcar listo
  await m3.locator("button", { hasText: "Tomar pedido" }).click();
  await waitFor(async () => /Pedido en preparación/.test(await toastText(page)));
  check("K.15 'Tomar pedido' -> toast 'Pedido en preparación'", /Pedido en preparación/.test(await toastText(page)));
  check("K.16 queda 'En preparación' + 'Marcar listo' y se quita 'Nuevo'", (await m3.locator(".st-chip").textContent()) === "En preparación" && (await m3.locator("button").getAttribute("aria-label")) === "Marcar listo, Mesa 3" && (await m3.locator(".st-new").count()) === 0);
  check("K.17 0 animaciones con reduce tras tocar 'Tomar pedido'", (await page.evaluate(() => document.getAnimations().length)) === 0);
  await m3.locator("button", { hasText: "Marcar listo" }).click();
  const gone = await waitFor(async () => (await m3.count()) === 0);
  check("K.18 'Marcar listo' -> toast 'Pedido listo' y sale del tablero", gone.ok && /Pedido listo/.test(await toastText(page)));

  // Error de actualización
  await page.route("**/rest/v1/orders**", (r) => (r.request().method() === "PATCH" ? r.fulfill({ status: 500, contentType: "application/json", body: '{"message":"x"}' }) : r.continue()));
  await m1.locator("button").click();
  await waitFor(async () => /No se pudo actualizar el pedido/.test(await toastText(page)));
  check("K.19 error: toast 'No se pudo actualizar el pedido', sigue 'Tomar pedido' y se puede volver a tocar", /No se pudo actualizar el pedido/.test(await toastText(page)) && (await m1.locator("button").isEnabled()) && (await m1.locator("button").innerText()).includes("Tomar pedido"));
  await page.unroute("**/rest/v1/orders**");

  // R-2
  await page.goto(`${APP}/floor`);
  await page.waitForLoadState("networkidle");
  check("K.20 cocina en /floor termina en /kitchen (R-2)", new URL(page.url()).pathname === "/kitchen");
  await page.goto(`${APP}/admin`);
  check("K.21 cocina en /admin ve 'Esta sección es solo para administradores' con marca y 'Cerrar sesión'", (await page.locator("h1").textContent()) === "Esta sección es solo para administradores" && (await page.locator(".st-deny button").innerText()).includes("Cerrar sesión") && (await page.locator(".st-root.ms-brand").count()) === 1);
  await ctx.close();
}

// ======================= SALÓN =======================
note("== Salón (mozo@demo.test) ==");
await resetMock();
{
  const { ctx, page } = await newPage();
  await login(page, "mozo@demo.test", "/floor");
  await page.waitForSelector("h1");
  const nav = await page.locator(".st-nav a").allTextContents();
  check("F.1 h1 'Salón'; navegación del rol mozo: solo 'Salón' con pendientes", (await page.locator("h1").textContent()) === "Salón" && nav.length === 1 && nav[0].startsWith("Salón") && /\(hay pendientes\)/.test(nav[0]), JSON.stringify(nav));
  const h2 = (await page.locator("h2.st-h2").allTextContents()).map((t) => t.replace(/\s+/g, " ").trim());
  check("F.2 títulos con contador: 'Llamados de mozo · 1', 'Listos para llevar · 1', 'Mesas'", JSON.stringify(h2) === JSON.stringify(["Llamados de mozo · 1", "Listos para llevar · 1", "Mesas"]), JSON.stringify(h2));
  const tiles = await page.locator(".st-table").evaluateAll((els) => els.map((e) => `${e.querySelector(".st-table__name").textContent}=${e.querySelector(".st-table__state").textContent}`));
  check("F.3 mesas con estado en texto: Mesa 1 Con pedido, Mesa 2 Llamando, Mesa 3 Listo (prioridad F-7)", tiles.join(",") === "Mesa 1=Con pedido,Mesa 2=Llamando,Mesa 3=Listo", tiles.join(","));
  const call2 = page.locator(".st-call", { hasText: "Mesa 2" });
  check("F.4 llamado: motivo · hora y 'Cuenta de hoy' solo con 'Pide la cuenta'", /^Pide la cuenta · /.test(await call2.locator(".st-call__why").innerText()) && /^Cuenta de hoy: \$/.test(await call2.locator(".st-call__bill").innerText()));
  const r3 = card(page, "Mesa 3");
  check("F.5 listo para llevar sin notas, botón 'Entregado, Mesa 3'", (await r3.locator(".st-item__note").count()) === 0 && (await r3.locator("button").getAttribute("aria-label")) === "Entregado, Mesa 3");
  check("F.6 sin anuncios ni sonido al cargar", (await live(page)) === "" && (await chimes(page)) === 0);

  // Llamado nuevo
  await mockEvent({ type: "waiter_call", table: "Mesa 3", reason: "consulta" });
  const c3 = page.locator(".st-call", { hasText: "Mesa 3" });
  const arr = await waitFor(async () => (await c3.count()) === 1);
  check("F.7 llamado nuevo aparece sin recargar (<= 5 s)", arr.ok && arr.ms <= 5000, `${arr.ms} ms`);
  await waitFor(async () => /Una mesa está llamando al mozo/.test(await toastText(page)), 3000);
  check("F.8 toast 'Una mesa está llamando al mozo' + aviso sonoro", /Una mesa está llamando al mozo/.test(await toastText(page)) && (await chimes(page)) === 1, `osciladores ${await chimes(page)}`);
  check("F.9 anuncio 'Llamado de Mesa 3: Tiene una consulta'", (await live(page)) === "Llamado de Mesa 3: Tiene una consulta", await live(page));
  check("F.10 contador sube a 'Llamados de mozo · 2' y Mesa 3 pasa a 'Llamando'", (await txt(page.locator("#h-llamados"))) === "Llamados de mozo · 2" && (await page.locator(".st-table", { hasText: "Mesa 3" }).locator(".st-table__state").innerText()) === "Llamando");
  await c3.locator("button").click();
  const g = await waitFor(async () => (await c3.count()) === 0);
  check("F.11 'Atendido' -> toast 'Llamado atendido', desaparece y el contador baja", g.ok && /Llamado atendido/.test(await toastText(page)) && (await txt(page.locator("#h-llamados"))) === "Llamados de mozo · 1");

  // Pedido listo por tiempo real (otro dispositivo)
  await mockEvent({ type: "order_status", table: "Mesa 1", status: "ready" });
  const r1 = card(page, "Mesa 1");
  const ar = await waitFor(async () => (await r1.count()) === 1);
  check("F.12 pedido 'ready' aparece en 'Listos para llevar' sin recargar, con 'Nuevo'", ar.ok && (await r1.locator(".st-new").isVisible()), `${ar.ms} ms`);
  check("F.13 anuncio 'Pedido listo: Mesa 1' y contador 'Listos para llevar · 2'", /Pedido listo: Mesa 1/.test(await live(page)) && (await txt(page.locator("#h-listos"))) === "Listos para llevar · 2", await live(page));
  await r1.locator("button").click();
  const gd = await waitFor(async () => (await r1.count()) === 0);
  check("F.14 'Entregado' -> toast 'Pedido entregado' y desaparece", gd.ok && /Pedido entregado/.test(await toastText(page)));

  // Pedido nuevo (received): suena aunque no se vea en Salón (F-9)
  const before = await chimes(page);
  await mockEvent({ type: "new_order", table: "Mesa 2", items: [{ name: "Provoleta", quantity: 1 }] });
  await waitFor(async () => (await chimes(page)) > before, 4000);
  check("F.15 pedido nuevo 'received' hace sonar el aviso en Salón (F-9)", (await chimes(page)) === before + 1);
  check("F.16 0 animaciones con reduce tras llegadas y acciones (CA-6.2)", (await page.evaluate(() => document.getAnimations().length)) === 0);

  // Errores
  await page.route("**/rest/v1/waiter_calls**", (r) => (r.request().method() === "PATCH" ? r.fulfill({ status: 500, contentType: "application/json", body: '{"message":"x"}' }) : r.continue()));
  await call2.locator("button").click();
  await waitFor(async () => /No se pudo marcar como atendido/.test(await toastText(page)));
  check("F.17 error de 'Atendido': toast 'No se pudo marcar como atendido' y el llamado sigue", /No se pudo marcar como atendido/.test(await toastText(page)) && (await call2.count()) === 1 && (await call2.locator("button").isEnabled()));
  await page.route("**/rest/v1/orders**", (r) => (r.request().method() === "PATCH" ? r.fulfill({ status: 500, contentType: "application/json", body: '{"message":"x"}' }) : r.continue()));
  await r3.locator("button").click();
  await waitFor(async () => /No se pudo marcar como entregado/.test(await toastText(page)));
  check("F.18 error de 'Entregado': toast 'No se pudo marcar como entregado' y la tarjeta sigue", /No se pudo marcar como entregado/.test(await toastText(page)) && (await r3.count()) === 1);
  await page.unrouteAll();

  await page.goto(`${APP}/kitchen`);
  await page.waitForLoadState("networkidle");
  check("F.19 mozo en /kitchen termina en /floor sin ver cocina (R-2)", new URL(page.url()).pathname === "/floor" && (await page.locator("h1").textContent()) === "Salón");
  await ctx.close();
}

// ======================= ADMIN, celular, cerrar sesión =======================
note("== Admin y celular ==");
await resetMock();
{
  const { ctx, page } = await newPage();
  await login(page, "admin@demo.test", "/kitchen");
  await page.goto(`${APP}/kitchen`);
  await page.waitForSelector("h1");
  check("A.1 admin en /kitchen sin redirección", new URL(page.url()).pathname === "/kitchen");
  const nav = await page.locator(".st-nav a").evaluateAll((as) => as.map((a) => `${a.textContent}${a.getAttribute("aria-current") ? "*" : ""}`));
  check("A.2 admin ve Cocina (activa), Salón y Admin; pendientes en Cocina y Salón", nav.join(",") === "Cocina(hay pendientes)*,Salón(hay pendientes),Admin", nav.join(","));
  await page.goto(`${APP}/floor`);
  check("A.3 admin en /floor sin redirección", new URL(page.url()).pathname === "/floor");
  await ctx.close();

  const m = await newPage({ width: 390, height: 844 });
  await login(m.page, "admin@demo.test", "/floor");
  await m.page.goto(`${APP}/floor`);
  await m.page.waitForSelector("h1");
  check("A.4 celular: sin banda de paneles; botón de cuenta con punto", !(await m.page.locator(".st-nav").isVisible()) && (await m.page.locator(".adm-account-btn .adm-dot").count()) === 1);
  await m.page.locator(".adm-account-btn").click();
  await m.page.waitForSelector(".st-menu");
  const items = await m.page.locator(".st-menu .adm-menu__item").evaluateAll((as) => as.map((a) => `${a.textContent}${a.getAttribute("aria-current") ? "*" : ""}`));
  const meta = await m.page.locator(".st-menu .adm-menu__meta").textContent();
  check("A.5 menú de cuenta: nombre, 'Admin · El Buen Sabor', paneles con '(hay pendientes)', 'Cerrar sesión'", meta === "Admin · El Buen Sabor" && items.join(",") === "Cocina(hay pendientes),Salón(hay pendientes)*,Admin,Cerrar sesión", `${meta} | ${items.join(",")}`);
  await m.page.locator(".st-menu .adm-menu__item", { hasText: "Cocina" }).click();
  await m.page.waitForURL((u) => u.pathname === "/kitchen");
  check("A.6 desde el menú se pasa a Cocina (2 toques)", new URL(m.page.url()).pathname === "/kitchen");
  await m.page.locator(".adm-account-btn").click();
  await m.page.locator(".st-menu .adm-menu__item", { hasText: "Cerrar sesión" }).click();
  await m.page.waitForURL((u) => u.pathname.startsWith("/login"), { timeout: 15000 });
  check("A.7 'Cerrar sesión' lleva a /login", new URL(m.page.url()).pathname === "/login");
  await m.page.goBack().catch(() => {});
  await m.page.waitForTimeout(2500);
  check("A.8 volver atrás pide login (CA-2.1)", new URL(m.page.url()).pathname === "/login", m.page.url());
  await m.ctx.close();
}

// ======================= Sin fila de staff, sin mesas, temas =======================
note("== Sin staff, vacíos y temas ==");
await resetMock();
{
  const { ctx, page } = await newPage();
  await login(page, "sinstaff@demo.test", "/kitchen");
  await page.goto(`${APP}/kitchen`);
  check("S.1 sin fila de staff: 'Tu cuenta no está vinculada a ningún restaurante' + staff_users + 'Cerrar sesión'", (await page.locator("h1").textContent()) === "Tu cuenta no está vinculada a ningún restaurante" && (await page.locator(".st-deny__text code").textContent()) === "staff_users" && (await page.locator(".st-deny button").innerText()).includes("Cerrar sesión"));
  check("S.2 sin Pomo en la pantalla sin permiso (CA-8.8)", (await page.locator(".adm-pomo").count()) === 0);
  await ctx.close();

  // Tema del restaurante: no cambia el aspecto (CA-1.3)
  const adminTok = await tokenFor("admin@demo.test");
  const k = await newPage();
  await login(k.page, "cocina@demo.test", "/kitchen");
  await k.page.goto(`${APP}/kitchen`);
  await k.page.waitForSelector("h1");
  const shotA = await k.page.screenshot();
  const rid = (await rest(adminTok, "GET", "staff_users?select=restaurant_id")).body[0].restaurant_id;
  const themes = (await rest(adminTok, "GET", `restaurants?id=eq.${rid}&select=theme`)).body[0].theme;
  const p = await rest(adminTok, "PATCH", `restaurants?id=eq.${rid}`, { theme: { ...(themes ?? {}), accentPrimary: "#0EA5C9", accentSecondary: "#0B2A3B", style: "brutal" } });
  await k.page.reload();
  await k.page.waitForSelector("h1");
  const shotB = await k.page.screenshot();
  check("S.3 con otro tema guardado (Glaciar/brutal) la Cocina se ve idéntica (CA-1.3)", p.status < 300 && Buffer.compare(shotA, shotB) === 0, `PATCH ${p.status}; capturas ${shotA.length}/${shotB.length} bytes`);

  // Sin mesas: borra las mesas del restaurante A (cascada a pedidos y llamados)
  const del = await rest(adminTok, "DELETE", `tables?restaurant_id=eq.${rid}`);
  await k.page.reload();
  await k.page.waitForSelector("h1");
  check("S.4 Cocina vacía: Pomo + 'No hay pedidos pendientes.' (CA-8.8, CA-NR.9)", (await k.page.locator(".st-empty .adm-pomo[aria-hidden=true]").count()) === 1 && (await k.page.locator(".st-empty__text").textContent()) === "No hay pedidos pendientes.", `DELETE ${del.status}`);
  await k.ctx.close();
  const f = await newPage();
  await login(f.page, "mozo@demo.test", "/floor");
  await f.page.goto(`${APP}/floor`);
  await f.page.waitForSelector("h1");
  check("S.5 Salón sin mesas: solo 'Mesas' con 'Todavía no hay mesas.' (CA-8.7, F-3)", JSON.stringify(await f.page.locator("h2.st-h2").allTextContents()) === '["Mesas"]' && (await f.page.locator(".st-empty__text").textContent()) === "Todavía no hay mesas." && (await f.page.locator(".adm-pomo").count()) === 0);
  await f.ctx.close();
}

await browser.close();
await resetMock();
process.exitCode = summary() ? 1 : 0;
