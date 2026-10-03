#!/usr/bin/env node
// Supabase SIMULADO para pruebas locales de MenuSky (herramienta de desarrollo).
// La app NUNCA importa este archivo. Sin dependencias: solo Node (>= 20).
//
//   node scripts/mock-supabase/server.mjs --port 3401
//
// Escucha SOLO en 127.0.0.1. Todos los datos y usuarios son FICTICIOS y viven en
// memoria (se pierden al parar el proceso). Ver README.md.
//
// Qué simula (lo que usa la app): PostgREST (/rest/v1/<tabla> y /rpc/<fn>), Auth por
// contraseña (/auth/v1), Storage del bucket menu-photos (/storage/v1) y Realtime
// postgres_changes (/realtime/v1/websocket, protocolo Phoenix v2). Los permisos por
// rol imitan la migración 0004 en lo que la app ejercita. La verificación de RLS de
// verdad es supabase/tests/rls/.
import http from "node:http";
import crypto from "node:crypto";

const HOST = "127.0.0.1";
const argPort = process.argv.indexOf("--port");
const PORT = Number(argPort > -1 ? process.argv[argPort + 1] : process.env.MOCK_SUPABASE_PORT || 3401);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error("Puerto inválido");
  process.exit(1);
}

// MOCK_LEGACY=1: imita la base ANTES de la migración 0004 (políticas de 0001, sin las
// funciones RPC). Sirve para probar el fallback TEMP-COMPAT-0004 del código nuevo.
const LEGACY = process.env.MOCK_LEGACY === "1";
const JWT_SECRET = "mock-jwt-secret-no-es-real";
export const MOCK_PASSWORD = "demo-1234";

// ------------------------------------------------------------------ utilidades
const uuid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();
const clone = (x) => JSON.parse(JSON.stringify(x));
const b64u = (buf) => Buffer.from(buf).toString("base64url");

