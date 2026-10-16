import { Unlink } from "lucide-react";
import { AccessDenied } from "@/components/staff/AccessDenied";

export function NoStaffAccess() {
  return (
    <AccessDenied icon={Unlink} title="Tu cuenta no está vinculada a ningún restaurante">
      Pedile al administrador que te agregue en la tabla <code>staff_users</code>.
    </AccessDenied>
  );
}
