"use client";

import { useRef, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";
import { useAnimatedNumber } from "@/lib/animation/useAnimatedNumber";
import { cartItemSubtotal, cartItemUnitPrice } from "@/lib/types/cart";
import type { CartItem } from "@/lib/types/cart";

const SWIPE_THRESHOLD = -80;
const SWIPE_MAX = -96;

export function CartItemRow({
  item,
  onSetQuantity,
  onRemove,
}: {
  item: CartItem;
  onSetQuantity: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const startX = useRef(0);
  const rowRef = useRef<HTMLDivElement>(null);
  const displayQuantity = useAnimatedNumber(item.quantity, 200);

  const handlePointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    setDragging(true);
    rowRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const delta = e.clientX - startX.current;
    setDragX(Math.max(SWIPE_MAX, Math.min(0, delta)));
  };

  const handlePointerUp = () => {
    setDragging(false);
    if (dragX <= SWIPE_THRESHOLD) {
      setLeaving(true);
      setTimeout(() => onRemove(item.cartItemId), 200);
    } else {
      setDragX(0);
    }
  };

  return (
    <div
      className="relative overflow-hidden transition-[opacity,max-height] duration-200"
      style={leaving ? { opacity: 0, maxHeight: 0 } : { maxHeight: 300 }}
    >
      {/* Fondo revelado al deslizar hacia la izquierda — swipe-to-delete,
          el gesto nativo que se espera en el celular. Se mantiene también
          el botón de basura de siempre como alternativa para quien no
          descubra el gesto. */}
      <div className="absolute inset-0 flex items-center justify-end bg-destructive px-4">
        <Trash2 className="size-4 text-destructive-foreground" />
      </div>
      <div
        ref={rowRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${leaving ? SWIPE_MAX * 5 : dragX}px)`,
          transition: dragging ? "none" : "transform 0.25s ease-out",
          touchAction: "pan-y",
        }}
        className="relative flex flex-col gap-1 bg-background py-1"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium leading-tight">{item.name}</p>
            {item.selectedOptions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {item.selectedOptions.map((o) => o.choiceName).join(" · ")}
              </p>
            )}
            {item.note && (
              <p className="text-xs italic text-muted-foreground">&ldquo;{item.note}&rdquo;</p>
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
              onClick={() => onSetQuantity(item.cartItemId, item.quantity - 1)}
            >
              <Minus />
            </Button>
            <span className="w-4 text-center text-sm font-medium tabular-nums">
              {Math.round(displayQuantity)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onSetQuantity(item.cartItemId, item.quantity + 1)}
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
              onClick={() => onRemove(item.cartItemId)}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
        <Separator className="mt-3" />
      </div>
    </div>
  );
}
