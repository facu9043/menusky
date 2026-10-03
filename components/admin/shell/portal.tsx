"use client";

import { createContext, useContext } from "react";

// Los popups de base-ui (hojas, diálogos, menús) se portan a <body>, fuera
// del contenedor .ms-brand.ms-admin: sin esta clase no les llegarían los
// tokens --ms-* ni la fuente display. El layout pasa la clase completa.
const AdminPortalClassContext = createContext("ms-brand ms-admin");

export function AdminPortalClassProvider({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return <AdminPortalClassContext.Provider value={className}>{children}</AdminPortalClassContext.Provider>;
}

export function useAdminPortalClass(): string {
  return useContext(AdminPortalClassContext);
}
