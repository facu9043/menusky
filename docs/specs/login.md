# Spec: Rediseño del login de MenuSky (ruta `/login`)

Estado: **v1.1 aprobada** (2026-10-02), con las respuestas del Director de `docs/ESTADO-LOGIN.md` ("Respuestas del Director (2026-10-02)"). Autor: Product Owner.
Rama de trabajo: `feat/login-redesign` (worktree `C:\Users\Windows10\Desktop\menusky-login`).
Stack: ver `docs/STACK.md`, sección "Arquitectura del rediseño del login". Esta spec no define tecnología.
Dirección visual de referencia: `docs/design/direccion-de-arte.md` (paleta, tipografía, movimiento) y `docs/design/login-direccion.md` (propuesta de composición del Frontend). Estado del frente: `docs/ESTADO-LOGIN.md`. Mascota: `docs/design/mascota/mascota.md`.

Convenciones:
- "Hecho verificado" = respaldado por un archivo de este repositorio (se cita la ruta). Toda afirmación sobre el código sale de este repo.
- "Decisión del Director" = texto del pedido o respuesta del Director.
- "Default del equipo, el Director puede cambiarlo" = decisión tomada por el equipo por falta de respuesta explícita; se implementa salvo que el Director diga lo contrario.
- "Propuesta del PO (a confirmar)" = detalle que propone el PO y que el Líder/Frontend pueden ajustar sin cambiar el criterio de fondo.
- Notación de criterios: CA-x.y. Se prueban sobre `npm run build && npm run start` local. Viewports: 320x568, 360x640, 768x1024, 1440x900.
- Los IDs de CA de la v1.0 se mantienen. Los cambiados llevan la marca **[CAMBIADO v1.1]**, los nuevos **[NUEVO v1.1]**. Un CA reemplazado conserva su ID y explica qué dice ahora.
- Medidas de rendimiento: la PC del Director (Celeron N4020, 2 núcleos) no sirve para Lighthouse (`docs/PILOTO.md`, E-3); allí se hace verificación de fluidez a ojo y con DevTools/Administrador de tareas, no puntaje. Lighthouse en otra PC queda **PENDIENTE y BLOQUEA el release** (decisión del Director, ver CA-9.5).

---

## 0. Registro de cambios v1.0 -> v1.1

| Tema | Qué cambia | CA afectados |
|---|---|---|
| Mascota elegida | Propuesta 3, "Pomo" (pomo de mostaza). Mascota ANIMADA y viva ("que sí tenga movimientos y un poco de vida"). Se quitan el selector `?mascota=` y las propuestas 1 (Brioche) y 2 (Pollito) del código; sus SVG/PNG quedan como historial en `docs/design/mascota/`. | CA-3.1, CA-3.12 y CA-3.13 (nuevos) |
| Animación de la mascota | P-7 (idle finito de 3 repeticiones, ~17 s) se reemplaza por un idle sutil y espaciado (respiración lenta + parpadeo) con tope de tiempo y criterios MEDIBLES de costo. Mirada hacia el campo enfocado. Seguimiento del cursor: Podría, solo si se demuestra que es barato. | CA-5.5, CA-5.7, CA-8.1, CA-9.4, CA-9.7, CA-10.1 a CA-10.14 |
| Reacciones | HU-10 pasa de Debería a **Debe** y suma la reacción de éxito (visible antes de navegar, sin demora artificial). | HU-10 |
| Defaults del equipo | Gorra "Yo ♥ MenuSky"; sin nombre visible; "olvidé mi contraseña" opción A; mostrar contraseña SÍ (Debe); logo con enlace a `/` SÍ (Debe); fuentes opción a (Bricolage 75,6 KB aceptado, CA-9.2 <= 380 KB contando fuentes); la franja roja NO se oculta en alturas < 640 px. | CA-1.3, CA-3.9, CA-6.2, CA-9.2, HU-11, HU-12 |
| R-1 (redirección abierta) | Se CORRIGE en esta etapa: `?redirect=` solo acepta rutas internas. Es el único cambio de lógica de auth (junto con el manejo de errores de R-3/R-4 de abajo). | CA-4.8, CA-4.11 a CA-4.15 (nuevos), RNF-S7 |
| R-2 (waiter -> /kitchen, páginas sin validar rol) | NO se cambia. Queda para que Seguridad lo evalúe con severidad y propuesta; decide el Director. | sección 8 (R-2) |
| Pedido "R-3" del Director (botón trabado y mensaje de red) | `handleSubmit` con try/finally; error de red/servicio con mensaje DISTINTO al de credenciales. Corresponde a la sección 7, caso 2, y al R-4 de la v1.0. | CA-4.4, CA-4.7, CA-4.16 a CA-4.19 |
| Pedido "R-4" del Director (un solo anuncio, nada tapa el logo) | El error se muestra en línea con `role="alert"` y SIN toast; nada tapa el logo. Se registra como R-11 en la sección 8. | CA-2.6, CA-6.6, CA-6.13, CA-6.14 |
| Rendimiento | Lighthouse en otra PC: PENDIENTE y bloquea el release; el resto se verifica normal. | CA-9.5, sección 10 |

Nota de numeración de riesgos: en `docs/ESTADO-LOGIN.md` el Director/Líder llaman "R-3" y "R-4" a otros riesgos que los de la sección 8 de esta spec. Para no mezclarlos, esta spec los referencia por tema (arriba) y los registra con IDs nuevos (R-11 a R-17).

---

## 1. Objetivo y contexto

### 1.1 Pedido del Director (textual)
"Agregar un panel más acorde a la temática (hoy lo vemos como la lámpara). Cambiar los colores, la tipografía y la animación, todo completo. Quizás un panel de login tradicional pero con un diseño fuerte y distintivo de MenuSky. Sumar una mascota para darle un poco de tonalidad." Para toda la app: intuitivo, lindo, llamativo y característico de MenuSky, con animaciones lindas pero LIVIANAS, porque muchos restaurantes tienen PC viejas. El Director usa un Celeron de 2 núcleos: tiene que andar fluido ahí.
Sobre la mascota elegida (2026-10-02): "que sí tenga movimientos y un poco de vida".

### 1.2 Hechos verificados del login de partida (commit `efbbfd5`, antes del rediseño)
1. `app/login/page.tsx` es un Server Component que lee `searchParams.redirect` (solo si es `string`, si no `null`) y renderiza `LoginForm` con `redirectTo`.
2. `components/auth/LoginForm.tsx` era el único componente del login. Contenía una lámpara SVG con cadena: el formulario nacía con `opacity: 0` y `pointer-events: none` hasta tirar de la cadena. Esto se elimina (ya eliminado en el borrador).
3. Lógica de partida (no cambia, salvo lo que esta spec indica en HU-4): `supabase.auth.signInWithPassword({ email, password })`; si hay error o no hay usuario: `setLoading(false)` y mensaje "Email o contraseña incorrectos"; si hay `redirectTo` se usa; si no, se consulta `staff_users.role` por `auth_user_id` y el destino es `/admin` si el rol es `admin`, y `/kitchen` en cualquier otro caso (incluye `waiter`, `kitchen` y usuario sin fila en `staff_users`); luego `router.push(destino)` y `router.refresh()`.
4. Textos de partida: título "Ingresar", bajada "Acceso para el equipo del restaurante", etiquetas "Email" y "Contraseña", botón "Entrar" / "Entrando..." (deshabilitado mientras carga). Campos `type="email"` y `type="password"`, ambos `required`, con `autoComplete="email"` y `autoComplete="current-password"`.
5. El login de partida usaba `backdrop-blur-xl`, `filter: blur(15px)` y `animate-pulse`: efectos que las PC viejas pagan caro.
6. Los toasts salen de `<Toaster position="top-center" />` en `app/layout.tsx` (componente `components/ui/sonner.tsx`), fuera de `.ms-login`, sin tokens de marca.
7. No existía registro público, "olvidé mi contraseña", enlace a la landing, `h1` ni título de pestaña propio. No hay `resetPasswordForEmail` en el código.
8. Quién llega a `/login`: la landing (`components/landing/Header.tsx`, `MobileMenu.tsx`, `Footer.tsx`), `proxy.ts` -> `lib/supabase/middleware.ts` (redirige sin sesión desde `/kitchen`, `/floor`, `/admin` a `/login?redirect=<pathname>`) y `components/staff/LogoutButton.tsx` (`router.push("/login")`).
9. `/login` NO está en el matcher de `proxy.ts`: un staff con sesión que abre `/login` ve el formulario igual.
10. `/admin` valida el rol en el servidor (`app/admin/layout.tsx`: si `staff.role !== "admin"` muestra `NotAdminAccess`).
11. `app/robots.ts` ya bloquea `/login` para rastreo.
12. Identidad de la landing reutilizable: `components/landing/brand/Logo.tsx` (`Logo`, `Isotype`), tokens `--ms-*` y de movimiento en `app/(landing)/landing.css` (`--ms-dur-fast` 160 ms, `--ms-dur` 280 ms, `--ms-ease-out`, `--ms-ease-pop`), Bricolage Grotesque, tabla de contrastes de `docs/design/direccion-de-arte.md` sección 2.

### 1.3 Hechos verificados del borrador actual (rama `feat/login-redesign`, leídos el 2026-10-02) [NUEVO v1.1]
Son el punto de partida de la construcción final.
1. `components/auth/LoginForm.tsx`, `handleSubmit` (líneas 45-72): NO tiene `try/catch/finally`. Si `signInWithPassword` o la consulta a `staff_users` lanzan una excepción, `setLoading(false)` no corre y el botón queda en "Entrando...".
2. Mismo archivo, líneas 52-57: cualquier `error` (credenciales, red o servicio) muestra `toast.error("Email o contraseña incorrectos")` y además un bloque `role="alert"` con el mismo texto (líneas 159-166): el lector de pantalla puede anunciar el error dos veces (toast + alerta). El toast sale de `<Toaster position="top-center">`, arriba al centro, y en escritorio tapa el logo mientras dura (`docs/design/login-direccion.md`, sección 9).
3. Mismo archivo, líneas 59-70: `redirectTo` se usa tal cual llega (`destination = redirectTo` y `router.push(destination)`) sin validar: con `?redirect=https://sitio-externo.example` o `//sitio-externo.example` el código lo pasaría a `router.push`. Es la R-1 de la v1.0, leída en el código (no ejecutada; Seguridad/QA la verifican).
4. Mismo archivo, línea 69: `setLoading(false)` corre ANTES de `router.push`, así que tras un éxito el botón vuelve a "Entrar" durante la navegación.
5. Mismo archivo, líneas 76-82: la mascota recibe un `data-mood` con valores `idle`, `loading`, `error-a`, `error-b` (alternados para repetir la sacudida). No existe aún estado de éxito ni de mirada por foco.
6. `app/login/page.tsx` (líneas 9-14): contiene el selector de borrador `?mascota=1|2|3` (marcado `BORRADOR`) y renderiza `<Mascot variant={...} />`. La lectura de `redirect` está en las líneas 6-7.
7. `components/brand/mascot/MascotPomo.tsx`: SVG inline `aria-hidden="true"`, con clases `m` (raíz, movimiento ocioso), `m-eyes` (grupo de ojos), `m-ok` / `m-oops` (boca normal / de error). Archivo generado por `docs/design/mascota/generar-mascotas.mjs`. Pesos medidos por el Frontend: Pomo 3648 bytes, 1298 bytes gzip, 41 elementos, sin elementos prohibidos (`docs/design/mascota/mascota.md`).
8. Animación del borrador (`docs/design/login-direccion.md`, sección 5): un solo ocioso sobre la raíz `<svg>` (3,4 s, 3 repeticiones, ~12 s) que se pausa con `focus-within`; "Entrando..." inclina la mascota 4° (280 ms); error sacude 460 ms. No hay parpadeo, mirada ni éxito.
9. Detalle de supabase-js (`node_modules/@supabase/auth-js/src/lib/fetch.ts`, líneas 75-97 y 235; `errors.ts`): una falla de red lanza `AuthRetryableFetchError` con `status` 0; las respuestas 500, 501, 502, 503, 504 y 520-530 lanzan `AuthRetryableFetchError` con ese `status`; un 400 con `code` `invalid_credentials` es `AuthApiError` con `status` 400. `signInWithPassword` devuelve esos errores en `{ error }`. El Frontend confirma el detalle final (ver CA-4.18).

