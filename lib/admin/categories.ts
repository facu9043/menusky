import { createClient } from "@/lib/supabase/client";

export async function createCategory(restaurantId: string, name: string, sortOrder: number) {
  const supabase = createClient();
  const { error } = await supabase
    .from("categories")
    .insert({ restaurant_id: restaurantId, name, sort_order: sortOrder });
  if (error) throw error;
}

export async function renameCategory(id: string, name: string) {
  const supabase = createClient();
  const { error } = await supabase.from("categories").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
