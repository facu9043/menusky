import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getAdminTables } from "@/lib/admin/getAdminTables";
import { TableList } from "@/components/admin/TableList";

export default async function AdminTablesPage() {
  const staff = await getStaffUser();
  if (!staff) return null;

  const tables = await getAdminTables(staff.restaurantId);

  return <TableList restaurantId={staff.restaurantId} tables={tables} />;
}
