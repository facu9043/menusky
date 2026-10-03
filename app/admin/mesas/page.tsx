import type { Metadata } from "next";
import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getAdminTables } from "@/lib/admin/getAdminTables";
import { TablesBoard } from "@/components/admin/mesas/TablesBoard";

export const metadata: Metadata = {
  title: "Mesas",
};

export default async function AdminTablesPage() {
  const staff = await getStaffUser();
  if (!staff) return null;

  // Lanza AdminDataError si la lectura falla: lo atrapa error.tsx (CA-11.5),
  // así un error nunca se ve como "sin mesas".
  const tables = await getAdminTables(staff.restaurantId);

  return <TablesBoard restaurantId={staff.restaurantId} tables={tables} />;
}
