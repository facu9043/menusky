import { createClient } from "@/lib/supabase/client";
import type { RestaurantTheme } from "@/lib/theme/types";

// Cubierto por la policy "admin update restaurants" (0001_init.sql) — ya
// permite a un admin actualizar cualquier columna de su restaurante.
export async function updateRestaurantTheme(restaurantId: string, theme: RestaurantTheme) {
  const supabase = createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ theme })
    .eq("id", restaurantId);
  if (error) throw error;
}
