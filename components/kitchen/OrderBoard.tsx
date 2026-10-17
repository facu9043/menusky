"use client";

import { useCallback } from "react";
import { OrderCard } from "@/components/kitchen/OrderCard";
import { useArrivalAnnouncer } from "@/components/staff/useArrivalAnnouncer";
import { useKitchenOrders } from "@/lib/realtime/useKitchenOrders";
import { useTableTotals } from "@/lib/realtime/useTableTotals";
import type { BoardOrder } from "@/lib/orders/board";

const orderKey = (o: BoardOrder) => o.id;

export function OrderBoard({
  restaurantId,
  initialOrders,
  initialTableTotals,
  empty,
}: {
  restaurantId: string;
  initialOrders: BoardOrder[];
  initialTableTotals: Record<string, number>;
  /** Estado vacío (con Pomo), armado en el servidor para no sumar su SVG al JS. */
  empty: React.ReactNode;
}) {
  const { orders, advanceStatus, newOrderIds } = useKitchenOrders(restaurantId, initialOrders);
  const tableTotals = useTableTotals(restaurantId, initialTableTotals);
  const announceNew = useCallback((o: BoardOrder) => `Pedido nuevo: ${o.tableLabel}`, []);
  const liveRef = useArrivalAnnouncer(orders, orderKey, announceNew);

  return (
    <>
      <p ref={liveRef} className="sr-only" aria-live="polite" />
      {orders.length === 0 ? (
        empty
      ) : (
        <ul className="st-orders" aria-label="Pedidos">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard
                order={order}
                isNew={newOrderIds.has(order.id)}
                tableTotal={tableTotals[order.tableId] ?? 0}
                onAdvance={advanceStatus}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
