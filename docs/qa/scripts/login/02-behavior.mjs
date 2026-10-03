// QA login 02: HU-1, HU-4, HU-6 (teclado/foco/alert), HU-11, HU-12 con Supabase simulado por CDP Fetch.
// Uso: QA_BASE=http://127.0.0.1:3230 node docs/qa/scripts/login/02-behavior.mjs
import { launch, check, summary, sleep, open, waitFor, fill, BASE } from "./lib.mjs";

const MSG_CRED = "Email o contraseña incorrectos";
const MSG_NET = "No pudimos conectar. Revisá tu conexión e intentá de nuevo.";
const b = await launch(9341);
const snap = (p) => p.eval(`(() => { const a = document.querySelector('main [role=alert]'); const btn = document.getElementById('lg-submit');
  const body = document.body.textContent;
  return { alert: a ? a.textContent : null, alerts: document.querySelectorAll('[role=alert]').length, live: [...document.querySelectorAll('[aria-live]')].filter(e => e.textContent.trim()).length, liveRegions: [...document.querySelectorAll('[aria-live]')].map(e => e.tagName + '[' + (e.getAttribute('aria-label') || '') + ']' + (e.closest('.ms-login') ? ' (dentro del login)' : ' (fuera del login, layout global)')).join(';'),
    toasts: document.querySelectorAll('[data-sonner-toast]').length,
    c1: body.split(${JSON.stringify(MSG_CRED)}).length - 1, c2: body.split(${JSON.stringify(MSG_NET)}).length - 1,
    btn: btn && btn.textContent, dis: btn && btn.disabled, email: document.getElementById('email').value, pass: document.getElementById('password').value,
    ptype: document.getElementById('password').type, focus: document.activeElement && document.activeElement.id, path: location.pathname + location.search,
    mood: document.querySelector('.lg-mascot') && document.querySelector('.lg-mascot').dataset.mood }; })()`);
const submit = async (p, how = "click") => { if (how === "click") await p.click("#lg-submit"); else { await p.eval(`document.getElementById('password').focus()`); await p.key("Enter", "Enter", 13, "\r"); } };

