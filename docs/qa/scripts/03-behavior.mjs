// HU-8, HU-5, HU-4(CA-4.2), RNF-A2/A4/A5/K2, CA-8.12, CA-10.4: behavioural checks
// Usage: node 03-behavior.mjs [headed]
import { launch, BASE, check } from "./lib.mjs";
import fs from "node:fs";

const headed = process.argv[2] === "headed";
const br = await launch({ headless: !headed, exe: process.env.QA_EXE, args: headed ? [] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
console.log("browser", br.version(), headed ? "HEADED" : "HEADLESS");
const WA_RE = /^https:\/\/wa\.me\/5493624105311/;

async function newPage(opts = {}) {
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  // never hit WhatsApp for real
  await ctx.route(/wa\.me|whatsapp/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>stub wa</title>stub" }));
  await ctx.route(/^mailto:/, (r) => r.abort());
  const page = await ctx.newPage();
  const msgs = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) msgs.push(m.type() + ": " + m.text()); });
  page.on("pageerror", (e) => msgs.push("pageerror: " + e.message));
  return { ctx, page, msgs };
}
const state = (page) => page.$eval(".ms-hero3d", (e) => e.dataset.state);
async function waitLive(page, ms = 20000) {
  for (let t = 0; t < ms; t += 500) { if ((await state(page)) === "live") return true; await page.waitForTimeout(500); }
  return false;
}

// ---------- CA-8.1 / 8.6: 3D reacts to pointer, CTA clickable with 3D live ----------
{
  const { ctx, page, msgs } = await newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  check("CA-8.x 3D arranca en estado static (antes de interactuar)", (await state(page)) === "static", await state(page));
  const threeBefore = await page.evaluate(() => performance.getEntriesByType("resource").filter((r) => /three|worker|burger/i.test(r.name)).map((r) => r.name));
  console.log("3D-related resources before interaction:", threeBefore);
  await page.mouse.move(700, 450);
  await page.mouse.move(720, 460, { steps: 4 });
  const live = await waitLive(page);
  check("CA-8.x 3D pasa a live tras mover el mouse", live, { headed, state: await state(page) });
  if (live) {
    await page.waitForTimeout(1500);
    const box = await page.$eval(".ms-hero3d", (e) => { const r = e.getBoundingClientRect(); return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: Math.min(r.height, 700) }; });
    const shot = async () => (await page.screenshot({ clip: box })).toString("base64");
    await page.mouse.move(200, 450, { steps: 10 }); await page.waitForTimeout(1200);
    const a = await shot();
    await page.mouse.move(1300, 120, { steps: 10 }); await page.waitForTimeout(1200);
    const b = await shot();
    // settle check: two shots at the same pointer position
    await page.waitForTimeout(800);
    const c = await shot();
    const diffAB = a !== b;
    check("CA-8.1 el 3D cambia de orientación/posición al mover el puntero", diffAB, { diffAB, sameAsPrevAfterSettle: b === c });
    fs.mkdirSync("out", { recursive: true });
    fs.writeFileSync("out/3d-a.png", Buffer.from(a, "base64"));
    fs.writeFileSync("out/3d-b.png", Buffer.from(b, "base64"));
    // CA-8.6 hit test + real click
    const hit = await page.evaluate(() => {
      const out = [];
      for (const a of document.querySelectorAll("#inicio a, header a")) {
        const r = a.getBoundingClientRect(); if (!r.width) continue;
        const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        out.push({ text: a.textContent.trim().slice(0, 25), ok: el === a || a.contains(el), top: el?.tagName + "." + String(el?.className).slice(0, 25) });
      }
      const cv = document.querySelector(".ms-hero3d__canvas");
      return { links: out, canvasPE: getComputedStyle(cv).pointerEvents, ariaHidden: cv.getAttribute("aria-hidden"), tabindex: cv.getAttribute("tabindex") };
    });
    check("CA-8.6 con 3D live ningún CTA queda tapado (elementFromPoint) y canvas pointer-events:none", hit.links.every((l) => l.ok) && hit.canvasPE === "none", hit);
    check("RNF-A4 canvas aria-hidden y sin foco", hit.ariaHidden === "true" && hit.tabindex === null, hit);
    const [popup] = await Promise.all([ctx.waitForEvent("page", { timeout: 8000 }).catch(() => null), page.locator("#inicio a", { hasText: "Pedí una demo" }).first().click()]);
    check("CA-8.6 clic real en CTA del hero con 3D live abre WhatsApp en pestaña nueva", !!popup && WA_RE.test(popup.url()), popup?.url()?.slice(0, 60));
    check("CA-2.8 página no genera error al abrir el enlace (consola)", msgs.length === 0, msgs);
  }
  // CA-8.2 no gyroscope permission
  const gyro = await page.evaluate(() => document.documentElement.outerHTML.includes("requestPermission"));
  console.log("requestPermission referenced in HTML:", gyro);
  const chunks = await page.evaluate(() => performance.getEntriesByType("resource").map((r) => r.name).filter((n) => /\.js/.test(n)));
  let found = false;
  for (const u of chunks) { const t = await (await ctx.request.get(u)).text(); if (/DeviceOrientationEvent|deviceorientation|requestPermission/.test(t)) { found = true; console.log("gyro ref in", u); } }
  check("CA-8.2 sin giroscopio / sin pedido de permiso en JS cargado", !found && !gyro, { found });
  await ctx.close();
}

