# Release candidato: admin nuevo de MenuSky

Preparado por el Líder Técnico, 2026-10-10 (actualizado tras las decisiones del Director del 2026-10-10).
**NO desplegado. NO integrado en master. Requiere autorización del Director.**

- Rama: `feat/admin-ui` (contiene `feat/admin-redesign`, `feat/admin-sec`, `feat/admin-brand`, `feat/admin-live-pending`, `feat/admin-mesas`, `feat/admin-4b`, `fix/body-font`, `fix/admin-role-pages`, `fix/sec-af-02`, `fix/admin-qa-03-04` y master 7fcadc0). 89 commits sobre master.
- Spec: `docs/specs/admin.md`. Diseño: `docs/design/admin-boceto-aprobado.md` y `docs/design/admin/maquetas/` (aprobadas).
- Seguridad: `docs/security/admin-final-2026-10-10.md`. A (re-auditoría SEC-AD-01..06 + SEC-AF-02): **Apto**. B (admin completo): **Apto**. SEC-AF-01 y SEC-AF-02 cerrados y re-auditados (368640e, 9052664).
- QA: `docs/qa/admin-2026-10-10.md` (3612e23 + re-test e6a73aa). **Aprobado** (flujo QR + SEC-AF-02, defectos QA-AD-03/04 cerrados, regresión corta).

## Notas de versión (en simple)
- Admin nuevo con la identidad de MenuSky: menú lateral en escritorio y pestañas abajo en celular (Inicio, Carta, Mesas, Estilo).
- Carta: interruptores tipo iPhone para "Disponible / Sin stock", búsqueda y hoja de edición de platos.
- Mesas en vivo (libre, ocupada, llamando), filtros, QR e "Imprimir todos".
- Inicio: "Así viene el día" con 4 datos y 4 accesos rápidos.
- Apariencia: "Tu carta, a tu estilo", misma función que antes, otro aspecto y validación de colores.
- Estados vacíos, de carga y de error con Pomo.
- Seguridad:
  - permisos por rol en la base (migración 0004);
  - los pedidos los crea la base con el total recalculado;
  - el público ya no puede listar las mesas ni sus códigos QR; solo abre la mesa del QR que tiene;
  - límite de 10 pedidos por mesa cada 10 minutos ("Recibimos muchos pedidos de esta mesa. Esperá unos minutos o llamá al mozo."); los pedidos cancelados no cuentan;
  - mozo y cocina no ven datos del admin.
- Cliente: "Tu pedido" se actualiza cada ~3 s (antes, al instante).
- Cocina y Salón: sin rediseño (es la próxima fase); el texto ya no sale en Times New Roman.
- Sin dependencias nuevas.

## Build verificado
- `next build` con variables ficticias en `feat/admin-ui` @ e6a73aa: exit 0. Salida: `docs/releases/admin-build-2026-10-10.txt`.
- El código del candidato es el mismo que probó QA en el re-test: después de 9eae97c no cambió nada en `app`, `components`, `lib`, `supabase` ni `scripts`.
- master ya está contenido en `feat/admin-ui`: el merge no tiene conflictos.

## Plan de salida (cuando el Director autorice; NADA de esto está hecho)
ORDEN OBLIGATORIO: primero el código, después la migración.
1. Respaldo: anotar el commit actual de master (hoy 7fcadc0) y el despliegue vigente en Vercel.
2. `git switch master`, `git merge --no-ff feat/admin-ui`, `npm run build` y `git push origin master`. Vercel publica.
3. Prueba de humo del código con la base vieja (funciona por el modo compatibilidad `TEMP-COMPAT-0004`): abrir la carta desde un QR, hacer un pedido, verlo en Cocina y entrar al admin.
4. El Director aplica la migración 0004 siguiendo `docs/releases/admin-migracion-0004.md`.
5. Prueba de humo de la migración, pasos 10 a 16 del instructivo, todos obligatorios:
   - 10: el mozo no puede cambiar un precio;
   - 11: sin sesión no se leen pedidos;
   - 12: con la clave pública;
   - 13: límite de pedidos por mesa (los cancelados no cuentan);
   - 14: sin sesión no se listan mesas;
   - 15: con el token del QR se abre la carta y se pide;
   - 16: admin, mozo y cocina ven sus mesas.
6. En una entrega posterior se quita `TEMP-COMPAT-0004` (incluye `lib/tables/getTableByToken.ts`).

## Plan de vuelta atrás
- Si falla el código (pasos 2 y 3): en Vercel, "Promote" del despliegue anterior (es inmediato) y `git revert -m 1 <commit del merge>` en master. La base todavía no se tocó.
- Si falla la migración (pasos 4 y 5): correr `supabase/rollback/0004_role_policies_down.sql` en el SQL Editor. No toca datos; restaura "public read tables" y borra las 4 funciones. El código nuevo funciona con la base vieja, así que no hace falta volver atrás el código. Ojo: volver atrás la base reabre SEC-LG-06/07 y SEC-AF-02; es solo para salir del paso.

## Pendientes (backlog; no bloquean este release)
Decisiones del Director:
- PRE-AF-01 (Media, preexistente): los llamados al mozo no tienen límite. Va a la próxima fase.
- PRE-AD-01 (Media, preexistente): un admin puede borrar fotos de otro restaurante. Va a la próxima fase.
- PRE-AD-03 (Baja, preexistente): los tokens de mesa se generan con `Math.random` (~31 bits). Recomendación: `crypto.randomUUID` y regenerar los tokens (eso obliga a reimprimir los QR). Decide el Director cuándo.

Técnicos:
- Quitar `TEMP-COMPAT-0004` cuando la migración esté confirmada en producción.
- QA-AD-01 (Baja): en Inicio, las tarjetas de datos y de accesos rápidos animan la sombra; con reduced-motion no se anima.
- QA-AD-02 (Baja): el título de la pestaña queda vacío un instante al cargar (no se reprodujo en el re-test).
- SEC-AF-03 (Informativa): Inicio relee los datos en el servidor solo para detectar error.
- 3 temas predefinidos (Clásico, Glaciar y Madera) con contraste < 4,5:1 en la carta del cliente (preexistente).
- Pruebas desactualizadas (no son defectos):
  - 4 pruebas del login, por cambios aprobados en la spec del admin;
  - 1 aserción de `docs/qa/evidencia/admin-2026-10-10/regresion-fuera-admin.mjs` (línea 134) que espera el 429 en el intento 9; con D-21 los cancelados no cuentan y el 429 llega en el intento 10.

Próxima fase: rediseño de Cocina y Salón con el estilo de la Carta.

## No verificado sin base real ni equipos reales
- RLS, Storage y Realtime reales, y la concurrencia del límite. Lo cubren la prueba de humo del Director y la base de prueba (PGlite, 176/176).
- Celulares reales, escaneo del QR, lectores de pantalla, Safari y Firefox, e impresión real de QR.
- Rendimiento en la PC de 16 GB.
