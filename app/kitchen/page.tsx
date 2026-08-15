import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getKitchenOrders } from "@/lib/orders/getKitchenOrders";
import { getTableTotals } from "@/lib/orders/getTableTotals";
import { StaffShell } from "@/components/staff/StaffShell";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { NoStaffAccess } from "@/components/staff/NoStaffAccess";
import { OrderBoard } from "@/components/kitchen/OrderBoard";

export default async function KitchenPage() {
  const staff = await getStaffUser();
  if (!staff) return <NoStaffAccess />;

  const [orders, tableTotals] = await Promise.all([
    getKitchenOrders(staff.restaurantId),
    getTableTotals(staff.restaurantId),
  ]);

  return (
    <StaffShell restaurantId={staff.restaurantId}>
      <StaffHeader title="Cocina" staff={staff} />
      <OrderBoard
        restaurantId={staff.restaurantId}
        initialOrders={orders}
        initialTableTotals={tableTotals}
      />
    </StaffShell>
  );
}
