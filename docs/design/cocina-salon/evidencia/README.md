# Evidencia de la construcción de Cocina y Salón (paso 4b, Frontend)

Scripts de prueba del Frontend; no son parte de la app. Playwright y @axe-core/playwright se toman de `TOOLS_DIR`,
fuera del repo (`C:\Users\facundo\AppData\Local\Temp\pwe2e`: playwright 1.63, @axe-core/playwright 4.13).
Todo corre sobre el **build de producción** (`npm run build` + `npx next start`), contra el Supabase simulado.

## Levantar (puertos del Frontend 3420-3449)
```
node scripts/mock-supabase/server.mjs --port 3423
node docs/design/admin/evidencia/carta-4a/fault-proxy.mjs 3421 3423   # (sin proxy: mock directo en 3421)
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3421 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3422
npm run build && npx next start -H 127.0.0.1 -p 3422
export TOOLS_DIR=<tools> APP_URL=http://127.0.0.1:3422 MOCK_URL=http://127.0.0.1:3421 MSYS_NO_PATHCONV=1
node docs/design/cocina-salon/evidencia/e2e-staff.mjs     > docs/design/cocina-salon/evidencia/e2e-staff-salida.txt
node docs/design/cocina-salon/evidencia/quality-staff.mjs > docs/design/cocina-salon/evidencia/quality-staff-salida.txt
```
(`MSYS_NO_PATHCONV=1` solo en Git Bash: si no, convierte "/kitchen" en una ruta de Windows.)

## Resultados (2026-10-15)
| Archivo | Resultado | Qué cubre / qué NO |
|---|---|---|
| `e2e-staff-salida.txt` | **53 OK / 0 FAIL** | Cocina (21): textos literales, Geist/Bricolage, sin `.dark`, navegación del rol, pedido nuevo por tiempo real (<= 5 s) con "Nuevo", sonido (se cuentan los osciladores de `playChime`), anuncio "Pedido nuevo: Mesa 3", sin toast, "Tomar pedido" -> "En preparación" -> "Marcar listo", error con toast y reintento, R-2, NotAdminAccess. Salón (19): contadores, estados de mesa con prioridad, llamado nuevo (toast + sonido + anuncio), "Atendido", pedido listo por tiempo real con "Nuevo" y anuncio, "Entregado", sonido con pedido `received` (F-9), errores de las dos acciones, R-2. Admin y celular (8): sin redirección, 3 enlaces con pendientes, menú de cuenta (2 toques), cerrar sesión y volver atrás. Sin staff, vacíos y temas (5): NoStaffAccess, sin Pomo ahí; **CA-1.3**: Cocina idéntica byte a byte con otro tema guardado; Cocina vacía con Pomo; Salón sin mesas. NO cubre: lector de pantalla real (solo el texto de la región `aria-live`), error.tsx/loading.tsx (ver abajo). |
| `quality-staff-salida.txt` | **136 OK / 0 FAIL** | 9 estados (cocina con comandas + pedido "Nuevo", cocina vacía, salón completo, salón sin acciones, salón sin mesas, menú de cuenta abierto, admin en cocina, sin staff, solo admin) en 1440x900, 1280x800, 1024x768, 768x1024, 390x844 y 360x640 (según el estado). Por vista: sin scroll horizontal, cuerpo en Geist, **0 animaciones con reduce**, tamaños medidos (texto mín. 14 px; mesa >= 24; renglón >= 20 tablet / 18 celular; opciones, nota, hora y cuenta >= 16; botón de acción 56 px a lo ancho; controles >= 44x44; separación entre botones >= 12; nada cortado), axe sin críticos/serios, y columnas (Cocina 4/3/3/2/1/1; Salón: página en 2 columnas con mesas en 3 desde 1024, mesas 4 en 768 y 2 en celular). Teclado: el salto al contenido va primero y mueve el foco a `main`; todos los controles con contorno de foco. |
| `axe-staff-salida.txt` | **42 vistas, 0 violaciones** (de cualquier impacto) | "A revisar" solo con el menú de cuenta abierto: `aria-hidden-focus` en los focus guards de base-ui y `aria-valid-attr-value` (los mismos del menú del admin) y `color-contrast` de `.adm-menu__meta` (carne suave sobre papel, 7,77:1 según `../maquetas/contraste-salida.txt`). |
| `regresion-admin-e2e-4b-salida.txt` | **74 OK / 0 FAIL** | Inicio y Apariencia del admin con fault-proxy (mismo número que el 2026-10-05). |
| `regresion-admin-mesas-e2e-salida.txt` | **65 OK / 0 FAIL** | Mesas del admin, que reutiliza `TableStatus` / `deriveTableStatus` (mismo número que antes). |
| `tsc-salida.txt`, `eslint-salida.txt` | exit 0, 0 problemas | `tsc --noEmit` de todo el proyecto; eslint de `app/kitchen`, `app/floor`, `components/{staff,kitchen,floor}` y estos scripts. |
| `realtime-recarga-salida.txt` | Hallazgo PREEXISTENTE | Ver abajo. |

Contraste de los estados reales (CA-5.5): son los mismos pares de las maquetas, en `../maquetas/contraste-salida.txt`
(todos AA o más). axe midió `color-contrast` sin fallas en todas las vistas, incluidos el pedido recibido, en
preparación, el llamado, las mesas en sus 4 estados y "Nuevo". El botón deshabilitado ("en proceso") usa
`.adm-btn:disabled` del admin (#5e4a40 sobre #efe6d6, 6,70:1); dura lo que tarda la acción y axe no lo midió.

Las regresiones del admin se corrieron con el build ANTERIOR al último cambio de `staff.css` (1ace416: sacar dos HEX
repetidos del botón deshabilitado, mismo resultado visual por `.adm-btn:disabled`); `admin.css` no cambió.

## No probado / pendiente
- `app/kitchen/error.tsx` y `app/floor/error.tsx`: las lecturas de pedidos no lanzan errores (K-15, D-12), así que
  no hay forma de provocarlos con el mock sin tocar `lib/`. Se verificaron solo con `tsc`, eslint y el build.
  `loading.tsx` aparece unas décimas al navegar; no se capturó.
- Lector de pantalla real (NVDA / VoiceOver), tablet real a 1,5 m, iPhone: pendientes de QA (CA-13.11 del admin).
- Rendimiento (CA-7.2, CA-7.3): pendiente en la PC de 16 GB, como decidió el Director.

## Hallazgo preexistente (no cambia el veredicto de esta tarea)
`realtime-recarga.mjs` / `realtime-recarga-salida.txt`: si se **recarga** `/kitchen` con la sesión ya guardada
(sin pasar por `/login`), el mock no entrega los pedidos nuevos por tiempo real: los `phx_join` salen sin
`access_token` y el mock los trata como anónimos. Pasa igual en master d66b639 (comparado con un build de master
en un clon temporal, ya borrado), así que no lo introdujo el rediseño. No se sabe si en Supabase real pasa lo mismo
(podría ser una limitación del mock). Severidad estimada: ALTA si ocurre en producción (una tablet recargada no vería
pedidos nuevos hasta volver a entrar). Es del área de Backend/Líder (`lib/supabase`, `lib/realtime`, mock).
Por eso `quality-staff.mjs` no recarga después del login.
