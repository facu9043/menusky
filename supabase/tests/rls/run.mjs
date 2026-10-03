// Prueba de politicas RLS (migracion 0004) sin base real.
// Postgres embebido (PGlite) + stubs minimos de Supabase. Ver README.md.
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const sql = (p) => readFileSync(join(root, p), "utf8");

const db = new PGlite({ extensions: { pgcrypto } });

// ---------------------------------------------------------------- utilidades
const results = [];
let failures = 0;
function record(id, actor, desc, ok, detail = "") {
  results.push({ id, actor, desc, ok });
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${id.padEnd(9)} ${actor.padEnd(13)} ${desc}${ok || !detail ? "" : "  -> " + detail}`);
}

const U = {
  adminA: "00000000-0000-4000-8000-0000000000a1",
  waiterA: "00000000-0000-4000-8000-0000000000a2",
  kitchenA: "00000000-0000-4000-8000-0000000000a3",
  adminB: "00000000-0000-4000-8000-0000000000b1",
  noStaff: "00000000-0000-4000-8000-0000000000c1",
};
const ACTORS = {
  anon: { role: "anon", uid: "" },
  noStaff: { role: "authenticated", uid: U.noStaff },
  waiterA: { role: "authenticated", uid: U.waiterA },
  kitchenA: { role: "authenticated", uid: U.kitchenA },
  adminA: { role: "authenticated", uid: U.adminA },
  adminB: { role: "authenticated", uid: U.adminB },
};

/** Ejecuta una consulta con el rol/usuario indicados. Nunca lanza: devuelve { rows, count, err }. */
async function as(actor, query, params = []) {
  const a = ACTORS[actor];
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [a.uid]);
  await db.query(`set role ${a.role}`);
  try {
    const r = await db.query(query, params);
    return { rows: r.rows, count: r.affectedRows ?? r.rows.length, err: null };
  } catch (e) {
    return { rows: [], count: 0, err: e };
  } finally {
    await db.query("reset role");
  }
}
const su = async (query, params = []) => (await db.query(query, params)).rows;
const denied = (r) => r.err ? /row-level security|permission denied/i.test(r.err.message) : r.count === 0;

// ------------------------------------------------------------ stubs de Supabase
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create publication supabase_realtime;
  grant usage on schema public, auth, storage to anon, authenticated;
  grant all on all tables in schema storage to anon, authenticated;
  -- Igual que Supabase: lo que se crea en public queda con grants a anon/authenticated
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`);
await db.query(`insert into auth.users (id, email) values ($1,'admin-a@test'),($2,'mozo-a@test'),($3,'cocina-a@test'),($4,'admin-b@test'),($5,'sinstaff@test')`,
  [U.adminA, U.waiterA, U.kitchenA, U.adminB, U.noStaff]);

// -------------------------------------------------------- 0001..0003 + seed + datos
for (const f of ["0001_init", "0002_restaurant_theme", "0003_menu_photos_storage"]) {
  await db.exec(sql(`supabase/migrations/${f}.sql`));
}
await db.exec(sql("supabase/seed.sql"));

const A = (await su(`select id from restaurants where name='El Buen Sabor'`))[0].id;
await db.query(`insert into restaurants (id, name) values ('00000000-0000-4000-8000-00000000bb00','Restaurante B')`);
const B = "00000000-0000-4000-8000-00000000bb00";
await db.exec(`
  insert into categories (id, restaurant_id, name) values ('00000000-0000-4000-8000-00000000bb01','${B}','Cat B');
  insert into menu_items (id, category_id, name, price) values ('00000000-0000-4000-8000-00000000bb02','00000000-0000-4000-8000-00000000bb01','Plato B',1000);
  insert into tables (id, restaurant_id, label, qr_token) values ('00000000-0000-4000-8000-00000000bb03','${B}','Mesa B1','mesa-b-token');
`);
await db.query(`insert into staff_users (restaurant_id, auth_user_id, name, role) values
  ($1,$2,'Admin A','admin'),($1,$3,'Mozo A','waiter'),($1,$4,'Cocina A','kitchen'),($5,$6,'Admin B','admin')`,
  [A, U.adminA, U.waiterA, U.kitchenA, B, U.adminB]);

const T = {
  catA: (await su(`select id from categories where restaurant_id=$1 and name='Entradas'`, [A]))[0].id,
  catB: "00000000-0000-4000-8000-00000000bb01",
  itemB: "00000000-0000-4000-8000-00000000bb02",
  tableA: (await su(`select id, qr_token from tables where restaurant_id=$1 order by label limit 1`, [A]))[0],
};
const item = async (name) => (await su(`select id from menu_items where name=$1`, [name]))[0].id;
const ITEM = {
  bife: await item("Bife de chorizo"),
  empanadas: await item("Empanadas (x3)"),
  provoleta: await item("Provoleta"),
  agua: await item("Agua mineral 500ml"),
};
const choice = async (name, group) =>
  (await su(`select c.id from item_option_choices c join item_option_groups g on g.id=c.option_group_id where c.name=$1 and ($2::text is null or g.name=$2)`, [name, group ?? null]))[0].id;