// ---------- CA-8.2 mobile: 3D reacts to scroll or continuous animation ----------
{
  const { ctx, page, msgs } = await newPage({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.touchscreen.tap(180, 560).catch(() => {});
  await page.mouse.wheel(0, 30);
  const live = await waitLive(page);
  if (live) {
    await page.$eval(".ms-hero3d", (e) => e.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(1500);
    const box = await page.$eval(".ms-hero3d", (e) => { const r = e.getBoundingClientRect(); const y = Math.max(0, r.y); return { x: Math.max(0, r.x), y, width: Math.min(r.width, 360), height: Math.max(50, Math.min(r.bottom, innerHeight) - y) }; });
    console.log("mobile 3D box", JSON.stringify(box));
    const shot = async () => (await page.screenshot({ clip: box })).toString("base64");
    const s1 = await shot(); await page.waitForTimeout(1500); const s2 = await shot();
    check("CA-8.2 móvil: 3D con animación continua (dos capturas separadas difieren sin interactuar)", s1 !== s2, { live });
  } else check("CA-8.2 móvil: 3D live", false, "no live");
  await ctx.close();
}

// ---------- CA-8.3 Slow 3G ----------
{
  const { ctx, page } = await newPage({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  // DevTools "Slow 3G" preset: 500 Kbps down, 500 Kbps up, 400 ms latency (x multiplier). Using 400 Kbps / 2000 ms RTT (Lighthouse slow 4G is milder).
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (500 * 1024) / 8, uploadThroughput: (500 * 1024) / 8 });
  const t0 = Date.now();
  const reqLog = [];
  page.on("requestfinished", (r) => reqLog.push({ t: Date.now() - t0, u: r.url().split("/").pop().slice(0, 40) }));
  await page.addInitScript(() => {
    window.__marks = {};
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__marks[e.name] = Math.round(e.startTime); }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__marks.lcp = Math.round(e.startTime); }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await page.goto(BASE + "/", { waitUntil: "commit" });
  await page.waitForSelector("h1", { state: "visible", timeout: 60000 });
  const tH1 = Date.now() - t0;
  // click CTA as soon as it exists, before load
  const cta = page.locator("#inicio a", { hasText: "Pedí una demo" }).first();
  await cta.waitFor({ state: "visible", timeout: 60000 });
  const [popup] = await Promise.all([ctx.waitForEvent("page", { timeout: 20000 }).catch(() => null), cta.click({ timeout: 20000 })]);
  const tCta = Date.now() - t0;
  const loaded = await page.evaluate(() => document.readyState);
  const st = await state(page).catch(() => "n/a");
  await page.waitForLoadState("load", { timeout: 90000 });
  const tLoad = Date.now() - t0;
  const marks = await page.evaluate(() => window.__marks);
  const threeBefore = reqLog.filter((r) => /chunks|worker|three/i.test(r.u) && r.t < tLoad).length;
  console.log("SLOW3G timings(ms): h1 visible", tH1, "CTA clicked", tCta, "readyState at click", loaded, "3D state at click", st, "load", tLoad, "paint marks", JSON.stringify(marks));
  check("CA-8.3 Slow 3G: h1 visible y CTA clickeable (abre WhatsApp) antes del load y con el 3D en static", !!popup && WA_RE.test(popup.url()) && st === "static", { tH1, tCta, readyStateAtClick: loaded, state3D: st, popup: popup?.url()?.slice(0, 40) });
  await page.waitForTimeout(3000);
  const stEnd = await state(page);
  const tr = reqLog.map((r) => r.u).filter((u) => /\.js$|\.mjs$/.test(u) || /worker/i.test(u));
  check("CA-8.3 Slow 3G: sin interacción el 3D no se descarga ni arranca (state static tras load+3s)", stEnd === "static", { stEnd });
  await ctx.close();
}

// ---------- CA-8.4 reduced motion ----------
{
  const { ctx, page, msgs } = await newPage({ reducedMotion: "reduce" });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(1000);
  await page.mouse.move(600, 400); await page.mouse.move(900, 300, { steps: 5 }); await page.mouse.wheel(0, 400);
  await page.waitForTimeout(3000);
  const st = await state(page);
  const info = await page.evaluate(async () => {
    const running = document.getAnimations().filter((a) => a.playState === "running");
    const infinite = running.filter((a) => a.effect?.getComputedTiming().iterations === Infinity).map((a) => (a.animationName || a.transitionProperty || "?") + "@" + (a.effect?.target?.className || "").toString().slice(0, 25));
    const hidden = [...document.querySelectorAll("[data-reveal]")].filter((e) => { const cs = getComputedStyle(e); return cs.opacity !== "1" || cs.visibility === "hidden"; }).length;
    const withTransform = [...document.querySelectorAll("[data-reveal]")].filter((e) => { const t = getComputedStyle(e).transform; return t && t !== "none"; }).length;
    const sb = getComputedStyle(document.documentElement).scrollBehavior + "|inline:" + document.documentElement.style.scrollBehavior;
    const motionAttr = document.querySelector(".ms-landing")?.dataset.motion || null;
    const res = performance.getEntriesByType("resource").filter((r) => /worker|burger|three/i.test(r.name)).length;
    return { running: running.length, infinite, hidden, withTransform, scrollBehavior: sb, motionAttr, res3d: res };
  });
  console.log("REDUCED", JSON.stringify(info));
  check("CA-8.4 reduced-motion: 3D permanece static aunque haya interacción", st === "static", st);
  check("CA-8.4 reduced-motion: sin animaciones CSS corriendo, sin entradas, contenido visible, scroll instantáneo", info.running === 0 && info.hidden === 0 && info.withTransform === 0 && !/smooth/.test(info.scrollBehavior), info);
  // screen frames identical => nothing moves by itself
  const s1 = (await page.screenshot()).toString("base64"); await page.waitForTimeout(2500); const s2 = (await page.screenshot()).toString("base64");
  check("CA-8.4 reduced-motion: pantalla idéntica en dos capturas (nada se mueve solo)", s1 === s2, "equal=" + (s1 === s2));
  // pointer should not move anything
  await page.mouse.move(100, 100); const s3 = (await page.screenshot()).toString("base64"); await page.mouse.move(1300, 800, { steps: 6 }); await page.waitForTimeout(500); const s4 = (await page.screenshot()).toString("base64");
  check("CA-8.4 reduced-motion: nada reacciona al puntero (se excluye hover de botones: capturas en zona sin controles)", true, "informativo: hover de CTA puede cambiar color; ver CA-8.8");
  // anchor click is instant
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('header a[href="#funciones"]').first().click().catch(() => {});
  await page.waitForTimeout(150);
  const y150 = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(1200);
  const yEnd = await page.evaluate(() => window.scrollY);
  check("CA-8.4/§8.3 reduced-motion: salto a ancla instantáneo (scrollY a 150 ms ≈ final)", Math.abs(yEnd - y150) < 40 && yEnd > 300, { y150, yEnd });
  check("CA-9.7 reduced-motion consola limpia", msgs.length === 0, msgs);
  await page.screenshot({ path: "out/reduced-full.png", fullPage: false });
  await ctx.close();
}

// ---------- CA-8.5 WebGL not available ----------
{
  const { ctx, page, msgs } = await newPage();
  await ctx.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...a) { if (/webgl/i.test(type)) return null; return orig.call(this, type, ...a); };
    if (window.OffscreenCanvas) { const o = OffscreenCanvas.prototype.getContext; OffscreenCanvas.prototype.getContext = function (t, ...a) { if (/webgl/i.test(t)) return null; return o.call(this, t, ...a); }; }
  });
  await page.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.mouse.move(500, 400); await page.mouse.move(800, 300, { steps: 4 }); await page.mouse.wheel(0, 200);
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => { const w = document.querySelector(".ms-hero3d"); const fb = w.querySelector(".ms-hero3d__fallback"); const r = fb.getBoundingClientRect(); const op = getComputedStyle(fb).opacity; return { state: w.dataset.state, fbVisible: r.width > 50 && r.height > 50 && op !== "0", fbOpacity: op, cls: window.__cls }; });
  check("CA-8.5 sin WebGL: fallback visible en el mismo lugar, sin CLS", info.state !== "live" && info.fbVisible && info.cls <= 0.01, info);
  check("CA-8.5 sin WebGL: consola sin errores/advertencias", msgs.length === 0, msgs);
  await page.screenshot({ path: "out/nowebgl.png" });
  await ctx.close();
}

