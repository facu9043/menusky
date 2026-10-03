// QA-02 re-test: no horizontal scroll at 180/320/360/768/1440 (before/after 3D), touch targets >= 44 at 180 and 320, CTA "Pedí una demo" reachable (and clickable -> exact WhatsApp URL in a new tab) at all widths.
import { launch, BASE, check } from "./lib.mjs";
const WA = "https://wa.me/5493624105311?text=Hola%2C%20vi%20MenuSky%20y%20quiero%20pedir%20una%20demo%20para%20mi%20restaurante%2C%20bar%20o%20caf%C3%A9.";
const br = await launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const sizes = [[180, 640], [180, 320], [259, 640], [260, 640], [290, 640], [320, 256], [320, 640], [359, 640], [360, 640], [768, 1024], [1440, 900]];
async function sweep(page) {
  return page.evaluate(async () => {
    let m = 0; const iw = innerWidth;
    for (let y = 0; y <= document.documentElement.scrollHeight; y += Math.max(150, Math.floor(innerHeight * 0.6))) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); m = Math.max(m, document.documentElement.scrollWidth, document.body.scrollWidth); }
    scrollTo(0, 0);
    const off = []; if (m > iw) for (const e of document.querySelectorAll("body *")) { const b = e.getBoundingClientRect(); if (b.right > iw + 1 && off.length < 6) off.push(e.tagName + "." + String(e.className).slice(0, 30) + " r=" + Math.round(b.right)); }
    return { maxSW: m, iw, off };
  });
}
for (const [w, h] of sizes) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: w < 400, isMobile: false });
  await ctx.route(/wa\.me/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "stub" }));
  const page = await ctx.newPage();
  const msgs = []; page.on("console", (m) => { if (["error", "warning"].includes(m.type())) msgs.push(m.text().slice(0, 120)); });
  await page.goto(BASE + "/", { waitUntil: "load" }); await page.waitForTimeout(1500);
  const b = await sweep(page);
  check(`CA-10.4 ${w}x${h} sin scroll horizontal antes del 3D`, b.maxSW <= b.iw, b);
  // CTA reachable: visible element with exact URL in header, or inside opened menu
  const reach = await page.evaluate(async (WA) => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0 && r.left >= -1 && r.right <= innerWidth + 1; };
    const links = [...document.querySelectorAll('a[href^="https://wa.me/"]')];
    return { total: links.length, exact: links.every((a) => a.href === WA), attrs: links.every((a) => a.target === "_blank" && /noopener/.test(a.rel) && /noreferrer/.test(a.rel)), visible: links.filter(vis).map((a) => (a.closest("header") ? (a.closest(".ms-mmenu") ? "menu" : "header") : a.closest("#inicio") ? "hero" : "other") + ":" + Math.round(a.getBoundingClientRect().width) + "x" + Math.round(a.getBoundingClientRect().height) + ":" + (a.getAttribute("aria-label") || a.textContent.trim().replace(/\s+/g, " ")).slice(0, 70)), };
  }, WA);
  check(`CA-2.1/2.4 ${w}x${h} todos los enlaces wa.me exactos con target/rel (DOM=${reach.total})`, reach.exact && reach.attrs && reach.total === 5, reach);
  // header CTA reachable by click
  let headerOK = false, how = "";
  const headerLink = page.locator('header a[href^="https://wa.me/"]:visible').first();
  if (await headerLink.count()) { how = "header-visible"; }
  else { await page.locator("summary.ms-mmenu__toggle").click(); await page.waitForTimeout(300); how = "menu"; }
  const target = how === "menu" ? page.locator('.ms-mmenu__panel a[href^="https://wa.me/"]:visible').first() : headerLink;
  const [popup] = await Promise.all([ctx.waitForEvent("page", { timeout: 4000 }).catch(() => null), target.click({ timeout: 4000 }).catch((e) => { how += " CLICKFAIL " + e.message.slice(0, 80); })]);
  headerOK = !!popup && popup.url().startsWith("https://wa.me/5493624105311");
  check(`CA-1.3/2.1 ${w}x${h} CTA "Pedí una demo" alcanzable por clic (${how}) -> WhatsApp en pestaña nueva`, headerOK, popup?.url()?.slice(0, 50));
  if (popup) await popup.close();
  await page.keyboard.press("Escape");
  // touch targets (widths 180 & 320): every visible interactive element, header menu opened too
  if (w === 180 || w === 320) {
    await page.evaluate(() => scrollTo(0, 0));
    const scan = () => page.evaluate(() => { const o = []; for (const e of document.querySelectorAll("a[href], button, summary, [role=button]")) { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden" || (!r.width && !r.height)) continue; if (e.closest("[aria-hidden='true']") || e.closest("[inert]")) continue; if (r.width < 43.5 || r.height < 43.5) o.push(`${e.tagName}:${e.textContent.trim().replace(/\s+/g, " ").slice(0, 28)}:${Math.round(r.width)}x${Math.round(r.height)}`); } return o; });
    const closed = await scan();
    await page.locator("summary.ms-mmenu__toggle").click(); await page.waitForTimeout(300);
    const opened = await scan();
    check(`CA-10.3 ${w}x${h} objetivos táctiles >= 44x44 (menú cerrado y abierto)`, closed.length === 0 && opened.length === 0, { closed, opened });
    await page.keyboard.press("Escape");
  }
  // 3D after interaction
  await page.mouse.move(w / 2, h / 2); await page.mouse.move(w / 2 + 20, h / 2 + 10, { steps: 4 }); await page.mouse.wheel(0, 40);
  let st = "static"; for (let i = 0; i < 30; i++) { st = await page.$eval(".ms-hero3d", (e) => e.dataset.state); if (st === "live") break; await page.waitForTimeout(500); }
  const a = await sweep(page);
  check(`CA-10.4 ${w}x${h} sin scroll horizontal después del 3D (estado=${st})`, a.maxSW <= a.iw, a);
  check(`CA-9.7 ${w}x${h} consola sin errores/advertencias`, msgs.length === 0, msgs);
  await ctx.close();
}
await br.close();
