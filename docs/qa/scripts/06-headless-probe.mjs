// Investigate headless-only differences: (a) reveal blocks not visible after scroll, (b) Enter on "Ingresar" not navigating in time
import { launch, BASE } from "./lib.mjs";
const br = await launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
{
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(800);
  await page.evaluate(async () => { for (let y = 0; y <= document.documentElement.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); } });
  for (const wait of [900, 3000]) {
    await page.waitForTimeout(wait);
    const left = await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].filter((e) => getComputedStyle(e).opacity !== "1").map((e) => (e.closest("section,footer")?.id || e.closest("footer")?.tagName) + ":" + String(e.className).slice(0, 30) + ":op=" + getComputedStyle(e).opacity + ":top=" + Math.round(e.getBoundingClientRect().top + scrollY)));
    console.log("after extra wait", wait, "not-visible reveal blocks:", JSON.stringify(left), "scrollY", await page.evaluate(() => scrollY), "H", await page.evaluate(() => document.documentElement.scrollHeight));
  }
  // Now scroll back to each still-hidden block: does it reveal when it is actually in view?
  await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].forEach((e, i) => e.setAttribute("data-qa-i", i)));
  const hidden = await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].filter((e) => getComputedStyle(e).opacity !== "1").map((e) => e.getAttribute("data-qa-i")));
  const res = [];
  for (const i of hidden) {
    await page.evaluate((i) => { const e = document.querySelector(`[data-qa-i="${i}"]`); e.scrollIntoView({ block: "center" }); }, i);
    await page.waitForTimeout(2500);
    const op = await page.evaluate((i) => { const e = document.querySelector(`[data-qa-i="${i}"]`); const r = e.getBoundingClientRect(); return getComputedStyle(e).opacity + (r.top < innerHeight && r.bottom > 0 ? " (in view)" : " (NOT in view)"); }, i);
    res.push(i + ":op=" + op);
  }
  console.log("when scrolled back into view, hidden blocks become:", JSON.stringify(res));
  await ctx.close();
}
{
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(800);
  let n = 0;
  for (let i = 0; i < 40; i++) { await page.keyboard.press("Tab"); n++; if ((await page.evaluate(() => document.activeElement.getAttribute("href"))) === "/login") break; }
  const t0 = Date.now();
  await page.keyboard.press("Enter");
  let url = page.url();
  for (let i = 0; i < 40 && !/login/.test(url); i++) { await page.waitForTimeout(500); url = page.url(); }
  console.log("Enter on Ingresar after", n, "tabs; navigated to", url, "in ms", Date.now() - t0, "3D state", await page.$eval(".ms-hero3d", (e) => e.dataset.state).catch(() => "n/a"));
  await ctx.close();
}
await br.close();
