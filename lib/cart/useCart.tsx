"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CartItem } from "@/lib/types/cart";
import { cartItemSubtotal } from "@/lib/types/cart";

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  setQuantity: (cartItemId: string, quantity: number) => void;
  clear: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(tableQrToken: string) {
  return `cart:${tableQrToken}`;
}

export function CartProvider({
  tableQrToken,
  children,
}: {
  tableQrToken: string;
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hidratación única desde localStorage (fuente externa al render de React,
    // no disponible durante SSR) — no se puede resolver con un initializer de
    // useState sin romper el hydration match con el HTML del servidor.
    try {
      const raw = localStorage.getItem(storageKey(tableQrToken));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // localStorage no disponible (modo privado, etc.) — arranca con carrito vacío.
    }
    setHydrated(true);
  }, [tableQrToken]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey(tableQrToken), JSON.stringify(items));
    } catch {
      // idem arriba: si no se puede persistir, seguimos solo en memoria.
    }
  }, [items, hydrated, tableQrToken]);

  const addItem = useCallback((item: Omit<CartItem, "cartItemId">) => {
    const cartItemId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { ...item, cartItemId }]);
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  }, []);

  const setQuantity = useCallback((cartItemId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.cartItemId !== cartItemId)
        : prev.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );
  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + cartItemSubtotal(i), 0),
    [items]
  );

  const value: CartContextValue = {
    items,
    addItem,
    removeItem,
    setQuantity,
    clear,
    totalItems,
    totalPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
