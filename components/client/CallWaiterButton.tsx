"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { BellRing, ReceiptText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TransitionLink } from "@/components/client/TransitionLink";
import { getLastOrderId } from "@/lib/orders/lastOrder";

const DARK_OPTION_CLASS =
  "border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white";

const REASONS = [
  { value: "cuenta", label: "Pedir la cuenta" },
  { value: "consulta", label: "Hacer una consulta" },
];

export function CallWaiterButton() {
  const { tableId } = useParams<{ tableId: string }>();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    // Releer en cada apertura (no solo al montar): el componente vive en el
    // layout y no se remonta al hacer un pedido, así que si solo dependiera
    // de `tableId` nunca se enteraría de pedidos hechos después del montaje.
    if (open) setOrderId(getLastOrderId(tableId));
  }, [open, tableId]);

  const call = async (reason: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/waiter-calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: tableId, reason }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ya avisamos al mozo");
      setOpen(false);
    } catch {
      toast.error("No se pudo avisar al mozo, probá de nuevo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="icon-lg"
        className="fixed bottom-24 right-4 z-30 rounded-full bg-waiter text-waiter-foreground shadow-lg hover:bg-waiter/90"
        onClick={() => setOpen(true)}
      >
        <BellRing />
        <span className="sr-only">Llamar al mozo</span>
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="overflow-hidden rounded-t-2xl border-none bg-transparent p-0 shadow-none"
        >
          {/* Aro giratorio tipo "led": gradiente cónico rotando detrás,
              recortado a un anillo de 2px por el padding del wrapper +
              el fondo negro del contenido de adentro. Usa --primary (el
              acento del tema del restaurante) en vez de un naranja fijo,
              para que se adapte si el restaurante tiene otro tema. */}
          <div className="relative overflow-hidden rounded-t-2xl p-[2px]">
            <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] motion-reduce:animate-none [background:conic-gradient(from_0deg,transparent_0deg,var(--primary)_40deg,transparent_100deg,transparent_200deg,var(--primary)_260deg,transparent_320deg)]" />
            <div className="relative rounded-t-2xl bg-black">
              <SheetHeader>
                <SheetTitle className="font-[family-name:var(--font-menu-display)] text-lg text-white">
                  ¿En qué te ayudamos?
                </SheetTitle>
              </SheetHeader>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-3 right-3 text-white hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
              >
                <X />
                <span className="sr-only">Cerrar</span>
              </Button>
              <div className="flex flex-col gap-2 px-4 pb-4">
                {REASONS.map((reason) => (
                  <Button
                    key={reason.value}
                    type="button"
                    variant="outline"
                    className={DARK_OPTION_CLASS}
                    disabled={loading}
                    onClick={() => call(reason.value)}
                  >
                    {reason.label}
                  </Button>
                ))}
                {orderId && (
                  <Button
                    variant="outline"
                    className={DARK_OPTION_CLASS}
                    onClick={() => setOpen(false)}
                    render={<TransitionLink href={`/m/${tableId}/pedido/${orderId}`} />}
                  >
                    <ReceiptText />
                    Ver mi pedido
                  </Button>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
