import type { SupabaseClient } from "@supabase/supabase-js";

export interface TableByToken {
  id: string;
  label: string;
  restaurant_id: string;
}

// Resuelve la mesa de un qr_token SIN sesion (SEC-AF-02, D-21): con la migracion 0004
// la tabla `tables` ya no es legible por el publico; solo la funcion
// get_table_by_token (token exacto, devuelve lo minimo) responde por una mesa.
// Devuelve null si el token no existe.
export async function getTableByToken(
  supabase: SupabaseClient,
  qrToken: string
): Promise<TableByToken | null> {
  if (typeof qrToken !== "string" || qrToken.length === 0) return null;

  const { data, error } = await supabase.rpc("get_table_by_token", {
    p_qr_token: qrToken,
  });

  if (error) {
    // TEMP-COMPAT-0004: base sin la migracion (la funcion no existe todavia): lectura
    // directa vieja. Con la base migrada no se ejecuta (y RLS la dejaria sin filas).
    // Quitar cuando 0004 este aplicada en produccion (docs/releases/admin-migracion-0004.md).
    if (error.code === "PGRST202" || error.code === "42883") {
      const { data: row } = await supabase
        .from("tables")
        .select("id, label, restaurant_id")
        .eq("qr_token", qrToken)
        .maybeSingle();
      return (row as TableByToken | null) ?? null;
    }
    return null;
  }

  if (!data || typeof data !== "object") return null;
  const t = data as Partial<TableByToken>;
  if (!t.id || !t.label || !t.restaurant_id) return null;
  return { id: t.id, label: t.label, restaurant_id: t.restaurant_id };
}
