import { THEME_KEYS, type RestaurantTheme } from "@/lib/theme/types";

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
  {
    key: "neobrutalista",
    label: "Neobrutalista",
    theme: {
      background: "#FFF7E6",
      cardBackground: "#FFC53D",
      textPrimary: "#141414",
      textSecondary: "#3A3A3A",
      accentPrimary: "#E63946",
      accentSecondary: "#FFC53D",
      waiterButton: "#E63946",
      style: "brutal",
    },
  },
  {
    key: "neumorfismo",
    label: "Neumorfismo",
    theme: {
      // cardBackground = background a propósito: en neumorfismo la tarjeta
      // no se diferencia por color, "sale" del mismo fondo solo por la
      // sombra doble (ver bloque [data-theme-style="neumorphic"] en
      // app/globals.css).
      background: "#E7E2D8",
      cardBackground: "#E7E2D8",
      textPrimary: "#3A362E",
      textSecondary: "#7A7466",
      accentPrimary: "#C97B5A",
      accentSecondary: "#5E8B7E",
      waiterButton: "#C97B5A",
      style: "neumorphic",
    },
  },
  {
    key: "claymorfismo",
    label: "Claymorfismo",
    theme: {
      background: "#F4F1FB",
      cardBackground: "#FFD6A5",
      textPrimary: "#2E2A3D",
      textSecondary: "#6B647F",
      accentPrimary: "#FF6F61",
      accentSecondary: "#4ECDC4",
      waiterButton: "#FF6F61",
      style: "clay",
    },
  },
];

export const DEFAULT_THEME: RestaurantTheme = THEME_PRESETS[0].theme;

export function findPresetByTheme(theme: RestaurantTheme): ThemePreset | null {
  return (
    THEME_PRESETS.find(
      (preset) =>
        THEME_KEYS.every(
          (key) => preset.theme[key].toLowerCase() === theme[key]?.toLowerCase()
        ) && (preset.theme.style ?? "soft") === (theme.style ?? "soft")
    ) ?? null
  );
}
