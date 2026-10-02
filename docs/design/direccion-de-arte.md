# Dirección de arte: landing de MenuSky (`/`)

Autor: Frontend. Fecha: 2026-09-30. Estado: propuesta; la revisa el Director en el release junto con la landing (CA-8.13).
Spec: `docs/specs/landing.md` v1.0. Stack: `docs/STACK.md` ("Arquitectura de la landing").

## 1. Concepto: "La comanda sube al cielo"

MenuSky = la carta (Menu) que se va al aire (Sky). La idea visual central es una **hamburguesa completa desarmada que flota en el cielo**: cada capa es una parte del servicio (la carta, el pedido, la cocina, el mozo). A medida que el dueño baja por la página, las capas **se van juntando** y la hamburguesa queda armada: "todo lo que pasa en tu salón, en un solo lugar".

El segundo motivo es la **comanda de cocina**: el papel del pedido, con borde dentado, números en monoespaciada, líneas punteadas y un sello con la mesa ("Mesa 4"). Es el idioma que un dueño de restaurante ya conoce; lo usamos para los mockups, los separadores y las etiquetas.

Tono: cálido, de barra, directo. Habla como un encargado que sabe del rubro, no como una consultora. Voseo rioplatense. Nada de "potenciá tu negocio": frases concretas sobre lo que pasa en la mesa y en la cocina.

Qué evitamos a propósito: degradados violeta/azul, blobs borrosos, grillas de tres tarjetas idénticas, emojis, fotos de stock de gente sonriendo con una tablet, cifras inventadas.

## 2. Paleta "hamburguesa completa"

Rojo (tomate) y amarillo (cheddar) son protagonistas; verde (lechuga) y marrón (carne) son acento y texto. El fondo es crema de miga de pan, no blanco puro.

| Token | HEX | Ingrediente | Uso |
|---|---|---|---|
| `--ms-bun` | `#FFF5E1` | miga | fondo general |
| `--ms-paper` | `#FFFDF8` | papel de comanda | tarjetas, mockups |
| `--ms-toasted` | `#F4D9A6` | pan tostado | superficies secundarias, bordes cálidos |
| `--ms-crust` | `#8A5A3B` | corteza | bordes, íconos, texto terciario |
| `--ms-cheddar` | `#FFC21A` | queso cheddar | CTA principal (fondo), resaltados, sección de equipo |
| `--ms-mustard` | `#E3A008` | mostaza | hover del CTA amarillo, detalles |
| `--ms-tomato` | `#D7261E` | tomate | color de marca, bloques de impacto, CTA final |
| `--ms-ketchup` | `#A8141B` | ketchup | texto rojo sobre crema, hover del rojo |
| `--ms-lettuce` | `#4C9A2A` | lechuga | solo gráfico (íconos, puntos de estado, 3D) |
| `--ms-lettuce-dark` | `#2E6B1A` | lechuga oscura | texto verde (estado "Listo", "Disponible") |
| `--ms-patty` | `#2B1710` | carne | texto principal, sección oscura |
| `--ms-patty-soft` | `#6A4A3C` | carne a punto | texto secundario |

### Pares de contraste verificados (WCAG 2.x, fórmula de luminancia relativa)

Calculados con un script propio (luminancia relativa sRGB y `(L1+0.05)/(L2+0.05)`), 2026-09-30.

