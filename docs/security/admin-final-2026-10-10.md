# Auditoría de seguridad final: Fase ADMIN (paso 5a)

- Fecha: 2026-10-10. Auditor: agente de Seguridad (independiente; no modificó código de la app, tests ni docs ajenos salvo la sección "Procesos levantados" de `docs/ESTADO-ADMIN.md`).
- Rama: `feat/admin-ui` @ `f97b193` (repo `C:\Users\facundo\Desktop\menusky`, sin cambiar de rama).
- Referencias: `docs/security/admin-sec-2026-10-03.md` (auditoría temprana), `docs/specs/admin.md` (RNF-S1..S9, CA-NR.01, CA-RNF.5/.6), `docs/api/admin.md`, `docs/STACK.md`, `docs/DECISIONES.md` (D-3..D-20), `docs/ESTADO-ADMIN.md`, `docs/releases/admin-migracion-0004.md`, guía de Next.js 16 `node_modules/next/dist/docs/01-app/02-guides/authentication.md`. OWASP Top 10 2021, OWASP API Security Top 10 2023, ASVS 4.0 nivel 1.
- Sin base real ni credenciales reales. Lo dinámico se hizo en local: PGlite (`supabase/tests/rls`) y la app compilada (`next build` + `next start -H 127.0.0.1`) contra el Supabase simulado (`scripts/mock-supabase`), con los usuarios ficticios del README.

## Veredictos por alcance

| Alcance | Veredicto | Motivo corto |
|---|---|---|
| **A. Re-auditoría SEC-AD-01..06** | **Apto con reservas** | 02, 03, 04, 05 (configuración) y 06 cerrados con evidencia. SEC-AD-01 queda **parcial**: el límite funciona, pero como los `qr_token` siguen siendo públicos, un tercero puede agotar la cuota de todas las mesas y bloquear los pedidos de clientes reales (SEC-AF-02, Media). Sin Críticos ni Altos. |
| **B. Auditoría final del admin** | **Apto con reservas** | Sin Críticos ni Altos. Escrituras, aislamiento entre restaurantes, parámetros de URL, QR, Apariencia, conexión en vivo, cabeceras y migración 0004 + reversa están bien. Reserva: el control de rol de `/admin` vive solo en el layout y mozo/cocina reciben los datos de las páginas (SEC-AF-01, Baja por impacto, pero **incumple CA-NR.01**; conviene corregirlo antes del release). |

Nada de lo encontrado bloquea por severidad. Lo preexistente (más abajo) no cambia estos veredictos.

## Resumen de hallazgos nuevos (SEC-AF)

| ID | Severidad | Alcance | Estado | Ubicación | Dueño sugerido |
|---|---|---|---|---|---|
| SEC-AF-01 | Baja (incumple CA-NR.01) | B | Confirmado | `app/admin/layout.tsx:37`; páginas `app/admin/(inicio)/page.tsx:32-36`, `app/admin/mesas/page.tsx:12-16`, `app/admin/menu/(lista)/page.tsx:12-16`, `app/admin/menu/[itemId]/page.tsx:13-15`, `app/admin/apariencia/page.tsx:15-18` | Frontend (páginas); helper opcional en `lib/auth` de Backend |
| SEC-AF-02 | Media | A | Confirmado | `supabase/migrations/0004_role_policies.sql:133-140` (límite por mesa) + `0001_init.sql:173` (`tables` pública) | Backend; **decide el Director** |
| SEC-AF-03 | Informativa | B (punto C.1) | Confirmado por revisión | `app/admin/(inicio)/page.tsx:34-37` y `app/admin/layout.tsx:45` | Backend (exponer error en `AdminLiveProvider`) + Frontend |

