// Paleta completa de un restaurante. Todos los valores son hex (#rrggbb).
// Este es el único lugar donde se define la forma del `theme` — sumar un
// campo acá lo propaga a presets, al validador de contraste y al editor de
// /admin/apariencia sin tocar nada más.
export interface RestaurantTheme {
  background: string;
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
  accentPrimary: string;
  accentSecondary: string;
  waiterButton: string;
  // Variante estructural (bordes/sombra/esquinas), no un color — por eso
  // queda afuera de THEME_KEYS: el editor de paleta personalizada y el
  // validador de contraste solo iteran colores. Ausente = "soft" (el look
  // actual). Ver [lib/theme/applyTheme.ts] y los bloques
  // `[data-theme-style="brutal"]` / `[data-theme-style="neumorphic"]` /
  // `[data-theme-style="clay"]` en app/globals.css.
  style?: "soft" | "brutal" | "neumorphic" | "clay";
}

// Tupla literal (no solo `(keyof RestaurantTheme)[]`) para que `style`
// -no siendo parte de esta lista- quede excluido a nivel de tipos, no solo
// en tiempo de ejecución.
export const THEME_KEYS = [
  "background",
  "cardBackground",
  "textPrimary",
  "textSecondary",
  "accentPrimary",
  "accentSecondary",
  "waiterButton",
] as const satisfies readonly (keyof RestaurantTheme)[];
