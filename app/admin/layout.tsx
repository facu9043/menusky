import { getStaffUser } from "@/lib/auth/getStaffUser";
import { StaffShell } from "@/components/staff/StaffShell";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { NoStaffAccess } from "@/components/staff/NoStaffAccess";
import { NotAdminAccess } from "@/components/staff/NotAdminAccess";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const staff = await getStaffUser();
  if (!staff) return <NoStaffAccess />;
  if (staff.role !== "admin") return <NotAdminAccess />;

  return (
    <StaffShell restaurantId={staff.restaurantId}>
      <StaffHeader title="Administración" staff={staff} />
      <AdminNav />
      <main className="flex-1">{children}</main>
    </StaffShell>
  );
}