### SEC-AF-01: el control de rol de `/admin` está solo en el layout; mozo y cocina reciben los datos de las páginas
- **Severidad:** Baja. Explotación trivial (cualquier cuenta de mozo o cocina, abrir la URL). Impacto en confidencialidad bajo **hoy**: los datos que llegan (carta completa con disponibilidad y opciones, mesas con `qr_token`, tema) ya son legibles por esos roles con RLS e incluso por el anónimo; no se puede escribir nada (RLS: mozo crea mesa -> 403, cambia tema -> 0 filas). Pero **incumple CA-NR.01** ("waiter o kitchen ve `NotAdminAccess` y NINGÚN dato de carta, mesas, pedidos ni tema, ni siquiera en el HTML") y es un patrón que filtraría cualquier dato sensible que se agregue en una página futura del admin.
- **Estado:** Confirmado (app compilada + mock).
- **Descripción:** `app/admin/layout.tsx` devuelve `NotAdminAccess` si el rol no es admin, pero cada página solo comprueba `if (!staff) return null` y después lee datos. En Next.js las páginas se ejecutan y se serializan en la respuesta aunque el layout no muestre `children`, y en la navegación de cliente (RSC) el layout compartido ni siquiera se vuelve a ejecutar. La guía de Next 16 lo advierte: "A layout also does not control whether the rest of the route renders ... does not stop them from running or from appearing in the RSC Payload" (`node_modules/next/dist/docs/01-app/02-guides/authentication.md:1352-1354`).
- **Evidencia:** `evidencia/admin-final-2026-10-10/dinamico-app-mock.txt` (líneas `ROLE-HTML`: mozo/cocina en `/admin/menu` -> 200 con la pantalla `NotAdminAccess` **y** los datos de la carta; `/admin/mesas` -> `qrToken`; `/admin/apariencia` -> `accentPrimary`; `/admin` -> `outOfStock`). `evidencia/admin-final-2026-10-10/rol-admin-rsc.txt`: la petición RSC real de una navegación del admin (capturada con Playwright) repetida con la cookie del mozo/cocina devuelve 200 con los datos de la página y **sin** `NotAdminAccess` (8244 bytes en `/admin/menu`, igual que el admin). Anónimo -> 307 a `/login` y autenticado sin staff -> sin datos (correcto).
- **Reproducción (solo local):** compilar contra el mock, entrar como `mozo@demo.test` y abrir `view-source:` de `/admin/menu`; buscar "Provoleta" o `isAvailable`.
- **Recomendación (Frontend; Backend si se hace un helper):** comprobar el rol en cada página antes de leer datos, por ejemplo un `requireAdmin()` en `lib/auth` que devuelva el `StaffUser` o `null` si `role !== "admin"`, y en cada página `if (!staff || staff.role !== "admin") return null;` (o `notFound()`); también en `/admin/menu/[itemId]` antes de `getAdminMenu`. Mantener la comprobación del layout (decide qué pantalla ver). QA re-prueba CA-NR.01 con HTML y con navegación de cliente.
- **Referencia:** OWASP A01:2021 (Broken Access Control), API5:2023 (BFLA), CWE-285, CWE-862.

