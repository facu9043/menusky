// Genera las maquetas estáticas de Cocina y Salón (SOLO propuesta; fase cocina-salon).
// No necesita la app levantada: arma HTML sin JS con los íconos lucide del repo
// (los mismos que usan components/kitchen, floor y staff) y copia el logo y Pomo
// tal como quedaron en las maquetas aprobadas del admin (que los copiaron del build).
// Uso: node docs/design/cocina-salon/maquetas/generar-maquetas.mjs
// Los HTML enlazan app/brand.css, app/admin/admin.css, ../../admin/maquetas/fuentes.css y staff.css.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const req = createRequire(path.join(ROOT, "package.json"));
const React = req("react");
const { renderToStaticMarkup } = req("react-dom/server");
const lucide = req("lucide-react");
const icon = (name) => renderToStaticMarkup(React.createElement(lucide[name], { "aria-hidden": "true" }));

// ---------- Piezas de marca copiadas de las maquetas aprobadas del admin ----------
const ADMIN = path.join(ROOT, "docs/design/admin/maquetas");
const balanced = (src, start, tag) => {
  const re = new RegExp(`<\\/?${tag}\\b`, "g");
  re.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = re.exec(src))) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return src.slice(start, src.indexOf(">", m.index) + 1);
  }
  throw new Error(`sin cierre para <${tag}>`);
};
const inicio = fs.readFileSync(path.join(ADMIN, "inicio.html"), "utf8");
const estados = fs.readFileSync(path.join(ADMIN, "estados.html"), "utf8");
const LOGO = balanced(inicio, inicio.indexOf('<span class="ms-logo'), "span");
const POMO = balanced(estados, estados.indexOf('<div class="adm-pomo"'), "div");

// ---------- Datos de ejemplo (El Buen Sabor, platos y opciones del Supabase simulado) ----------
const LOCAL = "El Buen Sabor";
const PEOPLE = {
  kitchen: { name: "Lucía Ferreyra", initials: "LF", role: "Cocina" },
  waiter: { name: "Matías Rivas", initials: "MR", role: "Mozo" },
  admin: { name: "Admin Demo", initials: "AD", role: "Admin" },
};
const LINKS = [
  { href: "/kitchen", key: "kitchen", label: "Cocina", icon: "ChefHat", roles: ["kitchen", "admin"] },
  { href: "/floor", key: "floor", label: "Salón", icon: "ConciergeBell", roles: ["waiter", "admin"] },
  { href: "/admin", key: "admin", label: "Admin", icon: "House", roles: ["admin"] },
];

const KITCHEN_ORDERS = [
  {
    table: "Mesa 4", time: "21:02", status: "received", isNew: true, bill: "$ 31.400",
    items: [
      { q: 2, name: "Milanesa napolitana", opts: ["Papas fritas"], note: "Una sin jamón, por favor" },
      { q: 1, name: "Empanadas (x3)", opts: ["Salsa criolla", "Ajíes en vinagre"] },
    ],
  },
  {
    table: "Mesa 7", time: "20:58", status: "received", isNew: true, bill: "$ 12.500",
    items: [{ q: 1, name: "Bife de chorizo", opts: ["Puré de papas", "Jugoso"] }],
  },
  {
    table: "Mesa 2", time: "20:51", status: "in_kitchen", bill: "$ 26.600",
    items: [
      { q: 1, name: "Bife de chorizo", opts: ["Papas fritas", "A punto"] },
      { q: 1, name: "Ensalada César", opts: [], note: "Sin crutones, es celíaca" },
      { q: 1, name: "Provoleta", opts: [] },
    ],
  },
  {
    table: "Terraza, mesa larga del fondo", time: "20:47", status: "in_kitchen", busy: true, bill: "$ 1.234.567",
    items: [
      { q: 12, name: "Empanadas (x3)", opts: ["Salsa criolla"] },
      { q: 4, name: "Gaseosa línea Coca-Cola 500ml", opts: [] },
    ],
  },
  {
    table: "Mesa 10", time: "20:44", status: "received", bill: "$ 8.900",
    items: [{ q: 1, name: "Ensalada César", opts: [], note: "Aderezo aparte" }],
  },
];

