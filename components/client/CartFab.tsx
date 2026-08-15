"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart/useCart";
import { CartDrawer } from "@/components/client/CartDrawer";

export function CartFab() {
  const { totalItems, totalPrice } = useCart();
  const [open, setOpen] = useState(false);

  if (totalItems === 0) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4">
        <Button
          type="button"
          size="lg"
          className="w-full max-w-md shadow-lg"
          onClick={() => setOpen(true)}
        >
          <ShoppingBag />
          Ver pedido · {totalItems} {totalItems === 1 ? "ítem" : "ítems"} ·{" "}
          {formatPrice(totalPrice)}
        </Button>
      </div>
      <CartDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