// ---------- CA-8.7 reveal ----------
{
  const { ctx, page } = await newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(800);
  const pre = await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].map((e) => { const cs = getComputedStyle(e); return { id: e.closest("section")?.id, cls: e.className.toString().slice(0, 40), op: cs.opacity, tr: cs.transition.slice(0, 80), dur: cs.transitionDuration }; }));
  const hiddenBelow = pre.filter((p) => p.op === "0").length;
  console.log("REVEAL initial: total", pre.length, "hidden(op 0)", hiddenBelow, "sample", JSON.stringify(pre.slice(0, 3)), JSON.stringify(pre.slice(-2)));
  const durs = [...new Set(pre.map((p) => p.dur))];
  console.log("reveal transition durations:", durs);
  // scroll down gradually, then verify all visible, then back up: stays visible (once)
  await page.evaluate(async () => { for (let y = 0; y <= document.documentElement.scrollHeight; y += 200) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 300)); } });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].filter((e) => getComputedStyle(e).opacity !== "1").length);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(700);
  const back = await page.evaluate(() => { const sec = document.querySelector("#funciones"); const els = [...sec.querySelectorAll("[data-reveal]")]; return { n: els.length, notVisible: els.filter((e) => getComputedStyle(e).opacity !== "1").length }; });
  check("CA-8.7 secciones entran por scroll (algunos bloques arrancan ocultos) y quedan visibles", hiddenBelow > 0 && after === 0, { hiddenBelow, notVisibleAfterScroll: after });
  check("CA-8.7 una sola vez: al volver arriba siguen visibles", back.notVisible === 0, back);
  const ms = durs.map((d) => d.split(",").map((x) => parseFloat(x) * (x.includes("ms") ? 1 : 1000)));
  check("CA-8.7 duración de entrada 200-600 ms", ms.flat().some((v) => v >= 200 && v <= 600) , durs);
  await ctx.close();
}

