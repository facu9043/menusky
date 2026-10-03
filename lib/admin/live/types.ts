export type AdminTableState = "free" | "occupied" | "calling";

export interface AdminLiveTable {
  id: string;
  label: string;
  qrToken: string;
  state: AdminTableState;
  /** Pedidos activos (received | in_kitchen | ready). */
  activeOrders: number;
  /** Suma del día AR, sin cancelados (misma regla que getTableTotals). */
  todayTotal: number;
  /** Motivo crudo del llamado pendiente más antiguo. */
  oldestCallReason: string | null;
  pendingCalls: number;
}

export interface AdminLiveSnapshot {
  tables: AdminLiveTable[];
  /** Pedidos del día AR, sin cancelados. */
  ordersToday: number;
  /** Suma de total del día AR, sin cancelados (para "Podría"). */
  salesToday: number;
  pendingCalls: number;
  /** Mesas con state !== "free". */
  occupiedTables: number;
}

/** Datos crudos de entrada de derive (lo que se lee de la base). */
export interface AdminLiveRaw {
  tables: { id: string; label: string; qrToken: string }[];
  /** Pedidos activos de cualquier fecha: received | in_kitchen | ready. */
  activeOrders: { tableId: string; status: string }[];
  /** Pedidos creados hoy (día AR). Se descartan los cancelados al derivar. */
  todayOrders: { tableId: string; status: string; total: number }[];
  /** Llamados pendientes. */
  pendingCalls: { tableId: string; reason: string | null; createdAt: string }[];
}
