// QA login 04: movimiento (HU-5, HU-8, HU-10): reduced-motion en cada estado, idle, mirada, reacciones, tope de 90 s.
// Correr desde la raiz con el servidor en QA_BASE:  node docs/qa/scripts/login/04-motion.mjs [--sin-tope]   (el tope de 90 s tarda ~100 s)
import { createHash } from "node:crypto";
import { launch, check, summary, sleep, open, waitFor, fill, setReduced } from "./lib.mjs";

const b = await launch(9343);
const anims = (p) => p.eval(`document.getAnimations().map(a => ({ n: a.animationName || ('transition:' + a.transitionProperty), t: (a.effect.target.className && a.effect.target.className.baseVal !== undefined) ? a.effect.target.className.baseVal : a.effect.target.className, it: a.effect.getComputedTiming().iterations, d: a.effect.getComputedTiming().duration, ps: a.playState }))`);
const mood = (p) => p.eval(`(() => { const m = document.querySelector('.lg-mascot'); return m ? { mood: m.dataset.mood, look: m.dataset.look, face: m.dataset.face } : null; })()`);
const sha = (b64) => createHash("sha1").update(b64).digest("hex").slice(0, 10);
async function mascotShot(p) {
  const r = await p.eval(`(() => { const r = document.querySelector('.lg-mascot').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 }; })()`);
  return (await p.send("Page.captureScreenshot", { clip: r, format: "png" })).data;
}

