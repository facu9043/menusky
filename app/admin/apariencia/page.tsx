import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getRestaurantTheme } from "@/lib/admin/getRestaurantTheme";
import { AppearanceEditor } from "@/components/admin/AppearanceEditor";

export default async function AdminAppearancePage() {
  const staff = await getStaffUser();
  if (!staff) return null;

  const theme = await getRestaurantTheme(staff.restaurantId);

  return <AppearanceEditor restaurantId={staff.restaurantId} currentTheme={theme} />;
}
