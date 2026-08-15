"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Snapshot inicial (server) + incremento en vivo: como los totales de un
// pedido ya creado nunca cambian, alcanza con sumar cada INSERT nuevo — no
// hace falta re-consultar todo de nuevo.
export function useTableTotals(restaurantId: string, initialTotals: Record<string, number>) {
  const [totals, setTotals] = useState(initialTotals);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`table-totals-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new as { table_id: string; total: number };
          setTotals((prev) => ({
            ...prev,
            [row.table_id]: (prev[row.table_id] ?? 0) + row.total,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  return totals;
}
