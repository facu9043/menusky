# Release candidato: rediseño del login (`/login`)

Preparado por el Líder Técnico, 2026-10-03. **NO desplegado. Requiere autorización del Director.**

- Rama: `feat/login-redesign` (worktree `C:\Users\Windows10\Desktop\menusky-login`), base `feat/landing-page` @ efbbfd5.
- Spec: `docs/specs/login.md` v1.1. Seguridad: `docs/security/login-2026-10-02.md` (**Apto para el alcance login**, re-auditoría delta ciclo 1). QA: `docs/qa/login-2026-10-02.md` (**Aprobado con reservas**, re-test delta ciclo 1, QA-LG-01 cerrado).

## Notas de versión
- El login deja la lámpara con cadena: formulario visible de entrada, estilo "comanda" con la identidad de la landing (paleta hamburguesa, Bricolage Grotesque + Geist, logo con enlace a `/`).
- Mascota original **Pomo** (pomo de mostaza, SVG propio, ~1,5 KB gzip): parpadea en reposo (hasta ~90 s), mira el campo enfocado, reacciona a "Entrando...", al error y al ingreso. Sin animaciones con `prefers-reduced-motion`.
- Mostrar/ocultar contraseña (vuelve a oculta al enviar).
- Errores: "Email o contraseña incorrectos" solo para credenciales inválidas; "No pudimos conectar. Revisá tu conexión e intentá de nuevo." para red/servicio/429. El botón ya no queda trabado. Un solo anuncio accesible (sin toast).
- Seguridad: `?redirect=` solo acepta rutas internas normalizadas (corrige redirección abierta R-1 y SEC-LG-01).
- Sin dependencias nuevas. Autenticación, roles, proxy y base de datos sin cambios.

## Build verificado
- `npm run build` con env ficticias: OK (QA, re-test delta, HEAD 827014f; Seguridad delta). `npx eslint app/login components/auth components/brand scripts`: 0 errores (Líder). `node scripts/check-safe-redirect.mjs`: 40/40 (Líder).
- Peso `/login`: JS 252,6 KB gzip (línea base 255,8), total con fuentes 376,7 KB (tope 380). CLS ~0.
- Archivos fuera del login sin cambios: `git diff efbbfd5..HEAD` sobre `lib`, `proxy.ts`, `supabase`, `app/api`, `globals.css`, `app/layout.tsx`, landing, `components/ui`, `package*.json`, `next.config.ts`: vacío (Líder).

## Bloqueantes antes de producción
1. Lighthouse en una PC más potente (CA-9.5), igual que la landing.
2. Originalidad de Pomo (CA-3.4 puntos 2 y 5): silueta vista por 3 personas y búsqueda inversa de imagen (PNG en `docs/design/mascota/`).
3. Que la landing (`feat/landing-page`) esté integrada antes (esta rama sale de ella).
4. SEC-LG-06/07 (RLS preexistente, Media potencial): corregir o aceptar formalmente antes de cualquier release de la app.

## Plan de integración (cuando el Director autorice)
1. Integrar primero `feat/landing-page` según su propio cierre.
2. `git merge --no-ff feat/login-redesign` en la rama que corresponda; `npm run build`; humo de `/login`, `/`, `/kitchen` sin sesión.
3. Probar con un Supabase de pruebas (no producción) un ingreso real por rol.

## Vuelta atrás
- El cambio está aislado en `app/login/*`, `components/auth/*`, `components/brand/mascot/*` y dos scripts. Revertir el merge: `git revert -m 1 <commit-de-merge>` y redeploy. El login anterior (lámpara) es el de efbbfd5.
- No hay migraciones ni cambios de datos: la vuelta atrás no requiere tocar la base.
