# Estado de la fase ADMIN (para retomar si se corta la sesión)

Mantenido por el Líder Técnico. Se actualiza y se commitea ANTES de cada delegación.

- PC nueva (desde 2026-10-03): repo único en `C:\Users\facundo\Desktop\menusky`, SIN worktrees permanentes. Rama de trabajo: `feat/admin-ui` (contiene `feat/admin-redesign`, que contiene `feat/admin-sec` y `feat/admin-brand`).
- OJO: el `next dev` del Director (3500) corre sobre esa carpeta; cambiar de rama cambia lo que él ve. Dejar siempre la carpeta en `feat/admin-ui`.
- Sin push, sin merge a master, nada a producción. Supabase solo con credenciales ficticias (ver "Reglas operativas").
- Fuentes: `docs/design/admin-boceto-aprobado.md` (dirección de arte APROBADA para Carta y Mesas), `docs/STACK.md`, `docs/DECISIONES.md`, `TRASPASO.md`.

## Decisiones del Director (2026-10-03, tras la mudanza)
1. La Carta del admin está APROBADA visualmente.
2. Mesas está OK, pero tiene que usar más los colores, las tipografías y los bordes de la Carta: va dentro de la tarea de Mesas (paso 4).
3. Cocina (`/kitchen`) y Salón (`/floor`): opción B. NO se rediseñan en esta fase (sigue vigente spec admin §3.2, fuera de alcance). PRÓXIMA FASE, apenas cierre el admin: rediseñarlas igual que la Carta (mismos colores, fuentes y bordes; "es lo característico de MenuSky; no puede haber un apartado distinto").
4. Error a corregir en esta fase: en `/floor` (y `/kitchen`) el texto del body sale en "Times New Roman". Ver D-19.

## Paso actual: tanda 2026-10-03 (pasos 1 y 2 + fuente del body), luego pausa ordenada
- Paso 1 HECHO: `feat/admin-sec` (be9d6f8) integrada en `feat/admin-redesign` (merge 0b1fec1, sin conflictos) y `feat/admin-redesign` en `feat/admin-ui` (merge 44b7b84). Hecho en un worktree temporal `../menusky-redesign` (se borra al terminar la tanda) para no mover la carpeta del 3500.
- Paso 2 + D-19: delegados al Frontend (ver abajo).

## Orden para retomar
1. HECHO (ver arriba).
2. Frontend: cerrar 4a: build de producción contra el mock, re-correr `docs/design/admin/evidencia/carta-4a/{carta-e2e,quality,captures}.mjs` y guardar salidas (.txt), axe en 0 tras la corrección de contraste "Sin stock hoy", rehacer capturas sin el distintivo de `next dev`, README de cómo levantar, eslint completo. Más la corrección de la fuente del body (D-19) en `fix/body-font`.
3. Backend: sumar `kitchenPending`/`floorPending` a `AdminLiveSnapshot` (pedido del Frontend, R-9: hoy el shell abre un 2.º canal Realtime con `useStaffPendingCounts`).
4. Frontend 4b: Mesas (en vivo con `useAdminLive`, `refresh()` tras crear/borrar mesa) usando más colores, tipografías y bordes de la Carta (decisión 2 del Director), "Imprimir todos", Inicio, Apariencia, estados vacíos.
5. Seguridad final (retomar a a88b404df132855eb) y QA (veredictos por alcance, capturas en `docs/qa/capturas/admin/`).
6. Informe de release al Director.

## Decisiones que esperan al Director
- D-9: defaults de la spec (pedidos de hoy = día AR; Ocupada = pedido activo; sin sonido en admin; "Default" -> "Clásico"; theme null -> MenuSky; "Tu pedido" con hasta ~3 s de demora; plato nuevo igual que hoy).
- D-14: límite de 10 pedidos por mesa cada 10 minutos y su texto.
- D-16: estilo del tema MenuSky en la carta del cliente (`brutal`, esquinas rectas) o un estilo nuevo "sello" redondeado.
- Desvíos del boceto en Carta (informe del Frontend 4a): edición en panel lateral en escritorio; hoja con Descripción, Opciones y Eliminar; píldoras "Todas" y "+ Categoría"; menú ⋯ por categoría; buscador también en escritorio; Pomo en confirmaciones; textos nuevos de validación.
- Backlog de seguridad preexistente: PRE-AD-01 (Media: un admin puede borrar fotos de otro restaurante), PRE-AD-02..04.
- Migración 0004 en la base real: la aplica el Director con `docs/releases/admin-migracion-0004.md` (en feat/admin-sec), DESPUÉS de desplegar el código.

