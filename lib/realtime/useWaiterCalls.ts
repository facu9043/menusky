"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { attendWaiterCall } from "@/lib/waiterCalls/attendWaiterCall";
import type { WaiterCallView } from "@/lib/waiterCalls/getPendingWaiterCalls";
import { playChime } from "@/lib/notify/playChime";

// notify (default true, como siempre en /floor): suena el aviso y sale el cartel
// cuando entra un llamado. El admin en vivo lo apaga (CA-8.6).
export function useWaiterCalls(
  restaurantId: string,
  initialCalls: WaiterCallView[],
  { notify = true }: { notify?: boolean } = {}
) {
  const [calls, setCalls] = useState(initialCalls);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`waiter-calls-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "waiter_calls",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            table_id: string;
            reason: string | null;
            created_at: string;
          };
          setCalls((prev) => [
            ...prev,
            {
              id: row.id,
              tableId: row.table_id,
              reason: row.reason,
              createdAt: row.created_at,
            },
          ]);
          if (notify) {
            playChime();
            toast.info("Una mesa está llamando al mozo");
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "waiter_calls",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; status: string };
          if (row.status !== "pending") {
            setCalls((prev) => prev.filter((c) => c.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, notify]);

  const attend = useCallback(async (callId: string) => {
    await attendWaiterCall(callId);
    setCalls((prev) => prev.filter((c) => c.id !== callId));
  }, []);

  return { calls, attend };
}