### SEC-AF-02: con los `qr_token` públicos, el límite por mesa permite bloquear los pedidos de clientes reales
- **Severidad:** Media (AV:N/AC:L/PR:N/UI:N; disponibilidad del flujo de pedidos de todo un restaurante; sin confidencialidad; recuperable al pasar la ventana). Es el remanente de SEC-AD-01 y un efecto nuevo de su corrección.
- **Estado:** Confirmado en PGlite y en la app + mock.
- **Descripción:** el límite (10 pedidos por mesa en 10 min, dentro de `create_order`, con lock por mesa) funciona y acota el volumen. Pero cualquiera lee todos los `qr_token` con la clave pública (`tables` de lectura pública, PRE-AD-03) y llama la RPC directo: gasta las 10 unidades de cuota de **cada** mesa y el cliente real que se sienta después recibe "Recibimos muchos pedidos de esta mesa..." durante 10 min, repetible. Cancelar los pedidos falsos no libera la cuota (los cancelados cuentan) y el staff no puede borrarlos. Además, en esa ventana entran 10 pedidos falsos por mesa de hasta 50 renglones x 99 unidades cada uno.
- **Evidencia:** `evidencia/admin-final-2026-10-10/pglite-casos-propios.txt` (TOKENS: el anónimo lee 9 tokens de 2 restaurantes; XTABLE: 8 mesas x 11 intentos en 561 ms -> 80 pedidos, 8 `rate_limited`, 4000 renglones, "ventas" = 792.000.000; DOS-LEGIT y DOS-CANCEL: el pedido legítimo da `rate_limited` incluso tras cancelar todo; ISOLATION: el restaurante B no se afecta). `evidencia/admin-final-2026-10-10/dinamico-app-mock.txt` (RATE-RPC: 10x200 + `P0429 rate_limited` con la clave pública; RATE-DOS: el cliente de esa mesa recibe 429).
- **Reproducción (solo local):** mock levantado; `GET /rest/v1/tables?select=qr_token` con `apikey: mock-anon-key`; 10 x `POST /rest/v1/rpc/create_order` con un token; luego `POST /api/orders` con el mismo token -> 429.
- **Recomendación (Backend; decide el Director porque cambia comportamiento visible):** la corrección de fondo es la ya propuesta R-8 (b)/PRE-AD-03: que el anónimo no pueda listar `qr_token` (resolver la mesa con una RPC `get_table_by_token` y quitar la lectura pública de esa columna o de `tables`) y generar tokens con `crypto.getRandomValues`; así solo quien vio el QR físico puede pedir (o bloquear) esa mesa. Complementos baratos: (1) no contar los pedidos `cancelled` en el límite, para que el staff pueda destrabar una mesa cancelando lo falso; (2) un tope de unidades por pedido más realista que 50 x 99; (3) opcional, un tope por restaurante. Mientras tanto, documentar en el instructivo que una mesa bloqueada se destraba esperando 10 min.
- **Referencia:** OWASP API4:2023, API6:2023, CWE-770, CWE-799, CWE-400.

### SEC-AF-03: Inicio relee la instantánea en el servidor solo para detectar errores (punto C.1)
- **Severidad:** Informativa (rendimiento/costo, no de seguridad).
- **Estado:** Confirmado por revisión de código.
- **Descripción:** cada visita a Inicio lee la instantánea en el layout (`app/admin/layout.tsx:45`) y otra vez en la página (`app/admin/(inicio)/page.tsx:35`), más la carta. Solo lo puede provocar un admin autenticado de su propio restaurante, con las mismas consultas que cualquier recarga normal; no hay amplificación para un anónimo ni para otro restaurante. Una sesión de admin robada puede generar carga igual recargando cualquier pantalla, así que no agrega un vector nuevo.
- **Recomendación (Backend + Frontend):** la propuesta ya anotada: exponer `error` en `AdminLiveProvider` (el layout ya sabe `liveFailed`) y que Inicio deje de releer. Se mide junto con D-11 en la PC de 16 GB.
- **Referencia:** API4:2023 (solo como contexto; no explotable).

## Estado de SEC-AD-01..07 (alcance A)

