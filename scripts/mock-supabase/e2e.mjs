// Verificación de punta a punta de la app contra el Supabase simulado.
// Requiere: mock en MOCK_URL (def. http://127.0.0.1:3401) y la app compilada CON esa URL
// corriendo en APP_URL (def. http://127.0.0.1:3402). Ver README.md.
//   node scripts/mock-supabase/e2e.mjs
// Usa @supabase/ssr y @supabase/supabase-js de la app (no agrega dependencias).
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const MOCK = process.env.MOCK_URL || "http://127.0.0.1:3401";
const APP = process.env.APP_URL || "http://127.0.0.1:3402";
const ANON = "mock-anon-key";
const PASS = "demo-1234";
const QR = "mesa-1-demo0001";

let n = 0, bad = 0;
function check(name, ok, detail = "") {
  n++;
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mockPost = (path, body) =>
  fetch(MOCK + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) }).then((r) => r.json());

// Inicia sesión como lo hace el navegador y devuelve el header Cookie para la app.
async function login(email) {
  const jar = new Map();
  const supa = createServerClient(MOCK, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { data, error } = await supa.auth.signInWithPassword({ email, password: PASS });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "), token: data.session.access_token, userId: data.user.id };
}
const get = (path, cookie, opts = {}) => fetch(APP + path, { redirect: "manual", headers: cookie ? { cookie } : {}, ...opts });

await mockPost("/__mock/reset");

// ---- 1. Acceso sin sesión
{
  const r = await get("/admin/menu");
  check("sin sesión: /admin/menu -> 307 a /login?redirect=/admin/menu", r.status === 307 && (r.headers.get("location") || "").includes("/login?redirect=%2Fadmin%2Fmenu"), `${r.status} ${r.headers.get("location")}`);
}

// ---- 2. Admin: carta, mesas, tema, cocina, salón
const admin = await login("admin@demo.test");
for (const [path, needle] of [["/admin/menu", "Bife de chorizo"], ["/admin/mesas", "Mesa 1"], ["/admin/apariencia", "Apariencia"], ["/kitchen", "Cocina"], ["/floor", "Mesa 3"]]) {
  const r = await get(path, admin.cookie);
  const html = await r.text();
  check(`admin: ${path} -> 200 y contiene "${needle}"`, r.status === 200 && html.includes(needle), `${r.status}`);
}
{
  const r = await get("/admin/menu", admin.cookie);
  const html = await r.text();
  check("admin: /admin/menu muestra los platos de A y no los de B", html.includes("Provoleta") && !html.includes("Plato de B"));
}

// ---- 3. Pedido por la API (cliente anónimo) y verlo en cocina
const menu = await (await fetch(`${MOCK}/rest/v1/menu_items?select=id,name,price`, { headers: { apikey: ANON } })).json();
const idOf = (name) => menu.find((m) => m.name === name).id;
let orderId;
{
  const r = await fetch(`${APP}/api/orders`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ qrToken: QR, total: 1, status: "delivered", items: [{ menuItemId: idOf("Provoleta"), quantity: 2, choiceIds: [], note: "  bien dorada  " }] }),
  });
  const j = await r.json();
  orderId = j.orderId;
  check("POST /api/orders -> 200 { orderId }", r.status === 200 && typeof orderId === "string", `${r.status} ${JSON.stringify(j)}`);
}
{
  const state = await (await fetch(MOCK + "/__mock/state")).json();
  const o = state.orders.find((x) => x.id === orderId);
  check("total recalculado en servidor (2 x 5200 = 10400), campos extra ignorados, status received", o && o.total === 10400 && o.status === "received", JSON.stringify(o));
}
const cocina = await login("cocina@demo.test");
{
  const r = await get("/kitchen", cocina.cookie);
  const html = await r.text();
  check("cocina: /kitchen -> 200 y muestra el pedido nuevo (Provoleta, bien dorada)", r.status === 200 && html.includes("Provoleta") && html.includes("bien dorada"), `${r.status}`);
}

