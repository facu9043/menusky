import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getAdminMenu } from "@/lib/admin/getAdminMenu";
import { MenuItemEditForm } from "@/components/admin/MenuItemEditForm";
import { OptionGroupsEditor } from "@/components/admin/OptionGroupsEditor";

export default async function AdminMenuItemPage({
  params,
}: PageProps<"/admin/menu/[itemId]">) {
  const { itemId } = await params;
  const staff = await getStaffUser();
  if (!staff) return null;

  const categories = await getAdminMenu(staff.restaurantId);
  const item = categories.flatMap((c) => c.items).find((i) => i.id === itemId);

  if (!item) notFound();

  return (
    <div className="flex flex-col gap-6 p-4">
      <Link
        href="/admin/menu"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a la carta
      </Link>

      <MenuItemEditForm item={item} />
      <OptionGroupsEditor item={item} />
    </div>
  );
}