| ID | Sev. original | Estado | Evidencia |
|---|---|---|---|
| SEC-AD-01 pedidos falsos en masa | Media | **Parcial**. Hecho: límite dentro de `create_order` (10 en 10 min por mesa, lock `pg_advisory_xact_lock` por mesa, el límite va antes de validar los renglones) y `/api/orders` responde 429 con el texto de D-14; vale también para la RPC directa. Queda: SEC-AF-02 (bloqueo de mesas ajenas y volumen por mesa, raíz PRE-AD-03). Concurrencia del lock: verificada solo por lectura (PGlite tiene una conexión). | `rls-matriz-rerun.txt` (131/131, casos SEC-AD-01); `pglite-casos-propios.txt`; `dinamico-app-mock.txt` (RATE-API: 10x200 + 429) |
| SEC-AD-02 instructivo sin "mozo cambia precio" | Baja | **Cerrado**. Pasos 10-12 obligatorios (`docs/releases/admin-migracion-0004.md:85-88`), bloque SQL con `rollback` para mozo, cocina y control con admin (línea 90 en adelante), paso 13 del límite, `notify pgrst, 'reload schema'` en la migración, la reversa y "Qué hacer si" (línea 153). Sugerencia menor: agregar un paso opcional que intente subir un `.txt`/SVG al bucket para confirmar SEC-AD-05 en el Storage real. | Revisión del documento |
| SEC-AD-03 "Tu pedido" sin fallback | Info | **Cerrado**. `useOrderStatus` pasa a Realtime con `PGRST202`/`42883` (solo la función inexistente activa el camino viejo, que con la base migrada RLS bloquea). Re-ejecutado en mis puertos: 6/6. | `sondeo-legacy-rerun.txt` |
| SEC-AD-04 suscripción a `tables` | Info | **Cerrado**. Un solo canal `admin-live-<restaurantId>` con `orders` (`*`) y `waiter_calls` (INSERT/UPDATE), todos con `restaurant_id=eq.`; sin `tables`; `refreshAll()` tras crear/borrar mesa (`components/admin/mesas/TablesBoard.tsx:148-151`). El `restaurantId` sale del servidor (`getStaffUser`) y RLS es el límite real. | Revisión de `lib/admin/live/AdminLiveProvider.tsx:70-100`; `grep .channel(` en el admin: 1 |
| SEC-AD-05 fotos solo validadas en el cliente | Baja | **Cerrado en configuración**: 0004 fija `allowed_mime_types` (jpeg/png/webp/gif) y `file_size_limit` 5242880; la reversa los deja en `null`. Pendiente de confirmar que el Storage real rechaza (el stub y el mock no lo aplican). | `rls-matriz-rerun.txt` (SEC-AD-05 antes/después/reversa); `pglite-casos-propios.txt` (ROLLBACK) |
| SEC-AD-06 `search_path = public` | Info | **Cerrado**. Las 3 RPC: `security definer`, `search_path=""`, dueño `postgres`, todas las tablas calificadas `public.`; `execute` solo para `anon`/`authenticated` (sin `PUBLIC`). Nota: `is_staff_of`/`is_admin_of` (0001) siguen con `search_path=public` y `execute` para `PUBLIC` (preexistente, Informativa). | `pglite-casos-propios.txt` (INFO FN, SEARCHPATH, SCHEMA-PRIV) |
| SEC-AD-07 CORS del mock | Info | **Abierto** (opcional, herramienta local). Sigue reflejando cualquier `Origin`. | `mock-cors.txt` |

## Resultados por área (alcance B)