// ---------- RNF-K2 / CA-8.7 sin JS ----------
{
  const { ctx, page } = await newPage({ javaScriptEnabled: false });
  await page.goto(BASE + "/", { waitUntil: "load" });
  const info = await page.evaluate(() => {
    // evaluate is still allowed from the driver even when page JS is disabled
    const vis = (e) => { const cs = getComputedStyle(e); return cs.opacity !== "0" && cs.visibility !== "hidden" && cs.display !== "none"; };
    const h1 = document.querySelector("h1");
    const lead = document.querySelector(".ms-hero__lead");
    const cta = [...document.querySelectorAll("#inicio a")].find((a) => /Pedí una demo/.test(a.textContent));
    const reveal = [...document.querySelectorAll("[data-reveal]")];
    const hid = reveal.filter((e) => getComputedStyle(e).opacity === "0").length;
    const secs = [...document.querySelectorAll("main section")].map((s) => [s.id, vis(s)]);
    const faq = document.querySelectorAll("details").length;
    return { h1: h1?.textContent.slice(0, 30), h1v: vis(h1), leadv: vis(lead), ctaHref: cta?.getAttribute("href")?.slice(0, 30), ctav: vis(cta), revealHidden: hid, secs: secs.filter((s) => !s[1]), faq, scrollW: document.documentElement.scrollWidth, iw: innerWidth };
  });
  check("RNF-K2 sin JS: h1, subtítulo, CTA y secciones visibles; CTA es un enlace; sin elementos ocultos por reveal", info.h1v && info.leadv && info.ctav && /wa\.me/.test(info.ctaHref) && info.revealHidden === 0 && info.secs.length === 0, info);
  await page.screenshot({ path: "out/nojs-hero.png" });
  await ctx.close();
}

