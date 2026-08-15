"use client";

import { OrderCard } from "@/components/kitchen/OrderCard";
import { useKitchenOrders } from "@/lib/realtime/useKitchenOrders";
import { useTableTotals } from "@/lib/realtime/useTableTotals";
import type { BoardOrder } from "@/lib/orders/board";

export function OrderBoard({
  restaurantId,
  initialOrders,
  initialTableTotals,
}: {
  restaurantId: string;
  initialOrders: BoardOrder[];
  initialTableTotals: Record<string, number>;
}) {
  const { orders, advanceStatus, newOrderIds } = useKitchenOrders(restaurantId, initialOrders);
  const tableTotals = useTableTotals(restaurantId, initialTableTotals);

  if (orders.length === 0) {
    return (
      <p className="px-4 py-16 text-center text-sm text-muted-foreground">
        No hay pedidos pendientes.
      </p>
    );
  }

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          isNew={newOrderIds.has(order.id)}
          tableTotal={tableTotals[order.tableId] ?? 0}
          onAdvance={advanceStatus}
        />
      ))}
    </div>
  );
}
