import type { CSSProperties } from "react";
import { getForegroundColor } from "@/lib/theme/contrast";
import type { RestaurantTheme } from "@/lib/theme/types";

// Traduce el theme de un restaurante a las variables CSS que ya consumen
// los componentes de shadcn/ui (Button, Card, Badge, etc. usan --primary,
// --background, --card...) más las dos nuevas para el botón de mozo. Se
// aplica como `style` en el layout de /m/[tableId] — al ser variables CSS
// heredadas, todo lo que ya usa esas clases de Tailwind (bg-primary,
// text-muted-foreground...) se re-pinta solo, sin tocar cada componente.
export function themeToCssVars(theme: RestaurantTheme): CSSProperties {
  return {
    "--background": theme.background,
    "--card": theme.cardBackground,
    "--card-foreground": theme.textPrimary,
    // Los sheets (carrito, detalle de producto, campanita) usan bg-popover,
    // no --card — sin esto quedan blancos sin importar el theme. Mismo tono
    // que las tarjetas para que se sientan parte de la misma superficie.
    "--popover": theme.cardBackground,
    "--popover-foreground": theme.textPrimary,
    "--foreground": theme.textPrimary,
    "--muted": "color-mix(in srgb, var(--foreground) 8%, var(--background))",
    "--muted-foreground": theme.textSecondary,
    "--primary": theme.accentPrimary,
    "--primary-foreground": getForegroundColor(theme.accentPrimary),
    "--secondary": theme.accentSecondary,
    "--secondary-foreground": getForegroundColor(theme.accentSecondary),
    "--waiter": theme.waiterButton,
    "--waiter-foreground": getForegroundColor(theme.waiterButton),
  } as CSSProperties;
}
