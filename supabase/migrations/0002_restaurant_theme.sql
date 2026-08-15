-- ============================================================
-- Theming por restaurante
-- ============================================================

-- Paleta completa del restaurante (ver lib/theme/types.ts para la forma
-- exacta del objeto). Null = usa el tema "default" harcodeado en el código
-- (lib/theme/presets.ts), así ningún restaurante queda sin tema.
alter table restaurants add column theme jsonb;

-- No hace falta ninguna policy nueva: "admin update restaurants" (0001_init.sql)
-- ya permite a un admin actualizar cualquier columna de su restaurante,
-- incluida esta.
