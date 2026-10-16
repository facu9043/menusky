"use client";

import { StaffError } from "@/components/staff/StaffStates";

// Error inesperado al armar el panel: nunca se muestra como vacío. "Reintentar"
// vuelve a pedir los datos del segmento sin recargar la página.
export default function FloorError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <StaffError title="Salón" text="No pudimos cargar el salón" retry={retry} />;
}
