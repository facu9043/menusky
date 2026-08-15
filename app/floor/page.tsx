import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getFloorTables } from "@/lib/floor/getFloorTables";
import { getFloorOrders } from "@/lib/orders/getFloorOrders";
import { getTableTotals } from "@/lib/orders/getTableTotals";
import { getPendingWaiterCalls } from "@/lib/waiterCalls/getPendingWaiterCalls";
import { StaffShell } from "@/components/staff/StaffShell";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { NoStaffAccess } from "@/components/staff/NoStaffAccess";
import { FloorBoard } from "@/components/floor/FloorBoard";

export default async function FloorPage() {
  const staff = await getStaffUser();
  if (!staff) return <NoStaffAccess />;

  const [tables, orders, calls, tableTotals] = await Promise.all([
    getFloorTables(staff.restaurantId),
    getFloorOrders(staff.restaurantId),
    getPendingWaiterCalls(staff.restaurantId),
    getTableTotals(staff.restaurantId),
  ]);

  return (
    <StaffShell restaurantId={staff.restaurantId}>
      <StaffHeader title="Salón" staff={staff} />
      <FloorBoard
        restaurantId={staff.restaurantId}
        tables={tables}
        initialOrders={orders}
        initialCalls={calls}
        initialTableTotals={tableTotals}
      />
    </StaffShell>
  );
}
