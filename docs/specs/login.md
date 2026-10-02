# Spec: Rediseño del login de MenuSky (ruta `/login`)

Estado: v1.0 borrador para el Director (2026-10-02). Autor: Product Owner.
Rama de trabajo: `feat/login-redesign` (worktree `C:\Users\Windows10\Desktop\menusky-login`).
Stack: ver `docs/STACK.md`, sección "Arquitectura del rediseño del login". Esta spec no define tecnología.
Dirección visual de referencia: `docs/design/direccion-de-arte.md` (paleta, tipografía, movimiento). Estado del frente: `docs/ESTADO-LOGIN.md`.

Convenciones:
- "Hecho verificado" = respaldado por un archivo de este repositorio (se cita la ruta). Toda afirmación sobre el código sale de este repo.
- "Decisión del Director" = texto del pedido del Director.
- "Propuesta del PO (a confirmar)" = default razonable que el Director puede cambiar; se implementa salvo que diga lo contrario.
- Notación de criterios: CA-x.y. Se prueban sobre `npm run build && npm run start` local. Viewports: 320x568, 360x640, 768x1024, 1440x900.
- Medidas de rendimiento: la PC del Director (Celeron N4020, 2 núcleos) no sirve para Lighthouse (`docs/PILOTO.md`, E-3); allí se hace verificación de fluidez a ojo y con DevTools, no puntaje.

---

## 1. Objetivo y contexto

### 1.1 Pedido del Director (textual)
"Agregar un panel más acorde a la temática (hoy lo vemos como la lámpara). Cambiar los colores, la tipografía y la animación, todo completo. Quizás un panel de login tradicional pero con un diseño fuerte y distintivo de MenuSky. Sumar una mascota para darle un poco de tonalidad." Para toda la app: intuitivo, lindo, llamativo y característico de MenuSky, con animaciones lindas pero LIVIANAS, porque muchos restaurantes tienen PC viejas. El Director usa un Celeron de 2 núcleos: tiene que andar fluido ahí.

### 1.2 Hechos verificados del login actual
1. `app/login/page.tsx` es un Server Component que lee `searchParams.redirect` (solo si es `string`, si no `null`) y renderiza `LoginForm` con `redirectTo`.
2. `components/auth/LoginForm.tsx` es el único componente del login. Contiene una lámpara SVG con cadena: el formulario nace con `opacity: 0` y `pointer-events: none` hasta que se tira de la cadena (arrastre de 30 px o más, o Enter/Espacio sobre el círculo con `role="button"`). Sin interacción el formulario no se ve ni se usa. Esto se elimina.
3. Lógica que NO cambia (líneas 53-78): `supabase.auth.signInWithPassword({ email, password })`; si hay error o no hay usuario: `setLoading(false)` y `toast.error("Email o contraseña incorrectos")`; si hay `redirectTo` se usa; si no, se consulta `staff_users.role` por `auth_user_id` y el destino es `/admin` si el rol es `admin`, y `/kitchen` en cualquier otro caso (incluye `waiter`, `kitchen` y usuario sin fila en `staff_users`); luego `router.push(destino)` y `router.refresh()`.
4. Textos actuales: título "Ingresar" (hoy es un `h2`; la página no tiene `h1`), bajada "Acceso para el equipo del restaurante", etiquetas "Email" y "Contraseña", botón "Entrar" / "Entrando..." (deshabilitado mientras carga). Campos `type="email"` y `type="password"`, ambos `required`, con `autoComplete="email"` y `autoComplete="current-password"`.
5. Hoy el formulario usa `backdrop-blur-xl`, una sombra con `filter: blur(15px)` en la lámpara y un `animate-pulse` en el texto de ayuda: el tipo de efectos que las PC viejas pagan caro.
6. Los toasts salen de `<Toaster position="top-center" />` en `app/layout.tsx` (componente `components/ui/sonner.tsx`, con colores de las variables globales `--popover`), no del login. Queda fuera de `.ms-login`, por lo que no hereda los tokens de marca.
7. No existe registro público, ni "olvidé mi contraseña", ni "mostrar contraseña", ni "recordarme", ni enlace de vuelta a la landing, ni `h1`, ni título de pestaña propio (el título es el global de `app/layout.tsx`). Búsqueda en `*.ts`/`*.tsx`: no hay `resetPasswordForEmail` ni pantalla de recuperación.
8. Quién llega a `/login`: la landing (enlaces "Ingresar" en `components/landing/Header.tsx`, `MobileMenu.tsx`, `Footer.tsx`), `proxy.ts` -> `lib/supabase/middleware.ts` (redirige sin sesión desde `/kitchen`, `/floor`, `/admin` a `/login?redirect=<pathname>`) y `components/staff/LogoutButton.tsx` (`router.push("/login")`).
9. `/login` NO está en el matcher de `proxy.ts` (solo `/kitchen`, `/floor`, `/admin`): un staff con sesión que abre `/login` ve el formulario igual.
10. `/admin` valida el rol en el servidor (`app/admin/layout.tsx` línea 11: si `staff.role !== "admin"` muestra `NotAdminAccess`), así que un `?redirect=/admin` de un no admin no da acceso de administración.
11. `app/robots.ts` ya bloquea `/login` para rastreo.
12. Identidad de la landing disponible para reutilizar: logo `components/landing/brand/Logo.tsx` (`Logo`, `Isotype`), tokens `--ms-*` y de movimiento en `app/(landing)/landing.css` (`--ms-dur-fast` 160 ms, `--ms-dur` 280 ms, `--ms-ease-out`, `--ms-ease-pop`), fuente Bricolage Grotesque (`app/(landing)/layout.tsx`), y la tabla de pares de contraste de `docs/design/direccion-de-arte.md` sección 2.

### 1.3 Problema y objetivo
- Problema: el login actual (lámpara en tonos naranja/oscuro) no se parece a MenuSky, oculta el formulario detrás de un gesto, usa efectos costosos y no tiene la identidad de la landing.
- Para quién: el staff del restaurante (admin, mozo, cocina), muchas veces en PC viejas, tablets o celulares, a veces apurado y con las manos ocupadas.
- Objetivo: un login tradicional (email, contraseña, botón) visible y usable de entrada, con una identidad fuerte de MenuSky (paleta de hamburguesa completa, Bricolage Grotesque + Geist, logo) y una mascota original, con animación liviana y la misma lógica de autenticación.
- "Intuitivo" se mide así: una persona del staff, sin explicación previa, completa el ingreso (de abrir `/login` a presionar "Entrar" con credenciales válidas) sin tocar nada más que los dos campos y el botón; prueba con 3 personas, 3 de 3 lo logran sin ayuda en menos de 30 segundos (QA o Director la convocan; notas como evidencia).

---

## 2. Alcance y fuera de alcance

