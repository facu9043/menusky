"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart/useCart";
import { useAnimatedNumber } from "@/lib/animation/useAnimatedNumber";
import { submitOrder } from "@/lib/orders/submitOrder";
import { setLastOrderId } from "@/lib/orders/lastOrder";
import { withViewTransition } from "@/lib/navigation/viewTransition";
import { CartItemRow } from "@/components/client/CartItemRow";

export function CartDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { items, setQuantity, removeItem, totalPrice, clear } = useCart();
  const { tableId } = useParams<{ tableId: string }>();
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const displayTotal = useAnimatedNumber(totalPrice);

  const handleSend = async () => {
    setSending(true);
    try {
      const { orderId } = await submitOrder(tableId, items);
      setLastOrderId(tableId, orderId);
      clear();
      onOpenChange(false);
      withViewTransition(() => router.push(`/m/${tableId}/pedido/${orderId}`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el pedido");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="font-[family-name:var(--font-menu-display)] text-lg">
            Tu pedido
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          {items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no agregaste nada.
            </p>
          )}
          {items.map((item) => (
            <CartItemRow
              key={item.cartItemId}
              item={item}
              onSetQuantity={setQuantity}
              onRemove={removeItem}
            />
          ))}
        </div>

        {items.length > 0 && (
          <SheetFooter className="gap-3">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span className="text-primary tabular-nums">
                {formatPrice(Math.round(displayTotal))}
              </span>
            </div>
            <Button type="button" size="lg" disabled={sending} onClick={handleSend}>
              {sending ? "Enviando..." : "Enviar pedido a cocina"}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
