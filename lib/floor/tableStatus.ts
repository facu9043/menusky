import type { TableStatus } from "@/components/floor/TableGrid";

// Prioridad del salón: llamando > listo > con pedido > libre. Extraída de
// FloorBoard sin cambiar su resultado; la usa también el admin en vivo
// (lib/admin/live/derive.ts) para no duplicar la regla (CA-8.5).
export interface TableStatusSources {
  /** Mesas con un llamado de mozo pendiente. */
  callingTableIds: ReadonlySet<string>;
  /** Mesas con un pedido en estado "ready". */
  readyTableIds: ReadonlySet<string>;
  /** Mesas con algún pedido activo (received, in_kitchen o ready). */
  activeTableIds: ReadonlySet<string>;
}

export function deriveTableStatus(tableId: string, src: TableStatusSources): TableStatus {
  if (src.callingTableIds.has(tableId)) return "calling";
  if (src.readyTableIds.has(tableId)) return "ready";
  if (src.activeTableIds.has(tableId)) return "active";
  return "free";
}
