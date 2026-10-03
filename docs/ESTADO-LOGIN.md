# Estado del frente LOGIN (para retomar si se corta la sesión)

Mantenido por el Líder Técnico del frente login. Se actualiza y se commitea ANTES de
cada delegación y después de cada paso verificado.

- Worktree: `C:\Users\Windows10\Desktop\menusky-login`, rama `feat/login-redesign`
  (desde `feat/landing-page` @ efbbfd5). Sin push, sin merge.
- NO tocar `C:\Users\Windows10\Desktop\menusky` (otro Líder cierra el QA de la landing ahí).
- Puertos: 3000 y 53659 ocupados por otros procesos (no tocar). Este frente usa 3200+.
- Env ficticias (ver docs/ESTADO.md, "Reglas operativas"): `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy-anon-key NEXT_PUBLIC_SITE_URL=http://localhost:3200`.

Última actualización: 2026-10-02. **Paso actual: 6b (Frontend corrige QA-LG-01; luego re-test delta de QA).** La sesión principal tiene un `next dev` en el 3300 de este worktree: NO tocar.

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
| 4b. Implementación final (Frontend) | HECHO. Verificado por el Líder: diff solo en archivos permitidos (13), `node scripts/check-safe-redirect.mjs` 34/34 OK, 0 toast en LoginForm, sin servidores propios. Mediciones del Frontend (en el Celeron): JS 252,5 KB gzip, total con fuentes 376,6/380 KB, idle +~2 pts CPU/GPU vs reduced-motion (al límite), 0 layout/paint en reposo | 449ba05..9150d24 |
| 4c. Decidir idle: aceptar parpadeo cada 5,5 s (costo al límite del umbral de 2 pts) o recortar a "solo reacciones" (~0) | HECHO: se acepta el parpadeo (ver Decisiones del Líder (f) en la spec) | docs/specs/login.md |
| 5. Seguridad | HECHO: **Apto con reservas** (SEC-LG-01 Baja: safeRedirect acepta /.//evil, reproducido por el Líder; SEC-LG-02 Info contraseña visible en éxito; SEC-LG-03 Baja braces vía shadcn, preexistente; SEC-LG-06/07 Media potencial RLS preexistentes, fuera de alcance; R-2 Baja con propuesta) | docs/security/login-2026-10-02.md |
| 5b. Corrección SEC-LG-01/02 (Frontend) | HECHO ciclo 1: check-safe-redirect 40/40 (verificado por el Líder) | f54e920, bfbb1a7 |
| 5c. Re-auditoría delta de Seguridad | HECHO: **Apto para el alcance login** (SEC-LG-01/02 cerrados; SEC-LG-03, 06, 07 y R-2 preexistentes, fuera de alcance, decide el Director; 06/07 bloquean un release a producción de la app, no el merge del login) | este commit |
| 6. QA | HECHO: **Aprobado con reservas** (QA-LG-01 Baja: entrada de la mascota 640 ms > 600 ms CA-5.3; QA-LG-02 Baja: GPU 5-11 % los primeros 10-40 s en Chrome recién abierto, a confirmar por el Director con Shift+Esc; CA-10.11.4 +2,05 en una corrida, dentro de la tolerancia del Líder) | docs/qa/login-2026-10-02.md, 9679768 |
| 6b. Corrección QA-LG-01 (Frontend) | HECHO: .lg-stage 480+120 ms. Solo CSS de una animación: sin superficie de seguridad, el Líder decide NO re-auditar Seguridad | 4ccb8b1 |
| 6c. Re-test delta de QA | EN CURSO | |
| 7. Informe de release | PENDIENTE | |

## Orden para retomar (tras la pausa)
1. 4c: decidir el idle (Líder; si se recorta, delegar al Frontend).
2. 5: Seguridad en primer plano sobre feat/login-redesign desde 9f19187: safeRedirect (R-1, CA-4.11..4.15), sin secretos, sin deps nuevas, que no se haya tocado auth fuera de lo autorizado, y EVALUAR R-2 (mozo -> /kitchen, /kitchen y /floor sin validar rol) con severidad y propuesta, sin cambiarlo.
3. 6: QA en primer plano con spec v1.1, informe de Seguridad, scripts CDP del Frontend (carpeta temporal lt-fe-cdp, no commiteada: pedir que QA los reescriba en docs/qa/scripts si los necesita). Incluye NVDA/teclado si puede, R-15 (foco tras error), regresión de rutas.
4. 7: informe de release al Director.

## Hallazgos abiertos
- Idle al límite del umbral CA-10.11 (decisión 4c). Respiración y seguimiento del cursor recortados por costo (medido).
- Peso: margen de 3,4 KB hasta 380 KB.
- Bloquean el release: Lighthouse en otra PC (CA-9.5); originalidad de Pomo CA-3.4 puntos 2 y 5 (tarea humana del Director).
- Pregunta al Director: tope de 90 s del idle (default) vs indefinido con botón de pausa (WCAG 2.2.2).
- R-2 pendiente de evaluación de Seguridad y decisión del Director.
- Si staff_users falla por red, postgrest reintenta ~8 s con el botón en "Entrando..." (librería).
- CA-4.17(d) (excepción dentro de la consulta a staff_users) sin probar: requiere stub aprobado.
