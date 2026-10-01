# Estado del proceso (para retomar si se corta la sesión)

Mantenido por el Líder Técnico. Se actualiza y se commitea ANTES de cada delegación
y después de cada paso verificado.

Última actualización: 2026-10-01. Rama de trabajo: `feat/landing-page` (todo local, sin push, sin merge a master).

## Tarea A: vulnerabilidad de Next.js — CERRADA
- `fix/next-security` (b45a429): next y eslint-config-next 16.3.8, npm audit 9 -> 0. Seguridad Apto, QA Aprobado.
- Integrada en `feat/landing-page` (a622d58). NO integrada en master (espera autorización del Director).

## Tarea B: landing page
| Paso | Estado | Evidencia |
|---|---|---|
| 1. Spec v1.0 (PO) | HECHO | 7ec5838 `docs/specs/landing.md`, `docs/CREDITS.md` |
| 2. Arquitectura (Líder) + renombre | HECHO | 084d10e `docs/STACK.md` |
| 2b. Cabeceras de seguridad (Backend) | HECHO | 0196514, merge 7d5d8a9 |
| 3. Dirección de arte + construcción (Frontend) | HECHO hasta 66cc555 | 40269c2 ... 66cc555 |
| 3b. Pulido del Frontend en curso (anclas, CLS, 3D tras primera interacción, content-visibility) | EN CURSO: commit de resguardo 72c9651 SIN VERIFICAR | `git show 72c9651` |
| 4. Seguridad de la landing | PENDIENTE | docs/security/ |
| 5. QA de la landing | PENDIENTE | docs/qa/ |
| 6. Correcciones y re-auditoría | PENDIENTE | |
| 7. Informe final al Director | PENDIENTE | |

## Paso actual
Frontend verifica y completa el WIP 72c9651 (build, lint, Lighthouse local en puerto != 3000),
con commits chicos. Después: Seguridad -> QA.

## Reglas operativas vigentes
- El Director mira `next dev` en http://localhost:3000 (sesión principal): NO pararlo ni usar el puerto 3000. Build/start en 3100+ y parar solo lo propio.
- `next dev` escribe en `.next/dev`; no borrar `.next/dev`.
- Commits chicos y frecuentes; nada de trabajo largo sin commit.
- Delegaciones en primer plano.
- Env ficticias para build/start: `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
