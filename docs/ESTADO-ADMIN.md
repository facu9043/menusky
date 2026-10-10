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

## Paso actual: PAUSA ORDENADA. Release del admin LISTO (docs/releases/admin.md, build exit 0 en e6a73aa). Seguridad A y B Apto; QA Aprobado (re-test e6a73aa). Espera la autorización de salida del Director (merge a master + publicación; después migración 0004 con pasos 10-16). Backlog: PRE-AF-01, PRE-AD-01, PRE-AD-03, TEMP-COMPAT-0004, QA-AD-01/02, SEC-AF-03, 3 temas con bajo contraste, 4 pruebas viejas del login y 1 aserción vieja de regresion-fuera-admin.mjs. Próxima fase: Cocina y Salón con el estilo de la Carta.
- Re-auditoría de Seguridad 9052664: SEC-AF-02 CERRADO; A Apto, B Apto; SEC-AD-01 Cerrado. Nuevo preexistente PRE-AD-03 (Baja: tokens de mesa con Math.random ~31 bits; recomienda crypto.randomUUID y regenerar tokens) -> backlog, pendiente de decisión del Director. Siguiente: re-test de QA (5b-bis).
- HECHO: SEC-AF-02 por Backend (agente afb0ed0af50af6dd1; fix/sec-af-02 a543851, 70eda90, 7bc3b92; merge 2ef5af8): sin lectura pública de `tables`, `get_table_by_token`, cancelados fuera del límite; RLS 176/176, flujo QR 30/30, legado 21/21, mock e2e 58/58. QA-AD-03/04 por Frontend (agente a7836432afde2776e; fix/admin-qa-03-04 da64667, a0f74b7; merge en feat/admin-ui): número papel 4,94:1, Pomo 400 ms, e2e-4b 74/0, quality 47/0. Siguiente: re-auditoría de Seguridad y re-test de QA.
- 5a Seguridad HECHO (agente a984748b3721f1426, b48c5b5, docs/security/admin-final-2026-10-10.md): A Apto con reservas, B Apto con reservas. SEC-AF-01 (Baja, incumple CA-NR.01: páginas del admin leen datos sin comprobar rol) -> corrección delegada a Frontend en `fix/admin-role-pages`. SEC-AF-02 (Media, cuota de pedidos agotable leyendo qr_token públicos) y PRE-AF-01 (Media, llamados sin límite, preexistente) -> PREGUNTAS AL DIRECTOR (aceptar riesgo o corregir). SEC-AF-01 CERRADO: fix e3b9099 (Frontend), re-auditoría 368640e (42 OK / 0 FAIL, 0 fugas; antes 24); merge en feat/admin-ui. Veredicto B -> Apto; A sigue Apto con reservas por SEC-AF-02 (Director). 
- 5b QA HECHO (agente a7c2619c544b5bebd, 3612e23, docs/qa/admin-2026-10-10.md): admin Aprobado con reservas (104 cumplen, 9 parciales, 1 no cumple CA-12.3, 5 no verificables, 2 no aplican, sobre 121 CA); regresión /login /kitchen /floor /m Aprobado; accesibilidad Aprobado (axe 0). H-AD-1 verificado. Defectos Bajos sin bloquear: QA-AD-01 (box-shadow animado), QA-AD-02 (título vacío un instante), QA-AD-03 (Pomo 560 ms > 400), QA-AD-04 (contraste "Pedidos de hoy", decide el Director). Capturas en docs/qa/capturas/admin/.
- Release: docs/releases/admin.md + build exit 0 (docs/releases/admin-build-2026-10-10.txt). NO se hizo el merge a master.
- Paso 4b HECHO (Frontend, agente a3b2cdc8add262af8; rama `feat/admin-4b` bc7da11, b0a1e5e, df830c5): Inicio (app/admin/(inicio)/), Apariencia y estados de carga/vacío/error como las maquetas, sin píldora "Sin stock" ni ventas/"Reponer". Mesas lee ?filtro=, ?imprimir=, ?nueva=; Carta lee ?nuevo=plato. Build de producción + mock propio: e2e 74/0, quality 47/0, axe 0 en 34 pasadas (1440 y 360), sin scroll horizontal 320-1440; regresión Carta 128/0 y 22/0, Mesas 65/0; tsc 0, eslint 0 en lo tocado. Sin cambios en /kitchen, /floor, components/staff, lib/realtime, lib/floor ni lib/admin (verificado por el Líder con git diff). Evidencia: docs/design/admin/evidencia/inicio-apariencia-4b/; 34 capturas en docs/design/admin/capturas/ (inicio-*, apariencia-*, estado-*).
- DECISIONES DEL DIRECTOR (2026-10-10, sobre el release del admin): (1) SEC-AF-02: CORREGIR ANTES DE PUBLICAR, con la solución de fondo: que el público no pueda listar los `qr_token` de las mesas (solo resolver la mesa de un token que ya conoce); (2) PRE-AF-01 (llamados sin límite) al backlog de la próxima fase, junto con PRE-AD-01 (fotos); (3) QA-AD-04: el número de "Pedidos de hoy" en Inicio pasa a color papel como la Carta (contraste ~4,94:1); (4) QA-AD-03: acortar la entrada de Pomo a <= 400 ms. Después: re-auditoría de Seguridad y re-test de QA de esas correcciones, y recién ahí la autorización de salida.
- DECISIÓN DEL DIRECTOR (2026-10-10): OK a las 5 preguntas de 4b, todo queda como está construido (incluido borrar las capturas `inicio-provisorio-*.png`). Respaldo de feat/admin-ui en GitHub autorizado. Paso 5 APROBADO y en curso.
- DECISIÓN DEL DIRECTOR (2026-10-05): el paso 5 (Seguridad final + QA + informe de release) arranca DESPUÉS del 2026-10-08, cuando se renueva el límite semanal de uso (iba en ~76%+). Las 5 preguntas de 4b siguen sin respuesta: la propuesta de la sesión principal es dejar todo como quedó construido; preguntar al retomar.
- Preguntas nuevas para el Director (4b): (1) enlaces "Ver..." en las tarjetas que cargaron cuando otra falla; (2) error parcial real: fallan juntas Pedidos/Mesas/Llamados (datos en vivo) o solo "Platos sin stock"; (3) error de hex al salir del campo o a 7 caracteres; (4) esqueleto de carga de Apariencia (pedido por CA-11.4, no estaba en la maqueta); (5) borrar capturas viejas inicio-provisorio-*.png.
- Hallazgos 4b para el paso 5: Inicio relee la instantánea en el servidor (4 consultas por visita) solo para detectar error, porque useAdminLive() no expone errores (propuesta: campo de error en el proveedor, Backend); 3 paletas predefinidas (Clásico, Glaciar, Madera) con pares < 4,5:1 en la carta del cliente (preexistente); la fecha de Inicio no cambia a medianoche sin navegar; sin probar Safari/Firefox ni celular real.
- Paso 4a y 4a-bis HECHOS (Frontend a340eb5e71f7b0515) en la rama `feat/admin-mesas` (709438b H-AD-1, b559313 Mesas, 6966a68 evidencia, 0f39abf maquetas). Verificado por la sesión principal con git: sin cambios en /kitchen, /floor, components/staff, lib/realtime ni lib/floor; sin procesos del equipo. Mesas e2e 65/0, quality 20/0, axe 0 (11 pasadas); Carta sin regresión 128/0 y 22/0. Evidencia: `docs/design/admin/evidencia/mesas-4a/`, capturas `docs/design/admin/capturas/mesas-*.png`, maquetas `docs/design/admin/maquetas/` (README con 18 preguntas).
- `feat/admin-mesas` NO está integrada en `feat/admin-ui`: se integra (`--no-ff`) cuando el Director dé el ok a Mesas. La carpeta queda en `feat/admin-mesas`.
- AL RETOMAR, preguntar al Director (resumen de las 18 del README de maquetas):
  1. Inicio: título "Así viene el día", 4 datos del día y 4 accesos rápidos.
  2. Inicio: ventas del día y "Reponer" (CA-9.9) ahora o después.
  3. Apariencia: título "Tu carta, a tu estilo", 8 temas en tarjetas, MenuSky marcado "Activo".
  4. Carta: píldora removible "Sin stock" (desvío del boceto).
  5. Mesas en celular: sin "+" flotante; "Nueva mesa" en el encabezado.
  El resto de los textos: propuesta de dejarlos como en las maquetas salvo objeción.