- **Carta (escrituras, fotos, hoja):** todas las escrituras van con la sesión del usuario; RLS de 0004 limita a admin del restaurante (matriz 131/131: 12 operaciones x 6 actores, "mover" entre restaurantes rechazado). `/admin/menu/<id>`: plato propio -> 307 a `?plato=`; plato de B, `../`, `<script>`, `javascript:` -> 404. URL de foto pegada: solo `http://`/`https://` (`DishSheet.tsx:50-52`); subida con tipo/tamaño validados y extensión derivada del tipo. Sin `dangerouslySetInnerHTML`/`innerHTML` en `app`, `components`, `lib` (RNF-S4).
- **Mesas:** crear/borrar solo admin del restaurante (PGlite TABLES-AUTHZ; mock: mozo crea -> 403, admin B borra mesas de A -> 0 filas). QR por `/api/qr/<token>` con `encodeURIComponent`; enlaces a la carta con `rel="noopener noreferrer"`. "Imprimir todos" solo abre la vista y `window.print()` al tocar el botón. `?filtro=`, `?imprimir=`, `?nueva=`, `?mesa=` se comparan contra listas fijas o ids de la lista; `?nueva=1` solo abre el diálogo (no crea nada: sin CSRF por enlace); los parámetros se borran de la URL al montar.
- **Inicio:** parámetros no reflejados; datos por la sesión del admin. Ver SEC-AF-03.
- **Apariencia:** el editor valida `#RRGGBB` antes de guardar y la vista previa solo aplica el color si es válido. Del lado del servidor no hay validación (preexistente, PRE-AF-02).
- **`?nuevo=plato` (Carta):** solo compara con `"plato"`; payload `"><img onerror>` no aparece sin escapar (PARAM-REFLECT, 5/5).
- **Conexión en vivo:** ver SEC-AD-04. Cada rol: el proveedor solo se monta para admin; anónimo no recibe eventos de `orders` (auditoría temprana; mock). Realtime con RLS real: pendiente de la base real.
- **R-2 `/kitchen` y `/floor`:** sin cambios desde la auditoría temprana (diff vacío en `app/kitchen`, `app/floor`, `components/staff`); re-verificado: mozo `/kitchen` -> 307 `/floor` sin datos, cocina `/floor` -> 307 `/kitchen`, admin entra a ambos, sin staff sin datos (`r2-kitchen-floor.txt`). Las comprobaciones están en las páginas (no en layouts), por eso no tienen el problema de SEC-AF-01.
- **Migración 0004 y reversa:** idempotente, no toca filas, reversa exacta y reaplicable (con los 81 pedidos del ataque simulado: 81 -> 81; la reversa reabre la lectura anónima, como documenta el instructivo). Sin SQL dinámico.
- **Cabeceras:** `/admin`, `/admin/mesas`, `/admin/menu`, `/admin/apariencia`: `nosniff`, `X-Frame-Options: DENY`, `CSP: frame-ancestors 'none'`, `Referrer-Policy`, `Cache-Control: private, no-store` (RNF-S7). `/admin/` -> 308 sin cabeceras (SEC-LG-04, preexistente). Sin HSTS en local (lo pone Vercel; no verificado).
- **Secretos y bundle (RNF-S1/S2):** `service_role`, `SUPABASE_SERVICE_ROLE`, contraseña y secreto del mock, `__mock`, `pglite`: 0 en `.next/static` y `.next/server` (sin `.map`). `sb_secret` = código de supabase-js que detecta prefijos. En el diff de la fase solo aparece la contraseña ficticia `demo-1234` de las herramientas (`bundle-y-secretos.txt`).
- **`npm audit` (RNF-S8):** la fase no cambia `package.json` ni el lock; el audit da 12 avisos (1 crítico `proxy-addr`, 10 altos, 1 moderado), todos transitivos de herramientas (`shadcn` CLI -> MCP SDK -> express; eslint; postcss en build); ninguno aparece en `.next` (`npm-audit.txt`). Preexistente (SEC-LG-03).

## Puntos del encargo (C) clasificados

1. **Inicio relee la instantánea (4 consultas por visita):** Informativa, de rendimiento y no de seguridad (SEC-AF-03). No hay vector de abuso ni de costo que no exista ya recargando cualquier pantalla del admin.
2. **Paletas Clásico, Glaciar y Madera con pares < 4,5:1 en la carta del cliente:** **no es un hallazgo de seguridad**; es accesibilidad (WCAG 1.4.3), preexistente. Lo sigue QA/Frontend y, si cambian colores visibles, el Director.
3. **PRE-AD-01 (un admin puede borrar o pisar fotos de otro restaurante):** sigue **abierto, Media, preexistente** (0003 y la ruta `${itemId}-${Date.now()}` sin prefijo de restaurante no cambiaron). No cambia el veredicto. Recomendación sin cambios (prefijo `<restaurant_id>/` y política con `storage.foldername`).

## Fuera de alcance / preexistente (no cambia el veredicto)

