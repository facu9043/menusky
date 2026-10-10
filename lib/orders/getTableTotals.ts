import { createClient } from "@/lib/supabase/server";
import { todayRangeAR } from "@/lib/time/today";

// Suma de pedidos de hoy por mesa (no cancelados) — una aproximación de
// "cuánto lleva gastando la mesa", pensada para agilizar al mozo cuando
// piden la cuenta. No es un cierre de caja real: no hay un concepto de
// "sesión de mesa" en el esquema, así que se corta por día calendario de
// Argentina (lib/time/today.ts, D-6), no por la medianoche del servidor.
export async function getTableTotals(restaurantId: string): Promise<Record<string, number>> {
  const supabase = await createClient();

  const { startIso, endIso } = todayRangeAR();

  const { data } = await supabase
    .from("orders")
    .select("table_id, total")
    .eq("restaurant_id", restaurantId)
    .neq("status", "cancelled")
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  const totals: Record<string, number> = {};
  for (const row of data ?? []) {
    totals[row.table_id] = (totals[row.table_id] ?? 0) + row.total;
  }
  return totals;
}
