import { createClient } from "@/lib/supabase/client";
import type { OrderStatus } from "@/lib/types/database.types";

// Requiere sesión de staff: la policy RLS "staff update orders" es la que
// autoriza esto (is_staff_of(restaurant_id)), no hace falta pasar por una
// API route.
export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const supabase = createClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
}