const CALLS = [
  { table: "Mesa 3", why: "Pide la cuenta", time: "21:05", bill: "$ 22.300" },
  { table: "Mesa 9", why: "Tiene una consulta", time: "21:03" },
  { table: "Mesa 12", why: "Llama al mozo", time: "20:59" },
];
const READY = [
  {
    table: "Mesa 6", time: "20:40", isNew: true, bill: "$ 15.200",
    items: [
      { q: 1, name: "Milanesa napolitana", opts: ["Ensalada mixta"] },
      { q: 1, name: "Agua mineral 500ml", opts: [] },
    ],
  },
  {
    table: "Mesa 1", time: "20:36", bill: "$ 9.000",
    items: [{ q: 2, name: "Provoleta", opts: [] }],
  },
];
const TABLES = [
  ["Mesa 1", "ready"], ["Mesa 2", "active"], ["Mesa 3", "calling"], ["Mesa 4", "active"],
  ["Mesa 5", "free"], ["Mesa 6", "ready"], ["Mesa 7", "active"], ["Mesa 8", "free"],
  ["Mesa 9", "calling"], ["Mesa 10", "active"], ["Mesa 11", "free"], ["Mesa 12", "calling"],
  ["Terraza, mesa larga del fondo", "active"], ["Barra", "free"],
];
// Textos de estado: literales de components/floor/TableGrid.tsx:7-10.
const TABLE_STATE = {
  calling: { label: "Llamando", icon: "BellRing" },
  ready: { label: "Listo", icon: "CircleCheck" },
  active: { label: "Con pedido", icon: "Utensils" },
  free: { label: "Libre", icon: "CircleDashed" },
};

// ---------- Piezas ----------
const head = ({ role, active, pending = {} }) => {
  const p = PEOPLE[role];
  const links = LINKS.filter((l) => l.roles.includes(role));
  const anyPending = Object.values(pending).some(Boolean);
  const panel = links.find((l) => l.key === active) ?? links[0];
  const nav = links
    .map((l) => {
      const cur = l.key === active ? ' aria-current="page"' : "";
      const dot = pending[l.key] ? `<span class="adm-dot" aria-hidden="true"></span><span class="sr-only">(hay pendientes)</span>` : "";
      return `<li><a class="st-nav__link" href="${l.href}"${cur}>${icon(l.icon)}${l.label}${dot}</a></li>`;
    })
    .join("");
  return `<header class="st-head">
<a class="st-head__logo" href="${panel.href}" aria-label="MenuSky, ir a ${panel.label}">${LOGO}</a>
<nav class="st-nav" aria-label="Paneles"><ul>${nav}</ul></nav>
<div class="st-who"><span class="st-who__avatar" aria-hidden="true">${p.initials}</span><div class="st-who__text"><p class="st-who__name">${p.name}</p><p class="st-who__role">${p.role}</p></div></div>
<button type="button" class="st-logout">${icon("LogOut")}<span class="st-logout__text">Cerrar sesión</span></button>
<button type="button" class="adm-account-btn" aria-label="Cuenta: ${p.name}" aria-haspopup="menu">${icon("CircleUserRound")}<span class="adm-account-btn__name" aria-hidden="true">${p.name.split(" ")[0]}</span>${anyPending ? '<span class="adm-dot" aria-hidden="true"></span>' : ""}</button>
</header>`;
};

const accountMenu = ({ role, active, pending = {} }) => {
  const p = PEOPLE[role];
  const items = LINKS.filter((l) => l.roles.includes(role))
    .map((l) => {
      const cur = l.key === active ? ' aria-current="page"' : "";
      const dot = pending[l.key] ? `<span class="adm-dot" aria-hidden="true"></span><span class="sr-only">(hay pendientes)</span>` : "";
      return `<a class="adm-menu__item" role="menuitem" href="${l.href}"${cur}>${icon(l.icon)}${l.label}${dot}</a>`;
    })
    .join("");
  return `<div class="st-menu-demo"><div class="adm-menu" role="menu" aria-label="Cuenta">
<div class="adm-menu__who"><p class="adm-menu__name">${p.name}</p><p class="adm-menu__meta">${p.role} · ${LOCAL}</p></div>
${items}<div class="adm-menu__sep" role="separator"></div>
<button type="button" role="menuitem" class="adm-menu__item adm-menu__item--danger">${icon("LogOut")}Cerrar sesión</button>
</div></div>`;
};

const title = (h1, role) =>
  `<div class="st-title"><h1 class="adm-h1">${h1}</h1><p class="st-title__who">${LOCAL} · ${PEOPLE[role].name}</p></div>`;

const items = (list, withNotes) =>
  `<ul class="st-items">${list
    .map(
      (it) => `<li><span class="st-item__line"><span class="st-item__qty">${it.q}×</span> ${it.name}</span>${
        it.opts.length ? `<p class="st-item__opts">${it.opts.join(" · ")}</p>` : ""
      }${withNotes && it.note ? `<p class="st-item__note">“${it.note}”</p>` : ""}</li>`
    )
    .join("")}</ul>`;

const newTag = (o) => (o.isNew ? `<span class="st-new"><span class="st-new__dot" aria-hidden="true"></span>Nuevo</span>` : "");

