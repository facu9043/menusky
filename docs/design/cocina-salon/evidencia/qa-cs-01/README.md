# QA-CS-01: el encabezado fijo tapaba el foco de teclado (2026-10-17, rama fix/staff-sticky-focus)

Hallazgo: `docs/qa/cocina-salon-2026-10-17.md`, QA-CS-01 (Media), WCAG 2.4.11.

## Cambio (solo CSS)
`components/staff/staff.css:8-19`: `scroll-padding-top` en `<html>` (el documento es el que hace scroll), solo en las
páginas de staff (`html:has(.st-root)`): 62 px del encabezado en celular + área segura + 16 px de aire; desde 768 px,
64 + 16 px. Más `scroll-padding-bottom: 16px`. Al enfocar con Tab o Shift+Tab, el navegador deja el elemento por
debajo del encabezado. No cambia el diseño ni el admin (no tiene `.st-root`).

## Sonda (copia de la de QA con 4 tamaños: `probe-sticky.mjs`; 31 comandas, 180 pasos de Tab y Shift+Tab)
| Tamaño | Antes (`probe-sticky-ANTES-salida.txt`) | Después (`probe-sticky-DESPUES-salida.txt`) |
|---|---|---|
| 360x640 | 38 pasos con el foco tapado (2 totalmente) | 0 |
| 390x844 | 0 | 0 |
| 768x1024 | 4 tapados parcialmente (0 totalmente) | 0 |
| 1280x800 | 0 | 0 |
| Total | 13 OK / 3 FAIL | **16 OK / 0 FAIL** |
CA-2.4 (botón de la última comanda visible al final del scroll) sigue OK en los 4 tamaños.

`scroll-padding-check-salida.txt` (3 OK): 78 px en /kitchen y /floor en celular, 80 px desde 768; `/admin/menu` = auto.

Build de producción contra el mock (3421) y la app (3422), ya parados. "Antes" = mismo build sin el cambio de CSS.
Playwright 1.64.1 por `channel: "chrome"` (el Chrome instalado, como `launch()` de las pruebas), así que no hizo falta
`executablePath`. Solo cambió CSS: no se corrieron tsc ni el e2e de staff; eslint de estos scripts: exit 0.
