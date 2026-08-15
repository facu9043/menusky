"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeMockupCard } from "@/components/admin/ThemeMockupCard";
import { cn } from "@/lib/utils";
import type { ThemePreset } from "@/lib/theme/presets";

export function ThemePresetCard({
  preset,
  isActive,
  disabled,
  onSelect,
}: {
  preset: ThemePreset;
  isActive: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <Card className={cn("flex flex-col gap-2 p-3", isActive && "ring-2 ring-primary")}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{preset.label}</span>
        {isActive && <Badge variant="secondary">Activo</Badge>}
      </div>
      <ThemeMockupCard theme={preset.theme} />
      <Button
        type="button"
        size="sm"
        variant={isActive ? "outline" : "default"}
        disabled={disabled || isActive}
        onClick={onSelect}
      >
        {isActive ? "Tema actual" : "Usar este tema"}
      </Button>
    </Card>
  );
}
