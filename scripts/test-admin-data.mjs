// Pruebas unitarias simples (sin dependencias nuevas) de:
//   - lib/time/today.ts  (todayRangeAR / isTodayAR: bordes del día en Argentina)
//   - lib/admin/live/derive.ts + lib/floor/tableStatus.ts  (CA-8.5, las 4 combinaciones)
// Uso: node scripts/test-admin-data.mjs
// Corre los casos de hoy con TZ del proceso = UTC, America/Argentina/Buenos_Aires,
// Asia/Tokyo y America/Los_Angeles (se relanza a sí mismo con cada TZ).
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ZONES = ["UTC", "America/Argentina/Buenos_Aires", "Asia/Tokyo", "America/Los_Angeles"];

if (!process.env.MS_TEST_CHILD) {
  let failed = 0;
  for (const tz of ZONES) {
    console.log(`\n##### TZ del proceso = ${tz}`);
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      env: { ...process.env, TZ: tz, MS_TEST_CHILD: "1" },
      stdio: "inherit",
    });
    if (r.status !== 0) failed++;
  }
  console.log(failed ? `\nRESULTADO: ${failed} zona(s) con fallas` : `\nRESULTADO: todo OK en ${ZONES.length} zonas`);
  process.exit(failed ? 1 : 0);
}

// ---- hijo: transpila los módulos TS a un directorio temporal y los importa
const require = createRequire(join(root, "package.json"));
const ts = require("typescript");
const out = mkdtempSync(join(tmpdir(), "ms-admin-test-"));
const done = new Set();

function build(rel) {
  if (done.has(rel)) return;
  done.add(rel);
  const src = readFileSync(join(root, rel + ".ts"), "utf8");
  let js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
  }).outputText;
  js = js.replace(/from\s+"@\/([^"]+)"/g, (_, p) => {
    build(p);
    const from = dirname(join(out, rel + ".mjs"));
    let r = relative(from, join(out, p + ".mjs")).replace(/\\/g, "/");
    if (!r.startsWith(".")) r = "./" + r;
    return `from "${r}"`;
  });
  const file = join(out, rel + ".mjs");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, js);
}
for (const m of ["lib/time/today", "lib/floor/tableStatus", "lib/admin/live/derive"]) build(m);
const load = (rel) => import(pathToFileURL(join(out, rel + ".mjs")).href);
const { todayRangeAR, isTodayAR } = await load("lib/time/today");
const { deriveTableStatus } = await load("lib/floor/tableStatus");
const { deriveAdminLive } = await load("lib/admin/live/derive");

let n = 0;
let bad = 0;
function eq(name, got, want) {
  n++;
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      obtenido: ${JSON.stringify(got)}\n      esperado: ${JSON.stringify(want)}`}`);
}
console.log(`process.env.TZ = ${process.env.TZ}; offset local de new Date(): ${new Date().getTimezoneOffset()} min`);

// ---------------------------------------------------------------- todayRangeAR
const D = (s) => new Date(s);
eq("23:59:59 AR del 2/10 (02:59:59Z del 3/10) pertenece al día 2/10",
  todayRangeAR(D("2026-10-03T02:59:59Z")), { startIso: "2026-10-02T03:00:00.000Z", endIso: "2026-10-03T03:00:00.000Z" });
eq("00:00:00 AR del 3/10 (03:00:00Z) abre el día 3/10",
  todayRangeAR(D("2026-10-03T03:00:00Z")), { startIso: "2026-10-03T03:00:00.000Z", endIso: "2026-10-04T03:00:00.000Z" });
eq("mediodía AR", todayRangeAR(D("2026-10-03T15:00:00Z")), { startIso: "2026-10-03T03:00:00.000Z", endIso: "2026-10-04T03:00:00.000Z" });
eq("fin de año (31/12 17:00 AR)", todayRangeAR(D("2026-12-31T20:00:00Z")), { startIso: "2026-12-31T03:00:00.000Z", endIso: "2027-01-01T03:00:00.000Z" });
eq("fin de mes (28/02/2027 AR)", todayRangeAR(D("2027-02-28T12:00:00Z")), { startIso: "2027-02-28T03:00:00.000Z", endIso: "2027-03-01T03:00:00.000Z" });
eq("año bisiesto (29/02/2028 AR)", todayRangeAR(D("2028-02-29T12:00:00Z")), { startIso: "2028-02-29T03:00:00.000Z", endIso: "2028-03-01T03:00:00.000Z" });

