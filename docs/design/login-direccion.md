# Dirección visual del login (`/login`)

Autor: Frontend. Fecha: 2026-10-02. Estado: **implementación final según la spec v1.1** (mascota elegida: Pomo). Las secciones 5, 6, 8 y 9 se actualizaron para la v1.1; el resto sigue vigente.
Spec: `docs/specs/login.md` v1.1. Stack: `docs/STACK.md`, "Arquitectura del rediseño del login". Base de marca: `docs/design/direccion-de-arte.md`.

## 1. Concepto: "La comanda del turno"

Entrar al sistema es empezar el turno. El formulario es una **comanda de cocina**: un ticket de papel con borde marrón, una línea de corte punteada con dos muescas y una sombra dura de sello. Al lado, el **panel de marca** en rojo tomate con la frase "Cocina, salón y administración, en un solo lugar." y la mascota parada sobre la cúpula del pan, que asoma como un sol (la misma idea del isotipo: pan + sol = Menu + Sky).

Tono: el de la landing, cálido y directo. Sin textos de relleno: la única frase nueva es la propuesta P-2, que describe funciones reales.

Qué cambia respecto del login actual: se va la lámpara con cadena (y su JS de arrastre), se van el naranja `#E8590C`, el fondo `#170f0c`, el `backdrop-blur`, la sombra con `blur` y el `animate-pulse`. El formulario está visible y usable desde el primer cuadro.

## 2. Layout (P-1)

```
Escritorio >= 1024 px (dos paneles, 50/50)
+-------------------------------+-------------------------------+
| Cocina, salón y               |  [isotipo] MenuSky  (enlace /)|
| administración, en un         |                               |
| solo lugar.   (Bricolage 800) |   +-----------------------+   |
|                               |   | Ingresar              |   |
|            ___                |   | Acceso para el equipo |   |
|         .-'   '-.  mascota    |   o- - - - - - - - - - - -o   |
|        /  (^_^)  \ sobre la   |   | Email   [__________]  |   |
|       |   cúpula  | cúpula    |   | Contraseña [______ ojo]|  |
|  tomato           (bun)       |   | [ error, si hay ]     |   |
+-------------------------------+   | [      Entrar       ] |   |
                                    +-----------------------+   |
Móvil < 640 px (una columna, ancho máx. 480 px)
[isotipo] MenuSky
+--------------------------------+
| Cocina, salón y     (mascota   |  bloque tomato, mascota de 120 px
| administración...    120 px)   |
+--------------------------------+
+--------------------------------+
| Ingresar / bajada / corte      |  ticket
| Email / Contraseña / Entrar    |
+--------------------------------+
Tablet 640-1023 px: la misma columna (ancho máx. 520 px), centrada en vertical, mascota de 150 px.
```

- Orden del DOM = orden de tabulación: enlace del logo -> Email -> Contraseña -> "Mostrar contraseña" -> Entrar (CA-6.2). El panel de marca no tiene nada enfocable; en escritorio se ubica a la izquierda con `grid-template-areas`, sin alterar el orden de foco.
- La mascota nunca se superpone al formulario (CA-3.7): vive en su propio bloque, con `pointer-events: none` y `aria-hidden="true"`.

## 3. Paleta y contraste (medido)

Solo tokens `--ms-*`, con los mismos HEX de `app/(landing)/landing.css` (copiados en `app/login/login.css` bajo `.ms-login`). Rojo tomate y amarillo cheddar son protagonistas (panel y botón); verde (lechuga de la hamburguesa y del isotipo) y marrón (texto, bordes, delantal) son acento. Dos valores fuera de la tabla, heredados tal cual: `#FFCD3F` (hover del botón amarillo, el mismo de `.ms-btn--cheddar:hover` de la landing) y `#7CCB4E` (verde del isotipo de `Logo.tsx`).

Método: luminancia relativa sRGB y `(L1 + 0,05) / (L2 + 0,05)`, script propio (`contrast.mjs`, mismo método que la sección 2 de `direccion-de-arte.md`). Salida del 2026-10-02:

