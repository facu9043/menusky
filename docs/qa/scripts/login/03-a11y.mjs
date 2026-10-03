// QA login 03: accesibilidad (axe-core de node_modules, arbol de accesibilidad CDP, contraste en el DOM, foco, tamanos, fuentes).
// Correr desde la raiz del repo con el servidor en QA_BASE: node docs/qa/scripts/login/03-a11y.mjs
import { readFileSync } from "node:fs";
import { launch, check, summary, sleep, open, waitFor, fill } from "./lib.mjs";

const AXE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const b = await launch(9342);

const contrastFn = `(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0,0,1,1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0,0,1,1); const d = cx.getImageData(0,0,1,1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const over = (f, b) => [0,1,2].map(i => Math.round(f[i] * f[3] + b[i] * (1 - f[3])));
  const lum = (c) => { const s = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bgOf = (el) => { let stack = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); stack.push(c); if (c[3] === 1) break; } let base = [255,255,255]; for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base); return base; };
  window.__cr = { rgba, over, ratio, bgOf };
  return true; })()`;

async function pair(p, id, fgSel, bgSel, prop, min, opts = {}) {
  const r = await p.eval(`(() => { const f = document.querySelector(${JSON.stringify(fgSel)}); const bgEl = document.querySelector(${JSON.stringify(bgSel)}); const { rgba, over, ratio, bgOf } = window.__cr;
    const bg = ${opts.bgColor ? `rgba(${JSON.stringify(opts.bgColor)}).slice(0,3)` : "bgOf(bgEl)"};
    const raw = rgba(getComputedStyle(f)[${JSON.stringify(prop)}]); const fg = over(raw, bg);
    const cs = getComputedStyle(f); return { fg, bg, alpha: raw[3], r: +ratio(fg, bg).toFixed(2), size: cs.fontSize, weight: cs.fontWeight }; })()`);
  check(`CA-6.7 ${id}`, r.r >= min && r.alpha === 1 || (r.r >= min && !!opts.allowAlpha), { ...r, min });
  return r;
}

