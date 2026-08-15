import { LogoutButton } from "@/components/staff/LogoutButton";

export function NotAdminAccess() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-medium">Esta sección es solo para administradores</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Tu usuario no tiene el rol de admin. Pedile al administrador que te lo
        asigne si necesitás acceder acá.
      </p>
      <LogoutButton />
    </div>
  );
}