const NOW = D("2026-10-03T15:00:00Z"); // 12:00 AR del 3/10
eq("isTodayAR 23:59:59 AR de ayer = false", isTodayAR("2026-10-03T02:59:59Z", NOW), false);
eq("isTodayAR 00:00:00 AR de hoy = true", isTodayAR("2026-10-03T03:00:00Z", NOW), true);
eq("isTodayAR 23:59:59 AR de hoy = true", isTodayAR("2026-10-04T02:59:59Z", NOW), true);
eq("isTodayAR 00:00:00 AR de mañana = false", isTodayAR("2026-10-04T03:00:00Z", NOW), false);
eq("isTodayAR con offset en el ISO (-03:00)", isTodayAR("2026-10-03T00:00:00-03:00", NOW), true);
eq("isTodayAR fecha inválida = false", isTodayAR("no-es-fecha", NOW), false);
// El bug que se corrige (D-6): a las 22:00 AR el día UTC ya cambió, el de AR no.
eq("19:00 AR visto a las 22:00 AR sigue siendo hoy (UTC ya cambió de día)",
  isTodayAR("2026-10-03T22:00:00Z", D("2026-10-04T01:00:00Z")), true);

// CA-9.3: 5 de hoy (1 cancelado), 2 de ayer 23:50 AR, 1 de mañana 00:05 AR => 4
{
  const orders = [
    { at: "2026-10-03T14:00:00Z", status: "received" },
    { at: "2026-10-03T15:30:00Z", status: "in_kitchen" },
    { at: "2026-10-03T18:00:00Z", status: "delivered" },
    { at: "2026-10-04T02:59:59Z", status: "ready" }, // 23:59:59 AR de hoy
    { at: "2026-10-03T16:00:00Z", status: "cancelled" },
    { at: "2026-10-03T02:50:00Z", status: "delivered" }, // 23:50 AR de ayer
    { at: "2026-10-03T02:50:30Z", status: "delivered" },
    { at: "2026-10-04T03:05:00Z", status: "received" }, // 00:05 AR de mañana
  ];
  const count = orders.filter((o) => isTodayAR(o.at, NOW) && o.status !== "cancelled").length;
  eq("CA-9.3: el dato 'pedidos de hoy' da 4", count, 4);
}

// ---------------------------------------------------------------- derive / CA-8.5
// Regla inline original de FloorBoard (antes de extraerla), para comprobar que no cambió.
const oldFloor = (calling, ready, active) => (calling ? "calling" : ready ? "ready" : active ? "active" : "free");
{
  let same = true;
  for (let bits = 0; bits < 8; bits++) {
    const c = !!(bits & 1), r = !!(bits & 2), a = !!(bits & 4);
    const got = deriveTableStatus("t", {
      callingTableIds: new Set(c ? ["t"] : []),
      readyTableIds: new Set(r ? ["t"] : []),
      activeTableIds: new Set(a ? ["t"] : []),
    });
    if (got !== oldFloor(c, r, a)) same = false;
  }
  eq("deriveTableStatus == regla original de FloorBoard en las 8 combinaciones", same, true);
}

const tables = ["A", "B", "C", "D", "E", "F"].map((id) => ({ id, label: `Mesa ${id}`, qrToken: `tok-${id}` }));
const snap = deriveAdminLive({
  tables,
  activeOrders: [
    { tableId: "A", status: "ready" }, // llamando gana sobre listo
    { tableId: "B", status: "ready" },
    { tableId: "C", status: "received" },
    { tableId: "D", status: "in_kitchen" },
    { tableId: "D", status: "received" },
    { tableId: "F", status: "delivered" }, // no es activo
    { tableId: "F", status: "cancelled" },
  ],
  todayOrders: [
    { tableId: "A", status: "ready", total: 1000 },
    { tableId: "B", status: "ready", total: 2000 },
    { tableId: "C", status: "received", total: 500 },
    { tableId: "D", status: "in_kitchen", total: 700 },
    { tableId: "D", status: "received", total: 300 },
    { tableId: "F", status: "delivered", total: 400 },
    { tableId: "F", status: "cancelled", total: 9999 }, // no suma
  ],
  pendingCalls: [
    { tableId: "A", reason: "cuenta", createdAt: "2026-10-03T15:05:00Z" },
    { tableId: "A", reason: "consulta", createdAt: "2026-10-03T15:01:00Z" },
  ],
});
const st = Object.fromEntries(snap.tables.map((t) => [t.id, t.state]));
eq("CA-8.5 Llamando (aunque tenga pedido listo): A = calling", st.A, "calling");
eq("CA-8.5 Listo = occupied: B", st.B, "occupied");
eq("CA-8.5 Con pedido = occupied: C y D", [st.C, st.D], ["occupied", "occupied"]);
eq("CA-8.5 Libre: E (sin nada) y F (solo entregado/cancelado)", [st.E, st.F], ["free", "free"]);
eq("conteos: ocupadas (A,B,C,D) = 4, llamados = 2", [snap.occupiedTables, snap.pendingCalls], [4, 2]);
eq("llamado más antiguo de A = 'consulta'; pendientes de A = 2", [snap.tables[0].oldestCallReason, snap.tables[0].pendingCalls], ["consulta", 2]);
eq("pedidos activos por mesa: D = 2, B = 1, E = 0, F = 0", [snap.tables[3].activeOrders, snap.tables[1].activeOrders, snap.tables[4].activeOrders, snap.tables[5].activeOrders], [2, 1, 0, 0]);
eq("totales de hoy por mesa sin cancelados: D = 1000, F = 400", [snap.tables[3].todayTotal, snap.tables[5].todayTotal], [1000, 400]);
eq("ordersToday = 6 (sin el cancelado) y salesToday = 4900", [snap.ordersToday, snap.salesToday], [6, 4900]);
eq("sin datos: todo en cero", deriveAdminLive({ tables: [], activeOrders: [], todayOrders: [], pendingCalls: [] }),
  { tables: [], ordersToday: 0, salesToday: 0, pendingCalls: 0, occupiedTables: 0, kitchenPending: 0, floorPending: 0 });