- RESPUESTAS DEL DIRECTOR (2026-10-03): 1 SÍ; 2 DESPUÉS (ventas del día y "Reponer" quedan fuera de 4b); 3 SÍ; 4 NO (sin píldora "Sin stock" en la Carta; el estado de la maqueta `estados.html` que la muestra no se construye); 5 SÍ (Mesas aprobada tal cual). Todo lo demás (las 18 preguntas del README de maquetas, incluidos los textos de Mesas) queda COMO ESTÁ EN LAS MAQUETAS. Mesas integrada en feat/admin-ui. Paso 4b listo para construir.
- Después: integrar Mesas, paso 4b (construir Inicio, Apariencia y estados aprobados; Mesas tiene que leer `?filtro=`/`?imprimir=` para los accesos de Inicio), luego paso 5.
- Uso al pausar: 5 h ~31%+, semanal ~70% (se renueva el 2026-10-08).
- Paso 1 HECHO: `feat/admin-sec` (be9d6f8) integrada en `feat/admin-redesign` (merge 0b1fec1, sin conflictos) y `feat/admin-redesign` en `feat/admin-ui` (merge 44b7b84). Hecho en un worktree temporal `../menusky-redesign` (ya borrado) para no mover la carpeta del 3500.
- Paso 2 HECHO (Frontend, agente a340eb5e71f7b0515): build de producción contra mock propio; e2e 126 OK / 0 FAIL (3 corridas), quality 22 OK / 0 FAIL, axe 0 violaciones (10 pasadas, 1440 y 360), 29 capturas rehechas sin distintivo de dev, tsc 0, eslint 19 problemas preexistentes fuera del admin (0 en admin). Solo se ajustaron tiempos de los scripts, no la app. Commits 971f8a2, fbc5f15. Evidencia: `docs/design/admin/evidencia/carta-4a/*-salida.txt` y README.md.
- D-19 HECHO: `fix/body-font` 20fd9c4 (1 línea en app/globals.css), merge c476698 en feat/admin-ui. /kitchen: textos en Times 18/19 -> 0; /floor: 24/25 -> 0; landing, login, admin y /m sin cambios (0 -> 0). Verificado por el Líder: el 3500 ya sirve `--font-sans: var(--font-geist-sans)`. Evidencia: `docs/evidencia/frontend/body-font-2026-10-03.txt` y capturas antes/después. Efecto visible: además del texto, los títulos `font-heading` de shadcn en Cocina/Salón pasan de Times a Geist.
- Carpeta en `feat/admin-ui` @ este commit; sin worktrees; puertos 3400-3499 sin procesos.

