import { createClient } from "@/lib/supabase/server";
import { assertNoDbError } from "@/lib/admin/errors";
import type { AdminCategory, AdminMenuItem } from "@/lib/types/adminMenu";

type MenuItemRow = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  photo_url: string | null;
  is_available: boolean;
  sort_order: number;
  item_option_groups: {
    id: string;
    name: string;
    selection_type: "single" | "multiple";
    is_required: boolean;
    sort_order: number;
    item_option_choices: {
      id: string;
      name: string;
      extra_price: number;
      sort_order: number;
    }[];
  }[];
};

type CategoryRow = {
  id: string;
  name: string;
  sort_order: number;
  menu_items: MenuItemRow[];
};

const sortBy = <T extends { sort_order: number }>(rows: T[]) =>
  [...rows].sort((a, b) => a.sort_order - b.sort_order);

// A diferencia de getTableMenu, acá NO se filtran los platos no disponibles
// — el admin necesita verlos todos para poder reactivarlos.
export async function getAdminMenu(restaurantId: string): Promise<AdminCategory[]> {
  const supabase = await createClient();

  const { data: categoryRows, error } = await supabase
    .from("categories")
    .select(
      `id, name, sort_order,
       menu_items (
         id, category_id, name, description, price, photo_url, is_available, sort_order,
         item_option_groups (
           id, name, selection_type, is_required, sort_order,
           item_option_choices ( id, name, extra_price, sort_order )
         )
       )`
    )
    .eq("restaurant_id", restaurantId)
    .returns<CategoryRow[]>();
  assertNoDbError(error, "carta");

  return sortBy(categoryRows ?? []).map((category) => {
    const items: AdminMenuItem[] = sortBy(category.menu_items).map((item) => ({
      id: item.id,
      categoryId: item.category_id,
      name: item.name,
      description: item.description,
      price: item.price,
      photoUrl: item.photo_url,
      isAvailable: item.is_available,
      optionGroups: sortBy(item.item_option_groups).map((group) => ({
        id: group.id,
        name: group.name,
        selectionType: group.selection_type,
        isRequired: group.is_required,
        choices: sortBy(group.item_option_choices).map((choice) => ({
          id: choice.id,
          name: choice.name,
          extraPrice: choice.extra_price,
        })),
      })),
    }));

    return { id: category.id, name: category.name, items };
  });
}
