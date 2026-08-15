import { createClient } from "@/lib/supabase/server";
import {
  BOARD_ORDER_SELECT,
  mapBoardOrderRow,
  type BoardOrder,
  type BoardOrderRow,
} from "@/lib/orders/board";

// Salón necesita ver todos los pedidos activos (no solo "ready"): además de
// los listos para llevar, usa "received"/"in_kitchen" para saber qué mesas
// tienen un pedido en curso en el tablero de mesas.
export async function getFloorOrders(restaurantId: string): Promise<BoardOrder[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(BOARD_ORDER_SELECT)
    .eq("restaurant_id", restaurantId)
    .in("status", ["received", "in_kitchen", "ready"])
    .order("created_at", { ascending: true })
    .returns<BoardOrderRow[]>();

  return (data ?? []).map(mapBoardOrderRow);
}