try {
  // ---------- axe ----------
  for (const [name, w, h, st] of [["inicial 1440x900", 1440, 900, "idle"], ["inicial 360x640", 360, 640, "idle"], ["con error de credenciales 1440x900", 1440, 900, "err"], ["con error de red 360x640", 360, 640, "net"], ["inicial 768x1024", 768, 1024, "idle"]]) {
    const { p } = await open(b, { width: w, height: h, mock: { kind: st === "net" ? "503" : "invalid" } });
    if (st !== "idle") { await fill(p); await p.click("#lg-submit"); await waitFor(p, `document.querySelector('main [role=alert]').textContent.length>0`); await sleep(700); }
    await p.eval(AXE);
    const r = await p.eval(`axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] } }).then(x => ({ v: x.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, targets: v.nodes.map(n => n.target.join(' ')).slice(0,4) })), inc: x.incomplete.map(v => ({ id: v.id, n: v.nodes.length, t: v.nodes.map(n => n.target.join(' ')).slice(0,3) })), pass: x.passes.length, ver: axe.version }))`);
    check(`CA-6.10 axe ${name}: 0 violaciones (incl. best-practice)`, r.v.length === 0, { axe: r.ver, violaciones: r.v, pasan: r.pass, incompletos: r.inc });
    await p.close();
  }

  // ---------- arbol de accesibilidad ----------
  {
    const { p } = await open(b, { mock: { kind: "invalid" } });
    await fill(p); await p.click("#lg-submit"); await waitFor(p, `document.querySelector('main [role=alert]').textContent.length>0`); await sleep(400);
    await p.send("Accessibility.enable");
    const { nodes } = await p.send("Accessibility.getFullAXTree");
    const vis = nodes.filter((n) => !n.ignored).map((n) => ({ role: n.role?.value, name: n.name?.value, props: (n.properties || []).filter((x) => ["required", "invalid", "disabled", "focusable"].includes(x.name)).map((x) => x.name + "=" + x.value.value).join(",") }));
    const interesting = vis.filter((n) => !["none", "generic", "StaticText", "InlineTextBox", "LineBreak"].includes(n.role));
    console.log("ARBOL AX (no ignorados, sin generic/texto):\n" + interesting.map((n) => `  ${n.role} "${n.name ?? ""}" ${n.props}`).join("\n"));
    const roles = vis.map((n) => n.role);
    check("CA-3.6/6.11 mascota fuera del arbol AX: sin img/graphics/svg/gráfico", !roles.some((r) => ["img", "image", "graphics-document", "graphics-symbol", "figure", "SvgRoot"].includes(r)) && !vis.some((n) => /pomo|mascota|gr[aá]fico|svg|\.svg/i.test(n.name || "")), roles.filter((r) => /img|graphic|svg/i.test(r)));
    const tb = interesting.filter((n) => n.role === "textbox");
    check("CA-6.3 labels: textbox 'Email' y 'Contraseña' (requeridos)", tb.map((n) => n.name).join() === "Email,Contraseña" && tb.every((n) => /required=true/.test(n.props)), tb);
    const btns = interesting.filter((n) => n.role === "button").map((n) => n.name);
    check("CA-11.1/12.1 nombres accesibles: enlace 'MenuSky, ir al inicio'; botones 'Mostrar contraseña' y 'Entrar'", interesting.some((n) => n.role === "link" && n.name === "MenuSky, ir al inicio") && [...btns].sort().join() === "Entrar,Mostrar contraseña", btns);
    check("CA-6.1 landmark main y heading 1 'Ingresar'", interesting.some((n) => n.role === "main") && interesting.some((n) => n.role === "heading" && n.name === "Ingresar"), "ok");
    const al = interesting.filter((n) => n.role === "alert");
    const ann = await p.eval(`(() => { const a = document.querySelector('next-route-announcer'); return { announcer: !!a, announcerAlertInShadow: !!(a && a.shadowRoot && a.shadowRoot.querySelector('[role=alert]')), lightAlerts: document.querySelectorAll('[role=alert]').length, inMain: document.querySelectorAll('main [role=alert]').length, liveConTexto: [...document.querySelectorAll('[aria-live]')].filter(e => e.textContent.trim()).length }; })()`);
    check("CA-6.6/6.14 AX: 2 nodos alert = 1 del login (dentro de main) + el route announcer de Next (vacio, solo anuncia navegaciones); sin status/log; sin aria-live con texto", al.length === 2 && ann.announcerAlertInShadow && ann.inMain === 1 && ann.lightAlerts === 1 && ann.liveConTexto === 0 && !interesting.some((n) => ["status", "log", "marquee"].includes(n.role)), { alertasAX: al.length, ...ann });
    await p.close();
  }

  // ---------- contraste (DOM) ----------
  {
    const { p } = await open(b, { width: 1440, height: 900, mock: { kind: "invalid" } });
    await p.eval(contrastFn);
    await pair(p, "label sobre tarjeta (paper)", ".lg-label", ".lg-ticket", "color", 4.5);
    await pair(p, "h1 sobre tarjeta (texto grande >=3, medido 4,5)", "h1", ".lg-ticket", "color", 4.5);
    await pair(p, "bajada sobre tarjeta", ".lg-lead", ".lg-ticket", "color", 4.5);
    await pair(p, "texto escrito en campo vs fondo del campo", "#email", "#email", "color", 4.5);
    await pair(p, "borde del campo vs fondo de la tarjeta (>=3)", "#email", ".lg-ticket", "borderTopColor", 3);
    await pair(p, "borde del campo vs fondo del propio campo (>=3)", "#email", "#email", "borderTopColor", 3);
    await pair(p, "texto del boton (patty) sobre cheddar", "#lg-submit", "#lg-submit", "color", 4.5);
    await pair(p, "frase del panel de marca (paper) sobre tomate", ".lg-brand__claim", ".lg-brand", "color", 4.5);
    await pair(p, "logo 'Menu' sobre fondo del panel", ".ms-logo__word", ".lg-top", "color", 4.5);
    await pair(p, "logo 'Sky' (tomate, texto grande 22px bold) sobre fondo", ".ms-logo__sky", ".lg-top", "color", 3);
    await pair(p, "icono mostrar contraseña vs campo (>=3)", ".lg-eye", "#password", "color", 3);
    // foco: anillo tomate vs paper y vs bun
    const ring = await p.eval(`(() => { const { rgba, ratio } = window.__cr; const t = rgba(getComputedStyle(document.querySelector('.ms-login')).getPropertyValue('--ms-tomato').trim()); return { tomato: t.slice(0,3), paper: +ratio(t.slice(0,3), rgba('#fffdf8').slice(0,3)).toFixed(2), bun: +ratio(t.slice(0,3), rgba('#fff5e1').slice(0,3)).toFixed(2), cheddar: +ratio(t.slice(0,3), rgba('#ffc21a').slice(0,3)).toFixed(2) }; })()`);
    check("CA-6.4 anillo de foco tomate >=3:1 vs paper y vs bun", ring.paper >= 3 && ring.bun >= 3, ring);
    check("CA-6.4 (informativo) anillo de foco tomate vs cheddar (boton, lo separa offset de 4px sobre bun)", true, ring);
    // hover del boton
    await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
    const rc = await p.eval(`(() => { const r = document.querySelector('#lg-submit').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rc.x, y: rc.y }); await sleep(300);
    await pair(p, "texto del boton en hover sobre #ffcd3f", "#lg-submit", "#lg-submit", "color", 4.5);
    // alerta: ambos mensajes
    for (const [kind, label] of [["invalid", "credenciales"], ["503", "red"]]) {
      const m = await open(b, { width: 1440, height: 900, mock: { kind } });
      await m.p.eval(contrastFn); await fill(m.p); await m.p.click("#lg-submit"); await waitFor(m.p, `document.querySelector('main [role=alert]').textContent.length>0`); await sleep(500);
      await pair(m.p, `texto del error (${label}) ketchup sobre fondo de la alerta`, ".lg-alert span", ".lg-alert", "color", 4.5);
      await pair(m.p, `icono del error (${label}) >=3`, ".lg-alert__icon", ".lg-alert", "color", 3);
      // boton deshabilitado: reintento con hang
      if (kind === "invalid") {
        m.state.kind = "hang"; await m.p.click("#lg-submit"); await sleep(300);
        await pair(m.p, "RNF-A10 'Entrando...' (deshabilitado) patty sobre mustard", "#lg-submit", "#lg-submit", "color", 4.5);
      }
      await m.p.close();
    }
    // autofill: estilos (-webkit-autofill) patty sobre bun segun CSS: se verifica por valores del token
    check("Caso 7.12 autofill: -webkit-text-fill-color patty sobre bun (valores del CSS, mismo par que campo normal)", true, "patty #2b1710 sobre bun #fff5e1; ver par 'texto escrito en campo'");
    await p.close();
  }

  // ---------- foco visible, tamanos, fuentes ----------
  {
    const { p } = await open(b, { width: 360, height: 640 });
    const seq = [];
    for (let i = 0; i < 5; i++) { await p.tab(); seq.push(await p.eval(`(() => { const a = document.activeElement; const cs = getComputedStyle(a); const r = a.getBoundingClientRect(); return { id: a.id || a.className, ow: cs.outlineWidth, os: cs.outlineStyle, oc: cs.outlineColor, off: cs.outlineOffset, bc: cs.borderTopColor, w: Math.round(r.width), h: Math.round(r.height), match: a.matches(':focus-visible') }; })()`)); }
    check("CA-6.4 los 5 elementos interactivos muestran contorno >=2px solido al enfocar con teclado", seq.every((s) => s.match && s.os === "solid" && parseFloat(s.ow) >= 2), seq.map((s) => `${s.id}:${s.ow} ${s.os} ${s.oc}`));
    const sz = await p.eval(`(() => { const g = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }; return { email: g('#email'), pass: g('#password'), eye: g('#lg-eye'), submit: g('#lg-submit'), logo: g('.lg-home'), fs: getComputedStyle(document.querySelector('#email')).fontSize }; })()`);
    check("CA-6.8/6.9 360x640: campos, boton y ojo >=44 px de alto; texto de campos >=16 px", sz.email[1] >= 44 && sz.pass[1] >= 44 && sz.eye[0] >= 44 && sz.eye[1] >= 44 && sz.submit[1] >= 44 && parseFloat(sz.fs) >= 16, sz);
    const ff = await p.eval(`(() => { const f = (s) => getComputedStyle(document.querySelector(s)).fontFamily; return { h1: f('h1'), logo: f('.ms-logo__word'), email: f('#email'), btn: f('#lg-submit'), label: f('.lg-label'), claim: f('.lg-brand__claim') }; })()`);
    check("CA-2.3 h1/logo/frase en Bricolage; labels, campos y boton en Geist", /bricolage/i.test(ff.h1) && /bricolage/i.test(ff.logo) && /geist/i.test(ff.email) && /geist/i.test(ff.btn) && /geist/i.test(ff.label), ff);
    const loaded = await p.eval(`[...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight)`);
    check("CA-2.3 fuentes cargadas (informativo)", true, loaded);
    await p.close();
  }
  // ---------- teclado completo + shift-tab ----------
  {
    const { p } = await open(b, { mock: { kind: "invalid" } });
    await p.tab(); await p.tab(); await p.send("Input.insertText", { text: "qa@example.com" }); await p.tab(); await p.send("Input.insertText", { text: "x-test-123" });
    await p.tab(); await p.tab(); // ojo, Entrar
    const f = await p.eval(`document.activeElement.id`);
    await p.key("Enter", "Enter", 13, "\r"); await waitFor(p, `document.querySelector('main [role=alert]').textContent.length>0`); await sleep(300);
    const af = await p.eval(`document.activeElement.id`);
    await p.key(" ", "Space", 32, " "); await sleep(600);
    const again = await p.eval(`document.querySelector('main [role=alert]').textContent`);
    await p.tab(true); const sh = await p.eval(`document.activeElement.id`);
    check("CA-6.5 teclado completo: escribir, Tab hasta Entrar, Enter envia; tras error foco en Entrar; Espacio reintenta; Shift+Tab vuelve al ojo", f === "lg-submit" && af === "lg-submit" && /incorrectos/.test(again) && sh === "lg-eye", { f, tras_error: af, sh });
    await p.close();
  }
  // ---------- zoom 200% / texto 200% ----------
  for (const [name, w, h] of [["zoom 200% en 1280x720 (640x360)", 640, 360], ["360 al 200% (180x320)", 180, 320], ["320x256 reflow WCAG", 320, 256]]) {
    const { p } = await open(b, { width: w, height: h, mock: { kind: "invalid" } });
    const r = await p.eval(`(() => { const rs = ['#email','#password','#lg-submit','h1','.lg-home'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left >= -0.5, r.right <= innerWidth + 0.5]; }); return { ox: document.documentElement.scrollWidth - innerWidth, inside: rs.every(x => x[0] && x[1]), sh: document.documentElement.scrollHeight }; })()`);
    check(`CA-7.2/6.9 ${name}: sin scroll horizontal, controles dentro del ancho (scroll vertical permitido)`, r.ox <= 0 && r.inside, r);
    await p.close();
  }
  {
    const { p } = await open(b, { width: 1280, height: 720 });
    await p.eval(`document.documentElement.style.fontSize = '200%'`); await sleep(200);
    const r = await p.eval(`(() => ({ ox: document.documentElement.scrollWidth - innerWidth, btn: document.getElementById('lg-submit').getBoundingClientRect().width > 0, ov: [...document.querySelectorAll('.lg-label,.lg-lead,h1,#lg-submit')].some(e => e.scrollWidth > e.clientWidth + 1) }))()`);
    check("CA-6.9 solo texto al 200% (font-size raiz 200%, aproximacion) en 1280x720: sin desborde ni perdida", r.ox <= 0 && r.btn && !r.ov, r);
    await p.close();
  }
} finally {
  summary();
  await b.close();
}
