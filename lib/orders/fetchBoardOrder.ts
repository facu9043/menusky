import { createClient } from "@/lib/supabase/client";
import {
  BOARD_ORDER_SELECT,
  mapBoardOrderRow,
  type BoardOrder,
  type BoardOrderRow,
} from "@/lib/orders/board";

// Contraparte client-side de getKitchenOrders: trae un único pedido completo
// (con ítems y mesa) cuando llega un evento realtime de INSERT y solo
// tenemos el id.
export async function fetchBoardOrder(orderId: string): Promise<BoardOrder | null> {
  const supabase = createClient();

  const { data } = await supabase
    .from("orders")
    .select(BOARD_ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle()
    .returns<BoardOrderRow>();

  return data ? mapBoardOrderRow(data) : null;
}