| Texto | Fondo | Ratio | Resultado | Uso permitido |
|---|---|---|---|---|
| patty `#2B1710` | bun `#FFF5E1` | 15.74 | AAA | texto principal |
| patty | paper `#FFFDF8` | 16.76 | AAA | texto en tarjetas |
| patty-soft `#6A4A3C` | bun | 7.30 | AAA | texto secundario |
| patty-soft | toasted `#F4D9A6` | 5.77 | AA | texto secundario sobre tostado |
| patty | toasted | 12.43 | AAA | texto sobre tostado |
| patty | cheddar `#FFC21A` | 10.53 | AAA | **texto del CTA amarillo** |
| patty | mustard `#E3A008` | 7.54 | AAA | CTA amarillo en hover |
| ketchup `#A8141B` | bun | 6.98 | AA | texto rojo normal |
| tomato `#D7261E` | bun | 4.64 | AA | texto rojo (también chico) |
| tomato | paper | 4.94 | AA | texto rojo en tarjetas |
| paper `#FFFDF8` | tomato | 4.94 | AA | texto claro sobre bloque rojo |
| bun `#FFF5E1` | tomato | 4.64 | AA | texto claro sobre bloque rojo |
| bun | ketchup | 6.98 | AA | texto claro sobre rojo oscuro |
| cheddar | patty | 10.53 | AAA | amarillo sobre sección oscura |
| bun | patty | 15.74 | AAA | texto claro sobre sección oscura |
| lettuce-dark `#2E6B1A` | bun | 6.00 | AA | texto verde |
| crust `#8A5A3B` | bun | 5.38 | AA | texto terciario |
| cheddar | ketchup | 4.67 | AA | detalles amarillos sobre rojo oscuro |
| cheddar | tomato | 3.10 | solo texto grande / gráfico | **prohibido para texto normal** |
| lettuce `#4C9A2A` | bun | 3.25 | solo gráfico (>= 3:1) | **prohibido para texto** |
| patty | tomato | 3.40 | solo gráfico | **prohibido para texto** |

Regla de oro: el amarillo nunca lleva texto claro; el texto sobre amarillo es siempre `patty`.

Corrección QA-01 (2026-10-01): sobre bloque `tomato` el texto va siempre en `paper` al 100% (con opacidad 0.92 bajaba a 4,37:1). No usar texto claro semitransparente sobre rojo.

Mockup "Temas de color" (colores reales de `lib/theme/presets.ts`, no de la marca): el botón "Ver pedido" (12,8 px) usa el texto del tema sobre el acento cuando cumple, y si no, un acento oscurecido solo en el botón (la miniatura y la muestra mantienen el acento real).

| Tema | Texto del botón | Fondo del botón | Ratio |
|---|---|---|---|
| Default | `#1C1917` | `#E8590C` (acento real) | 4.88 |
| Glaciar | `#0B2A3B` | `#0EA5C9` (acento real) | 5.14 |
| Galaxia | `#FFFFFF` | `#AE2FDC` (acento `#C742F0` oscurecido) | 4.95 |
| Madera | `#3B2A1E` | `#C98A2C` (acento real) | 4.66 |
| Neobrutalista | `#FFFFFF` | `#D62B39` (acento `#E63946` oscurecido) | 4.93 |
| Neumorfismo | `#FFFFFF` | `#A8603F` (acento `#C97B5A` oscurecido) | 4.76 |
| Claymorfismo | `#2E2A3D` | `#FF6F61` (acento real) | 5.08 |

Modo oscuro del sistema (CA-8.12): la landing fija `color-scheme: light` y no usa `.dark` ni `dark:`; con `prefers-color-scheme: dark` se ve igual.

## 3. Tipografía

- **Display: Bricolage Grotesque** (`next/font/google`, verificada en `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`: variable, ejes `opsz` 12-96, `wdth` 75-100, `wght` 200-800, subset `latin`). Licencia SIL OFL. Se carga solo en `app/(landing)/layout.tsx`, un único archivo variable, subset `latin`, con los ejes `wght` + `opsz` (el eje de tamaño óptico es lo que le da carácter en tamaños grandes: contraformas apretadas, terminaciones con "mordida"). Pesos usados: 800 en h1 y logotipo, 700 en h2, 600 en h3 y números de paso. Se usa SOLO en títulos, logotipo y números grandes: es una grotesca con aire de cartel de bodegón, cálida y un poco irregular, que se aleja del look genérico "SaaS".
- **Texto: Geist** (ya cargada en el layout raíz). Cuerpo, botones, UI de los mockups. **Geist Mono** (misma familia, ya cargada) solo para datos tipo comanda: hora, número de mesa, montos ficticios de la carta.
- Escala (fluida con `clamp`): h1 2.25rem -> 4.75rem, peso 800, interlineado 0.98, tracking -0.03em. h2 2rem -> 3.5rem, peso 700. h3 1.25rem -> 1.5rem. Cuerpo 1.0625rem / 1.6. Pequeño 0.875rem. Etiquetas (eyebrow) 0.8125rem en mayúsculas con tracking +0.08em.
- Contraste de tamaño marcado: el h1 mide 4-5 veces el cuerpo en escritorio.