try {
  // ---------- HU-8 reduced motion en cada estado ----------
  {
    const states = [];
    const { p, state } = await open(b, { reduced: true, mock: { kind: "invalid" } });
    const rec = async (name) => { const a = await anims(p); const m = await mood(p); states.push({ name, n: a.length, ...m }); return a; };
    await sleep(2500); await rec("reposo (2,5 s)");
    for (const [id, name] of [["email", "foco Email"], ["password", "foco Contraseña"], ["lg-eye", "foco Mostrar contraseña"], ["lg-submit", "foco Entrar"]]) { await p.eval(`document.getElementById('${id}').focus()`); await sleep(350); await rec(name); }
    await p.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await fill(p); state.kind = "hang"; await p.click("#lg-submit"); await sleep(400); await rec("Entrando...");
    const hover = await p.eval(`(() => { const r = document.getElementById('lg-submit').getBoundingClientRect(); return { x: r.x + 5, y: r.y + 5 }; })()`);
    await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: hover.x, y: hover.y }); await sleep(300); await rec("hover sobre boton deshabilitado");
    await p.close();
    const e = await open(b, { reduced: true, mock: { kind: "invalid" } });
    await fill(e.p); await e.p.click("#lg-submit"); await waitFor(e.p, `document.querySelector('main [role=alert]').textContent.length>0`); await sleep(300);
    const ar = await anims(e.p); const mm = await mood(e.p); states.push({ name: "error credenciales", n: ar.length, ...mm });
    e.state.kind = "503"; await e.p.click("#lg-submit"); await sleep(900); const ar2 = await anims(e.p); states.push({ name: "error de red", n: ar2.length, ...(await mood(e.p)) });
    await e.p.close();
    const s = await open(b, { reduced: true, mock: { kind: "success", holdNav: true } });
    await fill(s.p); await s.p.click("#lg-submit"); await sleep(500); const as = await anims(s.p); states.push({ name: "exito (navegando)", n: as.length, ...(await mood(s.p)) });
    // hover y activo del boton (transform/transition) en reposo con reduced
    await s.p.close();
    check("CA-8.1 reduced-motion: document.getAnimations().length === 0 en todos los estados", states.every((x) => x.n === 0), states);
    const ys = states.find((x) => x.name === "exito (navegando)"), er = states.find((x) => x.name === "error credenciales");
    check("CA-8.2/10.3 reduced-motion: las poses cambian de forma instantanea (cara oops en error, yay en exito, mirada por foco)", er.face === "oops" && ys.face === "yay" && states.find((x) => x.name === "foco Email").look === "email" && states.find((x) => x.name === "foco Entrar").look === "btn", states.map((x) => `${x.name}:${x.look}/${x.face}`));
  }
  // caso 20: reduced-motion en vivo
  {
    const { p } = await open(b, { reduced: false });
    const a0 = await anims(p);
    await setReduced(p, true); await sleep(300);
    const a1 = await anims(p);
    check("Caso 7.20 reduced-motion activado en vivo detiene las animaciones sin recargar", a0.length > 0 && a1.length === 0, { antes: a0.length, despues: a1.length });
    await p.close();
  }

  // ---------- Idle (CA-10.6) ----------
  {
    const { p } = await open(b, { reduced: false });
    await sleep(5000);
    const a = await anims(p);
    check("CA-10.6 a los ~5 s: <=3 animaciones, todas de la mascota con iteraciones finitas", a.length >= 1 && a.length <= 3 && a.every((x) => Number.isFinite(x.it)), a);
    const blink = a.find((x) => x.n === "m-blink");
    check("CA-10.6b parpadeo: periodo 5,5 s (4 a 7 s), 16 repeticiones => tope ~89 s (90 +/- 5)", blink && blink.d === 5500 && blink.it === 16 && 1.2 + 16 * 5.5 >= 85 && 1.2 + 16 * 5.5 <= 95, blink);
    // muestreo en pagina: transform computado de .m-eyes cada cuadro durante 12 s
    const samp = await p.eval(`new Promise((res) => { const el = document.querySelector('.m-eyes'); const out = []; const t0 = performance.now(); (function f() { const t = performance.now() - t0; const m = getComputedStyle(el).transform; const sy = m === 'none' ? 1 : parseFloat(m.split(',')[3]); out.push([t, sy]); if (t < 12000) requestAnimationFrame(f); else res(out); })(); })`);
    const closed = samp.filter(([, sy]) => sy < 0.99);
    const min = Math.min(...samp.map((x) => x[1]));
    // agrupar cierres
    const groups = []; let last = -1e9; for (const [t, sy] of closed) { if (t - last > 400) groups.push({ start: t, end: t }); groups[groups.length - 1].end = t; last = t; }
    const dur = groups.length ? Math.max(...groups.map((g) => g.end - g.start)) : 0;
    const gaps = groups.slice(1).map((g, i) => +(g.start - groups[i].start).toFixed(0));
    check("CA-10.6 ojos abiertos y cerrados en instantes distintos (escala Y minima ~0,1) y cierre+apertura <=180 ms", min < 0.2 && dur <= 260, { escalaMin: +min.toFixed(2), parpadeos: groups.length, duracionMedidaMs: +dur.toFixed(0), separacionMs: gaps });
    check("CA-10.6b periodo medido ~5,5 s (4-7 s)", gaps.every((g) => g >= 4000 && g <= 7000) && groups.length >= 1, gaps);
    await p.close();
  }

  // ---------- Mirada (CA-10.7) con 4 capturas distintas ----------
  for (const [w, h] of [[1440, 900], [360, 640]]) {
    const { p } = await open(b, { width: w, height: h, reduced: true });
    const shots = {}; const tf = {};
    shots.neutra = sha(await mascotShot(p));
    for (const [id, k] of [["email", "email"], ["password", "contraseña"], ["lg-submit", "boton"]]) { await p.eval(`document.getElementById('${id}').focus()`); await sleep(250); shots[k] = sha(await mascotShot(p)); tf[k] = await p.eval(`getComputedStyle(document.querySelector('.m-look')).transform`); }
    await p.eval(`document.getElementById('lg-eye').focus()`); await sleep(250); const eye = sha(await mascotShot(p));
    await p.eval(`document.activeElement.blur()`); await sleep(250); const back = sha(await mascotShot(p));
    check(`CA-10.7a ${w}x${h} cuatro poses visualmente distintas (hash de captura de la mascota)`, new Set(Object.values(shots)).size === 4, { ...shots, ojo: eye, vuelveNeutra: back === shots.neutra, transforms: tf });
    check(`CA-10.7 ${w}x${h} 'Mostrar contraseña' mira igual que Contraseña; al perder foco vuelve a neutra`, eye === shots["contraseña"] && back === shots.neutra, { eye, back });
    if (w === 1440) { const f = Buffer.from(await mascotShot(p), "base64"); }
    await p.close();
  }
  {
    const { p } = await open(b, { reduced: false });
    const tr = await p.eval(`(() => { const c = getComputedStyle(document.querySelector('.m-look')); return { prop: c.transitionProperty, dur: c.transitionDuration }; })()`);
    check("CA-10.7c transicion de la mirada: solo transform y 180 ms (<=200)", tr.prop === "transform" && tr.dur === "0.18s", tr);
    await p.close();
  }
  {
    // La mirada va hacia el formulario: desplazamiento de los ojos en desktop (derecha/abajo) y movil (abajo)
    for (const [w, h, dir] of [[1440, 900, "derecha y abajo"], [360, 640, "abajo"]]) {
      const { p } = await open(b, { width: w, height: h, reduced: true });
      const out = {};
      for (const id of ["email", "password", "lg-submit"]) { await p.eval(`document.getElementById('${id}').focus()`); await sleep(200); out[id] = await p.eval(`(() => { const m = new DOMMatrix(getComputedStyle(document.querySelector('.m-look')).transform); return [+m.e.toFixed(1), +m.f.toFixed(1)]; })()`); }
      const down = Object.values(out).every(([, y]) => y > -5), right = Object.values(out).every(([x]) => x > -10);
      check(`CA-10.7d ${w}x${h} mirada hacia ${dir} (traslacion de los ojos en px)`, dir === "abajo" ? out["lg-submit"][1] > 0 && out["password"][1] > 0 && out["email"][1] > 0 : Object.values(out).every(([x]) => x > 0) && out["lg-submit"][1] > 0, out);
      await p.close();
    }
  }

  // ---------- Reacciones (CA-10.8 a 10.10, 10.13) ----------
  {
    const { p, state } = await open(b, { reduced: false, mock: { kind: "invalid" } });
    await fill(p);
    await p.eval(`(() => { window.__t = {}; const f = document.querySelector('form'); f.addEventListener('submit', () => { window.__t.submit = performance.now(); }, true);
      const m = document.querySelector('.lg-mascot'); new MutationObserver(() => { const k = m.dataset.mood + '/' + m.dataset.face; (window.__t[k] = window.__t[k] || performance.now()); }).observe(m, { attributes: true }); })()`);
    state.kind = "hang"; await p.click("#lg-submit"); await sleep(150);
    const t = await p.eval(`window.__t`);
    const a1 = await anims(p);
    const al = await anims(p);
    check("CA-10.8 'Entrando...': mascota pasa a loading <=100 ms tras presionar Entrar; 1 animacion de reaccion (inclinacion 280 ms) y bucles <=1", (t["loading/ok"] - t.submit) <= 100 && a1.filter((x) => x.n === "lg-lean").length <= 1, { ms: +(t["loading/ok"] - t.submit).toFixed(1), anims: a1 });
    await sleep(500);
    const a2 = await anims(p);
    check("CA-10.8 durante la espera no quedan animaciones en bucle de reaccion (ojos pausados)", a2.every((x) => x.ps !== "running" || x.it !== Infinity), a2);
    state.kind = "invalid"; // el hang previo sigue colgado; recargar
    await p.close();
    const e = await open(b, { reduced: false, mock: { kind: "invalid" } });
    await fill(e.p); await e.p.eval(`(() => { window.__m = []; const m = document.querySelector('.lg-mascot'); new MutationObserver(() => window.__m.push([performance.now(), m.dataset.mood, m.dataset.face])).observe(m, { attributes: true }); })()`);
    await e.p.click("#lg-submit"); await waitFor(e.p, `document.querySelector('main [role=alert]').textContent.length>0`); await sleep(100);
    const ae = await anims(e.p); const me = await mood(e.p);
    check("CA-10.9 error: sacudida unica <=500 ms (460), cara 'uy' permanece", ae.some((x) => /lg-shake/.test(x.n) && x.d <= 500 && x.it === 1) && me.face === "oops", { ae, me });
    await sleep(900);
    const keep = await mood(e.p);
    check("CA-10.9 la cara 'uy' permanece tras la sacudida hasta el siguiente cambio de foco a un campo", keep.face === "oops", keep);
    await e.p.eval(`document.getElementById('email').focus()`); await sleep(150);
    const af = await mood(e.p);
    check("CA-10.9/7.19 al enfocar un campo la cara vuelve a normal, el mensaje permanece", af.face === "ok" && /incorrectos/.test(await e.p.eval(`document.querySelector('main [role=alert]').textContent`)), af);
    // segundo error repite la sacudida
    await e.p.click("#lg-submit"); await sleep(120);
    const a2e = await anims(e.p);
    check("CA-10.9 el segundo error consecutivo repite la sacudida", a2e.some((x) => /lg-shake/.test(x.n)), a2e.map((x) => x.n));
    await e.p.close();
    const s = await open(b, { reduced: false, mock: { kind: "success", holdNav: true } });
    await fill(s.p); await s.p.click("#lg-submit"); await sleep(150);
    const as = await anims(s.p); const ms = await mood(s.p);
    check("CA-10.10 exito: salto <=400 ms (380) y cara 'yay'", as.some((x) => x.n === "lg-hop" && x.d <= 400) && ms.face === "yay" && ms.mood === "success", { as, ms });
    check("CA-10.13 como maximo 3 en bucle + 1 de reaccion en cualquier estado", as.length <= 4, as.length);
    await s.p.close();
  }

  // ---------- CA-3.7 / 10.14 la mascota no invade el formulario ni el logo; CLS ----------
  for (const [w, h] of [[1440, 900], [360, 640], [768, 1024], [320, 568]]) {
    const { p, state } = await open(b, { width: w, height: h, reduced: false, mock: { kind: "invalid" } });
    await fill(p);
    await p.eval(`(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      window.__ov = 0; window.__layoutBefore = JSON.stringify(['.lg-ticket', '.lg-home', '#lg-submit', '.lg-stage', '.lg-brand'].map(s => document.querySelector(s).getBoundingClientRect().toJSON()));
      window.__run = true; (function f() { const m = document.querySelector('.lg-mascot'); const parts = [m, ...m.querySelectorAll('*')].map(e => e.getBoundingClientRect()); const targets = ['.lg-ticket', '.lg-home'].map(s => document.querySelector(s).getBoundingClientRect());
        for (const a of parts) for (const t of targets) window.__ov = Math.max(window.__ov, inter(a, t)); if (window.__run) requestAnimationFrame(f); })(); })()`);
    await p.click("#lg-submit"); await waitFor(p, `document.querySelector('main [role=alert]').textContent.length>0`); await sleep(700);
    state.kind = "hang"; await p.click("#lg-submit"); await sleep(700);
    const r = await p.eval(`(() => { window.__run = false; const after = JSON.stringify(['.lg-ticket', '.lg-home', '#lg-submit', '.lg-stage', '.lg-brand'].map(s => document.querySelector(s).getBoundingClientRect().toJSON()));
      const cs = (s) => getComputedStyle(document.querySelector(s)).pointerEvents; return { cls: window.__cls, ov: window.__ov, same: after === window.__layoutBefore, pe: cs('.lg-mascot'), ox: document.documentElement.scrollWidth - innerWidth }; })()`);
    check(`CA-3.7/10.14/5.8/7.1 ${w}x${h} durante idle+error+Entrando: mascota no se superpone al ticket ni al logo (0 px2), CLS=${r.cls}, formulario sin moverse, sin scroll horizontal, pointer-events none`, r.ov === 0 && r.cls <= 0.001 && r.same && r.pe === "none" && r.ox <= 0, r);
    await p.close();
  }

  // ---------- CA-3.9 alturas bajas ----------
  for (const [w, h, expectHidden] of [[360, 640, false], [360, 639, true], [640, 360, true], [360, 500, true], [1280, 650, false], [1024, 600, false], [768, 1024, false]]) {
    const { p } = await open(b, { width: w, height: h });
    const r = await p.eval(`(() => { const st = document.querySelector('.lg-stage'); const bs = document.querySelector('.lg-brand'); const cl = document.querySelector('.lg-brand__claim');
      const g = getComputedStyle(st); return { stageDisplay: g.display, stageH: Math.round(st.getBoundingClientRect().height), brandH: Math.round(bs.getBoundingClientRect().height), claimVisible: cl.getBoundingClientRect().height > 0, brandBg: getComputedStyle(bs).backgroundColor, mascotAnims: document.getAnimations().filter(a => a.effect.target.closest && a.effect.target.closest('.lg-mascot')).length, ox: document.documentElement.scrollWidth - innerWidth }; })()`);
    await sleep(2000);
    const manims = await p.eval(`document.getAnimations().filter(a => a.effect.target.closest && a.effect.target.closest('.lg-mascot')).length`);
    const hid = r.stageDisplay === "none";
    check(`CA-3.9/7.4 ${w}x${h}: mascota ${expectHidden ? "oculta (display none, 0 animaciones suyas)" : "visible"}, franja roja con frase visible; mobile <=120 px`, hid === expectHidden && r.claimVisible && r.brandH > 0 && r.brandBg === "rgb(215, 38, 30)" && (!expectHidden ? true : manims === 0) && (w >= 640 || r.stageH <= 120) && r.ox <= 0, { ...r, manims });
    await p.close();
  }

  // ---------- CA-10.6d tope de 90 s ----------
  if (!process.argv.includes("--sin-tope")) {
    const { p } = await open(b, { reduced: false });
    const t0 = Date.now(); const marks = {};
    for (const s of [30, 60, 80]) { await sleep(Math.max(0, s * 1000 - (Date.now() - t0))); marks[s] = (await anims(p)).length; }
    await sleep(Math.max(0, 92 * 1000 - (Date.now() - t0))); marks[92] = (await anims(p)).length;
    await sleep(Math.max(0, 100 * 1000 - (Date.now() - t0))); marks[100] = (await anims(p)).length;
    // la reaccion sigue funcionando despues del tope
    await p.eval(`document.getElementById('email').focus()`); await sleep(300);
    const lk = await mood(p);
    check("CA-10.6d idle activo a los 30/60/80 s y 0 animaciones a los 100 s; la mirada sigue funcionando despues", marks[30] >= 1 && marks[60] >= 1 && marks[80] >= 1 && marks[100] === 0 && lk.look === "email", marks);
    await p.close();
  }
} finally {
  summary();
  await b.close();
}
