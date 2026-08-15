import { createClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/lib/types/database.types";

export interface StaffUser {
  id: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  role: StaffRole;
}

type StaffRow = {
  id: string;
  restaurant_id: string;
  name: string;
  role: StaffRole;
  restaurants: { name: string } | null;
};

// Devuelve null tanto si no hay sesión como si el usuario logueado no está
// vinculado a ningún restaurante (staff_users) — ambos casos se tratan igual
// en los paneles: "no tenés acceso".
export async function getStaffUser(): Promise<StaffUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: staff } = await supabase
    .from("staff_users")
    .select("id, restaurant_id, name, role, restaurants(name)")
    .eq("auth_user_id", user.id)
    .maybeSingle()
    .returns<StaffRow>();

  if (!staff) return null;

  return {
    id: staff.id,
    restaurantId: staff.restaurant_id,
    restaurantName: staff.restaurants?.name ?? "Restaurante",
    name: staff.name,
    role: staff.role,
  };
}