const kitchenCard = (o) => {
  const received = o.status === "received";
  const label = received ? "Tomar pedido" : "Marcar listo";
  const btn = `<button type="button" class="adm-btn st-act${received ? " adm-btn--primary" : ""}"${
    o.busy ? ' aria-disabled="true"' : ""
  } aria-label="${label}, ${o.table}">${icon(o.busy ? "LoaderCircle" : received ? "ChefHat" : "CircleCheck")}${label}</button>`;
  return `<li><article class="st-order" data-status="${o.status}" aria-labelledby="k-${slug(o.table)}">${newTag(o)}
<div class="st-order__head"><h2 class="st-order__table" id="k-${slug(o.table)}">${o.table}</h2><span class="st-order__time">${icon("Clock")}${o.time}</span>${
    received ? "" : `<span class="st-chip">${icon("ChefHat")}En preparación</span>`
  }</div>
<div class="st-order__body"><p class="st-order__bill">Cuenta de la mesa hoy: <b>${o.bill}</b></p>${items(o.items, true)}</div>
<div class="st-order__foot">${btn}</div></article></li>`;
};

const readyCard = (o) =>
  `<li><article class="st-order" data-status="ready" aria-labelledby="r-${slug(o.table)}">${newTag(o)}
<div class="st-order__head"><h3 class="st-order__table" id="r-${slug(o.table)}">${o.table}</h3><span class="st-order__time">${icon("Clock")}${o.time}</span></div>
<div class="st-order__body"><p class="st-order__bill">Cuenta de la mesa hoy: <b>${o.bill}</b></p>${items(o.items, false)}</div>
<div class="st-order__foot"><button type="button" class="adm-btn adm-btn--primary st-act" aria-label="Entregado, ${o.table}">${icon("Check")}Entregado</button></div></article></li>`;

const callRow = (c) =>
  `<li class="st-call"><span class="st-call__bell" aria-hidden="true">${icon("BellRing")}</span>
<div class="st-call__text"><h3 class="st-call__table">${c.table}</h3><p class="st-call__why">${c.why} · ${c.time}</p>${
    c.bill ? `<p class="st-call__bill">Cuenta de hoy: <b>${c.bill}</b></p>` : ""
  }</div>
<button type="button" class="adm-btn st-act" aria-label="Atendido, ${c.table}">${icon("Check")}Atendido</button></li>`;

const tableTile = ([name, st]) =>
  `<li class="st-table" data-state="${st}"><p class="st-table__name">${name}</p><span class="st-table__state">${icon(TABLE_STATE[st].icon)}${TABLE_STATE[st].label}</span></li>`;

const tablesSection = (tables) =>
  `<section class="st-section" aria-labelledby="h-mesas"><h2 class="st-h2" id="h-mesas">Mesas</h2>${
    tables.length ? `<ul class="st-tables">${tables.map(tableTile).join("")}</ul>` : `<div class="st-empty st-empty--small"><p class="st-empty__text">Todavía no hay mesas.</p></div>`
  }</section>`;

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-");

const doc = (name, body, { tema } = {}) => `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${name} | Maqueta de Cocina y Salón de MenuSky (propuesta)</title>
<link rel="stylesheet" href="../../admin/maquetas/fuentes.css">
<link rel="stylesheet" href="../../../../app/brand.css">
<link rel="stylesheet" href="../../../../app/admin/admin.css">
<link rel="stylesheet" href="staff.css">
</head>
<body>
<!-- MAQUETA ESTÁTICA (fase cocina-salon). No es la app: es una propuesta para el Director. -->
<div class="ms-brand ms-admin st-root"${tema ? ` data-tema="${tema}"` : ""}>
${body}
</div>
</body>
</html>
`;

const shellPage = (opts, h1, content) => `<a href="#contenido" class="adm-skip">Saltar al contenido</a>
${head(opts)}
<main id="contenido" tabindex="-1" class="st-main"><div class="st-page">
${title(h1, opts.role)}
${content}
</div></main>`;

// ---------- Maquetas ----------
const kitchenBoard = `<ul class="st-orders" aria-label="Pedidos">${KITCHEN_ORDERS.map(kitchenCard).join("")}</ul>`;
const kitchenOpts = { role: "kitchen", active: "kitchen", pending: { kitchen: true } };

