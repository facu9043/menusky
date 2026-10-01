// HU-10 + HU-8 (3D) + CA-9.3/9.7 : responsive, overflow before/after 3D, touch targets, console, bytes, CLS
// Usage: node 02-responsive.mjs [headed]
import { launch, BASE, VIEWPORTS, check } from "./lib.mjs";
import fs from "node:fs";

const headed = process.argv[2] === "headed";
const exe = process.env.QA_EXE;
const br = await launch({ headless: !headed, exe, args: headed ? [] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
console.log("browser", br.version(), headed ? "HEADED" : "HEADLESS");

async function sweep(page, label) {
  // scroll through the entire page in steps, sampling scrollWidth each time
  const r = await page.evaluate(async () => {
    const out = { maxSW: 0, iw: window.innerWidth, samples: 0, offenders: [] };
    const h = () => document.documentElement.scrollHeight;
    for (let y = 0; y <= h(); y += Math.max(200, Math.floor(window.innerHeight * 0.6))) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
      out.maxSW = Math.max(out.maxSW, document.documentElement.scrollWidth, document.body.scrollWidth);
      out.samples++;
    }
    window.scrollTo(0, 0);
    if (out.maxSW > out.iw) {
      for (const e of document.querySelectorAll("body *")) {
        const b = e.getBoundingClientRect();
        if (b.right > out.iw + 1 && out.offenders.length < 8) out.offenders.push(e.tagName + "." + String(e.className).slice(0, 40) + " right=" + Math.round(b.right));
      }
    }
    return out;
  });
  return { label, ...r };
}

const summary = {};
for (const [name, vp] of Object.entries(VIEWPORTS)) {
  const ctx = await br.newContext({ viewport: vp, hasTouch: name === "mobile", isMobile: name === "mobile", deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleMsgs = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consoleMsgs.push(m.type() + ": " + m.text()); });
  page.on("pageerror", (e) => consoleMsgs.push("pageerror: " + e.message));
  page.on("requestfailed", (r) => { if (!/_rsc=/.test(r.url())) consoleMsgs.push("requestfailed: " + r.url()); }); // aborted RSC prefetches are not console output
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  let bytes = 0, nreq = 0;
  cdp.on("Network.loadingFinished", (e) => { bytes += e.encodedDataLength; nreq++; });
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const firstLoad = { bytesKB: +(bytes / 1024).toFixed(1), requests: nreq };
  const stateBefore = await page.$eval(".ms-hero3d", (e) => e.dataset.state);

  // CA-1.2 above the fold
  const fold = await page.evaluate(() => {
    const vh = window.innerHeight;
    const inView = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh && r.width > 0; };
    const h1 = document.querySelector("h1");
    const hero = document.querySelector("#inicio");
    const sub = hero.querySelector("p");
    const cta = [...hero.querySelectorAll("a")].find((a) => /Pedí una demo/.test(a.textContent));
    const logo = document.querySelector("header a, header svg");
    return { h1: inView(h1), subtitle: inView(sub), subText: sub?.textContent.slice(0, 40), cta: inView(cta), ctaBottom: cta && Math.round(cta.getBoundingClientRect().bottom), logo: inView(document.querySelector("header")) && /MenuSky/.test(document.querySelector("header").textContent + (document.querySelector("header [aria-label]")?.getAttribute("aria-label") || "")), vh };
  });
  console.log(name, "FOLD", JSON.stringify(fold));
  check(`CA-1.2 ${name} above-the-fold (logo, h1, subtítulo, CTA)`, fold.h1 && fold.subtitle && fold.cta && fold.logo, fold);

  const before = await sweep(page, "before3D");
  // interact -> 3D
  await page.mouse.move(vp.width / 2, vp.height / 2);
  await page.mouse.move(vp.width / 2 + 40, vp.height / 2 + 20, { steps: 5 });
  if (name === "mobile") { await page.touchscreen.tap(10, 10).catch(() => {}); await page.mouse.wheel(0, 50); }
  let live = false;
  for (let i = 0; i < 40; i++) { if ((await page.$eval(".ms-hero3d", (e) => e.dataset.state)) === "live") { live = true; break; } await page.waitForTimeout(500); }
  const stateAfter = await page.$eval(".ms-hero3d", (e) => e.dataset.state);
  console.log(name, "3D state before interaction:", stateBefore, "after:", stateAfter, "chunks:", await page.evaluate(() => performance.getEntriesByType("resource").map((r) => r.name.split("/").pop()).filter((n) => /\.js/.test(n)).length));
  const after = await sweep(page, "after3D");
  const tot = { bytesKB: +(bytes / 1024).toFixed(1), requests: nreq };
  const cls = await page.evaluate(() => window.__cls);
  check(`CA-10.1 ${name} sin scroll horizontal antes del 3D`, before.maxSW <= before.iw, before);
  check(`CA-10.1 ${name} sin scroll horizontal después del 3D (estado=${stateAfter})`, after.maxSW <= after.iw, after);
  check(`CA-9.3 ${name} primera carga <= 1 MB (sin interacción)`, firstLoad.bytesKB <= 1024, firstLoad);
  console.log(name, "bytes incl. 3D:", JSON.stringify(tot));
  check(`CA-9/RNF-P1 ${name} CLS <= 0,1 en carga+scroll+3D`, cls <= 0.1, { cls });

  // CA-10.2 text clipping & image distortion
  const layout = await page.evaluate(() => {
    const issues = [];
    for (const e of document.querySelectorAll("h1,h2,h3,p,a,button,summary,li,span,label")) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (e.closest("[aria-hidden='true']") || e.closest("svg") || e.classList.contains("ms-sr-only")) continue;
      if (r.left < -1 || r.right > window.innerWidth + 1) { issues.push("outside:" + e.tagName + ":" + e.textContent.trim().slice(0, 30)); continue; }
      if ((cs.overflow === "hidden" || cs.overflowX === "hidden") && e.scrollWidth > e.clientWidth + 2 && cs.textOverflow !== "ellipsis" && e.textContent.trim()) issues.push("clipX:" + e.tagName + "." + String(e.className).slice(0, 30) + ":" + e.textContent.trim().slice(0, 30));
    }
    const imgs = [...document.querySelectorAll("img")].map((i) => { const r = i.getBoundingClientRect(); const cs = getComputedStyle(i); return { src: i.currentSrc.split("/").pop().slice(0, 40), nat: i.naturalWidth + "x" + i.naturalHeight, rend: Math.round(r.width) + "x" + Math.round(r.height), fit: cs.objectFit, loaded: i.complete && i.naturalWidth > 0, alt: i.alt, lazy: i.loading, w: i.getAttribute("width"), h: i.getAttribute("height") }; });
    return { issues, imgs };
  });
  console.log(name, "IMGS", JSON.stringify(layout.imgs));
  check(`CA-10.2 ${name} sin textos fuera de pantalla ni recortados en X`, layout.issues.length === 0, layout.issues.slice(0, 10));

  // CA-10.3 touch targets (mobile)
  if (name === "mobile") {
    const small = await page.evaluate(() => {
      const out = [];
      for (const e of document.querySelectorAll("a[href], button, summary, [role=button]")) {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        if (cs.display === "none" || cs.visibility === "hidden" || (!r.width && !r.height)) continue;
        if (e.closest("[aria-hidden='true']") || e.closest("[inert]")) continue;
        // include padding-based hit area == bounding box
        if (r.width < 43.5 || r.height < 43.5) out.push(`${e.tagName}:${e.textContent.trim().replace(/\s+/g, " ").slice(0, 30)}:${Math.round(r.width)}x${Math.round(r.height)}:${e.closest("footer") ? "footer" : e.closest("header") ? "header" : "main"}`);
      }
      return out;
    });
    check("CA-10.3 mobile objetivos táctiles >= 44x44", small.length === 0, small);
  }
  check(`CA-9.7 ${name} consola sin errores/advertencias (3D ${stateAfter})`, consoleMsgs.length === 0, consoleMsgs);
  summary[name] = { firstLoad, tot, cls, stateBefore, stateAfter, live, before: before.maxSW, after: after.maxSW };
  // screenshots for Director review (only the headless-or-headed default run)
  if (process.env.QA_SHOTS && (name === "mobile" || name === "desktop")) {
    const dir = "../capturas";
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: `${dir}/hero-${vp.width}x${vp.height}-${stateAfter}.png` });
  }
  await ctx.close();
}
console.log("SUMMARY", JSON.stringify(summary, null, 1));
await br.close();
