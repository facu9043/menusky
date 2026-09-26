"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart/useCart";
import { useAnimatedNumber } from "@/lib/animation/useAnimatedNumber";
import { CartDrawer } from "@/components/client/CartDrawer";
import { cn } from "@/lib/utils";

export function CartFab() {
  const { totalItems, totalPrice, bumpCount } = useCart();
  const displayTotal = useAnimatedNumber(totalPrice);
  const [open, setOpen] = useState(false);
  const [bumping, setBumping] = useState(false);
  const lastBumpCount = useRef(bumpCount);
  // El fab se desmonta duro cuando el carrito queda vacío (totalItems===0),
  // así que una salida animada necesita retrasar ese desmonte: "leaving"
  // dispara la transición hacia afuera y recién después de que termina se
  // saca del DOM. La entrada, en cambio, la resuelve @starting-style solo
  // (.cart-fab-wrap en app/globals.css), sin necesitar este manejo.
  const [visible, setVisible] = useState(totalItems > 0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // lib/cart/flyToCart.ts apunta acá (data-cart-fab-icon) como destino de
    // la animación de "volar al carrito" — este rebote es el "impacto" al
    // llegar. Se salta en el primer montaje (cuando aparece el fab con el
    // primer ítem) para no duplicar el efecto con el de aparición.
    if (bumpCount === lastBumpCount.current) return;
    lastBumpCount.current = bumpCount;
    setBumping(true);
    const timeout = setTimeout(() => setBumping(false), 300);
    return () => clearTimeout(timeout);
  }, [bumpCount]);

  useEffect(() => {
    if (totalItems > 0) {
      setVisible(true);
      setLeaving(false);
      return;
    }
    if (!visible) return;
    setLeaving(true);
    const timeout = setTimeout(() => setVisible(false), 300);
    return () => clearTimeout(timeout);
  }, [totalItems, visible]);

  if (!visible) return null;

  return (
    <>
      <div
        className={cn(
          "cart-fab-wrap fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
          leaving && "translate-y-full opacity-0"
        )}
      >
        <Button
          type="button"
          size="lg"
          className="w-full max-w-md shadow-lg"
          onClick={() => setOpen(true)}
        >
          <ShoppingBag
            data-cart-fab-icon
            className={cn("transition-transform duration-300", bumping && "scale-125")}
          />
          Ver pedido · {totalItems} {totalItems === 1 ? "ítem" : "ítems"} ·{" "}
          <span className="tabular-nums">{formatPrice(Math.round(displayTotal))}</span>
        </Button>
      </div>
      <CartDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