const pages = {
  "cocina.html": doc("Cocina", shellPage(kitchenOpts, "Cocina", kitchenBoard)),
  "cocina-oscuro.html": doc("Cocina (variante oscura)", shellPage(kitchenOpts, "Cocina", kitchenBoard), { tema: "oscuro" }),
  "cocina-vacia.html": doc(
    "Cocina sin pedidos",
    shellPage({ role: "kitchen", active: "kitchen" }, "Cocina", `<div class="st-empty">${POMO}<p class="st-empty__text">No hay pedidos pendientes.</p></div>`)
  ),
  "salon.html": doc(
    "Salón",
    shellPage(
      { role: "waiter", active: "floor", pending: { floor: true } },
      "Salón",
      `<div class="st-floor"><div class="st-floor__main">
<section class="st-section" aria-labelledby="h-llamados"><h2 class="st-h2" id="h-llamados">Llamados de mozo <span class="st-h2__count">· ${CALLS.length}</span></h2><ul class="st-calls">${CALLS.map(callRow).join("")}</ul></section>
<section class="st-section" aria-labelledby="h-listos"><h2 class="st-h2" id="h-listos">Listos para llevar <span class="st-h2__count">· ${READY.length}</span></h2><ul class="st-orders">${READY.map(readyCard).join("")}</ul></section>
</div><div class="st-floor__side">${tablesSection(TABLES)}</div></div>`
    )
  ),
  "salon-vacio.html": doc(
    "Salón sin llamados ni listos",
    shellPage(
      { role: "waiter", active: "floor" },
      "Salón",
      `<ul class="mq-cases" style="padding:0">
<li class="mq-case"><p class="mq-cap"><b>Sin llamados ni listos</b> como hoy (F-3): solo se ve "Mesas".</p><div class="st-page">${tablesSection(TABLES.map(([n], i) => [n, i % 4 === 1 ? "active" : "free"]))}</div></li>
<li class="mq-case"><p class="mq-cap"><b>Restaurante sin mesas</b> texto NUEVO (pregunta 9a de la spec).</p><div class="st-page">${tablesSection([]).replace('id="h-mesas"', 'id="h-mesas-0"').replace('aria-labelledby="h-mesas"', 'aria-labelledby="h-mesas-0"')}</div></li>
</ul>`
    )
  ),
  "shell.html": doc(
    "Encabezado y accesos",
    `<main class="st-main"><h1 class="sr-only">Encabezado de staff y pantallas sin permiso</h1><ul class="mq-cases">
<li class="mq-case"><p class="mq-cap"><b>Cocina</b> rol kitchen en /kitchen: solo "Cocina" (con pendientes)</p>${head({ role: "kitchen", active: "kitchen", pending: { kitchen: true } })}</li>
<li class="mq-case"><p class="mq-cap"><b>Mozo</b> rol waiter en /floor: solo "Salón"</p>${head({ role: "waiter", active: "floor" })}</li>
<li class="mq-case"><p class="mq-cap"><b>Admin</b> en /kitchen: Cocina, Salón (con pendientes) y Admin</p>${head({ role: "admin", active: "kitchen", pending: { floor: true } })}</li>
<li class="mq-case mq-case--menu"><p class="mq-cap"><b>Celular: menú de cuenta abierto</b> admin en /kitchen (mismo menú que el admin)</p>${head({ role: "admin", active: "kitchen", pending: { floor: true } })}${accountMenu({ role: "admin", active: "kitchen", pending: { floor: true } })}</li>
<li class="mq-case mq-case--menu"><p class="mq-cap"><b>Celular: menú de cuenta abierto</b> mozo</p>${head({ role: "waiter", active: "floor" })}${accountMenu({ role: "waiter", active: "floor" })}</li>
<li class="mq-case"><p class="mq-cap"><b>NoStaffAccess</b> cuenta sin fila en staff_users (textos literales)</p><div class="st-deny"><div class="st-deny__card"><span class="ms-logo-wrap">${LOGO}</span><span class="st-deny__icon" aria-hidden="true">${icon("Unlink")}</span><h2 class="st-deny__title">Tu cuenta no está vinculada a ningún restaurante</h2><p class="st-deny__text">Pedile al administrador que te agregue en la tabla <code>staff_users</code>.</p><button type="button" class="adm-btn">${icon("LogOut")}Cerrar sesión</button></div></div></li>
<li class="mq-case"><p class="mq-cap"><b>NotAdminAccess</b> mozo o cocina en /admin (textos literales)</p><div class="st-deny"><div class="st-deny__card"><span class="ms-logo-wrap">${LOGO}</span><span class="st-deny__icon" aria-hidden="true">${icon("ShieldAlert")}</span><h2 class="st-deny__title">Esta sección es solo para administradores</h2><p class="st-deny__text">Tu usuario no tiene el rol de admin. Pedile al administrador que te lo asigne si necesitás acceder acá.</p><button type="button" class="adm-btn">${icon("LogOut")}Cerrar sesión</button></div></div></li>
</ul></main>`
  ),
};

for (const [file, html] of Object.entries(pages)) {
  fs.writeFileSync(path.join(HERE, file), html);
  console.log(`escribí ${file} (${html.length} bytes)`);
}