const CH = {
  papas: await choice("Papas fritas", "Guarnición"),
  pure: await choice("Puré de papas", "Guarnición"),
  jugoso: await choice("Jugoso", "Punto de cocción"),
  criolla: await choice("Salsa criolla"),
};
// Pedido y llamado de A, y pedido de B (creados por superusuario, como si ya existieran)
const orderA = (await su(`insert into orders (table_id, restaurant_id, total) values ($1,$2,3800) returning id`, [T.tableA.id, A]))[0].id;
await db.query(`insert into order_items (order_id, menu_item_id, quantity, subtotal, note) values ($1,$2,1,3800,'sin sal (nota privada)')`, [orderA, ITEM.empanadas]);
const orderB = (await su(`insert into orders (table_id, restaurant_id, total) values ('00000000-0000-4000-8000-00000000bb03',$1,1000) returning id`, [B]))[0].id;
await db.query(`insert into order_items (order_id, menu_item_id, quantity, subtotal) values ($1,$2,1,1000)`, [orderB, T.itemB]);
const callA = (await su(`insert into waiter_calls (table_id, restaurant_id, reason) values ($1,$2,'cuenta') returning id`, [T.tableA.id, A]))[0].id;

// ------------------------------------------------------------- CA-1.10 (antes)
const TABLES = ["restaurants", "tables", "categories", "menu_items", "item_option_groups", "item_option_choices", "staff_users", "orders", "order_items", "waiter_calls"];
async function counts() {
  const out = {};
  for (const t of TABLES) out[t] = Number((await su(`select count(*)::int as n from ${t}`))[0].n);
  return out;
}
const dump = async () => JSON.stringify(await Promise.all(
  ["categories", "menu_items", "item_option_groups", "item_option_choices", "orders", "order_items", "waiter_calls", "tables", "restaurants", "staff_users"]
    .map(async (t) => (await su(`select * from ${t} order by id`)))));
const before = await counts();
const dumpBefore = await dump();

const policies = async () => (await su(`select tablename, policyname, cmd from pg_policies where schemaname='public' order by tablename, policyname`));

console.log("=== Politicas ANTES de 0004 (0001) ===");
const polOld = await policies();
console.log(polOld.filter((p) => /orders|order_items|categories|menu_items|option/.test(p.tablename)).map((p) => `  ${p.tablename}: ${p.policyname} (${p.cmd})`).join("\n"));

// Linea base: antes de 0004 el anonimo si leia pedidos (documenta SEC-LG-07)
{
  const r = await as("anon", `select id from orders`);
  record("BASE-1", "anon", `ANTES de 0004: el anonimo lee pedidos (${r.rows.length} filas): SEC-LG-07 reproducido`, r.rows.length === 2);
  const w = await as("waiterA", `update menu_items set price = 0 where id = $1 returning id`, [ITEM.provoleta]);
  record("BASE-2", "waiterA", `ANTES de 0004: el mozo cambia un precio (${w.count} fila): SEC-LG-06 reproducido`, w.count === 1);
  await db.query(`update menu_items set price = 5200 where id = $1`, [ITEM.provoleta]);
}

// ---------------------------------------------------------------- aplicar 0004
const m4 = sql("supabase/migrations/0004_role_policies.sql");
await db.exec(m4);
await db.exec(m4); // idempotencia: segunda aplicacion sin error
record("CA-1.10", "superuser", "0004 se aplica dos veces sin error (idempotente)", true);

const after = await counts();
record("CA-1.10", "superuser", `conteo de filas por tabla igual antes y despues: ${JSON.stringify(after)}`, JSON.stringify(before) === JSON.stringify(after));
record("CA-1.10", "superuser", "contenido de todas las tablas identico antes y despues (volcado completo)", dumpBefore === (await dump()));

// ---------------------------------------------------------------- HU-1
const VICTIM = {
  cat: "00000000-0000-4000-8000-0000000000d1",
  item: "00000000-0000-4000-8000-0000000000d2",
  group: "00000000-0000-4000-8000-0000000000d3",
  choice: "00000000-0000-4000-8000-0000000000d4",
};
async function resetVictims() {
  await db.query(`delete from categories where id=$1`, [VICTIM.cat]);
  await db.query(`insert into categories (id, restaurant_id, name) values ($1,$2,'victima')`, [VICTIM.cat, A]);
  await db.query(`insert into menu_items (id, category_id, name, price) values ($1,$2,'victima',100)`, [VICTIM.item, VICTIM.cat]);
  await db.query(`insert into item_option_groups (id, menu_item_id, name, selection_type) values ($1,$2,'victima','single')`, [VICTIM.group, VICTIM.item]);
  await db.query(`insert into item_option_choices (id, option_group_id, name, extra_price) values ($1,$2,'victima',10)`, [VICTIM.choice, VICTIM.group]);
}
const menuSnapshot = async () => JSON.stringify(await Promise.all(
  ["categories", "menu_items", "item_option_groups", "item_option_choices"].map((t) => su(`select * from ${t} order by id`))));