```
h1 / labels: patty sobre paper                   #2B1710 / #FFFDF8  16.76:1  OK (min 4.5)
bajada: patty-soft sobre paper                   #6A4A3C / #FFFDF8  7.77:1  OK (min 4.5)
texto escrito: patty sobre bun (campo)           #2B1710 / #FFF5E1  15.74:1  OK (min 4.5)
texto escrito con foco: patty sobre paper        #2B1710 / #FFFDF8  16.76:1  OK (min 4.5)
borde de campo: patty-soft vs bun (interior)     #6A4A3C / #FFF5E1  7.30:1  OK (min 3)
borde de campo: patty-soft vs paper (tarjeta)    #6A4A3C / #FFFDF8  7.77:1  OK (min 3)
icono ojo: patty-soft sobre bun                  #6A4A3C / #FFF5E1  7.30:1  OK (min 3)
anillo de foco: tomato vs paper                  #D7261E / #FFFDF8  4.94:1  OK (min 3)
anillo de foco: tomato vs bun                    #D7261E / #FFF5E1  4.64:1  OK (min 3)
anillo de foco: tomato vs cheddar (botón)        #D7261E / #FFC21A  3.10:1  OK (min 3)
botón: patty sobre cheddar                       #2B1710 / #FFC21A  10.53:1  OK (min 4.5)
botón hover: patty sobre #FFCD3F                 #2B1710 / #FFCD3F  11.40:1  OK (min 4.5)
botón Entrando...: patty sobre mustard           #2B1710 / #E3A008  7.54:1  OK (min 4.5)
borde del botón: patty vs paper                  #2B1710 / #FFFDF8  16.76:1  OK (min 3)
error: ketchup sobre bun                         #A8141B / #FFF5E1  6.98:1  OK (min 4.5)
borde del error: ketchup vs paper                #A8141B / #FFFDF8  7.43:1  OK (min 3)
frase de marca: paper sobre tomato               #FFFDF8 / #D7261E  4.94:1  OK (min 4.5)
logo Menu: patty sobre bun                       #2B1710 / #FFF5E1  15.74:1  OK (min 4.5)
logo Sky: tomato sobre bun                       #D7261E / #FFF5E1  4.64:1  OK (min 4.5)
isotipo (cuadrado tomato) vs bun                 #D7261E / #FFF5E1  4.64:1  OK (min 3)
panel tomato vs bun (borde del bloque)           #D7261E / #FFF5E1  4.64:1  OK (min 3)
mascota: contorno patty vs tomato                #2B1710 / #D7261E  3.40:1  OK (min 3)
mascota: contorno patty vs bun (cúpula)          #2B1710 / #FFF5E1  15.74:1  OK (min 3)
línea de corte: crust vs paper (decorativa)      #8A5A3B / #FFFDF8  5.73:1  OK (min 3)
```

El login ya no usa toasts (CA-2.6). Los dos mensajes de error usan el mismo par medido arriba (ketchup sobre bun, 6,98:1) y el mismo borde (7,43:1): no hay combinaciones de texto nuevas en la v1.1. Las caras nuevas de la mascota son decorativas (contorno patty, igual que antes).

Reglas que se respetan: texto sobre rojo siempre `paper` al 100 %; nada de cheddar sobre tomato como texto; el amarillo solo lleva texto `patty`. El anillo de foco (3 px tomato) siempre se dibuja separado del botón (offset 4 px), sobre paper.

Un único aspecto: `color-scheme: light`, sin `.dark` (CA-2.5).

## 4. Tipografía

- **Bricolage Grotesque** (la de la landing; `next/font/google` en `app/login/layout.tsx`, un archivo variable, subset `latin`, eje `opsz`, `display: swap`): h1 "Ingresar" (800, `clamp(2rem, 8vw, 2.75rem)`, interlineado 1, tracking -0,03em), frase del panel (700 en móvil, 800 y `clamp(2.25rem, 3.4vw, 3.5rem)` en escritorio) y el logotipo.
- **Geist** (ya cargada en el layout raíz): bajada, etiquetas (600, 15 px), campos (16 px: sin zoom automático en iOS), botón (650, 17 px), error (600, 15 px).
- Verificado en el navegador (Chrome headless, `getComputedStyle`): h1 = `"Bricolage Grotesque", "Bricolage Grotesque Fallback", Geist`; `#email` = `Geist, "Geist Fallback", system-ui, sans-serif`.

## 5. Movimiento liviano (Celeron N4020), v1.1

Todo es CSS, solo `transform` y `opacity`. Sin librerías, sin `filter`, sin `blur`, sin `backdrop-filter`, sin `drop-shadow`, sin `box-shadow` animado (la sombra del botón cambia de golpe, sin transición). JS de animación: ninguno; React solo cambia atributos (`data-mood`, `data-look`, `data-face`) en eventos discretos (foco, envío, respuesta). El único temporizador del login es la red de seguridad de 10 s del botón tras un éxito (CA-10.10 d), que no anima nada.

