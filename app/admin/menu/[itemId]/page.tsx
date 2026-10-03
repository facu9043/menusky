import { notFound, redirect } from "next/navigation";
import { getStaffUser } from "@/lib/auth/getStaffUser";
import { getAdminMenu } from "@/lib/admin/getAdminMenu";

// Entrada directa a un plato (CA-NR.20, CA-7.11): si el plato es de este
// restaurante, se abre la Carta con su hoja de edición; si no existe o es de
// otro restaurante, 404 sin filtrar nada. Cerrar la hoja deja en Carta.
export default async function AdminMenuItemPage({
  params,
}: PageProps<"/admin/menu/[itemId]">) {
  const { itemId } = await params;
  const staff = await getStaffUser();
  if (!staff) return null;

  const categories = await getAdminMenu(staff.restaurantId);
  const exists = categories.some((c) => c.items.some((i) => i.id === itemId));

  if (!exists) notFound();

  redirect(`/admin/menu?plato=${encodeURIComponent(itemId)}`);
}
