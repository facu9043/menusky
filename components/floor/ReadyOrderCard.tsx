"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  return (
    <Card className="relative flex flex-col gap-3 p-4">
      {isNew && (
        <span className="absolute -top-1.5 -right-1.5 flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-primary" />
        </span>
      )}

      <div className="flex items-center justify-between gap-2">
        <Badge>{order.tableLabel}</Badge>
        <span className="text-xs text-muted-foreground">
          {timeFormatter.format(new Date(order.createdAt))}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Cuenta de la mesa hoy:{" "}
        <span className="font-medium text-foreground">{formatPrice(tableTotal)}</span>
      </p>

      <ul className="flex flex-col gap-1.5">
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
          </li>
        ))}
      </ul>

      <Button type="button" disabled={loading} onClick={handleDeliver}>
        <Check />
        Entregado
      </Button>
    </Card>
  );
}
