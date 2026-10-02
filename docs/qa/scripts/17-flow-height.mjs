// Diagnostic: height of FlowDemo observed block vs viewport (IntersectionObserver threshold 0.35)
import { launch, BASE } from "./lib.mjs";
const br = await launch({ headless: true });
for (const [w, h] of [[360, 640], [320, 640], [320, 900], [320, 1200], [260, 640]]) {
  const p = await (await br.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(BASE + "/", { waitUntil: "load" });
  console.log(w, h, JSON.stringify(await p.evaluate(() => { const r = document.querySelector("#como-funciona"); return [...r.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().height > 300 && e.getBoundingClientRect().width > innerWidth * 0.5).slice(0, 6).map((e) => e.tagName + "." + String(e.className).slice(0, 25) + ":" + Math.round(e.getBoundingClientRect().height)); })));
}
await br.close();
