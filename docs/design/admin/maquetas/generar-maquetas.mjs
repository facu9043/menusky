// Genera las maquetas estáticas de Inicio, Apariencia y estados (paso 4a-bis, SOLO propuesta)
// y sus capturas. El shell del admin, el SVG de Pomo y las vistas previas de los temas se copian
// del build de producción que está corriendo, así la maqueta usa exactamente las mismas piezas.
// Uso (con el mock y el build levantados, ver ../evidencia/mesas-4a/README.md):
//   TOOLS_DIR=... APP_URL=http://127.0.0.1:3420 MOCK_URL=http://127.0.0.1:3421 node docs/design/admin/maquetas/generar-maquetas.mjs
// Los HTML resultantes no tienen JS: enlazan app/brand.css, app/admin/admin.css y maquetas.css.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch, login, APP, resetMock } from "../evidencia/carta-4a/lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const req = createRequire(path.join(ROOT, "package.json"));
const React = req("react");
const { renderToStaticMarkup } = req("react-dom/server");
const lucide = req("lucide-react");
const icon = (name) => renderToStaticMarkup(React.createElement(lucide[name], { "aria-hidden": "true" }));

// ---------- 1. Piezas reales desde la app ----------
await resetMock();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const shellOf = async (route) => {
  await page.goto(`${APP}${route}`);
  await page.locator("main#contenido").waitFor();
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const root = document.querySelector(".adm-root").cloneNode(true);
    root.querySelector("main#contenido").innerHTML = "%%MAIN%%";
    return root.outerHTML;
  });
};
await login(page, "admin@demo.test", "/admin");
const shellInicio = await shellOf("/admin");
const shellApariencia = await shellOf("/admin/apariencia");
const previews = await page.evaluate(() =>
  Object.fromEntries(
    [...document.querySelectorAll("[data-slot=card]")]
      .filter((c) => c.querySelector("button"))
      .map((c) => [c.children[0].querySelector("span")?.textContent.trim(), c.children[1].outerHTML])
  )
);
await page.goto(`${APP}/admin/mesas`);
await page.locator(".adm-pill[data-filter='free']").click();
const pomo = await page.locator(".adm-empty .adm-pomo").evaluate((e) => e.outerHTML);
await ctx.close();
const pomoOops = pomo.replace('class="adm-pomo"', 'class="adm-pomo" data-face="oops"');

// ---------- 2. Fuentes de la marca (las mismas que sirve next/font; SIL OFL), embebidas ----------
const css = fs.readdirSync(path.join(ROOT, ".next/static/chunks")).filter((f) => f.endsWith(".css")).map((f) => fs.readFileSync(path.join(ROOT, ".next/static/chunks", f), "utf8")).join("\n");
const fontFile = (family) => {
  const rule = css.match(new RegExp(`@font-face\\{font-family:${family};[^}]*?src:url\\(\\.\\./media/([^)]+)\\)[^}]*unicode-range:U\\+\\?\\?`));
  if (!rule) throw new Error(`no encontré la fuente ${family}`);
  return fs.readFileSync(path.join(ROOT, ".next/static/media", rule[1])).toString("base64");
};
const faces = [
  ["Bricolage Grotesque", "200 800"],
  ["Geist", "100 900"],
  ["Geist Mono", "100 900"],
]
  .map(([f, w]) => `@font-face{font-family:"${f}";font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${fontFile(f)}) format("woff2")}`)
  .join("\n");
fs.writeFileSync(
  path.join(HERE, "fuentes.css"),
  `/* Bricolage Grotesque, Geist y Geist Mono (subset latin), SIL Open Font License 1.1.\n   Son los mismos archivos que la app sirve con next/font; embebidos para abrir las maquetas sin servidor. */\n${faces}\n:root{--font-ms-display:"Bricolage Grotesque";--font-geist-sans:"Geist";--font-geist-mono:"Geist Mono"}\n`
);

// ---------- 3. Contenido de cada maqueta ----------
const doc = (title, shell, main) => `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title} | Maqueta del admin de MenuSky (propuesta)</title>
<link rel="stylesheet" href="fuentes.css">
<link rel="stylesheet" href="../../../../app/brand.css">
<link rel="stylesheet" href="../../../../app/admin/admin.css">
<link rel="stylesheet" href="maquetas.css">
</head>
<body>
<!-- MAQUETA ESTÁTICA (paso 4a-bis). No es la app: es una propuesta para el Director. -->
${shell.replace("%%MAIN%%", () => main)}
</body>
</html>
`;

