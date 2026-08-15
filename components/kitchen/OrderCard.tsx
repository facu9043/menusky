"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChefHat, CircleCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  return (
    <Card className="relative flex flex-col gap-3 p-4">
      {isNew && (
        <span className="absolute -top-1.5 -right-1.5 flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-primary" />
        </span>
      )}

      <div className="flex items-center justify-between gap-2">
        <Badge variant={order.status === "received" ? "default" : "secondary"}>
          {order.tableLabel}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {timeFormatter.format(new Date(order.createdAt))}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Cuenta de la mesa hoy:{" "}
        <span className="font-medium text-foreground">{formatPrice(tableTotal)}</span>
      </p>

      <ul className="flex flex-col gap-2">
        {order.items.map((item) => (
          <li key={item.id} className="text-sm">
            <span className="font-medium">
              {item.quantity}× {item.menuItemName}
            </span>
            {item.selectedOptions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {item.selectedOptions.map((o) => o.choiceName).join(" · ")}
              </p>
            )}
            {item.note && (
              <p className="text-xs italic text-muted-foreground">
                &ldquo;{item.note}&rdquo;
              </p>
            )}
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant={order.status === "received" ? "default" : "outline"}
        disabled={loading}
        onClick={handleAdvance}
      >
        {order.status === "received" ? <ChefHat /> : <CircleCheck />}
        {order.status === "received" ? "Tomar pedido" : "Marcar listo"}
      </Button>
    </Card>
  );
}
