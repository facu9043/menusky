import { ShieldAlert } from "lucide-react";
import { AccessDenied } from "@/components/staff/AccessDenied";

export function NotAdminAccess() {
  return (
    <AccessDenied icon={ShieldAlert} title="Esta sección es solo para administradores">
      Tu usuario no tiene el rol de admin. Pedile al administrador que te lo asigne si necesitás acceder
      acá.
    </AccessDenied>
  );
}
