import { createClient } from "@/lib/supabase/client";
import type { OptionSelectionType } from "@/lib/types/database.types";

export async function createOptionGroup(
  menuItemId: string,
  name: string,
  selectionType: OptionSelectionType,
  isRequired: boolean,
  sortOrder: number
) {
  const supabase = createClient();
  const { error } = await supabase.from("item_option_groups").insert({
    menu_item_id: menuItemId,
    name,
    selection_type: selectionType,
    is_required: isRequired,
    sort_order: sortOrder,
  });
  if (error) throw error;
}

export async function updateOptionGroup(
  id: string,
  fields: { name: string; selectionType: OptionSelectionType; isRequired: boolean }
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("item_option_groups")
    .update({
      name: fields.name,
      selection_type: fields.selectionType,
      is_required: fields.isRequired,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteOptionGroup(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("item_option_groups").delete().eq("id", id);
  if (error) throw error;
}
