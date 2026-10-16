"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChefHat, CircleCheck, Clock, LoaderCircle } from "lucide-react";
import { NewTag, OrderLines } from "@/components/staff/OrderLines";
import { formatPrice } from "@/lib/format";
import type { BoardOrder } from "@/lib/orders/board";

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function OrderCard({
  order,
  isNew,
  tableTotal,
  onAdvance,
}: {
  order: BoardOrder;
  isNew: boolean;
  tableTotal: number;
  onAdvance: (orderId: string, status: "in_kitchen" | "ready") => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleAdvance = async () => {
    setLoading(true);
    const nextStatus = order.status === "received" ? "in_kitchen" : "ready";
    try {
      await onAdvance(order.id, nextStatus);
      toast.success(nextStatus === "in_kitchen" ? "Pedido en preparación" : "Pedido listo");
    } catch {
      toast.error("No se pudo actualizar el pedido");
    } finally {
      setLoading(false);
    }
  };

  const received = order.status === "received";
  const label = received ? "Tomar pedido" : "Marcar listo";
  const ActionIcon = loading ? LoaderCircle : received ? ChefHat : CircleCheck;
  const headingId = `pedido-${order.id}`;

  return (
    <article className="st-order" data-status={order.status} aria-labelledby={headingId}>
      {isNew && <NewTag />}

      <div className="st-order__head">
        <h2 className="st-order__table" id={headingId}>
          {order.tableLabel}
        </h2>
        <span className="st-order__time">
          <Clock aria-hidden="true" />
          {timeFormatter.format(new Date(order.createdAt))}
        </span>
        {!received && (
          <span className="st-chip">
            <ChefHat aria-hidden="true" />
            En preparación
          </span>
        )}
      </div>

      <div className="st-order__body">
        <p className="st-order__bill">
          Cuenta de la mesa hoy: <b>{formatPrice(tableTotal)}</b>
        </p>
        <OrderLines items={order.items} withNotes />
      </div>

      <div className="st-order__foot">
        <button
          type="button"
          className={`adm-btn st-act${received ? " adm-btn--primary" : ""}`}
          disabled={loading}
          onClick={handleAdvance}
          aria-label={`${label}, ${order.tableLabel}`}
        >
          <ActionIcon aria-hidden="true" className={loading ? "st-spin" : undefined} />
          {label}
        </button>
      </div>
    </article>
  );
}