### 1.4 Problema y objetivo
- Problema: el login de partida (lámpara en naranja/oscuro) no se parece a MenuSky, oculta el formulario detrás de un gesto, usa efectos costosos, no tiene la identidad de la landing, acepta cualquier `?redirect=` y deja el botón trabado ante una excepción.
- Para quién: el staff del restaurante (admin, mozo, cocina), muchas veces en PC viejas, tablets o celulares, a veces apurado y con las manos ocupadas.
- Objetivo: un login tradicional (email, contraseña, botón) visible y usable de entrada, con identidad fuerte de MenuSky (paleta de hamburguesa completa, Bricolage Grotesque + Geist, logo), una mascota original ("Pomo") VIVA pero liviana, errores claros y accesibles, y una redirección segura.
- "Intuitivo" se mide así: una persona del staff, sin explicación previa, completa el ingreso (de abrir `/login` a presionar "Entrar" con credenciales válidas) sin tocar nada más que los dos campos y el botón; prueba con 3 personas, 3 de 3 lo logran sin ayuda en menos de 30 segundos (QA o Director la convocan; notas como evidencia).

---

## 2. Alcance y fuera de alcance

### 2.1 Dentro del alcance
- Rediseño completo de la UI de `/login`: composición, colores, tipografía, animación (HU-1, HU-2, HU-5).
- Eliminación de la lámpara con cadena y de todo el código de arrastre asociado.
- Mascota "Pomo" en SVG propio, mostrada solo en el login, ANIMADA: idle sutil, parpadeo, mirada al campo enfocado y reacciones a "Entrando...", error y éxito (HU-3, HU-10).
- Quitar del código de la app el selector `?mascota=` y las propuestas 1 y 2 (CA-3.12).
- Conservación del comportamiento de autenticación, con SOLO estos cambios de lógica autorizados por el Director: (a) validación de `?redirect=` (HU-4, CA-4.11 a CA-4.15); (b) `try/finally` en `handleSubmit` y distinción entre error de credenciales y error de red/servicio (CA-4.16 a CA-4.19).
- Mostrar contraseña y logo con enlace a `/` (ahora Debe: HU-11, HU-12).
- Error en línea con un único canal accesible, sin toast (CA-6.6, CA-6.13, CA-6.14).
- Accesibilidad, responsive, `prefers-reduced-motion` y rendimiento en PC viejas (HU-6, HU-7, HU-8, HU-9).
- Título de pestaña propio de `/login`.

### 2.2 Fuera de alcance (explícito)
- Cualquier otro cambio de lógica de autenticación: consulta a `staff_users`, redirect por rol, `signInWithPassword`. Cambios en `lib/**`, `proxy.ts`, `supabase/**`, `app/api/**`.
- Cambiar el destino por rol (R-2: el mozo sigue yendo a `/kitchen`) y hacer que `/kitchen` o `/floor` validen el rol: NO se cambia; lo evalúa Seguridad (sección 8).
- Registro público o alta de usuarios; "olvidé mi contraseña" (opción A: no se agrega; el admin restablece la clave a mano); login con Google u otros proveedores; magic link; doble factor; "recordarme"; bloqueo por intentos propio.
- Redirigir al staff que ya tiene sesión lejos de `/login`.
- Timeout propio para una petición de login colgada (ver sección 7, caso 17).
- Mostrar la mascota fuera del login (landing, paneles, carta). Por ahora solo `/login`.
- Nombre visible de la mascota (a definir más adelante).
- Que la mascota se tape los ojos o reaccione al escribir contraseña/tecla por tecla (no pedido; "No por ahora").
- Cambios en la landing, paneles, carta del cliente, `app/globals.css`, `components/landing/**` (el logo se importa sin modificarlo), `components/ui/sonner.tsx` y `app/layout.tsx`.
- Modo oscuro: el login tiene un único aspecto, sin `.dark`.
- Librerías nuevas de animación o 3D (motion, gsap, lottie, three) y cualquier dependencia nueva sin aprobación del Líder.
- Sonido, videos, imágenes de mapa de bits o recursos externos en el login.
- Multi-idioma.

---

## 3. Usuarios y roles

| Rol | Qué hace en `/login` |
|---|---|
| `admin` | Ingresa con email y contraseña; sin `?redirect=` válido va a `/admin`. |
| `waiter` (mozo) | Ingresa; sin `?redirect=` válido va a `/kitchen` (comportamiento actual que NO cambia, ver R-2). |
| `kitchen` (cocina) | Ingresa; sin `?redirect=` válido va a `/kitchen`. |
| Visitante sin cuenta / curioso | Ve el login; no hay registro. Puede volver a la landing por el logo. |
| Comensal | No es público del login; entra por el QR de la mesa. |
| Director | Aprobó la mascota y decide los puntos abiertos (sección 12). |

Permisos: `/login` es público y no requiere sesión. No lee ni escribe datos propios: solo llama a Supabase Auth con las credenciales que el usuario escribe y consulta su propio rol, igual que hoy.

---

## 4. Composición (Propuesta del PO, sigue la dirección visual del Frontend, `docs/design/login-direccion.md`)

El Frontend puede ajustar proporciones sin cambiar los criterios.

- Escritorio (>= 1024 px): dos paneles (~50/50). Panel de marca (izquierda): fondo `--ms-tomato`, frase "Cocina, salón y administración, en un solo lugar." y la mascota grande. Panel de formulario (derecha): fondo crema `--ms-bun`, logo (enlace a `/`) y tarjeta tipo comanda `--ms-paper` con h1 "Ingresar", bajada, campos, error en línea y botón.
- Tablet (640-1023 px): una columna centrada con franja de marca arriba (frase + mascota mediana) y el formulario debajo.
- Móvil (< 640 px): una columna; logo y mascota compacta (alto máximo 120 px) arriba; el formulario completo (h1, campos y botón "Entrar") visible sin scroll en 360x640 sin teclado abierto (CA-1.4).
- Alturas < 640 px en una columna (default del equipo, el Director puede cambiarlo): se oculta la mascota pero NO la franja roja con la frase y el formulario siempre gana (CA-3.9).
- Detalles de marca candidatos (sin obligar): borde dentado tipo comanda, sombra dura marrón en botón. Cualquier elemento decorativo cumple HU-7.
- Frase del panel de marca: "Cocina, salón y administración, en un solo lugar." (sale de las funciones reales de la landing; no promete nada inexistente).

---

## 5. Historias de usuario y criterios de aceptación

### HU-1 Ver y usar el formulario de entrada
Como integrante del staff quiero ver el formulario apenas abro `/login`, para ingresar sin adivinar un gesto.

- CA-1.1 Dado un usuario sin sesión, cuando abre `/login` en cualquier viewport, entonces ve los campos Email y Contraseña y el botón "Entrar" visibles y usables sin ninguna interacción previa (sin tirar de nada, sin clic, sin scroll en 360x640 y 1440x900).
- CA-1.2 La lámpara y la cadena no existen: en el DOM no hay un elemento con `role="button"` ni `aria-label` con "cadena" ni "luz"; el texto "Tirá de la cadena para ingresar" no aparece; en el código de `LoginForm.tsx` no quedan los manejadores de arrastre (`onPointerDown`, `onPointerMove`, `setPointerCapture`) ni el estado `on`.
- CA-1.3 **[CAMBIADO v1.1]** Con el formulario recién cargado, el orden de tabulación es: 1.er Tab enlace del logo ("MenuSky, ir al inicio"), 2.º Email, 3.º Contraseña, 4.º botón "Mostrar contraseña", 5.º "Entrar". (En la v1.0 el primer Tab era Email y el enlace y el botón eran opcionales; ahora son Debe.)
- CA-1.4 En 360x640 sin teclado en pantalla, el h1, ambos campos y el botón "Entrar" se ven completos sin scroll vertical. Con el teclado virtual abierto, el campo activo y el botón siguen alcanzables con scroll (nada queda bloqueado).
- CA-1.5 El formulario se ve y funciona con JavaScript lento: el HTML renderizado en el servidor ya contiene h1, labels, campos y botón (verificable viendo el código fuente de la respuesta).
- CA-1.6 Intuitividad: prueba con 3 personas ajenas al proyecto; 3 de 3 completan el ingreso sin ayuda en <= 30 s (evidencia: notas de QA/Director).

### HU-2 Identidad de MenuSky (colores, tipografía, logo)
Como Director quiero que el login se vea de MenuSky y no como una plantilla.

- CA-2.1 Paleta: los colores salen solo de los tokens `--ms-*` de la landing (`docs/design/direccion-de-arte.md` sección 2), con los mismos valores HEX. QA compara los valores usados (CSS computado) contra esa tabla; un color fuera de la paleta es un defecto salvo aprobación del Líder (hoy declarados: `#FFCD3F` hover del botón amarillo, igual que `.ms-btn--cheddar:hover` de la landing, y `#7CCB4E` verde del isotipo de `Logo.tsx`). El naranja `#E8590C` y el fondo `#170f0c` del login de partida no quedan.
- CA-2.2 Rojo tomate y amarillo cheddar son los protagonistas visuales; aparecen acentos de verde y marrón. Revisión visual del Director.
- CA-2.3 Tipografía: títulos y logo en Bricolage Grotesque; cuerpo, etiquetas, campos y botón en Geist. QA verifica con "Computed > font-family" que el h1 usa Bricolage y que los inputs usan Geist. No hay otras fuentes cargadas por el login (pestaña Red), salvo las que `app/layout.tsx` ya precarga (Geist, Geist Mono).
- CA-2.4 El logo es el de `components/landing/brand/Logo.tsx`, importado sin modificarlo (git diff: ese archivo sin cambios), visible en la primera pantalla en todos los viewports, y envuelto en un enlace a `/` (HU-12).
- CA-2.5 Un único aspecto: con `prefers-color-scheme: dark` activo en el sistema el login se ve igual y legible (contraste AA mantenido).
- CA-2.6 **[CAMBIADO v1.1]** El login NO usa toasts: no hay ninguna llamada a `toast` en `LoginForm.tsx` (búsqueda de texto: 0 resultados de `toast` e `import ... sonner` en el archivo). Los errores se muestran en línea (CA-6.6). `components/ui/sonner.tsx` y `app/layout.tsx` no se tocan (siguen sirviendo al resto de la app).
- CA-2.7 Evaluación subjetiva obligatoria: el Director revisa el login (capturas en 360x640 y 1440x900 y en vivo) y confirma "intuitivo, lindo, llamativo y característico de MenuSky". Si no cumple, no sale.

### HU-3 Mascota original "Pomo"
Como Director quiero una mascota simpática y propia de MenuSky que le dé personalidad al login.

Concepto (decisión del Director, ratificada): personaje cartoon amarillo y simpático, gorra roja con el texto "Yo ♥ MenuSky" (default del equipo, el Director puede cambiarlo), delantal negro con el logo de MenuSky, comiendo una hamburguesa, trazo grueso cartoon. Elegida: **propuesta 3, "Pomo"** (pomo de mostaza: el delantal es la etiqueta del frasco). El nombre "Pomo" es de trabajo: la mascota no tiene nombre visible; el nombre se define más adelante (default del equipo, el Director puede cambiarlo).

