# Auditoría de seguridad: rediseño de Cocina y Salón + arreglo de tiempo real (2026-10-17)

- Rama `feat/staff-redesign` @ `0ade2f4`; diff auditado `git diff master...feat/staff-redesign` (master `d66b639` = producción). Código: 32 archivos (`app/kitchen`, `app/floor`, `components/{staff,kitchen,floor}`, `lib/realtime/*`, `lib/admin/live/AdminLiveProvider.tsx`).
- Referencias: `docs/specs/cocina-salon.md` v1.0 (HU-2, CA-2.6, CA-NR.11, 11.1), D-23 y D-24, `docs/evidencia/backend/realtime-recarga-2026-10-15.txt`.
- Sin base real. Pruebas dinámicas: build de producción (`next build` + `next start -H 127.0.0.1 -p 3452`) contra el mock propio (`scripts/mock-supabase`, puerto 3451), usuarios ficticios del README, Playwright de `pwe2e`.

## Veredictos por alcance

| Alcance | Veredicto | Motivo corto |
|---|---|---|
| **A. Rediseño de Cocina y Salón** | **Apto** | R-2 se cumple con y sin JavaScript y sin datos del panel en HTML ni RSC. React escapa los datos del cliente y los anuncios usan `textContent`. Los errores muestran textos fijos. Hallazgo nuevo: solo SEC-CS-01 (Informativa). |
| **B. Arreglo de tiempo real** | **Apto** | El canal se une con el JWT de la persona (nunca con la clave anon), el token no se registra ni aparece en HTML ni en el almacenamiento del navegador, sin sesión no cambia nada, y la renovación y el cierre de sesión los maneja supabase-js. Sin hallazgos. |

No hay Críticos, Altos, Medios ni Bajos nuevos. Lo preexistente (sección C) no cambia los veredictos.

## Hallazgos nuevos

### SEC-CS-01: con `loading.tsx`, la redirección por rol pasa de 307 a 200 con meta refresh y muestra 1 s el esqueleto del otro panel
- **Severidad:** Informativa. No expone datos ni da acceso; solo cambia la forma de redirigir.
- **Estado:** Confirmado (app compilada + mock).
- **Ubicación:** `app/kitchen/loading.tsx:1-5` + `app/kitchen/page.tsx:14` (`redirect("/floor")`); `app/floor/loading.tsx:1-5` + `app/floor/page.tsx:15` (`redirect("/kitchen")`).
- **Descripción:** como `loading.tsx` envuelve la página en Suspense, Next ya mandó el 200 y el esqueleto cuando la página llama a `redirect()`. Entonces la redirección viaja dentro del stream: `<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/floor">` en el HTML y `NEXT_REDIRECT` en el RSC.
  - **Nada del panel se renderiza antes de redirigir:** el `redirect` corre antes de leer pedidos y mesas, y el esqueleto no muestra nombre del local, persona ni pedidos (es estático: logo, "Cocina"/"Salón" y tarjetas vacías).
  - **Funciona sin JavaScript:** Chromium con JS desactivado termina en `/floor` o `/kitchen` por el meta refresh, en alrededor de 1 s.
  - **Impacto:** durante ese segundo el mozo ve "Cocina - Cargando los pedidos..." (y cocina ve "Salón"). Esto roza el texto literal de CA-2.6 ("sin mostrar nada de cocina"), aunque no se muestra ningún dato. Además, herramientas y registros que esperan un 3xx ahora ven un 200.
  - El anónimo sigue recibiendo 307 a `/login` desde `proxy.ts`.
- **Reproducción (solo local):** con la app compilada contra el mock, `curl -s -b "<cookie de mozo@demo.test>" http://127.0.0.1:3452/kitchen` devuelve 200 con el meta refresh mencionado. En el navegador sin JS se ve el esqueleto de Cocina y después `/floor`.
- **Recomendación (Frontend; opcional, decide el Líder o el Director si vale para CA-2.6):** sacar la decisión de rol de debajo de Suspense para recuperar el 307 y no mostrar el esqueleto ajeno. Hay dos caminos: un `layout.tsx` en `app/kitchen` y en `app/floor` que llame a `getStaffUser()` y a `redirect()` (el layout no queda envuelto por su propio `loading.tsx`), o la regla de rol en `proxy.ts` (Backend). Sin urgencia de seguridad.
- **Referencia:** CWE-601 no aplica (el destino es fijo). Es una observación de configuración y comportamiento (OWASP ASVS V4, control de acceso aplicado del lado del servidor: se cumple).

## Detalle de lo revisado

### A. Rediseño
- **R-2 y datos ajenos.**
  - **Páginas:** `page.tsx` de Cocina y Salón: `getStaffUser()`, después `NoStaffAccess` o `redirect` por rol, y recién entonces las lecturas, todas por `staff.restaurantId` (sin cambios de lógica respecto de master).
  - **Mozo en `/kitchen` y cocina en `/floor`, en HTML y en RSC:** 200 con `NEXT_REDIRECT`, sin "El Buen Sabor", sin mesas, sin platos ni clases de tarjetas.
  - **Mozo en `/floor` y cocina en `/kitchen`:** ven lo suyo. Los canales llevan el filtro de su restaurante.
  - **Navegación:** `StaffHeader` filtra los enlaces por rol (la misma tabla `LINKS` que antes estaba en `StaffNav`).
