// QA-CS-01: scroll-padding del documento solo en las páginas de staff; el admin queda igual.
import { launch, login, check, summary, APP, resetMock } from "../lib-staff.mjs";
await resetMock();
const b = await launch();
for (const [w, h] of [[360, 640], [768, 1024], [1280, 800]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await login(p, "admin@demo.test", "/kitchen");
  const sp = () => p.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingTop);
  const k = await sp();
  await p.goto(`${APP}/floor`); await p.waitForSelector("h1");
  const f = await sp();
  await p.goto(`${APP}/admin/menu`); await p.waitForSelector("h1");
  const a = await sp();
  const want = w >= 768 ? "80px" : "78px";
  check(`${w}x${h}: scroll-padding-top /kitchen=${k}, /floor=${f} (esperado ${want}); /admin/menu=${a} (esperado auto)`, k === want && f === want && a === "auto");
  await ctx.close();
}
await b.close();
process.exitCode = summary() ? 1 : 0;
