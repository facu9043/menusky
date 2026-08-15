// Contraste WCAG. Una sola fuente de verdad usada tanto para elegir
// automáticamente el color de texto sobre cada acento (temas predefinidos y
// personalizados) como para los avisos de legibilidad del editor de
// /admin/apariencia.

function srgbChannel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const NEAR_WHITE = "#FFFFFF";
const NEAR_BLACK = "#111111";

// Elige negro o blanco como color de texto sobre `hex`, el que dé más contraste.
export function getForegroundColor(hex: string): string {
  return contrastRatio(hex, NEAR_WHITE) >= contrastRatio(hex, NEAR_BLACK)
    ? NEAR_WHITE
    : NEAR_BLACK;
}

// AA: 4.5:1 para texto normal, 3:1 para texto grande (>=18px o >=14px bold).
export function meetsWcagAA(foreground: string, background: string, largeText = false): boolean {
  return contrastRatio(foreground, background) >= (largeText ? 3 : 4.5);
}
