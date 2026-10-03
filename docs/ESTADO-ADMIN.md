# Estado de la fase ADMIN (para retomar si se corta la sesión)

Mantenido por el Líder Técnico. Se actualiza y se commitea ANTES de cada delegación.

- Worktree: `C:\Users\Windows10\Desktop\menusky-admin`, rama `feat/admin-redesign` (sale de `feat/login-redesign` @ 93fd493).
- Sin push, sin merge a master, nada a producción. Supabase solo con credenciales ficticias (ver "Reglas operativas").
- Fuentes: `docs/design/admin-boceto-aprobado.md` (dirección de arte APROBADA para Carta y Mesas), `docs/STACK.md`, `docs/DECISIONES.md`.

## Paso actual
- `feat/admin-sec` y `feat/admin-brand` integradas en `feat/admin-redesign` (e1ec7b8, ec26c4d); build con env ficticias OK (Líder).
- EN CURSO en paralelo:
  - Backend: correcciones SEC-AD-01..06 (D-14, D-15) en `menusky-admin-sec` / `feat/admin-sec` (retomado con SendMessage).
  - Frontend: paso 4 (admin) en `C:/Users/Windows10/Desktop/menusky-admin-brand`, rama `feat/admin-ui` (desde `feat/admin-redesign`). Parte 4a: shell + Carta + hoja de edición. Parte 4b (después): Mesas, imprimir, Inicio, Apariencia, estados vacíos.
- Después: integrar ambas, Seguridad final (retomar al mismo agente), QA.

## Pasos
| Paso | Estado | Evidencia |
|---|---|---|
| 0. Preparación: identidad git (facu9043 / facu785@gmail.com, la del historial), `npm install` (exit 0), docs ESTADO-ADMIN y DECISIONES | HECHO | 556d575 |
| 1. Spec `docs/specs/admin.md` (PO) | HECHO: v1.0, 7 preguntas abiertas, ninguna bloquea; defaults aplicados (D-9) | 0385176 |
| 2. Arquitectura y contratos (`docs/STACK.md` sección admin, `docs/api/admin.md`, D-3..D-9) | HECHO | f7d256d |
| 3a. Backend: SEC-LG-06, SEC-LG-07, R-2 + capa de datos del admin + Supabase simulado para pruebas | HECHO. RLS 117/117 (re-ejecutado por el Líder), e2e contra mock 53/53, sondeo 10/10, unitarias 25/25 x 4 zonas, fallback OK. Desvíos aceptados D-10..D-12; rate limit pendiente D-13 | feat/admin-sec ebe42b0..180c0d2 |
| 3b. Frontend: archivo de marca único + Bricolage centralizada + tema MenuSky predeterminado | HECHO: `--ms-bun:` 1 resultado, Bricolage 1 llamada y 1 archivo descargado, MenuSky 0 avisos, regresión 31/32 idénticas (1 ruido de foto explicado) | feat/admin-brand edda694..c3976f2 |
| 3c. Seguridad: auditoría temprana de la migración y del flujo de pedidos | HECHO: Apto con reservas (SEC-AD-01 Media, SEC-AD-02/05 Baja, 03/04/06/07 Info); SEC-LG-06 y R-2 cerrados, SEC-LG-07 parcial. Correcciones EN CURSO (D-14, D-15) | feat/admin-sec 08b220f, docs/security/admin-sec-2026-10-03.md |
| 4. Frontend: admin (shell, Carta, Mesas, Inicio, Apariencia, Pomo) | EN CURSO (feat/admin-ui, worktree menusky-admin-brand, puertos 3420-3449) | |
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