const kpi = ({ label, value, sub, go, hot, alert, href }) => {
  const tag = href ? "a" : "div";
  return `<${tag} class="adm-stat mq-kpi${hot ? " adm-stat--hot" : ""}"${href ? ` href="${href}"` : ""}>
  <span class="adm-stat__label">${label}</span>
  <span class="adm-stat__value${alert ? " adm-stat__value--alert" : ""}">${value}</span>
  ${sub ? `<span class="mq-kpi__sub">${sub}</span>` : ""}
  ${go ? `<span class="mq-kpi__go">${go}${icon("ArrowRight")}</span>` : ""}
</${tag}>`;
};
const kpis = (v) => `<section class="mq-kpis" aria-label="Resumen del día">
${kpi({ label: "Pedidos de hoy", value: v.orders, sub: v.ordersSub, hot: true })}
${kpi({ label: "Mesas ocupadas", value: v.tables, sub: v.tablesSub, go: "Ver ocupadas", href: "/admin/mesas?filtro=ocupadas" })}
${kpi({ label: "Llamados pendientes", value: v.calls, sub: v.callsSub, alert: v.callsAlert, go: "Ver mesas llamando", href: "/admin/mesas?filtro=llamando" })}
${kpi({ label: "Platos sin stock", value: v.stock, sub: v.stockSub, alert: v.stockAlert, go: "Ver en la carta", href: "/admin/menu?filtro=sin-stock" })}
</section>`;
const quick = `<h2 class="adm-h2 mq-h2">Accesos rápidos</h2>
<ul class="mq-quick">
  <li><a class="mq-tile mq-tile--primary" href="/admin/menu?nuevo=plato"><span class="mq-tile__icon">${icon("Plus")}</span>Nuevo plato</a></li>
  <li><a class="mq-tile" href="/admin/mesas?nueva=1"><span class="mq-tile__icon">${icon("LayoutGrid")}</span>Nueva mesa</a></li>
  <li><a class="mq-tile" href="/admin/mesas?imprimir=1"><span class="mq-tile__icon">${icon("Printer")}</span>Imprimir todos los QR</a></li>
  <li><a class="mq-tile" href="/floor"><span class="mq-tile__icon">${icon("ConciergeBell")}</span>Ir al Salón</a></li>
</ul>`;
const head = (eyebrow, h1, extra = "") => `<header class="mq-head"><p class="adm-eyebrow">${eyebrow}</p><h1 class="adm-h1">${h1}</h1>${extra}</header>`;
const empty = (text, { sub, action, oops } = {}) => `<div class="adm-empty"${oops ? ' role="alert"' : ""}>${oops ? pomoOops : pomo}<p class="adm-empty__text">${text}</p>${sub ? `<p class="adm-empty__sub">${sub}</p>` : ""}${action ?? ""}</div>`;
const btn = (label, cls = "adm-btn", ic) => `<button type="button" class="${cls}">${ic ? icon(ic) : ""}${label}</button>`;

const DAY = `<p class="mq-date">sábado 3 de octubre</p>`;
const inicioMain = `<div class="adm-page">
${head("Inicio", "Así viene el día", DAY)}
${kpis({ orders: 4, tables: "3 <small>de 3</small>", calls: 1, callsAlert: true, stock: 1, stockAlert: true })}
${quick}
</div>`;

const presetCard = (label, { active, def } = {}) => `<li class="mq-preset"${active ? " data-active" : ""}>
  <div class="mq-preset__head"><h3 class="mq-preset__name">${label}</h3>${def ? `<span class="mq-tag mq-tag--default">Predeterminado</span>` : ""}${active ? `<span class="mq-tag mq-tag--active">${icon("Check")}Activo</span>` : ""}</div>
  ${previews[label] ?? ""}
  ${active ? btn("Tema actual", "adm-btn") .replace("<button", "<button disabled") : btn("Usar este tema", "adm-btn")}
</li>`;
const COLORS = [
  ["Fondo", "#FFF5E1"],
  ["Fondo de tarjeta", "#FFFDF8"],
  ["Texto principal", "#2B1710"],
  ["Texto secundario", "#6A4A3C"],
  ["Acento primario (precios, botón de pedido)", "#D7261E"],
  ["Acento secundario (navegación, tabs)", "#FFC21A"],
  ["Botón de llamar al mozo", "#2B1710"],
];
const colorRow = ([label, hex], i, { invalid } = {}) => `<li class="mq-color">
  <span class="mq-swatch" style="background:${invalid ? "repeating-linear-gradient(45deg,#fff 0 6px,#f1e3c6 6px 12px)" : hex}" aria-hidden="true"></span>
  <div class="adm-field"><label class="adm-label" for="c${i}">${label}</label><input id="c${i}" class="adm-input mq-hex" value="${invalid ?? hex}"${invalid ? ' aria-invalid="true"' : ""}>${invalid ? `<p class="adm-error">Usá un color con el formato #RRGGBB (por ejemplo #FFC21A).</p>` : ""}</div>
