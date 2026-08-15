import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { TableMenuData, CategoryData, MenuItemData } from "@/lib/types/menu";
import type { RestaurantTheme } from "@/lib/theme/types";

type MenuItemRow = {
  id: string;
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

type TableRow = {
  id: string;
  label: string;
  qr_token: string;
  restaurant_id: string;
  restaurants: {
    id: string;
    name: string;
    logo_url: string | null;
    theme: RestaurantTheme | null;
  } | null;
};

const sortBy = <T extends { sort_order: number }>(rows: T[]) =>
  [...rows].sort((a, b) => a.sort_order - b.sort_order);

// cache() dedupea esta consulta entre el layout y el page de /m/[tableId]
// para que solo se ejecute una vez por request.
export const getTableMenu = cache(
  async (qrToken: string): Promise<TableMenuData | null> => {
    const supabase = await createClient();

    const { data: table } = await supabase
      .from("tables")
      .select("id, label, qr_token, restaurant_id, restaurants(id, name, logo_url, theme)")
      .eq("qr_token", qrToken)
      .returns<TableRow[]>()
      .maybeSingle();

    if (!table || !table.restaurants) return null;

    const { data: categoryRows } = await supabase
      .from("categories")
      .select(
        `id, name, sort_order,
         menu_items (
           id, name, description, price, photo_url, is_available, sort_order,
           item_option_groups (
             id, name, selection_type, is_required, sort_order,
             item_option_choices ( id, name, extra_price, sort_order )
           )
         )`
      )
      .eq("restaurant_id", table.restaurant_id)
      .returns<CategoryRow[]>();

    const categories: CategoryData[] = sortBy(categoryRows ?? [])
      .map((category): CategoryData => {
        const items: MenuItemData[] = sortBy(
          category.menu_items.filter((item) => item.is_available)
        ).map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          photoUrl: item.photo_url,
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
      })
      .filter((category) => category.items.length > 0);

    return {
      restaurant: {
        id: table.restaurants.id,
        name: table.restaurants.name,
        logoUrl: table.restaurants.logo_url,
        theme: table.restaurants.theme,
      },
      table: { id: table.id, label: table.label, qrToken: table.qr_token },
      categories,
    };
  }
);
