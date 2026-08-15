import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types/database.types";
import type { CartSelectedOption } from "@/lib/types/cart";

export interface OrderItemView {
  id: string;
  menuItemName: string;
  quantity: number;
  selectedOptions: CartSelectedOption[];
  note: string | null;
  subtotal: number;
}

export interface OrderView {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
}

type OrderItemRow = {
  id: string;
  quantity: number;
  selected_options: CartSelectedOption[];
  note: string | null;
  subtotal: number;
  menu_items: { name: string } | null;
};

export async function getOrder(
  orderId: string
): Promise<{ order: OrderView; items: OrderItemView[] } | null> {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, total, created_at")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return null;

  const { data: itemRows } = await supabase
    .from("order_items")
    .select("id, quantity, selected_options, note, subtotal, menu_items(name)")
    .eq("order_id", orderId)
    .returns<OrderItemRow[]>();

  return {
    order: {
      id: order.id,
      status: order.status as OrderStatus,
      total: order.total,
      createdAt: order.created_at,
    },
    items: (itemRows ?? []).map((row) => ({
      id: row.id,
      menuItemName: row.menu_items?.name ?? "Producto",
      quantity: row.quantity,
      selectedOptions: row.selected_options,
      note: row.note,
      subtotal: row.subtotal,
    })),
  };
}