// ---- 4. Errores del contrato /api/orders
const post = (body) => fetch(`${APP}/api/orders`, { method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });
{
  const cases = [
    ["Body inválido -> 400", "no es json", 400, "Body inválido"],
    ["sin items -> 400 Faltan datos", { qrToken: QR, items: [] }, 400, "Faltan datos del pedido"],
    ["mesa inexistente -> 404", { qrToken: "nope", items: [{ menuItemId: idOf("Provoleta"), quantity: 1, choiceIds: [] }] }, 404, "Mesa no encontrada"],
    ["plato de otro restaurante -> 409", { qrToken: QR, items: [{ menuItemId: idOf("Plato de B"), quantity: 1, choiceIds: [] }] }, 409, "Uno de los platos ya no está disponible"],
    ["plato sin stock -> 409", { qrToken: QR, items: [{ menuItemId: idOf("Limonada (sin stock)"), quantity: 1, choiceIds: [] }] }, 409, "Uno de los platos ya no está disponible"],
    ["falta elegir guarnición -> 400", { qrToken: QR, items: [{ menuItemId: idOf("Bife de chorizo"), quantity: 1, choiceIds: [] }] }, 400, 'Falta elegir "Guarnición" en "Bife de chorizo"'],
    ["cantidad 100 -> 400", { qrToken: QR, items: [{ menuItemId: idOf("Provoleta"), quantity: 100, choiceIds: [] }] }, 400, "Faltan datos del pedido"],
  ];
  for (const [name, body, status, text] of cases) {
    const r = await post(body);
    const j = await r.json();
    check(`/api/orders ${name}`, r.status === status && j.error === text, `${r.status} ${JSON.stringify(j)}`);
  }
}

// ---- 5. "Tu pedido"
{
  const r = await get(`/m/${QR}/pedido/${orderId}`);
  const html = await r.text();
  check('"Tu pedido": 200, muestra Provoleta, nota y total', r.status === 200 && html.includes("Tu pedido") && html.includes("Provoleta") && html.includes("bien dorada"), `${r.status}`);
  const bad1 = await get(`/m/mesa-2-demo0002/pedido/${orderId}`);
  check('"Tu pedido" con el qr de OTRA mesa -> 404', bad1.status === 404, `${bad1.status}`);
  const bad2 = await get(`/m/${QR}/pedido/00000000-0000-4000-8000-000000000000`);
  check('"Tu pedido" con un id inexistente -> 404', bad2.status === 404, `${bad2.status}`);
  const bad3 = await get(`/m/${QR}/pedido/no-es-uuid`);
  check('"Tu pedido" con un id que no es uuid -> 404', bad3.status === 404, `${bad3.status}`);
}

// ---- 6. Roles (R-2)
const mozo = await login("mozo@demo.test");
{
  let r = await get("/kitchen", mozo.cookie);
  check("mozo: /kitchen -> 307 a /floor (sin contenido de cocina)", r.status === 307 && (r.headers.get("location") || "").endsWith("/floor"), `${r.status} ${r.headers.get("location")}`);
  r = await get("/floor", mozo.cookie);
  check("mozo: /floor -> 200", r.status === 200, `${r.status}`);
  r = await get("/floor", cocina.cookie);
  check("cocina: /floor -> 307 a /kitchen", r.status === 307 && (r.headers.get("location") || "").endsWith("/kitchen"), `${r.status} ${r.headers.get("location")}`);
  r = await get("/kitchen", cocina.cookie);
  check("cocina: /kitchen -> 200", r.status === 200);
  for (const p of ["/kitchen", "/floor"]) {
    r = await get(p, admin.cookie);
    check(`admin: ${p} -> 200 sin redirección`, r.status === 200, `${r.status}`);
  }
  r = await get("/admin", mozo.cookie);
  const html = await r.text();
  check("mozo: /admin no muestra el panel (NotAdminAccess)", r.status === 200 && !html.includes("Bife de chorizo") , `${r.status}`);
  const sin = await login("sinstaff@demo.test");
  r = await get("/kitchen", sin.cookie);
  const h2 = await r.text();
  check("autenticado sin staff: /kitchen no lee pedidos (no aparece Provoleta)", r.status === 200 && !h2.includes("Provoleta"), `${r.status}`);
}

