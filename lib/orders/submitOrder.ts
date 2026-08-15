import type { CartItem } from "@/lib/types/cart";

export async function submitOrder(qrToken: string, items: CartItem[]) {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      qrToken,
      items: items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        choiceIds: item.selectedOptions.map((o) => o.choiceId),
        note: item.note,
      })),
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error ?? "No se pudo enviar el pedido");
  }

  return data as { orderId: string };
}
