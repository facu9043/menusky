import { createClient } from "@/lib/supabase/client";

export async function createMenuItem(categoryId: string, sortOrder: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({ category_id: categoryId, name: "Nuevo plato", price: 0, sort_order: sortOrder })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("No se pudo crear el plato");
  return data.id as string;
}

export interface MenuItemFields {
  name: string;
  description: string;
  price: number;
  photoUrl: string;
  isAvailable: boolean;
}

export async function updateMenuItem(id: string, fields: MenuItemFields) {
  const supabase = createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({
      name: fields.name,
      description: fields.description.trim() || null,
      price: fields.price,
      photo_url: fields.photoUrl.trim() || null,
      is_available: fields.isAvailable,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setMenuItemAvailability(id: string, isAvailable: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMenuItem(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw error;
}