// ---- 7. Permisos de datos vía REST con la sesión de cada rol
const rest = (token, path, init = {}) => fetch(`${MOCK}/rest/v1/${path}`, { ...init, headers: { apikey: ANON, authorization: `Bearer ${token || ANON}`, "content-type": "application/json", ...(init.headers || {}) } });
{
  let r = await rest(null, "orders?select=id");
  check("anónimo: GET orders -> []", (await r.json()).length === 0);
  r = await rest(null, "orders", { method: "POST", body: JSON.stringify({ table_id: "x", restaurant_id: "y", total: 1 }) });
  check("anónimo: insert directo en orders -> rechazado (401/403)", [401, 403].includes(r.status), `${r.status}`);
  r = await rest(mozo.token, `menu_items?id=eq.${idOf("Provoleta")}`, { method: "PATCH", body: JSON.stringify({ price: 0 }), headers: { Prefer: "return=representation" } });
  const rows = await r.json();
  check("mozo: cambiar precio de un plato -> 0 filas afectadas", Array.isArray(rows) && rows.length === 0, JSON.stringify(rows));
  r = await rest(admin.token, `menu_items?id=eq.${idOf("Provoleta")}`, { method: "PATCH", body: JSON.stringify({ price: 5300 }), headers: { Prefer: "return=representation" } });
  const rows2 = await r.json();
  check("admin: cambiar precio de un plato -> 1 fila", Array.isArray(rows2) && rows2.length === 1 && rows2[0].price === 5300, JSON.stringify(rows2));
  await rest(admin.token, `menu_items?id=eq.${idOf("Provoleta")}`, { method: "PATCH", body: JSON.stringify({ price: 5200 }) });
  const adminB = await login("admin-b@demo.test");
  r = await rest(adminB.token, `menu_items?id=eq.${idOf("Provoleta")}`, { method: "PATCH", body: JSON.stringify({ price: 1 }), headers: { Prefer: "return=representation" } });
  check("admin B: no edita platos de A", (await r.json()).length === 0);
  r = await rest(adminB.token, "orders?select=id,restaurant_id");
  const ob = await r.json();
  check("admin B: ve solo pedidos de B", ob.length === 1 && ob[0].restaurant_id === "22222222-2222-4222-8222-222222222222", JSON.stringify(ob));
  r = await rest(cocina.token, "orders?select=id&status=eq.received", {});
  check("cocina: lee pedidos de A", (await r.json()).length >= 2);
}

