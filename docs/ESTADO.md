# Estado del proceso (para retomar si se corta la sesión)

Mantenido por el Líder Técnico. Se actualiza y se commitea ANTES de cada delegación
y después de cada paso verificado.

Última actualización: 2026-10-01, retomado tras la pausa. Paso actual: 6 (re-test de QA del ciclo 1: QA-01 OK en ef0abde; falta QA-02 y QA-03). Retomado tras el 3er apagón (2026-10-02).
Rama de trabajo: `feat/landing-page` (todo local, sin push, sin merge a master).

## Tarea A: vulnerabilidad de Next.js — CERRADA
- `fix/next-security` (b45a429): next y eslint-config-next 16.3.8, npm audit 9 -> 0. Seguridad Apto, QA Aprobado.
- Integrada en `feat/landing-page` (a622d58). NO integrada en master (espera autorización del Director).

## Tarea B: landing page
| Paso | Estado | Evidencia |
|---|---|---|
| 1. Spec v1.0 (PO) | HECHO | 7ec5838 `docs/specs/landing.md`, `docs/CREDITS.md` |
| 2. Arquitectura (Líder) + renombre | HECHO | 084d10e `docs/STACK.md` (actualizado con el 3D en worker) |
| 2b. Cabeceras de seguridad (Backend) | HECHO | 0196514, merge 7d5d8a9 |
| 3. Dirección de arte + construcción (Frontend) | HECHO | 40269c2 ... 66cc555 |
| 3b. Pulido del Frontend (WIP 72c9651 verificado y completado) | HECHO | 2c36293, eaeaa15, 0e91e78 |
| 4. Seguridad de la landing | HECHO: **Apto** (0 hallazgos; 5 informativos SEC-L-01..05) | 8b6c943 docs/security/landing-2026-10-01.md |
| 5. QA de la landing | HECHO: **Rechazado** (QA-01 contraste, QA-02 desborde <= 337 px) | 7936f65 docs/qa/landing-2026-10-01.md |
| 6. Correcciones y re-auditoría | Ciclo 1: Frontend corrigió QA-01 (9b19ade), QA-02 (84b192b), QA-03 (33fe415); SEC-L-01 sin cambio (no hay alternativa documentada). Seguridad delta: **Apto** (335ba52, SEC-L-06 info: ruta absoluta en docs/qa/scripts/04-dark-diff.mjs, dueño QA). **EN CURSO: QA re-test** | |
| 7. Informe final al Director | PENDIENTE | |

## Autoverificación del Frontend (no reemplaza a QA)
OK: sin scroll horizontal (360/768/1440, antes y después del 3D), CLS 0, primera carga ~357 KiB / 20 requests,
Lighthouse Accesibilidad 100, SEO 100, Best Practices 100, reduced-motion (3D no carga, nada se mueve),
sin WebGL (fallback SVG, consola limpia), consola 0 errores/warnings, palabras prohibidas CA-3.2: ninguna,
anclas OK, 3D reacciona al puntero/scroll, 0 tareas largas al cargar el 3D (worker).

## Decisiones del Director (2026-10-01)
- Rendimiento: opción a) medir en una PC más potente (disponible en 1-2 días). Por esta vez se OMITE la medición de Lighthouse Performance (RNF-P1 / CA-9.1, CA-9.2). NO se descarta: queda **PENDIENTE y BLOQUEA EL RELEASE** hasta medirla en otra PC. No se cambia el diseño para perseguir esa meta. El resto (CLS, peso, accesibilidad, SEO, reduced-motion, sin scroll horizontal) se verifica normalmente.
- 3D tras la primera interacción: informado al Director, **pendiente de su aprobación**. Se deja como está.

## Hallazgos abiertos
1. **HU-9 (bloqueo) NO cumplida en este equipo** (Celeron N4020, 2 núcleos, benchmarkIndex 400-715, con la pestaña
   de :3000 consumiendo CPU). Lighthouse móvil por defecto (4x), mediana de 3: Perf 56, LCP 4,1 s, TBT 2016 ms.
   Calibrado 1x (recomendado por Lighthouse para este índice): Perf 87, LCP 3,3 s, TBT 221 ms.
   Control: `/login` (pantalla simple de la app) da TBT ~1380 ms con 4x en este equipo.
   Decisión pendiente: (a) medir en un equipo con benchmarkIndex >= 1000 sin otras pestañas pesadas,
   o (b) aceptar la medición calibrada, o (c) reducir el hero en móvil / DOM (960 nodos), lo que cambia diseño
   y requiere aprobación del Director.
2. Sin probar en Safari/iOS real (camino del worker con fallback en página).
3. QA: usar `textContent` (no `innerText`) para búsquedas de texto: `content-visibility` deja `innerText` vacío en secciones no pintadas.
4. Seguridad: Apto. Informativos: SEC-L-01 el build publica el fuente de burger.worker.ts en /_next/static/media (sin secretos); SEC-L-02 sin CSP script-src; SEC-L-05 next start escucha en 0.0.0.0 (usar -H 127.0.0.1 en pruebas). Nota: en headless con SwiftShader el 3D no pasó a live: QA confirma en navegador real.

## Defectos abiertos de QA (ciclo 1)
- QA-01 (Media): contraste 4,37:1 en tarjeta "Pedir la cuenta" (#fcece7 sobre #d7261e) y 3,58:1 en botón "Ver pedido" del mockup de temas (#fff sobre #e8590c). axe serious.
- QA-02 (Media): ancho mínimo del encabezado 337 px -> scroll horizontal en 320 px y en 360 px con zoom 200% (CA-10.4).
- QA-03 (Baja): warnings de three en consola sin GPU (KHR_parallel_shader_compile, WebGL context was lost).
- CA-9.6 no concluyente en este equipo: se mide junto con CA-9.1/9.2 en otra PC.

## Orden para retomar
1. Seguridad audita `feat/landing-page` (enlaces externos, secretos, deps nuevas three/@types/three, npm audit, cabeceras, worker, sin peticiones a Supabase/api desde `/`).
2. QA prueba todos los CA de la spec v1.0 (incluye regresión /login, /kitchen, /floor, /admin, /m/{token} 404). Lighthouse según la decisión del punto 1 de hallazgos.
3. Correcciones -> re-auditoría -> informe final al Director (con textos del hero para aprobar).

## Reglas operativas vigentes
- El Director mira `next dev` en http://localhost:53659 (sesión principal). En el 3000 quedó un node viejo (PID 3784) de antes del apagón: NO tocar ninguno de los dos. Build/start en 3100+ y parar solo lo propio.
- `next dev` escribe en `.next/dev`; no borrar `.next/dev`.
- Commits chicos y frecuentes; nada de trabajo largo sin commit.
- Delegaciones en primer plano.
- Env ficticias para build/start: `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