## 4. Logotipo

- **Isotipo**: una hamburguesa geométrica de cinco piezas dentro de un cuadrado redondeado rojo tomate: cúpula de pan (semicírculo amarillo con tres semillas), una línea verde ondulada (lechuga), una barra amarilla (cheddar), una barra marrón (carne) y la base del pan. Leída de lejos, la cúpula es también un sol asomando sobre el horizonte: el "Sky". Diseñado para leerse a 16 px (favicon): a ese tamaño quedan cúpula + 3 barras.
- **Logotipo**: "Menu" en carne `#2B1710` + "Sky" en tomate `#D7261E`, Bricolage Grotesque 800, tracking -0.04em, junto al isotipo. Diseño propio, sin recursos de terceros.
- Archivos: `components/landing/brand/Logo.tsx` (SVG inline), `app/icon.svg`, `app/apple-icon.png` (180x180), `app/favicon.ico` (16/32/48), `app/opengraph-image.png` y `app/twitter-image.png` (1200x630, generadas con sharp desde SVG; el texto se convierte a trazos para no depender de fuentes del sistema).

## 5. Concepto 3D

- **Qué**: hamburguesa completa procedural en three.js (vanilla 0.186.1): pan inferior (torno), carne con relieve (cilindro con ruido en los vértices), cheddar cuadrado que "chorrea" en las puntas (plano deformado), dos rodajas de tomate, lechuga ondulada (anillo con desplazamiento sinusoidal), pan superior (torno) con semillas de sésamo instanciadas (`InstancedMesh`).
- **Estilo**: sombreado *toon* (`MeshToonMaterial` con mapa de gradiente de 3 tonos): se ve ilustrado, coherente con el fallback SVG plano y con la marca. Nada de realismo de plástico ni brillo genérico.
- **Interacción**: arranca desarmada (capas flotando separadas, cada una con su propio balanceo). Con el scroll de la primera pantalla las capas bajan y se arman. En escritorio, la hamburguesa se inclina siguiendo el puntero (escuchado en `window`; el canvas tiene `pointer-events: none`). En móvil: giro lento continuo + armado por scroll; sin giroscopio.
- **Carga**: el servidor pinta una ilustración SVG estática de la hamburguesa desarmada en el mismo lugar (fallback para sin JS, sin WebGL, `prefers-reduced-motion` y `saveData`). Un componente cliente chico (`hero3d/Hero3D.tsx`) espera `load` + **la primera interacción de la persona** (movimiento del puntero, toque, rueda, scroll o teclado; si la página ya está desplazada cuando el script queda listo, cuenta como interacción) + `requestIdleCallback` (con timeout) + que el hero esté cerca de la pantalla. Es igual para todos: no se detectan herramientas ni bots (decisión del Líder: mejora progresiva). En escritorio el 3D aparece con el primer movimiento del mouse y desde ahí sigue al puntero; en móvil, con el primer scroll o toque. Hasta entonces se ve la ilustración estática. Cuando el primer cuadro está listo, el SVG se desvanece y aparece el canvas: misma caja, cero CLS.
- **Dónde corre**: si el navegador tiene `OffscreenCanvas`, la escena corre en un **Web Worker** (`hero3d/burger.worker.ts`): `three` se descarga, evalúa y compila sus shaders fuera del hilo principal, y la página solo le pasa tamaño, puntero, armado por scroll y visibilidad (`hero3d/host.ts`). Así cargar el 3D no genera tareas largas en la página (antes, evaluar `three` en la página era una tarea de ~290 ms). Sin `OffscreenCanvas`, la misma escena (`hero3d/scene.ts`, que no toca el DOM) corre en la página con `import()` dinámico. En ambos casos `three` va en un chunk aparte (~137 KB gzip) que no entra en el JS inicial.
- **Presupuesto**: < 6.000 triángulos, sin texturas externas (solo el gradiente toon de 3 px generado en código), sin sombras en tiempo real (la sombra es un óvalo CSS), DPR <= 1.5 en móvil y <= 2 en escritorio, antialias solo en escritorio. Render solo con el canvas visible y la pestaña activa. Si el promedio de cuadro supera ~33 ms baja el DPR a 1; si sigue sin sostenerse, vuelve al fallback estático. `dispose()` de geometrías, materiales, textura y renderer al desmontar.
- **Accesibilidad**: canvas `aria-hidden="true"`, sin foco. Todo lo que "dice" el 3D está en texto.

