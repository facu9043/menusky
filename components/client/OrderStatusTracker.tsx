"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useOrderStatus } from "@/lib/realtime/useOrderStatus";
import type { OrderStatus } from "@/lib/types/database.types";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "received", label: "Recibido" },
  { key: "in_kitchen", label: "En preparación" },
  { key: "ready", label: "Listo" },
  { key: "delivered", label: "Entregado" },
];

export function OrderStatusTracker({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: OrderStatus;
}) {
  const status = useOrderStatus(orderId, initialStatus);
  const [justActivated, setJustActivated] = useState(false);
  const prevStatus = useRef(status);

  useEffect(() => {
    // Pulso solo cuando el estado REALMENTE cambia (no en el montaje
    // inicial, donde prevStatus ya arranca igual a status) — mismo patrón
    // que el "rebote" del carrito en CartFab.tsx.
    if (prevStatus.current === status) return;
    prevStatus.current = status;
    setJustActivated(true);
    const timeout = setTimeout(() => setJustActivated(false), 600);
    return () => clearTimeout(timeout);
  }, [status]);

  if (status === "cancelled") {
    return (
      <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm font-medium text-destructive">
        Este pedido fue cancelado.
      </p>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="flex items-start">
      {STEPS.map((step, i) => (
        <Fragment key={step.key}>
          <div className="flex w-16 shrink-0 flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-500",
                i <= currentIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
                i === currentIndex &&
                  justActivated &&
                  "motion-safe:animate-[step-activate_0.6s_ease-out]"
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "text-center text-[11px] leading-tight transition-colors duration-500",
                i <= currentIndex ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mt-4 h-0.5 flex-1 transition-colors duration-500",
                i < currentIndex ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
