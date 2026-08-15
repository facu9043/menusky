import { createClient } from "@/lib/supabase/client";

export async function createOptionChoice(
  optionGroupId: string,
  name: string,
  extraPrice: number,
  sortOrder: number
) {
  const supabase = createClient();
  const { error } = await supabase.from("item_option_choices").insert({
    option_group_id: optionGroupId,
    name,
    extra_price: extraPrice,
    sort_order: sortOrder,
  });
  if (error) throw error;
}

export async function deleteOptionChoice(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("item_option_choices").delete().eq("id", id);
  if (error) throw error;
}
