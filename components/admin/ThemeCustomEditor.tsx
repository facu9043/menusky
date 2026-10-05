"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { ThemeMockupCard } from "@/components/admin/ThemeMockupCard";
import { updateRestaurantTheme } from "@/lib/admin/theme";
import { getForegroundColor, meetsWcagAA } from "@/lib/theme/contrast";
import { THEME_KEYS } from "@/lib/theme/types";
import type { RestaurantTheme } from "@/lib/theme/types";

type ThemeKey = (typeof THEME_KEYS)[number];

const FIELD_LABELS: Record<ThemeKey, string> = {
  background: "Fondo",
  cardBackground: "Fondo de tarjeta",
  textPrimary: "Texto principal",
  textSecondary: "Texto secundario",
  accentPrimary: "Acento primario (precios, botón de pedido)",
  accentSecondary: "Acento secundario (navegación, tabs)",
  waiterButton: "Botón de llamar al mozo",
};

const HEX_ERROR = "Usá un color con el formato #RRGGBB (por ejemplo #FFC21A).";

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

// Paleta personalizada (CA-10.1, CA-10.5, CA-10.6). Las 7 reglas y textos de
// contraste son los de siempre; una regla se omite mientras uno de sus colores
// no sea un hex válido (ese campo ya muestra su error). Un hex inválido bloquea
// "Guardar": un valor así en restaurants.theme rompería la carta del cliente.
export function ThemeCustomEditor({
  restaurantId,
  initialTheme,
}: {
  restaurantId: string;
  initialTheme: RestaurantTheme;
}) {
  const router = useRouter();
  const uid = useId();
  const [theme, setTheme] = useState(initialTheme);
  const [saving, setSaving] = useState(false);
  // El error de un campo se muestra al salir de él o al completar 7 caracteres,
  // no a mitad de escritura.
  const [touched, setTouched] = useState<Partial<Record<ThemeKey, true>>>({});

  const setField = (key: ThemeKey, value: string) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  const invalid = THEME_KEYS.filter((k) => !isValidHex(theme[k]));

  const warnings = useMemo(() => {
    const ok = (...keys: ThemeKey[]) => keys.every((k) => isValidHex(theme[k]));
    const list: string[] = [];
    if (ok("textPrimary", "background") && !meetsWcagAA(theme.textPrimary, theme.background)) {
      list.push('"Texto principal" puede ser difícil de leer sobre "Fondo".');
    }
    if (ok("textSecondary", "background") && !meetsWcagAA(theme.textSecondary, theme.background)) {
      list.push('"Texto secundario" puede ser difícil de leer sobre "Fondo".');
    }
    if (ok("textPrimary", "cardBackground") && !meetsWcagAA(theme.textPrimary, theme.cardBackground)) {
      list.push('"Texto principal" puede ser difícil de leer sobre "Fondo de tarjeta".');
    }
    if (ok("textSecondary", "cardBackground") && !meetsWcagAA(theme.textSecondary, theme.cardBackground)) {
      list.push('"Texto secundario" puede ser difícil de leer sobre "Fondo de tarjeta".');
    }
    if (ok("accentPrimary") && !meetsWcagAA(getForegroundColor(theme.accentPrimary), theme.accentPrimary, true)) {
      list.push('El texto del botón de pedido puede ser difícil de leer sobre "Acento primario".');
    }
    if (ok("accentSecondary") && !meetsWcagAA(getForegroundColor(theme.accentSecondary), theme.accentSecondary, true)) {
      list.push('El texto de las tabs puede ser difícil de leer sobre "Acento secundario".');
    }
    if (ok("waiterButton") && !meetsWcagAA(getForegroundColor(theme.waiterButton), theme.waiterButton, true)) {
      list.push("El ícono del botón de mozo puede ser difícil de ver sobre ese color.");
    }
    return list;
  }, [theme]);

  const handleSave = async () => {
    if (invalid.length > 0) return;
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

  const handleReset = () => {
    setTheme(initialTheme);
    setTouched({});
  };

  const warnId = `${uid}-warn`;
  const previewId = `${uid}-prev`;

  return (
    <>
      <section className="adm-custom" aria-labelledby={`${uid}-title`}>
        <h2 id={`${uid}-title`} className="adm-h2">
          Paleta personalizada
        </h2>
        <div className="adm-custom__grid">
          <ul className="adm-colors">
            {THEME_KEYS.map((key) => {
              const value = theme[key];
              const valid = isValidHex(value);
              const showError = !valid && (touched[key] || value.length >= 7);
              const id = `${uid}-${key}`;
              return (
                <li key={key} className="adm-color">
                  <span
                    className={valid ? "adm-swatch" : "adm-swatch adm-swatch--invalid"}
                    style={valid ? { background: value } : undefined}
                  >
                    <input
                      type="color"
                      value={valid ? value : "#000000"}
                      onChange={(e) => setField(key, e.target.value)}
                      aria-label={`${FIELD_LABELS[key]}: selector de color`}
                    />
                  </span>
                  <div className="adm-field">
                    <label className="adm-label" htmlFor={id}>
                      {FIELD_LABELS[key]}
                    </label>
                    <input
                      id={id}
                      className="adm-input adm-hex"
                      value={value}
                      spellCheck={false}
                      autoComplete="off"
                      aria-invalid={showError || undefined}
                      aria-describedby={showError ? `${id}-err` : undefined}
                      onChange={(e) => setField(key, e.target.value)}
                      onBlur={() => setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }))}
                    />
                    {showError ? (
                      <p id={`${id}-err`} className="adm-error">
                        {HEX_ERROR}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <div>
            <span className="adm-preview-label" id={previewId}>
              Vista previa
            </span>
            <figure
              className="adm-preview"
              aria-labelledby={previewId}
              aria-describedby={warnings.length > 0 ? warnId : undefined}
            >
              <ThemeMockupCard theme={theme} />
            </figure>
            <div id={warnId} role="status" className={warnings.length > 0 ? "adm-look__warn" : undefined}>
              {warnings.map((warning) => (
                <p key={warning}>
                  <TriangleAlert aria-hidden="true" />
                  {warning}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="adm-look__actions">
        <button type="button" className="adm-btn" onClick={handleReset}>
          Restablecer
        </button>
        <button
          type="button"
          className="adm-btn adm-btn--save"
          disabled={saving || invalid.length > 0}
          onClick={handleSave}
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </>
  );
}