// 12 operaciones (4 tablas x crear/modificar/borrar) sobre datos del restaurante A.
function ops12() {
  const n = () => crypto.randomUUID();
  return [
    ["categoria", "crear", `insert into categories (id, restaurant_id, name) values ('${n()}','${A}','nueva') returning id`],
    ["categoria", "modificar", `update categories set name='hackeada' where id='${VICTIM.cat}' returning id`],
    ["plato", "crear", `insert into menu_items (id, category_id, name, price) values ('${n()}','${T.catA}','nuevo',1) returning id`],
    ["plato", "modificar", `update menu_items set price=0 where id='${VICTIM.item}' returning id`],
    ["grupo", "crear", `insert into item_option_groups (id, menu_item_id, name, selection_type) values ('${n()}','${VICTIM.item}','nuevo','single') returning id`],
    ["grupo", "modificar", `update item_option_groups set name='hackeado' where id='${VICTIM.group}' returning id`],
    ["opcion", "crear", `insert into item_option_choices (id, option_group_id, name) values ('${n()}','${VICTIM.group}','nueva') returning id`],
    ["opcion", "modificar", `update item_option_choices set extra_price=0 where id='${VICTIM.choice}' returning id`],
    ["opcion", "borrar", `delete from item_option_choices where id='${VICTIM.choice}' returning id`],
    ["grupo", "borrar", `delete from item_option_groups where id='${VICTIM.group}' returning id`],
    ["plato", "borrar", `delete from menu_items where id='${VICTIM.item}' returning id`],
    ["categoria", "borrar", `delete from categories where id='${VICTIM.cat}' returning id`],
  ];
}

async function expectAll12Denied(id, actor, label) {
  await resetVictims();
  const snap = await menuSnapshot();
  let bad = [];
  for (const [t, op, q] of ops12()) {
    const r = await as(actor, q);
    if (!denied(r)) bad.push(`${op} ${t} (filas=${r.count})`);
  }
  record(id, actor, `${label}: las 12 operaciones sobre la carta de A rechazadas`, bad.length === 0, bad.join("; "));
  record(id, actor, `${label}: datos de la carta idénticos después`, snap === (await menuSnapshot()));
}

// CA-1.1 admin A: las 12 se aplican
{
  await resetVictims();
  let bad = [];
  for (const [t, op, q] of ops12()) {
    const r = await as("adminA", q);
    if (r.err || r.count !== 1) bad.push(`${op} ${t}: ${r.err ? r.err.message : "filas=" + r.count}`);
  }
  record("CA-1.1", "adminA", "las 12 operaciones (4 tipos x crear/modificar/borrar) se aplican", bad.length === 0, bad.join("; "));
  await resetVictims();
  const upd = await as("adminA", `update menu_items set price=777 where id='${VICTIM.item}' returning price`);
  record("CA-1.1", "adminA", "modificar precio: el valor queda guardado", Number(upd.rows[0]?.price) === 777);
}
await expectAll12Denied("CA-1.2", "waiterA", "waiter A");
await expectAll12Denied("CA-1.2", "kitchenA", "kitchen A");
await expectAll12Denied("CA-1.3", "anon", "anónimo");
await expectAll12Denied("CA-1.4", "noStaff", "autenticado sin staff");
await expectAll12Denied("CA-1.5", "adminB", "admin B sobre datos de A");

// CA-1.5 mover filas entre restaurantes (la condicion debe valer tambien para la fila nueva)
{
  await resetVictims();
  const snap = await menuSnapshot();
  const mueveA = await as("adminB", `update menu_items set category_id='${T.catB}' where id='${ITEM.provoleta}' returning id`);
  record("CA-1.5", "adminB", "mover un plato de A a una categoría de B (admin B): rechazado", denied(mueveA), mueveA.err?.message);
  const mueveB = await as("adminB", `update menu_items set category_id='${T.catA}' where id='${T.itemB}' returning id`);
  record("CA-1.5", "adminB", "mover un plato propio (B) a una categoría de A: rechazado (with check)", denied(mueveB), mueveB.err?.message);
  const crea = await as("adminB", `insert into menu_items (category_id, name, price) values ('${T.catA}','intruso',1) returning id`);
  record("CA-1.5", "adminB", "crear en A un plato apuntando a una categoría de A (admin B): rechazado", denied(crea));
  const mueveAA = await as("adminA", `update menu_items set category_id='${T.catB}' where id='${VICTIM.item}' returning id`);
  record("CA-1.5", "adminA", "admin A mueve un plato suyo a una categoría de B: rechazado (with check)", denied(mueveAA), mueveAA.err?.message);
  const catMove = await as("adminA", `update categories set restaurant_id='${B}' where id='${VICTIM.cat}' returning id`);
  record("CA-1.5", "adminA", "admin A mueve una categoría suya al restaurante B: rechazado (with check)", denied(catMove), catMove.err?.message);
  const grpMove = await as("adminA", `update item_option_groups set menu_item_id='${T.itemB}' where id='${VICTIM.group}' returning id`);
  record("CA-1.5", "adminA", "admin A mueve un grupo de opciones a un plato de B: rechazado", denied(grpMove), grpMove.err?.message);
  const choMove = await as("adminA", `update item_option_choices set option_group_id=(select id from item_option_groups where menu_item_id='${T.itemB}' limit 1) where id='${VICTIM.choice}' returning id`);
  record("CA-1.5", "adminA", "admin A mueve una opción a un grupo de B / sin destino: no se aplica", denied(choMove) || choMove.count === 0, choMove.err?.message);
  record("CA-1.5", "superuser", "los datos de la carta quedaron idénticos tras los intentos de mover", snap === (await menuSnapshot()));
}

