# Evidencia de la parte 4a (Shell + Carta + hoja)

Scripts de prueba del Frontend. No son parte de la app y la app no suma dependencias.

## Requisitos
- Node >= 20 y Google Chrome instalado (los scripts usan `channel: "chrome"`).
- Playwright en una carpeta aparte (`TOOLS_DIR`), fuera del repo:
  ```
  mkdir tools && cd tools && npm init -y && npm i playwright @axe-core/playwright
  ```
  (verificado con playwright 1.63.0 y @axe-core/playwright 4.13.0).

## Levantar (puertos del Frontend, D-1: 3420-3449)
Desde la raíz del repo, en tres terminales:
```
node scripts/mock-supabase/server.mjs --port 3422                       # Supabase simulado
node docs/design/admin/evidencia/carta-4a/fault-proxy.mjs 3421 3422     # proxy: inyecta fallas a pedido
```
La app habla con el proxy (3421); sin fallas pedidas, el proxy es transparente.
```
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3421
export NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key
export NEXT_PUBLIC_SITE_URL=http://localhost:3420
npx next build                                   # las NEXT_PUBLIC se fijan al compilar
npx next start -H 127.0.0.1 -p 3420
```
No usar `npm run dev` si otro `next dev` corre sobre la misma carpeta (choca con su lock).

## Correr
```
export TOOLS_DIR=<ruta a tools> APP_URL=http://127.0.0.1:3420 MOCK_URL=http://127.0.0.1:3421
node docs/design/admin/evidencia/carta-4a/carta-e2e.mjs > docs/design/admin/evidencia/carta-4a/carta-e2e-salida.txt
node docs/design/admin/evidencia/carta-4a/quality.mjs   > docs/design/admin/evidencia/carta-4a/quality-salida.txt
node docs/design/admin/evidencia/carta-4a/captures.mjs  > docs/design/admin/evidencia/carta-4a/captures-salida.txt
```
Cada script reinicia el mock al empezar (`/__mock/reset`) y cambia datos: no apuntarlo a un mock que
esté mirando otra persona. `captures.mjs` escribe en `docs/design/admin/capturas/`.

## Qué hay
| Archivo | Qué es |
|---|---|
| `carta-e2e.mjs` / `carta-e2e-salida.txt` | Punta a punta de shell, carta y hoja (acceso, CRUD, opciones, foco, celular). |
| `quality.mjs` / `quality-salida.txt` | Scroll horizontal 320-1440, `prefers-reduced-motion`, foco visible, axe (WCAG 2.2 AA). |
| `captures.mjs` / `captures-salida.txt` | Capturas 1440x900, 390x844 y 360x640 desde el build de producción. |
| `eslint-salida.txt`, `tsc-salida.txt` | `npx eslint` del repo completo y `npx tsc --noEmit`. |
| `fault-proxy.mjs`, `lib.mjs`, `shot-quick.mjs` | Proxy de fallas, utilidades comunes y captura rápida. |

Qué cubre: Chrome de escritorio headless (con emulación táctil en 360x640) contra el mock. Qué no cubre:
Safari/Firefox, dispositivos reales, un Supabase real, ni rendimiento (se mide en la PC de 16 GB, ver ESTADO-ADMIN).