function signJwt(payload) {
  const h = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64u(JSON.stringify(payload));
  const s = crypto.createHmac("sha256", JWT_SECRET).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
}
function verifyJwt(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const expect = crypto.createHmac("sha256", JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest("base64url");
  if (expect !== parts[2]) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

class PgError extends Error {
  constructor(status, code, message, details = null, hint = null) {
    super(message);
    this.status = status;
    this.body = { code, details, hint, message };
  }
}

// -------------------------------------------------------------------- esquema
// fks: columna -> [tabla destino, "cascade" | "restrict"]
const SCHEMA = {
  restaurants: {
    cols: ["id", "name", "logo_url", "phone", "address", "created_at", "theme"],
    required: ["name"],
    defaults: () => ({ logo_url: null, phone: null, address: null, theme: null, created_at: nowIso() }),
    fks: {},
  },
  tables: {
    cols: ["id", "restaurant_id", "label", "qr_token", "created_at"],
    required: ["restaurant_id", "label", "qr_token"],
    defaults: () => ({ created_at: nowIso() }),
    fks: { restaurant_id: ["restaurants", "cascade"] },
    unique: ["qr_token"],
  },
  categories: {
    cols: ["id", "restaurant_id", "name", "sort_order", "created_at"],
    required: ["restaurant_id", "name"],
    defaults: () => ({ sort_order: 0, created_at: nowIso() }),
    fks: { restaurant_id: ["restaurants", "cascade"] },
  },
  menu_items: {
    cols: ["id", "category_id", "name", "description", "price", "photo_url", "is_available", "sort_order", "created_at"],
    required: ["category_id", "name", "price"],
    defaults: () => ({ description: null, photo_url: null, is_available: true, sort_order: 0, created_at: nowIso() }),
    fks: { category_id: ["categories", "cascade"] },
  },
  item_option_groups: {
    cols: ["id", "menu_item_id", "name", "selection_type", "is_required", "sort_order"],
    required: ["menu_item_id", "name", "selection_type"],
    defaults: () => ({ is_required: false, sort_order: 0 }),
    fks: { menu_item_id: ["menu_items", "cascade"] },
    check: (r) => ["single", "multiple"].includes(r.selection_type),
  },
  item_option_choices: {
    cols: ["id", "option_group_id", "name", "extra_price", "sort_order"],
    required: ["option_group_id", "name"],
    defaults: () => ({ extra_price: 0, sort_order: 0 }),
    fks: { option_group_id: ["item_option_groups", "cascade"] },
  },
  staff_users: {
    cols: ["id", "restaurant_id", "auth_user_id", "name", "role", "created_at"],
    required: ["restaurant_id", "auth_user_id", "name", "role"],
    defaults: () => ({ created_at: nowIso() }),
    fks: { restaurant_id: ["restaurants", "cascade"] },
    check: (r) => ["admin", "waiter", "kitchen"].includes(r.role),
  },
  orders: {
    cols: ["id", "table_id", "restaurant_id", "status", "total", "created_at", "updated_at"],
    required: ["table_id", "restaurant_id"],
    defaults: () => ({ status: "received", total: 0, created_at: nowIso(), updated_at: nowIso() }),
    fks: { table_id: ["tables", "cascade"], restaurant_id: ["restaurants", "cascade"] },
    check: (r) => ["received", "in_kitchen", "ready", "delivered", "cancelled"].includes(r.status),
  },
  order_items: {
    cols: ["id", "order_id", "menu_item_id", "quantity", "selected_options", "note", "subtotal"],
    required: ["order_id", "menu_item_id", "subtotal"],
    defaults: () => ({ quantity: 1, selected_options: [], note: null }),
    fks: { order_id: ["orders", "cascade"], menu_item_id: ["menu_items", "restrict"] },
  },
  waiter_calls: {
    cols: ["id", "table_id", "restaurant_id", "status", "reason", "created_at", "attended_at"],
    required: ["table_id", "restaurant_id"],
    defaults: () => ({ status: "pending", reason: null, created_at: nowIso(), attended_at: null }),
    fks: { table_id: ["tables", "cascade"], restaurant_id: ["restaurants", "cascade"] },
    check: (r) => ["pending", "attended"].includes(r.status),
  },
};

// ---------------------------------------------------------------------- datos
const RID_A = "11111111-1111-4111-8111-111111111111";
const RID_B = "22222222-2222-4222-8222-222222222222";
const USERS = [
  { id: "aaaaaaaa-0000-4000-8000-000000000001", email: "admin@demo.test", name: "Admin Demo", role: "admin", restaurant: RID_A },
  { id: "aaaaaaaa-0000-4000-8000-000000000002", email: "mozo@demo.test", name: "Mozo Demo", role: "waiter", restaurant: RID_A },
  { id: "aaaaaaaa-0000-4000-8000-000000000003", email: "cocina@demo.test", name: "Cocina Demo", role: "kitchen", restaurant: RID_A },
  { id: "aaaaaaaa-0000-4000-8000-000000000004", email: "sinstaff@demo.test", name: "Sin Staff", role: null, restaurant: null },
  { id: "bbbbbbbb-0000-4000-8000-000000000001", email: "admin-b@demo.test", name: "Admin B Demo", role: "admin", restaurant: RID_B },
];

let db;
const storage = new Map(); // "menu-photos/<path>" -> { type, data }

function insertRaw(table, row) {
  const full = { id: uuid(), ...SCHEMA[table].defaults(), ...row };
  db[table].push(full);
  return full;
}

function seed() {
  db = Object.fromEntries(Object.keys(SCHEMA).map((t) => [t, []]));
  storage.clear();
  const min = (m) => new Date(Date.now() - m * 60000).toISOString();

  // Restaurante A: replica supabase/seed.sql ("El Buen Sabor")
  db.restaurants.push({ id: RID_A, ...SCHEMA.restaurants.defaults(), name: "El Buen Sabor", phone: "+54 11 5555-1234", address: "Av. Siempre Viva 742" });
  const tbl = {};
  for (const n of [1, 2, 3]) tbl[n] = insertRaw("tables", { restaurant_id: RID_A, label: `Mesa ${n}`, qr_token: `mesa-${n}-demo000${n}` });
  const catE = insertRaw("categories", { restaurant_id: RID_A, name: "Entradas", sort_order: 1 });
  const catP = insertRaw("categories", { restaurant_id: RID_A, name: "Platos principales", sort_order: 2 });
  const catB = insertRaw("categories", { restaurant_id: RID_A, name: "Bebidas", sort_order: 3 });
  const empanadas = insertRaw("menu_items", { category_id: catE.id, name: "Empanadas (x3)", description: "Carne cortada a cuchillo, jamón y queso, o verdura", price: 3800, sort_order: 1 });
  insertRaw("menu_items", { category_id: catE.id, name: "Provoleta", description: "Provolone a la parrilla con orégano y aceite de oliva", price: 5200, sort_order: 2 });
  const bife = insertRaw("menu_items", { category_id: catP.id, name: "Bife de chorizo", description: "300g con guarnición a elección", price: 12500, sort_order: 1 });
  const milanesa = insertRaw("menu_items", { category_id: catP.id, name: "Milanesa napolitana", description: "Con jamón, queso y salsa, guarnición a elección", price: 10800, sort_order: 2 });
  insertRaw("menu_items", { category_id: catP.id, name: "Ensalada César", description: "Lechuga, pollo grillado, panceta, parmesano y aderezo césar", price: 8900, sort_order: 3 });
  insertRaw("menu_items", { category_id: catB.id, name: "Gaseosa línea Coca-Cola 500ml", description: "Coca-Cola, Sprite o Fanta", price: 2500, sort_order: 1 });
  insertRaw("menu_items", { category_id: catB.id, name: "Agua mineral 500ml", description: "Con o sin gas", price: 2000, sort_order: 2 });
  // Un plato sin stock para ver el estado "Sin stock"
  insertRaw("menu_items", { category_id: catB.id, name: "Limonada (sin stock)", description: "Agotada hoy", price: 2200, sort_order: 3, is_available: false });
  const guarnicion = (item) => {
    const g = insertRaw("item_option_groups", { menu_item_id: item.id, name: "Guarnición", selection_type: "single", is_required: true, sort_order: 1 });
    ["Papas fritas", "Puré de papas", "Ensalada mixta"].forEach((name, i) => insertRaw("item_option_choices", { option_group_id: g.id, name, extra_price: 0, sort_order: i + 1 }));
  };
  guarnicion(bife);
  const punto = insertRaw("item_option_groups", { menu_item_id: bife.id, name: "Punto de cocción", selection_type: "single", is_required: true, sort_order: 2 });
  ["Jugoso", "A punto", "Bien cocido"].forEach((name, i) => insertRaw("item_option_choices", { option_group_id: punto.id, name, extra_price: 0, sort_order: i + 1 }));
  guarnicion(milanesa);
  const extras = insertRaw("item_option_groups", { menu_item_id: empanadas.id, name: "Extras", selection_type: "multiple", is_required: false, sort_order: 1 });
  insertRaw("item_option_choices", { option_group_id: extras.id, name: "Salsa criolla", extra_price: 500, sort_order: 1 });
  insertRaw("item_option_choices", { option_group_id: extras.id, name: "Ajíes en vinagre", extra_price: 300, sort_order: 2 });

  // Restaurante B (para aislamiento entre restaurantes)
  db.restaurants.push({ id: RID_B, ...SCHEMA.restaurants.defaults(), name: "La Esquina (B)" });
  const tB = insertRaw("tables", { restaurant_id: RID_B, label: "Mesa B1", qr_token: "mesa-b1-demo0001" });
  const cB = insertRaw("categories", { restaurant_id: RID_B, name: "Cartas B", sort_order: 1 });
  const iB = insertRaw("menu_items", { category_id: cB.id, name: "Plato de B", price: 1000, sort_order: 1 });

  // Staff
  for (const u of USERS) if (u.role) insertRaw("staff_users", { restaurant_id: u.restaurant, auth_user_id: u.id, name: u.name, role: u.role });

  // Pedidos y llamados de hoy (A) y un pedido de B
  const mkOrder = (table, status, minsAgo, lines) => {
    const total = lines.reduce((s, l) => s + l.subtotal, 0);
    const o = insertRaw("orders", { table_id: table.id, restaurant_id: table.restaurant_id, status, total, created_at: min(minsAgo), updated_at: min(minsAgo) });
    for (const l of lines) insertRaw("order_items", { order_id: o.id, ...l });
    return o;
  };
  mkOrder(tbl[1], "received", 3, [{ menu_item_id: empanadas.id, quantity: 1, subtotal: 3800, selected_options: [], note: "Sin cebolla" }]);
  mkOrder(tbl[2], "in_kitchen", 12, [
    { menu_item_id: milanesa.id, quantity: 2, subtotal: 21600, selected_options: [{ groupName: "Guarnición", choiceName: "Papas fritas", groupId: "x", choiceId: "x", extraPrice: 0 }], note: null },
  ]);
  mkOrder(tbl[3], "ready", 25, [{ menu_item_id: bife.id, quantity: 1, subtotal: 12500, selected_options: [], note: null }]);
  mkOrder(tbl[1], "delivered", 90, [{ menu_item_id: empanadas.id, quantity: 2, subtotal: 7600, selected_options: [], note: null }]);
  mkOrder(tbl[2], "cancelled", 60, [{ menu_item_id: bife.id, quantity: 1, subtotal: 12500, selected_options: [], note: null }]);
  mkOrder(tB, "received", 5, [{ menu_item_id: iB.id, quantity: 1, subtotal: 1000, selected_options: [], note: null }]);
  insertRaw("waiter_calls", { table_id: tbl[2].id, restaurant_id: RID_A, reason: "cuenta", created_at: min(1) });
}
seed();

// ------------------------------------------------------------------- permisos
function find(table, id) {
  return db[table].find((r) => r.id === id);
}
function restaurantOf(table, row) {
  switch (table) {
    case "restaurants": return row.id;
    case "categories": case "tables": case "orders": case "waiter_calls": case "staff_users": return row.restaurant_id;
    case "menu_items": return find("categories", row.category_id)?.restaurant_id;
    case "item_option_groups": { const m = find("menu_items", row.menu_item_id); return m && restaurantOf("menu_items", m); }
    case "item_option_choices": { const g = find("item_option_groups", row.option_group_id); return g && restaurantOf("item_option_groups", g); }
    case "order_items": return find("orders", row.order_id)?.restaurant_id;
    default: return undefined;
  }
}
const CARTA = new Set(["categories", "menu_items", "item_option_groups", "item_option_choices"]);

// ctx = { user: {id,email}|null, staff: {role, restaurant_id}|null }
function ctxFromToken(token) {
  const p = verifyJwt(token);
  if (!p || !p.sub) return { user: null, staff: null };
  const staff = db.staff_users.find((s) => s.auth_user_id === p.sub) || null;
  return { user: { id: p.sub, email: p.email }, staff };
}
function allowed(ctx, table, op, row) {
  const r = restaurantOf(table, row);
  const isStaff = !!ctx.staff && ctx.staff.restaurant_id === r && r !== undefined;
  const isAdmin = isStaff && ctx.staff.role === "admin";
  if (LEGACY) {
    if (CARTA.has(table)) return op === "select" ? true : isStaff;
    if (table === "orders") return op === "select" || op === "insert" ? true : op === "update" ? isStaff : false;
    if (table === "order_items") return op === "select" || op === "insert";
  }
  if (CARTA.has(table) || table === "tables") return op === "select" ? true : isAdmin;
  switch (table) {
    case "restaurants": return op === "select" ? true : op === "update" ? isAdmin : false;
    case "staff_users": return op === "select" ? row.auth_user_id === ctx.user?.id || isAdmin : isAdmin;
    case "orders": return op === "select" || op === "update" ? isStaff : false; // sin insert/delete para nadie
    case "order_items": return op === "select" ? isStaff : false;
    case "waiter_calls": return op === "insert" ? true : isStaff;
    default: return false;
  }
}
const rlsError = (ctx, table) =>
  new PgError(ctx.user ? 403 : 401, "42501", `new row violates row-level security policy for table "${table}"`);

// ------------------------------------------------------------------ PostgREST
function parseSelect(str) {
  let i = 0;
  function list() {
    const out = [];
    while (i < str.length) {
      while (/\s/.test(str[i] || "")) i++;
      if (str[i] === ")") break;
      let tok = "";
      while (i < str.length && !",()".includes(str[i])) tok += str[i++];
      tok = tok.trim();
      if (str[i] === "(") {
        i++;
        const children = list();
        if (str[i] === ")") i++;
        let name = tok, alias = null, inner = false;
        if (name.includes(":")) [alias, name] = name.split(":");
        if (name.includes("!")) {
          const [n, ...mods] = name.split("!");
          name = n;
          inner = mods.includes("inner");
        }
        out.push({ type: "embed", name, alias: alias || name, inner, children });
      } else if (tok) {
        out.push({ type: "col", name: tok.includes(":") ? tok.split(":")[1] : tok, alias: tok.includes(":") ? tok.split(":")[0] : tok });
      }
      while (/\s/.test(str[i] || "")) i++;
      if (str[i] === ",") i++;
    }
    return out;
  }
  return list();
}

const isDateStr = (v) => typeof v === "string" && /^\d{4}-\d\d-\d\dT/.test(v);
function cmp(a, b) {
  if (typeof a === "number") return a - Number(b);
  if (isDateStr(a) && isDateStr(String(b))) return Date.parse(a) - Date.parse(b);
  const sa = String(a), sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}
function matchOp(value, opExpr) {
  let neg = false;
  let e = opExpr;
  if (e.startsWith("not.")) { neg = true; e = e.slice(4); }
  const dot = e.indexOf(".");
  const op = e.slice(0, dot);
  const arg = e.slice(dot + 1);
  let res;
  switch (op) {
    case "eq": res = value !== null && value !== undefined && (typeof value === "number" ? Number(arg) === value : String(value) === arg); break;
    case "neq": res = !(value !== null && value !== undefined && (typeof value === "number" ? Number(arg) === value : String(value) === arg)); break;
    case "gt": res = value != null && cmp(value, arg) > 0; break;
    case "gte": res = value != null && cmp(value, arg) >= 0; break;
    case "lt": res = value != null && cmp(value, arg) < 0; break;
    case "lte": res = value != null && cmp(value, arg) <= 0; break;
    case "in": {
      const items = arg.replace(/^\(|\)$/g, "").split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
      res = value != null && items.includes(String(value));
      break;
    }
    case "is": res = arg === "null" ? value == null : arg === "true" ? value === true : arg === "false" ? value === false : false; break;
    case "like": case "ilike": {
      const re = new RegExp("^" + arg.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$", op === "ilike" ? "i" : "");
      res = value != null && re.test(String(value));
      break;
    }
    default: throw new PgError(400, "PGRST100", `operador no soportado por el mock: ${op}`);
  }
  return neg ? !res : res;
}

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
function parseFilters(searchParams) {
  const own = [], embedded = {};
  for (const [k, v] of searchParams) {
    if (RESERVED.has(k)) continue;
    if (k.includes(".")) {
      const [emb, col] = k.split(".");
      (embedded[emb] ||= []).push([col, v]);
    } else own.push([k, v]);
  }
  return { own, embedded };
}
const applyFilters = (rows, filters) => rows.filter((r) => filters.every(([col, expr]) => matchOp(r[col], expr)));

function relation(parentTable, name) {
  if (!SCHEMA[name]) throw new PgError(400, "PGRST200", `Could not find a relationship between '${parentTable}' and '${name}' in the schema cache`);
  for (const [col, [target]] of Object.entries(SCHEMA[parentTable].fks)) if (target === name) return { kind: "one", col };
  for (const [col, [target]] of Object.entries(SCHEMA[name].fks)) if (target === parentTable) return { kind: "many", col };
  throw new PgError(400, "PGRST200", `Could not find a relationship between '${parentTable}' and '${name}' in the schema cache`);
}

function project(table, rows, sel, ctx, embeddedFilters) {
  const out = [];
  for (const row of rows) {
    const o = {};
    let drop = false;
    for (const s of sel) {
      if (s.type === "col") {
        if (s.name === "*") Object.assign(o, clone(row));
        else {
          if (!SCHEMA[table].cols.includes(s.name)) throw new PgError(400, "42703", `column ${table}.${s.name} does not exist`);
          o[s.alias] = clone(row[s.name] ?? null);
        }
      } else {
        const rel = relation(table, s.name);
        const filters = embeddedFilters?.[s.name] || [];
        if (rel.kind === "one") {
          let child = find(s.name, row[rel.col]);
          if (child && !allowed(ctx, s.name, "select", child)) child = undefined;
          if (child && filters.length && !applyFilters([child], filters).length) child = undefined;
          if (!child && s.inner) { drop = true; break; }
          o[s.alias] = child ? project(s.name, [child], s.children, ctx)[0] : null;
        } else {
          let kids = db[s.name].filter((c) => c[rel.col] === row.id && allowed(ctx, s.name, "select", c));
          if (filters.length) kids = applyFilters(kids, filters);
          if (!kids.length && s.inner) { drop = true; break; }
          o[s.alias] = project(s.name, kids, s.children, ctx);
        }
      }
    }
    if (!drop) out.push(o);
  }
  return out;
}

function sortRows(rows, orderParam) {
  if (!orderParam) return rows;
  const keys = orderParam.split(",").map((p) => {
    const [col, dir] = p.split(".");
    return { col, desc: dir === "desc" };
  });
  return [...rows].sort((a, b) => {
    for (const { col, desc } of keys) {
      const x = a[col], y = b[col];
      if (x === y) continue;
      if (x == null) return 1;
      if (y == null) return -1;
      const c = cmp(x, y);
      if (c) return desc ? -c : c;
    }
    return 0;
  });
}

function validateRow(table, row, partial = false) {
  const sc = SCHEMA[table];
  for (const k of Object.keys(row)) {
    if (!sc.cols.includes(k)) throw new PgError(400, "PGRST204", `Could not find the '${k}' column of '${table}' in the schema cache`);
  }
  if (!partial) for (const k of sc.required) if (row[k] === undefined || row[k] === null) throw new PgError(400, "23502", `null value in column "${k}" of relation "${table}" violates not-null constraint`);
  if (partial) for (const k of sc.required) if (row[k] === null) throw new PgError(400, "23502", `null value in column "${k}" of relation "${table}" violates not-null constraint`);
  for (const [col, [target]] of Object.entries(sc.fks)) {
    if (row[col] !== undefined && !find(target, row[col])) throw new PgError(409, "23503", `insert or update on table "${table}" violates foreign key constraint`, `Key (${col})=(${row[col]}) is not present in table "${target}".`);
  }
  for (const col of sc.unique || []) {
    if (row[col] !== undefined && db[table].some((r) => r[col] === row[col] && r.id !== row.id)) throw new PgError(409, "23505", `duplicate key value violates unique constraint "${table}_${col}_key"`);
  }
  for (const col of ["id", "table_id", "restaurant_id", "category_id", "menu_item_id", "option_group_id", "order_id", "auth_user_id"]) {
    if (row[col] != null && sc.cols.includes(col) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(row[col]))) {
      throw new PgError(400, "22P02", `invalid input syntax for type uuid: "${row[col]}"`);
    }
  }
  if (sc.check && !sc.check(row)) throw new PgError(400, "23514", `new row for relation "${table}" violates check constraint`);
}

function cascadeDelete(table, row) {
  // Restricciones primero (order_items -> menu_items)
  for (const [child, sc] of Object.entries(SCHEMA)) {
    for (const [col, [target, mode]] of Object.entries(sc.fks)) {
      if (target === table && mode === "restrict" && db[child].some((c) => c[col] === row.id)) {
        throw new PgError(409, "23503", `update or delete on table "${table}" violates foreign key constraint on table "${child}"`, `Key (id)=(${row.id}) is still referenced from table "${child}".`);
      }
    }
  }
  // Y recursivamente las que dependen en cascada
  const check = (t, r) => {
    for (const [child, sc] of Object.entries(SCHEMA)) {
      for (const [col, [target, mode]] of Object.entries(sc.fks)) {
        if (target !== t) continue;
        for (const c of db[child].filter((x) => x[col] === r.id)) {
          if (mode === "restrict") throw new PgError(409, "23503", `update or delete on table "${t}" violates foreign key constraint on table "${child}"`, `Key (id)=(${r.id}) is still referenced from table "${child}".`);
          check(child, c);
        }
      }
    }
  };
  check(table, row);
  const doDelete = (t, r) => {
    for (const [child, sc] of Object.entries(SCHEMA)) {
      for (const [col, [target]] of Object.entries(sc.fks)) {
        if (target !== t) continue;
        for (const c of db[child].filter((x) => x[col] === r.id)) doDelete(child, c);
      }
    }
    db[t] = db[t].filter((x) => x.id !== r.id);
    emit(t, "DELETE", null, { id: r.id });
  };
  doDelete(table, row);
}

function handleRest(req, url, ctx, body) {
  const table = decodeURIComponent(url.pathname.slice("/rest/v1/".length));
  if (!SCHEMA[table]) throw new PgError(404, "42P01", `relation "public.${table}" does not exist`);
  const method = req.method;
  const prefer = String(req.headers.prefer || "");
  const wantRep = /return=representation/.test(prefer);
  const wantCount = /count=(exact|planned|estimated)/.test(prefer);
  const single = /vnd\.pgrst\.object\+json/.test(String(req.headers.accept || ""));
  const sel = parseSelect(url.searchParams.get("select") || "*");
  const { own, embedded } = parseFilters(url.searchParams);

  const respond = (rows, status, total) => {
    let payload = rows;
    if (single) {
      if (rows.length !== 1) throw new PgError(406, "PGRST116", "JSON object requested, multiple (or no) rows returned", `The result contains ${rows.length} rows`);
      payload = rows[0];
    }
    return { status, body: payload, headers: total !== undefined ? { "Content-Range": `${rows.length ? `0-${rows.length - 1}` : "*"}/${total}` } : {} };
  };

  if (method === "GET" || method === "HEAD") {
    let rows = db[table].filter((r) => allowed(ctx, table, "select", r));
    rows = applyFilters(rows, own);
    rows = sortRows(rows, url.searchParams.get("order"));
    const total = rows.length;
    const off = Number(url.searchParams.get("offset") || 0);
    const lim = url.searchParams.get("limit");
    rows = rows.slice(off, lim != null ? off + Number(lim) : undefined);
    const projected = project(table, rows, sel, ctx, embedded);
    const r = respond(projected, 200, wantCount ? total : undefined);
    if (method === "HEAD") return { status: 200, body: null, headers: r.headers };
    return r;
  }

  if (method === "POST") {
    const items = Array.isArray(body) ? body : [body];
    const created = [];
    for (const item of items) {
      if (!item || typeof item !== "object") throw new PgError(400, "PGRST102", "Invalid JSON body");
      const row = { id: uuid(), ...SCHEMA[table].defaults(), ...item };
      // Postgres evalúa el WITH CHECK de RLS antes que las claves foráneas.
      if (!allowed(ctx, table, "insert", row)) throw rlsError(ctx, table);
      validateRow(table, row);
      created.push(row);
    }
    for (const row of created) {
      db[table].push(row);
      emit(table, "INSERT", row, null);
    }
    if (!wantRep) return { status: 201, body: null, headers: {} };
    // RETURNING exige poder LEER la fila (igual que Postgres con RLS)
    const visible = created.filter((r) => allowed(ctx, table, "select", r));
    if (visible.length !== created.length) {
      for (const row of created) { db[table] = db[table].filter((x) => x.id !== row.id); }
      throw rlsError(ctx, table);
    }
    return respond(project(table, created, sel, ctx), 201);
  }

  if (method === "PATCH") {
    if (!body || typeof body !== "object") throw new PgError(400, "PGRST102", "Invalid JSON body");
    let rows = db[table].filter((r) => allowed(ctx, table, "select", r));
    rows = applyFilters(rows, own).filter((r) => allowed(ctx, table, "update", r));
    const updated = [];
    for (const row of rows) {
      const next = { ...row, ...body };
      if (table === "orders") next.updated_at = nowIso();
      validateRow(table, next, true);
      if (!allowed(ctx, table, "update", next)) throw rlsError(ctx, table);
      updated.push([row, next]);
    }
    const out = [];
    for (const [row, next] of updated) {
      Object.assign(row, next);
      out.push(row);
      emit(table, "UPDATE", row, { id: row.id });
    }
    if (!wantRep) return { status: 204, body: null, headers: {} };
    return respond(project(table, out, sel, ctx), 200);
  }

  if (method === "DELETE") {
    let rows = db[table].filter((r) => allowed(ctx, table, "select", r));
    rows = applyFilters(rows, own).filter((r) => allowed(ctx, table, "delete", r));
    const copy = clone(rows);
    for (const row of rows) cascadeDelete(table, row);
    if (!wantRep) return { status: 204, body: null, headers: {} };
    return respond(project(table, copy, sel, ctx), 200);
  }

  throw new PgError(405, "PGRST000", "Método no soportado");
}

// ------------------------------------------------------------------ RPC (0004)
const RATE_MAX = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const raise = (message, code = "P0001") => new PgError(400, code, message);

// Misma lógica que create_order de 0004_role_policies.sql (security definer).
function createOrder(qrToken, items) {
  if (!qrToken) throw raise("table_not_found", "P0002");
  const table = db.tables.find((t) => t.qr_token === qrToken);
  if (!table) throw raise("table_not_found", "P0002");
  // Límite de tasa de 0004 (SEC-AD-01): máx. RATE_MAX pedidos por mesa en RATE_WINDOW_MS (JS es de un solo hilo: sin carreras).
  if (db.orders.filter((o) => o.table_id === table.id && Date.parse(o.created_at) > Date.now() - RATE_WINDOW_MS).length >= RATE_MAX) throw raise("rate_limited", "P0429");
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw raise("invalid_items");

  let total = 0;
  const lines = [];
  for (const el of items) {
    if (!el || typeof el !== "object" || Array.isArray(el)) throw raise("invalid_items");
    if (typeof el.menu_item_id !== "string" || !UUID_RE.test(el.menu_item_id)) throw raise("invalid_items");
    if (typeof el.quantity !== "number" || !/^[0-9]{1,3}$/.test(String(el.quantity))) throw raise("invalid_items");
    const qty = el.quantity;
    if (qty < 1 || qty > 99) throw raise("invalid_items");
    const note = typeof el.note === "string" ? el.note.trim().slice(0, 500) || null : null;
    const choiceIds = new Set(Array.isArray(el.choice_ids) ? el.choice_ids.filter((c) => typeof c === "string" && UUID_RE.test(c)).slice(0, 200) : []);

    const item = find("menu_items", el.menu_item_id);
    const cat = item && find("categories", item.category_id);
    if (!item || !item.is_available || !cat || cat.restaurant_id !== table.restaurant_id) throw raise("item_unavailable");

    const opts = [];
    let extra = 0;
    const groups = db.item_option_groups.filter((g) => g.menu_item_id === item.id).sort((a, b) => a.sort_order - b.sort_order);
    for (const g of groups) {
      const chosen = db.item_option_choices.filter((c) => c.option_group_id === g.id && choiceIds.has(c.id)).sort((a, b) => a.sort_order - b.sort_order);
      if (g.is_required && chosen.length === 0) throw raise("missing_required");
      if (g.selection_type === "single" && chosen.length > 1) throw raise("single_choice_exceeded");
      for (const c of chosen) {
        opts.push({ groupId: g.id, groupName: g.name, choiceId: c.id, choiceName: c.name, extraPrice: c.extra_price });
        extra += c.extra_price;
      }
    }
    const subtotal = (item.price + extra) * qty;
    total += subtotal;
    lines.push({ menu_item_id: item.id, quantity: qty, selected_options: opts, note, subtotal });
  }
  const order = { id: uuid(), ...SCHEMA.orders.defaults(), table_id: table.id, restaurant_id: table.restaurant_id, total };
  db.orders.push(order);
  emit("orders", "INSERT", order, null);
  for (const l of lines) {
    const row = { id: uuid(), order_id: order.id, ...l };
    db.order_items.push(row);
    emit("order_items", "INSERT", row, null);
  }
  return order.id;
}

function getPublicOrder(qrToken, orderId) {
  const table = db.tables.find((t) => t.qr_token === qrToken);
  const order = table && typeof orderId === "string" ? db.orders.find((o) => o.id === orderId && o.table_id === table.id) : null;
  if (!order) return null;
  return {
    id: order.id,
    status: order.status,
    total: order.total,
    createdAt: order.created_at,
    items: db.order_items
      .filter((i) => i.order_id === order.id)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((i) => {
        const m = find("menu_items", i.menu_item_id);
        return { id: i.id, quantity: i.quantity, selectedOptions: i.selected_options, note: i.note, subtotal: i.subtotal, menuItemName: m?.name ?? null, photoUrl: m?.photo_url ?? null };
      }),
  };
}

function handleRpc(url, body) {
  const fn = url.pathname.slice("/rest/v1/rpc/".length);
  if (LEGACY) throw new PgError(404, "PGRST202", `Could not find the function public.${fn} in the schema cache`);
  switch (fn) {
    case "create_order": return { status: 200, body: createOrder(body?.p_qr_token, body?.p_items) };
    case "get_public_order": return { status: 200, body: getPublicOrder(body?.p_qr_token, body?.p_order_id) };
    case "get_public_order_status": return { status: 200, body: getPublicOrder(body?.p_qr_token, body?.p_order_id)?.status ?? null };
    default:
      throw new PgError(404, "PGRST202", `Could not find the function public.${fn} in the schema cache`);
  }
}

// ----------------------------------------------------------------------- Auth
function sessionFor(user) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const access = signJwt({ aud: "authenticated", exp, iat, sub: user.id, email: user.email, role: "authenticated", aal: "aal1", session_id: uuid() });
  return {
    access_token: access,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: exp,
    refresh_token: b64u(JSON.stringify({ sub: user.id, n: uuid() })),
    user: userJson(user),
  };
}
const userJson = (u) => ({
  id: u.id, aud: "authenticated", role: "authenticated", email: u.email, email_confirmed_at: "2026-01-01T00:00:00Z",
  phone: "", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [],
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", is_anonymous: false,
});
const authErr = (status, code, msg) => ({ status, body: { code: status, error_code: code, msg } });

function handleAuth(req, url, body) {
  const path = url.pathname.slice("/auth/v1".length);
  if (path === "/token" && req.method === "POST") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const u = USERS.find((x) => x.email === String(body?.email || "").toLowerCase());
      if (!u || body?.password !== MOCK_PASSWORD) {
        return { status: 400, body: { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" } };
      }
      return { status: 200, body: sessionFor(u) };
    }
    if (grant === "refresh_token") {
      try {
        const { sub } = JSON.parse(Buffer.from(String(body?.refresh_token), "base64url").toString());
        const u = USERS.find((x) => x.id === sub);
        if (u) return { status: 200, body: sessionFor(u) };
      } catch { /* cae al error */ }
      return authErr(400, "refresh_token_not_found", "Invalid Refresh Token: Refresh Token Not Found");
    }
    return authErr(400, "unsupported_grant_type", "unsupported grant_type");
  }
  if (path === "/user" && req.method === "GET") {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const p = verifyJwt(token);
    const u = p && USERS.find((x) => x.id === p.sub);
    if (!u) return authErr(401, "bad_jwt", "invalid JWT");
    return { status: 200, body: userJson(u) };
  }
  if (path === "/logout") return { status: 204, body: null };
  if (path === "/settings") return { status: 200, body: { external: { email: true }, disable_signup: true } };
  return authErr(404, "not_found", "Ruta de Auth no implementada en el mock");
}

// -------------------------------------------------------------------- Storage
function parseMultipart(buf, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!m) return null;
  const boundary = Buffer.from("--" + (m[1] || m[2]));
  const parts = [];
  let pos = buf.indexOf(boundary);
  while (pos !== -1) {
    const next = buf.indexOf(boundary, pos + boundary.length);
    if (next === -1) break;
    const part = buf.subarray(pos + boundary.length + 2, next - 2); // quita CRLF
    const headEnd = part.indexOf("\r\n\r\n");
    if (headEnd !== -1) {
      const headers = part.subarray(0, headEnd).toString();
      parts.push({ headers, data: part.subarray(headEnd + 4) });
    }
    pos = next;
  }
  const filePart = parts.find((p) => /filename=/i.test(p.headers)) || parts[parts.length - 1];
  if (!filePart) return null;
  const ct = /content-type:\s*([^\r\n]+)/i.exec(filePart.headers)?.[1]?.trim() || "application/octet-stream";
  return { type: ct, data: filePart.data };
}

