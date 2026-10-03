import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CartSelectedOption } from "@/lib/types/cart";

interface OrderItemInput {
  menuItemId: string;
  quantity: number;
  choiceIds: string[];
  note?: string;
}

interface CreateOrderBody {
  qrToken: string;
  items: OrderItemInput[];
}

type MenuItemRow = {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  categories: { restaurant_id: string } | null;
  item_option_groups: {
    id: string;
    name: string;
    selection_type: "single" | "multiple";
    is_required: boolean;
    item_option_choices: { id: string; name: string; extra_price: number }[];
  }[];
};

export async function POST(request: Request) {
  let body: CreateOrderBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { qrToken, items } = body;
  if (
    !qrToken ||
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 50 ||
    items.some(
      (i) =>
        !i ||
        !i.menuItemId ||
        !Number.isInteger(i.quantity) ||
        i.quantity < 1 ||
        i.quantity > 99
    )
  ) {
    return NextResponse.json({ error: "Faltan datos del pedido" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: table } = await supabase
    .from("tables")
    .select("id, restaurant_id")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (!table) {
    return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
  }

  const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select(
      `id, name, price, is_available,
       categories ( restaurant_id ),
       item_option_groups (
         id, name, selection_type, is_required,
         item_option_choices ( id, name, extra_price )
       )`
    )
    .in("id", menuItemIds)
    .returns<MenuItemRow[]>();

  const menuItemById = new Map((menuItems ?? []).map((m) => [m.id, m]));

  const orderItemsToInsert: {
    menu_item_id: string;
    quantity: number;
    selected_options: CartSelectedOption[];
    note: string | null;
    subtotal: number;
  }[] = [];
  let total = 0;

  for (const input of items) {
    const menuItem = menuItemById.get(input.menuItemId);
    if (
      !menuItem ||
      !menuItem.is_available ||
      menuItem.categories?.restaurant_id !== table.restaurant_id
    ) {
      return NextResponse.json(
        { error: "Uno de los platos ya no está disponible" },
        { status: 409 }
      );
    }

    const choiceIds = new Set(input.choiceIds ?? []);
    const selectedOptions: CartSelectedOption[] = [];

    for (const group of menuItem.item_option_groups) {
      const chosenInGroup = group.item_option_choices.filter((c) =>
        choiceIds.has(c.id)
      );

      if (group.is_required && chosenInGroup.length === 0) {
        return NextResponse.json(
          { error: `Falta elegir "${group.name}" en "${menuItem.name}"` },
          { status: 400 }
        );
      }
      if (group.selection_type === "single" && chosenInGroup.length > 1) {
        return NextResponse.json(
          { error: `"${group.name}" en "${menuItem.name}" admite una sola opción` },
          { status: 400 }
        );
      }

      for (const choice of chosenInGroup) {
        selectedOptions.push({
          groupId: group.id,
          groupName: group.name,
          choiceId: choice.id,
          choiceName: choice.name,
          extraPrice: choice.extra_price,
        });
      }
    }

    const unitPrice =
      menuItem.price + selectedOptions.reduce((sum, o) => sum + o.extraPrice, 0);
    const subtotal = unitPrice * input.quantity;
    total += subtotal;

    orderItemsToInsert.push({
      menu_item_id: menuItem.id,
      quantity: input.quantity,
      selected_options: selectedOptions,
      note: (typeof input.note === "string" ? input.note.trim() : "") || null,
      subtotal,
    });
  }

  // 0004: el pedido se crea con la función create_order, que recalcula el total
  // en la base (el total de arriba solo sirve para validar). Los campos que no
  // están en este mapeo (total, status, restaurant_id...) nunca llegan a la base.
  const { data: orderId, error: rpcError } = await supabase.rpc("create_order", {
    p_qr_token: qrToken,
    p_items: items.map((i) => ({
      menu_item_id: i.menuItemId,
      quantity: i.quantity,
      choice_ids: Array.isArray(i.choiceIds) ? i.choiceIds : [],
      note: typeof i.note === "string" ? i.note : null,
    })),
  });

  if (!rpcError && orderId) {
    return NextResponse.json({ orderId });
  }

  if (rpcError && !isMissingFunction(rpcError)) {
    // Nunca se devuelve rpcError.message al cliente (RNF-S3).
    switch (rpcError.message) {
      case "item_unavailable":
        return NextResponse.json(
          { error: "Uno de los platos ya no está disponible" },
          { status: 409 }
        );
      case "table_not_found":
        return NextResponse.json({ error: "Mesa no encontrada" }, { status: 404 });
      case "invalid_items":
      case "missing_required":
      case "single_choice_exceeded":
        return NextResponse.json({ error: "Faltan datos del pedido" }, { status: 400 });
      default:
        return NextResponse.json({ error: "No se pudo crear el pedido" }, { status: 500 });
    }
  }

  if (!rpcError) {
    return NextResponse.json({ error: "No se pudo crear el pedido" }, { status: 500 });
  }

  // TEMP-COMPAT-0004: la función create_order todavía no existe (base sin la
  // migración 0004). Camino viejo: insert directo. Con la base ya migrada este
  // camino no se ejecuta (y RLS lo bloquearía). Quitar cuando 0004 esté
  // aplicada en producción (docs/releases/admin-migracion-0004.md).
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ table_id: table.id, restaurant_id: table.restaurant_id, total })
    .select("id")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "No se pudo crear el pedido" }, { status: 500 });
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemsToInsert.map((item) => ({ ...item, order_id: order.id })));

  if (itemsError) {
    return NextResponse.json({ error: "No se pudo guardar el pedido" }, { status: 500 });
  }

  return NextResponse.json({ orderId: order.id });
}

// PostgREST responde PGRST202 cuando la función no existe en el schema cache;
// Postgres directo, 42883 (undefined_function).
function isMissingFunction(error: { code?: string }): boolean {
  return error.code === "PGRST202" || error.code === "42883";
}
