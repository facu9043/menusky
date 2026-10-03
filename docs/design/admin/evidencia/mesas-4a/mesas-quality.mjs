// Calidad de Mesas: scroll horizontal (CA-13.6), movimiento reducido
// (CA-12.4), foco visible (CA-5.8, CA-13.3) y axe (CA-13.10).
// Uso: TOOLS_DIR=... APP_URL=... MOCK_URL=... node mesas-quality.mjs
import { launch, login, MOCK, AxeBuilder, resetMock, check, note, summary } from "../carta-4a/lib.mjs";

const H = { apikey: "mock-anon-key", "content-type": "application/json" };
const A = "11111111-1111-4111-8111-111111111111";
const LONG40 = "Mesa del patio de atrás junto a la parri"; // 40 caracteres

await resetMock();
let adminToken = "";
// Preparación: una mesa libre con nombre de 40 caracteres (CA-13.6).
{
  const t = await (await fetch(`${MOCK}/auth/v1/token?grant_type=password`, { method: "POST", headers: H, body: JSON.stringify({ email: "admin@demo.test", password: "demo-1234" }) })).json();
  adminToken = t.access_token;
  const r = await fetch(`${MOCK}/rest/v1/tables`, {
    method: "POST",
    headers: { ...H, Authorization: `Bearer ${t.access_token}` },
    body: JSON.stringify({ restaurant_id: A, label: LONG40, qr_token: "mesa-larga-q40" }),
  });
  check(`preparación: mesa de ${LONG40.length} caracteres`, r.ok && LONG40.length === 40);
}
const browser = await launch();
const settle = (p) => p.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime !== Infinity).map((a) => a.finished.catch(() => {}))));

// ---------- Scroll horizontal (CA-13.6) ----------
const overflow = (p) => p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
for (const w of [320, 360, 390, 768, 1440]) {
  const mobile = w < 768;
  const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 700 : 900 }, hasTouch: mobile, isMobile: mobile });
  const p = await ctx.newPage();
  await login(p, "admin@demo.test", "/admin/mesas");
  await p.waitForSelector(".adm-table");
  const states = [];
  let all = true;
  const probe = async (label) => {
    const o = await overflow(p);
    states.push(`${label}:${o.sw}/${o.iw}`);
    all = o.sw <= o.iw && all;
  };
  await probe("mesas");
  if (mobile) {
    await p.locator(".adm-table__row").first().click();
    await probe("hoja-animando");
    await p.getByRole("dialog").waitFor();
    await settle(p);
    await probe("hoja");
    await p.getByRole("dialog").getByRole("button", { name: "Eliminar mesa" }).click();
    await p.getByRole("alertdialog").waitFor();
    await probe("confirmación");
    await p.keyboard.press("Escape");
    await p.getByRole("alertdialog").waitFor({ state: "hidden" });
    await p.keyboard.press("Escape");
    await p.getByRole("dialog").waitFor({ state: "hidden" });
  } else {
    await p.locator(".adm-table").first().getByRole("button", { name: /Más acciones/ }).click();
    await p.getByRole("menuitem", { name: "Eliminar mesa" }).click();
    await p.getByRole("alertdialog").waitFor();
    await probe("confirmación");
    await p.keyboard.press("Escape");
    await p.getByRole("alertdialog").waitFor({ state: "hidden" });
  }
  await p.getByRole("button", { name: "Nueva mesa" }).first().click();
  await p.getByRole("dialog", { name: "Nueva mesa" }).waitFor();
  await probe("nueva-mesa");
  await p.keyboard.press("Escape");
  await p.getByRole("dialog").waitFor({ state: "hidden" });
  await p.getByRole("button", { name: "Imprimir todos" }).click();
  await p.getByRole("button", { name: "Imprimir", exact: true }).waitFor({ timeout: 15000 });
  await probe("vista-impresión");
  await p.keyboard.press("Escape");
  await p.getByRole("dialog").waitFor({ state: "hidden" });
  await p.locator(".adm-pill[data-filter='free']").click();
  await probe("filtro-libres");
  check(`CA-13.6 sin scroll horizontal en Mesas a ${w}px (mesa de 40 caracteres incluida)`, all, states.join(" "));
  await ctx.close();
}

// Se quita la mesa larga: el resto usa los datos de partida (sin mesas libres: filtro vacío con Pomo).
await fetch(`${MOCK}/rest/v1/tables?qr_token=eq.mesa-larga-q40`, { method: "DELETE", headers: { ...H, Authorization: `Bearer ${adminToken}` } });

