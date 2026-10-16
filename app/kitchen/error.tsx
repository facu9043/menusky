"use client";

import { StaffError } from "@/components/staff/StaffStates";

// Error inesperado al armar el panel: nunca se muestra como vacío. "Reintentar"
// vuelve a pedir los datos del segmento sin recargar la página.
export default function KitchenError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <StaffError title="Cocina" text="No pudimos cargar los pedidos" retry={retry} />;
}
