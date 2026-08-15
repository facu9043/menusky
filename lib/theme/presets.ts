import type { RestaurantTheme } from "@/lib/theme/types";

export interface ThemePreset {
  key: string;
  label: string;
  theme: RestaurantTheme;
}

// Sumar un tema nuevo = agregar una entrada acá. No hace falta tocar ningún
// componente: la carta del cliente y el editor de /admin/apariencia leen
// esta lista dinámicamente.
export const THEME_PRESETS: ThemePreset[] = [
  {
    key: "default",
    label: "Default",
    theme: {
      background: "#F5EDE0",
      cardBackground: "#F5CDA0",
      textPrimary: "#1C1917",
      textSecondary: "#4F473F",
      accentPrimary: "#E8590C",
      accentSecondary: "#1D3557",
      waiterButton: "#1C1917",
    },
  },
  {
    key: "glaciar",
    label: "Glaciar",
    theme: {
      background: "#DCEFF6",
      cardBackground: "#B9E4F0",
      textPrimary: "#0B2A3B",
      textSecondary: "#3E5F6E",
      accentPrimary: "#0EA5C9",
      accentSecondary: "#2563A6",
      waiterButton: "#FF7A59",
    },
  },
  {
    key: "galaxia",
    label: "Galaxia",
    theme: {
      background: "#0B0B14",
      cardBackground: "#16162B",
      textPrimary: "#F5F3FF",
      textSecondary: "#A29DC7",
      accentPrimary: "#C742F0",
      accentSecondary: "#5B8CFF",
      waiterButton: "#22D3C9",
    },
  },
  {
    key: "madera",
    label: "Madera",
    theme: {
      background: "#EDDDC0",
      cardBackground: "#E7C48A",
      textPrimary: "#3B2A1E",
      textSecondary: "#5C4A34",
      accentPrimary: "#C98A2C",
      accentSecondary: "#6B4226",
      waiterButton: "#B24C2F",
    },
  },
];

export const DEFAULT_THEME: RestaurantTheme = THEME_PRESETS[0].theme;

export function findPresetByTheme(theme: RestaurantTheme): ThemePreset | null {
  return (
    THEME_PRESETS.find((preset) =>
      (Object.keys(preset.theme) as (keyof RestaurantTheme)[]).every(
        (key) => preset.theme[key].toLowerCase() === theme[key]?.toLowerCase()
      )
    ) ?? null
  );
}
