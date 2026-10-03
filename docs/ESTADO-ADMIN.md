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

## Paso actual: PAUSA ORDENADA (tras la tanda 2026-10-03: pasos 1 y 2 + fuente del body). Próximo: paso 3
- Paso 1 HECHO: `feat/admin-sec` (be9d6f8) integrada en `feat/admin-redesign` (merge 0b1fec1, sin conflictos) y `feat/admin-redesign` en `feat/admin-ui` (merge 44b7b84). Hecho en un worktree temporal `../menusky-redesign` (ya borrado) para no mover la carpeta del 3500.
- Paso 2 HECHO (Frontend, agente a340eb5e71f7b0515): build de producción contra mock propio; e2e 126 OK / 0 FAIL (3 corridas), quality 22 OK / 0 FAIL, axe 0 violaciones (10 pasadas, 1440 y 360), 29 capturas rehechas sin distintivo de dev, tsc 0, eslint 19 problemas preexistentes fuera del admin (0 en admin). Solo se ajustaron tiempos de los scripts, no la app. Commits 971f8a2, fbc5f15. Evidencia: `docs/design/admin/evidencia/carta-4a/*-salida.txt` y README.md.
- D-19 HECHO: `fix/body-font` 20fd9c4 (1 línea en app/globals.css), merge c476698 en feat/admin-ui. /kitchen: textos en Times 18/19 -> 0; /floor: 24/25 -> 0; landing, login, admin y /m sin cambios (0 -> 0). Verificado por el Líder: el 3500 ya sirve `--font-sans: var(--font-geist-sans)`. Evidencia: `docs/evidencia/frontend/body-font-2026-10-03.txt` y capturas antes/después. Efecto visible: además del texto, los títulos `font-heading` de shadcn en Cocina/Salón pasan de Times a Geist.
- Carpeta en `feat/admin-ui` @ este commit; sin worktrees; puertos 3400-3499 sin procesos.

## Orden para retomar
1. HECHO.
2. HECHO (ver arriba).
3. Backend: sumar `kitchenPending`/`floorPending` a `AdminLiveSnapshot` (pedido del Frontend, R-9: hoy el shell abre un 2.º canal Realtime con `useStaffPendingCounts`).
4. Frontend 4b: Mesas (en vivo con `useAdminLive`, `refresh()` tras crear/borrar mesa) usando más colores, tipografías y bordes de la Carta (decisión 2 del Director), "Imprimir todos", Inicio, Apariencia, estados vacíos.
5. Seguridad: re-auditoría de SEC-AD-01..06 (be9d6f8, ya integrado) + auditoría final; el agente a88b404df132855eb era de la PC vieja, lanzar uno nuevo con docs/security/admin-sec-2026-10-03.md y QA (veredictos por alcance, capturas en `docs/qa/capturas/admin/`).
6. Informe de release al Director.
7. PRÓXIMA FASE (decisión 3 del Director): rediseñar Cocina (`/kitchen`) y Salón (`/floor`) con los colores, fuentes y bordes de la Carta.

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
| 4a. Frontend: shell + Carta + hoja | HECHO: e2e 126/0 y axe 0 sobre build de producción; capturas de producción | feat/admin-ui 490761c..fbc5f15 |
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
- H-AD-1 (Frontend, cierre 4a, sin corregir): en la hoja de edición, al borrar un grupo de opciones el foco cae a `<body>` (fuera de la hoja); probablemente igual al borrar una opción (no verificado). Contra CA-7.9 / CA-13.3. Arreglo mínimo: devolver el foco a "Nuevo grupo" tras borrar (`components/admin/carta/ConfirmDialog.tsx` o quien lo usa). Asignar en el paso 4 y que QA lo verifique.
- eslint: 3 errores `react-hooks/set-state-in-effect` preexistentes (CallWaiterButton, CartFab, useAnimatedNumber; también en master), fuera de alcance.
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