// CA-1.6 lectura publica sin cambios
{
  await resetVictims();
  const exp = {};
  for (const t of ["categories", "menu_items", "item_option_groups", "item_option_choices", "restaurants", "tables"]) {
    exp[t] = Number((await su(`select count(*)::int n from ${t}`))[0].n);
  }
  for (const actor of Object.keys(ACTORS)) {
    let ok = true, det = [];
    for (const t of Object.keys(exp)) {
      const r = await as(actor, `select id from ${t}`);
      if (r.rows.length !== exp[t]) { ok = false; det.push(`${t}: ${r.rows.length}/${exp[t]}`); }
    }
    record("CA-1.6", actor, "lee todas las filas de carta, restaurantes y mesas (lectura pública)", ok, det.join(", "));
  }
}

// CA-1.8 waiter y kitchen siguen operando pedidos y llamados
for (const actor of ["waiterA", "kitchenA"]) {
  const o = await as(actor, `update orders set status='in_kitchen' where id=$1 returning status`, [orderA]);
  record("CA-1.8", actor, "cambia el estado de un pedido de A", o.count === 1 && o.rows[0].status === "in_kitchen", o.err?.message);
  const w = await as(actor, `update waiter_calls set status='attended', attended_at=now() where id=$1 returning status`, [callA]);
  record("CA-1.8", actor, "atiende un llamado de A", w.count === 1, w.err?.message);
  await db.query(`update orders set status='received' where id=$1`, [orderA]);
  await db.query(`update waiter_calls set status='pending', attended_at=null where id=$1`, [callA]);
}
// CA-1.9 (stub): politicas de Storage no cambiaron
{
  const pol = (await su(`select policyname from pg_policies where schemaname='storage' order by 1`)).map((r) => r.policyname);
  record("CA-1.9", "superuser", `políticas de Storage intactas (${pol.length}): ${pol.join(", ")} (lógica en stub; pendiente de confirmar en la base real)`, pol.length === 4);
  const up = await as("adminA", `insert into storage.objects (bucket_id, name) values ('menu-photos','a.png') returning id`);
  record("CA-1.9", "adminA", "admin sube objeto a menu-photos (stub)", up.count === 1, up.err?.message);
  const upW = await as("waiterA", `insert into storage.objects (bucket_id, name) values ('menu-photos','w.png') returning id`);
  record("CA-1.9", "waiterA", "mozo no sube a menu-photos (stub)", denied(upW));
  await db.query(`delete from storage.objects`);
}

// ---------------------------------------------------------------- HU-2
console.log("\n=== HU-2 ===");
// CA-2.1 anonimo y sin staff no leen pedidos
for (const actor of ["anon", "noStaff"]) {
  const a = await as(actor, `select * from orders`);
  const b = await as(actor, `select * from orders where id=$1`, [orderA]);
  const c = await as(actor, `select * from order_items`);
  const d = await as(actor, `select * from order_items where order_id=$1`, [orderA]);
  record(actor === "anon" ? "CA-2.1" : "CA-2.10", actor, "orders y order_items: 0 filas sin filtro y filtrando por el id de un pedido real", [a, b, c, d].every((r) => r.rows.length === 0 && !r.err),
    JSON.stringify([a, b, c, d].map((r) => r.rows.length)));
}
// CA-2.2 insertar directo: rechazado para todos (anon, sin staff y tambien staff)
for (const actor of ["anon", "noStaff", "waiterA", "kitchenA", "adminA", "adminB"]) {
  const n0 = (await counts());
  let bad = [];
  for (const total of [0, 1, 999999]) {
    const r = await as(actor, `insert into orders (table_id, restaurant_id, total) values ($1,$2,$3) returning id`, [T.tableA.id, A, total]);
    if (!denied(r) || r.rows.length) bad.push(`orders total=${total}`);
  }
  const r2 = await as(actor, `insert into order_items (order_id, menu_item_id, quantity, subtotal) values ($1,$2,1,0) returning id`, [orderA, ITEM.empanadas]);
  if (!denied(r2) || r2.rows.length) bad.push("order_items");
  const r3 = await as(actor, `insert into orders (table_id, restaurant_id, total) values ($1,$2,5) returning id`, ['00000000-0000-4000-8000-00000000bb03', B]);
  if (!denied(r3) || r3.rows.length) bad.push("orders en B");
  const n1 = await counts();
  record("CA-2.2", actor, "insert directo en orders/order_items (total 0, 1, 999999; restaurantes A y B): rechazado y sin filas nuevas", bad.length === 0 && JSON.stringify(n0) === JSON.stringify(n1), bad.join("; "));
}