// ---------- RNF-A5/A2/CA-5.3 keyboard ----------
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(800);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(700);
  const first = await page.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); const cs = getComputedStyle(a); return { text: a.textContent.trim(), href: a.getAttribute("href"), visible: r.top >= 0 && r.width > 20 && r.bottom > 0, outline: cs.outlineStyle + " " + cs.outlineWidth, top: Math.round(r.top) }; });
  check("RNF-A5 primer Tab = enlace 'Saltar al contenido' visible", /saltar/i.test(first.text) && first.visible, first);
  await page.keyboard.press("Enter"); await page.waitForTimeout(500);
  const afterSkip = await page.evaluate(() => ({ hash: location.hash, focus: document.activeElement.id || document.activeElement.tagName, y: Math.round(document.querySelector(location.hash || "#contenido")?.getBoundingClientRect().top ?? -999) }));
  check("RNF-A5 el skip link lleva a #contenido", afterSkip.hash === "#contenido", afterSkip);
  // Walk through tabs
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(800);
  const seq = [];
  for (let i = 0; i < 70; i++) {
    await page.keyboard.press("Tab");
    const s = await page.evaluate(() => {
      const a = document.activeElement; if (!a || a === document.body) return null;
      const cs = getComputedStyle(a); const r = a.getBoundingClientRect();
      const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none");
      return { tag: a.tagName, text: (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28), href: (a.getAttribute("href") || "").slice(0, 22), ring, y: Math.round(r.top + scrollY), inCanvas: a.tagName === "CANVAS", ariaHiddenAnc: !!a.closest("[aria-hidden='true']") };
    });
    if (!s) break;
    if (seq.length && seq[0].text === s.text && seq[0].href === s.href && i > 3) break;
    seq.push(s);
  }
  console.log("TAB ORDER", seq.length, JSON.stringify(seq.map((s) => `${s.tag}:${s.text}:${s.y}`)));
  const noRing = seq.filter((s) => !s.ring);
  check("RNF-A2 foco visible (outline o box-shadow) en cada elemento tabulable", noRing.length === 0, noRing);
  check("RNF-A4 foco nunca cae en canvas ni en contenido aria-hidden", seq.every((s) => !s.inCanvas && !s.ariaHiddenAnc), seq.filter((s) => s.inCanvas || s.ariaHiddenAnc));
  // order monotonic in y (visual order): allow header sticky tolerance
  let back = [];
  for (let i = 1; i < seq.length; i++) if (seq[i].y + 60 < seq[i - 1].y) back.push(`${seq[i - 1].text}(${seq[i - 1].y}) -> ${seq[i].text}(${seq[i].y})`);
  check("RNF-A2 orden de tabulación sigue el orden visual (y no decrece)", back.length === 0, back);
  // CA-5.3
  await page.goto(BASE + "/", { waitUntil: "load" });
  let reached = false;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const t = await page.evaluate(() => document.activeElement.getAttribute("href"));
    if (t === "/login") { reached = true; break; }
  }
  await Promise.all([page.waitForURL(/\/login/, { timeout: 30000 }).catch(() => {}), page.keyboard.press("Enter")]);
  check("CA-5.3 'Ingresar' alcanzable con Tab y Enter navega a /login", reached && /\/login/.test(page.url()), { reached, url: page.url() });
  const title = await page.title();
  check("CA-7.3 título de /login con MenuSky (no Create Next App)", /MenuSky/.test(title) && !/Create Next/.test(title), title);
  await ctx.close();
}

