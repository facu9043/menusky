# Release candidato: Cocina y Salón rediseñados + arreglo de tiempo real

Preparado por el Líder Técnico, 2026-10-17. **NO desplegado. NO integrado en master. Requiere autorización del Director.**

- Rama: `feat/staff-redesign` (desde master d66b639 = producción). Contiene `fix/realtime-session-token`, `fix/staff-role-redirect` y `fix/staff-sticky-focus`.
- Spec: `docs/specs/cocina-salon.md` v1.0 (con resoluciones 11.1, D-23, D-24). Maquetas aprobadas (tema claro): `docs/design/cocina-salon/maquetas/`.
- Seguridad: `docs/security/cocina-salon-2026-10-17.md`: A (rediseño) **Apto**, B (tiempo real) **Apto**; SEC-CS-01 cerrado (df69cef).
- QA: `docs/qa/cocina-salon-2026-10-17.md`: **Aprobado** (782fd12 aprobado con reservas por QA-CS-01; corregido en 640d0d0 y re-verificado en 006be2c: foco 16/0 en 4 anchos, calidad 136/0 con axe 0). Tiempo real con recarga 24/24, redirecciones por rol 13/13, regresión del admin, /login, /m y flujo QR sin defectos.
- **Sin migraciones. Sin dependencias nuevas** (`package.json`, lock y `supabase/` sin cambios respecto de master).

## IMPORTANTE: corrige un defecto que está HOY en producción
Al recargar `/kitchen`, `/floor` o `/admin` con la sesión guardada, la conexión en vivo se une sin el token de la sesión
(`docs/evidencia/backend/realtime-recarga-2026-10-15.txt`, con fuentes en `node_modules` de supabase-js y realtime-js).
- Con la base SIN la migración 0004: los pedidos igual llegan (la lectura de pedidos todavía es pública); los llamados al mozo nuevos no llegan en vivo tras recargar (se ven al volver a cargar la pantalla).
- Con la base CON la migración 0004: tras recargar, Cocina y Salón dejan de recibir pedidos y llamados nuevos, en silencio, hasta volver a entrar por /login.
- **Por eso: publicar esta versión ANTES de aplicar la 0004. Si la 0004 ya está aplicada, publicarla cuanto antes.** El estado de la 0004 en la base real sigue sin confirmar.

## Notas de versión (en simple)
- Cocina y Salón con el aspecto de la Carta del admin (colores, letras, bordes y sombras sello), en tema claro y siempre con la paleta MenuSky.
- Letra grande para leer a distancia y botones grandes para tablet y celular; Salón en dos columnas desde 1024 px.
- Etiqueta "Nuevo", píldora "En preparación", cantidades en los títulos, "Cerrar sesión" con texto, Pomo cuando no hay pedidos, "Todavía no hay mesas.".
- Pantallas de carga y de error ("Cargando los pedidos...", "No pudimos cargar los pedidos", "Reintentar", etc.).
- Anuncios para lector de pantalla de pedidos nuevos, llamados y pedidos listos; animaciones apagadas con "reducir movimiento".
- Mismo funcionamiento que hoy (estados, sonido y aviso, redirecciones por rol). El mozo que entra a Cocina (o la cocina a Salón) es redirigido al instante, sin ver nada del otro panel.
- Tiempo real: Cocina, Salón y el admin siguen recibiendo en vivo después de recargar.

## Build verificado
- `next build` con variables ficticias en `feat/staff-redesign` @ 006be2c: exit 0; `npx tsc --noEmit`: 0. Salida: `docs/releases/cocina-salon-build-2026-10-17.txt`.
- Es el mismo código que aprobaron Seguridad y QA (después de 006be2c solo cambian docs).
- master (d66b639) ya está contenido en `feat/staff-redesign`: el merge no tiene conflictos. 52 commits sobre master.

## Plan de salida (cuando el Director autorice; NADA de esto está hecho)
1. Respaldo: anotar el commit actual de master (hoy d66b639) y el despliegue vigente en Vercel.
2. `git switch master`, `git merge --no-ff feat/staff-redesign`, `npm run build`, `git push origin master`. Vercel publica.
3. Prueba de humo (5 minutos): entrar como cocina a /kitchen, RECARGAR la página y hacer un pedido desde un QR: tiene que aparecer solo. Igual en /floor como mozo con un llamado. Mozo en /kitchen debe ir a /floor.
4. Recién después (si todavía no se hizo) aplicar la migración 0004 con `docs/releases/admin-migracion-0004.md` (pasos 10-16), y repetir el punto 3.
5. Prueba final en tablet real a 1,5 m (pedido del Director).

## Plan de vuelta atrás
- En Vercel, "Promote" del despliegue anterior (inmediato) y `git revert -m 1 <commit del merge>` en master. No hay cambios de base de datos que revertir.
- Ojo: volver atrás reinstala el defecto de tiempo real tras recargar. Si la 0004 ya está aplicada, el staff tiene que volver a entrar por /login después de cada recarga hasta republicar.

## Pendientes (backlog; no bloquean)
- Decide el Director: (1) la hora de los pedidos sale en formato de 12 h y la maqueta aprobada la muestra en 24 h: ¿cuál va? (en consulta; no se cambió código); (2) PRE-CS-01 (la pantalla "sin acceso" muestra el nombre técnico "staff_users").
- Técnicos: PRE-CS-02 (cookies de sesión no HttpOnly, CSP mínima); orden natural de mesas ("Mesa 10" después de "Mesa 9"); probar los estados de error forzando una falla (Backend); tema oscuro para todos los paneles; aviso de desconexión; quitar `TEMP-COMPAT-0004` cuando la 0004 esté confirmada.
- Pruebas viejas (no son defectos): aserción del 429 en `docs/qa/evidencia/admin-2026-10-10/regresion-fuera-admin.mjs`; 4 pruebas del login.
- Herramienta: Playwright 1.64.1 en `C:\Users\facundo\AppData\Local\Temp\pwe2e` pide Chromium 1248 (no instalado); usar `executablePath` a `%LOCALAPPDATA%\ms-playwright\chromium_headless_shell-1243`.

## No verificado
Tablet y celulares reales, lector de pantalla real, Safari/Firefox, la base real (RLS y Realtime reales), los estados de error de lectura reales.
