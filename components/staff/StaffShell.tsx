import type { CSSProperties } from "react";
import { getRestaurantTheme } from "@/lib/admin/getRestaurantTheme";
import { getForegroundColor } from "@/lib/theme/contrast";

// Estética fija tipo "consola" para cocina/salón/admin — no hereda el
// theme del restaurante (fondo, tarjetas, tipografía quedan iguales para
// todos), salvo un único acento de marca: --primary pasa a ser el
// accentPrimary del restaurante, así los botones de acción principal
// (Tomar pedido, Marcar listo, Entregado, Guardar) y la navegación activa
// se sienten "de esa marca" sin sacrificar legibilidad rápida.
export async function StaffShell({
  restaurantId,
  className = "",
  children,
}: {
  restaurantId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const theme = await getRestaurantTheme(restaurantId);

  return (
    <div
      className={`dark flex min-h-screen flex-col bg-background text-foreground ${className}`}
      style={
        {
          "--primary": theme.accentPrimary,
          "--primary-foreground": getForegroundColor(theme.accentPrimary),
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
