# Evidencia del paso 4a: Mesas (HU-8) y H-AD-1

Scripts de prueba del Frontend; no son parte de la app. Usan las utilidades y el proxy de
`../carta-4a/` (mismo montaje: ver `../carta-4a/README.md` para instalar Playwright en `TOOLS_DIR`).

## Levantar (puertos del Frontend, D-1: 3420-3449)
```
node scripts/mock-supabase/server.mjs --port 3422
node docs/design/admin/evidencia/carta-4a/fault-proxy.mjs 3421 3422     # fallas a pedido: categories, tables, menuItemsWrite
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3421 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3420
npx next build && npx next start -H 127.0.0.1 -p 3420
```

## Correr
```
export TOOLS_DIR=<ruta a tools> APP_URL=http://127.0.0.1:3420 MOCK_URL=http://127.0.0.1:3421
node docs/design/admin/evidencia/mesas-4a/mesas-e2e.mjs      > docs/design/admin/evidencia/mesas-4a/mesas-e2e-salida.txt
node docs/design/admin/evidencia/mesas-4a/mesas-quality.mjs  > docs/design/admin/evidencia/mesas-4a/mesas-quality-salida.txt
node docs/design/admin/evidencia/mesas-4a/mesas-captures.mjs > docs/design/admin/evidencia/mesas-4a/mesas-captures-salida.txt
```
Cada script reinicia el mock (`/__mock/reset`) y cambia datos: usar un mock propio.

## Qué hay
| Archivo | Qué cubre |
|---|---|
| `mesas-e2e.mjs` / `-salida.txt` | Encabezado, orden, estados y conteos, filtros y su vacío, QR (alt, diferido), Descargar, Ver carta, Nueva mesa, estado en vivo con los eventos del mock (llamado, atendido, pedido, entregado; tiempo medido), anuncio aria-live, menú ⋯ con teclado, Eliminar (textos CA-NR.34 y CA-8.14, foco), Imprimir todos (todas las mesas aunque haya filtro, salida "print" emulada, 60 mesas en PDF A4), error de lectura y Reintentar, restaurante sin mesas, celular (hoja, Escape, Atrás, borrar desde la hoja, objetivos táctiles) y alta solo con teclado. |
| `mesas-quality.mjs` / `-salida.txt` | Sin scroll horizontal (320-1440, con hoja, confirmación, alta, vista de impresión y una mesa de 40 caracteres), `prefers-reduced-motion`, foco visible y axe (WCAG 2.2 AA) en 1440 y 360. |
| `mesas-captures.mjs` / `-salida.txt` | Capturas `docs/design/admin/capturas/mesas-*.png` (1440x900 y 390x844). |
| `eslint-salida.txt`, `tsc-salida.txt` | eslint de lo tocado y `npx tsc --noEmit`. |

La regresión de la Carta (con los chequeos nuevos de H-AD-1) está en `../carta-4a/carta-e2e-salida.txt` y
`../carta-4a/quality-salida.txt`.

Qué no cubre: Safari/Firefox, celulares reales, la lectura de los QR con una cámara (CA-8.8, CA-8.12: el
tamaño impreso de 50 mm lo valida el Líder escaneando una hoja real), un Supabase real ni rendimiento
(PC de 16 GB, ver ESTADO-ADMIN).
