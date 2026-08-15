"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StaffPendingCounts } from "@/lib/staff/pendingCounts";

// "Pendiente ahora mismo", no "no visto": cocina se marca cuando hay algún
// pedido "received" sin tomar; salón cuando hay una mesa llamando o un
// pedido "ready" sin entregar. Se recalcula (con un pequeño count query) en
// cada evento relevante de Realtime — más simple y menos propenso a
// desincronizarse que ir sumando/restando a mano.
export function useStaffPendingCounts(restaurantId: string): StaffPendingCounts {
  const [counts, setCounts] = useState<StaffPendingCounts>({
    kitchenPending: 0,
    floorPending: 0,
  });

  const refetch = useCallback(async () => {
    const supabase = createClient();
    const [received, ready, calls] = await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("status", "received"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("status", "ready"),
      supabase
        .from("waiter_calls")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("status", "pending"),
    ]);
    setCounts({
      kitchenPending: received.count ?? 0,
      floorPending: (ready.count ?? 0) + (calls.count ?? 0),
    });
  }, [restaurantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde una fuente externa (Supabase), no un cálculo derivable en el render
    refetch();
    const supabase = createClient();
    const channel = supabase
      .channel(`staff-pending-${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        refetch
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waiter_calls", filter: `restaurant_id=eq.${restaurantId}` },
        refetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, refetch]);

  return counts;
}