## Orden para retomar
1. HECHO.
2. HECHO (ver arriba).
3. HECHO (Backend, agente a34953378cf15d49f; rama `feat/admin-live-pending` f026e1b, 2808828; merge en feat/admin-ui). `AdminLiveSnapshot` suma `kitchenPending`/`floorPending` derivados sin consultas nuevas; el shell del admin los lee de `useAdminLive()`. Unitarias 37/37 x 4 zonas; e2e 15/15 sobre build de producción + mock propio; 1 solo canal Realtime (`admin-live-*`, 0 `staff-pending-*`) navegando Carta, Mesas e Inicio; tsc y eslint 0 en lo tocado. /kitchen, /floor, components/staff y useStaffPendingCounts sin cambios. Evidencia: `docs/evidencia/backend/admin-live-pending-{unit,e2e,static}-2026-10-03.txt` y `admin-live-pending-e2e.mjs`. Riesgo menor: un DELETE de llamado no refresca hasta el próximo evento (D-20).
4. Frontend (partido por el Director): 4a construir Mesas + H-AD-1 + capturas; 4a-bis maquetas de Inicio, Apariencia y estados vacíos (esperan su ok); 4b construir lo aprobado. Detalle original: Mesas (en vivo con `useAdminLive`, `refresh()` tras crear/borrar mesa) usando más colores, tipografías y bordes de la Carta (decisión 2 del Director), "Imprimir todos", Inicio, Apariencia, estados vacíos.
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
- H-AD-1: CORREGIDO en 709438b (feat/admin-mesas); falta que QA lo verifique en el paso 6. Texto original: en la hoja de edición, al borrar un grupo de opciones el foco cae a `<body>` (fuera de la hoja); probablemente igual al borrar una opción (no verificado). Contra CA-7.9 / CA-13.3. Arreglo mínimo: devolver el foco a "Nuevo grupo" tras borrar (`components/admin/carta/ConfirmDialog.tsx` o quien lo usa). Asignar en el paso 4 y que QA lo verifique.
- eslint: 3 errores `react-hooks/set-state-in-effect` preexistentes (CallWaiterButton, CartFab, useAnimatedNumber; también en master), fuera de alcance.
- `docs/releases/login-redesign.md` NO tiene una sección "Notas para la fase Admin" (el encargo la menciona). La deuda se tomó de `docs/STACK.md` (tokens duplicados, Bricolage en dos layouts, Geist Mono precargada en /login) y de `docs/security/login-2026-10-02.md` (SEC-LG-06/07, R-2).

