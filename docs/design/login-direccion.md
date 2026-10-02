# Dirección visual del login (`/login`)

Autor: Frontend. Fecha: 2026-10-02. Estado: **propuesta con borrador funcional**, para revisión del Director junto con la elección de mascota.
Spec: `docs/specs/login.md` v1.0. Stack: `docs/STACK.md`, "Arquitectura del rediseño del login". Base de marca: `docs/design/direccion-de-arte.md`.

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

Toast (estilo global, P-14): ver sección 8, medido con los colores computados en el navegador.

Reglas que se respetan: texto sobre rojo siempre `paper` al 100 %; nada de cheddar sobre tomato como texto; el amarillo solo lleva texto `patty`. El anillo de foco (3 px tomato) siempre se dibuja separado del botón (offset 4 px), sobre paper.

Un único aspecto: `color-scheme: light`, sin `.dark` (CA-2.5).

## 4. Tipografía

- **Bricolage Grotesque** (la de la landing; `next/font/google` en `app/login/layout.tsx`, un archivo variable, subset `latin`, eje `opsz`, `display: swap`): h1 "Ingresar" (800, `clamp(2rem, 8vw, 2.75rem)`, interlineado 1, tracking -0,03em), frase del panel (700 en móvil, 800 y `clamp(2.25rem, 3.4vw, 3.5rem)` en escritorio) y el logotipo.
- **Geist** (ya cargada en el layout raíz): bajada, etiquetas (600, 15 px), campos (16 px: sin zoom automático en iOS), botón (650, 17 px), error (600, 15 px).
- Verificado en el navegador (Chrome headless, `getComputedStyle`): h1 = `"Bricolage Grotesque", "Bricolage Grotesque Fallback", Geist`; `#email` = `Geist, "Geist Fallback", system-ui, sans-serif`.

## 5. Movimiento liviano (Celeron N4020)

Todo es CSS, solo `transform` y `opacity`. Sin librerías, sin `filter`, sin `blur`, sin `backdrop-filter`, sin `drop-shadow`, sin `box-shadow` animado (la sombra del botón cambia de golpe, sin transición). JS de animación: ninguno; React solo cambia un atributo `data-mood`.

| Qué | Cómo | Duración | Repeticiones |
|---|---|---|---|
| Entrada del ticket | sube 14 px (`transform`); el formulario es visible y usable desde el primer cuadro (no anima `opacity`) | 420 ms | 1 |
| Entrada de la mascota | sube 24 % + aparece (`transform` + `opacity`) | 520 ms (120 ms de espera) | 1 |
| Botón Entrar | hover sube 2 px, press baja 3 px | 160 ms | - |
| Campos | borde y fondo cambian sin transición; anillo de foco tomato | inmediato | - |
| Ocioso de la mascota | un solo elemento (la raíz `<svg>`, capa compuesta: no repinta el dibujo) | ciclo 3,4 s, empieza a 1,6 s | **3** y se detiene (P-7) |
| Pausa del ocioso | `.lg:focus-within` pausa el ciclo: no anima mientras se escribe (CA-5.5) | - | - |
| "Entrando..." | la mascota se inclina hacia el formulario (giro 4°) | 280 ms | 1 |
| Error | sacudida (giro ±6°) + cambio de cara por `opacity` | 460 ms | 1 por error |

Sin parpadeos (nada cambia más de 3 veces por segundo). Después del ocioso (~12 s) no queda ninguna animación corriendo (CA-9.7).

`prefers-reduced-motion: reduce`: regla global en `.ms-login` con `animation: none` y `transition: none`, más los estados del botón y de "Entrando..." sin `transform`. La mascota queda en su pose completa. El error sigue visible por texto, borde y cara de "uy" (cambio estático). Verificado: con la emulación activa, `document.getAnimations().length` = 0.

## 6. Accesibilidad

- `h1` "Ingresar" único, `main` como landmark, título de pestaña "Ingresar | MenuSky" (vía `metadata` en `app/login/layout.tsx` + el template de `app/layout.tsx`; verificado en el navegador).
- Labels visibles asociados (`for`/`id` sin cambios: `email`, `password`), `autoComplete` y `type` iguales.
- Foco visible: anillo de 3 px tomato en todo lo enfocable.
- Error: además del toast, un bloque persistente con `role="alert"` y el texto exacto "Email o contraseña incorrectos", con ícono (no depende del color). La región existe siempre (vacía) para que el lector anuncie el cambio. Tras el error el foco vuelve a "Entrar" (P-12) y la contraseña vuelve a oculta (CA-11.4).
- "Mostrar contraseña" (P-8, a confirmar): botón de 44 x 44 dentro del campo, nombre accesible que cambia entre "Mostrar contraseña" y "Ocultar contraseña".
- Logo enlazado a `/` con nombre "MenuSky, ir al inicio" (P-9, a confirmar), envolviendo `Logo` sin modificarlo.
- Mascota `aria-hidden="true"`, sin foco, `pointer-events: none`. Todo lo que comunica (cargando, error) también está en texto.

## 7. Comportamiento por tamaño (medido con Chrome headless, borrador en `next dev`)

| Viewport | Scroll horizontal | Botón "Entrar" visible sin scroll | Mascota |
|---|---|---|---|
| 320 x 568 | no (scrollWidth 320) | sí (borde inferior en 481 px) | oculta (alto < 640, P-10) |
| 360 x 640 | no (360) | sí (562 px) | 120 px |
| 768 x 1024 | no (768) | sí (642 px) | 150 px |
| 1440 x 900 | no (1440) | sí (644 px) | 440 px |
| 180 x 320 (360 px al 200 %) | no (180) | no: scroll vertical, todo alcanzable | oculta |
| 640 x 360 (1280 x 720 al 200 %, o celular horizontal) | no (640) | no: scroll vertical | oculta |
| 1280 x 600 (notebook baja) | no (1280) | sí (504 px) | 264 px (44 vh) |

Igual para `?mascota=1`, `2` y `3`. Consola sin errores ni advertencias.

- **320 px**: menos relleno en el ticket y frase de marca a 15 px; ningún texto se corta (la frase puede partir palabra con `overflow-wrap`).
- **Zoom 200 %**: el layout pasa a una columna con scroll vertical; nada se sale por los costados.
- **Alturas < 640 px en una columna (P-10, CA-3.9)**: la mascota se oculta y el bloque rojo queda como una franja con la frase; el formulario gana. En escritorio (dos paneles) la mascota no empuja el formulario, así que se achica con la altura (44 vh por debajo de 700 px) en vez de ocultarse.

## 8. Pendiente y a confirmar

- Elección de mascota (3 propuestas en `docs/design/mascota/mascota.md`); después se borra el selector `?mascota=`.
- P-8 (mostrar contraseña) y P-9 (logo a `/`) están incluidos y marcados "a confirmar".
- El toast mantiene el estilo global (P-14) y aparece arriba al centro, encima del panel; en escritorio tapa el logo mientras dura. Si molesta, se puede pedir al Líder moverlo solo en el login.
- Pruebas que no puedo hacer acá: lector de pantalla real (NVDA/VoiceOver), Lighthouse en PC potente, fluidez en el Celeron del Director, prueba de intuitividad con 3 personas.
