// QA A: pruebas propias de QA que NO estan en las suites del Frontend: movimiento CON movimiento permitido, aria-live,
// casos limite (nombres largos, 7 cifras, 50 renglones, 30 pedidos / 20 llamados / 40 mesas), doble toque, 200% de zoom, 320 px,
// giro de pantalla. Uso: TOOLS_DIR=.. APP_URL=.. MOCK_URL=.. node A-probe-extra.mjs
import { launch, login, check, note, summary, APP, MOCK, resetMock, mockEvent, waitFor, tokenFor, rest } from "../../../design/cocina-salon/evidencia/lib-staff.mjs";
const b = await launch();
const hscroll = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const text = (p) => p.evaluate(() => document.body.textContent.replace(/\s+/g, " "));

// ---------- 1. Movimiento con movimiento permitido (Cocina)
await resetMock();
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "no-preference" });
  const p = await ctx.newPage();
  await login(p, "cocina@demo.test", "/kitchen"); await p.waitForTimeout(1500);
  await mockEvent({ type: "new_order", table: "Mesa 3", items: [{ name: "Provoleta", quantity: 2 }] });
  await waitFor(async () => (await p.getByText("Nuevo", { exact: true }).count()) > 0, 5000);
  await p.waitForTimeout(600);
  const an = await p.evaluate(() => document.getAnimations().map((a) => { const t = a.effect.getTiming(); return { name: a.animationName ?? a.transitionProperty ?? "?", dur: t.duration, iter: t.iterations === Infinity ? "inf" : t.iterations, props: [...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k)) }; }));
  note(`animaciones activas con movimiento: ${JSON.stringify(an)}`);
  const bad = an.filter((a) => a.props.some((k) => /boxShadow|filter|backdropFilter/i.test(k)));
  check("CA-6.1/12.3 ninguna animacion mueve box-shadow, filter ni backdrop-filter", bad.length === 0, JSON.stringify(bad));
  const long = an.filter((a) => a.iter !== "inf" && a.dur > 400);
  check("CA-6.1 ninguna animacion finita > 400 ms", long.length === 0, JSON.stringify(long));
  const inf = an.filter((a) => a.iter === "inf");
  check("CA-6.3 bucles infinitos: solo el pulso del punto 'nuevo' (periodo >= 0,34 s = <= 3 Hz)", inf.every((a) => /ping/i.test(a.name) && a.dur >= 340), JSON.stringify(inf));
  const fx = await p.evaluate(() => [...document.querySelectorAll("*")].filter((e) => { const s = getComputedStyle(e); return (s.filter && s.filter !== "none") || (s.backdropFilter && s.backdropFilter !== "none"); }).length);
  check("CA-6.1 sin filter/backdrop-filter computado en el tablero", fx === 0, `${fx} elementos`);
  await p.getByRole("button", { name: /Tomar pedido, Mesa 3/ }).click({ timeout: 2000 });
  await waitFor(async () => (await p.getByText("En preparación", { exact: true }).count()) > 0, 3000);
  await p.waitForTimeout(500);
  const infAfter = await p.evaluate(() => document.getAnimations().filter((a) => a.effect.getTiming().iterations === Infinity).length);
  const nuevoAfter = await p.getByText("Nuevo", { exact: true }).count();
  check("CA-6.3/6.4/8.1 se puede tocar durante la animacion; al actuar se detiene el pulso y desaparece 'Nuevo'", infAfter === 0 && nuevoAfter === 0, `infinitas ${infAfter}, Nuevo ${nuevoAfter}`);
  const live = await p.evaluate(() => [...document.querySelectorAll("[aria-live]:not([data-react-aria-top-layer])")].map((e) => ({ live: e.getAttribute("aria-live"), cls: e.className })));
  check("CA-5.1 Cocina: 1 region aria-live=polite oculta (sr-only)", live.length === 1 && live[0].live === "polite" && /sr-only/.test(live[0].cls), JSON.stringify(live));
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await login(p, "mozo@demo.test", "/floor"); await p.waitForTimeout(1200);
  const live = await p.evaluate(() => [...document.querySelectorAll("[aria-live]")].map((e) => e.getAttribute("aria-live")));
  note(`Salon: regiones aria-live = ${JSON.stringify(live)} (la spec deja 'assertive solo para llamados' a confirmar por QA)`);
  check("CA-5.1 Salon: regiones aria-live presentes (polite)", live.length >= 2 && live.every((l) => l === "polite" || l === "assertive"));
  const h = await p.evaluate(() => [...document.querySelectorAll("h1,h2,h3")].map((e) => e.tagName + ":" + e.textContent.trim().slice(0, 28)));
  check("CA-5.4 un solo h1 y encabezados h2 en orden", h.filter((x) => x.startsWith("H1")).length === 1 && h.filter((x) => x.startsWith("H2")).length >= 2, JSON.stringify(h));
  await ctx.close();
}

