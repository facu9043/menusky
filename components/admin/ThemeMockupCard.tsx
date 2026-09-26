import { BellRing } from "lucide-react";
import { getForegroundColor } from "@/lib/theme/contrast";
import { formatPrice } from "@/lib/format";
import type { RestaurantTheme } from "@/lib/theme/types";

// Preview de cómo se ve una tarjeta de plato con esta paleta. Usa estilos
// inline directos (no las variables CSS de la app) a propósito: este
// componente vive en /admin, que nunca debe heredar el tema del
// restaurante — cada preview queda aislado y puede mostrar un theme
// distinto al que está aplicado en ese momento.
export function ThemeMockupCard({ theme }: { theme: RestaurantTheme }) {
  const isBrutal = theme.style === "brutal";
  const isNeumorphic = theme.style === "neumorphic";
  const isClay = theme.style === "clay";
  const hardEdge = isBrutal
    ? { border: `2px solid ${theme.textPrimary}`, boxShadow: `3px 3px 0 0 ${theme.textPrimary}` }
    : {};
  // Misma fórmula que app/globals.css: sombra clara + oscura derivadas del
  // propio color de fondo del bloque, para que "salga" de esa superficie
  // en vez de destacarse por color.
  const softEdge = (bg: string) =>
    isNeumorphic
      ? {
          border: "none",
          boxShadow: `4px 4px 8px color-mix(in srgb, ${bg} 70%, black), -4px -4px 8px color-mix(in srgb, ${bg} 90%, white)`,
        }
      : {};
  // Clay: sombra externa oscura grande + sombra interna clara, fijas (no
  // derivadas del color del bloque) — acá el objeto SÍ tiene su propio color
  // distinto del fondo, es lo que da el volumen "inflado".
  const clayEdge = isClay
    ? {
        border: "none",
        boxShadow:
          "-4px -4px 10px rgba(255,255,255,0.5), 6px 6px 16px rgba(0,0,0,0.22), inset 2px 2px 5px rgba(0,0,0,0.1), inset -2px -2px 5px rgba(255,255,255,0.4)",
      }
    : {};
  const radius = (soft: number) =>
    isBrutal ? 0 : isNeumorphic || isClay ? Math.max(soft, 12) : soft;

  return (
    <div style={{ background: theme.background, borderRadius: radius(10), padding: 14 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <span
          style={{
            background: theme.accentSecondary,
            color: getForegroundColor(theme.accentSecondary),
            fontSize: 11,
            fontWeight: isBrutal ? 700 : 600,
            padding: "5px 12px",
            borderRadius: isNeumorphic || isClay ? 999 : radius(999),
            ...hardEdge,
            ...softEdge(theme.accentSecondary),
            ...clayEdge,
          }}
        >
          Principales
        </span>
        <span style={{ color: theme.textSecondary, fontSize: 11, fontWeight: 500, padding: "5px 12px" }}>
          Bebidas
        </span>
      </div>
      <div
        style={{
          background: theme.cardBackground,
          borderRadius: radius(8),
          padding: 10,
          display: "flex",
          gap: 10,
          alignItems: "center",
          ...hardEdge,
          ...softEdge(theme.cardBackground),
          ...clayEdge,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: isBrutal ? 0 : 6,
            background: theme.textPrimary,
            opacity: 0.15,
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: theme.textPrimary }}>
            Bife de chorizo
          </div>
          <div style={{ fontSize: 11, color: theme.textSecondary, margin: "2px 0 4px" }}>
            Con guarnición a elección
          </div>
          <div style={{ fontWeight: 600, fontSize: 12, color: theme.accentPrimary }}>
            {formatPrice(12500)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <div
          style={{
            background: theme.accentPrimary,
            color: getForegroundColor(theme.accentPrimary),
            fontWeight: isBrutal ? 700 : 600,
            fontSize: 12,
            padding: "7px 12px",
            borderRadius: radius(6),
            textTransform: isBrutal ? "uppercase" : "none",
            ...hardEdge,
            ...softEdge(theme.accentPrimary),
            ...clayEdge,
          }}
        >
          Enviar pedido
        </div>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: isBrutal ? 0 : "50%",
            background: theme.waiterButton,
            color: getForegroundColor(theme.waiterButton),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            ...hardEdge,
            ...softEdge(theme.waiterButton),
            ...clayEdge,
          }}
        >
          <BellRing size={14} />
        </div>
      </div>
    </div>
  );
}