| ID | Severidad | Estado | Descripción y recomendación |
|---|---|---|---|
| PRE-AD-01 | Media | Abierto | Fotos entre restaurantes (ver C.3). Backend, próxima fase. |
| PRE-AF-01 | Media | Confirmado (PGlite) | `"public insert waiter_calls"` (`0001_init.sql:182`, congelada por RNF-S9): el anónimo inserta llamados sin límite (50/50) y con `restaurant_id` de otro restaurante que la mesa (aceptado), lo que suma llamados falsos al Inicio y a Mesas del admin B. D-14 limitó pedidos pero no llamados. Recomendación (Backend, decide el Director): crear llamados con una RPC que tome la mesa del `qr_token` (restaurante derivado) con un límite como el de pedidos, y quitar el insert público. `pglite-casos-propios.txt` (PRE-CALLS). CWE-770, CWE-639. |
| PRE-AF-02 | Baja | Confirmado (mock) | El tema se guarda directo en `restaurants.theme` sin validar en la base (cualquier JSON) y `themeToCssVars` (`lib/theme/applyTheme.ts:13`) lo pone en el `style` del HTML de la carta del cliente: un valor `red;background-image:url(http://...)` agrega declaraciones CSS (inyección CSS; no hay inyección HTML: `<script>` sale escapado). Solo lo puede hacer el admin de ese restaurante (mozo y admin B: 0 filas) y ya puede apuntar fotos a cualquier host, así que el impacto adicional es bajo (rastreo de IP de clientes, desfiguración de su propia carta). Recomendación: validar `#RRGGBB` en `themeToCssVars`/al leer (con caída al tema por defecto) y/o un `check` en la base. Frontend + Backend. `dinamico-app-mock.txt` (THEME-*). CWE-20, CWE-79 (CSS). |
| PRE-AF-03 | Informativa | Confirmado (mock) | `/api/qr/<token>` arma `Content-Disposition` con la etiqueta de la mesa sin sanear: etiqueta con emoji -> 500 (el QR de esa mesa y su lugar en "Imprimir todos" no cargan); con comillas el nombre del archivo queda mal formado. Solo el admin pone etiquetas. Recomendación (Backend): nombre ASCII saneado + `filename*=UTF-8''...`. CWE-116. |
| PRE-AD-02 | Baja | Sin cambios | Staff cambia `total`/`table_id` de pedidos de su restaurante (R-8 e). |
| PRE-AD-03 | Baja | Sin cambios | `tables` legible por el anónimo y tokens con `Math.random`. Es la raíz de SEC-AF-02. |
| PRE-AD-04 | Informativa | Sin cambios (revisión: `app/api/orders/route.ts:40` y `:108`) | Body `null` o `choiceIds` objeto -> 500 sin cuerpo. |
| SEC-LG-03 | Baja | Sin cambios en el lock; avisos nuevos | 12 avisos de `npm audit`, todos de herramientas (ver arriba). Mover `shadcn` a `devDependencies` y `npm audit fix` en una rama aparte; decide el Líder. |
| SEC-LG-04 | Baja | Abierto | `/admin/` (y `/kitchen/`) -> 308 sin cabeceras de seguridad. |
| Info | Informativa | Revisión | `is_staff_of`/`is_admin_of` con `search_path=public` y `execute` a `PUBLIC` (0001). Igual que SEC-AD-06: no explotable en lo visto; endurecer en una migración futura. |

## Qué se revisó
- Diff de las correcciones `c116af4`, `512ce06`, `be9d6f8`; la migración 0004 y su reversa completas; `app/api/orders/route.ts`, `lib/realtime/useOrderStatus.ts`, `lib/admin/**`, `app/admin/**`, `components/admin/**` (escrituras, parámetros, sumideros de HTML/CSS, enlaces), `app/api/qr`, `lib/theme/applyTheme.ts`, `app/m/[tableId]/layout.tsx`, `next.config.ts`, `proxy.ts`.
- PGlite: matriz del Backend re-ejecutada (131/131, `rls-matriz-rerun.txt`) y 13 casos propios (`pglite-casos-propios.txt`; script en `pglite-casos-propios.mjs.txt`).
- App compilada contra el mock: límite por API y por RPC, control de rol en 4 pantallas x 5 actores (HTML) y navegación RSC real repetida con otros roles, parámetros de entrada, cabeceras, tema malicioso en la carta del cliente, `/kitchen` y `/floor`, QR con etiquetas raras, permisos de mesas y tema, sondeo en modo legado (6/6).
- Bundle `.next`, búsqueda de secretos en el diff de la fase, `npm audit` de la app y de `supabase/tests/rls` (0 vulnerabilidades).