function handleStorage(req, url, ctx, rawBody) {
  const path = url.pathname.slice("/storage/v1".length);
  const pub = /^\/object\/public\/([^/]+)\/(.+)$/.exec(path);
  if (pub && (req.method === "GET" || req.method === "HEAD")) {
    const f = storage.get(`${pub[1]}/${decodeURIComponent(pub[2])}`);
    if (!f) return { status: 404, body: { statusCode: "404", error: "not_found", message: "Object not found" } };
    return { status: 200, raw: f.data, headers: { "Content-Type": f.type, "Cache-Control": "public, max-age=60" } };
  }
  const up = /^\/object\/([^/]+)\/(.+)$/.exec(path);
  if (up && (req.method === "POST" || req.method === "PUT")) {
    if (up[1] !== "menu-photos") return { status: 404, body: { statusCode: "404", error: "Bucket not found", message: "Bucket not found" } };
    // Política 0003: solo admins suben/reemplazan fotos
    if (!ctx.staff || ctx.staff.role !== "admin") {
      return { status: 403, body: { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" } };
    }
    const key = `${up[1]}/${decodeURIComponent(up[2])}`;
    if (storage.has(key) && String(req.headers["x-upsert"]) !== "true" && req.method === "POST") {
      return { status: 400, body: { statusCode: "409", error: "Duplicate", message: "The resource already exists" } };
    }
    const mp = parseMultipart(rawBody, req.headers["content-type"]) || { type: req.headers["content-type"] || "application/octet-stream", data: rawBody };
    storage.set(key, mp);
    return { status: 200, body: { Id: uuid(), Key: key } };
  }
  return { status: 404, body: { statusCode: "404", error: "not_found", message: "Ruta de Storage no implementada en el mock" } };
}

// ------------------------------------------------------------------- Realtime
const sockets = new Set(); // { socket, subs: Map(topic -> {bindings, joinRef}), ctx }

function wsSend(sock, arr) {
  const data = Buffer.from(JSON.stringify(arr));
  let header;
  if (data.length < 126) header = Buffer.from([0x81, data.length]);
  else if (data.length < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(data.length, 2); }
  else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(data.length), 2); }
  if (!sock.destroyed) sock.write(Buffer.concat([header, data]));
}

