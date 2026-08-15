import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getAdminMenu } from "@/lib/admin/getAdminMenu";
import { CategoryList } from "@/components/admin/CategoryList";

export default async function AdminMenuPage() {
  const staff = await getStaffUser();
  if (!staff) return null;

  const categories = await getAdminMenu(staff.restaurantId);

  return <CategoryList restaurantId={staff.restaurantId} categories={categories} />;
}