// ---- 8. Escritura de la carta desde el navegador (supabase-js como la app) + foto
{
  const supa = createClient(MOCK, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  await supa.auth.signInWithPassword({ email: "admin@demo.test", password: PASS });
  const cat = (await supa.from("categories").select("id").eq("name", "Entradas").single()).data;
  const { data: created, error } = await supa.from("menu_items").insert({ category_id: cat.id, name: "Nuevo plato", price: 0, sort_order: 9 }).select("id").single();
  check("admin (supabase-js): crear plato", !error && created?.id, error?.message);
  const up = await supa.from("menu_items").update({ name: "Plato editado", price: 4321, is_available: false }).eq("id", created.id);
  check("admin (supabase-js): editar plato", !up.error, up.error?.message);
  const png = new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" });
  const st = await supa.storage.from("menu-photos").upload(`${created.id}-1.png`, png, { upsert: true, contentType: "image/png" });
  check("admin (supabase-js): subir foto a menu-photos", !st.error, st.error?.message);
  const url = supa.storage.from("menu-photos").getPublicUrl(`${created.id}-1.png`).data.publicUrl;
  const img = await fetch(url);
  check("foto: URL pública 200 y content-type image/png", img.status === 200 && img.headers.get("content-type") === "image/png", `${img.status} ${img.headers.get("content-type")}`);
  const del = await supa.from("menu_items").delete().eq("id", created.id);
  check("admin (supabase-js): borrar plato", !del.error, del.error?.message);
  const order = await supa.from("menu_items").delete().eq("id", idOf("Provoleta"));
  check("admin: borrar un plato con pedidos -> error 23503 (restringe)", order.error?.code === "23503", JSON.stringify(order.error));

  const supaM = createClient(MOCK, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  await supaM.auth.signInWithPassword({ email: "mozo@demo.test", password: PASS });
  const up2 = await supaM.storage.from("menu-photos").upload("hack.png", png, { contentType: "image/png" });
  check("mozo: subir foto -> rechazado", !!up2.error, "se aceptó");
  const ins = await supaM.from("categories").insert({ restaurant_id: "11111111-1111-4111-8111-111111111111", name: "Hack" });
  check("mozo: crear categoría -> error de permisos", !!ins.error && ins.error.code === "42501", JSON.stringify(ins.error));
}

// ---- 9. Tiempo real y sondeo
{
  const supa = createClient(MOCK, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  await supa.auth.signInWithPassword({ email: "cocina@demo.test", password: PASS });
  const got = [];
  let subscribed = false;
  const ch = supa.channel("e2e-kitchen")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: "restaurant_id=eq.11111111-1111-4111-8111-111111111111" }, (p) => got.push(["insert", p.new.id]))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: "restaurant_id=eq.11111111-1111-4111-8111-111111111111" }, (p) => got.push(["update", p.new.id, p.new.status]))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "waiter_calls", filter: "restaurant_id=eq.11111111-1111-4111-8111-111111111111" }, (p) => got.push(["call", p.new.reason]))
    .subscribe((s) => { if (s === "SUBSCRIBED") subscribed = true; });
  const anon = createClient(MOCK, ANON, { auth: { persistSession: false } });
  const gotAnon = [];
  let anonSub = false;
  const chA = anon.channel("e2e-anon")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => gotAnon.push(p))
    .subscribe((s) => { if (s === "SUBSCRIBED") anonSub = true; });
  for (let i = 0; i < 50 && !(subscribed && anonSub); i++) await sleep(100);
  check("Realtime: canal de staff y canal anónimo SUBSCRIBED", subscribed && anonSub, `staff=${subscribed} anon=${anonSub}`);

  const ev = await mockPost("/__mock/event", { type: "new_order", table: "Mesa 2", items: [{ name: "Agua mineral 500ml", quantity: 1 }] });
  await sleep(400);
  check("Realtime: pedido nuevo llega al staff por postgres_changes", got.some((g) => g[0] === "insert" && g[1] === ev.orderId), JSON.stringify(got));
  await mockPost("/__mock/event", { type: "waiter_call", table: "Mesa 1", reason: "consulta" });
  await sleep(300);
  check("Realtime: llamado de mozo llega al staff", got.some((g) => g[0] === "call" && g[1] === "consulta"), JSON.stringify(got));
  check("Realtime: el anónimo NO recibe eventos de orders (RLS)", gotAnon.length === 0, `recibió ${gotAnon.length}`);

  // Sondeo del cliente: get_public_order_status por RPC
  const st1 = await anon.rpc("get_public_order_status", { p_qr_token: "mesa-2-demo0002", p_order_id: ev.orderId });
  check("sondeo: get_public_order_status = received", st1.data === "received", JSON.stringify(st1));
  const t0 = Date.now();
  await mockPost("/__mock/event", { type: "order_status", orderId: ev.orderId, status: "in_kitchen" });
  const st2 = await anon.rpc("get_public_order_status", { p_qr_token: "mesa-2-demo0002", p_order_id: ev.orderId });
  check(`sondeo: tras el cambio el RPC devuelve in_kitchen (${Date.now() - t0} ms)`, st2.data === "in_kitchen", JSON.stringify(st2));
  await sleep(300);
  check("Realtime: el cambio de estado llega al staff", got.some((g) => g[0] === "update" && g[1] === ev.orderId && g[2] === "in_kitchen"), JSON.stringify(got));
  const stX = await anon.rpc("get_public_order_status", { p_qr_token: "mesa-1-demo0001", p_order_id: ev.orderId });
  check("sondeo: token de otra mesa -> null", stX.data === null, JSON.stringify(stX));
  await supa.removeChannel(ch);
  await anon.removeChannel(chA);
  supa.realtime.disconnect();
  anon.realtime.disconnect();
}

// ---- 10. Llamado al mozo (no cambia)
{
  const r = await fetch(`${APP}/api/waiter-calls`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ qrToken: QR, reason: "cuenta" }) });
  check("POST /api/waiter-calls -> 2xx", r.status >= 200 && r.status < 300, `${r.status}`);
}

console.log(`\n${n - bad}/${n} OK`);
process.exit(bad ? 1 : 0);
