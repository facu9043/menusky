"use client";

import { LogOut } from "lucide-react";
import { useLogout } from "@/components/admin/shell/useLogout";

// "Cerrar sesión" con texto visible (CA-8.4) en las pantallas sin permiso.
// Misma lógica de siempre: signOut, /login y refresh (useLogout, CA-NR.02).
export function LogoutButton() {
  const { logout, loggingOut } = useLogout();

  return (
    <button type="button" className="adm-btn" disabled={loggingOut} onClick={logout}>
      <LogOut aria-hidden="true" />
      Cerrar sesión
    </button>
  );
}
