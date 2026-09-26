"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeMockupCard } from "@/components/admin/ThemeMockupCard";
import { updateRestaurantTheme } from "@/lib/admin/theme";
import { getForegroundColor, meetsWcagAA } from "@/lib/theme/contrast";
import { THEME_KEYS } from "@/lib/theme/types";
import type { RestaurantTheme } from "@/lib/theme/types";

const FIELD_LABELS: Record<(typeof THEME_KEYS)[number], string> = {
  background: "Fondo",
  cardBackground: "Fondo de tarjeta",
  textPrimary: "Texto principal",
  textSecondary: "Texto secundario",
  accentPrimary: "Acento primario (precios, botón de pedido)",
  accentSecondary: "Acento secundario (navegación, tabs)",
  waiterButton: "Botón de llamar al mozo",
};

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function ThemeCustomEditor({
  restaurantId,
  initialTheme,
}: {
  restaurantId: string;
  initialTheme: RestaurantTheme;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState(initialTheme);
  const [saving, setSaving] = useState(false);

  const setField = (key: (typeof THEME_KEYS)[number], value: string) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  const warnings = useMemo(() => {
    const list: string[] = [];
    if (!meetsWcagAA(theme.textPrimary, theme.background)) {
      list.push('"Texto principal" puede ser difícil de leer sobre "Fondo".');
    }
    if (!meetsWcagAA(theme.textSecondary, theme.background)) {
      list.push('"Texto secundario" puede ser difícil de leer sobre "Fondo".');
    }
    if (!meetsWcagAA(theme.textPrimary, theme.cardBackground)) {
      list.push('"Texto principal" puede ser difícil de leer sobre "Fondo de tarjeta".');
    }
    if (!meetsWcagAA(theme.textSecondary, theme.cardBackground)) {
      list.push('"Texto secundario" puede ser difícil de leer sobre "Fondo de tarjeta".');
    }
    if (!meetsWcagAA(getForegroundColor(theme.accentPrimary), theme.accentPrimary, true)) {
      list.push('El texto del botón de pedido puede ser difícil de leer sobre "Acento primario".');
    }
    if (!meetsWcagAA(getForegroundColor(theme.accentSecondary), theme.accentSecondary, true)) {
      list.push('El texto de las tabs puede ser difícil de leer sobre "Acento secundario".');
    }
    if (!meetsWcagAA(getForegroundColor(theme.waiterButton), theme.waiterButton, true)) {
      list.push('El ícono del botón de mozo puede ser difícil de ver sobre ese color.');
    }
    return list;
  }, [theme]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRestaurantTheme(restaurantId, theme);
      toast.success("Paleta guardada");
      router.refresh();
    } catch {
      toast.error("No se pudo guardar la paleta");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setTheme(initialTheme);

  return (
    <Card className="flex flex-col gap-4 p-4">
      <h2 className="font-semibold">Paleta personalizada</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          {THEME_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="color"
                value={isValidHex(theme[key]) ? theme[key] : "#000000"}
                onChange={(e) => setField(key, e.target.value)}
                className="h-9 w-9 shrink-0 cursor-pointer rounded-md border"
                aria-label={FIELD_LABELS[key]}
              />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">{FIELD_LABELS[key]}</Label>
                <Input
                  value={theme[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="h-7 font-mono text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium text-muted-foreground">Vista previa</span>
          <ThemeMockupCard theme={theme} />
          {warnings.length > 0 && (
            <div className="flex flex-col gap-1 rounded-md border border-destructive/30 bg-destructive/5 p-2">
              {warnings.map((warning) => (
                <p key={warning} className="text-xs text-destructive">
                  {warning}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="button" disabled={saving} onClick={handleSave}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          Restablecer
        </Button>
      </div>
    </Card>
  );
}