### 2.1 Dentro del alcance
- Rediseño completo de la UI de `/login`: composición, colores, tipografía, animación (HU-1, HU-2, HU-5).
- Eliminación de la lámpara con cadena y de todo el código de arrastre asociado.
- Mascota original de MenuSky en SVG propio, mostrada solo en el login (HU-3), elegida por el Director entre 3 propuestas.
- Conservación exacta del comportamiento de autenticación y de los mensajes (HU-4).
- Accesibilidad, responsive, `prefers-reduced-motion` y rendimiento en PC viejas (HU-6, HU-7, HU-8).
- Título de pestaña propio de `/login` (Propuesta del PO).

### 2.2 Fuera de alcance (explícito)
- Cambios de lógica de autenticación: `signInWithPassword`, consulta a `staff_users`, redirect por rol, uso de `?redirect=`, mensajes de error. Cambios en `lib/**`, `proxy.ts`, `supabase/**`, `app/api/**`.
- Registro público o alta de usuarios; recuperación de contraseña ("olvidé mi contraseña"); login con Google u otros proveedores; magic link; doble factor; "recordarme"; bloqueo por intentos (ver pregunta 4 y riesgos).
- Redirigir al staff que ya tiene sesión lejos de `/login`.
- Validar o sanear `?redirect=` (es un riesgo anotado, no un cambio de esta etapa; ver sección 8).
- Mostrar la mascota fuera del login (landing, paneles, carta). Por ahora solo `/login` (decisión del Director).
- Cambios en la landing, paneles, carta del cliente, `app/globals.css` y `components/landing/**` (el logo se importa sin modificarlo).
- Modo oscuro: el login tiene un único aspecto, sin `.dark` (como la landing).
- Librerías nuevas de animación o 3D (motion, gsap, lottie, three) y cualquier dependencia nueva sin aprobación del Líder.
- Sonido, videos, imágenes de mapa de bits o recursos externos en el login.
- Multi-idioma.

---

## 3. Usuarios y roles

| Rol | Qué hace en `/login` |
|---|---|
| `admin` | Ingresa con email y contraseña; sin `?redirect=` va a `/admin`. |
| `waiter` (mozo) | Ingresa; sin `?redirect=` va a `/kitchen` (comportamiento actual, ver 1.2.3 y riesgos). |
| `kitchen` (cocina) | Ingresa; sin `?redirect=` va a `/kitchen`. |
| Visitante sin cuenta / curioso | Ve el login; no hay registro. Puede volver a la landing (Propuesta del PO). |
| Comensal | No es público del login; entra por el QR de la mesa. |
| Director | Elige la mascota entre 3 propuestas y aprueba la salida. |

Permisos: `/login` es público y no requiere sesión. No lee ni escribe datos propios: solo llama a Supabase Auth con las credenciales que el usuario escribe y consulta su propio rol, igual que hoy.

---

## 4. Composición propuesta (Propuesta del PO, a confirmar con la dirección visual del Frontend)

Es "login tradicional con diseño fuerte". El Frontend puede ajustar proporciones sin cambiar los criterios.

- Escritorio (>= 1024 px): dos paneles. Panel de marca (izquierda, ~45-55 %): fondo `--ms-tomato` o `--ms-cheddar`, logo, mascota grande y una frase corta. Panel de formulario (derecha): fondo crema `--ms-bun`, tarjeta de papel `--ms-paper` con h1 "Ingresar", bajada, los dos campos y el botón.
- Tablet (640-1023 px): una columna centrada con franja de marca arriba (logo + mascota mediana) y el formulario debajo.
- Móvil (< 640 px): una columna; logo y mascota compacta (alto máximo 120 px) arriba; el formulario completo (h1, campos y botón "Entrar") visible sin scroll en 360x640 sin teclado abierto (CA-1.4).
- Detalles de marca candidatos (sin obligar): borde dentado tipo comanda, número de mesa/sello, sombra dura marrón en botón (estilo de `.ms-btn` de la landing). Cualquier elemento decorativo cumple HU-7.
- Frase del panel de marca, Propuesta del PO: "Cocina, salón y administración, en un solo lugar." (sale de las funciones reales de la landing; no promete nada inexistente).

---

## 5. Historias de usuario y criterios de aceptación

### HU-1 Ver y usar el formulario de entrada
Como integrante del staff quiero ver el formulario apenas abro `/login`, para ingresar sin adivinar un gesto.

- CA-1.1 Dado un usuario sin sesión, cuando abre `/login` en cualquier viewport, entonces ve los campos Email y Contraseña y el botón "Entrar" visibles y usables sin ninguna interacción previa (sin tirar de nada, sin clic, sin scroll en 360x640 y 1440x900).
- CA-1.2 La lámpara y la cadena no existen: en el DOM no hay un elemento con `role="button"` ni `aria-label` con "cadena" ni "luz"; el texto "Tirá de la cadena para ingresar" no aparece; en el código de `LoginForm.tsx` no quedan los manejadores de arrastre (`onPointerDown`, `onPointerMove`, `setPointerCapture`) ni el estado `on`.
- CA-1.3 Con el formulario recién cargado, el primer Tab llega al campo Email, el segundo a Contraseña, el tercero al botón "Entrar" (más los elementos opcionales de 5.x en su orden visual: ver CA-6.2).
- CA-1.4 En 360x640 sin teclado en pantalla, el h1, ambos campos y el botón "Entrar" se ven completos sin scroll vertical. Con el teclado virtual abierto, el campo activo y el botón siguen alcanzables con scroll (nada queda bloqueado).
- CA-1.5 El formulario se ve y funciona con JavaScript lento: el HTML renderizado en el servidor ya contiene h1, labels, campos y botón (verificable viendo el HTML de la respuesta, "ver código fuente").
- CA-1.6 Intuitividad: prueba con 3 personas ajenas al proyecto; 3 de 3 completan el ingreso sin ayuda en <= 30 s (evidencia: notas de QA/Director).

### HU-2 Identidad de MenuSky (colores, tipografía, logo)
Como Director quiero que el login se vea de MenuSky y no como una plantilla.

- CA-2.1 Paleta: los colores salen solo de los tokens `--ms-*` de la landing (`docs/design/direccion-de-arte.md` sección 2), con los mismos valores HEX. QA compara los valores usados (CSS computado) contra esa tabla; un color fuera de la paleta es un defecto salvo aprobación del Líder. El naranja `#E8590C` y el fondo `#170f0c` del login actual no quedan.
- CA-2.2 Rojo tomate y amarillo cheddar son los protagonistas visuales; aparecen acentos de verde y marrón (misma regla que CA-8.10 de la landing). Revisión visual del Director.
- CA-2.3 Tipografía: títulos y logo en Bricolage Grotesque; cuerpo, etiquetas, campos y botón en Geist. QA verifica con "Computed > font-family" en DevTools que el h1 usa Bricolage y que los inputs usan Geist. No hay otras fuentes cargadas (pestaña Red).
- CA-2.4 El logo es el de `components/landing/brand/Logo.tsx`, importado sin modificarlo (git diff: ese archivo sin cambios), visible en la primera pantalla en todos los viewports. Sobre fondo oscuro o rojo se usa la variante que ya existe y cumple contraste.
- CA-2.5 Un único aspecto: con `prefers-color-scheme: dark` activo en el sistema el login se ve igual y legible (contraste AA mantenido).
- CA-2.6 Los toasts de error conservan su texto; su aspecto puede quedar con el estilo global actual. Si el Frontend quiere darles el estilo de marca, solo puede hacerlo dentro del login, sin tocar `components/ui/sonner.tsx` ni `app/layout.tsx` sin acuerdo del Líder. En cualquier caso el contraste del texto del toast sobre su fondo, medido en el login, es >= 4,5:1 (CA-6.7).
- CA-2.7 Evaluación subjetiva obligatoria: el Director revisa el login (capturas en 360x640 y 1440x900 y en vivo) y confirma "intuitivo, lindo, llamativo y característico de MenuSky". Si no cumple, no sale.