function filterPass(record, filter) {
  if (!filter) return true;
  const m = /^([^=]+)=(\w+)\.(.*)$/.exec(filter);
  if (!m) return true;
  return matchOp(record?.[m[1]], `${m[2]}.${m[3]}`);
}

function emit(table, type, record, oldRecord) {
  const ts = nowIso();
  for (const c of sockets) {
    for (const [topic, sub] of c.subs) {
      for (const b of sub.bindings) {
        if (b.schema !== "public" || b.table !== table) continue;
        if (b.event !== "*" && b.event !== type) continue;
        if (!filterPass(record || oldRecord, b.filter)) continue;
        // RLS: orders/order_items/waiter_calls solo para staff del restaurante
        if (["orders", "order_items", "waiter_calls"].includes(table) && record && !allowed(c.ctx, table, "select", record)) continue;
        if (["orders", "order_items", "waiter_calls"].includes(table) && !record) {
          if (!c.ctx.staff) continue; // DELETE sin datos: solo se entrega a staff
        }
        wsSend(c.socket, [sub.joinRef, null, topic, "postgres_changes", {
          ids: [b.id],
          data: { schema: "public", table, commit_timestamp: ts, type, record: record ? clone(record) : {}, old_record: oldRecord || {}, columns: [], errors: null },
        }]);
      }
    }
  }
}

