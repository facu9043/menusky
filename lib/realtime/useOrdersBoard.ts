"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchBoardOrder } from "@/lib/orders/fetchBoardOrder";
import { updateOrderStatus } from "@/lib/orders/updateOrderStatus";
import { playChime } from "@/lib/notify/playChime";
import type { BoardOrder } from "@/lib/orders/board";
import type { OrderStatus } from "@/lib/types/database.types";

// Base compartida por cocina y salón: mantiene una lista de pedidos "activos"
// (según qué estados le interesan a cada panel) sincronizada con Realtime, y
// expone advanceStatus() con actualización optimista local (no depende de la
// latencia de la suscripción para reflejar tu propio click).
//
// También trackea `newOrderIds`: pedidos que entraron al set activo sin que
// este panel lo haya pedido (otro dispositivo los creó/actualizó) — sirve
// para el aviso sonoro/visual de "pedido recién llegado". Un pedido deja de
// ser "nuevo" en cuanto este panel actúa sobre él. `pendingSelfUpdates` evita
// que el eco de Realtime de tu propia actualización se marque como "nuevo".
//
// `activeStatuses` debe ser una constante estable a nivel de módulo — cambiar
// su identidad en cada render reiniciaría la suscripción innecesariamente.
export function useOrdersBoard(
  channelName: string,
  restaurantId: string,
  initialOrders: BoardOrder[],
  activeStatuses: OrderStatus[]
) {
  const [orders, setOrders] = useState(initialOrders);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const pendingSelfUpdates = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`${channelName}-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          const order = await fetchBoardOrder(payload.new.id as string);
          if (!order || !activeStatuses.includes(order.status)) return;
          setOrders((prev) =>
            prev.some((o) => o.id === order.id) ? prev : [...prev, order]
          );
          setNewOrderIds((prev) => new Set(prev).add(order.id));
          playChime();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; status: OrderStatus };
          const isSelfEcho = pendingSelfUpdates.current.delete(updated.id);
          setOrders((prev) =>
            activeStatuses.includes(updated.status)
              ? prev.map((o) =>
                  o.id === updated.id ? { ...o, status: updated.status } : o
                )
              : prev.filter((o) => o.id !== updated.id)
          );
          if (!isSelfEcho && activeStatuses.includes(updated.status)) {
            setNewOrderIds((prev) => new Set(prev).add(updated.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeStatuses es una constante de módulo pasada por el caller, no cambia de identidad
  }, [channelName, restaurantId]);

  const advanceStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      pendingSelfUpdates.current.add(orderId);
      await updateOrderStatus(orderId, status);
      setOrders((prev) =>
        activeStatuses.includes(status)
          ? prev.map((o) => (o.id === orderId ? { ...o, status } : o))
          : prev.filter((o) => o.id !== orderId)
      );
      setNewOrderIds((prev) => {
        if (!prev.has(orderId)) return prev;
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idem arriba
    []
  );

  return { orders, advanceStatus, newOrderIds };
}