| Qué | Cómo | Duración | Repeticiones |
|---|---|---|---|
| Entrada del ticket | sube 14 px (`transform`); el formulario es visible y usable desde el primer cuadro | 420 ms | 1 (fill `backwards`: al terminar no queda viva) |
| Entrada de la mascota | sube 24 % + aparece (`transform` + `opacity`) | 520 ms (120 ms de espera) | 1 (idem) |
| Botón Entrar | hover sube 2 px, press baja 3 px | 160 ms | - |
| Campos | borde y fondo cambian sin transición; anillo de foco tomato | inmediato | - |
| Idle de la mascota | parpadeo en una capa chica (solo los ojos) | 176 ms cada 5,5 s, desde 1,2 s | **16** (~89 s) y se detiene |
| Pausa del idle | con foco en el login o durante una reacción, el parpadeo se pausa y los ojos quedan abiertos | - | - |
| Mirada | los ojos van hacia Email, Contraseña o "Entrar" según el foco | 180 ms | por evento de foco |
| "Entrando..." | se inclina hacia el formulario y mira el botón | 280 ms | 1 |
| Error | sacudida (giro ±6°) + cara de "uy" | 460 ms | 1 por error |
| Éxito | salto + brazo en alto + cara contenta, en el mismo render que `router.push` | 380 ms | 1 |

Detalle técnico, poses y mediciones de costo: `docs/design/mascota/mascota.md`, "Cómo se anima" y "Recortes". Recortes aplicados (orden de CA-10.11): respiración y "ojeada" quitadas por costo; el seguimiento del cursor (CA-10.12, Podría) no se implementó (ver sección 9).

Nada parpadea más de 3 veces por segundo. Pasados ~89 s de idle no queda ninguna animación (`document.getAnimations()` vacío a los 100 s, medido).

`prefers-reduced-motion: reduce`: regla global en `.ms-login` con `animation: none` y `transition: none`, más los estados del botón sin `transform`. Las poses de la mascota (mirada, inclinación, caras, brazo en alto) cambian de golpe. Verificado con CDP: `document.getAnimations().length` = 0 en reposo, foco en cada campo, "Mostrar contraseña", "Entrar", "Entrando...", error de credenciales, error de red y éxito.

## 6. Accesibilidad

- `h1` "Ingresar" único, `main` como landmark, título de pestaña "Ingresar | MenuSky" (vía `metadata` en `app/login/layout.tsx` + el template de `app/layout.tsx`; verificado en el navegador).
- Labels visibles asociados (`for`/`id` sin cambios: `email`, `password`), `autoComplete` y `type` iguales.
- Foco visible: anillo de 3 px tomato en todo lo enfocable.
- Error (v1.1, CA-6.6/CA-6.14): un único canal, el bloque persistente con `role="alert"`, sin toast ni `aria-live` extra. Dos textos: "Email o contraseña incorrectos" (solo `AuthApiError` 400) y "No pudimos conectar. Revisá tu conexión e intentá de nuevo." (red, 5xx, 429, otros errores, excepciones). Ícono + texto (no depende del color). La región existe siempre (vacía) para que el lector anuncie el cambio. Tras el error el foco vuelve a "Entrar" (P-12) y la contraseña vuelve a oculta (CA-11.4).
- "Mostrar contraseña" (HU-11, Debe): botón de 44 x 44 dentro del campo, nombre accesible que cambia entre "Mostrar contraseña" y "Ocultar contraseña".
- Logo enlazado a `/` con nombre "MenuSky, ir al inicio" (HU-12, Debe), envolviendo `Logo` sin modificarlo.
- Mascota `aria-hidden="true"`, sin foco, `pointer-events: none`. Todo lo que comunica (cargando, error) también está en texto.

## 7. Comportamiento por tamaño (medido con Chrome headless sobre el build de producción)

| Viewport | Scroll horizontal | Botón "Entrar" visible sin scroll | Mascota |
|---|---|---|---|
| 320 x 568 | no (scrollWidth 320) | sí (borde inferior en 481 px) | oculta (alto < 640, P-10) |
| 360 x 640 | no (360) | sí (562 px) | 120 px |
| 768 x 1024 | no (768) | sí (806 px; columna centrada en vertical) | 150 px |
| 1440 x 900 | no (1440) | sí (644 px) | 440 px |
| 180 x 320 (360 px al 200 %) | no (180) | no: scroll vertical, todo alcanzable | oculta |
| 640 x 360 (1280 x 720 al 200 %, o celular horizontal) | no (640) | no: scroll vertical | oculta |
| 1280 x 600 (notebook baja) | no (1280) | sí (504 px) | 264 px (44 vh) |

Consola sin errores ni advertencias. (v1.1: sin scroll horizontal también durante la entrada, la sacudida de error y el salto de éxito en 320, 360, 180, 768, 1440 y 640 x 360; medido por cuadro con CDP.)

