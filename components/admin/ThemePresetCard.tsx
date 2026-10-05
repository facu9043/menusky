"use client";

import { Check } from "lucide-react";
import { ThemeMockupCard } from "@/components/admin/ThemeMockupCard";
import type { ThemePreset } from "@/lib/theme/presets";

// Tarjeta de un tema (CA-10.2): borde y sombra sello; el activo se marca con
// el texto "Activo" + ícono además del aro cheddar, y su botón dice "Tema
// actual" (deshabilitado). Mientras se aplica uno, todos quedan deshabilitados
// y el elegido dice "Aplicando..." (CA-10.4).
export function ThemePresetCard({
  preset,
  isActive,
  isDefault,
  applying,
  disabled,
  onSelect,
}: {
  preset: ThemePreset;
  isActive: boolean;
  isDefault: boolean;
  applying: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="adm-preset" data-active={isActive || undefined}>
      <div className="adm-preset__head">
        <h3 className="adm-preset__name">{preset.label}</h3>
        {isDefault ? <span className="adm-tag adm-tag--default">Predeterminado</span> : null}
        {isActive ? (
          <span className="adm-tag adm-tag--active">
            <Check aria-hidden="true" />
            Activo
          </span>
        ) : null}
      </div>
      <ThemeMockupCard theme={preset.theme} />
      <button type="button" className="adm-btn" disabled={disabled || isActive} onClick={onSelect}>
        {isActive ? "Tema actual" : applying ? "Aplicando..." : "Usar este tema"}
      </button>
    </li>
  );
}