- **Exposición nueva en HTML o RSC:** el shell pasa a `StaffHeader` (componente de cliente) solo `{name, role, restaurantId, restaurantName}` de la propia persona, que ya se mostraban. El shell ya no lee `getRestaurantThemeOrDefault`, así que hay una lectura menos. Las pantallas de carga y error no tienen datos de la persona.
- **Inyección.** Probé una etiqueta de mesa `Mesa <img src=x onerror="window.__xss=1">"'` creada por el admin, una nota con el mismo contenido y un llamado de esa mesa:
  - En Cocina y en Salón: `window.__xss` quedó sin definir y hubo 0 imágenes inyectadas. La nota se muestra como texto.
  - Los anuncios `aria-live` contienen el texto literal: `useArrivalAnnouncer.ts:27` usa `textContent`, y los mensajes solo llevan la etiqueta de la mesa y el motivo, que sale de un mapa fijo. Las notas no se anuncian.
  - Los `aria-label` con la etiqueta de la mesa los escapa React.
  - No hay `dangerouslySetInnerHTML`, `innerHTML` ni `console.*` en los archivos tocados.
- **Textos de error:** `app/{kitchen,floor}/error.tsx` muestran textos fijos ("No pudimos cargar los pedidos/el salón", "Puede ser la conexión o un problema del servicio.") y no usan `error.message` ni `digest`. Lo verifiqué leyendo el código; no forcé el error en ejecución.
- **Cierre de sesión:** `LogoutButton` y `StaffHeader` usan `useLogout` (el mismo del admin). Tras el clic se va a `/login`, y volver a `/kitchen` lleva otra vez a `/login`.

### B. Tiempo real
- **Token correcto:** `startChannel.ts:9-16,20-33` espera `auth.getSession()` y llama `realtime.setAuth(access_token)` antes de `build()`. En ejecución, los `phx_join` de Cocina (3 canales) y Salón (4) llevan el JWT de `cocina@demo.test` y `mozo@demo.test` (role `authenticated`), y ninguno usa la clave anon.
- **Filtración o registro:** el catch vacío no registra nada. El token no aparece en el HTML, ni en la consola, ni en `localStorage`/`sessionStorage`.
  - La sesión vive en las cookies `sb-*`, legibles por JS. Eso es así por diseño de `@supabase/ssr` y es preexistente; ver C.
- **Sin sesión:** el `try/catch` deja todo como antes (anónimo). Las páginas de staff no se renderizan sin sesión (307 a `/login`), y el anónimo no lee `orders`/`waiter_calls` por RLS. No recibe más datos.
- **Renovación:** `supabase-js` registra `onAuthStateChange`, y con `TOKEN_REFRESHED`/`SIGNED_IN` llama `realtime.setAuth(token)`. `_performAuth` empuja `access_token` a todos los canales unidos (`revision-codigo.txt`). El `setAuth` explícito de `startChannel` no lo pisa, porque con callback `accessToken` configurado `_manuallySetToken` queda en `false`. La renovación por tiempo no la reproduje en ejecución (el mock emite JWT y no probé su expiración).
- **Cierre de sesión:** con `SIGNED_OUT`, `setAuth()` sin token hace que el callback caiga a la clave anon. En ejecución, tras "Cerrar sesión" el socket envió 3 `access_token` con la clave anon y después 3 `phx_leave`, y la página fue a `/login`.
- **Limpieza:** si el efecto se desmonta antes de que termine la espera, `cancelled` evita crear el canal. No quedan canales huérfanos.

### C. Fuera de alcance / preexistente (no cambia el veredicto)

| ID | Severidad | Detalle |
|---|---|---|
| PRE-CS-01 | Informativa | `NoStaffAccess` menciona la tabla interna `staff_users` (ya estaba en master: `components/staff/NoStaffAccess.tsx:9`). Revela un nombre de tabla a una persona autenticada sin fila de staff. Recomendación: texto sin nombres internos (Frontend; decide el Director porque es un texto visible). |
| PRE-CS-02 | Informativa | Las cookies de sesión de `@supabase/ssr` no son HttpOnly, porque el cliente del navegador las necesita para Realtime. Un XSS podría leerlas, y no encontré ninguno. Es el diseño de la librería; se mitiga con una CSP con `script-src` (hoy `next.config.ts:7` solo fija `frame-ancestors 'none'`). |
| Abiertos de antes | - | PRE-AD-01 (Media, fotos), PRE-AD-03 (Baja, entropía del token), PRE-AF-01..03 siguen igual; ver `docs/security/admin-final-2026-10-10.md`. |

