# Estado del frente LOGIN (para retomar si se corta la sesión)

Mantenido por el Líder Técnico del frente login. Se actualiza y se commitea ANTES de
cada delegación y después de cada paso verificado.

- Worktree: `C:\Users\Windows10\Desktop\menusky-login`, rama `feat/login-redesign`
  (desde `feat/landing-page` @ efbbfd5). Sin push, sin merge.
- NO tocar `C:\Users\Windows10\Desktop\menusky` (otro Líder cierra el QA de la landing ahí).
- Puertos: 3000 y 53659 ocupados por otros procesos (no tocar). Este frente usa 3200+.
- Env ficticias (ver docs/ESTADO.md, "Reglas operativas"): `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3200`.

Última actualización: 2026-10-02. **Paso actual: 3 (ESPERANDO al Director: elegir mascota y responder preguntas). No avanzar sin su respuesta.**

| Paso | Estado | Evidencia |
|---|---|---|
| 0. Docs previos (ESTADO-LOGIN, sección login en STACK.md) | HECHO | este commit |
| 1. Spec `docs/specs/login.md` (product-owner) | HECHO (v1.0 borrador, 8 preguntas al Director) | 6159364 |
| 1b. Línea base de peso de /login (Líder) | HECHO: JS 255,8 KB gzip, CSS 14,4, HTML 4,0, total 274,2 KB (`scripts/measure-login-weight.mjs`, build con env ficticias, next start 127.0.0.1:3200). Presupuesto: JS <= 265,8 KB, total <= 320 KB | este commit |
| 2. 3 propuestas de mascota SVG + dirección visual + borrador (frontend) | HECHO y verificado por el Líder (diff solo en archivos permitidos, handleSubmit igual, ?mascota=1/2/3 OK, sin scroll horizontal 180/320/360 por CDP, JS 250,8 KB gzip). CA-9.2 revisado a 380 KB contando fuentes (borrador 374,3 KB) | 023c11a..459f7c0 |
| 3. Informe al Director (punto de aprobación: mascota + preguntas) | ENTREGADO, esperando respuesta | |
| 4. Construcción final, Seguridad, QA | BLOQUEADO hasta aprobación del Director | |

## Al retomar tras la respuesta del Director
1. PO actualiza la spec con las respuestas (v1.1).
2. Frontend: deja solo la mascota elegida, quita el selector `?mascota=` (comentario BORRADOR), quita las otras dos de `components/brand/mascot/`, línea en `docs/CREDITS.md`, termina el login.
3. Seguridad (incluye R-1 `?redirect=` abierto y R-2 roles en /kitchen y /floor como hallazgos a evaluar) -> QA -> informe.