## Pasos
| Paso | Estado | Evidencia |
|---|---|---|
| 0. Preparación: identidad git (facu9043 / facu785@gmail.com, la del historial), `npm install` (exit 0), docs ESTADO-ADMIN y DECISIONES | HECHO | 556d575 |
| 1. Spec `docs/specs/admin.md` (PO) | HECHO: v1.0, 7 preguntas abiertas, ninguna bloquea; defaults aplicados (D-9) | 0385176 |
| 2. Arquitectura y contratos (`docs/STACK.md` sección admin, `docs/api/admin.md`, D-3..D-9) | HECHO | f7d256d |
| 3a. Backend: SEC-LG-06, SEC-LG-07, R-2 + capa de datos del admin + Supabase simulado para pruebas | HECHO. RLS 117/117 (re-ejecutado por el Líder), e2e contra mock 53/53, sondeo 10/10, unitarias 25/25 x 4 zonas, fallback OK. Desvíos aceptados D-10..D-12; rate limit pendiente D-13 | feat/admin-sec ebe42b0..180c0d2 |
| 3b. Frontend: archivo de marca único + Bricolage centralizada + tema MenuSky predeterminado | HECHO: `--ms-bun:` 1 resultado, Bricolage 1 llamada y 1 archivo descargado, MenuSky 0 avisos, regresión 31/32 idénticas (1 ruido de foto explicado) | feat/admin-brand edda694..c3976f2 |
| 3c. Seguridad: auditoría temprana de la migración y del flujo de pedidos | HECHO: Apto con reservas (SEC-AD-01 Media, SEC-AD-02/05 Baja, 03/04/06/07 Info); SEC-LG-06 y R-2 cerrados, SEC-LG-07 parcial. Correcciones HECHAS por Backend (c116af4..be9d6f8: RLS 131/131, e2e 58/58), re-auditoría pendiente | feat/admin-sec 08b220f, docs/security/admin-sec-2026-10-03.md |
| 4a. Frontend: shell + Carta + hoja | CASI HECHO: e2e propio 126/0 (en dev contra el mock), sin scroll horizontal, reduced-motion OK; falta cierre (ver Orden para retomar) | feat/admin-ui 490761c..e163194 |
| 4b. Frontend: Mesas, imprimir, Inicio, Apariencia | PENDIENTE | |
| 5. Seguridad final (por alcance) | PENDIENTE | |
| 6. QA (por alcance) + capturas en `docs/qa/capturas/admin/` | PENDIENTE | |
| 7. Correcciones, informe de release | PENDIENTE | |

## Rendimiento (regla 17)
El Director pidió NO limitar animaciones por el Celeron de prueba. Aquí solo se verifica: animaciones en
`transform`/`opacity`, `prefers-reduced-motion`, CLS y ausencia de tareas largas obvias. La medición de
rendimiento (Lighthouse / fluidez) se hace después en la PC de 16 GB del Director. Ningún número medido en
el Celeron se usa como meta.

## Hallazgos abiertos
- `docs/releases/login-redesign.md` NO tiene una sección "Notas para la fase Admin" (el encargo la menciona). La deuda se tomó de `docs/STACK.md` (tokens duplicados, Bricolage en dos layouts, Geist Mono precargada en /login) y de `docs/security/login-2026-10-02.md` (SEC-LG-06/07, R-2).

## Procesos levantados (puerto, PID, dueño)
- 3500 `next dev` (PID 13644) y 3501 mock de Supabase (PID 3864): de la sesión principal/Director. NO tocar.
- Equipo: (ninguno)

## Reglas operativas
- Puertos: ver D-1 en `docs/DECISIONES.md`. 3500 = `next dev` del Director: no tocar. Nunca matar procesos ajenos.
- Env ficticias para build/start: `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3000` (o la URL del Supabase simulado local cuando exista).
- NUNCA credenciales reales ni migraciones contra una base real: la migración la aplica el Director.
- `next start` siempre con `-H 127.0.0.1`.
- Commits chicos; delegaciones en primer plano.
