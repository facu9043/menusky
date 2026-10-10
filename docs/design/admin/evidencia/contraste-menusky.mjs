// Contraste del tema MenuSky (HU-4, CA-4.2 y CA-4.7) y selección de preset
// (CA-4.3, CA-4.4). Usa el código REAL de la app: lib/theme/presets.ts y
// lib/theme/contrast.ts (Node >= 23.6 quita los tipos de TypeScript; un hook
// de resolución traduce el alias "@/"). Sin dependencias.
//
// Uso (desde la raíz del repo):
//   node docs/design/admin/evidencia/contraste-menusky.mjs > docs/design/admin/evidencia/contraste-menusky.txt
//
// Equivalente de docs/qa/scripts/14-contrast-themes.mjs para la app: ese
// script mide la copia de los temas que tiene la landing (que no cambia,
// CA-4.8), así que no incluye MenuSky. Acá se miden los 8 presets de la app
// con las 7 reglas del editor (components/admin/ThemeCustomEditor.tsx) y los
// pares de texto que pinta la carta (lib/theme/applyTheme.ts).
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

const ROOT = process.cwd();
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      return next(pathToFileURL(resolvePath(ROOT, specifier.slice(2) + ".ts")).href, context);
    }
    return next(specifier, context);
  },
});

const { THEME_PRESETS, DEFAULT_THEME, findPresetByTheme } = await import("@/lib/theme/presets");
const { contrastRatio, getForegroundColor, meetsWcagAA } = await import("@/lib/theme/contrast");

const fmt = (n) => n.toFixed(2);
let fails = 0;
const check = (ok, label) => {
  if (!ok) fails++;
  console.log(`${ok ? "OK  " : "FALLA"} ${label}`);
};

// Las 7 reglas del editor, en el mismo orden y con los mismos umbrales.
function editorRules(t) {
  const fgP = getForegroundColor(t.accentPrimary);
  const fgS = getForegroundColor(t.accentSecondary);
  const fgW = getForegroundColor(t.waiterButton);
  return [
    ["Texto principal / Fondo", t.textPrimary, t.background, false],
    ["Texto secundario / Fondo", t.textSecondary, t.background, false],
    ["Texto principal / Fondo de tarjeta", t.textPrimary, t.cardBackground, false],
    ["Texto secundario / Fondo de tarjeta", t.textSecondary, t.cardBackground, false],
    ["Texto del botón de pedido / Acento primario (grande)", fgP, t.accentPrimary, true],
    ["Texto de las tabs / Acento secundario (grande)", fgS, t.accentSecondary, true],
    ["Ícono del botón de mozo / Botón de mozo (grande)", fgW, t.waiterButton, true],
  ].map(([label, fg, bg, large]) => ({ label, fg, bg, large, ratio: contrastRatio(fg, bg), ok: meetsWcagAA(fg, bg, large) }));
}

console.log("Contraste del tema MenuSky y de los 8 presets de lib/theme/presets.ts");
console.log(`Fecha: ${new Date().toISOString().slice(0, 10)}. Fórmula WCAG 2.x de lib/theme/contrast.ts.`);
console.log("Umbral: 4,5:1 texto normal; 3:1 texto grande (reglas 5 a 7 del editor).\n");

const menusky = THEME_PRESETS[0];
console.log("== 1. MenuSky: valores ==");
console.log(JSON.stringify(menusky, null, 2) + "\n");

console.log("== 2. MenuSky: las 7 reglas del editor (CA-4.2 pide 0 avisos) ==");
const rules = editorRules(menusky.theme);
for (const r of rules) check(r.ok, `${r.label}: ${r.fg} sobre ${r.bg} = ${fmt(r.ratio)}:1`);
console.log(`Avisos del editor: ${rules.filter((r) => !r.ok).length}\n`);

console.log("== 3. MenuSky: pares que pinta la carta (/m) con texto normal (>= 4,5) ==");
const t = menusky.theme;
const extra = [
  ["Precio / acento primario como texto sobre Fondo", t.accentPrimary, t.background],
  ["Precio / acento primario como texto sobre Fondo de tarjeta", t.accentPrimary, t.cardBackground],
  ["Texto del botón \"Ver pedido\" (--primary-foreground) sobre --primary", getForegroundColor(t.accentPrimary), t.accentPrimary],
  ["Texto de tab activa (--secondary-foreground) sobre --secondary", getForegroundColor(t.accentSecondary), t.accentSecondary],
  ["Ícono/texto del botón de mozo (--waiter-foreground) sobre --waiter", getForegroundColor(t.waiterButton), t.waiterButton],
];
for (const [label, fg, bg] of extra) check(contrastRatio(fg, bg) >= 4.5, `${label}: ${fg} sobre ${bg} = ${fmt(contrastRatio(fg, bg))}:1`);
console.log("Nota: el acento secundario cheddar NO se usa como color de texto sobre crema (1,5:1); en la carta es fondo de tabs con texto oscuro.\n");

console.log("== 4. Selección de preset ==");
check(THEME_PRESETS[0].key === "menusky" && THEME_PRESETS[0].label === "MenuSky", `Primer preset = ${THEME_PRESETS[0].key} / ${THEME_PRESETS[0].label}`);
check(DEFAULT_THEME === menusky.theme, "DEFAULT_THEME es el tema de MenuSky");
check(THEME_PRESETS.length === 8, `Cantidad de presets = ${THEME_PRESETS.length} (MenuSky + 7)`);
const viejoDefault = {
  background: "#F5EDE0", cardBackground: "#F5CDA0", textPrimary: "#1C1917", textSecondary: "#4F473F",
  accentPrimary: "#E8590C", accentSecondary: "#1D3557", waiterButton: "#1C1917",
};
const p1 = findPresetByTheme(viejoDefault);
check(p1?.key === "default" && p1?.label === "Clásico", `Tema guardado igual al viejo "Default" -> ${p1?.key} / ${p1?.label}`);
const p1b = findPresetByTheme(Object.fromEntries(Object.entries(viejoDefault).map(([k, v]) => [k, v.toLowerCase()])));
check(p1b?.key === "default", `Mismo tema en minúsculas -> ${p1b?.key}`);
const restauranteTheme = null; // restaurants.theme nulo
const efectivo = restauranteTheme ?? DEFAULT_THEME; // como lib/admin/getRestaurantTheme.ts y app/m/[tableId]/layout.tsx
const p2 = findPresetByTheme(efectivo);
check(p2?.key === "menusky", `theme null -> ${p2?.key} / ${p2?.label}`);
const p3 = findPresetByTheme({ ...menusky.theme, style: undefined });
check(p3 === null, `Colores de MenuSky con style "soft" (personalizado) -> ${p3?.key ?? "ningún preset activo"}`);
const p4 = findPresetByTheme({ ...viejoDefault, accentPrimary: "#E8590D" });
check(p4 === null, `Paleta personalizada que no coincide -> ${p4?.key ?? "ningún preset activo"}`);
console.log("");

console.log("== 5. Los 8 presets con las 7 reglas del editor (referencia) ==");
for (const p of THEME_PRESETS) {
  const rs = editorRules(p.theme);
  const bad = rs.filter((r) => !r.ok);
  console.log(`${p.key.padEnd(14)} ${p.label.padEnd(14)} style=${(p.theme.style ?? "soft").padEnd(10)} avisos=${bad.length}  ` + rs.map((r) => fmt(r.ratio)).join(" | "));
}
console.log(`\nResultado: ${fails === 0 ? "todo OK" : `${fails} falla(s)`}`);
process.exitCode = fails === 0 ? 0 : 1;
