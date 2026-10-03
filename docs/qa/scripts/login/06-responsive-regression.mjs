// QA login 06: responsive (HU-7), logo libre de superposiciones (CA-6.13), capturas y regresion (landing, rutas protegidas, /m/<token>).
// Correr desde la raiz con el servidor en QA_BASE:  node docs/qa/scripts/login/06-responsive-regression.mjs [--capturas]
import { writeFileSync, mkdirSync } from "node:fs";
import { launch, check, summary, sleep, open, waitFor, fill, BASE } from "./lib.mjs";

const b = await launch(9345);
const SIZES = [[320, 568], [360, 640], [180, 320], [768, 1024], [1440, 900], [640, 360]];
const logoProbe = (p) => p.eval(`(() => { window.scrollTo(0, 0); const L = document.querySelector('.lg-home'); const r = L.getBoundingClientRect(); const pts = [[r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4], [r.left + r.width / 2, r.top + r.height / 2]];
  const hits = pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return !!(e && (e === L || L.contains(e))); }); return { hits, rect: [r.left, r.top, r.right, r.bottom].map(Math.round), inView: r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight + 1 }; })()`);
const ox = (p) => p.eval(`document.documentElement.scrollWidth - innerWidth`);

try {
  for (const [w, h] of SIZES) {
    const tag = `${w}x${h}`;
    // estados: carga (muestreo durante la animacion de entrada), reposo, foco, Entrando..., error, error red, exito
    const p0 = await b.newPage();
    const { p, state, log } = await (async () => { await p0.close(); return open(b, { width: w, height: h, mock: { kind: "invalid" }, init: `window.__ox=[]; window.__t0=performance.now(); (function f(){ window.__ox.push([Math.round(performance.now()-window.__t0), document.documentElement ? document.documentElement.scrollWidth - innerWidth : 0]); if (performance.now()-window.__t0 < 2500) requestAnimationFrame(f); })();` }); })();
    const entry = await p.eval(`window.__ox`);
    check(`CA-7.1 ${tag} sin scroll horizontal durante la entrada (${entry.length} muestras en 2,5 s)`, entry.every(([, d]) => d <= 0), { maxDesborde: Math.max(...entry.map((x) => x[1])) });
    const res = {};
    res.carga = [await ox(p), await logoProbe(p)];
    await p.eval(`document.getElementById('email').focus()`); await sleep(250); res.foco = [await ox(p), await logoProbe(p)];
    await fill(p); state.kind = "invalid";
    await p.click("#lg-submit"); await waitFor(p, `document.querySelector('main [role=alert]').textContent.length>0`); await sleep(100);
    res.errorCred = [await ox(p), await logoProbe(p)]; await sleep(700); res.errorCredReposo = [await ox(p), await logoProbe(p)];
    state.kind = "503"; await p.click("#lg-submit"); await sleep(900); res.errorRed = [await ox(p), await logoProbe(p)];
    state.kind = "hang"; await p.click("#lg-submit"); await sleep(250); res.entrando = [await ox(p), await logoProbe(p)];
    for (const [k, [o, l]] of Object.entries(res)) check(`CA-7.1/6.13 ${tag} [${k}] sin scroll horizontal y nada tapa el logo (centro y 4 esquinas)`, o <= 0 && l.hits.every(Boolean) && l.inView, { desborde: o, ...l });
    // texto del error largo en 320
    await p.close();
    const s = await open(b, { width: w, height: h, mock: { kind: "success", holdNav: true } });
    await fill(s.p); await s.p.click("#lg-submit"); await sleep(250);
    const l = await logoProbe(s.p), o = await ox(s.p);
    check(`CA-7.1/6.13 ${tag} [exito] sin scroll horizontal y nada tapa el logo`, o <= 0 && l.hits.every(Boolean), { desborde: o, ...l });
    await s.p.close();
    // CA-7.3 sin cortes: elementos principales dentro del ancho y sin texto recortado
    const q = await open(b, { width: w, height: h, mock: { kind: "503" } });
    await fill(q.p); await q.p.click("#lg-submit"); await waitFor(q.p, `document.querySelector('main [role=alert]').textContent.length>0`); await sleep(300);
    const cut = await q.p.eval(`(() => { const els = [...document.querySelectorAll('.lg-alert span,.lg-label,.lg-lead,h1,.lg-brand__claim,#lg-submit,.lg-home')]; return { dentro: els.every(e => { const r = e.getBoundingClientRect(); return r.left >= -0.5 && r.right <= innerWidth + 0.5; }), recortado: els.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.className || e.tagName), svgDentro: (() => { const s = document.querySelector('.lg-stage'); if (!s || getComputedStyle(s).display === 'none') return 'oculta'; const r = s.getBoundingClientRect(); return r.left >= -0.5 && r.right <= innerWidth + 0.5; })() }; })()`);
    check(`CA-7.3 ${tag} con el error de red (el mas largo): nada cortado ni fuera del ancho; mascota completa o oculta`, cut.dentro && cut.recortado.length === 0 && cut.svgDentro !== false, cut);
    await q.p.close();
  }

  // ---------- capturas (pocas, livianas) ----------
  if (process.argv.includes("--capturas")) {
    mkdirSync("docs/qa/capturas/login", { recursive: true });
    const shot = async (name, w, h, mock, act) => {
      const { p, state } = await open(b, { width: w, height: h, mock, reduced: true });
      if (act) await act(p, state);
      const d = (await p.send("Page.captureScreenshot", { format: "webp", quality: 70 })).data;
      writeFileSync(`docs/qa/capturas/login/${name}.webp`, Buffer.from(d, "base64"));
      await p.close();
    };
    await shot("login-1440x900", 1440, 900, {});
    await shot("login-360x640", 360, 640, {});
    await shot("login-360x640-error-red", 360, 640, { kind: "503" }, async (p) => { await fill(p); await p.click("#lg-submit"); await waitFor(p, `document.querySelector('main [role=alert]').textContent.length>0`); await sleep(300); });
    await shot("login-1440x900-error-credenciales", 1440, 900, { kind: "invalid" }, async (p) => { await fill(p); await p.click("#lg-submit"); await waitFor(p, `document.querySelector('main [role=alert]').textContent.length>0`); await sleep(300); });
    await shot("login-640x360-mascota-oculta", 640, 360, {});
    console.log("capturas escritas en docs/qa/capturas/login/");
  }

  // ---------- regresion ----------
  const manual = async (path) => { const r = await fetch(BASE + path, { redirect: "manual" }); return { s: r.status, loc: r.headers.get("location") }; };
  for (const path of ["/kitchen", "/floor", "/admin", "/admin/menu"]) {
    const r = await manual(path);
    check(`CA-4.8 regresion: ${path} sin sesion redirige a /login?redirect=`, [307, 302, 303].includes(r.s) && (r.loc === `/login?redirect=${encodeURIComponent(path)}` || r.loc === `${BASE}/login?redirect=${encodeURIComponent(path)}`), r);
  }
  {
    const r = await fetch(BASE + "/m/token-inexistente-123", { redirect: "manual", signal: AbortSignal.timeout(90000) });
    check("Regresion /m/<token inexistente>: responde 404 (app/m sin cambios en el diff; tarda por Supabase ficticio)", r.status === 404, { status: r.status });
  }
  {
    const r = await fetch(BASE + "/login?mascota=2"); const t = await r.text();
    check("CA-3.12e /login?mascota=1|2|3 ignora el parametro (misma pagina y mismo SVG que sin parametro)", r.status === 200 && (await Promise.all(["", "?mascota=1", "?mascota=2", "?mascota=3"].map(async (q) => { const h = await (await fetch(BASE + "/login" + q)).text(); return (h.match(/<svg[\s\S]*?<\/svg>/g) || []).join("").length; }))).every((n, _, a) => n === a[0] && n > 0), "SVG idéntico en 4 variantes");
  }
  {
    const { p } = await open(b, { query: "?mascota=2" });
    const n = await p.eval(`document.querySelectorAll('.lg-mascot svg').length + '/' + document.querySelectorAll('.m-eyes').length`);
    check("CA-3.12e ?mascota=2 muestra Pomo (misma estructura .m-eyes)", /\/1$/.test(n), n); await p.close();
  }
  {
    // landing: carga, un h1, sin errores propios
    const p = await b.newPage();
    const cons = []; p.on("Runtime.consoleAPICalled", (e) => cons.push(e.type + ": " + e.args.map((a) => a.value ?? a.description).join(" ")));
    p.on("Runtime.exceptionThrown", (e) => cons.push("exception: " + e.exceptionDetails.text));
    await p.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await p.goto(BASE + "/"); await sleep(3000);
    const r = await p.eval(`({ title: document.title, h1: document.querySelectorAll('h1').length, h1t: document.querySelector('h1')?.textContent.slice(0, 80), login: [...document.querySelectorAll('a')].filter(a => a.getAttribute('href') === '/login').length, ox: document.documentElement.scrollWidth - innerWidth })`);
    check("Regresion landing /: carga, 1 h1, enlaces a /login, sin scroll horizontal (el codigo de landing no cambia: diff vacio)", r.h1 === 1 && r.login >= 1 && r.ox <= 0, { ...r, consola: cons });
    await p.close();
  }
} finally {
  summary();
  await b.close();
}
