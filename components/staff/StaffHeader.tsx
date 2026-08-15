import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/staff/LogoutButton";
import { StaffNav } from "@/components/staff/StaffNav";
import type { StaffUser } from "@/lib/auth/getStaffUser";

const ROLE_LABELS: Record<StaffUser["role"], string> = {
  admin: "Admin",
  waiter: "Mozo",
  kitchen: "Cocina",
};

export function StaffHeader({
  title,
  staff,
}: {
  title: string;
  staff: StaffUser;
}) {
  return (
    <>
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold leading-tight">{title}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {staff.restaurantName} · {staff.name}
          </p>
        </div>
        <Badge variant="secondary">{ROLE_LABELS[staff.role]}</Badge>
        <LogoutButton />
      </header>
      <StaffNav role={staff.role} restaurantId={staff.restaurantId} />
    </>
  );
}
