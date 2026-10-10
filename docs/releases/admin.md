# Release candidato: admin nuevo de MenuSky

Preparado por el Líder Técnico, 2026-10-10. **NO desplegado. NO integrado en master. Requiere autorización del Director.**

- Rama: `feat/admin-ui` (contiene `feat/admin-redesign`, `feat/admin-sec`, `feat/admin-brand`, `feat/admin-live-pending`, `feat/admin-mesas`, `feat/admin-4b`, `fix/body-font`, `fix/admin-role-pages` y master 7fcadc0). 75 commits sobre master.
- Spec: `docs/specs/admin.md`. Diseño: `docs/design/admin-boceto-aprobado.md` y `docs/design/admin/maquetas/` (aprobadas).
- Seguridad: `docs/security/admin-final-2026-10-10.md`. A (re-auditoría SEC-AD-01..06): **Apto con reservas** (SEC-AF-02). B (admin completo): **Apto** tras cerrar SEC-AF-01 (re-auditoría 368640e).
- QA: `docs/qa/admin-2026-10-10.md` (3612e23). Admin contra la spec: **Aprobado con reservas** (4 defectos Bajos, ninguno bloquea). Regresión fuera del admin: **Aprobado**. Accesibilidad: **Aprobado**.

## Notas de versión (en simple)
- Admin nuevo con la identidad de MenuSky: menú lateral en escritorio y pestañas abajo en celular (Inicio, Carta, Mesas, Estilo).
- Carta: interruptores tipo iPhone para "Disponible / Sin stock", búsqueda, hoja de edición de platos.
- Mesas en vivo (libre, ocupada, llamando), filtros, QR, "Imprimir todos".
- Inicio nuevo: "Así viene el día" con 4 datos y 4 accesos rápidos.
- Apariencia: "Tu carta, a tu estilo", misma función que antes, otro aspecto, validación de colores.
- Estados vacíos, de carga y de error con Pomo.
- Seguridad: permisos por rol en la base (migración 0004), pedidos creados por la base con el total recalculado, límite de 10 pedidos por mesa cada 10 minutos ("Recibimos muchos pedidos de esta mesa. Esperá unos minutos o llamá al mozo."), mozo y cocina no ven datos del admin.
- Cliente: "Tu pedido" se actualiza cada ~3 s (antes al instante).
- Cocina y Salón: sin rediseño (próxima fase); el texto ya no sale en Times New Roman (D-19).
- Sin dependencias nuevas (`package.json` y el lock sin cambios respecto de master).

## Build verificado
- `next build` con env ficticias en `feat/admin-ui` @ 3612e23: exit 0. Salida: `docs/releases/admin-build-2026-10-10.txt`.
- Código probado por QA (64f1b8d) = código del candidato: `git diff 64f1b8d 3612e23` sobre `app components lib supabase scripts package.json` vacío.
- master ya está contenido en `feat/admin-ui`: el merge no tiene conflictos.

## Decisiones que necesita el Director ANTES de publicar
1. **SEC-AF-02 (Media, Seguridad recomienda corregir antes de producción):** cualquiera que lea los `qr_token` públicos puede gastar el cupo de 10 pedidos de todas las mesas y bloquear a los clientes reales 10 minutos, una y otra vez. Opciones: (a) aceptar el riesgo y corregir en la fase siguiente; (b) corregir ahora: no contar pedidos cancelados (barato) y/o que el público no pueda listar los `qr_token` (de fondo, cambia la migración).
2. **PRE-AF-01 (Media, preexistente):** los llamados al mozo no tienen límite. ¿Pasa al backlog junto con PRE-AD-01 (un admin puede borrar fotos de otro restaurante)?
3. **QA-AD-04:** en Inicio, el número de "Pedidos de hoy" va marrón sobre tomate (3,40:1, como la maqueta aprobada) o en papel como la Carta (4,94:1).
4. **QA-AD-03:** la entrada de Pomo dura 560 ms y la spec pide <= 400 ms. ¿Se acepta o se acorta?

## Reservas que no bloquean (para una entrega siguiente)
- QA-AD-01 (Baja): `.adm-kpi`/`.adm-tile` animan `box-shadow` (CA-12.3); con reduced-motion se apaga.
- QA-AD-02 (Baja): el título de la pestaña queda vacío un instante al cargar (axe intermitente).
- SEC-AF-03 (Informativa): Inicio relee los datos en el servidor solo para detectar error.
- 3 temas predefinidos (Clásico, Glaciar, Madera) con contraste < 4,5:1 en la carta del cliente (preexistente).
- 4 pruebas del login desactualizadas por cambios aprobados en la spec del admin (no son defectos).
- No verificado sin base real ni equipos reales: RLS y Storage reales, concurrencia del límite, celulares reales, lectores de pantalla, Safari/Firefox, impresión real de QR, rendimiento en la PC de 16 GB.

## Plan de salida (cuando el Director autorice; NADA de esto está hecho)
ORDEN OBLIGATORIO: primero el código, después la migración.
1. Respaldo: anotar el commit actual de master (hoy 7fcadc0) y el despliegue vigente en Vercel.
2. `git switch master` y `git merge --no-ff feat/admin-ui`; `npm run build`; `git push origin master`. Vercel publica.
3. Prueba de humo del código con la base vieja (modo compatibilidad `TEMP-COMPAT-0004`): hacer un pedido desde un QR, verlo en Cocina, entrar al admin.
4. El Director aplica la migración 0004 siguiendo `docs/releases/admin-migracion-0004.md` y corre su prueba de humo (pasos 10 a 13).
5. En una entrega posterior se quita `TEMP-COMPAT-0004`.

## Plan de vuelta atrás
- Si falla el código (pasos 2-3): en Vercel, "Promote" del despliegue anterior (inmediato) y `git revert -m 1 <commit del merge>` en master. La base no se tocó todavía.
- Si falla la migración (paso 4): correr `supabase/rollback/0004_role_policies_down.sql` en el SQL Editor (no toca datos). El código nuevo funciona con la base vieja, así que no hace falta volver atrás el código. Volver atrás la base reabre SEC-LG-06/07: es solo para salir del paso.
