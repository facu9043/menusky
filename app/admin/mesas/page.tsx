import type { Metadata } from "next";
import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getAdminTables } from "@/lib/admin/getAdminTables";
import { TableList } from "@/components/admin/TableList";

export const metadata: Metadata = {
  title: "Mesas",
};

// Parte 4a: la pantalla de Mesas sigue con su componente actual, dentro del
// shell nuevo. El rediseño (HU-8) llega en la parte 4b.
export default async function AdminTablesPage() {
  const staff = await getStaffUser();
  if (!staff) return null;

  const tables = await getAdminTables(staff.restaurantId);

  return (
    <div className="adm-page">
      <p className="adm-eyebrow">Mesas</p>
      <h1 className="adm-h1">Mesas</h1>
      <TableList restaurantId={staff.restaurantId} tables={tables} />
    </div>
  );
}
