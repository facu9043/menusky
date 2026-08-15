import { createClient } from "@/lib/supabase/server";

export interface FloorTable {
  id: string;
  label: string;
}

// El estado de cada mesa (libre / con pedido / llamando) se calcula en el
// cliente a partir de los pedidos activos y los llamados pendientes, así
// que acá solo hace falta el listado de mesas.
export async function getFloorTables(restaurantId: string): Promise<FloorTable[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tables")
    .select("id, label")
    .eq("restaurant_id", restaurantId)
    .order("label", { ascending: true });

  return data ?? [];
}