// ---------- Movimiento reducido (CA-12.4) ----------
async function motionRun(reduce) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: reduce ? "reduce" : "no-preference", hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await login(p, "admin@demo.test", "/admin/mesas");
  await p.waitForSelector(".adm-table__row");
  await p.waitForTimeout(400);
  const count = () => p.evaluate(() => document.getAnimations().length);
  const out = {};
  out["reposo"] = await count();
  await p.locator(".adm-table__row").first().click();
  await p.getByRole("dialog").waitFor();
  out["abrir hoja"] = await count();
  await p.waitForTimeout(450);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(30);
  out["cerrar hoja"] = await count();
  await p.getByRole("dialog").waitFor({ state: "hidden" });
  await p.waitForTimeout(400);
  await p.locator(".adm-pill[data-filter='occupied']").click();
  await p.waitForTimeout(30);
  out["píldora"] = await count();
  await p.waitForTimeout(400);
  await p.locator(".adm-pill[data-filter='free']").click();
  await p.locator(".adm-empty").waitFor();
  await p.waitForTimeout(30);
  out["vacío con Pomo"] = await count();
  await p.waitForTimeout(700);
  await p.getByRole("button", { name: "Imprimir todos" }).click();
  await p.getByRole("dialog").waitFor();
  await p.waitForTimeout(30);
  out["vista impresión"] = await count();
  await ctx.close();
  return out;
}
const reduced = await motionRun(true);
check("CA-12.4 con reduce: getAnimations() = 0 en reposo y tras cada acción", Object.values(reduced).every((n) => n === 0), JSON.stringify(reduced));
const full = await motionRun(false);
note(`sin reduce (control: el movimiento existe): ${JSON.stringify(full)}`);
check("HU-12 sin reduce hay animación al abrir la hoja", full["abrir hoja"] > 0);

// ---------- Foco visible (CA-13.3) ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await login(p, "admin@demo.test", "/admin/mesas");
  await p.waitForSelector(".adm-table__card");
  await p.locator("h1").click();
  const seen = [];
  let ok = true;
  for (let i = 0; i < 16; i++) {
    await p.keyboard.press("Tab");
    const f = await p.evaluate(() => {
      const a = document.activeElement;
      if (!a || !a.closest("main")) return null;
      const cs = getComputedStyle(a);
      return { name: a.getAttribute("aria-label") || a.textContent.trim().slice(0, 24), w: parseFloat(cs.outlineWidth), style: cs.outlineStyle, color: cs.outlineColor };
    });
    if (!f) continue;
    seen.push(`${f.name}=${f.w}px ${f.color}`);
    ok = ok && f.style !== "none" && f.w >= 2;
  }
  check("CA-13.3 foco visible >= 2 px en botones, píldoras, ⋯ y enlaces de las tarjetas", ok && seen.length >= 8, seen.join(" | "));
  await ctx.close();
}

// ---------- axe (CA-13.10) ----------
async function axe(p, label) {
  await p.waitForFunction(() => document.title.trim().length > 0, null, { timeout: 5000 });
  const r = await new AxeBuilder({ page: p }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  check(`CA-13.10 axe ${label}: 0 críticos/serios`, serious.length === 0, r.violations.map((v) => `${v.id}:${v.impact}:${v.nodes.length}`).join(", ") || "sin violaciones");
  for (const v of r.violations) for (const n of v.nodes.slice(0, 3)) note(`${v.id} -> ${n.target.join(" ")} | ${n.failureSummary?.split("\n")[1] ?? ""}`);
}
for (const [w, h] of [
  [1440, 900],
  [360, 640],
]) {
  const mobile = w < 768;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce", hasTouch: mobile, isMobile: mobile });
  const p = await ctx.newPage();
  await login(p, "admin@demo.test", "/admin/mesas");
  await p.waitForSelector(".adm-table");
  // Solo los QR visibles (los de la variante oculta, lazy + display:none, no cargan).
  await p.waitForFunction(() => [...document.images].filter((i) => i.getClientRects().length).every((i) => i.complete), null, { timeout: 15000 });
  await axe(p, `mesas ${w}`);
  if (mobile) {
    await p.locator(".adm-table__row").first().click();
    await p.getByRole("dialog").waitFor();
    await p.waitForTimeout(300);
    await axe(p, `hoja de mesa ${w}`);
    await p.getByRole("dialog").getByRole("button", { name: "Eliminar mesa" }).click();
  } else {
    await p.locator(".adm-table").first().getByRole("button", { name: /Más acciones/ }).click();
    await p.getByRole("menuitem", { name: "Eliminar mesa" }).click();
  }
  await p.getByRole("alertdialog").waitFor();
  await p.waitForTimeout(300);
  await axe(p, `confirmación ${w}`);
  await p.keyboard.press("Escape");
  await p.getByRole("alertdialog").waitFor({ state: "hidden" });
  if (mobile) {
    await p.keyboard.press("Escape");
    await p.getByRole("dialog").waitFor({ state: "hidden" });
  }
  await p.getByRole("button", { name: "Nueva mesa" }).first().click();
  await p.getByRole("dialog", { name: "Nueva mesa" }).waitFor();
  await p.waitForTimeout(300);
  await axe(p, `nueva mesa ${w}`);
  await p.keyboard.press("Escape");
  await p.getByRole("dialog").waitFor({ state: "hidden" });
  await p.getByRole("button", { name: "Imprimir todos" }).click();
  await p.getByRole("button", { name: "Imprimir", exact: true }).waitFor({ timeout: 15000 });
  await axe(p, `vista de impresión ${w}`);
  await p.keyboard.press("Escape");
  await p.getByRole("dialog").waitFor({ state: "hidden" });
  await p.locator(".adm-pill[data-filter='free']").click();
  await p.locator(".adm-pill[data-filter='calling']").click();
  await p.locator(".adm-pill[data-filter='free']").click();
  await axe(p, `filtro (Libres) ${w}`);
  await ctx.close();
}

await browser.close();
await resetMock();
process.exitCode = summary() ? 1 : 0;
