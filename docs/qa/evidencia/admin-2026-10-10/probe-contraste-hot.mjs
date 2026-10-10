// QA-AD-04: contraste de los textos de la tarjeta tomate "Pedidos de hoy" (Inicio y Carta) en 1440 y 360. CA-13.1.
import { launch, login, APP, resetMock } from "../../../design/admin/evidencia/carta-4a/lib.mjs";
await resetMock();
const b = await launch();
const lum = (rgb) => { const [r, g, bl] = rgb.match(/\d+/g).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
const ratio = (a, c) => { const [x, y] = [lum(a), lum(c)].sort((m, n) => n - m); return ((x + 0.05) / (y + 0.05)).toFixed(2); };
for (const [w, h] of [[1440, 900], [360, 640]]) {
  const c = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 768, isMobile: w < 768 });
  const p = await c.newPage();
  await login(p, "admin@demo.test", "/admin");
  for (const route of ["/admin", "/admin/menu"]) {
    await p.goto(APP + route, { waitUntil: "networkidle" }); await p.waitForTimeout(900);
    const rows = await p.evaluate(() => { const card = document.querySelector(".adm-stat--hot"); if (!card) return null; const bg = getComputedStyle(card).backgroundColor; return [...card.querySelectorAll("*")].filter((e) => e.children.length === 0 && e.textContent.trim()).map((e) => { const s = getComputedStyle(e); return { t: e.textContent.trim().slice(0, 24), color: s.color, px: s.fontSize, weight: s.fontWeight, op: s.opacity, bg }; }); });
    console.log(`${w}px ${route}:`);
    (rows ?? []).forEach((r) => console.log(`  "${r.t}" ${r.px}/${r.weight} color ${r.color} sobre ${r.bg} opacidad ${r.op} -> ${ratio(r.color, r.bg)}:1`));
    if (!rows) console.log("  (sin tarjeta .adm-stat--hot)");
  }
  await c.close();
}
await b.close();