## 6. Sistema de movimiento

Tokens (en `app/(landing)/landing.css`):

| Token | Valor | Uso |
|---|---|---|
| `--ms-dur-fast` | 160 ms | hover/press de botones y links |
| `--ms-dur` | 280 ms | cambios de estado en mockups, menú |
| `--ms-dur-reveal` | 560 ms | entrada de secciones |
| `--ms-ease-out` | `cubic-bezier(.2,.8,.2,1)` | entradas, desplazamientos |
| `--ms-ease-pop` | `cubic-bezier(.34,1.56,.64,1)` | "pop" chico (sello de mesa, punto de nuevo pedido) |

Principios:
- Solo `transform` y `opacity`.
- **Entradas por sección** (CA-8.7): un único observador (`Reveal`) marca como "ocultos" solo los bloques que están debajo de la pantalla al cargar y los revela una vez (subida de 24 px + fundido, 560 ms, escalonado 80 ms entre hijos). Sin JS, todo está visible.
- **CTAs** (CA-8.8): hover sube 2 px y la sombra dura (offset sólido marrón, estilo sello) se agranda; press baja 1 px y la sombra se achica; foco: anillo de 3 px. Todo <= 160 ms.
- **Secuencia del pedido** (CA-4.2): máquina de estados en "Así de simple": el celular envía, un ticket viaja a la cocina, aparece la tarjeta de "Mesa 4", y el seguimiento pasa por Recibido -> En preparación -> Listo -> Entregado. Ciclo de ~13 s, se pausa fuera de pantalla y tiene botón "Pausar animación".
- **Mockups de funciones**: bucles CSS cortos (pestañas de categorías que cambian, línea de escaneo sobre el QR, campana que suena y aparece el llamado en el panel). Se pausan fuera de pantalla.
- **`prefers-reduced-motion: reduce`**: sin 3D (queda el SVG), sin entradas, sin bucles, sin reacción al puntero, `scroll-behavior: auto`. La secuencia del pedido queda en un estado fijo legible.

## 7. Fotos

Solo las 6 de `docs/CREDITS.md`, convertidas a WebP en `public/landing/` con `scripts/optimize-landing-images.mjs`. Uso: miniaturas de platos dentro de los mockups de la carta (recortes cuadrados), foto del plato en el detalle con opciones y extras, y la foto de la terraza (`ambiente-1`, recortada a horizontal) como fondo del bloque de salón. Ninguna se presenta como plato de un cliente.

## 8. Wireframe por breakpoint

Breakpoints: móvil < 640 px (diseño base), tablet 640-1023 px, escritorio >= 1024 px. Contenedor máximo 1200 px. Cada sección tiene `overflow-x: clip`.