// ---------------------------------------------------------------- kitchenPending / floorPending (D-20)
// Mismo criterio que useStaffPendingCounts: received (cocina); ready + llamados pending (salón); cualquier fecha.
// activeOrders no distingue fechas: los de días anteriores entran igual que los de hoy.
{
  const t3 = ["A", "B", "C"].map((id) => ({ id, label: `Mesa ${id}`, qrToken: `tok-${id}` }));
  const mk = (activeOrders, pendingCalls = [], todayOrders = []) =>
    deriveAdminLive({ tables: t3, activeOrders, todayOrders, pendingCalls });
  const pc = (s) => [s.kitchenPending, s.floorPending];
  const call = (tableId) => ({ tableId, reason: "cuenta", createdAt: "2026-10-03T15:00:00Z" });

  eq("pendientes: sin nada = [0,0]", pc(mk([])), [0, 0]);
  eq("pendientes: 1 received = cocina 1, salón 0", pc(mk([{ tableId: "A", status: "received" }])), [1, 0]);
  eq("pendientes: in_kitchen no cuenta en cocina ni en salón", pc(mk([{ tableId: "A", status: "in_kitchen" }])), [0, 0]);
  eq("pendientes: 1 ready = cocina 0, salón 1", pc(mk([{ tableId: "A", status: "ready" }])), [0, 1]);
  eq("pendientes: 1 llamado = cocina 0, salón 1", pc(mk([], [call("B")])), [0, 1]);
  eq("pendientes: ready + 2 llamados = salón 3", pc(mk([{ tableId: "A", status: "ready" }], [call("B"), call("B")])), [0, 3]);
  eq("pendientes: received/in_kitchen/ready en la misma mesa = [1,1]",
    pc(mk([{ tableId: "A", status: "received" }, { tableId: "A", status: "in_kitchen" }, { tableId: "A", status: "ready" }])), [1, 1]);
  // Pedidos de días anteriores (están en activeOrders pero NO en todayOrders): cuentan igual.
  {
    const s = mk(
      [{ tableId: "A", status: "received" }, { tableId: "B", status: "ready" }, { tableId: "C", status: "received" }],
      [],
      [{ tableId: "C", status: "received", total: 100 }] // solo C es de hoy
    );
    eq("pendientes: received/ready de días anteriores cuentan = [2,1] (hoy: solo 1 pedido)", [...pc(s), s.ordersToday], [2, 1, 1]);
  }
  eq("pendientes: cancelados y entregados no cuentan",
    pc(mk([{ tableId: "A", status: "cancelled" }, { tableId: "B", status: "delivered" }])), [0, 0]);
  eq("pendientes: cancelado de hoy no suma aunque esté en todayOrders",
    pc(mk([], [], [{ tableId: "A", status: "cancelled", total: 50 }])), [0, 0]);
  eq("pendientes: mesa sin pedidos no aporta (A con received; B y C libres) = [1,0]",
    pc(mk([{ tableId: "A", status: "received" }])), [1, 0]);
  eq("pendientes: llamado de mesa inexistente en tables igual cuenta (criterio por conteo de filas)",
    pc(mk([], [call("ZZ")])), [0, 1]);
}

console.log(`\n${n - bad}/${n} OK`);
process.exit(bad ? 1 : 0);