let bindingId = 1000;
function wsMessage(c, msg) {
  const [joinRef, ref, topic, event, payload] = msg;
  const reply = (response = {}, status = "ok") => wsSend(c.socket, [joinRef, ref, topic, "phx_reply", { status, response }]);
  switch (event) {
    case "heartbeat": return wsSend(c.socket, [null, ref, "phoenix", "phx_reply", { status: "ok", response: {} }]);
    case "phx_join": {
      if (payload?.access_token) c.ctx = ctxFromToken(payload.access_token);
      const wanted = payload?.config?.postgres_changes || [];
      const bindings = wanted.map((w) => ({ id: bindingId++, event: w.event, schema: w.schema, table: w.table, filter: w.filter }));
      c.subs.set(topic, { bindings, joinRef });
      reply({ postgres_changes: bindings.map((b) => ({ id: b.id, event: b.event, schema: b.schema, table: b.table, ...(b.filter ? { filter: b.filter } : {}) })) });
      if (bindings.length) {
        wsSend(c.socket, [joinRef, null, topic, "system", { message: "Subscribed to PostgreSQL", status: "ok", extension: "postgres_changes", channel: topic.replace(/^realtime:/, "") }]);
      }
      return;
    }
    case "access_token":
      if (payload?.access_token) c.ctx = ctxFromToken(payload.access_token);
      return reply();
    case "phx_leave":
      c.subs.delete(topic);
      return reply();
    default:
      return reply();
  }
}