// CA-2.4 create_order
const CALL = (actor, token, items) => as(actor, `select create_order($1, $2::jsonb) as id`, [token, JSON.stringify(items)]);
let newOrderId;
{
  const n0 = await counts();
  const r = await CALL("anon", T.tableA.qr_token, [
    { menu_item_id: ITEM.bife, quantity: 2, choice_ids: [CH.papas, CH.jugoso], note: "  sin sal  ", total: 1, status: "delivered", restaurant_id: B, subtotal: 1 },
    { menu_item_id: ITEM.empanadas, quantity: 1, choice_ids: [CH.criolla, "no-es-uuid", CH.pure], note: "   " },
  ]);
  record("CA-2.3", "anon", "create_order como anónimo devuelve un id", !r.err && !!r.rows[0]?.id, r.err?.message);
  newOrderId = r.rows[0]?.id;
  const o = (await su(`select * from orders where id=$1`, [newOrderId]))[0];
  record("CA-2.4", "anon", `total recalculado = 2*12500 + (3800+500) = 29300 (obtenido ${o?.total}); campos extra ignorados`, Number(o?.total) === 29300);
  record("CA-2.4", "anon", `status 'received', restaurante y mesa tomados del qr_token (no del cliente)`, o?.status === "received" && o.restaurant_id === A && o.table_id === T.tableA.id);
  const items = await su(`select * from order_items where order_id=$1 order by subtotal desc`, [newOrderId]);
  record("CA-2.4", "anon", "2 renglones; subtotales 25000 y 4300; nota recortada y vacía -> null", items.length === 2 && Number(items[0].subtotal) === 25000 && Number(items[1].subtotal) === 4300 && items[0].note === "sin sal" && items[1].note === null,
    JSON.stringify(items.map((i) => [i.subtotal, i.note])));
  const so = items[0].selected_options;
  record("CA-2.4", "anon", "selected_options con la forma {groupId, groupName, choiceId, choiceName, extraPrice}",
    Array.isArray(so) && so.length === 2 && ["groupId", "groupName", "choiceId", "choiceName", "extraPrice"].every((k) => k in so[0]) && so.some((x) => x.choiceName === "Papas fritas") && so.some((x) => x.choiceName === "Jugoso"), JSON.stringify(so));
  const so2 = items[1].selected_options;
  record("CA-2.4", "anon", "choice_ids que no son uuid o que no pertenecen al plato se ignoran (Puré no es de empanadas)", so2.length === 1 && so2[0].choiceName === "Salsa criolla" && Number(so2[0].extraPrice) === 500, JSON.stringify(so2));
  const n1 = await counts();
  record("CA-2.4", "anon", "se crearon exactamente 1 pedido y 2 renglones", n1.orders === n0.orders + 1 && n1.order_items === n0.order_items + 2);
}
// errores de create_order (cada uno sin dejar filas: atomicidad)
{
  const cases = [
    ["mesa inexistente", "no-existe", [{ menu_item_id: ITEM.agua, quantity: 1 }], "table_not_found", "P0002"],
    ["plato de otro restaurante (B) con token de A", T.tableA.qr_token, [{ menu_item_id: T.itemB, quantity: 1 }], "item_unavailable", "P0001"],
    ["plato inexistente", T.tableA.qr_token, [{ menu_item_id: crypto.randomUUID(), quantity: 1 }], "item_unavailable", "P0001"],
    ["grupo obligatorio sin elegir (Bife sin guarnición)", T.tableA.qr_token, [{ menu_item_id: ITEM.bife, quantity: 1, choice_ids: [CH.jugoso] }], "missing_required", "P0001"],
    ["grupo single con 2 (papas + puré)", T.tableA.qr_token, [{ menu_item_id: ITEM.bife, quantity: 1, choice_ids: [CH.papas, CH.pure, CH.jugoso] }], "single_choice_exceeded", "P0001"],
    ["cantidad 0", T.tableA.qr_token, [{ menu_item_id: ITEM.agua, quantity: 0 }], "invalid_items", "P0001"],
    ["cantidad 100", T.tableA.qr_token, [{ menu_item_id: ITEM.agua, quantity: 100 }], "invalid_items", "P0001"],
    ["cantidad 1.5", T.tableA.qr_token, [{ menu_item_id: ITEM.agua, quantity: 1.5 }], "invalid_items", "P0001"],
    ["cantidad negativa", T.tableA.qr_token, [{ menu_item_id: ITEM.agua, quantity: -1 }], "invalid_items", "P0001"],
    ["cantidad como texto", T.tableA.qr_token, [{ menu_item_id: ITEM.agua, quantity: "2" }], "invalid_items", "P0001"],
    ["menu_item_id no uuid", T.tableA.qr_token, [{ menu_item_id: "x", quantity: 1 }], "invalid_items", "P0001"],
    ["lista vacía", T.tableA.qr_token, [], "invalid_items", "P0001"],
    ["51 renglones", T.tableA.qr_token, Array.from({ length: 51 }, () => ({ menu_item_id: ITEM.agua, quantity: 1 })), "invalid_items", "P0001"],
    ["items no es lista", T.tableA.qr_token, { a: 1 }, "invalid_items", "P0001"],
    ["un renglón válido y otro inválido (atómico)", T.tableA.qr_token, [{ menu_item_id: ITEM.agua, quantity: 1 }, { menu_item_id: ITEM.agua, quantity: 0 }], "invalid_items", "P0001"],
  ];
  for (const [name, token, items, msg, code] of cases) {
    const n0 = await counts();
    const r = await CALL("anon", token, items);
    const n1 = await counts();
    record("CA-2.5", "anon", `create_order ${name}: '${msg}' (${code}), sin filas nuevas`, r.err?.message === msg && r.err?.code === code && JSON.stringify(n0) === JSON.stringify(n1), r.err ? `${r.err.code} ${r.err.message}` : "sin error");
  }
  // plato no disponible
  await db.query(`update menu_items set is_available=false where id=$1`, [ITEM.agua]);
  const r = await CALL("anon", T.tableA.qr_token, [{ menu_item_id: ITEM.agua, quantity: 1 }]);
  record("CA-2.5", "anon", "create_order plato is_available=false: 'item_unavailable'", r.err?.message === "item_unavailable");
  await db.query(`update menu_items set is_available=true where id=$1`, [ITEM.agua]);
  // nota de 600 caracteres -> 500
  const long = await CALL("anon", T.tableA.qr_token, [{ menu_item_id: ITEM.agua, quantity: 3, note: "x".repeat(600) }]);
  const it = (await su(`select note, subtotal from order_items where order_id=$1`, [long.rows[0]?.id]))[0];
  record("CA-2.4", "anon", "nota de 600 caracteres se recorta a 500; subtotal 3 x 2000", it?.note?.length === 500 && Number(it.subtotal) === 6000);
  // tambien lo puede llamar un autenticado
  const au = await CALL("noStaff", T.tableA.qr_token, [{ menu_item_id: ITEM.agua, quantity: 1 }]);
  record("CA-2.3", "noStaff", "create_order disponible para authenticated", !au.err);
}
// get_public_order / status
{
  const ok = await as("anon", `select get_public_order($1,$2) as o`, [T.tableA.qr_token, newOrderId]);
  const o = ok.rows[0]?.o;
  record("CA-2.6", "anon", "get_public_order con qr_token + id: devuelve el pedido con la forma del contrato", !!o && o.id === newOrderId && o.status === "received" && Number(o.total) === 29300 && typeof o.createdAt === "string" && o.items.length === 2 &&
    ["id", "quantity", "selectedOptions", "note", "subtotal", "menuItemName", "photoUrl"].every((k) => k in o.items[0]), JSON.stringify(o)?.slice(0, 200));
  record("CA-2.6", "anon", "renglones traen el nombre del plato", o?.items.some((i) => i.menuItemName === "Bife de chorizo"));
  const wrongTok = await as("anon", `select get_public_order($1,$2) as o`, ["mesa-b-token", newOrderId]);
  record("CA-2.6", "anon", "token de OTRA mesa + id válido: null (igual que 'no existe')", wrongTok.rows[0].o === null);
  const wrongId = await as("anon", `select get_public_order($1,$2) as o`, [T.tableA.qr_token, crypto.randomUUID()]);
  record("CA-2.6", "anon", "id inexistente: null", wrongId.rows[0].o === null);
  const noTok = await as("anon", `select get_public_order($1,$2) as o`, ["", newOrderId]);
  record("CA-2.6", "anon", "token vacío: null", noTok.rows[0].o === null);
  const st = await as("anon", `select get_public_order_status($1,$2) as s`, [T.tableA.qr_token, newOrderId]);
  record("CA-2.7", "anon", "get_public_order_status devuelve 'received'", st.rows[0].s === "received");
  const k = await as("kitchenA", `update orders set status='in_kitchen' where id=$1 returning id`, [newOrderId]);
  const st2 = await as("anon", `select get_public_order_status($1,$2) as s`, [T.tableA.qr_token, newOrderId]);
  record("CA-2.7", "anon", "tras el cambio de cocina el sondeo devuelve 'in_kitchen'", k.count === 1 && st2.rows[0].s === "in_kitchen");
  const st3 = await as("anon", `select get_public_order_status($1,$2) as s`, ["mesa-b-token", newOrderId]);
  record("CA-2.6", "anon", "status con token ajeno: null", st3.rows[0].s === null);
}
// privilegios y definicion de las funciones
{
  const f = await su(`select p.proname, p.prosecdef, p.proconfig, p.proacl::text as acl,
      has_function_privilege('anon', p.oid, 'execute') as anon_x, has_function_privilege('authenticated', p.oid, 'execute') as auth_x,
      (select count(*) from aclexplode(p.proacl) a where a.grantee = 0) as public_grants
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('create_order','get_public_order','get_public_order_status') order by 1`);
  record("SEC-LG-07", "superuser", "las 3 funciones existen", f.length === 3);
  record("SEC-LG-07", "superuser", "security definer y search_path fijo = public", f.every((x) => x.prosecdef && (x.proconfig ?? []).includes("search_path=public")), JSON.stringify(f.map((x) => x.proconfig)));
  record("SEC-LG-07", "superuser", "execute: anon y authenticated sí; PUBLIC no", f.every((x) => x.anon_x && x.auth_x && Number(x.public_grants) === 0), JSON.stringify(f.map((x) => x.acl)));
}