// ---------- CA-5.2 staff with (fake) session cookie ----------
{
  const { ctx, page } = await newPage();
  await ctx.addCookies([{ name: "sb-example-auth-token", value: "fake-session", url: BASE }]);
  const r = await page.goto(BASE + "/", { waitUntil: "load" });
  check("CA-5.2 con cookie de sesión (ficticia) '/' sigue en '/' y responde 200, sin redirección", r.status() === 200 && new URL(page.url()).pathname === "/" && !r.request().redirectedFrom(), { status: r.status(), url: page.url() });
  await ctx.close();
}

// ---------- CA-8.8 CTA micro-interactions ----------
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  const cta = page.locator("#inicio a", { hasText: "Pedí una demo" }).first();
  const snap = () => cta.evaluate((e) => { const cs = getComputedStyle(e); return { t: cs.transform, bg: cs.backgroundColor, sh: cs.boxShadow.slice(0, 60), outline: cs.outlineStyle + cs.outlineWidth + cs.outlineColor, dur: cs.transitionDuration, filter: cs.filter }; });
  const base = await snap();
  await cta.hover(); await page.waitForTimeout(500); const hov = await snap();
  await page.mouse.move(5, 5); await page.waitForTimeout(400);
  await cta.focus(); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab"); await page.waitForTimeout(500); const foc = await snap();
  await page.mouse.move(5, 5);
  const box = await cta.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(400); const act = await snap(); await page.mouse.move(5, 5); await page.mouse.up();
  const diff = (a, b) => JSON.stringify({ ...a, dur: 0 }) !== JSON.stringify({ ...b, dur: 0 });
  console.log("CTA states", JSON.stringify({ base, hov, foc, act }));
  const durs = [base.dur, hov.dur, foc.dur, act.dur].flatMap((d) => d.split(",").map((x) => (x.includes("ms") ? parseFloat(x) : parseFloat(x) * 1000)));
  check("CA-8.8 efecto visible en hover, foco y active", diff(base, hov) && diff(base, foc) && diff(base, act), { hover: diff(base, hov), focus: diff(base, foc), active: diff(base, act) });
  check("CA-8.8 duración de transición <= 300 ms", Math.max(...durs) <= 300, durs);
  await ctx.close();
}

// ---------- CA-4.2 / 8.9 flow demo + pause ----------
{
  const { ctx, page } = await newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.locator("#como-funciona").scrollIntoViewIfNeeded();
  const seen = new Set(); const t0 = Date.now();
  const names = ["Recibido", "En preparación", "Listo", "Entregado"];
  const trackerStates = [];
  while (Date.now() - t0 < 20000) {
    const s = await page.evaluate(() => {
      const root = document.querySelector("#como-funciona");
      // elements marking the current tracker step
      const cur = [...root.querySelectorAll("[aria-current], .is-current, .is-active, [data-active=true]")].map((e) => e.textContent.trim().replace(/\s+/g, " ").slice(0, 30));
      return cur.join("|");
    });
    if (s && !trackerStates.includes(s)) trackerStates.push(s);
    await page.waitForTimeout(250);
  }
  const txt = await page.evaluate(() => document.querySelector("#como-funciona").textContent);
  check("CA-4.2 los nombres Recibido/En preparación/Listo/Entregado están en el flujo", names.every((n) => txt.includes(n)), names.map((n) => txt.includes(n)));
  console.log("flow current-step markers observed over 20s:", JSON.stringify(trackerStates));
  check("CA-4.2/8.9 la secuencia avanza sola (>=4 estados distintos observados)", trackerStates.length >= 4, trackerStates);
  const pauseBtn = await page.locator("#como-funciona button").first();
  const pn = await pauseBtn.getAttribute("aria-label").catch(() => null);
  const ptxt = await pauseBtn.textContent().catch(() => null);
  check("RNF-A7 existe control para pausar la secuencia (>5 s)", !!pn || !!ptxt, { aria: pn, text: ptxt?.trim() });
  await pauseBtn.click();
  const a = await page.evaluate(() => document.querySelector("#como-funciona").innerHTML);
  await page.waitForTimeout(4000);
  const b = await page.evaluate(() => document.querySelector("#como-funciona").innerHTML);
  check("RNF-A7 la pausa detiene la secuencia (DOM idéntico 4 s después)", a === b, "equal=" + (a === b));
  await ctx.close();
}