function handleUpgrade(req, socket) {
  const url = new URL(req.url, `http://${HOST}`);
  if (url.pathname !== "/realtime/v1/websocket" || !req.headers["sec-websocket-key"]) {
    socket.end("HTTP/1.1 404 Not Found\r\n\r\n");
    return;
  }
  const accept = crypto.createHash("sha1").update(req.headers["sec-websocket-key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  const c = { socket, subs: new Map(), ctx: { user: null, staff: null } };
  sockets.add(c);
  let buf = Buffer.alloc(0);
  let fragments = [];
  socket.on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const fin = !!(buf[0] & 0x80);
      const op = buf[0] & 0x0f;
      const masked = !!(buf[1] & 0x80);
      let len = buf[1] & 0x7f;
      let off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const maskLen = masked ? 4 : 0;
      if (buf.length < off + maskLen + len) return;
      const mask = masked ? buf.subarray(off, off + 4) : null;
      const data = Buffer.from(buf.subarray(off + maskLen, off + maskLen + len));
      if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i % 4];
      buf = buf.subarray(off + maskLen + len);
      if (op === 8) { socket.end(Buffer.from([0x88, 0x00])); return; }
      if (op === 9) { socket.write(Buffer.concat([Buffer.from([0x8a, data.length]), data])); continue; }
      if (op === 1 || op === 0) {
        fragments.push(data);
        if (fin) {
          const text = Buffer.concat(fragments).toString();
          fragments = [];
          try { wsMessage(c, JSON.parse(text)); } catch { /* mensaje ilegible: se ignora */ }
        }
      }
    }
  });
  const drop = () => sockets.delete(c);
  socket.on("close", drop);
  socket.on("error", drop);
}

