import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types/database.types";
import type { CartSelectedOption } from "@/lib/types/cart";

export interface OrderItemView {
  id: string;
  menuItemName: string;
  photoUrl: string | null;
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

// Forma que devuelve la función get_public_order (migración 0004).
type PublicOrderPayload = {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    selectedOptions: CartSelectedOption[] | null;
    note: string | null;
    subtotal: number;
    menuItemName: string | null;
    photoUrl: string | null;
  }[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// El pedido solo se lee con el qr_token de la mesa Y el id del pedido: un
// pedido ajeno, o con un token que no es el de su mesa, es "no existe" (null).
export async function getOrder(
  qrToken: string,
  orderId: string
): Promise<{ order: OrderView; items: OrderItemView[] } | null> {
  // Un id que no es uuid no puede existir; evita un error de la base.
  if (!UUID_RE.test(orderId)) return null;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_public_order", {
    p_qr_token: qrToken,
    p_order_id: orderId,
  });

  if (error) {
    // TEMP-COMPAT-0004: base sin la migración (la función no existe todavía).
    // Quitar cuando 0004 esté aplicada en producción.
    if (error.code === "PGRST202" || error.code === "42883") {
      return getOrderLegacy(qrToken, orderId);
    }
    return null;
  }
  if (!data) return null;

  const payload = data as unknown as PublicOrderPayload;
  return {
    order: {
      id: payload.id,
      status: payload.status,
      total: payload.total,
      createdAt: payload.createdAt,
    },
    items: (payload.items ?? []).map((row) => ({
      id: row.id,
      menuItemName: row.menuItemName ?? "Producto",
      photoUrl: row.photoUrl ?? null,
      quantity: row.quantity,
      selectedOptions: row.selectedOptions ?? [],
      note: row.note,
      subtotal: row.subtotal,
    })),
  };
}

type OrderItemRow = {
  id: string;
  quantity: number;
  selected_options: CartSelectedOption[];
  note: string | null;
  subtotal: number;
  menu_items: { name: string; photo_url: string | null } | null;
};

// TEMP-COMPAT-0004: camino viejo (lectura directa). Con la base migrada RLS lo
// bloquea y no se ejecuta. Aun así exige que el pedido sea de la mesa del token.
async function getOrderLegacy(
  qrToken: string,
  orderId: string
): Promise<{ order: OrderView; items: OrderItemView[] } | null> {
  const supabase = await createClient();

  const { data: table } = await supabase
    .from("tables")
    .select("id")
    .eq("qr_token", qrToken)
    .maybeSingle();
  if (!table) return null;

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, total, created_at")
    .eq("id", orderId)
    .eq("table_id", table.id)
    .maybeSingle();

  if (!order) return null;

  const { data: itemRows } = await supabase
    .from("order_items")
    .select("id, quantity, selected_options, note, subtotal, menu_items(name, photo_url)")
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
      photoUrl: row.menu_items?.photo_url ?? null,
      quantity: row.quantity,
      selectedOptions: row.selected_options,
      note: row.note,
      subtotal: row.subtotal,
    })),
  };
}
