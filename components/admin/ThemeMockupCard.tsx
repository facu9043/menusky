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
  return (
    <div style={{ background: theme.background, borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <span
          style={{
            background: theme.accentSecondary,
            color: getForegroundColor(theme.accentSecondary),
            fontSize: 11,
            fontWeight: 600,
            padding: "5px 12px",
            borderRadius: 999,
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
          borderRadius: 8,
          padding: 10,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 6,
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
            fontWeight: 600,
            fontSize: 12,
            padding: "7px 12px",
            borderRadius: 6,
          }}
        >
          Enviar pedido
        </div>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: theme.waiterButton,
            color: getForegroundColor(theme.waiterButton),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <BellRing size={14} />
        </div>
      </div>
    </div>
  );
}
