"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { waiterCallReasonLabel } from "@/lib/waiterCalls/reasons";
import type { WaiterCallView } from "@/lib/waiterCalls/getPendingWaiterCalls";

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function WaiterCallRow({
  call,
  tableLabel,
  tableTotal,
  onAttend,
}: {
  call: WaiterCallView;
  tableLabel: string;
  tableTotal: number;
  onAttend: (callId: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleAttend = async () => {
    setLoading(true);
    try {
      await onAttend(call.id);
      toast.success("Llamado atendido");
    } catch {
      toast.error("No se pudo marcar como atendido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="board-card-enter flex flex-row items-center gap-3 border-destructive/40 bg-destructive/5 p-3">
      <BellRing className="size-5 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-tight">{tableLabel}</p>
        <p className="text-xs text-muted-foreground">
          {waiterCallReasonLabel(call.reason)} · {timeFormatter.format(new Date(call.createdAt))}
        </p>
        {call.reason === "cuenta" && (
          <p className="text-xs text-muted-foreground">
            Cuenta de hoy:{" "}
            <span className="font-medium text-foreground">{formatPrice(tableTotal)}</span>
          </p>
        )}
      </div>
      <Button type="button" size="sm" variant="outline" disabled={loading} onClick={handleAttend}>
        <Check />
        Atendido
      </Button>
    </Card>
  );
}
