# Estado de la fase ADMIN (para retomar si se corta la sesión)

Mantenido por el Líder Técnico. Se actualiza y se commitea ANTES de cada delegación.

- Worktree: `C:\Users\Windows10\Desktop\menusky-admin`, rama `feat/admin-redesign` (sale de `feat/login-redesign` @ 93fd493).
- Sin push, sin merge a master, nada a producción. Supabase solo con credenciales ficticias (ver "Reglas operativas").
- Fuentes: `docs/design/admin-boceto-aprobado.md` (dirección de arte APROBADA para Carta y Mesas), `docs/STACK.md`, `docs/DECISIONES.md`.

## Paso actual: PAUSA ORDENADA (pedida por el Director, 2026-10-03)
Los 3 worktrees con `git status` limpio; ningún servidor del equipo escuchando en 3400-3499 (`netstat`).
- `menusky-admin` / `feat/admin-redesign` @ este commit: docs + merges de sec (e1ec7b8) y brand (ec26c4d).
- `menusky-admin-sec` / `feat/admin-sec` @ be9d6f8: Backend TERMINADO incluidas las correcciones SEC-AD-01..06 (c116af4, 512ce06, be9d6f8). RLS 131/131, e2e 58/58, sondeo 10/10 + legacy 6/6, build OK. AÚN NO integrado en feat/admin-redesign (lo integrado es hasta 180c0d2 + informe de Seguridad no; ver abajo).
- `menusky-admin-brand` / `feat/admin-ui` @ e163194: Frontend 4a (shell + Carta + hoja) CASI terminado; últimos 2 commits son WIP.

## Orden para retomar
1. Integrar `feat/admin-sec` (be9d6f8, trae también el informe de Seguridad 08b220f) en `feat/admin-redesign`, y luego `feat/admin-redesign` en `feat/admin-ui` (o al revés al final). Build.
2. Frontend (retomar al agente a0fd43d9630640e4a con SendMessage si existe; si no, uno nuevo con su informe): cerrar 4a: build de producción contra el mock, re-correr `docs/design/admin/evidencia/carta-4a/{carta-e2e,quality,captures}.mjs` y guardar salidas (.txt), axe en 0 tras la corrección de contraste "Sin stock hoy", rehacer capturas sin el distintivo de `next dev`, README de cómo levantar, eslint completo.
3. Backend: sumar `kitchenPending`/`floorPending` a `AdminLiveSnapshot` (pedido del Frontend, R-9: hoy el shell abre un 2.º canal Realtime con `useStaffPendingCounts`).
4. Frontend 4b: Mesas (en vivo con `useAdminLive`, `refresh()` tras crear/borrar mesa), "Imprimir todos", Inicio, Apariencia, estados vacíos.
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
(ninguno)

## Reglas operativas
- Puertos: ver D-1 en `docs/DECISIONES.md`. 3500 = `next dev` del Director: no tocar. Nunca matar procesos ajenos.
- Env ficticias para build/start: `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3000` (o la URL del Supabase simulado local cuando exista).
- NUNCA credenciales reales ni migraciones contra una base real: la migración la aplica el Director.
- `next start` siempre con `-H 127.0.0.1`.
- Commits chicos; delegaciones en primer plano.
