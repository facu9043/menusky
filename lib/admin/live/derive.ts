import { deriveTableStatus } from "@/lib/floor/tableStatus";
import type { AdminLiveRaw, AdminLiveSnapshot, AdminLiveTable } from "@/lib/admin/live/types";

const ACTIVE = new Set(["received", "in_kitchen", "ready"]);

// Función PURA: calcula la instantánea del admin con la MISMA prioridad que el
// salón (llamado > listo > activo > libre; listo y activo son "occupied").
export function deriveAdminLive(raw: AdminLiveRaw): AdminLiveSnapshot {
  const active = raw.activeOrders.filter((o) => ACTIVE.has(o.status));
  const counted = raw.todayOrders.filter((o) => o.status !== "cancelled");

  const src = {
    callingTableIds: new Set(raw.pendingCalls.map((c) => c.tableId)),
    readyTableIds: new Set(active.filter((o) => o.status === "ready").map((o) => o.tableId)),
    activeTableIds: new Set(active.map((o) => o.tableId)),
  };

  const tables: AdminLiveTable[] = raw.tables.map((t) => {
    const status = deriveTableStatus(t.id, src);
    const calls = raw.pendingCalls
      .filter((c) => c.tableId === t.id)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    return {
      id: t.id,
      label: t.label,
      qrToken: t.qrToken,
      state: status === "calling" ? "calling" : status === "free" ? "free" : "occupied",
      activeOrders: active.filter((o) => o.tableId === t.id).length,
      todayTotal: counted.filter((o) => o.tableId === t.id).reduce((s, o) => s + o.total, 0),
      oldestCallReason: calls[0]?.reason ?? null,
      pendingCalls: calls.length,
    };
  });

  return {
    tables,
    ordersToday: counted.length,
    salesToday: counted.reduce((s, o) => s + o.total, 0),
    pendingCalls: raw.pendingCalls.length,
    occupiedTables: tables.filter((t) => t.state !== "free").length,
    kitchenPending: active.filter((o) => o.status === "received").length,
    floorPending: active.filter((o) => o.status === "ready").length + raw.pendingCalls.length,
  };
}