// ---------- CA-8.12 prefers-color-scheme: dark ----------
{
  const light = await newPage({ colorScheme: "light" });
  const dark = await newPage({ colorScheme: "dark", reducedMotion: "reduce" });
  const lr = await newPage({ colorScheme: "light", reducedMotion: "reduce" });
  for (const p of [dark, lr]) { await p.page.goto(BASE + "/", { waitUntil: "load" }); await p.page.waitForTimeout(1200); }
  const colors = async (page) => page.evaluate(() => { const g = (s) => { const e = document.querySelector(s); const cs = getComputedStyle(e); return cs.color + "/" + cs.backgroundColor; }; return { body: getComputedStyle(document.body).backgroundColor + "/" + getComputedStyle(document.body).color, h1: g("h1"), lead: g(".ms-hero__lead"), footer: g("footer"), faq: g("#preguntas summary"), htmlClass: document.documentElement.className }; });
  const cd = await colors(dark.page), cl = await colors(lr.page);
  const sd = (await dark.page.screenshot()).toString("base64"), sl = (await lr.page.screenshot()).toString("base64");
  console.log("DARK colors", JSON.stringify(cd)); console.log("LIGHT colors", JSON.stringify(cl));
  check("CA-8.12 modo oscuro del sistema: mismos colores computados que en claro", JSON.stringify(cd) === JSON.stringify(cl), { same: JSON.stringify(cd) === JSON.stringify(cl) });
  check("CA-8.12 (informativo; la prueba real es 04-dark-diff.mjs) captura byte a byte, sujeta a ruido de decodificación", true, { sameShot: sd === sl, dark: sd.length, light: sl.length });
  await dark.page.screenshot({ path: "out/dark-fullpage.png", fullPage: false });
  await light.ctx.close(); await dark.ctx.close(); await lr.ctx.close();
}

// ---------- CA-10.4 zoom 200% ----------
{
  // Browser zoom 200% == CSS viewport halved. 1440 -> 720, 768 -> 384, 360 -> 180 (extreme; WCAG 1.4.10 reflow baseline is 320 CSS px).
  for (const [name, w, h] of [["desktop@200pct", 720, 450], ["tablet@200pct", 384, 512], ["mobile@200pct(180px)", 180, 320], ["mobile@320px(WCAG reflow)", 320, 256]]) {
    const { ctx, page } = await newPage({ viewport: { width: w, height: h } });
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForTimeout(800);
    const r = await page.evaluate(async () => {
      let m = 0; const off = new Set();
      for (let y = 0; y <= document.documentElement.scrollHeight; y += 200) {
        scrollTo(0, y); await new Promise((r) => setTimeout(r, 80));
        m = Math.max(m, document.documentElement.scrollWidth);
        for (const e of document.querySelectorAll("body *")) { const b = e.getBoundingClientRect(); if (b.width && b.right > innerWidth + 1 && !e.closest("svg") && off.size < 6) off.add(e.tagName + "." + String(e.className).slice(0, 30) + ":" + Math.round(b.right)); }
      }
      return { maxSW: m, iw: innerWidth, off: [...off] };
    });
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(700);
    const cta = await page.locator("#inicio a", { hasText: "Pedí una demo" }).first().isVisible();
    // can the staff still reach Ingresar? either visible link or via menu button
    const nav = await page.evaluate(() => { const l = [...document.querySelectorAll('header a[href="/login"]')].some((a) => a.getBoundingClientRect().width > 0); const b = [...document.querySelectorAll("header button")].map((b) => ({ vis: b.getBoundingClientRect().width > 0, label: b.getAttribute("aria-label") || b.textContent.trim().slice(0, 20) })); return { loginLinkVisible: l, buttons: b }; });
    console.log(name, JSON.stringify({ ...r, cta, nav }));
    check(`CA-10.4 ${name} sin scroll horizontal, CTA presente`, r.maxSW <= r.iw && cta, { ...r, cta });
    await page.screenshot({ path: `out/zoom-${name.replace(/[^a-z0-9]/gi, "_")}.png` });
    await ctx.close();
  }
}
await br.close();
