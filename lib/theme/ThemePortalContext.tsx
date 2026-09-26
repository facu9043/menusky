"use client";

import { createContext, useContext, type RefObject } from "react";

// Los sheets (carrito, detalle de producto, campanita) se portan fuera del
// div que tiene aplicado el theme del restaurante (bg-popover, --card, etc.
// no llegan ahí porque las variables CSS solo se heredan por descendencia
// real en el DOM, y el portal por default cuelga de document.body). Este
// contexto le pasa al <Sheet> el contenedor correcto para que se porte dentro
// del subárbol temeado en vez de al body.
export const ThemePortalContext = createContext<RefObject<HTMLElement | null> | null>(null);

export function useThemePortalContainer() {
  return useContext(ThemePortalContext);
}
