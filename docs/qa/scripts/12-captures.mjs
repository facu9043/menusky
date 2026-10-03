// Captures for the Director's review (CA-1.5 / CA-8.13): hero (3D live, headed Chrome with GPU) and full page, at 360x640 and 1440x900
import { launch, BASE } from "./lib.mjs";
import fs from "node:fs";
const dir = "../capturas";
fs.mkdirSync(dir, { recursive: true });
const br = await launch({ headless: false });
for (const [name, vp, mobile] of [["360x640", { width: 360, height: 640 }, true], ["1440x900", { width: 1440, height: 900 }, false]]) {
  const ctx = await br.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/hero-${name}-antes-del-3D.png` });
  await page.mouse.move(vp.width * 0.6, vp.height * 0.5);
  await page.mouse.move(vp.width * 0.7, vp.height * 0.4, { steps: 5 });
  for (let i = 0; i < 40; i++) { if ((await page.$eval(".ms-hero3d", (e) => e.dataset.state)) === "live") break; await page.waitForTimeout(500); }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/hero-${name}-3D-live.png` });
  // full-page screenshots come out blank for content-visibility sections, so capture each section in the viewport instead
  for (const id of ["beneficios", "como-funciona", "funciones", "equipo", "a-tu-medida", "preguntas", "demo"]) {
    await page.evaluate((id) => { document.documentElement.style.scrollBehavior = "auto"; document.getElementById(id).scrollIntoView({ block: "start" }); }, id);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${dir}/seccion-${id}-${name}.png` });
  }
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; scrollTo(0, document.documentElement.scrollHeight); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/pie-${name}.png` });
  if (mobile) {
    await page.evaluate(() => document.querySelector(".ms-hero__stage").scrollIntoView({ block: "center" }));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/hero-escena-3D-${name}.png` });
  }
  await ctx.close();
}
await br.close();