- CA-3.1 **[CAMBIADO v1.1]** Proceso cumplido: el Frontend entregó 3 propuestas en `docs/design/mascota/` y el Director eligió por escrito la 3 (`docs/ESTADO-LOGIN.md`, "Respuestas del Director", punto 1). Se construye `components/brand/mascot/` solo con Pomo.
- CA-3.2 La mascota es SVG propio dibujado por el equipo, inline en la página: sin `<image>`, sin `href` ni `url()` a recursos externos, sin fuentes del sistema (el texto de la gorra va convertido a trazos), sin `<script>`, sin `<foreignObject>`. QA lo comprueba buscando esos elementos en el SVG y mirando la pestaña Red: cero peticiones por la mascota.
- CA-3.3 Colores de la mascota solo de la paleta `--ms-*` (amarillo `--ms-cheddar`/`--ms-mustard`, gorra `--ms-tomato`/`--ms-ketchup`, delantal `--ms-patty`, hamburguesa con `--ms-toasted`, `--ms-cheddar`, `--ms-lettuce`, `--ms-patty`), con trazo grueso oscuro `--ms-patty`. El logo del delantal es el isotipo de MenuSky (mismos trazos que `Isotype`), legible a tamaño de escritorio. Excepción heredada y a confirmar por el Líder: el verde `#7CCB4E` del isotipo (`docs/design/mascota/mascota.md`).
- CA-3.4 Originalidad (criterio de bloqueo del release). La ficha de Pomo (`docs/design/mascota/mascota.md`) debe tener las 6 verificaciones en "sí" con evidencia:
  1. No es un perro ni un animal de la misma silueta que un perro amarillo.
  2. Ojos, nariz, boca y proporciones no se parecen a Jake de Hora de Aventura ni a ningún personaje conocido: prueba de silueta con 3 revisores distintos (la silueta está en `propuesta-3-silueta.png`).
  3. No se parece a mascotas gastronómicas o de dibujos (p. ej. Jollibee, Ronald McDonald, Wendy's, Rey de Burger King, Bob Esponja, Chester Cheetah; lista no exhaustiva). Para Pomo el revisor busca además "mustard bottle mascot" y mascotas de marcas de aderezos.
  4. No se calcó ni usó como base ninguna imagen de terceros ni generador de imágenes (constancia del Frontend ya firmada).
  5. Búsqueda inversa de imagen sobre `propuesta-3.png` (Google Lens o TinEye) sin coincidencias; se adjunta captura.
  6. Los elementos no genéricos (gorra roja, delantal negro, hamburguesa) son los que pidió el Director.
  **Estado v1.1: los puntos 2 y 5 siguen PENDIENTES de evidencia** (el Frontend no tiene acceso a esos servicios). El Líder los asigna; sin ellos el criterio no está cumplido y bloquea el release. Si una verificación falla, se rehace; no se "retoca" para parecerse menos.
- CA-3.5 Peso: SVG de Pomo <= 12 KB sin comprimir (<= 4 KB gzip), <= 120 elementos SVG, sin filtros SVG (`feGaussianBlur`, `feDropShadow`, etc.), sin degradados complejos animados. Se mide con el tamaño del archivo y un conteo de nodos, DESPUÉS de agregar las partes que se animan (ojos, párpados, cara de éxito, etc.). Base medida del borrador: 3648 bytes, 1298 bytes gzip, 41 elementos.
- CA-3.6 Accesibilidad de la mascota: es decorativa (`aria-hidden="true"`, sin `title` ni foco). Todo lo que comunica (cargando, error, éxito de navegación) también está en texto fuera de la mascota (RNF-A9). Un lector de pantalla no lee "gráfico" ni nombres de archivo al recorrerla.
- CA-3.7 La mascota nunca tapa ni se superpone al formulario, a los labels, al botón ni a los mensajes de error; no recibe foco ni clics (`pointer-events: none`). Esto incluye sus animaciones (una sacudida o un salto no entra en el área del formulario ni del logo).
- CA-3.8 La mascota aparece solo en `/login`: búsqueda en el repo de su componente confirma que no se importa fuera de ese layout/página.
- CA-3.9 **[CAMBIADO v1.1]** En móvil la mascota se muestra compacta (<= 120 px de alto, CA-1.4). En alturas < 640 px en una columna la mascota se oculta (`max-height`) y el formulario siempre gana; la franja roja con la frase NO se oculta (default del equipo, el Director puede cambiarlo). En escritorio de dos paneles la mascota se achica con la altura en vez de ocultarse (`docs/design/login-direccion.md`, sección 7). Con la mascota oculta no corre ninguna animación suya (`document.getAnimations()` sin animaciones de la mascota).
- CA-3.10 Con `prefers-reduced-motion: reduce` la mascota se ve en una pose estática completa y reconocible (HU-8).
- CA-3.11 Crédito: el Líder agrega a `docs/CREDITS.md` una línea "Mascota de MenuSky: diseño original del equipo, SVG propio".
- CA-3.12 **[NUEVO v1.1]** Limpieza del borrador: (a) `app/login/page.tsx` ya no lee ni usa `searchParams.mascota`, ni el comentario `BORRADOR`, ni importa `MascotVariant`; sigue leyendo `redirect` como hoy; (b) `components/brand/mascot/` contiene solo Pomo; no existen `MascotBrioche.tsx` ni `MascotPollito.tsx` ni el selector por variante; (c) búsqueda de texto en `app/**` y `components/**`: 0 resultados de `Brioche`, `Pollito`, `MascotVariant`, `mascota=`, `variant === 1|2`; (d) `docs/design/mascota/` conserva SVG, PNG, siluetas, `mascota.md` y `generar-mascotas.mjs` como historial (nadie los borra); (e) abrir `/login?mascota=1`, `?mascota=2` y `?mascota=3` muestra siempre Pomo (el parámetro se ignora). Nota para el Frontend: el generador escribe los TSX de las tres propuestas; hay que dejar indicado en `mascota.md` que no debe volver a ejecutarse tal cual (recrearía los componentes quitados) o ajustarlo para que solo emita Pomo.
- CA-3.13 **[NUEVO v1.1]** Gorra con el texto "Yo ♥ MenuSky" dibujado como trazos (default del equipo, el Director puede cambiarlo) y sin nombre de mascota en pantalla (ni visible ni en `alt`/`aria-label`/`title`).

### HU-4 Autenticación, mensajes y redirección segura
Como staff quiero que el ingreso funcione igual que hoy; como Director, que el rediseño no rompa nada y que no se pueda usar el login para llevar a alguien a otro sitio.

- CA-4.1 Con credenciales válidas de un `admin` y sin `?redirect=` válido, el destino final es `/admin` (que a su vez resuelve a `/admin/menu`).
- CA-4.2 Con credenciales válidas de `waiter` o `kitchen` y sin `?redirect=` válido, el destino final es `/kitchen`. (R-2: no se cambia.)
- CA-4.3 **[CAMBIADO v1.1]** Con credenciales válidas y un `?redirect=` VÁLIDO (CA-4.11), el destino es esa ruta y NO se consulta `staff_users` (pestaña Red: sin petición a la tabla). Con `?redirect=` inválido se ignora y SÍ se consulta `staff_users` para el destino por rol. Tras entrar se llama a `router.refresh()`.
- CA-4.4 **[CAMBIADO v1.1]** Con credenciales inválidas: aparece, en línea y con `role="alert"` (CA-6.6), el texto exacto "Email o contraseña incorrectos"; NO aparece ningún toast; el botón vuelve a "Entrar" y a estar habilitado; los valores escritos se conservan en ambos campos; no hay navegación.
- CA-4.5 Mientras la petición está en curso: el botón dice exactamente "Entrando..." y está deshabilitado (`disabled`), y no se puede enviar de nuevo con Enter ni con clic repetido. Con una red lenta (Slow 3G) el estado dura lo que dura la petición y se ve sin desfase.
- CA-4.6 Los campos conservan: `type="email"` y `type="password"` (este último pasa a `text` solo con "Mostrar contraseña", HU-11), `required`, `autoComplete="email"` y `autoComplete="current-password"`, y el envío con Enter desde cualquiera de los dos campos. La validación nativa del navegador (campo vacío, email mal formado) sigue funcionando y no se reemplaza.
- CA-4.7 **[CAMBIADO v1.1]** Textos conservados literalmente: "Ingresar" (título), "Acceso para el equipo del restaurante" (bajada), "Email", "Contraseña", "Entrar", "Entrando...", "Email o contraseña incorrectos" (solo para credenciales inválidas). Texto nuevo definido por esta spec: "No pudimos conectar. Revisá tu conexión e intentá de nuevo." (error de red/servicio, CA-4.16). Cualquier otro texto nuevo se lista en el informe del Frontend.
- CA-4.8 **[CAMBIADO v1.1]** Regresión: `git diff` de la rama contra `feat/landing-page` no muestra cambios en `lib/**`, `proxy.ts`, `supabase/**`, `app/api/**`, `app/globals.css`, `app/(landing)/**`, `components/landing/**`, `components/ui/sonner.tsx` ni `app/layout.tsx` (salvo lo que el Líder ya haya acordado antes de esta spec, como el título). En `LoginForm.tsx` y `app/login/page.tsx` el diff de LÓGICA se limita a: la validación de `?redirect=` (CA-4.11), el `try/finally` y la clasificación de errores (CA-4.16 a CA-4.19), y el retiro del selector `mascota` (CA-3.12). La lectura de `redirect` en `page.tsx` no cambia (sigue pasando `string` o `null`; la validación vive en el formulario). `/kitchen`, `/floor` y `/admin` sin sesión siguen redirigiendo a `/login?redirect=...`.
- CA-4.9 Un usuario puede pegar contraseñas y usar gestores de contraseñas: no se bloquea el pegado ni se cambia el `name`/`id` de los campos (`email`, `password`) sin motivo.
- CA-4.10 Los mensajes de error de credenciales no distinguen "email inexistente" de "contraseña incorrecta" (mismo texto, como hoy).

**Redirección segura (R-1 corregido) [NUEVO v1.1]**

- CA-4.11 Regla: el valor de `?redirect=` se usa SOLO si, además de ser `string`, cumple TODO lo siguiente: (1) empieza con `/`; (2) el segundo carácter NO es `/` ni `\` (barra invertida); (3) no contiene ningún carácter de control (U+0000 a U+001F, ni U+007F; incluye tabulación y saltos de línea) ni ninguna `\` en ningún lugar del valor; (4) al decodificarlo con porcentaje una vez, el resultado también cumple (1), (2) y (3) (si la decodificación falla por `%` mal formado, el valor es inválido). Cualquier otro valor se ignora y se usa el destino por rol. Se valida en el cliente, en el punto de uso, sobre el valor que recibe `LoginForm` (el que `page.tsx` ya entrega como `string | null`).
- CA-4.12 Casos VÁLIDOS (con credenciales válidas, el navegador termina en esa ruta del propio origen; no se consulta `staff_users`):

  | Valor recibido | Resultado esperado |
  |---|---|
  | `/admin` | va a `/admin` |
  | `/kitchen?x=1` | va a `/kitchen?x=1` |
  | `/admin/menu/abc` | va a `/admin/menu/abc` |
  | `/floor` | va a `/floor` |
  | `/` | va a `/` (cumple la regla; es una ruta interna) |

- CA-4.13 Casos INVÁLIDOS (con credenciales válidas, se ignora el valor y el destino es el del rol: `/admin` o `/kitchen`; el origen final es siempre el de la app). Valor recibido por el componente, después de que Next decodifica la URL:

  | Valor recibido | Por qué es inválido |
  |---|---|
  | `https://evil.example` y `http://evil.example` | URL absoluta, no empieza con `/` |
  | `//evil.example` | empieza con `//` (esquema relativo) |
  | `///evil.example` | empieza con `//` |
  | `/\evil.example` | empieza con `/\` |
  | `\\evil.example` y `\/evil.example` | no empieza con `/` o lleva `\` |
  | `/\/evil.example` | lleva `\` |
  | `javascript:alert(1)` | esquema, no empieza con `/` |
  | `data:text/html,x` | esquema, no empieza con `/` |
  | ` /admin` (espacio inicial) | no empieza con `/` |
  | tabulación inicial + `/admin` | no empieza con `/` |
  | `/` + tabulación + `/evil.example` (y con salto de línea) | carácter de control: el navegador lo borraría y quedaría `//evil.example` |
  | `/%2F%2Fevil.example` | al decodificar queda `//evil.example` |
  | `/%5Cevil.example` | al decodificar queda `/\evil.example` |
  | `/%0A/evil.example` | al decodificar queda un carácter de control |
  | `/%` | `%` mal formado: la decodificación falla |
  | `evil.example` y `admin` | no empiezan con `/` |
  | vacío (`?redirect=`) | falsy, no es ruta |
  | `?redirect=/admin&redirect=//evil.example` | valor múltiple: no es `string` (comportamiento actual) |
  | sin `?redirect=` | `null` |

  QA agrega cualquier variante que encuentre; si una se cuela, es defecto de severidad alta.
- CA-4.14 Sin efectos visibles del descarte: un valor inválido no muestra error, aviso ni mensaje, no escribe nada en la consola (CA-9.8) y el valor nunca se muestra en pantalla ni se usa en un enlace (RNF-S7). El usuario ve el login normal y, al entrar, llega al destino por rol.
- CA-4.15 La validación se puede probar de forma aislada: QA/Seguridad la ejercitan con los casos de CA-4.12 y CA-4.13 (en el navegador abriendo `/login?redirect=<valor codificado>` con una cuenta de prueba o mock aprobado por el Líder, y comprobando `location.origin` y `location.pathname` finales). Si el Líder lo aprueba, la función puede vivir en un archivo auxiliar dentro de `components/auth/` para poder probarla sin navegador; en ese caso no se agregan dependencias.

**Errores de red/servicio y botón nunca trabado (pedido "R-3" del Director) [NUEVO v1.1]**

- CA-4.16 Un error que NO sea de credenciales inválidas (red caída, servicio caído, respuesta 5xx, excepción) muestra, en línea y con `role="alert"`, el texto exacto "No pudimos conectar. Revisá tu conexión e intentá de nuevo." (Propuesta del PO, a confirmar por el Director; redactada en voseo). "Email o contraseña incorrectos" se muestra SOLO ante credenciales inválidas. El texto de red no revela detalles técnicos (no se muestra `error.message`, RNF-S3).
- CA-4.17 `handleSubmit` termina siempre con el botón habilitado y diciendo "Entrar", sea cual sea el resultado, salvo el camino de éxito (CA-10.10). Se implementa con `try/finally` (o equivalente) y se prueba: (a) con la red desconectada en DevTools (Offline), (b) con una respuesta 503 simulada, (c) forzando que `signInWithPassword` lance una excepción (mock o stub aprobado por el Líder) y (d) forzando una excepción en la consulta a `staff_users` tras un inicio de sesión válido. En los cuatro casos, <= 1 s después de que la petición termina o falla, el botón vuelve a "Entrar" y a estar habilitado, se ve el mensaje de CA-4.16 y se pueden reintentar el envío.
- CA-4.18 Cómo se distingue (criterio verificable, el Frontend confirma el detalle contra `node_modules/@supabase/auth-js`): es error de **credenciales inválidas** si `signInWithPassword` devuelve un `error` de tipo `AuthApiError` con `status` 400 (cuyo `code` es `invalid_credentials`). Es error de **red/servicio** si (i) se lanza una excepción en cualquier punto de `handleSubmit`, o (ii) devuelve un `error` sin `status`, con `status` 0 (`AuthRetryableFetchError` por falla de red, `fetch.ts` línea 81) o con `status` >= 500 (`AuthRetryableFetchError`, `fetch.ts` líneas 75-97). Cualquier otro `error` (p. ej. 429 por límite de pedidos u otros 4xx) también va al mensaje de red/servicio, porque no corresponde decir "credenciales incorrectas"; el Frontend lo confirma y, si cree que 429 merece texto propio, lo propone al Líder (no se agrega texto sin acordarlo). Sin `error` pero sin `user` se trata como credenciales inválidas (comportamiento de hoy). QA verifica cada rama con un caso: 400 invalid_credentials, status 0 (Offline), 503, 429, excepción.
- CA-4.19 La consulta a `staff_users` que DEVUELVE un `error` (sin lanzar) sigue como hoy: destino `/kitchen` (R-2, no se cambia). Solo una excepción lanzada ahí cae en CA-4.16.

### HU-5 Animación linda y liviana
Como Director quiero movimiento que le dé vida al login sin trabar mi PC.

Movimiento: entrada del panel y la mascota (transform + opacity, <= 600 ms, una sola vez), micro-interacciones en el botón y los campos (<= 160 ms) y la mascota viva de HU-10.

- CA-5.1 Solo se animan `transform` y `opacity`. Búsqueda en el CSS del login: ninguna `transition`/`animation` sobre `width`, `height`, `top`, `left`, `margin`, `box-shadow`, `filter` ni `background-position`. (Una sombra estática o un cambio de `box-shadow` sin transición no cuenta.)
- CA-5.2 Cero `filter: blur()`, `backdrop-filter` ni `drop-shadow()` en el login, animados o no. Búsqueda de texto en `login.css`, `LoginForm.tsx` y el SVG de la mascota: 0 resultados.
- CA-5.3 Entrada: el panel y la mascota aparecen en 200-600 ms, una sola vez por carga; el formulario es usable desde el primer cuadro (los campos no empiezan en `pointer-events: none` ni en `opacity: 0` sin JS). Sin JavaScript el contenido se ve.
- CA-5.4 Micro-interacciones: hover (escritorio), foco con teclado y presión (móvil) producen un cambio visible en el botón y en el borde del campo en <= 160 ms.
- CA-5.5 **[CAMBIADO v1.1]** (Reemplaza el idle finito de 3 repeticiones, P-7.) El movimiento ocioso de la mascota se rige por CA-10.6 (qué hace) y CA-10.11 (cuánto puede costar). Reglas de fondo que se mantienen: solo `transform`/`opacity`; ningún elemento del formulario ni del panel se anima en bucle (solo la mascota); y el movimiento ocioso se detiene por sí solo según CA-10.6.
- CA-5.6 Sin librerías de animación: `package.json` sin dependencias nuevas respecto de `feat/landing-page` (git diff de `package.json` y `package-lock.json` vacío salvo aprobación escrita del Líder). JS de animación: ninguno (sin `requestAnimationFrame`, `setInterval` ni `setTimeout` para animar); solo estados de React ya existentes y clases/atributos CSS. Excepción única y condicionada: el seguimiento del cursor (CA-10.12, Podría).
- CA-5.7 **[CAMBIADO v1.1]** Ninguna animación parpadea más de 3 veces por segundo (WCAG 2.3.1). El movimiento automático de más de 5 s es solo el idle de CA-10.6, que es sutil, termina por sí solo y se apaga con `prefers-reduced-motion` (ver R-11 por WCAG 2.2.2).
- CA-5.8 CLS durante la carga <= 0,05 (el panel, la mascota y las fuentes reservan su espacio; `font-display` evita salto grande de texto). La mascota y sus partes animadas reservan su caja (no cambian el tamaño del contenedor al animarse).

### HU-6 Accesibilidad
Como persona con distintas capacidades quiero poder ingresar con teclado, lector de pantalla o zoom.

- CA-6.1 Estructura: la página tiene exactamente un `h1` ("Ingresar") y landmark `main`. El título de la pestaña es "Ingresar | MenuSky".
- CA-6.2 **[CAMBIADO v1.1]** Orden de tabulación = orden visual: enlace del logo -> Email -> Contraseña -> botón "Mostrar contraseña" -> Entrar. Ningún elemento decorativo recibe foco. (El enlace y el botón ya no son opcionales.)
- CA-6.3 Cada campo tiene un `<label>` visible asociado (`for`/`id`): QA hace clic en la etiqueta y el campo recibe foco; los lectores de pantalla anuncian "Email, edición" y "Contraseña, edición protegida". El placeholder, si existe, no reemplaza la etiqueta.
- CA-6.4 Foco visible en todos los elementos interactivos: anillo o contorno de >= 2 px y contraste >= 3:1 contra el fondo adyacente y contra el color del propio elemento (WCAG 2.4.11/2.4.13), medido sobre fondo crema y sobre fondo rojo/amarillo si el elemento está allí. No se quita `outline` sin reemplazo.
- CA-6.5 Teclado completo: se puede escribir, enviar con Enter, activar el botón con Enter o Espacio y, tras un error, volver a intentar sin usar el mouse. El foco nunca queda atrapado ni se pierde (tras un error el foco queda en el botón "Entrar", Propuesta del PO P-12, ver R-15).
- CA-6.6 **[CAMBIADO v1.1]** Un solo anuncio accesible del error. DECISIÓN (Propuesta del PO, a confirmar por el Líder y QA con lector de pantalla): el error se muestra SOLO como mensaje en línea persistente, junto al formulario (encima del botón), dentro de un contenedor con `role="alert"`; NO se muestra toast. Justificación: (1) un toast desaparece solo y un error de acceso debe poder releerse; (2) el mensaje en línea queda asociado al formulario (RNF-A11) y es el patrón de formulario más probado con lectores de pantalla; (3) hace que el error se anuncie UNA vez (hoy: toast + `role="alert"`, que puede repetirse); (4) el toast sale de un `<Toaster>` global fuera de `.ms-login`, sin marca, y tapa el logo (R-11). El contenedor existe siempre en el DOM (vacío) para que el lector de pantalla detecte el cambio de contenido; no lleva además `aria-live` (para no duplicar), y la mascota es `aria-hidden`. Texto con ícono, no depende del color. QA verifica con NVDA (Firefox o Chrome) y VoiceOver (iOS o macOS) que tras un intento fallido se anuncia el texto UNA sola vez y completo, sin mover el foco a mano, y adjunta nota. Los dos textos posibles son los de CA-4.4 y CA-4.16.
- CA-6.7 Contraste WCAG AA medido con herramienta (se adjuntan pares y ratios): texto normal >= 4,5:1, texto grande (>= 24 px o >= 18,66 px en negrita) e íconos/bordes de campos >= 3:1. Pares que deben medirse como mínimo: texto de labels, texto escrito en campos, placeholder (si hay), borde de campos vs fondo, texto del botón sobre su fondo, texto del h1/bajada sobre panel de marca, texto del error (los dos mensajes), enlace del logo, botón de mostrar contraseña, logo sobre su fondo. Pares ya verificados en `docs/design/login-direccion.md` sección 3 pueden reutilizarse; las combinaciones nuevas se miden. Prohibidos para texto normal: cheddar sobre tomate (3,10), lettuce sobre bun (3,25), patty sobre tomate (3,40). El texto sobre amarillo es siempre `--ms-patty`; sobre rojo, `--ms-paper` al 100 % de opacidad.
- CA-6.8 Tamaño de toque: campos y botón miden >= 44 px de alto en móvil (>= 24x24 como mínimo absoluto, WCAG 2.5.8).
- CA-6.9 Zoom y texto: con zoom del navegador al 200 % en 1280x720 y con solo el texto agrandado al 200 %, no hay pérdida de contenido ni de función (WCAG 1.4.4, 1.4.10). Tamaño de texto de campos >= 16 px.
- CA-6.10 Lighthouse Accesibilidad >= 95 y 0 errores críticos de axe en `/login` (se adjunta la salida). Lighthouse se mide en la PC potente (CA-9.5); axe puede correr en cualquier PC.
- CA-6.11 Mascota y decoración: ver CA-3.6. El SVG decorativo no genera ruido en el árbol de accesibilidad (verificado en la pestaña Accessibility de DevTools).
- CA-6.12 `autoComplete` y `type` correctos se mantienen para que los gestores de contraseñas y los teclados móviles actúen (teclado de email en móvil).
- CA-6.13 **[NUEVO v1.1]** Nada tapa el logo en ningún estado (carga, foco, "Entrando...", error de credenciales, error de red, éxito) ni en ningún viewport: en cada estado, el centro del logo y sus cuatro esquinas, consultados con `document.elementFromPoint`, devuelven el logo/enlace o un descendiente de él; ningún mensaje flotante, toast, animación de la mascota ni la franja de marca se superpone al logo. Captura por estado y viewport como evidencia.
- CA-6.14 **[NUEVO v1.1]** Canal único (verificable): en el código del login hay exactamente un mecanismo de anuncio del error (el contenedor `role="alert"` de CA-6.6): 0 llamadas a `toast`, 0 elementos `aria-live` adicionales, 0 `role="status"`/`alert` repetidos con el mismo texto. En el DOM, tras un error, el texto del error aparece una sola vez (búsqueda de texto en el `body`: 1 coincidencia, sin contar el texto que el lector de pantalla no lee).

### HU-7 Responsive y sin scroll horizontal
- CA-7.1 En 320x568, 360x640, 768x1024 y 1440x900: `document.documentElement.scrollWidth <= window.innerWidth`, también durante las animaciones de entrada, de idle y de reacción de la mascota.
- CA-7.2 En 360x640 con zoom del navegador al 200 % (equivale a ~180 px CSS de ancho) no hay scroll horizontal en el contenido principal del formulario; el contenido puede reflujar a una columna con scroll vertical.
- CA-7.3 Ningún texto queda cortado, superpuesto ni ilegible; la mascota y el logo no se deforman ni se cortan por el borde de pantalla (salvo recorte intencional que el Frontend declare y el Director apruebe). Los mensajes de error (largos, en 320 px) se parten en líneas sin desbordar.
- CA-7.4 Orientación horizontal en celular (640x360): el formulario sigue siendo usable (con scroll vertical si hace falta); la mascota se oculta o reduce según CA-3.9.
- CA-7.5 Funciona en las dos últimas versiones estables de Chrome, Edge y Firefox, y en Safari (macOS e iOS). Prueba en iPhone real: pendiente heredado de la landing, no bloquea esta rama pero se registra.

### HU-8 `prefers-reduced-motion`
- CA-8.1 **[CAMBIADO v1.1]** Con `prefers-reduced-motion: reduce` (emulado en DevTools): CERO animación y CERO transición. No hay animación de entrada, ni idle (respiración, parpadeo), ni movimiento de mirada, ni reacción animada de la mascota (entrando, error, éxito), ni transiciones de transformación en el botón; no corre `requestAnimationFrame` ni seguimiento de cursor. Verificable: `document.getAnimations().length === 0` en cada estado (reposo, foco en cada campo, "Entrando...", error, éxito) y ninguna `transition` en curso. El contenido y la mascota quedan en su estado final estático, completos y reconocibles.
- CA-8.2 Los cambios de estado necesarios para entender el formulario (foco, deshabilitado, error, "Entrando...") siguen siendo visibles sin movimiento (cambio de color, borde, texto), no dependen de animación. Con reduced-motion la mascota puede cambiar de pose o cara de forma instantánea (p. ej. cara de "uy" o cara contenta, ojos hacia el campo), sin transición.
- CA-8.3 Sin `prefers-reduced-motion` el comportamiento animado de HU-5 y HU-10 funciona; se alterna en DevTools para ambos estados y se adjunta evidencia.

### HU-9 Rendimiento en PC viejas
Como restaurante con una PC vieja quiero que el login abra y responda rápido.

Línea base (Líder, 2026-10-02, commit `6159364`) medida con `node scripts/measure-login-weight.mjs`: JS 255,8 KB gzip, CSS 14,4 KB, HTML 4,0 KB, total 274,2 KB.

- CA-9.1 JS inicial de `/login` (gzip) medido con `node scripts/measure-login-weight.mjs` sobre `npm run build && next start` <= línea base + 10 KB, es decir <= 265,8 KB. Si se supera, el Frontend justifica por escrito y el Líder decide. Borrador: 250,8 KB. Se espera que quede igual o baje al quitar Brioche y Pollito.
- CA-9.2 **[CAMBIADO v1.1]** Peso transferido total de `/login` (HTML, JS, CSS, fuentes, SVG; sin caché ni la petición opcional de auth) <= 380 KB en la primera carga CONTANDO FUENTES. Fuentes opción a (default del equipo, el Director puede cambiarlo): se acepta Bricolage Grotesque (75,6 KB, compartida en caché con la landing). Medición con Chrome por CDP: línea base real 274,2 + Geist 29,1 + Geist Mono 23,1 = 326,4 KB; borrador 374,3 KB; margen actual ~5,7 KB, sin contar lo que sume la mascota animada y los textos nuevos: si se supera, el Líder decide entre no precargar Geist Mono en `/login` (vive en `app/layout.tsx`, requiere acuerdo) o achicar Bricolage, y lo informa al Director. La fuente Bricolage Grotesque se carga una sola vez, un archivo variable, subset `latin`, con `font-display` seguro y sin precarga de más de un archivo.
- CA-9.3 Cero imágenes de mapa de bits en `/login` (la mascota y la decoración son SVG/CSS). Cero peticiones a dominios de terceros salvo los que ya usa la app (Supabase al enviar el formulario). Las fuentes salen del propio origen (`next/font`).
- CA-9.4 **[CAMBIADO v1.1]** Fluidez medida en DevTools > Performance con CPU throttling "4x slowdown" en una PC con GPU normal (no el Celeron): se graba la carga y 10 s de uso (entrada, enfoque de cada campo y del botón, escritura de 20 caracteres en cada campo, hover del botón, intento fallido, intento con red caída, idle vivo de la mascota). Resultado: sin tareas largas (> 50 ms) causadas por la animación después de la carga; cuadros descartados < 5 % del tiempo de la grabación; escribiendo con la mascota animada, INP <= 200 ms; "Paint flashing" no muestra repintado de todo el panel durante el idle (solo el área de la mascota). Se adjunta el registro. El costo en reposo se mide además con CA-10.11.
- CA-9.5 **[CAMBIADO v1.1]** Lighthouse móvil sobre build local (mediana de 3): Rendimiento >= 90, LCP <= 2,5 s (el LCP es el h1 o el logo, nunca la mascota), CLS <= 0,05, TBT <= 200 ms, más Accesibilidad >= 95 (CA-6.10). Se mide en una PC más potente que el Celeron. **ESTADO: PENDIENTE y BLOQUEA el release** (decisión del Director, 2026-10-02): sin esa evidencia el login no sale. El resto de los criterios de HU-9 (peso, CLS, sin scroll horizontal, reduced-motion, costo en reposo) se verifica normalmente y no espera a esta PC.
- CA-9.6 Verificación en la PC del Director (Celeron N4020), a ojo y con el Director como juez: entrada, escritura en campos y movimiento de la mascota (idle, mirada, reacciones) se ven fluidos (sin saltos visibles ni sensación de trabado), el formulario es utilizable antes de que termine la animación de entrada y el tiempo de "abrir /login hasta poder escribir" es razonable (<= 3 s en red local; se cronometra con celular). Además se mide el Administrador de tareas de Chrome según CA-10.11. El Director confirma o rechaza; si rechaza, el Frontend simplifica según el orden de recorte de CA-10.11 (el criterio de simplicidad gana al de vistosidad).
- CA-9.7 **[CAMBIADO v1.1]** No hay trabajo continuo escondido ni costo continuo relevante: se mide con los umbrales de CA-10.11 en reposo (10 s y 30 s) y, con la pestaña de `/login` abierta e inactiva (en segundo plano, o pasados los 90 s en que el idle se detiene, CA-10.6), el uso de CPU del proceso del renderizador cae a ~0 % (Administrador de tareas de Chrome, Shift+Esc; objetivo <= 1 %) en 60 s.
- CA-9.8 Cero errores y cero advertencias de la propia página en la consola, en escritorio y móvil (incluye los casos de `?redirect=` inválido, CA-4.14).
- CA-9.9 Sin dependencias nuevas sin aprobación del Líder (CA-5.6). Si se aprueba alguna, se reporta su peso medido en gzip.

### HU-10 Mascota viva y reacciones (Debe)
Como usuario quiero que la mascota esté viva y acompañe el ingreso sin distraer ni trabar la PC. Decisión del Director: "que sí tenga movimientos y un poco de vida"; reacciones SÍ.

Todo el movimiento es CSS liviano (`transform`/`opacity`). Los estados de la mascota los fija React con un atributo o clase (cambio de estado discreto, no por cuadro). Prioridad cuando coinciden: éxito > "Entrando..." > error > mirada por foco > idle.

- CA-10.1 **[CAMBIADO v1.1]** La mascota (Debe) tiene estos comportamientos: idle vivo (CA-10.6), mirada al campo enfocado (CA-10.7), reacción a "Entrando..." (CA-10.8), reacción al error (CA-10.9) y reacción al éxito (CA-10.10). Todos con solo cambio de clase o atributo y CSS (`transform`/`opacity`).
- CA-10.2 Las reacciones no agregan peticiones ni estado nuevo de autenticación: solo leen `loading`, el indicador de error de UI, el foco y un indicador de éxito de UI. La lógica de autenticación no cambia más allá de lo autorizado en CA-4.8.
- CA-10.3 Con `prefers-reduced-motion: reduce` nada anima (CA-8.1); el estado se comunica por texto (CA-6.6, CA-8.2). Las poses pueden cambiar de forma instantánea.
- CA-10.4 **[CAMBIADO v1.1]** La mascota no escucha eventos de teclado ni de mouse/puntero continuos: sin `onKeyDown`/`onKeyUp`/`onInput` extra ni `mousemove` para animarla. Solo reacciona a foco/desenfoque de campos y botón y a los estados de envío. Sin reacción a "escribir" tecla por tecla ni a "contraseña visible". Excepción única y condicionada: CA-10.12.
- CA-10.5 **[CAMBIADO v1.1]** (Reemplaza "el éxito navega de inmediato, sin animación de éxito".) El éxito tiene reacción visible (CA-10.10) sin demorar la navegación.
- CA-10.6 **[NUEVO v1.1]** Idle vivo, sutil y espaciado (reemplaza a P-7). Sin foco ni envío en curso, la mascota muestra:
  - (a) Respiración o balanceo lento: ciclo >= 4 s; amplitud sutil (traslado <= 3 % de su alto, o giro <= 2°, o escala <= 1,5 %).
  - (b) Parpadeo: un cierre y apertura de <= 180 ms, una vez cada 4 a 7 s (período fijo; no más de 3 por segundo).
  - (c) A lo sumo 3 elementos animados en bucle a la vez; solo `transform` y `opacity`.
  - (d) Límite de tiempo (default del equipo, el Director puede cambiarlo; ver pregunta 1): el idle corre durante los primeros 90 s (+/- 5 s) desde la carga y luego se detiene solo y la mascota queda en su pose neutra; las reacciones (mirada, "Entrando...", error, éxito) siguen funcionando después. Se implementa con un número finito de repeticiones (CSS), no con temporizadores en JS.
  - (e) Solo corre mientras la mascota es visible (CA-3.9) y sin `prefers-reduced-motion`; con la pestaña oculta no debe consumir CPU (CA-9.7).
  Verificación: `document.getAnimations()` en reposo a los 5 s lista como máximo 3 animaciones de la mascota con `iterations` finito y duración/ciclo acordes; a los 100 s lista 0; captura de la cara en dos instantes distintos muestra los ojos abiertos y cerrados.
- CA-10.7 **[NUEVO v1.1]** Mirada por foco (Debe): al enfocar Email la mascota mira hacia el campo Email; al enfocar Contraseña (o "Mostrar contraseña"), hacia el campo Contraseña; al enfocar "Entrar", hacia el botón; al perder el foco (hacia fuera del formulario) vuelve a mirada neutra. Reglas: (a) las cuatro poses (neutra, email, contraseña, botón) son visualmente distintas y apuntan hacia el formulario, y se comprueba con captura de la zona de la mascota en cada una (las cuatro difieren); (b) el cambio se dispara una vez por evento de foco/desenfoque, no por tecla ni por cuadro; (c) la transición es <= 200 ms en `transform` (pupilas/ojos) y se pierde con reduced-motion (cambio instantáneo); (d) en móvil, donde el formulario está debajo de la mascota, la mirada va hacia abajo; en escritorio, hacia la derecha y abajo. Mientras corre el idle, la mirada tiene prioridad sobre el idle de los ojos (no se superponen dos movimientos sobre los mismos ojos).
- CA-10.8 **[NUEVO v1.1]** "Entrando...": desde que se presiona "Entrar" y mientras el botón dice "Entrando...", la mascota cambia a una pose de espera (p. ej. mira al botón, se inclina hacia el formulario <= 280 ms, o mastica). A lo sumo 1 elemento en bucle, solo mientras dura la petición; termina apenas termina la petición (error o éxito). El cambio de pose empieza <= 100 ms después de presionar "Entrar".
- CA-10.9 **[NUEVO v1.1]** Error (de credenciales o de red/servicio, la misma reacción; default del equipo): sacudida o gesto UNA vez de <= 500 ms y cara de "uy" que permanece hasta el siguiente envío o el siguiente cambio de foco a un campo; se repite en cada error consecutivo. El texto del error en línea (CA-6.6) sale a la vez. La cara de "uy" no tapa ni mueve el formulario.
- CA-10.10 **[NUEVO v1.1]** Éxito (reacción visible antes de navegar, sin demora perceptible): cuando la autenticación se confirma, el estado de éxito se fija en el mismo ciclo de render en que se llama a `router.push(destino)`, con una reacción alegre (p. ej. salto, brazo en alto, cara contenta) de <= 400 ms. Reglas: (a) CERO espera artificial: no se agrega `setTimeout`, `sleep` ni promesa para esperar la animación; la navegación empieza en el mismo instante que hoy; (b) la reacción es visible mientras la ruta nueva carga (el login sigue en pantalla hasta que Next renderiza el destino); si la navegación termina antes, la reacción se corta sin problema; (c) tiempo desde la respuesta de autenticación hasta la llamada a `router.push` <= el actual +50 ms (medido con Performance, con CPU 4x); (d) el botón permanece deshabilitado y con "Entrando..." durante la navegación (no vuelve a "Entrar": se evita el doble envío y el parpadeo de R-5), con una red de seguridad: si 10 s después seguimos en `/login`, el botón vuelve a "Entrar" habilitado (Propuesta del PO, a confirmar por el Líder; evita el botón trabado de CA-4.17 si la navegación fallara). Verificación: con CPU 4x y red lenta, QA graba la secuencia y comprueba que el estado de éxito de la mascota se ve antes de que cambie la URL, y que no hay `setTimeout` ni espera en el camino de éxito (revisión de código).
- CA-10.11 **[NUEVO v1.1]** Costo medible del idle vivo (umbrales propuestos por el PO; el Líder puede ajustarlos con la primera medición real, documentando el cambio, y el Director decide si se relajan). Condiciones: build de producción (`npm run build && npm run start`), página `/login` con la mascota visible, sin foco, sin escribir, 10 s de reposo después de que terminó la entrada, en una PC normal con Chrome. Medición con DevTools Performance (grabación de 10 s) y/o CDP (`Performance.getMetrics` al inicio y al final):
  1. Scripting ~0: `ScriptDuration` acumulada en los 10 s <= 10 ms; sin eventos `FireAnimationFrame` ni `TimerFire` de código del login en la grabación; sin `requestAnimationFrame`, `setInterval` ni `setTimeout` de animación en el código (búsqueda de texto en `LoginForm.tsx`, `components/brand/mascot/**` y `app/login/**`: 0 resultados, salvo el seguimiento del cursor si se aprueba, CA-10.12).
  2. Sin layout por cuadro: `LayoutCount` y `LayoutDuration` sin crecimiento en los 10 s (0 eventos Layout en la grabación).
  3. Solo animaciones compositadas o de repintado mínimo: las animaciones aparecen en el panel Animations/Layers como `transform`/`opacity`; "Paint flashing" muestra repintado SOLO dentro del recuadro de la mascota (nunca el panel, el formulario ni el logo). Si algún elemento interno del SVG se repinta, el área repintada no supera el recuadro de la mascota.
  4. CPU del renderizador en reposo (Administrador de tareas de Chrome, Shift+Esc, columna CPU; en puntos porcentuales de un núcleo), promedio en 30 s: <= 3 % absoluto y <= 2 puntos más que la MISMA página con `prefers-reduced-motion: reduce` emulado (mascota estática); lo mismo para el proceso GPU: <= 3 % absoluto y <= 2 puntos de diferencia.
  5. Con CPU throttling 4x en Performance: la grabación de 10 s no muestra tareas largas (> 50 ms) ni cuadros descartados (< 5 %), y el uso de CPU del renderizador <= 8 % de un núcleo.
  6. En la PC del Director (Celeron N4020), con el Administrador de tareas de Chrome: renderizador <= 5 % y GPU <= 5 % promedio en 30 s de reposo, y el Director confirma que se ve fluido (CA-9.6).
  Orden de recorte si no cumple (la fluidez gana a la vistosidad): primero quitar la respiración, luego alargar el período del parpadeo, luego acortar el tiempo de idle de CA-10.6(d), y como último recurso dejar el idle solo en reacciones. El Frontend informa qué se recortó.
- CA-10.12 **[NUEVO v1.1]** Seguir el cursor (**Podría**; NO forma parte del MVP; solo se incluye si se demuestra que no agrega costo relevante). Condiciones: (a) solo en escritorio con puntero fino y que pueda hacer hover (`pointer: fine` y `hover: hover`); (b) un único listener `pointermove` pasivo y con actualización a lo sumo una vez por cuadro (throttle con `requestAnimationFrame`, <= 30 actualizaciones por segundo) que solo cambia `transform` de las pupilas; (c) apagado con `prefers-reduced-motion: reduce` y con pestaña oculta; (d) se desactiva y deja la mirada por foco (CA-10.7) cuando hay foco en un campo; (e) costo medido: moviendo el mouse durante 10 s con CPU 4x, tareas largas 0, scripting <= 5 % del tiempo y CPU del renderizador <= 3 puntos más que sin seguimiento; en el Celeron del Director <= 5 puntos más y fluido a ojo. Si cualquier medida falla, no se incluye. Es la única excepción a CA-5.6 y CA-10.4.
- CA-10.13 **[NUEVO v1.1]** Sin saltos: al pasar de un estado a otro (idle a mirada, mirada a "Entrando...", error a idle) no hay saltos bruscos de posición (>= 1/10 del alto de la mascota en un cuadro) salvo la sacudida de error y el salto de éxito, y las animaciones no se acumulan (como máximo 3 en bucle + 1 de reacción a la vez; `document.getAnimations()` lo comprueba).
- CA-10.14 **[NUEVO v1.1]** Las animaciones de la mascota no mueven ni redimensionan ningún elemento del formulario ni provocan scroll (CLS = 0 atribuible a la mascota durante idle y reacciones; CA-5.8, CA-7.1).

### HU-11 Mostrar contraseña (Debe; antes Podría)
Como staff que escribe en celular o tablet quiero ver lo que escribí para no equivocarme. Decisión: SÍ (default del equipo, el Director puede cambiarlo).

- CA-11.1 Un botón con nombre accesible "Mostrar contraseña" / "Ocultar contraseña" (`aria-pressed` o cambio de nombre) alterna el campo entre `password` y `text`; por defecto empieza oculta. Alcanzable con teclado, >= 44x44 px en móvil, foco visible.
- CA-11.2 Al alternar no se pierde el valor ni el foco del campo; no se anuncia el contenido de la contraseña a lectores de pantalla salvo que el usuario la muestre.
- CA-11.3 Al enviar el formulario se envía el valor del campo igual que hoy, estando visible u oculta.
- CA-11.4 La contraseña vuelve a oculta si el envío falla por error de credenciales o de red/servicio.

### HU-12 Volver a la landing (Debe; antes Podría)
Decisión: SÍ (default del equipo, el Director puede cambiarlo).

- CA-12.1 El logo en el login es un enlace a `/` con nombre accesible "MenuSky, ir al inicio" (se envuelve desde el login sin modificar `Logo.tsx`; el enlace no precarga la landing, `prefetch` apagado). Alcanzable con teclado, foco visible.
- CA-12.2 No hay enlaces a redes ni a datos de contacto en el login.

---

## 6. Requisitos no funcionales

### 6.1 Seguridad y privacidad
- RNF-S1 **[CAMBIADO v1.1]** La superficie de seguridad solo se REDUCE: el formulario envía las mismas credenciales por el mismo cliente de Supabase al mismo endpoint de Auth y se agrega la validación de `?redirect=`. Seguridad confirma con `git diff` que no cambian `lib/**`, `proxy.ts`, `supabase/**`, `app/api/**` y que el diff de lógica en `LoginForm.tsx` se limita a CA-4.8.
- RNF-S2 Ningún secreto, clave ni credencial en el código, CSS ni SVG. No se agregan credenciales de prueba al repo (ni en comentarios, ni como `placeholder`/`defaultValue`). No se muestran usuarios o emails de ejemplo reales.
- RNF-S3 Los mensajes de error no revelan si el email existe (CA-4.10) ni detalles técnicos del error de Supabase (no se muestra `error.message`, ni el código de estado, ni "Failed to fetch").
- RNF-S4 La contraseña no se escribe en la URL, el log de consola ni en `localStorage`. El campo no cambia a `type="text"` salvo con "Mostrar contraseña" activado por el usuario.
- RNF-S5 Sin scripts, fuentes ni imágenes de terceros; la mascota no hace peticiones (CA-3.2, CA-9.3).
- RNF-S6 Los enlaces del login (logo a `/`) son internos; si hubiera externos usan `rel="noopener noreferrer"`. No se agregan cookies nuevas desde `/login`.
- RNF-S7 **[CAMBIADO v1.1]** `?redirect=`: solo se acepta una ruta interna según CA-4.11; el valor nunca se muestra en pantalla como texto ni se usa en un enlace, un `href`, un `innerHTML` ni se guarda en almacenamiento. Seguridad ejecuta CA-4.12 y CA-4.13 y busca variantes (codificaciones, Unicode, mayúsculas/minúsculas en esquemas, caracteres de control) y confirma que el origen final es siempre el de la app.
- RNF-S8 Seguridad audita: cabeceras vigentes en `next.config.ts` siguen aplicadas a `/login` (`X-Frame-Options: DENY`, etc.), el HTML de `/login` no contiene claves de servicio (solo `NEXT_PUBLIC_*`), y `npm audit` sigue sin vulnerabilidades altas ni críticas.
- RNF-S9 **[NUEVO v1.1]** R-2 (mozo a `/kitchen`; `/kitchen` y `/floor` sin validación de rol en servidor) NO se cambia en esta etapa; Seguridad lo evalúa y entrega severidad y propuesta (sección 8, R-2). No se asume que sea defecto ni que no lo sea.

### 6.2 Rendimiento
Ver HU-9, HU-5 y HU-10 (criterios de bloqueo para el release del login; Lighthouse pendiente bloquea, CA-9.5).

### 6.3 Accesibilidad (WCAG 2.2 AA)
Ver HU-6, HU-7 y HU-8. Además:
- RNF-A1 Un solo `h1`; sin saltos de jerarquía.
- RNF-A2 El idioma del documento sigue siendo `es-AR` (heredado de `app/layout.tsx`); no se cambia.
- RNF-A9 Todo lo que comunique la mascota también se dice en texto (error, cargando). La reacción de éxito es decorativa: lo esencial (que se está entrando) ya está en el botón "Entrando...".
- RNF-A10 El botón deshabilitado "Entrando..." mantiene contraste de texto >= 4,5:1 (el texto "Entrando..." es información: debe leerse).
- RNF-A11 El texto de error persistente está asociado al formulario (región de alerta junto al botón y/o `aria-describedby` en los campos), no flota suelto.

### 6.4 Contenido
- RNF-C1 Español rioplatense con voseo y sin faltas ("Ingresá", "Escribí", "Revisá", "intentá"; los textos conservados no se cambian). Sin emojis en la interfaz (el corazón de la gorra es un dibujo). Sin palabras prohibidas de la landing (CA-3.2 de `landing.md`: "gratis", "pago", etc.).
- RNF-C2 El texto de la gorra, "Yo ♥ MenuSky" (default del equipo), es parte del dibujo (aria-hidden).

---

## 7. Casos límite y manejo de errores

1. Error de credenciales: CA-4.4 (mensaje en línea con `role="alert"`, sin toast).
2. **[CAMBIADO v1.1]** Error de red, servicio caído o excepción: CA-4.16 a CA-4.18. Mensaje propio, botón habilitado, valores conservados, reintento posible. QA prueba Offline, 503, 429 y una excepción forzada y adjunta evidencia.
3. **[CAMBIADO v1.1]** Doble envío: CA-4.5. Tras un éxito el botón queda deshabilitado con "Entrando..." hasta navegar (CA-10.10, reemplaza el comportamiento de R-5 de la v1.0); red de seguridad a los 10 s.
4. Usuario válido sin fila en `staff_users`: va a `/kitchen` (comportamiento actual; no se cambia, R-2).
5. `?redirect=` con valor múltiple (`?redirect=a&redirect=b`): no es `string` -> se ignora (CA-4.13).
6. `?redirect=` vacío: se ignora y se aplica el destino por rol (CA-4.13).
7. **[CAMBIADO v1.1]** `?redirect=` con una ruta de panel para la que el usuario no tiene rol (p. ej. mozo con `/admin`): es una ruta interna válida; el login lo envía allí y el panel muestra su propio aviso (`NotAdminAccess`, `app/admin/layout.tsx`).
8. Sesión ya activa y entra a `/login`: ve el formulario (comportamiento actual, fuera de alcance cambiarlo).
9. JavaScript desactivado: se ve el formulario, h1, labels y mascota estática; el envío requiere JS (hoy también). Se acepta; se anota para QA.
10. Fuente Bricolage no carga: se usa la fuente de reemplazo del sistema sin romper el diseño ni desbordar (CLS bajo).
11. SVG de la mascota que no renderiza: el formulario sigue funcionando; el panel de marca queda con color y logo, sin hueco roto.
12. Gestor de contraseñas que autocompleta: los campos aceptan el valor y el botón se habilita sin interacción extra; los estilos de `:-webkit-autofill` mantienen contraste >= 4,5:1.
13. Texto largo (email de 60+ caracteres): no desborda el campo ni genera scroll horizontal.
14. Pantalla muy baja (alto < 500 px): el contenido scrollea verticalmente; nada queda inalcanzable.
15. Pestaña en segundo plano: no consume CPU (CA-9.7).
16. Navegador con modo de alto contraste forzado (Windows): el formulario sigue siendo utilizable (bordes visibles, texto legible); QA lo revisa a ojo.
17. **[NUEVO v1.1]** Petición de login colgada (la red no falla ni responde): el botón queda en "Entrando..." mientras dura la petición; el `try/finally` no lo resuelve porque no hay error. No se agrega timeout en esta etapa (fuera de alcance, R-16). QA lo anota, no es defecto de este cambio.
18. **[NUEVO v1.1]** Errores consecutivos (credenciales y luego red, o dos de credenciales): cada uno reemplaza el mensaje anterior (un solo mensaje visible a la vez), repite la reacción de la mascota (CA-10.9) y se anuncia una vez.
19. **[NUEVO v1.1]** El usuario enfoca otro campo o edita después de un error: el mensaje en línea permanece hasta el siguiente envío (CA-4.4); la mascota pasa a mirar el campo enfocado (CA-10.7) manteniendo o no la cara de "uy" según CA-10.9.
20. **[NUEVO v1.1]** Foco y reduced-motion cambiando en vivo: si el usuario activa `prefers-reduced-motion` con la página abierta, las animaciones se detienen sin recargar (los CSS responden a la media query).
21. **[NUEVO v1.1]** `?redirect=` válido pero ruta inexistente (p. ej. `/no-existe`): se envía igual y la app muestra su 404; no se valida la existencia de la ruta.

---

## 8. Riesgos

- R-1 **[CORREGIDO en v1.1]** Redirección abierta (seguridad): `LoginForm.tsx` usaba `redirectTo` tal cual (hecho verificado en 1.3, punto 3). Se corrige en esta etapa con CA-4.11 a CA-4.15 y RNF-S7. Riesgo residual: la validación es del lado del cliente (suficiente para impedir el salto de origen en `router.push`; `proxy.ts` solo genera rutas internas); Seguridad y QA la verifican con la lista de casos y buscan variantes. No se ejecutó el exploit en el estado previo; el PO lo marca "probable, no confirmado" por falta de ejecución.
- R-2 **[SIN CAMBIOS, a evaluar por Seguridad; decide el Director]** Rol y destino: un mozo (`waiter`) va a `/kitchen`, no a `/floor`; usuarios autenticados sin fila en `staff_users` también llegan a `/kitchen`; las páginas `/kitchen` y `/floor` no validan rol en el servidor (solo `/admin` se verificó). Decisión del Director: NO se cambia. Pedido a Seguridad: informar severidad y propuesta (p. ej. validar rol en servidor por ruta, o redirigir por rol), con evidencia del código; la decisión es del Director. Esta spec no asume que sea un defecto.
- R-3 Sin límite de intentos propio ni recuperación de contraseña: la protección contra fuerza bruta depende de la configuración de Supabase Auth, no del código del repo. "Olvidé mi contraseña" opción A: el admin restablece la clave a mano. Informativo.
- R-4 **[CORREGIDO en v1.1]** El mismo mensaje "Email o contraseña incorrectos" aparecía ante errores de red o servicio. Ahora hay un mensaje distinto (CA-4.16 a CA-4.18).
- R-5 **[CAMBIADO v1.1]** `setLoading(false)` antes de `router.push`: la ventana en que el botón se rehabilitaba tras un éxito se cierra con CA-10.10(d). Riesgo nuevo: si la navegación nunca completa, el botón quedaría deshabilitado; mitiga la red de seguridad de 10 s. Es un detalle de UI que toca `handleSubmit`: el Líder lo confirma.
- R-6 Rendimiento: el diseño suma una fuente (Bricolage) y un SVG animado inline. Mitigación: CA-3.5, CA-5.x, CA-9.x y CA-10.11, con regla de desempate: si la vistosidad choca con la fluidez, gana la fluidez (orden de recorte en CA-10.11).
- R-7 Originalidad de la mascota: riesgo legal por parecido con personajes protegidos (referencia original: Jake, Cartoon Network/WBD). Mitigación: CA-3.4; **faltan las pruebas 2 (silueta con 3 revisores) y 5 (búsqueda inversa) de Pomo**; son bloqueo del release. El PO no es abogado: ante la duda, se rehace.
- R-8 Medición de rendimiento: **Lighthouse en otra PC está PENDIENTE y bloquea el release** (CA-9.5). Si no hay PC disponible, el release no sale.
- R-9 **[CAMBIADO v1.1]** Toaster fuera del login: ya no aplica al login (CA-2.6, sin toasts). Se mantiene porque el resto de la app lo usa.
- R-10 Duplicación de tokens `--ms-*` entre `landing.css` y `login.css` (decisión del Líder, `docs/STACK.md`): riesgo de que los valores diverjan. CA-2.1 lo cubre con una comparación de valores.
- R-11 **[NUEVO v1.1]** Anuncio doble y toast sobre el logo (pedido "R-4" del Director): el borrador mostraba toast + `role="alert"` y el toast tapaba el logo en escritorio. Se corrige con un solo canal en línea (CA-6.6, CA-6.13, CA-6.14). Riesgo residual: al enfocar el botón tras el error (P-12) algunos lectores pueden interrumpir el anuncio; ver R-15.
- R-12 **[NUEVO v1.1]** WCAG 2.2.2 (nivel A, "pausar, detener u ocultar"): el movimiento automático de más de 5 s presentado junto a otro contenido exige un mecanismo de pausa. El idle sutil de la mascota lo roza. Mitigaciones de esta spec: amplitud mínima, tope de 90 s (CA-10.6), apagado total con `prefers-reduced-motion`. No se agrega un botón de pausa (más UI en un login). A decidir por el Director en la pregunta 1: aceptar esta mitigación o pedir el botón de pausa.
- R-13 **[NUEVO v1.1]** Costo real de animar partes DENTRO del SVG: los navegadores suelen componer solo la animación de la caja SVG completa; las animaciones de elementos internos (ojos, pupilas) pueden repintar el SVG en el hilo principal. Por eso CA-10.11 mide el costo real (repintado acotado al recuadro, CPU) en lugar de prescribir cómo hacerlo, y define el orden de recorte. El Frontend informa qué técnica usó. No se asume resultado.
- R-14 **[NUEVO v1.1]** Presupuesto de peso ajustado: margen de ~5,7 KB hasta el tope de 380 KB (CA-9.2) con Bricolage aceptado. Una mascota con más partes y el nuevo texto pueden agotarlo; la salida (no precargar Geist Mono o achicar Bricolage) necesita acuerdo del Líder y aviso al Director.
- R-15 **[NUEVO v1.1]** Foco tras error (P-12, foco al botón) vs. anuncio: mover el foco puede cortar el anuncio de `role="alert"` en algunos lectores. QA lo verifica con NVDA y VoiceOver (CA-6.6). Si el anuncio se corta, el Frontend/Líder ajustan (p. ej. no mover el foco si ya está en un campo) sin cambiar el texto.
- R-16 **[NUEVO v1.1]** Petición de login colgada sin timeout: no se resuelve con `try/finally`; fuera de alcance (sección 7, caso 17). Se propone, si hace falta, una tarea aparte.
- R-17 **[NUEVO v1.1]** Cambio de lógica autorizado y acotado: el único cambio de autenticación es la validación de `?redirect=` más el manejo de errores (try/finally y clasificación). QA hace regresión completa de HU-4 con las tres cuentas de rol (necesita Supabase de pruebas o mock aprobado por el Líder; con las variables ficticias de `docs/ESTADO-LOGIN.md` el inicio de sesión real no se completa).

---

## 9. Referencias de diseño o mercado

Leídas desde el repositorio; no se hizo búsqueda externa nueva. Inspiración, no para copiar.

| Referencia | Qué tomar | Qué NO tomar |
|---|---|---|
| Landing de MenuSky (`docs/design/direccion-de-arte.md`) | Paleta "hamburguesa completa", Bricolage Grotesque + Geist, borde de comanda, sombra dura marrón de los botones, tokens de movimiento (160/280/560 ms), logo | El 3D (no va en el login) |
| Propuesta visual del Frontend (`docs/design/login-direccion.md`) | "La comanda del turno": ticket con línea de corte, panel de marca rojo, composición por viewport, contrastes medidos | Elementos que contradigan esta spec (toast, idle de 3 repeticiones) |
| Patrón habitual de login de SaaS (conocimiento general, no verificado con un sitio concreto) | Panel dividido: marca/ilustración a un lado y formulario a otro; formulario corto; un solo botón principal; error en línea bajo el formulario | Login con redes sociales, "crear cuenta" (no hay registro) |
| Mascotas de marca en pantallas de entrada (conocimiento general) | Personaje que mira al campo enfocado, parpadea, reacciona a error y a éxito, con poca animación | Seguimiento continuo del cursor como base (costo de CPU en PC viejas): queda como Podría condicionado (CA-10.12) |

Restricción creativa: el amarillo de la mascota y de los acentos es el cheddar de la paleta, pero la mascota no puede ser reconocible como un personaje existente (CA-3.4).

---

## 10. Priorización (MoSCoW)

| Prioridad | Elemento |
|---|---|
| Debe | Eliminar la lámpara; formulario visible y usable de entrada (HU-1); identidad de MenuSky (HU-2); mascota Pomo, SVG propio, con revisión de originalidad completa (HU-3, CA-3.4 pendiente); autenticación, redirect por rol y textos intactos (HU-4); **validación de `?redirect=` (CA-4.11 a CA-4.15)**; **`try/finally` y error de red distinto (CA-4.16 a CA-4.19)**; **error en línea con un solo anuncio y sin toast (CA-6.6, CA-6.13, CA-6.14)**; animación solo con transform/opacity, sin blur ni librerías (HU-5); **mascota viva: idle sutil con tope, parpadeo, mirada al campo enfocado, reacciones a "Entrando...", error y éxito (HU-10)**; **costo medible en reposo (CA-10.11)**; **mostrar contraseña (HU-11)**; **logo con enlace a `/` (HU-12)**; accesibilidad AA (HU-6); sin scroll horizontal (HU-7); `prefers-reduced-motion` con cero animación (HU-8); presupuesto de rendimiento y fluidez (HU-9); h1 y título "Ingresar \| MenuSky"; quitar `?mascota=` y propuestas 1 y 2 del código (CA-3.12); **Lighthouse en otra PC (pendiente, bloquea el release)** |
| Debería | Frase de marca en el panel; foco con anillo de marca; mirada con transición suave de <= 200 ms (con reduced-motion, instantánea) |
| Podría | Seguimiento del cursor (CA-10.12, solo si se demuestra que no agrega costo relevante); estilo de marca en los toasts del resto de la app (fuera del login) |
| No por ahora | Olvidé mi contraseña (opción A: el admin resetea a mano); registro; login social; doble factor; "recordarme"; redirigir a quien ya tiene sesión; cambiar R-2; timeout de login; mascota fuera del login; nombre visible de la mascota; ojos tapados al escribir contraseña; modo oscuro; sonido; 3D |

MVP: todo lo "Debe". El release queda bloqueado hasta cerrar CA-9.5 (Lighthouse) y CA-3.4 (puntos 2 y 5).

---

## 11. Propuestas del PO y defaults del equipo

| # | Propuesta / default | Estado | Dónde |
|---|---|---|---|
| P-1 | Composición de dos paneles en escritorio y una columna en móvil/tablet | Se mantiene (default del equipo) | sección 4 |
| P-2 | Frase del panel de marca: "Cocina, salón y administración, en un solo lugar." | Se mantiene (default del equipo) | sección 4 |
| P-3 | h1 "Ingresar" (pasa de `h2` a `h1`) y bajada conservada; sin mensaje de bienvenida extra | Se mantiene | CA-4.7, CA-6.1 |
| P-4 | Título de pestaña "Ingresar \| MenuSky" | Se mantiene | CA-6.1 |
| P-5 | Texto de error persistente con `role="alert"` | **Reemplazada**: ahora es el ÚNICO canal, sin toast | CA-6.6 |
| P-6 | Reacciones a "Entrando..." y error; ninguna al tipear | **Reemplazada**: reacciones SÍ (Decisión del Director) y suma éxito y mirada por foco | HU-10 |
| P-7 | Idle finito de 3 repeticiones | **Reemplazada** por idle sutil con tope de 90 s | CA-10.6 |
| P-8 | Mostrar contraseña | **Pasa a Debe** (default del equipo) | HU-11 |
| P-9 | El logo enlaza a `/` | **Pasa a Debe** (default del equipo) | HU-12 |
| P-10 | Mascota compacta en móvil y oculta en alturas < 640 px; el formulario siempre gana | Se mantiene; la franja roja NO se oculta (default del equipo) | CA-3.9 |
| P-11 | Presupuestos de peso | JS <= línea base + 10 KB; total <= 380 KB contando fuentes (opción a); SVG <= 12 KB y <= 120 elementos; CLS <= 0,05 | CA-9.1, 9.2, 3.5, 5.8 |
| P-12 | Foco al botón "Entrar" tras un error | Se mantiene, con vigilancia (R-15) | CA-6.5 |
| P-13 | Mascota sin nombre visible | Se mantiene (default del equipo: nombre a definir más adelante) | CA-3.13 |
| P-14 | Los toasts conservan el estilo global | **Reemplazada**: el login no usa toasts | CA-2.6 |
| P-15 | Texto de error de red: "No pudimos conectar. Revisá tu conexión e intentá de nuevo." | Propuesta del PO, a confirmar | CA-4.16 |
| P-16 | Idle de la mascota con tope de 90 s | Default del equipo, el Director puede cambiarlo (pregunta 1) | CA-10.6(d) |
| P-17 | Éxito: sin espera artificial; botón deshabilitado hasta navegar; red de seguridad de 10 s | Propuesta del PO, a confirmar por el Líder | CA-10.10 |

---

## 12. Preguntas y decisiones

### 12.1 Decisiones del Director (2026-10-02)
Fuente: `docs/ESTADO-LOGIN.md`, "Respuestas del Director (2026-10-02)".

1. Mascota elegida: propuesta 3, "Pomo". "Que sí tenga movimientos y un poco de vida": animada, con idle, parpadeo, mirada al campo enfocado (o al cursor si es barato) y reacciones a "Entrando...", error y éxito; CSS liviano, fluido en el Celeron, nada con `prefers-reduced-motion`. (Pregunta 1 y 5 de la v1.0.)
2. Reacciones de la mascota: SÍ (HU-10 pasa a Debe).
3. Se quitan del código el selector `?mascota=` y las propuestas 1 y 2; los SVG/PNG de las tres quedan como historial en `docs/design/mascota/`.
4. R-1 (`?redirect=` abierto): CORREGIR ahora; solo rutas internas que empiecen con "/" y no con "//" ni "/\". Es el único cambio de lógica de auth en este punto. (Pregunta 8 de la v1.0.)
5. R-2 (waiter a `/kitchen`, páginas sin validar rol): NO cambiar; Seguridad evalúa severidad y propuesta; decide el Director.
6. Pedidos "R-3" (try/finally, mensaje de red distinto) y "R-4" (un solo anuncio accesible, toast que tapa el logo): CORREGIR ahora.
7. Lighthouse en otra PC: PENDIENTE y bloquea el release. Lo demás se verifica normal. (Pregunta 7 de la v1.0, parcialmente: ver 12.3.)

### 12.2 Defaults del equipo (el Director puede cambiarlos)
1. Texto de la gorra: "Yo ♥ MenuSky". (Pregunta 2 de la v1.0, opción C.)
2. Nombre de la mascota: se define más adelante; no se muestra. (Pregunta 3, opción B.)
3. "Olvidé mi contraseña": opción A, no se agrega; el admin restablece la clave a mano. (Pregunta 4.)
4. Mostrar contraseña: SÍ (Debe). Logo con enlace a `/`: SÍ (Debe). (Pregunta 6.)
5. Fuentes, opción a: se acepta Bricolage Grotesque (75,6 KB); CA-9.2 <= 380 KB contando fuentes.
6. Preguntas menores: no hay reacción distinta por mascota (ya no aplica, hay una sola) y en alturas < 640 px NO se oculta la franja roja (la mascota sí, CA-3.9).
7. Detalles propuestos por el PO: mensaje de red (P-15), tope de 90 s del idle (P-16), éxito sin espera artificial con botón deshabilitado hasta navegar (P-17), misma reacción para error de credenciales y de red.

### 12.3 Preguntas abiertas para el Director (siguen sin respuesta)
1. Idle de la mascota: ¿se detiene a los 90 s (propuesta del PO, default aplicado: baja el CPU en una PC que deje el login abierto y reduce el riesgo de WCAG 2.2.2, R-12) o querés que siga indefinidamente con el mismo costo sutil (más "vida", pero CPU continuo y el riesgo de accesibilidad sin mecanismo de pausa)? Si querés indefinido, el PO recomienda sumar un botón discreto "Pausar animación".
2. ¿Qué PC más potente que el Celeron se usa para medir Lighthouse (CA-9.5) y cuándo? Sin ella el login no sale. Recomendación del PO: la misma que se use para medir la landing, el mismo día.
3. R-2: una vez que Seguridad entregue severidad y propuesta, el Director decide si se cambia o se acepta. Hoy no se cambia.

Para el Líder (no son del Director): asignar las pruebas pendientes de originalidad de Pomo (CA-3.4 puntos 2 y 5), confirmar el texto del 429 si hace falta (CA-4.18), la red de seguridad de 10 s del botón (CA-10.10) y los umbrales de CA-10.11 tras la primera medición.

**Decisiones del Líder (2026-10-02, v1.1):** (a) 429 usa el mismo mensaje de red/servicio, sin texto propio en esta versión. (b) Se confirma la red de seguridad de 10 s del botón tras un éxito (CA-10.10) y P-17. (c) Umbrales de CA-10.11 se confirman tras la primera medición del Frontend (se registran en ESTADO-LOGIN). (d) Pruebas de originalidad CA-3.4 puntos 2 (silueta con 3 personas) y 5 (búsqueda inversa de imagen): requieren personas o un buscador de imágenes; quedan como tarea del Director antes del release (los PNG están en docs/design/mascota/). (e) El tope de 90 s del idle queda como default hasta que el Director responda la pregunta 1.

---

## 13. Notas para cada rol

- Frontend: HU-1 a HU-12 y secciones 4, 5 y 11. Dejar solo Pomo y quitar el selector (CA-3.12). Implementar el idle, la mirada, las reacciones y el éxito (HU-10) y medir CA-10.11 con el procedimiento descrito; informar qué técnica de animación usó y si recortó algo. Implementar la validación de `?redirect=` (CA-4.11 a CA-4.15), el `try/finally` y los dos mensajes de error (CA-4.16 a CA-4.19), y el error en línea sin toast (CA-6.6). Solo `app/login/**`, `components/auth/LoginForm.tsx` y `components/brand/mascot/**`. No tocar `Logo.tsx`, `lib/**`, `globals.css`, `sonner.tsx`, landing. Confirmar contra `node_modules/@supabase/auth-js` el detalle de CA-4.18. Medir los contrastes nuevos (CA-6.7) y adjuntarlos. Listar textos nuevos.
- Backend: sin trabajo previsto. Solo confirmar que no se tocan `lib/**`, `supabase/**`, `app/api/**` (CA-4.8).
- Líder: aprobar o rechazar dependencias (CA-5.6), presupuesto de peso (CA-9.2, R-14), `docs/CREDITS.md` (CA-3.11), asignar las pruebas de originalidad (CA-3.4), definir con el Director la PC de Lighthouse (CA-9.5), confirmar los detalles de CA-4.18 y CA-10.10, commit en `feat/login-redesign`.
- Seguridad: RNF-S1 a S9; verificar la validación de `?redirect=` con CA-4.12/CA-4.13 y buscar variantes (R-1); evaluar R-2 con severidad y propuesta (sin cambiar código); mensajes de error sin detalles técnicos; ausencia de secretos; mascota sin recursos externos.
- QA: cada CA es una prueba. Viewports 320x568, 360x640, 768x1024, 1440x900; CPU 4x; emulación de `prefers-reduced-motion` y `prefers-color-scheme: dark`; lector de pantalla (NVDA y VoiceOver) para CA-6.6 y CA-6.14; axe y Lighthouse (cuando haya PC); casos de la sección 7; mediciones de CA-10.11 (reposo 10 s y 30 s, A/B contra reduced-motion); regresión de HU-4 con las tres cuentas de rol de prueba y datos ficticios (nunca credenciales reales de producción). Para HU-4 hace falta un Supabase de pruebas o un mock aprobado por el Líder (con las variables ficticias de `docs/ESTADO-LOGIN.md` el inicio de sesión real no se completa); los casos de red (Offline, 503, 429, excepción) también necesitan el mock.
