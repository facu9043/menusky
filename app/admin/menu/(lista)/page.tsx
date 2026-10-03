import type { Metadata } from "next";
import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getAdminMenu } from "@/lib/admin/getAdminMenu";
import { MenuBoard } from "@/components/admin/carta/MenuBoard";

export const metadata: Metadata = {
  title: "Carta",
};

export default async function AdminMenuPage() {
  const staff = await getStaffUser();
  if (!staff) return null;

  // Lanza AdminDataError si la lectura falla: lo atrapa error.tsx (CA-11.5),
  // así un error nunca se ve como "carta vacía".
  const categories = await getAdminMenu(staff.restaurantId);

  return <MenuBoard restaurantId={staff.restaurantId} categories={categories} />;
}