## Procesos levantados (puerto, PID, dueño)
- Ninguno: en la pausa se pararon el 3500 (`next dev`), el 3501 (mock) y el 4317 (oficina), todos de la sesión principal.
- Seguridad paso 5a (2026-10-10): mock 3451 (PIDs 2924 y 11100, modo legado) y `next start` 3452 (PID 7920) DETENIDOS con taskkill; netstat 3450-3469 sin LISTENING (docs/security/evidencia/admin-final-2026-10-10/netstat-final.txt).
- Frontend SEC-AF-01 (2026-10-10, rama fix/admin-role-pages): `next start` 3420 (PIDs 2364, 7816, 22396: uno por build), fault-proxy 3421 (PID 7104), mock 3422 (PID 12620) DETENIDOS con taskkill; netstat 3420-3449 sin LISTENING (docs/design/admin/evidencia/sec-af-01/netstat-final.txt). El 4317 (PID 8904) no es del Frontend: no se tocó.
- Backend SEC-AF-02 (2026-10-10, rama fix/sec-af-02): mock 3401 (PIDs 13260, 21568 modo legado, luego 14120) y `next start` 3402 (PID 18464) DETENIDOS con taskkill; netstat 3400-3419 sin LISTENING (docs/evidencia/backend/netstat-final-sec-af-02-2026-10-10.txt: solo TIME_WAIT). El 4317 no se tocó.
- Frontend QA-AD-03/04 (2026-10-10, rama fix/admin-qa-03-04): mock 3422 (PID 21592), fault-proxy 3421 (PID 7352), `next start` 3420 (PID 22156 build "antes", PID 2548 build "despues") DETENIDOS con taskkill; netstat 3420-3449 sin LISTENING (docs/design/admin/evidencia/qa-03-04/netstat-final.txt: solo TIME_WAIT). El 4317 no se tocó.
- QA re-test SEC-AF-02/QA-AD-03/04 (2026-10-10): next start 3470 (PID 18600), fault-proxy 3471 (PID 15184), mock 3472 (PIDs 19332 y luego 21664 modo legado) y next start 3472 del build de login (PID 8840) DETENIDOS con taskkill; netstat 3470-3489 sin LISTENING (docs/qa/evidencia/admin-2026-10-10/retest/netstat-final.txt: solo TIME_WAIT). El 4317 no se tocó.
- Equipo: (ninguno). Frontend paso 4b paró sus procesos (3420 next start, 3421 fault-proxy, 3422 mock) el 2026-10-05; netstat 3420-3449 sin LISTENING (solo TIME_WAIT de cierre).
- QA paso 5b (2026-10-10): next start 3470 (PID 8996), fault-proxy 3471 (PID 8960), mock 3472 (PID 12232) y, antes, next start 3472 para los scripts de login (PID 3576) DETENIDOS con taskkill; netstat 3470-3489 sin LISTENING (docs/qa/evidencia/admin-2026-10-10/netstat-final.txt: solo TIME_WAIT). El 4317 (PID 8904) no es de QA: no se tocó. Informe: docs/qa/admin-2026-10-10.md.

## Reglas operativas
- Puertos: ver D-1 en `docs/DECISIONES.md`. 3500 = `next dev` del Director: no tocar. Nunca matar procesos ajenos.
- Env ficticias para build/start: `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3000` (o la URL del Supabase simulado local cuando exista).
- NUNCA credenciales reales ni migraciones contra una base real: la migración la aplica el Director.
- `next start` siempre con `-H 127.0.0.1`.
- Commits chicos; delegaciones en primer plano.
