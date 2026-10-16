# Estado de la fase COCINA Y SALÓN (para retomar si se corta la sesión)

Mantenido por el Líder Técnico. Se actualiza y se commitea ANTES de cada delegación.

- Repo: `C:\Users\facundo\Desktop\menusky`, sin worktrees (D-18). Rama de la fase: `feat/staff-redesign`, desde master @ d66b639 (admin publicado).
- Sin push, sin merge a master, nada a producción. Nunca base real ni credenciales reales.
- Contexto: el estado anterior del admin está en `docs/ESTADO-ADMIN.md` (rama feat/admin-ui @ 5b12886, solo local).

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
| 2. Maquetas `docs/design/cocina-salon/maquetas/` (Frontend) | EN CURSO | |
| 3. Aprobación del Director (spec + maquetas) | PENDIENTE | |
| 4. Construcción, Seguridad, QA, release | NO EMPEZAR sin aprobación | |

## Preguntas abiertas para el Director
Las 10 de `docs/specs/cocina-salon.md` §8 (tema claro u oscuro; color del restaurante; Pomo; shell compartido; tamaños de texto; aviso de desconexión; anuncios para lector; etiqueta "Nuevo"; textos nuevos; mockups de la landing). Más las que agreguen las maquetas.

## Procesos levantados (puerto, PID, dueño)
- Equipo: (ninguno). Puertos: D-1 (Backend 3400-3419, Frontend 3420-3449, Seguridad 3450-3469, QA 3470-3489, Líder 3490-3499). No tocar 3500, 3501 ni 4317.
