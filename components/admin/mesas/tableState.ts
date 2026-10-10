import { formatPrice } from "@/lib/format";
import { waiterCallReasonLabel } from "@/lib/waiterCalls/reasons";
import type { AdminLiveTable, AdminTableState } from "@/lib/admin/live/types";

// Textos de estado de una mesa (CA-8.3). El estado se entiende por texto e
// ícono, no solo por color.
export const STATE_LABEL: Record<AdminTableState, string> = {
  free: "Libre",
  occupied: "Ocupada",
  calling: "Llama al mozo",
};

export type TableFilter = "all" | AdminTableState;

export const FILTERS: { key: TableFilter; label: string; empty: string }[] = [
  { key: "all", label: "Todas", empty: "" },
  { key: "free", label: "Libres", empty: "No hay mesas libres ahora." },
  { key: "occupied", label: "Ocupadas", empty: "No hay mesas ocupadas ahora." },
  { key: "calling", label: "Llamando", empty: "No hay mesas llamando ahora." },
];

/** Resumen corto: "2 pedidos · $ 21.600" (ocupada) o el motivo del llamado (+N si hay más). */
export function tableSummary(t: AdminLiveTable | undefined): string {
  if (!t) return "";
  if (t.state === "calling") {
    const more = t.pendingCalls > 1 ? ` +${t.pendingCalls - 1}` : "";
    return `${waiterCallReasonLabel(t.oldestCallReason)}${more}`;
  }
  if (t.state === "occupied") {
    return `${t.activeOrders} ${t.activeOrders === 1 ? "pedido" : "pedidos"} · ${formatPrice(t.todayTotal)}`;
  }
  return "";
}

/** CA-8.14: si la mesa tiene pedidos (activos o de hoy), al borrarla se borran también. */
export function hasOrders(t: AdminLiveTable | undefined): boolean {
  return !!t && (t.activeOrders > 0 || t.todayTotal > 0);
}

export function qrSrc(qrToken: string): string {
  return `/api/qr/${encodeURIComponent(qrToken)}`;
}

export function menuHref(qrToken: string): string {
  return `/m/${encodeURIComponent(qrToken)}`;
}