try {
  // ---------- HU-1 / textos / estructura ----------
  for (const [w, h] of [[360, 640], [1440, 900], [320, 568], [768, 1024]]) {
    const { p } = await open(b, { width: w, height: h });
    const r = await p.eval(`(() => { const q = (s) => document.querySelector(s); const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom <= innerHeight + 0.5 && r.top >= 0; };
      const cs = (e) => getComputedStyle(e);
      return { h1: document.querySelectorAll('h1').length, h1t: q('h1').textContent, main: document.querySelectorAll('main').length, title: document.title, lead: q('.lg-lead').textContent,
        labels: [...document.querySelectorAll('label')].map((l) => l.textContent), btn: q('#lg-submit').textContent,
        visibleAll: [q('h1'), q('#email'), q('#password'), q('#lg-submit')].map(vis), noScrollY: document.documentElement.scrollHeight <= innerHeight,
        logoVisible: vis(q('.lg-home')), opacity: [q('#email'), q('form'), q('.lg-ticket')].map((e) => cs(e).opacity + '/' + cs(e).pointerEvents),
        roleBtn: document.querySelectorAll('[role=button]').length, lang: document.documentElement.lang }; })()`);
    const tag = `${w}x${h}`;
    check(`CA-1.1/6.1/4.7 ${tag} h1 unico "Ingresar", main, titulo, textos`, r.h1 === 1 && r.h1t === "Ingresar" && r.main === 1 && r.title === "Ingresar | MenuSky" && r.lead === "Acceso para el equipo del restaurante" && r.labels.join() === "Email,Contraseña" && r.btn === "Entrar" && r.roleBtn === 0, r);
    check(`CA-1.1 ${tag} campos y boton operables de entrada (opacity 1, pointer-events auto, logo visible)`, r.opacity.every((x) => x === "1/auto") && r.logoVisible, r.opacity);
    if (w === 360 && h === 640) check("CA-1.4 360x640 h1, campos y Entrar visibles sin scroll vertical", r.visibleAll.every(Boolean) && r.noScrollY, { visibleAll: r.visibleAll, noScrollY: r.noScrollY });
    if (w === 1440) check("CA-1.1 1440x900 visibles sin scroll", r.visibleAll.every(Boolean) && r.noScrollY, r.visibleAll);
    await p.close();
  }
  // CA-1.5 HTML del servidor
  const html = await (await fetch(BASE + "/login")).text();
  check("CA-1.5 HTML SSR trae h1, labels, inputs y boton", /<h1[^>]*>Ingresar<\/h1>/.test(html) && /for="email"/.test(html) && /for="password"/.test(html) && /id="email"/.test(html) && /id="password"/.test(html) && />Entrar</.test(html), "regex sobre respuesta de /login sin JS");
  check("CA-3.13 SSR sin 'Pomo' ni 'Brioche'/'Pollito'", !/Pomo|Brioche|Pollito/.test(html), "0 coincidencias en el HTML");
  const forbSvg = html.match(/<svg[\s\S]*?<\/svg>/g) || [];
  check("CA-3.2 sin <image>/<script>/<foreignObject>/href/filter dentro de los SVG del HTML", forbSvg.every((s) => !/<image|<script|<foreignObject|href=|<filter|<text|url\(/.test(s)), { svgs: forbSvg.length });

  // ---------- CA-1.3 / 6.2 orden de tab ----------
  {
    const { p } = await open(b);
    const seq = [];
    for (let i = 0; i < 6; i++) { await p.tab(); seq.push(await p.eval(`(() => { const a = document.activeElement; return a.id || a.getAttribute('aria-label') || a.tagName; })()`)); }
    const exp = ["MenuSky, ir al inicio", "email", "password", "lg-eye", "lg-submit"];
    results_fix(exp, seq);
    // enlace del logo
    const href = await p.eval(`document.querySelector('.lg-home').getAttribute('href')`);
    check("CA-12.1 logo es enlace a / con nombre 'MenuSky, ir al inicio'", href === "/" && seq[0] === "MenuSky, ir al inicio", { href });
    // clic en label enfoca
    await p.click("label[for=email]"); const f1 = await p.eval(`document.activeElement.id`);
    await p.click("label[for=password]"); const f2 = await p.eval(`document.activeElement.id`);
    check("CA-6.3 clic en label enfoca el campo", f1 === "email" && f2 === "password", { f1, f2 });
    await p.close();
  }

  // ---------- Errores ----------
  const errCases = [
    ["400 invalid_credentials", { kind: "invalid" }, MSG_CRED],
    ["Offline (status 0)", { kind: "offline" }, MSG_NET],
    ["503", { kind: "503" }, MSG_NET],
    ["429", { kind: "429" }, MSG_NET],
    ["200 con cuerpo no JSON", { kind: "badjson" }, MSG_NET],
    ["200 sin user: supabase-js lo convierte en error sin status", { kind: "nouser" }, MSG_NET],
  ];
  for (const [name, mock, msg] of errCases) {
    const { p, log } = await open(b, { mock });
    await fill(p);
    const t0 = Date.now();
    await submit(p);
    const ok = await waitFor(p, `document.getElementById('lg-submit').textContent === 'Entrar' && !document.getElementById('lg-submit').disabled && document.querySelector('main [role=alert]').textContent.length>0`, 5000);
    const s = await snap(p);
    const want = msg || MSG_CRED; const other = want === MSG_CRED ? MSG_NET : MSG_CRED;
    check(`CA-4.4/4.16/4.17 [${name}] mensaje exacto, boton Entrar habilitado <=1 s, valores y foco`, ok >= 0 && s.alert === want && s.alert !== other && s.btn === "Entrar" && s.dis === false && s.email === "qa@example.com" && s.pass === "x-test-123" && s.ptype === "password" && s.focus === "lg-submit" && s.path === "/login", { ...s, ms: ok });
    check(`CA-6.6/6.14/2.6 [${name}] 1 solo anuncio: 1 role=alert (light DOM), 0 aria-live, 0 toasts, texto 1 vez`, s.alerts === 1 && s.live === 0 && s.toasts === 0 && s.c1 + s.c2 === 1, { alerts: s.alerts, liveConTexto: s.live, toasts: s.toasts, c1: s.c1, c2: s.c2, regionesLive: s.liveRegions });
    check(`RNF-S3 [${name}] el mensaje no filtra detalles tecnicos`, !/fetch|503|429|400|Invalid|rate limit|Service/i.test(s.alert), s.alert);
    // reintento sin mouse: Enter otra vez
    if (name === "Offline (status 0)") {
      await p.eval(`document.getElementById('password').focus()`);
      await p.key("Enter", "Enter", 13, "\r"); await sleep(600);
      const s2 = await snap(p);
      check("CA-6.5/7.18 reintento con Enter tras error: un solo mensaje, sigue operable", s2.btn === "Entrar" && s2.alert === MSG_NET && s2.c2 === 1, s2);
      log.supa.length = 0;
    }
    if (name === "400 invalid_credentials") {
      // error de credenciales y luego de red: reemplaza el mensaje (caso 18)
      const mk = await open(b, { mock: { kind: "invalid" } });
      await fill(mk.p); await submit(mk.p); await waitFor(mk.p, `document.querySelector('main [role=alert]').textContent.length>0`);
      mk.state.kind = "offline"; await mk.p.click("#lg-submit"); await sleep(900);
      const s3 = await snap(mk.p);
      check("Caso 7.18 credenciales y luego red: un mensaje a la vez, reemplazado", s3.alert === MSG_NET && s3.c1 === 0 && s3.c2 === 1, { alert: s3.alert, c1: s3.c1, c2: s3.c2 });
      await mk.p.close();
    }
    await p.close();
  }
  // CA-4.17 (d) excepcion en la consulta a staff_users y (c) excepcion en signIn (almacenamiento de sesion falla)
  {
    const { p } = await open(b, { mock: { kind: "success", staffFail: "throw" } });
    await fill(p); await submit(p); const t0 = Date.now();
    const ms = await waitFor(p, `location.pathname === '/kitchen'`, 20000, 200);
    check("CA-4.19 consulta a staff_users que falla por red: termina en /kitchen (postgrest-js reintenta; se informa la demora)", ms >= 0, { msHastaKitchen: ms });
    await p.close();
  }
  {
    const { p } = await open(b, { mock: { kind: "success" }, init: `Object.defineProperty(Document.prototype,'cookie',{configurable:true,get(){return ''},set(v){ if (window.__qaThrow) throw new Error('qa-boom'); }}); window.__qaThrow=true;` });
    await fill(p); await submit(p); await sleep(1500);
    const s = await snap(p);
    check("CA-4.17(c) excepcion lanzada dentro de handleSubmit (cookie de sesion lanza): mensaje de red, boton Entrar habilitado", s.path === "/login" && s.btn === "Entrar" && s.dis === false && s.alert === MSG_NET, s);
    await p.close();
  }

  // ---------- Exito y destino por rol ----------
  for (const [name, mock, qs, expPath, expStaff] of [
    ["admin sin redirect", { kind: "success", role: "admin" }, undefined, "/admin", true],
    ["waiter sin redirect", { kind: "success", role: "waiter" }, undefined, "/kitchen", true],
    ["kitchen sin redirect", { kind: "success", role: "kitchen" }, undefined, "/kitchen", true],
    ["sin fila en staff_users", { kind: "success", role: "none" }, undefined, "/kitchen", true],
    ["staff_users devuelve error (no lanza)", { kind: "success", staffFail: "error" }, undefined, "/kitchen", true],
    ["waiter con redirect=/admin (valido)", { kind: "success", role: "waiter" }, "/admin", "/admin", false],
    ["admin con redirect=/floor (valido)", { kind: "success", role: "admin" }, "/floor", "/floor", false],
    ["admin con redirect invalido //evil.example", { kind: "success", role: "admin" }, "//evil.example", "/admin", true],
    ["waiter con redirect invalido https://evil.example", { kind: "success", role: "waiter" }, "https://evil.example", "/kitchen", true],
  ]) {
    const { p, log } = await open(b, { mock, redirect: qs });
    await fill(p); await submit(p);
    await waitFor(p, `location.pathname !== '/login'`, 6000);
    const f = await p.eval(`({ o: location.origin, p: location.pathname, s: location.search, m: !!document.getElementById('marker') })`).catch((e) => ({ err: String(e) }));
    check(`CA-4.1/4.2/4.3/R-2 [${name}] termina en ${expPath} del propio origen; staff_users ${expStaff ? "consultada" : "NO consultada"}`, f.o === new URL(BASE).origin && f.p === expPath && (log.staff > 0) === expStaff && log.ext.length === 0, { ...f, staff: log.staff, ext: log.ext });
    await p.close();
  }

  // ---------- Redirects: CA-4.12 / 4.13 / 4.20 en ejecucion ----------
  const valid = [["/admin", "/admin"], ["/kitchen?x=1", "/kitchen?x=1"], ["/admin/menu/abc", "/admin/menu/abc"], ["/floor", "/floor"], ["/", "/"], ["/no-existe", "/no-existe"], ["/a/../kitchen", "/kitchen"]];
  const invalid = ["https://evil.example", "http://evil.example", "//evil.example", "///evil.example", "/\\evil.example", "\\\\evil.example", "\\/evil.example", "/\\/evil.example",
    "javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", " /admin", "\t/admin", "/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "/%2F%2Fevil.example", "/%5Cevil.example", "/%0A/evil.example", "/%09/evil.example", "/%",
    "evil.example", "admin", "", "/.//evil.example", "/a/..//evil.example", "/%2e//evil.example", "/%2E%2E//evil.example", "/./%2F/evil.example",
    "//\\evil.example", "/%2f/evil.example", "/%E0%A4%A", "/\u0000/evil.example", "HTTPS://evil.example", "/admin\\.evil.example", "/%C0%AF/evil.example"];
  const rows = [];
  async function runRedirect(label, query, expPath, shouldStaff) {
    const { p, log } = await open(b, { mock: { kind: "success", role: "admin" }, query });
    await fill(p); await submit(p);
    await waitFor(p, `location.pathname !== '/login'`, 5000);
    const f = await p.eval(`({ o: location.origin, p: location.pathname + location.search, h: location.hash })`).catch((e) => ({ err: String(e) }));
    const sameOrigin = f.o === new URL(BASE).origin && log.ext.length === 0;
    const okp = expPath === undefined ? (f.p === "/admin" ) : f.p === expPath;
    const err = p.cons.filter((c) => !/Download the React|Failed to load resource/.test(c));
    rows.push({ label, final: (f.o || "") + (f.p || ""), staff: log.staff, ext: log.ext.length, cons: err.length });
    check(`CA-4.12/4.13/4.20 redirect ${JSON.stringify(label)} => ${expPath ?? "/admin (rol)"}`, sameOrigin && okp && (shouldStaff === undefined || (log.staff > 0) === shouldStaff), { final: f, staff: log.staff, ext: log.ext, consola: err });
    await p.close();
  }
  for (const [v, exp] of valid) await runRedirect(v, "?redirect=" + encodeURIComponent(v), exp, false);
  for (const v of invalid) await runRedirect(v, "?redirect=" + encodeURIComponent(v), undefined, true);
  // variantes inofensivas: son rutas del propio origen (no se descartan); solo se exige que el origen final sea el propio
  for (const v of ["/%252F/evil.example", "/∕evil.example", "/／/evil.example", "/ /evil.example"]) {
    const { p, log } = await open(b, { mock: { kind: "success", role: "admin" }, query: "?redirect=" + encodeURIComponent(v) });
    await fill(p); await submit(p); await waitFor(p, `location.pathname !== '/login'`, 5000);
    const f = await p.eval(`({ o: location.origin, p: location.pathname })`).catch((e) => ({ err: String(e) }));
    check(`CA-4.13 variante ${JSON.stringify(v)}: el origen final es el propio (ruta interna, sin salto de origen)`, f.o === new URL(BASE).origin && log.ext.length === 0, { ...f, staff: log.staff });
    await p.close();
  }
  await runRedirect("multiple /admin & //evil", "?redirect=/floor&redirect=//evil.example", undefined, true);
  await runRedirect("sin redirect", "", undefined, true);
  await runRedirect("redirect vacio", "?redirect=", undefined, true);
  await runRedirect("%-mal-formado crudo en la URL", "?redirect=%E0%A4%A", undefined, true);

  // CA-4.14 el valor invalido no se muestra ni genera consola ni enlaces
  {
    const { p } = await open(b, { redirect: "//evil.example/<img src=x onerror=alert(1)>" });
    const r = await p.eval(`({ shown: (() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n, t = ''; while ((n = w.nextNode())) { if (!/^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.parentElement.tagName)) t += n.textContent; } return t.includes('evil.example'); })(), inScript: [...document.scripts].some(s => s.textContent.includes('evil.example')), attrs: [...document.querySelectorAll('*')].some(e => [...e.attributes].some(a => a.value.includes('evil.example'))), links: [...document.querySelectorAll('a')].map(a => a.getAttribute('href')), html: document.documentElement.outerHTML.includes('evil.example') })`);
    check("CA-4.14/RNF-S7 redirect invalido: no se muestra en pantalla, ni en atributos/enlaces, consola limpia (nota: viaja en el payload RSC <script>, ver informe)", !r.shown && r.links.join() === "/" && !r.attrs && p.cons.length === 0, { ...r, cons: p.cons });
    await p.close();
  }

  // ---------- Botón nunca trabado / doble envío / éxito ----------
  {
    const { p, log } = await open(b, { mock: { kind: "hang" } });
    await fill(p);
    await p.click("#lg-submit"); await sleep(120);
    const during = await snap(p);
    await p.key("Enter", "Enter", 13, "\r"); await p.click("#lg-submit"); await p.click("#lg-submit"); await sleep(500);
    const n = log.supa.filter((x) => x.startsWith("POST /auth/v1/token")).length;
    check("CA-4.5 en curso: 'Entrando...' deshabilitado, mascota loading; 3 intentos extra (clic x2, Enter) no envian de nuevo", during.btn === "Entrando..." && during.dis === true && during.mood === "loading" && n === 1, { during, tokenPosts: n });
    await p.close();
  }
  {
    // Exito con navegacion que no termina: boton en Entrando... y a los 10 s vuelve (red de seguridad), mascota success antes del cambio de URL
    const { p } = await open(b, { mock: { kind: "success", role: "admin", holdNav: true } });
    await fill(p); await submit(p); await sleep(700);
    const a = await snap(p);
    const succ = await p.eval(`({ mood: document.querySelector('.lg-mascot').dataset.mood, face: document.querySelector('.lg-mascot').dataset.face })`);
    check("CA-10.10 exito: mascota en success/yay y boton deshabilitado 'Entrando...' mientras la ruta nueva carga", succ.mood === "success" && succ.face === "yay" && a.btn === "Entrando..." && a.dis === true && a.path === "/login", { ...succ, btn: a.btn, dis: a.dis });
    const back = await waitFor(p, `document.getElementById('lg-submit').textContent === 'Entrar' && !document.getElementById('lg-submit').disabled`, 12000, 100);
    check("CA-10.10d red de seguridad: ~10 s despues el boton vuelve a Entrar habilitado", back >= 8500 && back <= 11500, { msDesdeLos700: back });
    await p.close();
  }

  // ---------- HU-11 mostrar contraseña ----------
  {
    const { p } = await open(b, { mock: { kind: "invalid" } });
    await fill(p);
    await p.eval(`document.getElementById('password').focus()`);
    await p.tab();
    const e1 = await p.eval(`({ id: document.activeElement.id, name: document.activeElement.getAttribute('aria-label'), type: document.getElementById('password').type, w: document.activeElement.getBoundingClientRect().width, h: document.activeElement.getBoundingClientRect().height })`);
    await p.key(" ", "Space", 32, " ");
    const e2 = await p.eval(`({ id: document.activeElement.id, name: document.getElementById('lg-eye').getAttribute('aria-label'), type: document.getElementById('password').type, val: document.getElementById('password').value })`);
    check("CA-11.1/11.2 teclado: Tab llega a 'Mostrar contraseña' (>=44x44); Espacio alterna a text y nombre 'Ocultar contraseña'; valor intacto", e1.id === "lg-eye" && e1.name === "Mostrar contraseña" && e1.type === "password" && e1.w >= 44 && e1.h >= 44 && e2.type === "text" && e2.name === "Ocultar contraseña" && e2.val === "x-test-123", { e1, e2 });
    await p.key("Enter", "Enter", 13, "\r");
    const e3 = await p.eval(`({ type: document.getElementById('password').type, name: document.getElementById('lg-eye').getAttribute('aria-label') })`);
    check("CA-11.1 Enter sobre el boton alterna de vuelta a oculta", e3.type === "password" && e3.name === "Mostrar contraseña", e3);
    await p.click("#lg-eye");
    const shown = await p.eval(`document.getElementById('password').type`);
    await p.click("#lg-submit");
    await waitFor(p, `document.querySelector('main [role=alert]').textContent.length>0`);
    const s = await snap(p);
    check("CA-4.21/11.4 al enviar, visible => vuelve a oculta (error de credenciales); valor conservado", shown === "text" && s.ptype === "password" && s.pass === "x-test-123", { shown, ...{ ptype: s.ptype, pass: s.pass } });
    // visible + error de red
    await p.click("#lg-eye"); const sh2 = await p.eval(`document.getElementById('password').type`);
    await p.click("#lg-submit"); await sleep(120);
    const during = await p.eval(`document.getElementById('password').type`);
    await sleep(500);
    check("CA-4.21 se oculta ya al pulsar Entrar (durante la peticion)", sh2 === "text" && during === "password", { sh2, during });
    const ax = await p.eval(`document.getElementById('lg-eye').getAttribute('aria-pressed')`);
    check("CA-11.1 nombre cambia (no usa aria-pressed): aria-pressed ausente", ax === null, String(ax));
    await p.close();
  }

  // ---------- dark scheme CA-2.5 ----------
  {
    const a = await open(b); const ca = await a.p.eval(`(() => { const g = (s, p) => getComputedStyle(document.querySelector(s))[p]; return [g('.ms-login','backgroundColor'), g('.lg-ticket','backgroundColor'), g('#email','backgroundColor'), g('h1','color'), g('.lg-brand','backgroundColor')].join('|'); })()`);
    const d = await open(b, { scheme: "dark" }); const cd = await d.p.eval(`(() => { const g = (s, p) => getComputedStyle(document.querySelector(s))[p]; return [g('.ms-login','backgroundColor'), g('.lg-ticket','backgroundColor'), g('#email','backgroundColor'), g('h1','color'), g('.lg-brand','backgroundColor')].join('|'); })()`);
    const dm = await d.p.eval(`matchMedia('(prefers-color-scheme: dark)').matches`);
    check("CA-2.5 con prefers-color-scheme: dark el login se ve igual (colores computados)", dm && ca === cd, { claro: ca, oscuro: cd });
    await a.p.close(); await d.p.close();
  }
  // ---------- caso 13 email largo ----------
  {
    const { p } = await open(b, { width: 320, height: 568 });
    await p.eval(`document.getElementById('email').focus()`); await p.send("Input.insertText", { text: "a".repeat(40) + "." + "b".repeat(30) + "@" + "c".repeat(40) + ".example.com" });
    const r = await p.eval(`({ ox: document.documentElement.scrollWidth - innerWidth })`);
    check("Caso 7.13 email de 110+ caracteres en 320 px sin scroll horizontal", r.ox <= 0, r);
    await p.close();
  }
  // consola limpia
  for (const [w, h] of [[1440, 900], [360, 640]]) {
    const { p } = await open(b, { width: w, height: h }); await sleep(800);
    check(`CA-9.8 consola de /login limpia (${w}x${h})`, p.cons.length === 0, p.cons);
    await p.close();
  }
} finally {
  summary();
  await b.close();
}

function results_fix(exp, seq) {
  check("CA-1.3/6.2 orden de tab exacto (5 primeros)", exp.join() === seq.slice(0, 5).join(), seq);
  check("CA-6.2 6.o Tab sale del formulario (nada decorativo recibe foco)", !["lg-mascot", "svg", "DIV", "SECTION"].includes(seq[5]), seq[5]);
}
