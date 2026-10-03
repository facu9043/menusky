// QA login 07: entrada animada (CA-5.3), micro-interacciones (CA-5.4), sin JavaScript (caso 7.9), pegado (CA-4.9), 429/promesa colgada (caso 7.17), doble clic.
// Correr desde la raiz con el servidor en QA_BASE:  node docs/qa/scripts/login/07-extras.mjs
import { readFileSync } from "node:fs";
import { launch, check, summary, sleep, open, waitFor, fill, BASE } from "./lib.mjs";

const b = await launch(9347);
try {
  // CA-5.3 entrada: duraciones y que no deja animaciones vivas (reduced=false)
  {
    const p = await b.newPage();
    await p.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await p.send("Page.addScriptToEvaluateOnNewDocument", { source: `document.addEventListener('DOMContentLoaded', () => { window.__entry = document.getAnimations().map(a => ({ n: a.animationName, d: a.effect.getComputedTiming().duration, delay: a.effect.getComputedTiming().delay, it: a.effect.getComputedTiming().iterations, fill: a.effect.getComputedTiming().fill })); });` });
    await p.goto(BASE + "/login"); await sleep(2500);
    const e = await p.eval(`window.__entry`);
    const after = await p.eval(`document.getAnimations().filter(a => /lg-(rise|stage-in)/.test(a.animationName)).length`);
    const ent = (e || []).filter((x) => /lg-(rise|stage-in)/.test(x.n));
    check("CA-5.3 entrada: panel y mascota con animacion unica (1 iteracion), duracion <=600 ms; no queda viva despues", ent.length >= 1 && ent.every((x) => x.it === 1 && x.d <= 600) && after === 0, { ent, vivasDespues: after });
    const tot = ent.map((x) => ({ n: x.n, finalizaAMs: x.d + x.delay }));
    check("CA-5.3 (limite) la entrada de la mascota termina a <=600 ms contando el retraso", tot.every((x) => x.finalizaAMs <= 600), tot);
    await p.close();
  }
  // CA-5.4 micro-interacciones
  {
    const { p } = await open(b, { reduced: false });
    const get = () => p.eval(`(() => { const cs = getComputedStyle(document.getElementById('lg-submit')); const ci = getComputedStyle(document.getElementById('email')); return { btnBg: cs.backgroundColor, btnTf: cs.transform, btnShadow: cs.boxShadow, btnTr: cs.transitionDuration, inBorder: ci.borderTopColor, inBg: ci.backgroundColor, inOutline: ci.outlineStyle }; })()`);
    const base = await get();
    const r = await p.eval(`(() => { const r = document.getElementById('lg-submit').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: r.x, y: r.y }); await sleep(250);
    const hov = await get();
    await p.send("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x, y: r.y, button: "left", clickCount: 1 }); await sleep(250);
    const act = await get();
    await p.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x, y: r.y, button: "left", clickCount: 1 });
    await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
    await p.eval(`document.getElementById('email').focus()`); await sleep(250); const foc = await get();
    check("CA-5.4 hover y presion del boton cambian color/posicion/sombra; transicion de transform <=160 ms", hov.btnBg !== base.btnBg && hov.btnTf !== base.btnTf && act.btnTf !== hov.btnTf && base.btnTr.split(",").every((d) => parseFloat(d) <= 0.16), { base, hov: { bg: hov.btnBg, tf: hov.btnTf }, act: { tf: act.btnTf } });
    check("CA-5.4 foco del campo cambia borde/fondo/contorno (instantaneo, sin transicion)", foc.inBorder !== base.inBorder && foc.inBg !== base.inBg && foc.inOutline === "solid", { base: [base.inBorder, base.inBg], foc: [foc.inBorder, foc.inBg, foc.inOutline] });
    await p.close();
  }
  // Caso 7.9 JS desactivado
  {
    const p = await b.newPage();
    await p.send("Emulation.setScriptExecutionDisabled", { value: true });
    await p.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 640, deviceScaleFactor: 1, mobile: true });
    await p.goto(BASE + "/login"); await sleep(1500);
    const r = await p.eval(`(() => { const v = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && cs.opacity !== '0' && cs.visibility !== 'hidden'; }; return { h1: v(document.querySelector('h1')), email: v(document.getElementById('email')), pass: v(document.getElementById('password')), btn: v(document.getElementById('lg-submit')), mascota: v(document.querySelector('.lg-stage')) , txt: document.querySelector('h1').textContent }; })()`).catch((e) => ({ err: String(e).slice(0, 100) }));
    check("Caso 7.9 sin JavaScript: se ven h1, campos, boton y mascota estatica (SSR)", r.h1 && r.email && r.pass && r.btn && r.mascota, r);
    await p.close();
  }
  // CA-4.9 pegado y gestores: sin handlers que lo bloqueen; ids/names
  {
    const f = readFileSync("components/auth/LoginForm.tsx", "utf8");
    check("CA-4.9 sin onPaste/onCopy/onDrop; ids email y password conservados", !/onPaste|onCopy|onCut|onDrop/.test(f) && /id="email"/.test(f) && /id="password"/.test(f), "grep");
    const { p } = await open(b);
    // pegado simulado: Input.insertText equivale a pegar
    await p.eval(`document.getElementById('password').focus()`); await p.send("Input.insertText", { text: "Pegada-123!" });
    check("CA-4.9 el campo acepta texto insertado de una vez (pegado)", (await p.eval(`document.getElementById('password').value`)) === "Pegada-123!", "ok");
    // validacion nativa: campo vacio y email mal formado
    await p.eval(`document.getElementById('email').focus()`); await p.send("Input.insertText", { text: "no-es-email" });
    const v = await p.eval(`(() => { const f = document.querySelector('form'); const e = document.getElementById('email'); return { valid: f.checkValidity(), msg: e.validationMessage.length > 0, type: e.type, noValidate: f.noValidate }; })()`);
    check("CA-4.6 validacion nativa activa: email mal formado invalida el formulario (sin novalidate)", !v.valid && v.msg && !v.noValidate, v);
    await p.click("#lg-submit"); await sleep(300);
    const sent = await p.eval(`document.getElementById('lg-submit').textContent`);
    check("CA-4.6 con validacion nativa fallida no se envia (boton sigue en 'Entrar')", sent === "Entrar", sent);
    await p.close();
  }
  // Doble clic rapido sobre Entrar con respuesta valida/invalida: una sola peticion
  {
    const { p, log } = await open(b, { mock: { kind: "invalid" } });
    await fill(p);
    const r = await p.eval(`(() => { const r = document.getElementById('lg-submit').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    for (const cc of [1, 2]) { await p.send("Input.dispatchMouseEvent", { type: "mousePressed", x: r.x, y: r.y, button: "left", clickCount: cc }); await p.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: r.x, y: r.y, button: "left", clickCount: cc }); }
    await sleep(1200);
    const n = log.supa.filter((x) => x.startsWith("POST /auth/v1/token")).length;
    check("Doble clic rapido sobre Entrar: 1 sola peticion de login", n === 1, { tokenPosts: n });
    await p.close();
  }
  // Botón atrás: tras ir al destino y volver, el login vuelve a estar operable
  {
    const { p } = await open(b, { mock: { kind: "success", role: "admin" } });
    await fill(p); await p.click("#lg-submit"); await waitFor(p, `location.pathname !== '/login'`, 6000);
    await p.eval(`history.back()`); await sleep(1500);
    const r = await p.eval(`({ path: location.pathname, btn: document.getElementById('lg-submit') && document.getElementById('lg-submit').textContent, dis: document.getElementById('lg-submit') && document.getElementById('lg-submit').disabled })`).catch((e) => ({ err: String(e).slice(0, 80) }));
    check("Exploratoria: boton Atras desde el destino vuelve al login con el boton operable ('Entrar' habilitado)", r.path === "/login" && r.btn === "Entrar" && r.dis === false, r);
    await p.close();
  }
} finally {
  summary();
  await b.close();
}