// ----------------------------------------------------------- control (/__mock)
function handleMock(req, url, body) {
  const path = url.pathname;
  if (path === "/__mock/reset" && req.method === "POST") {
    seed();
    return { status: 200, body: { ok: true, message: "Datos de prueba restaurados" } };
  }
  if (path === "/__mock/state" && req.method === "GET") {
    return { status: 200, body: { counts: Object.fromEntries(Object.entries(db).map(([k, v]) => [k, v.length])), tables: db.tables.map((t) => ({ id: t.id, label: t.label, qr_token: t.qr_token, restaurant_id: t.restaurant_id })), orders: db.orders.map((o) => ({ id: o.id, table_id: o.table_id, status: o.status, total: o.total })) } };
  }
  if (path === "/__mock/event" && req.method === "POST") {
    const t = (label) => db.tables.find((x) => x.label === label || x.id === label || x.qr_token === label);
    switch (body?.type) {
      case "new_order": {
        const table = t(body.table || "Mesa 1");
        if (!table) throw new PgError(404, "mock", "Mesa no encontrada");
        const items = body.items || [{ name: "Provoleta", quantity: 1 }];
        const lines = items.map((i) => {
          const m = db.menu_items.find((x) => x.name === i.name || x.id === i.menu_item_id);
          if (!m) throw new PgError(404, "mock", `Plato no encontrado: ${i.name}`);
          return { menu_item_id: m.id, quantity: i.quantity || 1, choice_ids: i.choice_ids || [], note: i.note ?? null };
        });
        return { status: 200, body: { orderId: createOrder(table.qr_token, lines) } };
      }
      case "order_status": {
        let o = body.orderId && find("orders", body.orderId);
        if (!o && body.table) {
          const tb = t(body.table);
          o = tb && [...db.orders].reverse().find((x) => x.table_id === tb.id && ["received", "in_kitchen", "ready"].includes(x.status));
        }
        if (!o) throw new PgError(404, "mock", "Pedido no encontrado");
        o.status = body.status;
        o.updated_at = nowIso();
        emit("orders", "UPDATE", o, { id: o.id });
        return { status: 200, body: { orderId: o.id, status: o.status } };
      }
      case "waiter_call": {
        const table = t(body.table || "Mesa 1");
        if (!table) throw new PgError(404, "mock", "Mesa no encontrada");
        const row = { id: uuid(), ...SCHEMA.waiter_calls.defaults(), table_id: table.id, restaurant_id: table.restaurant_id, reason: body.reason ?? "otro" };
        db.waiter_calls.push(row);
        emit("waiter_calls", "INSERT", row, null);
        return { status: 200, body: { callId: row.id } };
      }
      case "age_orders": {
        // Simula el paso del tiempo: retrasa created_at de los pedidos de una mesa (para el límite de tasa).
        const tb = t(body.table);
        if (!tb) throw new PgError(404, "mock", "Mesa no encontrada");
        const ms = (Number(body.minutes) || 11) * 60000;
        let k = 0;
        for (const o of db.orders) if (o.table_id === tb.id) { o.created_at = new Date(Date.parse(o.created_at) - ms).toISOString(); k++; }
        return { status: 200, body: { aged: k } };
      }
      case "attend_call": {
        const tb = body.table && t(body.table);
        const c = body.callId ? find("waiter_calls", body.callId) : db.waiter_calls.find((x) => x.status === "pending" && (!tb || x.table_id === tb.id));
        if (!c) throw new PgError(404, "mock", "Llamado no encontrado");
        c.status = "attended";
        c.attended_at = nowIso();
        emit("waiter_calls", "UPDATE", c, { id: c.id });
        return { status: 200, body: { callId: c.id } };
      }
      default:
        throw new PgError(400, "mock", "type debe ser new_order | order_status | waiter_call | attend_call | age_orders");
    }
  }
  return { status: 404, body: { error: "ruta de control desconocida" } };
}

