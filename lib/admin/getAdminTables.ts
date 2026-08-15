import { createClient } from "@/lib/supabase/server";

export interface AdminTable {
  id: string;
  label: string;
  qrToken: string;
}

export async function getAdminTables(restaurantId: string): Promise<AdminTable[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("tables")
    .select("id, label, qr_token")
    .eq("restaurant_id", restaurantId)
    .order("label", { ascending: true });

  return (data ?? []).map((t) => ({ id: t.id, label: t.label, qrToken: t.qr_token }));
}
