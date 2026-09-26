import type { CSSProperties } from "react";
import { Fraunces } from "next/font/google";
import { getRestaurantTheme } from "@/lib/admin/getRestaurantTheme";
import { getForegroundColor } from "@/lib/theme/contrast";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-staff-display",
  display: "swap",
});

// Estética tipo "consola" para cocina/salón/admin — sigue siendo oscura y de
// alto contraste a propósito (legibilidad rápida bajo presión en cocina),
// pero ahora sí se siente "de ese restaurante":
// - Fraunces (la misma tipografía de títulos que ve el cliente) en los
//   encabezados de StaffHeader, en vez de la sans genérica para todo.
// - El fondo/tarjetas oscuros llevan un tinte del accentPrimary del
//   restaurante (color-mix), en vez de un gris-negro neutro igual para
//   cualquiera.
// - accentSecondary también entra en juego (--secondary), no solo el
//   primario.
// - data-theme-style reutiliza los mismos bloques CSS de
//   app/globals.css (brutal/neumorphic/clay) que ya aplican por
//   [data-slot="card"|"button"|"badge"|...] — así los paneles de staff
//   heredan bordes/sombra/esquinas del mismo estilo elegido para la carta,
//   sin duplicar CSS.
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
      data-theme-style={theme.style ?? "soft"}
      className={`dark ${fraunces.variable} flex min-h-screen flex-col bg-background text-foreground ${className}`}
      style={
        {
          "--primary": theme.accentPrimary,
          "--primary-foreground": getForegroundColor(theme.accentPrimary),
          "--secondary": theme.accentSecondary,
          "--secondary-foreground": getForegroundColor(theme.accentSecondary),
          "--background": `color-mix(in srgb, ${theme.accentPrimary} 14%, #111318)`,
          "--card": `color-mix(in srgb, ${theme.accentPrimary} 10%, #181B22)`,
          "--popover": `color-mix(in srgb, ${theme.accentPrimary} 10%, #181B22)`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
