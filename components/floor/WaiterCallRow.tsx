"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, Check, LoaderCircle } from "lucide-react";
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

  const Icon = loading ? LoaderCircle : Check;

  return (
    <div className="st-call">
      <span className="st-call__bell" aria-hidden="true">
        <BellRing />
      </span>
      <div className="st-call__text">
        <h3 className="st-call__table">{tableLabel}</h3>
        <p className="st-call__why">
          {waiterCallReasonLabel(call.reason)} · {timeFormatter.format(new Date(call.createdAt))}
        </p>
        {call.reason === "cuenta" && (
          <p className="st-call__bill">
            Cuenta de hoy: <b>{formatPrice(tableTotal)}</b>
          </p>
        )}
      </div>
      <button
        type="button"
        className="adm-btn st-act"
        disabled={loading}
        onClick={handleAttend}
        aria-label={`Atendido, ${tableLabel}`}
      >
        <Icon aria-hidden="true" className={loading ? "st-spin" : undefined} />
        Atendido
      </button>
    </div>
  );
}
