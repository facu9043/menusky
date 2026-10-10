import type { Metadata } from "next";
import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getAdminMenu } from "@/lib/admin/getAdminMenu";
import { MenuBoard } from "@/components/admin/carta/MenuBoard";

export const metadata: Metadata = {
  title: "Carta",
};

export default async function AdminMenuPage() {
  const staff = await getStaffUser();
  // Rol antes de cualquier lectura (CA-NR.01, SEC-AF-01): el layout muestra
  // NotAdminAccess, pero la página se renderiza igual (y viaja en el RSC).
  if (!staff || staff.role !== "admin") return null;

  // Lanza AdminDataError si la lectura falla: lo atrapa error.tsx (CA-11.5),
  // así un error nunca se ve como "carta vacía".
  const categories = await getAdminMenu(staff.restaurantId);

  return <MenuBoard restaurantId={staff.restaurantId} categories={categories} />;
}
