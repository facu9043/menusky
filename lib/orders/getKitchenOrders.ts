import { createClient } from "@/lib/supabase/server";
import {
  BOARD_ORDER_SELECT,
  mapBoardOrderRow,
  type BoardOrder,
  type BoardOrderRow,
} from "@/lib/orders/board";

// Cocina solo se ocupa de pedidos "received" (recién llegado) e "in_kitchen"
// (lo está preparando); al marcarlo "ready" pasa a ser responsabilidad del
// panel de salón.
export async function getKitchenOrders(restaurantId: string): Promise<BoardOrder[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(BOARD_ORDER_SELECT)
    .eq("restaurant_id", restaurantId)
    .in("status", ["received", "in_kitchen"])
    .order("created_at", { ascending: true })
    .returns<BoardOrderRow[]>();

  return (data ?? []).map(mapBoardOrderRow);
}