// CA-2.8 aislamiento entre restaurantes
{
  const ids = await su(`select id, restaurant_id from orders`);
  const idsA = ids.filter((o) => o.restaurant_id === A).map((o) => o.id).sort();
  const idsB = ids.filter((o) => o.restaurant_id === B).map((o) => o.id).sort();
  for (const actor of ["waiterA", "kitchenA", "adminA"]) {
    const r = await as(actor, `select id from orders order by id`);
    record("CA-2.8", actor, `ve los ${idsA.length} pedidos de A y ninguno de B`, JSON.stringify(r.rows.map((x) => x.id).sort()) === JSON.stringify(idsA), `${r.rows.length}`);
    const it = await as(actor, `select oi.id from order_items oi`);
    const expItems = Number((await su(`select count(*)::int n from order_items oi join orders o on o.id=oi.order_id where o.restaurant_id=$1`, [A]))[0].n);
    record("CA-2.8", actor, `order_items: ve solo los ${expItems} renglones de A`, it.rows.length === expItems, `${it.rows.length}`);
    const calls = await as(actor, `select id from waiter_calls`);
    record("CA-2.8", actor, "waiter_calls: ve los llamados de A", calls.rows.length === 1);
  }
  const rb = await as("adminB", `select id from orders`);
  record("CA-2.8", "adminB", `ve solo los ${idsB.length} pedidos de B`, JSON.stringify(rb.rows.map((x) => x.id).sort()) === JSON.stringify(idsB));
  const rbi = await as("adminB", `select oi.id from order_items oi where order_id=$1`, [orderA]);
  record("CA-2.8", "adminB", "no ve renglones de pedidos de A (ni con filtro por id)", rbi.rows.length === 0);
  const rba = await as("adminB", `select id from orders where id=$1`, [orderA]);
  record("CA-2.8", "adminB", "no ve un pedido de A pidiéndolo por id", rba.rows.length === 0);
  const upd = await as("adminB", `update orders set status='cancelled' where id=$1 returning id`, [orderA]);
  record("CA-2.8", "adminB", "no puede cambiar el estado de un pedido de A", denied(upd));
  const upd2 = await as("waiterA", `update orders set status='cancelled' where id=$1 returning id`, [orderB]);
  record("CA-2.8", "waiterA", "no puede cambiar el estado de un pedido de B", denied(upd2));
  const rc = await as("adminB", `select id from waiter_calls`);
  record("CA-2.8", "adminB", "no ve llamados de A", rc.rows.length === 0);
}
// CA-2.9
for (const actor of ["waiterA", "kitchenA", "adminA"]) {
  const u = await as(actor, `update orders set status='ready' where id=$1 returning status`, [orderA]);
  record("CA-2.9", actor, "cambia el estado de un pedido de A", u.count === 1 && u.rows[0].status === "ready", u.err?.message);
  await db.query(`update orders set status='received' where id=$1`, [orderA]);
}
{
  const u = await as("noStaff", `update orders set status='ready' where id=$1 returning id`, [orderA]);
  record("CA-2.9", "noStaff", "sin staff no cambia estados", denied(u));
  const u2 = await as("anon", `update orders set status='ready' where id=$1 returning id`, [orderA]);
  record("CA-2.9", "anon", "anónimo no cambia estados", denied(u2));
  // cambiar total/restaurante sigue limitado por with check al propio restaurante
  const mv = await as("waiterA", `update orders set restaurant_id=$2 where id=$1 returning id`, [orderA, B]);
  record("CA-2.9", "waiterA", "no puede mover un pedido a otro restaurante (with check)", denied(mv));
}
// CA-2.11: waiter_calls no cambia
{
  // Sin RETURNING: el anónimo nunca tuvo lectura de waiter_calls (igual que la ruta /api/waiter-calls).
  const w0 = Number((await su(`select count(*)::int n from waiter_calls`))[0].n);
  const ins = await as("anon", `insert into waiter_calls (table_id, restaurant_id, reason) values ($1,$2,'agua')`, [T.tableA.id, A]);
  const w1 = Number((await su(`select count(*)::int n from waiter_calls`))[0].n);
  record("CA-2.11", "anon", "el anónimo sigue creando llamados al mozo (waiter_calls no se tocó)", !ins.err && w1 === w0 + 1, ins.err?.message);
  const rd = await as("anon", `select id from waiter_calls`);
  record("CA-2.11", "anon", "el anónimo no lee llamados (igual que antes de 0004)", rd.rows.length === 0);
}
// tablas / restaurantes / staff_users sin cambios (RNF-S9): admin B no toca A
{
  const t = await as("adminB", `update tables set label='x' where restaurant_id=$1 returning id`, [A]);
  record("RNF-S9", "adminB", "admin B no modifica mesas de A", denied(t));
  const ta = await as("waiterA", `insert into tables (restaurant_id, label, qr_token) values ($1,'x','tok-x') returning id`, [A]);
  record("RNF-S9", "waiterA", "mozo no crea mesas", denied(ta));
}
{
  const pol = await policies();
  const names = (t) => pol.filter((p) => p.tablename === t).map((p) => p.policyname).sort().join(", ");
  console.log("\n=== Políticas DESPUÉS de 0004 ===");
  for (const t of ["categories", "menu_items", "item_option_groups", "item_option_choices", "orders", "order_items", "waiter_calls", "tables", "restaurants", "staff_users"]) console.log(`  ${t}: ${names(t)}`);
  const stale = ["staff manage categories", "staff manage menu_items", "staff manage option groups", "staff manage option choices", "public insert orders", "public insert order_items", "public read orders", "public read order_items"];
  record("1.1/1.2", "superuser", "las 8 políticas viejas ya no existen", stale.every((s) => !pol.some((p) => p.policyname === s)));
  record("1.1/1.2", "superuser", "waiter_calls/tables/restaurants/staff_users conservan sus políticas de 0001",
    names("waiter_calls") === polOld.filter((p) => p.tablename === "waiter_calls").map((p) => p.policyname).sort().join(", ") &&
    names("tables") === polOld.filter((p) => p.tablename === "tables").map((p) => p.policyname).sort().join(", ") &&
    names("restaurants") === polOld.filter((p) => p.tablename === "restaurants").map((p) => p.policyname).sort().join(", ") &&
    names("staff_users") === polOld.filter((p) => p.tablename === "staff_users").map((p) => p.policyname).sort().join(", "));
}