## Qué NO se revisó
- Supabase real: Realtime con RLS, Storage real (que rechace tipos/tamaños), grants por defecto, códigos HTTP reales de PostgREST (el mock responde 400 a `P0429`; la app traduce por mensaje, así que el código HTTP no la afecta), concurrencia real del lock del límite.
- HSTS y cabeceras en Vercel; Safari/Firefox; celular real; flujo visual y accesibilidad (QA).
- No se usaron Semgrep, gitleaks ni trufflehog (no instalados; no se instaló ninguno). Solo se instaló, dentro de `supabase/tests/rls` y desde su `package-lock.json`, `@electric-sql/pglite` 0.5.8 (`npm ci`, carpeta ignorada por git) para correr la matriz, y se usó el Playwright ya presente en `C:\Users\facundo\AppData\Local\Temp\pwe2e` para capturar la petición RSC.

## Procesos levantados (todos detenidos)
| Qué | Puerto | PID | Estado |
|---|---|---|---|
| `node scripts/mock-supabase/server.mjs --port 3451` | 127.0.0.1:3451 | 2924 | Detenido (taskkill) |
| Mismo mock con `MOCK_LEGACY=1` | 127.0.0.1:3451 | 11100 | Detenido (taskkill) |
| `npx next start -H 127.0.0.1 -p 3452` | 127.0.0.1:3452 | 7920 | Detenido (taskkill) |
| Chrome headless de `browser-poll-check.mjs` (CDP) | 127.0.0.1:3454 | lo cierra el script | Cerrado |

`netstat` final: sin LISTENING en 3450-3469 (`netstat-final.txt`). No se tocó el 4317 ni procesos ajenos. El `npm run build` pisó `.next` de la carpeta del repo (el `next dev` del Director no estaba corriendo).

## Próximos pasos recomendados
1. **Frontend:** SEC-AF-01 (rol en cada página del admin) antes del release; QA re-prueba CA-NR.01 con HTML y navegación de cliente. Seguridad re-audita.
2. **Director (pregunta):** SEC-AF-02. Opciones: (a) aceptar el riesgo hasta la próxima fase y anotarlo; (b) que Backend saque `qr_token` de la lectura pública (R-8 b) y/o deje de contar los pedidos cancelados en el límite, en esta fase. Recomendación de Seguridad: (b) antes de producción, o como mínimo no contar cancelados para que el staff pueda destrabar una mesa.
3. **Director (pregunta):** PRE-AF-01 (llamados al mozo sin límite y cruzados entre restaurantes) para el backlog, junto con PRE-AD-01.
4. **Backend/Frontend (backlog):** SEC-AF-03, PRE-AF-02, PRE-AF-03; opcional SEC-AD-07.
5. **Director, al aplicar 0004:** correr la prueba de humo completa (pasos 10-13 obligatorios) y, si se puede, intentar subir un archivo no imagen para confirmar SEC-AD-05 en el Storage real.

## Evidencia (`docs/security/evidencia/admin-final-2026-10-10/`)
- `rls-matriz-rerun.txt`: matriz del Backend, 131/131.
- `pglite-casos-propios.txt` y `pglite-casos-propios.mjs.txt`: casos propios (límite, bloqueo, `search_path`, grants, llamados, tema, mesas, reversa).
- `dinamico-app-mock.txt` y `dinamico-app-mock.mjs.txt`: límite por API/RPC, rol en HTML, parámetros, cabeceras, tema, QR, permisos.
- `rol-admin-rsc.txt` y `rol-admin-rsc.mjs.txt`: navegación RSC real del admin repetida con mozo y cocina.
- `r2-kitchen-floor.txt`: R-2 re-verificado.
- `sondeo-legacy-rerun.txt`: fallback TEMP-COMPAT de "Tu pedido", 6/6.
- `npm-audit.txt`, `bundle-y-secretos.txt`, `mock-cors.txt`, `netstat-final.txt`.
- Los scripts `.mjs.txt` son temporales de Seguridad guardados como texto; no forman parte de la app.

