// CA-10.5 approximation: Playwright Firefox and WebKit (WebKit of Playwright is NOT real Safari). Usage: node 13-crossbrowser.mjs firefox|webkit
import { firefox, webkit } from "playwright";
import { BASE, VIEWPORTS, check } from "./lib.mjs";
const which = process.argv[2];
const br = await (which === "webkit" ? webkit : firefox).launch({ headless: true });
console.log("browser", which, br.version());
for (const [name, vp] of Object.entries(VIEWPORTS)) {
  const ctx = await br.newContext({ viewport: vp, hasTouch: name === "mobile" });
  const page = await ctx.newPage();
  const msgs = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) msgs.push(m.type() + ": " + m.text().slice(0, 160)); });
  page.on("pageerror", (e) => msgs.push("pageerror: " + e.message.slice(0, 160)));
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(async () => {
    let m = 0;
    for (let y = 0; y <= document.documentElement.scrollHeight; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); m = Math.max(m, document.documentElement.scrollWidth); }
    scrollTo(0, 0);
    return { maxSW: m, iw: innerWidth, h1: document.querySelectorAll("h1").length, cta: document.querySelector('#inicio a[href^="https://wa.me/5493624105311"]')?.getBoundingClientRect().width > 0 };
  });
  await page.mouse.move(vp.width / 2, vp.height / 2); await page.mouse.move(vp.width / 2 + 30, vp.height / 2 + 20, { steps: 4 }); await page.mouse.wheel(0, 40);
  let st = "static";
  for (let i = 0; i < 30; i++) { st = await page.$eval(".ms-hero3d", (e) => e.dataset.state); if (st === "live") break; await page.waitForTimeout(500); }
  const after = await page.evaluate(async () => { let m = 0; for (let y = 0; y <= document.documentElement.scrollHeight; y += 300) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); m = Math.max(m, document.documentElement.scrollWidth); } return m; });
  console.log(which, name, "3D state after interaction:", st);
  check(`CA-10.5 ${which} ${name}: h1 único, CTA visible, sin scroll horizontal (antes y después del 3D)`, before.h1 === 1 && before.cta && before.maxSW <= before.iw && after <= before.iw, { ...before, afterSW: after, state3D: st });
  check(`CA-9.7 ${which} ${name}: consola sin errores/advertencias`, msgs.length === 0, msgs);
  if (name !== "tablet") await page.screenshot({ path: `out/${which}-${name}.png` });
  await ctx.close();
}
await br.close();
