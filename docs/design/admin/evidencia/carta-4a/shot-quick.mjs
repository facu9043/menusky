import { launch, login, APP } from "./lib.mjs";
const out = process.argv[2];
const b = await launch();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await login(p);
  await p.goto(`${APP}/admin/menu`);
  await p.waitForSelector(".adm-dish");
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/q-${w}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