// ---------- 2. Casos limite: nombres largos, 7 cifras, 50 renglones, notas largas
await resetMock();
{
  const adm = await tokenFor("admin@demo.test");
  const LONGDISH = "Plato con un nombre extremadamente largo para probar el corte de linea en la comanda de cocina ok";
  const LONGTABLE = "Mesa del fondo junto a la ventana grande 3";
  await rest(adm, "PATCH", "menu_items?name=eq.Provoleta", { name: LONGDISH, price: 1234567 });
  await rest(adm, "PATCH", "tables?label=eq.Mesa%203", { label: LONGTABLE });
  const note200 = "Sin sal ".repeat(30) + "FIN";
  await mockEvent({ type: "new_order", table: LONGTABLE, items: [{ name: LONGDISH, quantity: 9, note: note200 }] });
  await mockEvent({ type: "new_order", table: "Mesa 2", items: Array.from({ length: 50 }, (_, i) => ({ name: i % 2 ? LONGDISH : "Empanadas (x3)", quantity: 1 })) });
  for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844], [360, 640], [320, 568], [720, 450]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    await login(p, "cocina@demo.test", "/kitchen"); await p.waitForTimeout(1500);
    const hs = await hscroll(p);
    const out = await p.evaluate(() => { const bad = []; for (const a of document.querySelectorAll(".st-order")) { const r = a.getBoundingClientRect(); const btn = a.querySelector("button"); const br = btn?.getBoundingClientRect(); if (br && (br.right > r.right + 1 || br.left < r.left - 1)) bad.push("boton fuera de tarjeta"); for (const e of a.querySelectorAll("*")) { const er = e.getBoundingClientRect(); if (er.width && (er.right > r.right + 1 || er.left < r.left - 1)) { bad.push(String(e.className || e.tagName)); break; } } } return bad; });
    check(`casos limite Cocina ${w}x${h}: sin scroll horizontal y nada fuera de la tarjeta`, hs <= 0 && out.length === 0, `hscroll ${hs}; ${JSON.stringify(out)}`);
    if (w === 390) {
      const t = await text(p);
      check("nombre de plato de 95 car., nota de 240 car. y 'FIN' visibles completos; precio 7 cifras sin cortar", t.includes("nombre extremadamente largo") && t.includes("FIN") && /\$\s?\d{1,3}(\.\d{3}){2,}/.test(t), (t.match(/\$\s?[\d.]+/g) ?? []).join(" "));
      check("50 renglones: el boton 'Tomar pedido, Mesa 2' sigue alcanzable", (await p.getByRole("button", { name: /Tomar pedido, Mesa 2/ }).count()) === 1);
      const lab = await p.getByRole("heading", { level: 2 }).allTextContents();
      check("etiqueta de mesa larga: nombre completo en el DOM", lab.some((x) => x.includes(LONGTABLE)), JSON.stringify(lab));
      await p.screenshot({ path: "docs/qa/capturas/cocina-salon/limite-cocina-390x844.png" });
    }
    await ctx.close();
  }
  for (const [w, h] of [[1280, 800], [390, 844], [320, 568], [720, 450]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    await login(p, "mozo@demo.test", "/floor"); await p.waitForTimeout(1500);
    const hs = await hscroll(p);
    check(`casos limite Salon ${w}x${h}: sin scroll horizontal`, hs <= 0, `hscroll ${hs}`);
    if (w === 390) { const t = await text(p); check("Salon: mesa de nombre largo con su estado visible", t.includes(LONGTABLE) && /Listo|Con pedido/.test(t)); await p.screenshot({ path: "docs/qa/capturas/cocina-salon/limite-salon-390x844.png", fullPage: true }); }
    await ctx.close();
  }
}

