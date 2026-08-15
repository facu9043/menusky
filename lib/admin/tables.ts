import { createClient } from "@/lib/supabase/client";
import { generateQrToken } from "@/lib/admin/generateQrToken";

export async function createTable(restaurantId: string, label: string) {
  const supabase = createClient();
  const qrToken = generateQrToken(label);
  const { error } = await supabase
    .from("tables")
    .insert({ restaurant_id: restaurantId, label, qr_token: qrToken });
  if (error) throw error;
}

export async function deleteTable(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tables").delete().eq("id", id);
  if (error) throw error;
}
