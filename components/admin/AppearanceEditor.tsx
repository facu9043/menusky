"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ThemePresetCard } from "@/components/admin/ThemePresetCard";
import { ThemeCustomEditor } from "@/components/admin/ThemeCustomEditor";
import { updateRestaurantTheme } from "@/lib/admin/theme";
import { THEME_PRESETS, findPresetByTheme } from "@/lib/theme/presets";
import type { RestaurantTheme } from "@/lib/theme/types";

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
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="mb-1 font-[family-name:var(--font-staff-display)] text-lg font-semibold">
          Apariencia
        </h1>
        <p className="text-sm text-muted-foreground">
          Elegí un tema predefinido o armá tu propia paleta. Se aplica en la
          carta que ven tus clientes al escanear el QR de la mesa.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {THEME_PRESETS.map((preset) => (
          <ThemePresetCard
            key={preset.key}
            preset={preset}
            isActive={activePreset?.key === preset.key}
            disabled={applyingKey !== null}
            onSelect={() => handleSelectPreset(preset.theme, preset.key)}
          />
        ))}
      </div>

      <ThemeCustomEditor
        // key: fuerza un remount cuando cambia el theme guardado (ej. al
        // aplicar un preset) para que el estado local del editor no quede
        // desincronizado y termine pisando el cambio con valores viejos.
        key={JSON.stringify(currentTheme)}
        restaurantId={restaurantId}
        initialTheme={currentTheme}
      />
    </div>
  );
}
