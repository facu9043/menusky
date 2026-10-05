import type { Metadata } from "next";
import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getRestaurantTheme } from "@/lib/admin/getRestaurantTheme";
import { AppearanceEditor } from "@/components/admin/AppearanceEditor";

export const metadata: Metadata = {
  title: "Apariencia",
};

// Apariencia (HU-10). Si la lectura del tema falla, la atrapa error.tsx
// (CA-11.5): nunca se edita sobre el tema predeterminado como si fuera el
// guardado.
export default async function AdminAppearancePage() {
  const staff = await getStaffUser();
  if (!staff) return null;

  // Lanza AdminDataError si la lectura falla.
  const theme = await getRestaurantTheme(staff.restaurantId);

  return (
    <div className="adm-page">
      <AppearanceEditor restaurantId={staff.restaurantId} currentTheme={theme} />
    </div>
  );
}
