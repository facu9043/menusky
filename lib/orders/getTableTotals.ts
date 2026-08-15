import { createClient } from "@/lib/supabase/server";

// Suma de pedidos de hoy por mesa (no cancelados) — una aproximación de
// "cuánto lleva gastando la mesa", pensada para agilizar al mozo cuando
// piden la cuenta. No es un cierre de caja real: no hay un concepto de
// "sesión de mesa" en el esquema, así que se corta por día calendario.
export async function getTableTotals(restaurantId: string): Promise<Record<string, number>> {
  const supabase = await createClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("orders")
    .select("table_id, total")
    .eq("restaurant_id", restaurantId)
    .neq("status", "cancelled")
    .gte("created_at", startOfDay.toISOString());

  const totals: Record<string, number> = {};
  for (const row of data ?? []) {
    totals[row.table_id] = (totals[row.table_id] ?? 0) + row.total;
  }
  return totals;
}