</li>`;
const aparienciaMain = `<div class="adm-page">
${head("Apariencia", "Tu carta, a tu estilo")}
<p class="mq-intro">Elegí un tema predefinido o armá tu propia paleta. Se aplica en la carta que ven tus clientes al escanear el QR de la mesa.</p>
<h2 class="adm-h2 mq-h2">Temas</h2>
<ul class="mq-presets">
${presetCard("MenuSky", { active: true, def: true })}
${["Clásico", "Glaciar", "Galaxia", "Madera", "Neobrutalista", "Neumorfismo", "Claymorfismo"].map((l) => presetCard(l)).join("\n")}
</ul>
<section class="mq-custom" aria-labelledby="mq-custom-title">
  <h2 id="mq-custom-title" class="adm-h2">Paleta personalizada</h2>
  <div class="mq-custom__grid">
    <ul class="mq-colors">${COLORS.map((c, i) => colorRow(c, i)).join("")}</ul>
    <div><span class="mq-preview-label" id="mq-prev">Vista previa</span>${previews["MenuSky"] ?? ""}</div>
  </div>
</section>
<div class="mq-actions">${btn("Restablecer", "adm-btn")}${btn("Guardar", "adm-btn adm-btn--save")}</div>
</div>`;

const state = (title, ca, body, built) => `<li class="mq-state"><div class="mq-cap"><b>${title}</b><span>${ca}</span>${built ? `<span class="mq-tag">Ya construido</span>` : `<span class="mq-tag mq-tag--default">Propuesta</span>`}</div><div class="mq-state__body">${body}</div></li>`;
const sk = (h, extra = "") => `<span class="adm-sk" style="height:${h}px;border-radius:14px;${extra}"></span>`;
const errKpi = (label) => `<div class="adm-stat mq-kpi" role="alert"><span class="adm-stat__label">${label}</span><span class="mq-kpi__err">No pudimos cargar${btn("Reintentar", "adm-btn adm-btn--small", "RotateCcw")}</span></div>`;
const estadosMain = `<div class="adm-page">
${head("Estados", "Vacíos, carga y errores")}
<p class="mq-intro">Propuesta de los estados de HU-11 con Pomo, con el mismo lenguaje de la Carta. "Ya construido" = así se ve hoy en la app (Carta y Mesas); "Propuesta" = falta construir (Inicio, Apariencia y el filtro "Sin stock").</p>
<ul class="mq-states">
${state("Inicio sin pedidos hoy", "CA-9.6 · CA-11.1", `${kpis({ orders: 0, tables: "0 <small>de 3</small>", calls: 0, callsSub: "Sin llamados", stock: 0 })}${empty("Todavía no entraron pedidos hoy.")}`)}
${state("Inicio cargando", "CA-9.7 · CA-11.4", `<div class="mq-kpis" aria-busy="true">${sk(104)}${sk(104)}${sk(104)}${sk(104)}</div><div class="mq-quick">${sk(72)}${sk(72)}${sk(72)}${sk(72)}</div>`)}
${state("Inicio con un dato que falló", "CA-9.7 · CA-11.6", `<section class="mq-kpis">${kpi({ label: "Pedidos de hoy", value: 4, hot: true })}${errKpi("Mesas ocupadas")}${kpi({ label: "Llamados pendientes", value: 1, alert: true })}${kpi({ label: "Platos sin stock", value: 1, alert: true })}</section>`)}
${state("Inicio: no se pudo leer nada", "CA-11.5", `${head("Inicio", "Así viene el día")}${empty("No pudimos cargar el resumen", { oops: true, sub: "Puede ser la conexión o un problema del servicio.", action: btn("Reintentar", "adm-btn adm-btn--primary", "RotateCcw") })}`)}
${state("Carta: filtro \"Sin stock\" sin resultados", "CA-9.5 · CA-11.1", `<ul class="adm-pills" style="margin:0"><li><button type="button" class="adm-pill">Todas <span aria-hidden="true">·</span> <span class="adm-pill__count">8</span></button></li><li><button type="button" class="adm-pill" aria-pressed="true">Sin stock <span class="mq-pill-x">${icon("X")}</span></button></li></ul>${empty("No hay platos sin stock.", { action: btn("Limpiar búsqueda", "adm-btn") })}`)}
${state("Apariencia: no se pudo leer el tema", "CA-11.5", `${head("Apariencia", "Tu carta, a tu estilo")}${empty("No pudimos cargar el tema", { oops: true, sub: "Puede ser la conexión o un problema del servicio.", action: btn("Reintentar", "adm-btn adm-btn--primary", "RotateCcw") })}`)}
${state("Apariencia: aviso de contraste y color inválido", "CA-10.5 · CA-10.6", `<ul class="mq-colors">${colorRow(["Texto secundario", "#C9B8AE"], 10)}${colorRow(["Acento secundario (navegación, tabs)", "#FFC21A"], 11, { invalid: "#FFC2" })}</ul><div class="mq-warn" role="status" aria-describedby="mq-prev"><p>${icon("TriangleAlert")}"Texto secundario" puede ser difícil de leer sobre "Fondo".</p></div><div class="mq-actions" style="position:static">${btn("Restablecer", "adm-btn")}${btn("Guardar", "adm-btn adm-btn--save").replace("<button", "<button disabled")}</div>`)}
${state("Carta vacía", "CA-11.1", empty("Tu carta está vacía. Creá la primera categoría y empezá a sumar platos.", { action: btn("Nueva categoría", "adm-btn adm-btn--primary", "Plus") }), true)}
${state("Búsqueda sin resultados", "CA-11.1", empty('No encontramos platos con "sushi".', { action: btn("Limpiar búsqueda", "adm-btn") }), true)}
${state("Sin mesas", "CA-11.1", empty("Todavía no hay mesas. Creá la primera y bajá su QR.", { action: btn("Nueva mesa", "adm-btn adm-btn--primary", "Plus") }), true)}
${state("Filtro de mesas sin resultados", "CA-11.1", empty("No hay mesas libres ahora.", { action: btn("Ver todas", "adm-btn") }), true)}
${state("Error al leer la carta o las mesas", "CA-11.5", empty("No pudimos cargar la carta", { oops: true, sub: "Puede ser la conexión o un problema del servicio. Tus platos siguen guardados.", action: btn("Reintentar", "adm-btn adm-btn--primary", "RotateCcw") }), true)}
</ul>
</div>`;

const PAGES = [
  ["inicio", "Inicio", shellInicio, inicioMain],
  ["apariencia", "Apariencia", shellApariencia, aparienciaMain],
  ["estados", "Estados vacíos, carga y error", shellInicio, estadosMain],
];
for (const [file, title, shell, main] of PAGES) fs.writeFileSync(path.join(HERE, `${file}.html`), doc(title, shell, main));

// ---------- 4. Capturas ----------
for (const [w, h] of [
  [1440, 900],
  [390, 844],
]) {
  const mobile = w < 768;
  const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "reduce", hasTouch: mobile, isMobile: mobile });
  const p = await c.newPage();
  for (const [file] of PAGES) {
    await p.goto(pathToFileURL(path.join(HERE, `${file}.html`)).href);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    // Página entera con el viewport tan alto como el documento: así el menú y la barra fijos quedan en su lugar.
    const full = await p.evaluate(() => document.documentElement.scrollHeight);
    await p.setViewportSize({ width: w, height: Math.max(h, full) });
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(HERE, `${file}-${w}x${h}.png`) });
    await p.setViewportSize({ width: w, height: h });
    const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, fonts: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family) }));
    console.log(`${file} ${w}x${h}: scroll horizontal ${o.sw > o.iw ? "SÍ" : "no"} (${o.sw}/${o.iw}); fuentes cargadas: ${[...new Set(o.fonts)].join(", ")}`);
  }
  await c.close();
}
await browser.close();
await resetMock();
