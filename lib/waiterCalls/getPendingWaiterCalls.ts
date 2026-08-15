import { createClient } from "@/lib/supabase/server";

export interface WaiterCallView {
  id: string;
  tableId: string;
  reason: string | null;
  createdAt: string;
}

type WaiterCallRow = {
  id: string;
  table_id: string;
  reason: string | null;
  created_at: string;
};

export async function getPendingWaiterCalls(restaurantId: string): Promise<WaiterCallView[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("waiter_calls")
    .select("id, table_id, reason, created_at")
    .eq("restaurant_id", restaurantId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<WaiterCallRow[]>();

  return (data ?? []).map((row) => ({
    id: row.id,
    tableId: row.table_id,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}