## Qué NO se revisó
- Supabase real: Realtime con RLS real, expiración y renovación real del JWT en un socket largo, y el comportamiento de reconexión.
- No forcé el error del servidor en ejecución para ver `error.tsx`; lo revisé leyendo el código.
- No hay herramientas nuevas (Semgrep, gitleaks): no están instaladas y no instalé nada. No corrí `npm audit` porque no hay dependencias nuevas en el diff (`package.json` sin cambios).
- Diseño, accesibilidad y rendimiento (QA).

## Procesos levantados (todos detenidos)

| Comando | Puerto | PID | Estado |
|---|---|---|---|
| `node scripts/mock-supabase/server.mjs --port 3451` | 127.0.0.1:3451 | 22832 | Detenido (taskkill) |
| `npx next start -H 127.0.0.1 -p 3452` | 127.0.0.1:3452 | 22780 | Detenido (taskkill) |

No toqué 3500, 3501 ni 4317. El build reescribió `.next` (local, ignorado por git).

## Próximos pasos recomendados
1. SEC-CS-01 (opcional): mover el chequeo de rol a `layout.tsx` o a `proxy.ts` si el Director quiere el 307 y que no aparezca el esqueleto del otro panel (CA-2.6).
2. Verificar con Supabase real que el canal sigue recibiendo eventos después de la renovación del token (sesión de más de 1 h).
3. CSP con `script-src` (hoy solo `frame-ancestors`), tema general fuera de este alcance.

## Evidencia (`docs/security/evidencia/cocina-salon-2026-10-17/`)
- `dinamico-salida.txt`: R-2 en HTML, RSC y navegador sin JS; inyección y anuncios; tokens de los `phx_join`; cierre de sesión; netstat final.
- `cs-dinamico.mjs.txt`: script temporal de Seguridad, guardado como texto.
- `revision-codigo.txt`: extractos de supabase-js y realtime-js (renovación y cierre de sesión) y diff de código.

## Re-verificación SEC-CS-01 (2026-10-17)

- **Corrección revisada:** `c376018` (merge `614dffb`), rama `feat/staff-redesign` @ `0992ed2`. `git diff 5793fb8 0992ed2` solo toca código en `app/kitchen/layout.tsx` y `app/floor/layout.tsx` (nuevos), en las dos `page.tsx` (cambian `getStaffUser` por `getCurrentStaff`) y en `components/staff/currentStaff.ts` (nuevo).
  - **Layouts:** `getCurrentStaff()`, después `NoStaffAccess` o `redirect()` por rol, y recién entonces `children`. El layout no queda envuelto por el Suspense de su `loading.tsx`.
  - **Páginas:** conservan el mismo chequeo como segunda barrera.
- **`cache(getStaffUser)`:** `cache` de React memoriza por request de renderizado del servidor, no entre requests, y la función no recibe argumentos (la sesión sale de las cookies de ese request). Lo verifiqué en ejecución con 40 pedidos simultáneos a `/kitchen` alternando mozo, cocina y admin: 0 resultados incorrectos. Cada mozo recibió 307 a `/floor`, cocina vio solo "Cocina Demo" y el admin solo "Admin Demo".
- **Resultados (build de producción + mock propio):**
  - **Mozo en `/kitchen` y cocina en `/floor` (carga directa):** **307** a `/floor` o `/kitchen`. El cuerpo no trae ningún esqueleto ni datos del panel. En Chromium, con y sin JS, la navegación es `307 /kitchen -> 200 /floor` (y al revés).
  - **Sin sesión:** 307 a `/login?redirect=...`, igual que antes (`proxy.ts`). Un autenticado sin fila de staff ve "sin acceso", sin datos.
  - **Admin:** entra a los dos paneles (200 con sus datos). Mozo en `/floor` y cocina en `/kitchen` también siguen entrando.
  - **Navegación interna (RSC), capturada al admin y repetida con mozo y cocina:** 200 con `NEXT_REDIRECT;replace;/floor;307;` (o `/kitchen`) dentro del payload, unos 4 KB, sin datos ni esqueleto del otro panel. La RSC plana da lo mismo.
- **Clasificación del 200 en RSC:** no es hallazgo. Es como Next transporta un `redirect()` en una petición de navegación de cliente: el router lo aplica con `replace`, y no viaja nada del panel porque el layout corta antes de renderizar `children`. Eso cumple R-2 y CA-2.6 en lo que respecta a seguridad.
- **Estado de SEC-CS-01: CERRADO.**
- **Veredictos:** A **Apto** (sin hallazgos abiertos del alcance) y B **Apto** (sin cambios). Lo preexistente (PRE-CS-01, PRE-CS-02) sigue igual.
- **Evidencia:** `evidencia/cocina-salon-2026-10-17/sec-cs-01-recheck.txt` (salida completa y netstat final) y `sec-cs-01-recheck.mjs.txt` (script temporal).
- **Herramienta:** Playwright de `pwe2e` es ahora la 1.64.1, que pide un Chromium (1248) que no está instalado. Usé el `chromium_headless_shell-1243` ya presente con `executablePath`. No instalé nada.
- **Procesos:** mock (PID 23492, puerto 3451) y app (PID 21524, puerto 3452), detenidos con `taskkill /F /T`; netstat 3450-3469 sin escuchas. No toqué 3500, 3501 ni 4317.
