import { redirect } from "next/navigation";
import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getKitchenOrders } from "@/lib/orders/getKitchenOrders";
import { getTableTotals } from "@/lib/orders/getTableTotals";
import { StaffShell } from "@/components/staff/StaffShell";
import { NoStaffAccess } from "@/components/staff/NoStaffAccess";
import { OrderBoard } from "@/components/kitchen/OrderBoard";
import { KitchenEmpty } from "@/components/kitchen/KitchenEmpty";

export default async function KitchenPage() {
  const staff = await getStaffUser();
  if (!staff) return <NoStaffAccess />;
  // R-2: el mozo va a su panel; admin y cocina ven este (sin bucles).
  if (staff.role === "waiter") redirect("/floor");

  const [orders, tableTotals] = await Promise.all([
    getKitchenOrders(staff.restaurantId),
    getTableTotals(staff.restaurantId),
  ]);

  return (
    <StaffShell title="Cocina" staff={staff}>
      <OrderBoard
        restaurantId={staff.restaurantId}
        initialOrders={orders}
        initialTableTotals={tableTotals}
        empty={<KitchenEmpty />}
      />
    </StaffShell>
  );
}
