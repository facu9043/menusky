"use client";

import { useMemo } from "react";
import { useWaiterCalls } from "@/lib/realtime/useWaiterCalls";
import { useFloorOrders } from "@/lib/realtime/useFloorOrders";
import { useTableTotals } from "@/lib/realtime/useTableTotals";
import { WaiterCallRow } from "@/components/floor/WaiterCallRow";
import { ReadyOrderCard } from "@/components/floor/ReadyOrderCard";
import { TableGrid, type TableStatus } from "@/components/floor/TableGrid";
import type { FloorTable } from "@/lib/floor/getFloorTables";
import type { WaiterCallView } from "@/lib/waiterCalls/getPendingWaiterCalls";
import type { BoardOrder } from "@/lib/orders/board";

export function FloorBoard({
  restaurantId,
  tables,
  initialCalls,
  initialOrders,
  initialTableTotals,
}: {
  restaurantId: string;
  tables: FloorTable[];
  initialCalls: WaiterCallView[];
  initialOrders: BoardOrder[];
  initialTableTotals: Record<string, number>;
}) {
  const { calls, attend } = useWaiterCalls(restaurantId, initialCalls);
  const { orders, advanceStatus, newOrderIds } = useFloorOrders(restaurantId, initialOrders);
  const tableTotals = useTableTotals(restaurantId, initialTableTotals);

  const tablesById = useMemo(() => new Map(tables.map((t) => [t.id, t])), [tables]);
  const readyOrders = useMemo(() => orders.filter((o) => o.status === "ready"), [orders]);

  const tablesWithStatus = useMemo(() => {
    const callingTableIds = new Set(calls.map((c) => c.tableId));
    const readyTableIds = new Set(readyOrders.map((o) => o.tableId));
    const activeTableIds = new Set(orders.map((o) => o.tableId));

    return tables.map((table) => {
      const status: TableStatus = callingTableIds.has(table.id)
        ? "calling"
        : readyTableIds.has(table.id)
          ? "ready"
          : activeTableIds.has(table.id)
            ? "active"
            : "free";
      return { ...table, status };
    });
  }, [tables, calls, readyOrders, orders]);

  return (
    <div className="flex flex-col gap-6 p-4">
      {calls.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Llamados de mozo
          </h2>
          <div className="flex flex-col gap-2">
            {calls.map((call) => (
              <WaiterCallRow
                key={call.id}
                call={call}
                tableLabel={tablesById.get(call.tableId)?.label ?? "Mesa"}
                tableTotal={tableTotals[call.tableId] ?? 0}
                onAttend={attend}
              />
            ))}
          </div>
        </section>
      )}

      {readyOrders.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Listos para llevar
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {readyOrders.map((order) => (
              <ReadyOrderCard
                key={order.id}
                order={order}
                isNew={newOrderIds.has(order.id)}
                tableTotal={tableTotals[order.tableId] ?? 0}
                onDeliver={(id) => advanceStatus(id, "delivered")}
              />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Mesas</h2>
        <TableGrid tables={tablesWithStatus} />
      </section>
    </div>
  );
}
