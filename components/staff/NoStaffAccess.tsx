import { LogoutButton } from "@/components/staff/LogoutButton";

export function NoStaffAccess() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-medium">Tu cuenta no está vinculada a ningún restaurante</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Pedile al administrador que te agregue en la tabla{" "}
        <code className="rounded bg-muted px-1 py-0.5">staff_users</code>.
      </p>
      <LogoutButton />
    </div>
  );
}
