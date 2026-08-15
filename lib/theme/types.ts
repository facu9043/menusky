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
}

export const THEME_KEYS: (keyof RestaurantTheme)[] = [
  "background",
  "cardBackground",
  "textPrimary",
  "textSecondary",
  "accentPrimary",
  "accentSecondary",
  "waiterButton",
];
