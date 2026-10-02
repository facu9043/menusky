# Estado del frente LOGIN (para retomar si se corta la sesión)

Mantenido por el Líder Técnico del frente login. Se actualiza y se commitea ANTES de
cada delegación y después de cada paso verificado.

- Worktree: `C:\Users\Windows10\Desktop\menusky-login`, rama `feat/login-redesign`
  (desde `feat/landing-page` @ efbbfd5). Sin push, sin merge.
- NO tocar `C:\Users\Windows10\Desktop\menusky` (otro Líder cierra el QA de la landing ahí).
- Puertos: 3000 y 53659 ocupados por otros procesos (no tocar). Este frente usa 3200+.
- Env ficticias (ver docs/ESTADO.md, "Reglas operativas"): `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3200`.

Última actualización: 2026-10-02. **Paso actual: 4b (Frontend: implementación final con Pomo).**

| Paso | Estado | Evidencia |
|---|---|---|
| 0. Docs previos (ESTADO-LOGIN, sección login en STACK.md) | HECHO | este commit |
| 1. Spec `docs/specs/login.md` (product-owner) | HECHO (v1.0 borrador, 8 preguntas al Director) | 6159364 |
| 1b. Línea base de peso de /login (Líder) | HECHO: JS 255,8 KB gzip, CSS 14,4, HTML 4,0, total 274,2 KB (`scripts/measure-login-weight.mjs`, build con env ficticias, next start 127.0.0.1:3200). Presupuesto: JS <= 265,8 KB, total <= 320 KB | este commit |
| 2. 3 propuestas de mascota SVG + dirección visual + borrador (frontend) | HECHO y verificado por el Líder (diff solo en archivos permitidos, handleSubmit igual, ?mascota=1/2/3 OK, sin scroll horizontal 180/320/360 por CDP, JS 250,8 KB gzip). CA-9.2 revisado a 380 KB contando fuentes (borrador 374,3 KB) | 023c11a..459f7c0 |
| 3. Informe al Director (punto de aprobación: mascota + preguntas) | RESPONDIDO 2026-10-02 (ver abajo) | |
| 4. Construcción final, Seguridad, QA | BLOQUEADO hasta aprobación del Director | |

## Al retomar tras la respuesta del Director
1. PO actualiza la spec con las respuestas (v1.1).
2. Frontend: deja solo la mascota elegida, quita el selector `?mascota=` (comentario BORRADOR), quita las otras dos de `components/brand/mascot/`, línea en `docs/CREDITS.md`, termina el login.
3. Seguridad (incluye R-1 `?redirect=` abierto y R-2 roles en /kitchen y /floor como hallazgos a evaluar) -> QA -> informe.

## Respuestas del Director (2026-10-02)
1. Mascota: propuesta 3 "Pomo" (pomo de mostaza). Textual: "que sí tenga movimientos y un poco de vida". Animada y viva: idle (respiración/balanceo), parpadeo, mira al campo enfocado (o sigue el cursor si es barato), reacciones a "Entrando...", error y éxito. CSS liviano (transform/opacity), fluido en Celeron, nada con reduced-motion. Revisar el idle finito (~17 s): mantener vida sutil y espaciada (p. ej. parpadeo cada tantos segundos) sin costo continuo relevante. Proponer y medir.
2. Reacciones: SÍ.
3. Quitar ?mascota= y las propuestas 1 y 2 del código de la app; los SVG/PNG de las tres quedan en docs/design/mascota como historial.
4. Defaults del equipo (el Director puede cambiarlos): gorra "Yo ♥ MenuSky"; nombre a definir más adelante; olvidé contraseña opción A (admin resetea a mano); mostrar contraseña SÍ; logo con link SÍ; fuentes opción a (aceptar Bricolage 75,6 KB); preguntas menores: no y no.
5. R-1 ?redirect= abierto: CORREGIR ahora en LoginForm.tsx: solo rutas internas que empiecen con "/" y no con "//" ni "/\". Si toca auth, solo esa validación. CA nuevo; Seguridad y QA verifican.
6. R-2 (waiter -> /kitchen, páginas sin validar rol): NO cambiar. Seguridad lo evalúa con severidad y propuesta.
7. R-3 (try/finally, mensaje de red distinto) y R-4 (un solo anuncio accesible, toast que tapa el logo): CORREGIR ahora.
8. Lighthouse en otra PC: PENDIENTE y bloquea el release. Lo demás se verifica normal.

| Paso | Estado | Evidencia |
|---|---|---|
| 4a. Spec v1.1 (PO) | HECHO (aprobada; 3 preguntas residuales: tope 90 s del idle, PC de Lighthouse, R-2) | este commit |
| 4b. Implementación final (Frontend) | EN CURSO | |
| 5. Seguridad | PENDIENTE | |
| 6. QA | PENDIENTE | |
| 7. Informe de release | PENDIENTE | |
