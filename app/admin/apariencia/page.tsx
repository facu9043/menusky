import type { Metadata } from "next";
import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getRestaurantTheme } from "@/lib/admin/getRestaurantTheme";
import { AppearanceEditor } from "@/components/admin/AppearanceEditor";

export const metadata: Metadata = {
  title: "Apariencia",
};

// Parte 4a: el editor de temas sigue con su componente actual (que trae su
// propio h1 "Apariencia"), dentro del shell nuevo. Rediseño en la parte 4b.
export default async function AdminAppearancePage() {
  const staff = await getStaffUser();
  if (!staff) return null;

  const theme = await getRestaurantTheme(staff.restaurantId);

  return (
    <div className="adm-page">
      <AppearanceEditor restaurantId={staff.restaurantId} currentTheme={theme} />
    </div>
  );
}
