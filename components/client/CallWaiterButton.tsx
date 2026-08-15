"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const REASONS = [
  { value: "cuenta", label: "Pedir la cuenta" },
  { value: "consulta", label: "Hacer una consulta" },
  { value: "otro", label: "Otro motivo" },
];

export function CallWaiterButton() {
  const { tableId } = useParams<{ tableId: string }>();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-[family-name:var(--font-menu-display)] text-lg">
              ¿En qué te ayudamos?
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4 pb-4">
            {REASONS.map((reason) => (
              <Button
                key={reason.value}
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => call(reason.value)}
              >
                {reason.label}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
