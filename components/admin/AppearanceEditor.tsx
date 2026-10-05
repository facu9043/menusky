"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ThemePresetCard } from "@/components/admin/ThemePresetCard";
import { ThemeCustomEditor } from "@/components/admin/ThemeCustomEditor";
import { updateRestaurantTheme } from "@/lib/admin/theme";
import { DEFAULT_THEME, THEME_PRESETS, findPresetByTheme } from "@/lib/theme/presets";
import type { RestaurantTheme } from "@/lib/theme/types";

// Apariencia (HU-10), idéntica a docs/design/admin/maquetas/apariencia.html.
// Misma función que antes (CA-10.1): mismos temas, misma paleta, mismo
// guardado y restablecer; solo cambia el aspecto y se suma la validación de
// hex (CA-10.6, en ThemeCustomEditor).
export function AppearanceEditor({
  restaurantId,
  currentTheme,
}: {
  restaurantId: string;
  currentTheme: RestaurantTheme;
}) {
  const router = useRouter();
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const activePreset = findPresetByTheme(currentTheme);
  const defaultKey = findPresetByTheme(DEFAULT_THEME)?.key;

  const handleSelectPreset = async (theme: RestaurantTheme, key: string) => {
    setApplyingKey(key);
    try {
      await updateRestaurantTheme(restaurantId, theme);
      toast.success("Tema aplicado");
      router.refresh();
    } catch {
      toast.error("No se pudo aplicar el tema");
    } finally {
      setApplyingKey(null);
    }
  };

  return (
    <>
      <header className="adm-home__head">
        <p className="adm-eyebrow">Apariencia</p>
        <h1 className="adm-h1">Tu carta, a tu estilo</h1>
      </header>
      <p className="adm-look__intro">
        Elegí un tema predefinido o armá tu propia paleta. Se aplica en la carta que ven tus clientes al
        escanear el QR de la mesa.
      </p>

      <h2 className="adm-h2 adm-home__h2">Temas</h2>
      <ul className="adm-presets">
        {THEME_PRESETS.map((preset) => (
          <ThemePresetCard
            key={preset.key}
            preset={preset}
            isActive={activePreset?.key === preset.key}
            isDefault={preset.key === defaultKey}
            applying={applyingKey === preset.key}
            disabled={applyingKey !== null}
            onSelect={() => handleSelectPreset(preset.theme, preset.key)}
          />
        ))}
      </ul>

      <ThemeCustomEditor
        // key: fuerza un remount cuando cambia el theme guardado (ej. al
        // aplicar un preset) para que el estado local del editor no quede
        // desincronizado y termine pisando el cambio con valores viejos.
        key={JSON.stringify(currentTheme)}
        restaurantId={restaurantId}
        initialTheme={currentTheme}
      />
    </>
  );
}