- **320 px**: menos relleno en el ticket y frase de marca a 15 px; ningún texto se corta (la frase puede partir palabra con `overflow-wrap`).
- **Zoom 200 %**: el layout pasa a una columna con scroll vertical; nada se sale por los costados.
- **Alturas < 640 px en una columna (P-10, CA-3.9)**: la mascota se oculta y el bloque rojo queda como una franja con la frase; el formulario gana. En escritorio (dos paneles) la mascota no empuja el formulario, así que se achica con la altura (44 vh por debajo de 700 px) en vez de ocultarse.

## 8. Peso y trabajo en segundo plano (build de producción con env ficticias, `next start -p 3200 -H 127.0.0.1`)

**v1.1 (implementación final, 2026-10-02):** `node scripts/measure-login-weight.mjs` -> `{"files":14,"js_gzip_kb":252.5,"css_gzip_kb":17.4,"fonts_kb":0,"html_gzip_kb":6,"total_kb":275.9}`. JS 252,5 KB (<= 265,8). Transferido real con Chrome por CDP (caché desactivada, fuentes incluidas): **376,6 KB** (<= 380, CA-9.2), 18 peticiones, 0 de terceros (Document 8,3, CSS 19,2, JS 220,0, fuentes 127,8, otros 1,3). Margen: 3,4 KB.

Lo que sigue es la medición del borrador (v1.0), como historial.

`node scripts/measure-login-weight.mjs` (mismo método que la línea base):

```
{"files":14,"js_gzip_kb":250.8,"css_gzip_kb":17.3,"fonts_kb":0,"html_gzip_kb":5.7,"total_kb":273.7}
```

| | Línea base | Borrador | Presupuesto |
|---|---|---|---|
| JS gzip | 255,8 KB | **250,8 KB** (-5,0: se fue la lámpara) | <= 265,8 KB |
| CSS gzip | 14,4 KB | 17,3 KB (+2,9: `login.css`) | - |
| HTML gzip | 4,0 KB | 5,7 KB (+1,7: SVG de la mascota inline) | - |
| Total | 274,2 KB | **273,7 KB** | <= 320 KB |

**Ojo con las fuentes:** el script no las cuenta (`fonts_kb: 0`, también en la línea base): Next 16 las precarga por la cabecera HTTP `Link`, no por el HTML. Medido con Chrome headless (CDP, caché desactivada, 15 s): Bricolage Grotesque 75,6 KB (nueva en `/login`; es el mismo archivo que la landing, así que quien viene de la landing ya lo tiene en caché), Geist 29,1 KB y Geist Mono 23,1 KB (estas dos ya estaban: las precarga `app/layout.tsx`). Transferido real total: 374,3 KB, 18 peticiones, 0 de terceros. Con las fuentes, la línea base ya habría superado los 320 KB (274,2 + 52,2 de Geist), así que el presupuesto de CA-9.2 hay que redefinirlo. Lo decide el Líder (opciones en el informe).

El logo enlaza a `/` con `prefetch={false}`: con prefetch, Next descargaba la landing entera (RSC, CSS y JS, ~100 KB más) mientras alguien solo quería entrar.

Trabajo en segundo plano (CDP, `document.getAnimations()`): a los 2,5 s corre solo `m-idle-N` (1 elemento); al enfocar Email pasa a `paused`; a los ~17 s no queda ninguna animación (solo las de entrada, ya en `finished`). Con `prefers-reduced-motion: reduce` hay 0 animaciones.


## 9. Pendiente y a confirmar (v1.1)

- Seguimiento del cursor (CA-10.12, Podría): **no implementado**. Exige un listener `pointermove` con `requestAnimationFrame` (la única excepción de JS de animación) y su condición (e) incluye medirlo en el Celeron con el mouse en movimiento; el parpadeo solo ya deja el idle al límite del presupuesto (~2 puntos de GPU) y la mirada por foco cubre el pedido del Director.
- Costo del idle al límite: diferencia contra reduced-motion de ~1,8-2,1 puntos (umbral 2). Si el Líder no lo acepta, el siguiente recorte es dejar el idle solo en reacciones (sin parpadeo).
- Pruebas que no puedo hacer acá: lector de pantalla real (NVDA/VoiceOver, CA-6.6), Lighthouse en una PC más potente (CA-9.5), Administrador de tareas de Chrome con ventana visible (CA-9.7; mis cifras de CPU son de Chrome headless con GPU en este mismo Celeron), prueba de intuitividad con 3 personas, originalidad de Pomo puntos 2 y 5.
