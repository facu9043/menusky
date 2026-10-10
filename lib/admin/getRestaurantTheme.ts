import { assertNoDbError } from "@/lib/admin/errors";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_THEME } from "@/lib/theme/presets";
import type { RestaurantTheme } from "@/lib/theme/types";

export async function getRestaurantTheme(restaurantId: string): Promise<RestaurantTheme> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("restaurants")
    .select("theme")
    .eq("id", restaurantId)
    .maybeSingle();
  assertNoDbError(error, "tema");

  return data?.theme ?? DEFAULT_THEME;
}

// Para el layout de los paneles de staff (cocina y salón): si la lectura del tema
// falla, el panel sigue funcionando con el tema por defecto en vez de caerse.
export async function getRestaurantThemeOrDefault(restaurantId: string): Promise<RestaurantTheme> {
  try {
    return await getRestaurantTheme(restaurantId);
  } catch {
    return DEFAULT_THEME;
  }
}