### HU-3 Mascota original
Como Director quiero una mascota simpática y propia de MenuSky que le dé personalidad al login.

Concepto (decisión del Director): personaje cartoon amarillo y simpático, gorra roja con el texto de la gorra (ver pregunta 2), delantal negro con el logo de MenuSky, comiendo una hamburguesa, trazo grueso cartoon. Es solo el clima de referencia: debe ser ORIGINAL.

- CA-3.1 Proceso: el Frontend entrega 3 opciones en `docs/design/mascota/` (cada una: SVG estático, peso, y la ficha de originalidad de CA-3.4). El Director elige una; recién entonces se construye `components/brand/mascot/`. Sin elección registrada por escrito, no se construye.
- CA-3.2 La mascota es SVG propio dibujado por el equipo, inline en la página: sin `<image>`, sin `href` ni `url()` a recursos externos, sin fuentes del sistema (el texto de la gorra, si hay, va convertido a trazos), sin `<script>`, sin `<foreignObject>`. QA lo comprueba buscando esos elementos en el SVG y mirando la pestaña Red: cero peticiones por la mascota.
- CA-3.3 Colores de la mascota solo de la paleta `--ms-*` (amarillo `--ms-cheddar`/`--ms-mustard`, gorra `--ms-tomato`/`--ms-ketchup`, delantal `--ms-patty`, hamburguesa con `--ms-toasted`, `--ms-cheddar`, `--ms-lettuce`, `--ms-patty`), con trazo grueso oscuro `--ms-patty`. El logo del delantal es el isotipo de MenuSky (mismos trazos que `Isotype`), legible a tamaño de escritorio.
- CA-3.4 Originalidad (criterio de bloqueo). Cada propuesta lleva una ficha firmada por el Frontend y revisada por el Líder y el Director con estas verificaciones, todas "sí":
  1. No es un perro ni un animal de la misma silueta que un perro amarillo (hocico oscuro, orejas caídas, cuerpo alargado tipo "goma"): especie y silueta propias.
  2. Ojos, nariz, boca y proporciones no se parecen a Jake de Hora de Aventura ni a ningún personaje conocido: prueba de silueta, la propuesta en negro sólido junto a una búsqueda de imágenes del personaje de referencia no genera dudas razonables a 3 revisores distintos.
  3. No se parece a mascotas de marcas gastronómicas o de dibujos (p. ej. Jollibee, Ronald McDonald, Wendy's, Rey de Burger King, Bob Esponja, Chester Cheetah): lista no exhaustiva; el revisor puede sumar otras.
  4. No se calcó, vectorizó ni usó como base la imagen de referencia ni ninguna imagen de terceros; no se usó un generador de imágenes con esa referencia como entrada. Constancia escrita del Frontend.
  5. Búsqueda inversa de imagen (p. ej. Google Lens o TinEye) sobre la exportación PNG de la propuesta: sin coincidencias visuales con personajes o ilustraciones con derechos. Se adjunta captura o resultado.
  6. Los elementos no genéricos (gorra roja, delantal negro, hamburguesa) son los que pidió el Director; no se agregan otros rasgos copiados de personajes existentes.
  Si una verificación falla, la propuesta se descarta o se rehace; no se "retoca" para parecerse menos.
- CA-3.5 Peso (Propuesta del PO, a confirmar con el Líder tras medir): SVG de la mascota elegida <= 12 KB sin comprimir (<= 4 KB gzip), <= 120 elementos SVG, sin filtros SVG (`feGaussianBlur`, `feDropShadow`, etc.), sin degradados complejos animados. Se mide con el tamaño del archivo y un conteo de nodos.
- CA-3.6 Accesibilidad de la mascota: es decorativa (`aria-hidden="true"`, sin `title` ni foco) salvo que la propuesta 5.x (reacciones) comunique un estado que no esté ya en texto; en ese caso tiene `role="img"` y texto alternativo, o el estado se dice también en texto fuera de la mascota (RNF-A9). Un lector de pantalla no lee "gráfico" ni nombres de archivo al recorrerla.
- CA-3.7 La mascota nunca tapa ni se superpone al formulario, a los labels, al botón ni a los mensajes de error; no recibe foco ni clics (`pointer-events: none`).
- CA-3.8 La mascota aparece solo en `/login`: búsqueda en el repo de su componente confirma que no se importa fuera de ese layout/página.
- CA-3.9 En móvil la mascota se muestra compacta (<= 120 px de alto, CA-1.4); si no entra sin empujar el formulario fuera de la primera pantalla de 360x640, se simplifica o se oculta en alturas menores a 640 px (`max-height`), y el formulario siempre gana.
- CA-3.10 Con `prefers-reduced-motion: reduce` la mascota se ve en una pose estática completa y reconocible (HU-8).
- CA-3.11 Crédito: el Líder agrega a `docs/CREDITS.md` una línea "Mascota de MenuSky: diseño original del equipo, SVG propio".

### HU-4 Conservar la autenticación y sus mensajes
Como staff quiero que el ingreso funcione igual que hoy; como Director, que el rediseño no rompa nada.

- CA-4.1 Con credenciales válidas de un `admin` y sin `?redirect=`, el destino final es `/admin` (que a su vez resuelve a `/admin/menu`).
- CA-4.2 Con credenciales válidas de `waiter` o `kitchen` y sin `?redirect=`, el destino final es `/kitchen`.
- CA-4.3 Con credenciales válidas y `?redirect=/floor` (o cualquier ruta que venga), el destino es esa ruta y NO se consulta `staff_users` (pestaña Red: sin petición a la tabla en ese caso). Tras entrar se llama a `router.refresh()` (la sesión se ve en el primer render del panel).
- CA-4.4 Con credenciales inválidas o error de Supabase: aparece el toast con el texto exacto "Email o contraseña incorrectos", el botón vuelve a "Entrar" y a estar habilitado, los valores escritos se conservan en ambos campos, y no hay navegación.
- CA-4.5 Mientras la petición está en curso: el botón dice exactamente "Entrando..." y está deshabilitado (`disabled`), y no se puede enviar de nuevo con Enter ni con clic repetido. Con una red lenta (Slow 3G) el estado dura lo que dura la petición y se ve sin desfase.
- CA-4.6 Los campos conservan: `type="email"` y `type="password"`, `required`, `autoComplete="email"` y `autoComplete="current-password"`, y el envío con Enter desde cualquiera de los dos campos. La validación nativa del navegador (campo vacío, email mal formado) sigue funcionando y no se reemplaza.
- CA-4.7 Los textos conservados literalmente: "Ingresar" (título), "Acceso para el equipo del restaurante" (bajada), "Email", "Contraseña", "Entrar", "Entrando...", "Email o contraseña incorrectos". Cualquier texto nuevo se lista en el informe del Frontend.
- CA-4.8 Regresión: `git diff` de la rama contra `feat/landing-page` no muestra cambios en `lib/**`, `proxy.ts`, `supabase/**`, `app/api/**`, `app/globals.css`, `app/(landing)/**` ni `components/landing/**`; `app/login/page.tsx` no cambia su lectura de `searchParams`. `/kitchen`, `/floor` y `/admin` sin sesión siguen redirigiendo a `/login?redirect=...`.
- CA-4.9 Un usuario puede pegar contraseñas y usar gestores de contraseñas: no se bloquea el pegado ni se cambia el `name`/`id` de los campos (`email`, `password`) sin motivo.
- CA-4.10 Los mensajes de error no distinguen "email inexistente" de "contraseña incorrecta" (mismo texto, como hoy).

### HU-5 Animación linda y liviana
Como Director quiero movimiento que le dé vida al login sin trabar mi PC.

Movimiento propuesto (Propuesta del PO): entrada del panel y la mascota (transform + opacity, <= 600 ms, una sola vez), micro-interacciones en el botón y los campos (<= 160 ms, con los tokens de movimiento de la landing), y un movimiento ocioso corto de la mascota (p. ej. mordida o balanceo suave).

- CA-5.1 Solo se animan `transform` y `opacity`. Búsqueda en el CSS del login: ninguna `transition`/`animation` sobre `width`, `height`, `top`, `left`, `margin`, `box-shadow`, `filter` ni `background-position`. (Una sombra estática o un cambio de `box-shadow` sin transición no cuenta.)
- CA-5.2 Cero `filter: blur()`, `backdrop-filter` ni `drop-shadow()` en el login, animados o no. Búsqueda de texto en `login.css`, `LoginForm.tsx` y el SVG de la mascota: 0 resultados.
- CA-5.3 Entrada: el panel y la mascota aparecen en 200-600 ms, una sola vez por carga; el formulario es usable desde el primer cuadro (no hay que esperar la animación para escribir; los campos no empiezan en `pointer-events: none` ni en `opacity: 0` sin JS). Sin JavaScript el contenido se ve.
- CA-5.4 Micro-interacciones: hover (escritorio), foco con teclado y presión (móvil) producen un cambio visible en el botón y en el borde del campo en <= 160 ms.
- CA-5.5 Movimiento ocioso (si lo hay): como máximo 1 elemento animado en bucle a la vez; período >= 3 s; solo `transform`; y es FINITO (se detiene solo tras 3 repeticiones como máximo) para liberar CPU. Nunca anima mientras el usuario escribe en un campo (se verifica: al enfocar un campo, el bucle se pausa o ya terminó).
- CA-5.6 Sin librerías de animación: `package.json` sin dependencias nuevas respecto de `feat/landing-page` (git diff de `package.json` y `package-lock.json` vacío salvo aprobación escrita del Líder). JS de animación: ninguno; solo estados de React que ya existen o clases CSS.
- CA-5.7 Ninguna animación parpadea más de 3 veces por segundo (WCAG 2.3.1). No hay movimiento automático de más de 5 s sin forma de detenerlo: el bucle ocioso es finito (CA-5.5).
- CA-5.8 CLS durante la carga <= 0,05 (el panel, la mascota y las fuentes reservan su espacio; `font-display` evita salto grande de texto).

### HU-6 Accesibilidad
Como persona con distintas capacidades quiero poder ingresar con teclado, lector de pantalla o zoom.

- CA-6.1 Estructura: la página tiene exactamente un `h1` ("Ingresar") y landmark `main`. El título de la pestaña es "Ingresar | MenuSky" (Propuesta del PO; hoy usa el título global de `app/layout.tsx`).
- CA-6.2 Orden de tabulación = orden visual: [enlace "volver a MenuSky" si existe (5.x)] -> Email -> Contraseña -> [botón "mostrar contraseña" si existe] -> Entrar. Ningún elemento decorativo recibe foco.
- CA-6.3 Cada campo tiene un `<label>` visible asociado (`for`/`id`): QA hace clic en la etiqueta y el campo recibe foco; los lectores de pantalla anuncian "Email, edición" y "Contraseña, edición protegida". El placeholder, si existe, no reemplaza la etiqueta.
- CA-6.4 Foco visible en todos los elementos interactivos: anillo o contorno de >= 2 px y contraste >= 3:1 contra el fondo adyacente y contra el color del propio elemento (WCAG 2.4.11/2.4.13), medido sobre fondo crema y sobre fondo rojo/amarillo si el elemento está allí. No se quita `outline` sin reemplazo.
- CA-6.5 Teclado completo: se puede escribir, enviar con Enter, activar el botón con Enter o Espacio y, tras un error, volver a intentar sin usar el mouse. El foco nunca queda atrapado ni se pierde (tras un error el foco queda en el campo o botón donde estaba, o pasa al primer campo; Propuesta del PO: queda en el botón).
- CA-6.6 Error anunciado: tras un intento fallido, un lector de pantalla (NVDA con Firefox/Chrome, VoiceOver en iOS o macOS) anuncia "Email o contraseña incorrectos" sin que el usuario mueva el foco. QA lo verifica con lector y adjunta nota. Dado que el toast desaparece solo, se agrega además un texto de error persistente visible junto al formulario con `role="alert"` y el mismo texto exacto (Propuesta del PO, a confirmar; ver 6 y pregunta de riesgos). El texto del error no depende solo del color: lleva texto y/o ícono.
- CA-6.7 Contraste WCAG AA medido con herramienta (se adjuntan pares y ratios): texto normal >= 4,5:1, texto grande (>= 24 px o >= 18,66 px en negrita) e íconos/bordes de campos >= 3:1. Pares que deben medirse como mínimo: texto de labels, texto escrito en campos, placeholder (si hay), borde de campos vs fondo, texto del botón sobre su fondo, texto del h1/bajada sobre panel de marca, texto del error y del toast, enlace de vuelta, logo sobre su fondo. Pares ya verificados en la landing (`direccion-de-arte.md`, sección 2) pueden reutilizarse; los combinaciones nuevas se miden. Prohibidos para texto normal: cheddar sobre tomate (3,10), lettuce sobre bun (3,25), patty sobre tomate (3,40). El texto sobre amarillo es siempre `--ms-patty`; sobre rojo, `--ms-paper` al 100 % de opacidad.
- CA-6.8 Tamaño de toque: campos y botón miden >= 44 px de alto en móvil (>= 24x24 como mínimo absoluto, WCAG 2.5.8).
- CA-6.9 Zoom y texto: con zoom del navegador al 200 % en 1280x720 y con solo el texto agrandado al 200 %, no hay pérdida de contenido ni de función (WCAG 1.4.4, 1.4.10). Tamaño de texto de campos >= 16 px (evita el zoom automático de iOS).
- CA-6.10 Lighthouse Accesibilidad >= 95 y 0 errores críticos de axe en `/login` (se adjunta la salida).
- CA-6.11 Mascota y decoración: ver CA-3.6. El SVG decorativo no genera ruido en el árbol de accesibilidad (verificado en la pestaña Accessibility de DevTools).
- CA-6.12 `autoComplete` y `type` correctos se mantienen para que los gestores de contraseñas y los teclados móviles actúen (teclado de email en móvil).

### HU-7 Responsive y sin scroll horizontal
- CA-7.1 En 320x568, 360x640, 768x1024 y 1440x900: `document.documentElement.scrollWidth <= window.innerWidth`, también durante las animaciones de entrada y de la mascota.
- CA-7.2 En 360x640 con zoom del navegador al 200 % (equivale a ~180 px CSS de ancho) no hay scroll horizontal en el contenido principal del formulario; el contenido puede reflujar a una columna con scroll vertical. (Criterio del defecto QA-02 de la landing, `docs/PILOTO.md`.)
- CA-7.3 Ningún texto queda cortado, superpuesto ni ilegible; la mascota y el logo no se deforman ni se cortan por el borde de pantalla (salvo recorte intencional que el Frontend declare y el Director apruebe).
- CA-7.4 Orientación horizontal en celular (640x360): el formulario sigue siendo usable (con scroll vertical si hace falta); la mascota se oculta o reduce según CA-3.9.
- CA-7.5 Funciona en las dos últimas versiones estables de Chrome, Edge y Firefox, y en Safari (macOS e iOS). Prueba en iPhone real: pendiente heredado de la landing, no bloquea esta rama pero se registra.

### HU-8 `prefers-reduced-motion`
- CA-8.1 Con `prefers-reduced-motion: reduce` (emulado en DevTools): no hay animación de entrada, ni bucle ocioso, ni reacción animada de la mascota, ni transiciones de transformación en el botón; el contenido y la mascota quedan en su estado final estático, completos y reconocibles.
- CA-8.2 Los cambios de estado necesarios para entender el formulario (foco, deshabilitado, error) siguen siendo visibles sin movimiento (cambio de color, borde, texto), no dependen de animación.
- CA-8.3 Sin `prefers-reduced-motion` el comportamiento animado de HU-5 funciona; se alterna en DevTools para ambos estados y se adjunta evidencia.

### HU-9 Rendimiento en PC viejas
Como restaurante con una PC vieja quiero que el login abra y responda rápido.

Línea base: antes de tocar código, el Líder o QA miden en la rama sin cambios (`feat/landing-page`, commit de partida `efbbfd5`) con `npm run build`: First Load JS de `/login` (tabla de rutas) y peso transferido de `/login` (pestaña Red, caché desactivada). Esos dos números se anotan en `docs/ESTADO-LOGIN.md` y son la referencia de los criterios siguientes. (El PO no pudo ejecutar el build: no tengo la cifra; no se inventa.)

- CA-9.1 JS inicial de `/login` (gzip) medido con `node scripts/measure-login-weight.mjs` sobre `npm run build && next start` (Next 16 ya no muestra la columna "First Load JS" en el build) <= línea base + 10 KB. **Línea base (Líder, 2026-10-02, 6159364): JS 255,8 KB gzip, CSS 14,4 KB, HTML 4,0 KB, total 274,2 KB.** Presupuesto: JS <= 265,8 KB. Si se supera, el Frontend justifica por escrito y el Líder decide. Se espera que baje o quede igual, porque se elimina el código de arrastre de la lámpara y no se suman dependencias.
- CA-9.2 Peso transferido total de `/login` (HTML, JS, CSS, fuentes, SVG; sin caché ni la petición opcional de auth) <= 320 KB en la primera carga (decisión del Líder con la línea base de 274,2 KB: margen para la fuente display ~30 KB y el SVG inline). La fuente Bricolage Grotesque se carga una sola vez, un archivo variable, subset `latin`, con `font-display` seguro y sin precarga de más de un archivo.
- CA-9.3 Cero imágenes de mapa de bits en `/login` (la mascota y la decoración son SVG/CSS). Cero peticiones a dominios de terceros salvo los que ya usa la app (Supabase al enviar el formulario). Las fuentes salen del propio origen (`next/font`).
- CA-9.4 Fluidez medida en DevTools > Performance con CPU throttling "4x slowdown" en una PC con GPU normal (no el Celeron): se graba la carga y 10 s de uso (entrada, enfoque de campos, hover del botón, intento fallido con toast, bucle ocioso de la mascota). Resultado: sin tareas largas (> 50 ms) causadas por la animación después de la carga; cuadros descartados < 5 % del tiempo de la grabación; el panel Layers/Rendering con "Paint flashing" no muestra repintado continuo de todo el panel durante el bucle ocioso (solo el elemento animado). Se adjunta el registro.
- CA-9.5 Lighthouse móvil sobre build local (mediana de 3): Rendimiento >= 90, LCP <= 2,5 s (el LCP es el h1 o el logo, nunca la mascota), CLS <= 0,05, TBT <= 200 ms. Se mide en la PC más potente (decisión del Director, E-3); en el Celeron no se mide puntaje.
- CA-9.6 Verificación en la PC del Director (Celeron N4020), a ojo y con el Director como juez: entrada, escritura en campos y movimiento de la mascota se ven fluidos (sin saltos visibles ni sensación de trabado), el formulario es utilizable antes de que termine la animación de entrada y el tiempo de "abrir /login hasta poder escribir" es razonable (<= 3 s en red local; se cronometra con celular). El Director confirma o rechaza; si rechaza, el Frontend simplifica animaciones (el criterio de simplicidad gana al de vistosidad).
- CA-9.7 No hay trabajo continuo escondido: con la pestaña de `/login` abierta e inactiva durante 60 s después del bucle finito, el uso de CPU del proceso del renderizador cae a ~0 % (verificable con el Administrador de tareas de Chrome, Shift+Esc; objetivo <= 1 %).
- CA-9.8 Cero errores y cero advertencias de la propia página en la consola, en escritorio y móvil.
- CA-9.9 Sin dependencias nuevas sin aprobación del Líder (CA-5.6). Si se aprueba alguna, se reporta su peso medido en gzip.

### HU-10 Reacciones de la mascota (Debería; Propuesta del PO, a confirmar)
Como usuario quiero que la mascota acompañe el ingreso sin distraer.

- CA-10.1 La mascota reacciona a dos estados que el formulario ya tiene, usando solo cambio de clase o atributo y CSS (`transform`/`opacity`): "Entrando..." (por ejemplo, mastica o mira expectante) y error de credenciales (por ejemplo, sacude la cabeza una vez, <= 500 ms).
- CA-10.2 Las reacciones no agregan peticiones ni estado nuevo de autenticación: solo leen `loading` y un indicador de "hubo error" de UI. La lógica de 1.2.3 no cambia (CA-4.8).
- CA-10.3 Con `prefers-reduced-motion: reduce` las reacciones no animan; el estado se comunica por texto (CA-6.6, CA-8.2).
- CA-10.4 No hay reacción a "escribir" (tecla por tecla) ni a "contraseña visible": evitar listeners de teclado extra (costo en PC viejas). Se puede revisar más adelante.
- CA-10.5 Éxito: el ingreso exitoso navega de inmediato; no se retrasa la navegación para mostrar una animación de éxito.

### HU-11 Mostrar contraseña (Podría; Propuesta del PO, a confirmar)
Como staff que escribe en celular o tablet quiero ver lo que escribí para no equivocarme.

- CA-11.1 Un botón con nombre accesible "Mostrar contraseña" / "Ocultar contraseña" (`aria-pressed` o cambio de nombre) alterna el campo entre `password` y `text`; por defecto empieza oculta. Alcanzable con teclado, >= 44x44 px en móvil, foco visible.
- CA-11.2 Al alternar no se pierde el valor ni el foco del campo; no se anuncia el contenido de la contraseña a lectores de pantalla salvo que el usuario la muestre.
- CA-11.3 Al enviar el formulario se envía el valor del campo igual que hoy, estando visible u oculta.
- CA-11.4 La contraseña vuelve a oculta si el envío falla por error de credenciales (Propuesta del PO).

### HU-12 Volver a la landing (Podría; Propuesta del PO, a confirmar)
- CA-12.1 El logo en el login es un enlace a `/` con nombre accesible "MenuSky, ir al inicio" (solo si no obliga a modificar `Logo.tsx`; se envuelve desde el login). Alcanzable con teclado, foco visible.
- CA-12.2 No hay enlaces a redes ni a datos de contacto en el login.

---

## 6. Requisitos no funcionales

### 6.1 Seguridad y privacidad
- RNF-S1 No cambia la superficie de seguridad: el formulario envía las mismas credenciales por el mismo cliente de Supabase al mismo endpoint de Auth. Seguridad confirma con `git diff` que no cambian `lib/**`, `proxy.ts`, `supabase/**`, `app/api/**`.
- RNF-S2 Ningún secreto, clave ni credencial en el código, CSS ni SVG. No se agregan credenciales de prueba al repo (ni en comentarios, ni como `placeholder`/`defaultValue`). No se muestran usuarios o emails de ejemplo reales.
- RNF-S3 Los mensajes de error no revelan si el email existe (CA-4.10) ni detalles técnicos del error de Supabase (no se muestra `error.message`).
- RNF-S4 La contraseña no se escribe en la URL, el log de consola ni en `localStorage`. El campo no cambia a `type="text"` salvo con "mostrar contraseña" activado por el usuario (si se aprueba HU-11).
- RNF-S5 Sin scripts, fuentes ni imágenes de terceros; la mascota no hace peticiones (CA-3.2, CA-9.3).
- RNF-S6 Los enlaces del login (volver a la landing) son internos; si hubiera externos usan `rel="noopener noreferrer"`. No se agregan cookies nuevas desde `/login` (las de sesión las pone Supabase, como hoy).
- RNF-S7 `?redirect=`: la lógica actual se conserva (ver riesgo R-1). El Frontend no debe agregar usos nuevos de ese valor en la UI (por ejemplo, mostrarlo en pantalla como texto sin escapar o usarlo en un enlace).
- RNF-S8 Seguridad audita: cabeceras vigentes en `next.config.ts` siguen aplicadas a `/login` (`X-Frame-Options: DENY`, etc.), el HTML de `/login` no contiene claves de servicio (solo `NEXT_PUBLIC_*`), y `npm audit` sigue sin vulnerabilidades altas ni críticas.

### 6.2 Rendimiento
Ver HU-9 y HU-5 (criterios de bloqueo para el release del login).

### 6.3 Accesibilidad (WCAG 2.2 AA)
Ver HU-6, HU-7 y HU-8. Además:
- RNF-A1 Un solo `h1`; sin saltos de jerarquía.
- RNF-A2 El idioma del documento sigue siendo `es-AR` (heredado de `app/layout.tsx`); no se cambia.
- RNF-A9 Todo lo que comunique la mascota también se dice en texto (error, cargando).
- RNF-A10 El botón deshabilitado "Entrando..." mantiene contraste de texto >= 4,5:1 cuando se pueda (el contraste de componentes deshabilitados está exento por WCAG, pero el texto "Entrando..." es información: debe leerse).
- RNF-A11 Si hay texto de ayuda o error persistente, está asociado al campo o al formulario (`aria-describedby` o región de alerta), no flota suelto.

### 6.4 Contenido
- RNF-C1 Español rioplatense con voseo y sin faltas ("Ingresá", "Escribí"; los textos conservados no se cambian). Sin emojis en la interfaz. Sin palabras prohibidas de la landing (CA-3.2 de `landing.md`: "gratis", "pago", etc.).
- RNF-C2 El texto de la gorra está definido por el Director (pregunta 2) y, si es texto, es parte del dibujo (aria-hidden).

---

## 7. Casos límite y manejo de errores

1. Error de credenciales: CA-4.4 (toast + texto persistente propuesto).
2. Error de red o Supabase caído: hoy la petición lanza o devuelve `error`. Si devuelve `error`, se ve el mismo toast "Email o contraseña incorrectos" (engañoso, pero es el comportamiento actual y no se cambia ahora; ver riesgo R-4). Si lanzara una excepción no atrapada, hoy el botón quedaría en "Entrando..." (verificable: no hay `try/catch` ni `finally` en `handleSubmit`). QA prueba con la red desconectada y reporta qué ocurre; no se cambia la lógica en esta etapa.
3. Doble envío: CA-4.5. Nota: tras éxito `setLoading(false)` se ejecuta antes de `router.push`, por lo que el botón vuelve a "Entrar" brevemente durante la navegación; es el comportamiento actual (riesgo R-5).
4. Usuario válido sin fila en `staff_users`: va a `/kitchen` (comportamiento actual); no se cambia.
5. `?redirect=` con valor múltiple (`?redirect=a&redirect=b`): `typeof` no es `string` -> se ignora y se aplica el destino por rol (comportamiento actual, QA lo prueba).
6. `?redirect=` vacío (`?redirect=`): el valor `""` es falsy, se aplica destino por rol.
7. `?redirect=` con una ruta de panel por la que el usuario no tiene rol (p. ej. mozo con `/admin`): el login lo envía allí y el panel muestra su propio aviso (`NotAdminAccess`, verificado en `app/admin/layout.tsx`).
8. Sesión ya activa y entra a `/login`: ve el formulario (comportamiento actual, fuera de alcance cambiarlo).
9. JavaScript desactivado: se ve el formulario, h1, labels y mascota estática; el envío requiere JS (hoy también: `onSubmit` es de React). Se acepta; se anota para QA.
10. Fuente Bricolage no carga: se usa la fuente de reemplazo del sistema sin romper el diseño ni desbordar (CLS bajo).
11. SVG de la mascota que no renderiza: el formulario sigue funcionando; el panel de marca queda con color y logo, sin hueco roto.
12. Gestor de contraseñas que autocompleta: los campos aceptan el valor y el botón se habilita sin interacción extra; el diseño no oculta el autocompletado del navegador (estilos del `:-webkit-autofill` mantienen contraste >= 4,5:1 legible).
13. Texto largo (email de 60+ caracteres): no desborda el campo ni genera scroll horizontal.
14. Pantalla muy baja (alto < 500 px): el contenido scrollea verticalmente; nada queda inalcanzable.
15. Pestaña en segundo plano: no consume CPU (CA-9.7).
16. Navegador con modo de alto contraste forzado (Windows): el formulario sigue siendo utilizable (bordes visibles, texto legible); no se verifica pixel a pixel pero QA lo revisa a ojo.

---

## 8. Riesgos (seguridad y producto, sin pedir cambios de lógica en esta etapa)

- R-1 Redirección abierta posible (seguridad): `LoginForm.tsx` usa `redirectTo` tal cual viene en `?redirect=` y hace `router.push(destination)` sin validar. Un enlace como `/login?redirect=https://sitio-externo.example` o `//sitio-externo.example` podría enviar al usuario a otro sitio justo después de ingresar credenciales (phishing creíble). No pude ejecutarlo, por lo que es "probable, a verificar por Seguridad/QA", no confirmado. `proxy.ts` solo genera valores internos (`pathname`), pero cualquiera puede fabricar el enlace. Recomendación para el Líder: abrir una tarea aparte (fuera de esta rama) para aceptar solo rutas internas que empiecen con `/` y no con `//`. Esta spec NO lo exige en el rediseño.
- R-2 Rol y destino: un mozo (`waiter`) va a `/kitchen`, no a `/floor` (comportamiento actual; la spec del Director dice "el resto -> /kitchen"). Usuarios autenticados sin fila en `staff_users` también llegan a `/kitchen`. El pedido del Director lo mantiene; se deja registrado por si `/floor` era la intención para mozos. Si `/kitchen` no valida el rol en el servidor, esa ruta aceptaría a cualquier usuario autenticado de Supabase (no verificado aquí; solo `/admin` se verificó). Seguridad lo revisa.
- R-3 Sin límite de intentos propio ni recuperación de contraseña: la protección contra fuerza bruta depende de la configuración de Supabase Auth, no del código del repo. Informativo.
- R-4 El toast "Email o contraseña incorrectos" también se muestra ante errores de red o de servicio, lo que puede confundir al usuario. Se conserva por decisión del Director; se anota como mejora futura.
- R-5 `setLoading(false)` antes de `router.push`: ventana breve en la que el botón se rehabilita tras un éxito. Bajo riesgo; se conserva.
- R-6 Rendimiento: el nuevo diseño suma una fuente (Bricolage) y un SVG complejo inline. En un Celeron de 2 núcleos, cada elemento SVG animado pesa. Mitigación: CA-3.5, CA-5.x y CA-9.x, con una regla de desempate: si la vistosidad choca con la fluidez, gana la fluidez.
- R-7 Originalidad de la mascota: riesgo legal por parecido con personajes protegidos (referencia original: Jake, Cartoon Network/WBD). Mitigación: CA-3.4 como criterio de bloqueo, 3 propuestas y revisión del Director. El PO no es abogado: ante la duda, se elige la opción más distinta.
- R-8 Medición de rendimiento: el Celeron del Director no permite Lighthouse (E-3); la verificación depende de otra PC y del juicio visual del Director en la suya. Si ninguna PC potente está disponible, los criterios CA-9.5 quedan sin evidencia y bloquean el release.
- R-9 Toaster fuera del login: el toast usa los estilos globales y puede desentonar visualmente con el login rediseñado (CA-2.6). Aceptable en esta etapa.
- R-10 Duplicación de tokens `--ms-*` entre `landing.css` y `login.css` (decisión del Líder, `docs/STACK.md`): riesgo de que los valores diverjan. CA-2.1 lo cubre con una comparación de valores.

---

## 9. Referencias de diseño o mercado

Leídas desde el repositorio; no se hizo búsqueda externa nueva. Inspiración, no para copiar.

| Referencia | Qué tomar | Qué NO tomar |
|---|---|---|
| Landing de MenuSky (`docs/design/direccion-de-arte.md`) | Paleta "hamburguesa completa", Bricolage Grotesque + Geist, borde de comanda, sombra dura marrón de los botones, tokens de movimiento (160/280/560 ms), logo | El 3D (no va en el login) |
| Patrón habitual de login de SaaS (conocimiento general, no verificado con un sitio concreto) | Panel dividido: marca/ilustración a un lado y formulario a otro; formulario corto y centrado; un solo botón principal | Login con redes sociales, "crear cuenta" (no hay registro) |
| Mascotas de marca en pantallas de entrada (conocimiento general) | Personaje que mira al formulario, reacción breve a error; poca animación | Personajes que siguen el cursor continuamente (costo de CPU en PC viejas) |

Restricción creativa: el amarillo de la mascota y de los acentos es el cheddar de la paleta, pero la mascota no puede ser reconocible como un personaje existente (CA-3.4).

---

## 10. Priorización (MoSCoW)

| Prioridad | Elemento |
|---|---|
| Debe | Eliminar la lámpara; formulario visible y usable de entrada (HU-1); identidad de MenuSky: paleta, tipografía, logo (HU-2); mascota original elegida por el Director de 3 propuestas, SVG propio, con revisión de originalidad (HU-3); autenticación, redirect por rol, textos y estados de carga/error intactos (HU-4); animación solo con transform/opacity, sin blur ni librerías (HU-5); accesibilidad AA incluida el error anunciado (HU-6); sin scroll horizontal desde 320 px y 360 px a 200 % (HU-7); `prefers-reduced-motion` (HU-8); presupuesto de rendimiento y fluidez (HU-9); h1 y título de pestaña "Ingresar | MenuSky" |
| Debería | Reacciones de la mascota a "Entrando..." y error (HU-10); texto de error persistente con `role="alert"` además del toast (CA-6.6); movimiento ocioso finito de la mascota; frase de marca en el panel; foco con anillo de marca |
| Podría | Mostrar contraseña (HU-11); logo como enlace a la landing (HU-12); estilo de marca en los toasts |
| No por ahora | Olvidé mi contraseña; registro; login social; doble factor; "recordarme"; redirigir a quien ya tiene sesión; validación de `?redirect=` (tarea aparte); mascota fuera del login; modo oscuro; sonido; 3D |

MVP: todo lo "Debe".

---

## 11. Propuestas del PO (a confirmar; se implementan salvo que el Director diga lo contrario)

| # | Propuesta | Dónde |
|---|---|---|
| P-1 | Composición de dos paneles en escritorio (marca + formulario) y una columna en móvil/tablet | sección 4 |
| P-2 | Frase del panel de marca: "Cocina, salón y administración, en un solo lugar." | sección 4 |
| P-3 | Se conservan literalmente h1 "Ingresar" (pasa de `h2` a `h1`) y la bajada "Acceso para el equipo del restaurante"; no se agrega mensaje de bienvenida extra | CA-4.7, CA-6.1 |
| P-4 | Título de pestaña "Ingresar \| MenuSky" | CA-6.1 |
| P-5 | Texto de error persistente con `role="alert"` y el mismo texto, además del toast | CA-6.6 |
| P-6 | Reacciones de la mascota solo a "Entrando..." y error; ninguna al tipear | HU-10 |
| P-7 | Movimiento ocioso de la mascota finito (máx. 3 repeticiones), período >= 3 s | CA-5.5 |
| P-8 | "Mostrar contraseña" como mejora opcional (Podría) | HU-11 |
| P-9 | El logo enlaza a `/` (volver a la landing) | HU-12 |
| P-10 | Mascota compacta en móvil (<= 120 px) y oculta en alturas < 640 px; el formulario siempre gana | CA-3.9 |
| P-11 | Presupuestos: First Load JS <= línea base + 10 KB; transferido <= 320 KB (ajustado por el Líder: la línea base ya es 274,2 KB); SVG de mascota <= 12 KB y <= 120 elementos; CLS <= 0,05 | CA-9.1, 9.2, 3.5, 5.8 |
| P-12 | El foco, tras un error, queda en el botón "Entrar" | CA-6.5 |
| P-13 | Mascota sin nombre visible en pantalla hasta que el Director decida (pregunta 3) | sección 12 |
| P-14 | Los toasts conservan su estilo global actual en esta etapa | CA-2.6 |

---

## 12. Preguntas abiertas para el Director

1. Elección de la mascota. El Frontend va a proponer 3 opciones originales (SVG estático, con ficha de originalidad). ¿Confirmás que elegís una de las 3 antes de que se construya la versión final, y que si ninguna te gusta pedís 3 nuevas? Recomendación del PO: sí; además pedimos que valores simpatía y "no parece otro personaje" antes que detalle.
2. Texto de la gorra. La referencia decía "I love MenuSky" (inglés). Opciones: (A) "Amo MenuSky"; (B) "Me encanta MenuSky" (largo para una gorra, letras muy chicas); (C) "Yo ♥ MenuSky" con un corazón dibujado, corto y casi independiente del idioma; (D) "I love MenuSky" tal cual. Recomendación del PO: C (entra legible en una gorra y es coherente con un equipo que habla rioplatense); segunda opción A. El texto va convertido a trazos y es decorativo.
3. Nombre de la mascota. Opciones: (A) que lo decida el Director ahora; (B) se elige al aprobar el diseño final; (C) sin nombre. Recomendación del PO: B; hoy la pantalla no muestra el nombre (P-13), así que no bloquea.
4. "Olvidé mi contraseña". Hoy no existe y agregarlo cambia la lógica de autenticación y requiere configurar el envío de emails en Supabase (otra tarea, fuera de esta rama). ¿Querés planificarlo como una funcionalidad aparte (opciones: (A) no por ahora, el admin restablece las claves a mano; (B) spec propia después del login)? Recomendación del PO: B si los restaurantes olvidan claves seguido; mientras tanto, A. El rediseño deja espacio visual para un enlace futuro.
5. Reacciones de la mascota. ¿Querés que reaccione a los estados (P-6: "Entrando..." y error) o que sea solo decorativa con un movimiento ocioso corto? Recomendación del PO: reacciones a los dos estados, porque dan personalidad sin costo de CPU relevante; se simplifican si en la PC del Director no andan fluidas (CA-9.6).
6. Mostrar contraseña y enlace a la landing (P-8, P-9): Podría. ¿Los querés en esta versión? Recomendación del PO: sí a ambos, son baratos y ayudan en celular; si querés minimizar el alcance, quedan para después.
7. Quién mide el rendimiento. Para CA-9.5 hace falta una PC más potente que el Celeron (E-3, pendiente del Director). ¿Cuál se usa (la de otro integrante, una prestada) y cuándo? Sin ella el criterio de Lighthouse no tiene evidencia. Recomendación del PO: usar la misma PC elegida para medir la landing, el mismo día.
8. Redirección por `?redirect=` (R-1): ¿querés abrir una tarea aparte para validar que solo acepte rutas internas? No cambia nada del rediseño. Recomendación del PO: sí, antes de publicar el login rediseñado, porque es un riesgo de phishing.

---

## 13. Notas para cada rol

- Frontend: HU-1 a HU-12, secciones 4 y 11. Proponer 3 mascotas (CA-3.1, 3.4, 3.5) antes de construir. Solo `app/login/**`, `components/auth/LoginForm.tsx` y `components/brand/mascot/**`. No tocar `Logo.tsx`, `lib/**`, `globals.css`, landing. Tokens `--ms-*` con los mismos valores. Medir los contrastes nuevos (CA-6.7) y adjuntarlos. Listar textos nuevos.
- Backend: sin trabajo previsto. Solo confirmar que no se tocan `lib/**`, `supabase/**`, `app/api/**` (CA-4.8).
- Líder: aprobar o rechazar dependencias (CA-5.6), medir la línea base (HU-9), definir los números finales de presupuesto, actualizar `docs/CREDITS.md` (CA-3.11), decidir sobre la tarea aparte de `?redirect=` (R-1), commit en `feat/login-redesign`.
- Seguridad: RNF-S1 a S8, R-1 (verificar si la redirección abierta es explotable), R-2 (validación de rol en `/kitchen`), ausencia de secretos, mascota sin recursos externos.
- QA: cada CA es una prueba. Viewports 320x568, 360x640, 768x1024, 1440x900; CPU 4x; emulación de `prefers-reduced-motion` y `prefers-color-scheme: dark`; lector de pantalla (NVDA y VoiceOver); axe y Lighthouse; casos de la sección 7; regresión de HU-4 con las tres cuentas de rol de prueba y datos ficticios (nunca credenciales reales de producción; usar las variables de entorno ficticias de `docs/ESTADO-LOGIN.md` o un proyecto de pruebas aprobado por el Líder). Nota: con las variables ficticias de ESTADO-LOGIN.md el inicio de sesión real no puede completarse; para HU-4 hace falta un Supabase de pruebas o un mock aprobado por el Líder (a coordinar).
