// CA-9.4 (LCP element identity, NOT timing), CA-9.5 (image formats/dimensions/lazy), CA-9.6 (long tasks during hero scroll with CPU 4x), 3D worker/main-thread
// Lighthouse Performance score/LCP time/TBT are deliberately NOT evaluated (Director decision: PENDIENTE, measure on another PC).
import { launch, BASE, check } from "./lib.mjs";

const br = await launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

// --- CA-9.4 + CA-9.5 on mobile and desktop
for (const [name, vp, mobile] of [["mobile", { width: 360, height: 640 }, true], ["desktop", { width: 1440, height: 900 }, false]]) {
  const ctx = await br.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__lcp = null;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = { tag: e.element?.tagName, cls: String(e.element?.className || "").slice(0, 40), text: (e.element?.textContent || "").trim().slice(0, 40), url: e.url || null, size: e.size }; }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  const imgReqs = [];
  page.on("response", (r) => { if (/\.(webp|avif|png|jpe?g|svg)|\/_next\/image/.test(r.url())) imgReqs.push({ u: r.url().replace(BASE, "").slice(0, 70), type: r.headers()["content-type"], len: r.headers()["content-length"] }); });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const lcp = await page.evaluate(() => window.__lcp);
  console.log(name, "LCP element:", JSON.stringify(lcp));
  check(`CA-9.4 ${name} el elemento LCP es texto/imagen estática, no el canvas`, !!lcp && lcp.tag !== "CANVAS" && lcp.tag !== undefined, lcp);
  const imgs = await page.evaluate(() => [...document.querySelectorAll("img")].map((i) => ({ src: i.currentSrc.replace(location.origin, "").slice(0, 70), w: i.getAttribute("width"), h: i.getAttribute("height"), lazy: i.loading, srcset: !!i.srcset, sizes: i.sizes, alt: i.alt, top: Math.round(i.getBoundingClientRect().top + scrollY), prio: i.fetchPriority })));
  const notDims = imgs.filter((i) => !i.w || !i.h);
  const aboveLazy = imgs.filter((i) => i.top < vp.height && i.lazy === "lazy");
  const belowEager = imgs.filter((i) => i.top > vp.height * 1.5 && i.lazy !== "lazy");
  const noWebp = imgReqs.filter((r) => !/webp|avif|svg/.test(r.type || ""));
  console.log(name, "images:", imgs.length, "requests:", JSON.stringify(imgReqs));
  check(`CA-9.5 ${name} imágenes con dimensiones, WebP/AVIF, lazy debajo del pliegue`, notDims.length === 0 && belowEager.length === 0 && noWebp.length === 0, { total: imgs.length, notDims: notDims.length, belowEager: belowEager.length, noWebp, aboveLazy: aboveLazy.length });
  const altBad = imgs.filter((i) => i.alt === null || i.alt === undefined);
  console.log(name, "img alts:", JSON.stringify(imgs.map((i) => i.alt.slice(0, 50))));
  check(`CA-4.3/RNF-A4 ${name} todas las <img> tienen atributo alt`, altBad.length === 0, imgs.length);
  await ctx.close();
}

// --- CA-9.6 long tasks during hero scroll with CPU 4x slower (mobile), with 3D started
{
  const ctx = await br.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.addInitScript(() => {
    window.__lt = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push({ d: Math.round(e.duration), t: Math.round(e.startTime) }); }).observe({ type: "longtask", buffered: true });
  });
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(2000);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.RATE || 4) });
  await page.evaluate(() => { window.__lt.length = 0; window.__t0 = performance.now(); });
  // scroll the hero in small touch-like steps (this also triggers the 3D after first interaction)
  for (let y = 0; y <= 900; y += 60) { await page.mouse.wheel(0, 60); await page.waitForTimeout(60); }
  await page.waitForTimeout(6000);
  const lt = await page.evaluate(() => window.__lt);
  const st = await page.$eval(".ms-hero3d", (e) => e.dataset.state);
  const max = lt.reduce((m, x) => Math.max(m, x.d), 0);
  console.log("CPU 4x hero scroll: long tasks", JSON.stringify(lt), "3D state", st);
  check(`CA-9.6 CPU ${process.env.RATE || 4}x: ninguna tarea larga > 200 ms durante el scroll del hero (carga del 3D incluida)`, max <= 200, { count: lt.length, maxMs: max, state3D: st, note: "headless SwiftShader en Celeron N4020; CPU 4x sobre un equipo ya lento" });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await ctx.close();
}
await br.close();