```
1. HEADER (sticky)
   móvil:   [isotipo+MenuSky]            [Pedí una demo] [Menú v]
            (el menú desplegable trae: Funciones / Cómo funciona / Preguntas / Ingresar)
   >=1024:  [isotipo+MenuSky]  Funciones  Cómo funciona  Preguntas    Ingresar  [Pedí una demo]

2. HERO (#inicio)  fondo crema con "cielo" de puntos de comanda muy sutil
   móvil:   eyebrow / h1 (5 líneas) / subtítulo / [Pedí una demo] [Mirá cómo funciona]
            microcopy + "Escribinos por email"
            ---- (debajo del pliegue) escena: hamburguesa 3D desarmada + celular con la carta
   >=1024:  | eyebrow, h1 gigante, subtítulo, CTAs, email |  hamburguesa 3D (arriba-der.)  |
            |  (7 columnas)                               |  celular con carta (abajo-izq.,|
            |                                             |  rotado -4°, se superpone)     |

3. BENEFICIO (#beneficios)  sección oscura (carne), texto crema, acentos cheddar
   móvil:   h2 / 3 ideas en filas separadas por línea punteada de comanda
   >=1024:  h2 grande a la izquierda (5 col.) | 3 filas numeradas a la derecha (7 col.)

4. CÓMO FUNCIONA (#como-funciona)  "Así de simple"
   móvil:   h2 / pasos 1-2-3 / escenario: celular arriba, cocina abajo (el ticket viaja vertical)
   >=1024:  pasos a la izquierda (se resalta el paso activo de la secuencia)
            escenario a la derecha: celular | ticket volando -> | panel de cocina

5. FUNCIONES (#funciones)  bento asimétrico, NO grilla de 3 iguales
   móvil:   1 columna: Carta digital (alto) / Pedidos por QR / Llamado al mozo / Pedir la cuenta
   >=768:   2 columnas: Carta (alta, ocupa 2 filas) | QR
                                                    | Mozo
            Pedir la cuenta: ancho completo, fondo rojo (celular + panel del salón)

6. PARA TU EQUIPO (#equipo)  fondo cheddar, texto carne
   móvil:   h2 / Cocina (tablero) / Salón (mesas sobre foto de terraza) / Administración
   >=1024:  Cocina ancho completo arriba; abajo Salón (7 col.) | Administración (5 col.)

7. A TU MEDIDA (#a-tu-medida)
   móvil:   h2 / detalle de plato con opciones y extras / seguimiento / 7 temas
   >=1024:  detalle de plato (izq., grande) | seguimiento + temas apilados (der.)

8. PREGUNTAS (#preguntas)   <details>/<summary>, columna angosta (68 ch)
   >=1024:  h2 a la izquierda (sticky) | preguntas a la derecha

9. CTA FINAL (#demo)  bloque tomate de ancho completo, h2 crema, CTA cheddar + email

10. PIE  fondo carne: logotipo, contacto (WhatsApp, email), Ingresar,
         "¿Sos cliente? Escaneá el QR de tu mesa", © MenuSky
```

## 9. Referencias y qué se tomó

- Linear (linear.app): la UI del producto como protagonista; por eso los mockups son grandes y animados, no ilustraciones abstractas.
- Stripe (stripe.com): fondo vivo con imagen estática de reemplazo; nuestro equivalente es el 3D con fallback SVG.
- Comandas y pizarras de bodegón argentino (referencia cultural, no un sitio): borde dentado, monoespaciada, sellos. Es lo que evita el look de plantilla.

## 10. Justificación

- El dueño de restaurante reconoce en un segundo la hamburguesa, los colores y la comanda: el mensaje "esto es para mi local" llega antes de leer.
- El 3D cuenta la idea del producto (todo se junta en un solo lugar) en lugar de ser decorado, y su fallback mantiene la composición si no carga.
- La paleta cálida y la tipografía con carácter separan a MenuSky de la estética azul/violeta típica del software.
