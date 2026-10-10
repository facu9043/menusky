import type { SupabaseClient } from "@supabase/supabase-js";
import { assertNoDbError } from "@/lib/admin/errors";
import { deriveAdminLive } from "@/lib/admin/live/derive";
import type { AdminLiveSnapshot } from "@/lib/admin/live/types";
import { todayRangeAR } from "@/lib/time/today";
import type { Database } from "@/lib/types/database.types";

// Lectura compartida por el servidor (getAdminLiveSnapshot) y por el navegador
// (AdminLiveProvider.refresh): recibe el cliente de Supabase ya creado. Lanza
// AdminDataError si alguna lectura falla.
export async function loadAdminLiveSnapshot(
  supabase: SupabaseClient<Database>,
  restaurantId: string,
  now: Date = new Date()
): Promise<AdminLiveSnapshot> {
  const { startIso, endIso } = todayRangeAR(now);

  const [tablesRes, activeRes, todayRes, callsRes] = await Promise.all([
    supabase
      .from("tables")
      .select("id, label, qr_token")
      .eq("restaurant_id", restaurantId)
      .order("label", { ascending: true }),
    supabase
      .from("orders")
      .select("table_id, status")
      .eq("restaurant_id", restaurantId)
      .in("status", ["received", "in_kitchen", "ready"]),
    supabase
      .from("orders")
      .select("table_id, status, total")
      .eq("restaurant_id", restaurantId)
      .neq("status", "cancelled")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("waiter_calls")
      .select("table_id, reason, created_at")
      .eq("restaurant_id", restaurantId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  assertNoDbError(tablesRes.error, "mesas en vivo");
  assertNoDbError(activeRes.error, "pedidos activos");
  assertNoDbError(todayRes.error, "pedidos de hoy");
  assertNoDbError(callsRes.error, "llamados");

  return deriveAdminLive({
    tables: (tablesRes.data ?? []).map((t) => ({ id: t.id, label: t.label, qrToken: t.qr_token })),
    activeOrders: (activeRes.data ?? []).map((o) => ({ tableId: o.table_id, status: o.status })),
    todayOrders: (todayRes.data ?? []).map((o) => ({
      tableId: o.table_id,
      status: o.status,
      total: Number(o.total),
    })),
    pendingCalls: (callsRes.data ?? []).map((c) => ({
      tableId: c.table_id,
      reason: c.reason,
      createdAt: c.created_at,
    })),
  });
}
