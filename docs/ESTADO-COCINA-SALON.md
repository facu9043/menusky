# Estado de la fase COCINA Y SALÓN (para retomar si se corta la sesión)

Mantenido por el Líder Técnico. Se actualiza y se commitea ANTES de cada delegación.

- Repo: `C:\Users\facundo\Desktop\menusky`, sin worktrees (D-18). Rama de la fase: `feat/staff-redesign`, desde master @ d66b639 (admin publicado).
- Sin push, sin merge a master, nada a producción. Nunca base real ni credenciales reales.
- Contexto: el estado anterior del admin está en `docs/ESTADO-ADMIN.md` (rama feat/admin-ui @ 5b12886, solo local).

## Paso actual: CONSTRUCCIÓN APROBADA (2026-10-15, tema claro). Orden: 1) PO spec v1.0 -> 2) Frontend construye en feat/staff-redesign (D-23) -> 3) Seguridad y QA por alcance -> 4) release en docs/releases/ (sin merge a master ni push). Pausa ordenada cuando la sesión principal lo indique (uso 5 h al 45%).

## CAMBIO DEL DIRECTOR (2026-10-15, más tarde): construir TODO en TEMA CLARO, como las maquetas claras (`cocina.html`, `salon.html`, `shell.html` y vacías). La variante oscura NO se construye ahora. A futuro: una función de "tema oscuro" para TODOS los paneles (admin, Cocina y Salón) -> backlog, la decide el Director más adelante. Ya no hace falta la captura de Salón oscuro. Construcción APROBADA para empezar ahora.

## Respuestas del Director (2026-10-15; la 1 quedó reemplazada por el cambio de arriba)
1. Tema: (REEMPLAZADO por el cambio de arriba: rige CLARO) ~~OSCURO~~ (la variante `cocina-oscuro.html`, no el claro que era el default). Salón y el menú compartido también van en oscuro con el mismo criterio; como no hay maqueta de Salón oscuro, mostrarle una captura rápida de Salón oscuro antes de construir.
2. Siempre la paleta MenuSky, sin el color del restaurante: **SÍ**.
3. Tamaños (mesa 24-28 px, renglones 18/20 px, botones 56 px; 3 comandas por fila en tablet horizontal y 1 en celular): **SÍ**, con prueba final en tablet real.
4. Al resto de las 16 preguntas: **OK a todo como está en las maquetas y el README** (menú en celular con 2 toques como el admin; aviso de desconexión al backlog; anuncios para lector de pantalla; etiqueta "Nuevo"; textos nuevos; landing sin tocar; distribución de Salón; colores de mesa; píldora "En preparación"; contador en títulos; "Cerrar sesión" con texto; pantallas sin permiso con logo).
5. "Lo demás después": no se construye en esta sesión. Al retomar: el PO cierra la spec v1.0 con estas respuestas, captura de Salón oscuro al Director y después construcción, Seguridad, QA y release.
- Migración 0004 y pasos 10-16 en la base real: siguen NO confirmados por el Director.

## Encargo del Director (2026-10-15)
- Rediseñar Cocina (`/kitchen`) y Salón (`/floor`) con el lenguaje visual de la Carta del admin (colores, tipografías, bordes y sombras sello): "es lo característico de MenuSky; no puede haber un apartado distinto" (decisión 3 de ESTADO-ADMIN). Más: "también debe tener un rediseño como los demás paneles".
- Mismo funcionamiento que hoy; nuevo aspecto. Uso en tablet y celular.
- ESTA TANDA: solo propuesta (spec del PO + maquetas HTML estáticas del Frontend). NO se construye nada en app/ ni components/. Las maquetas esperan el OK del Director (punto de aprobación 2: dirección de arte).

## Estado del release del admin
- Publicado: master d66b639, despliegue Vercel "success", prueba de humo sin sesión OK.
- Migración 0004 y pasos 10-16 del instructivo: **NO CONFIRMADOS** por el Director (se le está preguntando). Hasta que confirme, se asume que la base de producción sigue SIN 0004 (el código anda por `TEMP-COMPAT-0004`).

## Pasos
| Paso | Estado | Evidencia |
|---|---|---|
| 0. Rama, ESTADO, identidad git (facu9043) | HECHO | este commit |
| 1. Spec `docs/specs/cocina-salon.md` (PO, agente aaf44d34aa4d1674a) | HECHO v0.1: HU-1..HU-7, CA-NR.1..11, 12 casos límite, 10 preguntas con default | este commit |
| 2. Maquetas `docs/design/cocina-salon/maquetas/` (Frontend, agente ac02212fa24c11ae7) | HECHO: 6 HTML (cocina, cocina-vacia, cocina-oscuro, salon, salon-vacio, shell), 23 capturas en 4 tamaños, axe 0, sin scroll horizontal, 0 animaciones con reduce, contraste AA | ddcc30a..9d66441 |
| 3. Aprobación del Director (spec + maquetas) | HECHO: aprobadas; tema CLARO; oscuro al backlog | c933e15 |
| 4a. Spec v1.0 (PO) | HECHO + resoluciones 11.1 del Líder (D-24) | ca0caff y este commit |
| 4b. Construcción (Frontend) | EN CURSO (se retomó tras cancelarse la pausa; estado al pausar:, último commit 190c988). Hecho: shell, Cocina, Salón, sin permiso, carga/error (9a98d37..3376371); e2e 53/53 OK (360b665). Calidad: la última corrida completa (antes de 190c988) dio 130/130 OK; la vigente da 130 OK + 6 FAIL. Los 6 FAIL son del chequeo "pedido nuevo antes de medir", agregado después: el pedido de Mesa 7 no llega por tiempo real en quality-staff.mjs, y en el script de diagnóstico tampoco llega uno de Mesa 3; en e2e-staff.mjs sí llega. Diagnóstico a medias; el commit 190c988 se hizo sin volver a correr nada. Falta: (1) resolver eso y volver a correr quality-staff.mjs para regenerar las capturas de cocina con "Nuevo", (2) regresión del admin (e2e-4b.mjs y Mesas), (3) volver a correr tsc y eslint (los cambios de 190c988 no se corrieron) y dejar las salidas, (4) README de evidencia y contraste de los estados reales, (5) informe. | 9a98d37..190c988 |
| 4c. Seguridad (por alcance) | PENDIENTE | |
| 4d. QA (por alcance + regresión admin, /login, /m, flujo QR) | PENDIENTE | |
| 4e. Release `docs/releases/cocina-salon.md` | PENDIENTE | |

## Preguntas abiertas para el Director
Las 10 de `docs/specs/cocina-salon.md` §8 y las 13 de `docs/design/cocina-salon/maquetas/README.md` (se superponen 1-3, 5-7). Notas técnicas para la construcción (decide el Líder): compartir el shell sin duplicar la suscripción de pendientes (R-9/D-20); si se deja de usar getRestaurantThemeOrDefault en estas pantallas (D-12) según la respuesta 2; confirmar Geist en el build (D-19).

## Procesos levantados (puerto, PID, dueño)
- Frontend (4b, regresión del admin): fault-proxy 127.0.0.1:3421 -> mock 127.0.0.1:3423, `next start` 127.0.0.1:3422 (PIDs en el informe). Se paran al terminar.
- Equipo: (ninguno más). Puertos: D-1 (Backend 3400-3419, Frontend 3420-3449, Seguridad 3450-3469, QA 3470-3489, Líder 3490-3499). No tocar 3500, 3501 ni 4317.
