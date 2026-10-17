# SEC-CS-01: la redirección por rol vuelve al 307 (2026-10-17, rama fix/staff-role-redirect)

Hallazgo: `docs/security/cocina-salon-2026-10-17.md`, SEC-CS-01 (Informativa). Con `loading.tsx`, `redirect()` en la
página corría dentro del Suspense ya iniciado: 200 + `<meta http-equiv="refresh">` y ~1 s del esqueleto del otro panel.

## Cambio
- `app/kitchen/layout.tsx` y `app/floor/layout.tsx` (nuevos): leen la persona y, si el rol no corresponde, llaman a
  `redirect()`; sin fila de staff devuelven `NoStaffAccess`. Según la guía de Next 16
  (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`, líneas 86 y 101-120),
  `loading.js` NO envuelve el `layout.js` de su segmento, y el código de estado solo se puede fijar antes de que
  empiece el streaming: por eso desde el layout `redirect()` vuelve a dar 307. No hizo falta tocar `proxy.ts`.
- `components/staff/currentStaff.ts` (nuevo): `cache(getStaffUser)`, para que layout y página compartan UNA lectura
  por pedido (sin consultas nuevas; `lib/` sin cambios).
- `app/kitchen/page.tsx` y `app/floor/page.tsx`: usan `getCurrentStaff()`. Conservan su chequeo de rol como defensa.

## Antes / después (HTML, sin seguir redirecciones)
| Rol | Ruta | Antes (Seguridad, `docs/security/evidencia/cocina-salon-2026-10-17/dinamico-salida.txt`) | Después (`redirect-check-salida.txt`) |
|---|---|---|---|
| mozo | /kitchen | 200 + meta refresh a /floor (esqueleto de Cocina) | **307 Location /floor**, sin esqueleto ni datos |
| cocina | /floor | 200 + meta refresh a /kitchen (esqueleto de Salón) | **307 Location /kitchen**, sin esqueleto ni datos |
| mozo | /floor | 200 | 200 con "Cargando el salón..." en el stream y sus datos |
| cocina | /kitchen | 200 | 200 con "Cargando los pedidos..." en el stream y sus datos |
| admin | /kitchen y /floor | 200 | 200 en los dos, con su pantalla de carga |
| anónimo | /kitchen y /floor | 307 a /login (proxy.ts) | 307 a `/login?redirect=...` (sin cambio) |
| sin fila de staff | /kitchen y /floor | 200 con NoStaffAccess (tras el esqueleto) | 200 con NoStaffAccess, sin esqueleto |

Notas: el cuerpo del 307 (que el navegador no muestra) trae el árbol del router de Next, donde el título del
loading figura como dato ("Cocina"); no trae HTML del esqueleto ni datos del local. Los pedidos RSC (navegación
del cliente) siguen respondiendo 200 con la redirección dentro del payload, como antes; sin esqueleto ni datos.
Sin JavaScript, el mozo en /kitchen recibe 307 y termina en /floor sin pasar por "Cocina".

## Pruebas (build de producción + mock, puertos 3421 mock y 3422 app; ya parados)
| Archivo | Resultado |
|---|---|
| `redirect-check-salida.txt` | 13 OK / 0 FAIL |
| `mock-e2e-salida.txt` (`scripts/mock-supabase/e2e.mjs`) | **58/58 OK** (incluye "mozo: /kitchen -> 307 a /floor" y "cocina: /floor -> 307 a /kitchen") |
| `e2e-staff-salida.txt` (`../e2e-staff.mjs`) | **53 OK / 0 FAIL** |
| `tsc-eslint-salida.txt` | tsc exit 0; eslint de lo tocado exit 0 |

Herramientas: `TOOLS_DIR` (`C:\Users\facundo\AppData\Local\Temp\pwe2e`) había quedado sin `package.json` ni
paquetes; se reinstaló con las mismas dependencias declaradas (`playwright ^1.63.0`, `@axe-core/playwright ^4.13.0`),
que resolvieron a playwright 1.64.1 y @axe-core/playwright 4.14.0.