// ---------------------------------------------------------------- reversa
console.log("\n=== Reversa ===");
{
  const polNewState = JSON.stringify(await policies());
  const dumpPre = await dump();
  await db.exec(sql("supabase/rollback/0004_role_policies_down.sql"));
  const polAfterDown = await policies();
  record("REVERSA", "superuser", "la reversa restituye exactamente el conjunto de políticas de 0001", JSON.stringify(polAfterDown) === JSON.stringify(polOld), "");
  const fn = await su(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('create_order','get_public_order','get_public_order_status')`);
  record("REVERSA", "superuser", "la reversa borra las 3 funciones", fn[0].n === 0);
  record("REVERSA", "superuser", "la reversa no modifica filas", dumpPre === (await dump()));
  const r = await as("anon", `select id from orders`);
  record("REVERSA", "anon", `con la reversa el anónimo vuelve a leer pedidos (${r.rows.length}): estado de 0001`, r.rows.length > 0);
  const w = await as("waiterA", `update menu_items set price=1 where id=$1 returning id`, [ITEM.provoleta]);
  record("REVERSA", "waiterA", "con la reversa el mozo vuelve a poder editar la carta: estado de 0001", w.count === 1);
  await db.query(`update menu_items set price=5200 where id=$1`, [ITEM.provoleta]);
  const ins = await as("anon", `insert into orders (table_id, restaurant_id, total) values ($1,$2,1) returning id`, [T.tableA.id, A]);
  record("REVERSA", "anon", "con la reversa el anónimo vuelve a poder insertar pedidos: estado de 0001", ins.count === 1);
  await db.query(`delete from orders where id=$1`, [ins.rows[0].id]);
  // reaplicar 0004 deja el mismo estado que la primera vez
  await db.exec(m4);
  record("REVERSA", "superuser", "reaplicar 0004 después de la reversa deja las mismas políticas", JSON.stringify(await policies()) === polNewState);
  const r2 = await as("anon", `select id from orders`);
  record("REVERSA", "anon", "tras reaplicar, el anónimo vuelve a no leer pedidos", r2.rows.length === 0);
}

// ---------------------------------------------------------------- resumen
console.log("\n=== Resumen por actor ===");
const byActor = {};
for (const r of results) {
  byActor[r.actor] ??= { ok: 0, fail: 0 };
  byActor[r.actor][r.ok ? "ok" : "fail"]++;
}
for (const [a, v] of Object.entries(byActor)) console.log(`  ${a.padEnd(12)} OK=${String(v.ok).padStart(3)}  FALLAN=${v.fail}`);
console.log(`\nTOTAL: ${results.length - failures}/${results.length} OK`);
console.log(`
Pendiente de confirmar en la base real (no reproducible con PGlite):
  - Realtime con RLS (postgres_changes entrega solo eventos de filas que el rol puede leer).
  - Storage real (las 3 pruebas de menu-photos usan una tabla stub; solo prueban la lógica de las políticas).
  - Roles y grants por defecto reales de Supabase (acá se imitan con alter default privileges).
  - PostgREST: códigos HTTP de los errores de las funciones (PGRST202 si la función no existe).
`);
process.exit(failures ? 1 : 0);