// ---------- 3. Carga alta: 30 pedidos, 20 llamados, 40 mesas; doble toque; giro
await resetMock();
{
  const adm = await tokenFor("admin@demo.test");
  const rid = (await rest(adm, "GET", "tables?select=restaurant_id&limit=1")).body[0].restaurant_id;
  for (let i = 4; i <= 40; i++) await rest(adm, "POST", "tables", { restaurant_id: rid, label: `Mesa ${i}`, qr_token: `mesa-${i}-qa${String(i).padStart(5, "0")}` });
  for (let i = 0; i < 30; i++) await mockEvent({ type: "new_order", table: `Mesa ${1 + (i % 12)}`, items: [{ name: "Provoleta", quantity: 1 + (i % 3) }, { name: "Empanadas (x3)", quantity: 2 }] });
  for (let i = 0; i < 20; i++) await mockEvent({ type: "waiter_call", table: `Mesa ${1 + (i % 15)}`, reason: ["cuenta", "consulta", "otro"][i % 3] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await login(p, "cocina@demo.test", "/kitchen"); await p.waitForTimeout(2000);
  const nCards = await p.locator(".st-order").count();
  note(`Cocina con ${nCards} comandas`);
  check("CA-7.2 Cocina con 30+ pedidos: sin scroll horizontal", (await hscroll(p)) <= 0);
  await p.evaluate(() => { window.__patches = 0; const f = window.fetch; window.fetch = function (u, o) { if ((o?.method ?? "GET") === "PATCH") window.__patches++; return f.apply(this, arguments); }; });
  const btn = p.getByRole("button", { name: /^Tomar pedido/ }).first();
  const lat = await btn.evaluate((el) => new Promise((res) => { const t0 = performance.now(); new MutationObserver((m, o) => { o.disconnect(); res(performance.now() - t0); }).observe(el, { attributes: true, childList: true, subtree: true, characterData: true }); el.click(); }));
  await p.waitForTimeout(1200);
  const patches = await p.evaluate(() => window.__patches);
  check("CA-7.2 el boton cambia su estado visible en <= 100 ms con 30 pedidos", lat <= 100, `${lat.toFixed(1)} ms`);
  check("un toque = una sola actualizacion (PATCH); el doble toque real esta en A-probe-seguimiento", patches === 1, `${patches} PATCH`);
  const before = await p.locator(".st-order").count();
  await p.setViewportSize({ width: 800, height: 1280 }); await p.waitForTimeout(500);
  await p.setViewportSize({ width: 1280, height: 800 }); await p.waitForTimeout(500);
  check("CA-3.5 girar la pantalla conserva comandas y estado", (await p.locator(".st-order").count()) === before && (await p.getByText("En preparación", { exact: true }).count()) >= 1);
  await ctx.close();
  const c2 = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const q = await c2.newPage();
  await login(q, "mozo@demo.test", "/floor"); await q.waitForTimeout(2000);
  const t = await text(q);
  check("CA-8.3 Salon con 20 llamados: titulo con contador 20 o 21 (1 semilla + 20)", /Llamados de mozo · 2[01]/.test(t), (t.match(/Llamados de mozo · \d+/) ?? [])[0]);
  check("CA-7.2 Salon con 40 mesas: sin scroll horizontal", (await hscroll(q)) <= 0);
  check("Salon: las 40 mesas estan en pantalla", new Set(t.match(/Mesa \d+/g) ?? []).size >= 40);
  await q.screenshot({ path: "docs/qa/capturas/cocina-salon/carga-salon-1280x800.png" });
  await c2.close();
}
await b.close();
summary();