## Re-auditoría SEC-AF-01 (2026-10-10)

- **Corrección revisada:** `e3b9099` en `fix/admin-role-pages` (Frontend). `git diff 2e0705c e3b9099 -- app`: solo cambia, en las 5 páginas (`app/admin/(inicio)/page.tsx:34`, `apariencia/page.tsx:17`, `menu/(lista)/page.tsx:14`, `menu/[itemId]/page.tsx:15`, `mesas/page.tsx:14`), `if (!staff) return null;` por `if (!staff || staff.role !== "admin") return null;`.
- **Revisión de código bajo `app/admin`:** en las 5 páginas la única operación antes del chequeo es `getStaffUser()` (y `await params` en `[itemId]`, que es la URL pedida por el propio cliente); todas las lecturas (`getAdminLiveSnapshot`, `getAdminMenu`, `getRestaurantTheme`, `getAdminTables`) quedan después. `app/admin/layout.tsx` ya comprobaba `!staff` -> `NoStaffAccess` y `role !== "admin"` -> `NotAdminAccess` antes de `getAdminLiveSnapshot` (líneas 35-45). No hay `generateMetadata`, `route.ts` ni otras páginas/layouts bajo `app/admin`; `loading.tsx` y `error.tsx` no leen datos.
- **Prueba dinámica (build de producción + mock propio, puertos 3451/3452):** se re-corrió el script original de Seguridad (`rol-admin-rsc.mjs.txt`) y el ampliado del Frontend (`docs/design/admin/evidencia/sec-af-01/rol-admin-rsc.mjs`: 5 rutas x 3 roles x carga directa/RSC plana/RSC de navegación capturada).
  - Script original: mozo y cocina en la navegación RSC de `/admin/menu`, `/admin/mesas`, `/admin/apariencia` -> 200 **sin datos de la página** (4147/4019/4029 bytes; antes 8244 en `/admin/menu`, igual que el admin). Admin sigue recibiendo `isAvailable`/`qrToken`/`accentPrimary`.
  - Script del Frontend: **42 OK, 0 FAIL; respuestas de mozo/cocina con datos de la página: 0** (incluye `outOfStock`/`liveOk` de Inicio y `/admin/menu/<id>`). Admin sin regresión (ve sus datos; `/admin/menu/<id>` -> 307 a `?plato=<id>`).
  - Observación (no es hallazgo): en la navegación RSC, la respuesta de mozo/cocina no trae `NotAdminAccess` porque el layout compartido no se re-ejecuta; la página devuelve `null` y no viaja ningún dato. Ese rol solo llega ahí con un cliente que ya recibió `NotAdminAccess` del layout en la carga directa (verificado: `NotAdminAccess=true` en "directa" y "RSC-plana").
- **Evidencia:** `evidencia/admin-final-2026-10-10/sec-af-01-reaudit.txt` (comando de build, PIDs, salida completa de ambos scripts y netstat final).
- **Estado: CERRADO.** Cumple CA-NR.01 en lo que se puede verificar con el mock (HTML y RSC sin datos de carta, mesas, tema ni contadores para mozo/cocina).
- **Veredicto B actualizado: Apto.** Sin hallazgos abiertos del alcance B que requieran corrección: SEC-AF-01 cerrado; SEC-AF-03 es Informativa. El veredicto de A no cambia (Apto con reservas por SEC-AF-02, que decide el Director). Lo preexistente sigue igual y no cambia veredictos.
- **Procesos:** mock `node scripts/mock-supabase/server.mjs --port 3451` (PID 22104) y `npx next start -H 127.0.0.1 -p 3452` (PID 16208), ambos detenidos con `taskkill /F /T`; netstat 3450-3469 sin escuchas al terminar. El 4317 (proceso ajeno) no se tocó. Nada instalado.
