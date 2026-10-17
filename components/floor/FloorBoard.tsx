"use client";

import { useCallback, useMemo } from "react";
import { useWaiterCalls } from "@/lib/realtime/useWaiterCalls";
import { useFloorOrders } from "@/lib/realtime/useFloorOrders";
import { useTableTotals } from "@/lib/realtime/useTableTotals";
import { WaiterCallRow } from "@/components/floor/WaiterCallRow";
import { ReadyOrderCard } from "@/components/floor/ReadyOrderCard";
import { TableGrid } from "@/components/floor/TableGrid";
import { useArrivalAnnouncer } from "@/components/staff/useArrivalAnnouncer";
import { deriveTableStatus } from "@/lib/floor/tableStatus";
import { waiterCallReasonLabel } from "@/lib/waiterCalls/reasons";
import type { FloorTable } from "@/lib/floor/getFloorTables";
import type { WaiterCallView } from "@/lib/waiterCalls/getPendingWaiterCalls";
import type { BoardOrder } from "@/lib/orders/board";

const byId = (x: { id: string }) => x.id;

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
    const sources = {
      callingTableIds: new Set(calls.map((c) => c.tableId)),
      readyTableIds: new Set(readyOrders.map((o) => o.tableId)),
      activeTableIds: new Set(orders.map((o) => o.tableId)),
    };

    return tables.map((table) => ({ ...table, status: deriveTableStatus(table.id, sources) }));
  }, [tables, calls, readyOrders, orders]);

  // Avisos para lector de pantalla (CA-5.1, textos de la decisión 7).
  const callLabel = useCallback((tableId: string) => tablesById.get(tableId)?.label ?? "Mesa", [tablesById]);
  const announceCall = useCallback(
    (c: WaiterCallView) => `Llamado de ${callLabel(c.tableId)}: ${waiterCallReasonLabel(c.reason)}`,
    [callLabel]
  );
  const announceReady = useCallback((o: BoardOrder) => `Pedido listo: ${o.tableLabel}`, []);
  const callsLiveRef = useArrivalAnnouncer(calls, byId, announceCall);
  const readyLiveRef = useArrivalAnnouncer(readyOrders, byId, announceReady);

  return (
    <div className="st-floor">
      <p ref={callsLiveRef} className="sr-only" aria-live="polite" />
      <p ref={readyLiveRef} className="sr-only" aria-live="polite" />

      <div className="st-floor__main">
        {calls.length > 0 && (
          <section className="st-section" aria-labelledby="h-llamados">
            <h2 className="st-h2" id="h-llamados">
              Llamados de mozo <span className="st-h2__count">· {calls.length}</span>
            </h2>
            <ul className="st-calls">
              {calls.map((call) => (
                <li key={call.id}>
                  <WaiterCallRow
                    call={call}
                    tableLabel={callLabel(call.tableId)}
                    tableTotal={tableTotals[call.tableId] ?? 0}
                    onAttend={attend}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {readyOrders.length > 0 && (
          <section className="st-section" aria-labelledby="h-listos">
            <h2 className="st-h2" id="h-listos">
              Listos para llevar <span className="st-h2__count">· {readyOrders.length}</span>
            </h2>
            <ul className="st-orders">
              {readyOrders.map((order) => (
                <li key={order.id}>
                  <ReadyOrderCard
                    order={order}
                    isNew={newOrderIds.has(order.id)}
                    tableTotal={tableTotals[order.tableId] ?? 0}
                    onDeliver={(id) => advanceStatus(id, "delivered")}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="st-floor__side">
        <section className="st-section" aria-labelledby="h-mesas">
          <h2 className="st-h2" id="h-mesas">
            Mesas
          </h2>
          <TableGrid tables={tablesWithStatus} />
        </section>
      </div>
    </div>
  );
}
