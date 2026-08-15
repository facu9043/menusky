import { createClient } from "@/lib/supabase/server";
import { DEFAULT_THEME } from "@/lib/theme/presets";
import type { RestaurantTheme } from "@/lib/theme/types";

export async function getRestaurantTheme(restaurantId: string): Promise<RestaurantTheme> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("restaurants")
    .select("theme")
    .eq("id", restaurantId)
    .maybeSingle();

  return data?.theme ?? DEFAULT_THEME;
}
