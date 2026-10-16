"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Clock, LoaderCircle } from "lucide-react";
import { NewTag, OrderLines } from "@/components/staff/OrderLines";
import { formatPrice } from "@/lib/format";
import type { BoardOrder } from "@/lib/orders/board";

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function ReadyOrderCard({
  order,
  isNew,
  tableTotal,
  onDeliver,
}: {
  order: BoardOrder;
  isNew: boolean;
  tableTotal: number;
  onDeliver: (orderId: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleDeliver = async () => {
    setLoading(true);
    try {
      await onDeliver(order.id);
      toast.success("Pedido entregado");
    } catch {
      toast.error("No se pudo marcar como entregado");
    } finally {
      setLoading(false);
    }
  };

  const Icon = loading ? LoaderCircle : Check;
  const headingId = `listo-${order.id}`;

  return (
    <article className="st-order" data-status="ready" aria-labelledby={headingId}>
      {isNew && <NewTag />}

      <div className="st-order__head">
        <h3 className="st-order__table" id={headingId}>
          {order.tableLabel}
        </h3>
        <span className="st-order__time">
          <Clock aria-hidden="true" />
          {timeFormatter.format(new Date(order.createdAt))}
        </span>
      </div>

      <div className="st-order__body">
        <p className="st-order__bill">
          Cuenta de la mesa hoy: <b>{formatPrice(tableTotal)}</b>
        </p>
        {/* Sin la nota del cliente, como hoy (F-6). */}
        <OrderLines items={order.items} withNotes={false} />
      </div>

      <div className="st-order__foot">
        <button
          type="button"
          className="adm-btn adm-btn--primary st-act"
          disabled={loading}
          onClick={handleDeliver}
          aria-label={`Entregado, ${order.tableLabel}`}
        >
          <Icon aria-hidden="true" className={loading ? "st-spin" : undefined} />
          Entregado
        </button>
      </div>
    </article>
  );
}
