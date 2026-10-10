// QA-AD-03 y QA-AD-04 (Frontend). No es parte de la app.
// Mide en el navegador real (Chrome headless, build de producción + mock):
//  - QA-AD-04: color computado del número de "Pedidos de hoy" en Inicio y en Carta,
//    fondo de la tarjeta y ratio de contraste WCAG (1440 y 390).
//  - QA-AD-03: duración computada de la entrada de Pomo en el estado vacío
//    (getComputedStyle y getAnimations), con y sin reduced-motion.
//  - Que --ms-dur-reveal sigue en 560ms en / y /login (y en el admin).
// Capturas: inicio-<etiqueta>-<WxH>.png y vacio-<etiqueta>-<WxH>.png en esta carpeta.
// Uso: TOOLS_DIR=... APP_URL=... MOCK_URL=<proxy> node probe-qa-03-04.mjs antes|despues
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch, login, APP, resetMock, check, note, summary } from "../../../../design/admin/evidencia/carta-4a/lib.mjs";
import { fault, NO_FAULTS, emptyRestaurantB, wait } from "../../../../design/admin/evidencia/inicio-apariencia-4b/lib4b.mjs";

const OUT = path.dirname(fileURLToPath(import.meta.url));
const label = process.argv[2] ?? "despues";
const after = label === "despues";

function lum([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
// El build minifica los tiempos (560ms -> .56s): se comparan en ms.
const toMs = (s) => (s.endsWith("ms") ? parseFloat(s) : parseFloat(s) * 1000);
const rgb = (s) => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
function ratio(a, b) {
  const [l1, l2] = [lum(rgb(a)), lum(rgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Color del número y fondo de la tarjeta tomate (.adm-stat--hot) en la página actual. */
async function hotCard(page) {
  return page.evaluate(() => {
    const card = document.querySelector(".adm-stat--hot");
    const v = card.querySelector(".adm-stat__value");
    const cs = getComputedStyle(v);
    return {
      text: v.textContent.trim(),
      color: cs.color,
      size: cs.fontSize,
      weight: cs.fontWeight,
      bg: getComputedStyle(card).backgroundColor,
      label: getComputedStyle(card.querySelector(".adm-stat__label")).color,
    };
  });
}

await resetMock();
await fault(NO_FAULTS);
const browser = await launch();
note(`etiqueta: ${label} | APP ${APP}`);

for (const [w, h] of [
  [1440, 900],
  [390, 844],
]) {
  const tag = `${w}x${h}`;
  const mobile = w < 768;
  const ctxOpts = { viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile };

  // ---------- QA-AD-04: Inicio y Carta (restaurante A) ----------
  await resetMock();
  let ctx = await browser.newContext({ ...ctxOpts, reducedMotion: "reduce" });
  let page = await ctx.newPage();
  await login(page, "admin@demo.test", "/admin");
  await page.waitForSelector(".adm-kpis .adm-stat--hot .adm-stat__value");
  await page.evaluate(() => document.fonts.ready);
  const ini = await hotCard(page);
  const rIni = ratio(ini.color, ini.bg);
  note(`[${tag}] Inicio "Pedidos de hoy": numero "${ini.text}" ${ini.size}/${ini.weight} color ${ini.color} sobre ${ini.bg} = ${rIni.toFixed(2)}:1; etiqueta ${ini.label}`);
  await wait(300);
  await page.screenshot({ path: path.join(OUT, `inicio-${label}-${tag}.png`), fullPage: mobile });

  await page.goto(`${APP}/admin/menu`);
  await page.waitForSelector(".adm-stats .adm-stat--hot .adm-stat__value");
  const car = await hotCard(page);
  const rCar = ratio(car.color, car.bg);
  note(`[${tag}] Carta "Pedidos hoy": numero "${car.text}" color ${car.color} sobre ${car.bg} = ${rCar.toFixed(2)}:1`);
  if (after) {
    check(`QA-AD-04 [${tag}] numero de Inicio en papel, igual que la Carta`, ini.color === car.color && ini.color === ini.label, `${ini.color} vs Carta ${car.color}`);
    check(`QA-AD-04 [${tag}] contraste del numero >= 4.5:1`, rIni >= 4.5, `${rIni.toFixed(2)}:1`);
  }
  // Token global intacto también dentro del admin; duración propia del admin.
  const admTok = await page.evaluate(() => {
    const el = document.querySelector(".ms-admin");
    const cs = getComputedStyle(el);
    return { reveal: cs.getPropertyValue("--ms-dur-reveal").trim(), enter: cs.getPropertyValue("--adm-dur-enter").trim() };
  });
  note(`[${tag}] admin: --ms-dur-reveal=${admTok.reveal} --adm-dur-enter=${admTok.enter || "(no definido)"}`);
  await ctx.close();

  // ---------- QA-AD-03: Pomo en el estado vacío (restaurante B vaciado) ----------
  await resetMock();
  await emptyRestaurantB({ menu: true });
  for (const rm of ["no-preference", "reduce"]) {
    ctx = await browser.newContext({ ...ctxOpts, reducedMotion: rm });
    page = await ctx.newPage();
    await login(page, "admin-b@demo.test", "/admin/menu");
    await page.getByText("Tu carta está vacía").waitFor();
    const pomo = await page.evaluate(() => {
      const el = document.querySelector(".adm-empty .adm-pomo");
      const cs = getComputedStyle(el);
      const anims = el.getAnimations().map((a) => ({ name: a.animationName, dur: a.effect.getTiming().duration }));
      return { name: cs.animationName, dur: cs.animationDuration, anims };
    });
    note(`[${tag}] Pomo (${rm}): animation-name=${pomo.name} animation-duration=${pomo.dur} getAnimations=${JSON.stringify(pomo.anims)}`);
    const ms = toMs(pomo.dur);
    if (rm === "no-preference") {
      if (after) {
        check(`QA-AD-03 [${tag}] entrada de Pomo <= 400 ms`, pomo.name === "adm-rise" && ms > 0 && ms <= 400, `${pomo.name} ${ms} ms`);
      }
      await wait(700); // la entrada ya terminó
      await page.screenshot({ path: path.join(OUT, `vacio-${label}-${tag}.png`) });
    } else {
      check(`QA-AD-03 [${tag}] reduced-motion apaga la entrada de Pomo`, pomo.name === "none" && pomo.anims.length === 0, `${pomo.name}, ${pomo.anims.length} animaciones`);
    }
    await ctx.close();
  }
}

// ---------- --ms-dur-reveal en / y /login (token global sin cambios) ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  for (const p of ["/", "/login"]) {
    await page.goto(`${APP}${p}`);
    const v = await page.evaluate(() => {
      const el = document.querySelector(".ms-brand");
      return el ? getComputedStyle(el).getPropertyValue("--ms-dur-reveal").trim() : "(sin .ms-brand)";
    });
    check(`--ms-dur-reveal en ${p} sigue en 560ms`, toMs(v) === 560, `${v} = ${toMs(v)} ms`);
  }
  await ctx.close();
}

await fault(NO_FAULTS);
await resetMock();
await browser.close();
process.exit(summary() ? 1 : 0);
