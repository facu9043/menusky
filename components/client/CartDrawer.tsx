"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart/useCart";
import { cartItemSubtotal, cartItemUnitPrice } from "@/lib/types/cart";
import { submitOrder } from "@/lib/orders/submitOrder";
import { setLastOrderId } from "@/lib/orders/lastOrder";

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

  const handleSend = async () => {
    setSending(true);
    try {
      const { orderId } = await submitOrder(tableId, items);
      setLastOrderId(tableId, orderId);
      clear();
      onOpenChange(false);
      router.push(`/m/${tableId}/pedido/${orderId}`);
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
            <div key={item.cartItemId} className="flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium leading-tight">{item.name}</p>
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
                </div>
                <span className="shrink-0 text-sm font-semibold text-primary">
                  {formatPrice(cartItemSubtotal(item))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 rounded-lg border px-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setQuantity(item.cartItemId, item.quantity - 1)
                    }
                  >
                    <Minus />
                  </Button>
                  <span className="w-4 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setQuantity(item.cartItemId, item.quantity + 1)
                    }
                  >
                    <Plus />
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {formatPrice(cartItemUnitPrice(item))} c/u
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeItem(item.cartItemId)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <Separator className="mt-3" />
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <SheetFooter className="gap-3">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatPrice(totalPrice)}</span>
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