// --------------------------------------------------------------------- server
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 20 * 1024 * 1024) { reject(new PgError(413, "mock", "Cuerpo demasiado grande")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "*";
  const cors = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": req.headers["access-control-request-headers"] || "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS",
    "Access-Control-Expose-Headers": "Content-Range, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); res.end(); return; }

  let status = 500, payload = null, extra = {}, raw = null;
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const rawBody = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) ? await readBody(req) : Buffer.alloc(0);
    const ct = String(req.headers["content-type"] || "");
    let body;
    if (rawBody.length && ct.includes("json")) {
      try { body = JSON.parse(rawBody.toString()); } catch { throw new PgError(400, "PGRST102", "Empty or invalid json"); }
    }
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const ctx = ctxFromToken(token);

    let r;
    if (url.pathname.startsWith("/rest/v1/rpc/")) r = handleRpc(url, body);
    else if (url.pathname.startsWith("/rest/v1/")) r = handleRest(req, url, ctx, body);
    else if (url.pathname.startsWith("/auth/v1/")) r = handleAuth(req, url, body);
    else if (url.pathname.startsWith("/storage/v1/")) r = handleStorage(req, url, ctx, rawBody);
    else if (url.pathname.startsWith("/__mock/")) r = handleMock(req, url, body);
    else if (url.pathname === "/" || url.pathname === "/health") r = { status: 200, body: { mock: "menusky-supabase", ok: true } };
    else r = { status: 404, body: { message: "Ruta desconocida en el mock" } };
    status = r.status; payload = r.body; extra = r.headers || {}; raw = r.raw ?? null;
  } catch (e) {
    if (e instanceof PgError) { status = e.status; payload = e.body; }
    else { status = 500; payload = { code: "XX000", message: "Error interno del mock", details: null, hint: null }; console.error("[mock] error interno:", e?.message); }
  }

  if (raw) { res.writeHead(status, { ...cors, ...extra, "Content-Length": raw.length }); res.end(req.method === "HEAD" ? undefined : raw); return; }
  if (payload === null || payload === undefined) {
    // PostgREST devuelve null JSON en los rpc que devuelven NULL
    if (status === 200) { res.writeHead(200, { ...cors, ...extra, "Content-Type": "application/json" }); res.end("null"); return; }
    res.writeHead(status, { ...cors, ...extra }); res.end(); return;
  }
  const text = JSON.stringify(payload);
  res.writeHead(status, { ...cors, ...extra, "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(text) });
  res.end(req.method === "HEAD" ? undefined : text);
  if (process.env.MOCK_LOG) console.log(`${req.method} ${req.url} -> ${status}`);
});
server.on("upgrade", handleUpgrade);
server.listen(PORT, HOST, () => {
  console.log(`[mock-supabase] escuchando en http://${HOST}:${PORT} (pid ${process.pid})`);
  console.log(`[mock-supabase] usuarios: ${USERS.map((u) => u.email).join(", ")}  contraseña: ${MOCK_PASSWORD}`);
});
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { server.close(); process.exit(0); });
