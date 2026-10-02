# Mascota de MenuSky: 3 propuestas (etapa de propuesta)

Autor: Frontend. Fecha: 2026-10-02. Estado: **para elegir por el Director** (CA-3.1). Spec: `docs/specs/login.md`, HU-3 y HU-10.
Ninguna tiene nombre visible en pantalla (P-13). El texto de la gorra, "Yo ♥ MenuSky", es provisorio (pregunta abierta 2).

## Archivos

| Propuesta | SVG | PNG (para revisión y búsqueda inversa) | Silueta (prueba CA-3.4.2) | Componente del borrador |
|---|---|---|---|---|
| 1 "Brioche" | `propuesta-1.svg` | `propuesta-1.png` | `propuesta-1-silueta.png` | `components/brand/mascot/MascotBrioche.tsx` |
| 2 "Pollito" | `propuesta-2.svg` | `propuesta-2.png` | `propuesta-2-silueta.png` | `components/brand/mascot/MascotPollito.tsx` |
| 3 "Pomo" | `propuesta-3.svg` | `propuesta-3.png` | `propuesta-3-silueta.png` | `components/brand/mascot/MascotPomo.tsx` |

Los nombres entre comillas son de trabajo, no nombres de la mascota (pregunta abierta 3).

Las tres salen de un mismo archivo, `generar-mascotas.mjs` (`node docs/design/mascota/generar-mascotas.mjs`), que escribe los SVG y los componentes TSX. Así el SVG revisado y el que se ve en `/login` son el mismo dibujo. Los PNG se exportaron con Chrome headless desde los SVG (no son fuente: solo sirven para revisar).

Verlas en contexto: `/login?mascota=1`, `/login?mascota=2`, `/login?mascota=3` (selector de vista previa del borrador).

## Elementos comunes (pedido del Director)

- Personaje cartoon amarillo (`--ms-cheddar` #FFC21A), contorno grueso color carne (`--ms-patty` #2B1710, 5 unidades sobre un viewBox de 200 x 240: unos 2,5 px a 120 px de alto y unos 9 px a 440 px).
- Gorra roja (`--ms-tomato`, visera `--ms-ketchup`) con "Yo ♥ MenuSky". Las letras están **dibujadas como trazos**, letra por letra (no hay `<text>` ni fuentes); el corazón es un path relleno cheddar. La visera apunta a la derecha, hacia el formulario.
- Delantal oscuro (`--ms-patty`) con el **isotipo de MenuSky** (los mismos trazos de `Isotype` en `components/landing/brand/Logo.tsx`).
- Hamburguesa con pan tostado (`--ms-toasted`), cheddar, lechuga (`--ms-lettuce`), carne (`--ms-patty`) y semillas mostaza.
- Pose y mirada hacia la derecha (el formulario en escritorio).
- Excepción de color a confirmar por el Líder: el verde de la lechuga **dentro del isotipo** es `#7CCB4E`, porque así está en `Logo.tsx` (ese verde no figura en la tabla de tokens). Si se prefiere, se cambia por `--ms-lettuce` en el generador.

## Propuesta 1: "Brioche", el pan de la casa

- Concepto: el pan de arriba de la hamburguesa hecho personaje. La cúpula del isotipo (que también es el sol del "Sky") se vuelve un bollo redondo, con semillas de sésamo en los costados. Es la que más se ata a la marca: el logo es una hamburguesa y este es su pan.
- Personalidad: bonachón, servicial, "el que te recibe en la puerta de la cocina". Sostiene la hamburguesa con las dos manos frente al delantal, como quien la ofrece.
- Rasgos: cuerpo ancho y redondo (más ancho que alto en la parte media), ojos de grano ovalados oscuros sin blanco con un punto de brillo, mejillas tomate, boca abierta en D, pies mostaza ovalados.
- Paleta: cheddar, patty, tomato, ketchup, mustard, toasted, lettuce, bun, paper.
- Animación liviana (solo `transform`/`opacity`, en `app/login/login.css`):
  - Ocioso: rebote blando (aplastar y estirar) sobre la raíz `<svg>`, 3,4 s, 3 repeticiones, arranca a los 1,6 s y se pausa si algo del login tiene foco.
  - "Entrando...": se inclina hacia el formulario (traslado 4 % + giro 4°, 280 ms).
  - Error: sacude una vez (460 ms) y cambia la boca por una línea ondulada de "uy" (cambio de `opacity`).

## Propuesta 2: "Pollito", el pollito cocinero

- Concepto: un pollito con gorra y delantal que se escapó de la cocina con su hamburguesa. Es la más tierna y la más "cartoon".
- Personalidad: entusiasta y un poco atolondrado; está comiendo (la hamburguesa ya tiene un mordisco).
- Rasgos: cuerpo en forma de pera (cabeza y cuerpo de una pieza), **ojos cerrados de felicidad** (dos arcos), pico mostaza abierto, copete de tres plumas que asoma por detrás de la gorra, cola de tres plumas en punta, ala que sostiene la hamburguesa mordida, patas mostaza.
- Paleta: cheddar, mustard, patty, tomato, ketchup, toasted, lettuce, bun, paper.
- Animación liviana:
  - Ocioso: cabeceo hacia la hamburguesa (giro de 4° desde los pies), 3,4 s, 3 repeticiones.
  - "Entrando...": misma inclinación hacia el formulario.
  - Error: sacude una vez; se apagan las mejillas y aparece una gota de sudor.

## Propuesta 3: "Pomo", el pomo de mostaza

- Concepto: un frasco de mostaza aplastable. **El delantal es la etiqueta del frasco** (con el isotipo) y el pico del frasco asoma por arriba de la gorra. Es la más gráfica y la más fácil de reconocer a 120 px.
- Personalidad: canchero y rápido, el que "le pone onda" al servicio. Muestra la hamburguesa con el brazo extendido hacia el formulario y la otra mano en la cintura.
- Rasgos: cuerpo de frasco (rectángulo con hombros redondeados, más alto que ancho pero rígido, sin cuello ni estiramiento), ojos rectangulares oscuros con párpado recto, sonrisa amplia en D, brillo de plástico (trazo crema vertical), zapatos mostaza.
- Paleta: cheddar, mustard, patty, tomato, ketchup, toasted, lettuce, bun, paper.
- Animación liviana:
  - Ocioso: saltito con apretón al caer (traslado y escala), 3,4 s, 3 repeticiones.
  - "Entrando...": misma inclinación hacia el formulario.
  - Error: sacude una vez y la sonrisa pasa a boca de "uy".

## Mediciones (CA-3.5: <= 12 KB, <= 4 KB gzip, <= 120 elementos, sin filtros)

Comando (Git Bash, en `docs/design/mascota/`):

```
for i in 1 2 3; do f=propuesta-$i.svg; echo "$f bytes=$(wc -c <$f) gzip=$(gzip -9c $f | wc -c) elements=$(grep -o '<[a-zA-Z]' $f | wc -l) forbidden=$(grep -c -i -E '<image|href|url\(|<text|<script|foreignObject|filter|blur' $f)"; done
```

Salida (2026-10-02):

```
propuesta-1.svg bytes=3757 gzip=1327 elements=44 forbidden=0
propuesta-2.svg bytes=3617 gzip=1414 elements=39 forbidden=0
propuesta-3.svg bytes=3648 gzip=1298 elements=41 forbidden=0
```

- `elements` cuenta todas las etiquetas de apertura, incluida la raíz `<svg>` y los `<g>`.
- `forbidden` = 0: sin `<image>`, sin `href`, sin `url()`, sin `<text>`, sin `<script>`, sin `<foreignObject>`, sin filtros ni blur (CA-3.2, CA-5.2).
- Las tres quedan muy por debajo del presupuesto (~31 % del peso y ~37 % de los elementos permitidos).
- En `/login` la mascota es un Server Component: su SVG viaja en el HTML (y en el payload RSC), no en el JS del cliente.

## Fichas de originalidad (CA-3.4)

Constancia del Frontend (punto 4, vale para las tres): las tres mascotas se dibujaron escribiendo a mano las coordenadas de cada forma en `generar-mascotas.mjs`. No se calcó, vectorizó ni usó como base ninguna imagen (ni la referencia del Director ni otra de terceros), y no se usó ningún generador de imágenes. Las letras de la gorra se diseñaron como trazos propios. Firmado: Frontend, 2026-10-02.

Lo que **no puedo hacer yo** y queda pendiente para el Líder/Director (no se marca "sí" sin evidencia):
- Punto 2, prueba de silueta con 3 revisores: las siluetas en negro están en `propuesta-N-silueta.png`; falta que 3 personas las comparen con imágenes del personaje de referencia.
- Punto 5, búsqueda inversa (Google Lens o TinEye) sobre `propuesta-N.png`: no tengo acceso a esos servicios desde este entorno. Falta adjuntar el resultado.

### Ficha propuesta 1 "Brioche"

| # | Verificación | Resultado | Por qué |
|---|---|---|---|
| 1 | No es perro ni silueta de perro amarillo | Sí | Es un pan: cuerpo de cúpula ancha y redonda, sin hocico, sin orejas, sin patas largas; el cuerpo es rígido (no "goma" ni estirable). |
| 2 | Ojos, nariz, boca y proporciones no se parecen a Jake ni a otro personaje | Sí (a confirmar con la prueba de 3 revisores) | Ojos de grano ovalados **oscuros y sin blanco** (lo opuesto a ojos redondos blancos con pupila chica); no tiene nariz ni mandíbula marcada; boca en D chica; proporción ancha y baja. |
| 3 | No se parece a mascotas gastronómicas o de dibujos | Sí (a confirmar) | No es un payaso, ni un rey, ni una nena pelirroja, ni un guepardo, ni una abeja. No es una esponja ni un rectángulo con agujeros (Bob Esponja): es un óvalo liso con semillas. No es un círculo con boca en cuña (Pac-Man). |
| 4 | Sin calco ni generador | Sí | Ver constancia. |
| 5 | Búsqueda inversa sin coincidencias | **Pendiente** | Hacerla con `propuesta-1.png`. |
| 6 | Solo los elementos pedidos | Sí | Gorra roja, delantal oscuro con isotipo, hamburguesa. Las semillas de sésamo salen del propio isotipo de MenuSky. |

### Ficha propuesta 2 "Pollito"

| # | Verificación | Resultado | Por qué |
|---|---|---|---|
| 1 | No es perro ni silueta de perro amarillo | Sí | Es un ave: pico, copete y cola de plumas; cuerpo en pera de una sola pieza, compacto. |
| 2 | No se parece a Jake ni a otro personaje | Sí (a confirmar) | Ojos **cerrados en arco** (no hay ojos abiertos), pico en vez de hocico. Se evitó a propósito la fórmula de Piolín/Tweety (cabeza enorme, ojos grandes celestes abiertos, cuerpo diminuto): acá la cabeza y el cuerpo son una sola masa y los ojos están cerrados. No es "Pollito Pío" ni el pollo de Los Pollos Hermanos (no hay pollo con bigote ni logo circular). |
| 3 | No se parece a mascotas gastronómicas o de dibujos | Sí (a confirmar) | No es la abeja de Jollibee ni un gallo de marca de cereales; no lleva sombrero de chef ni pañuelo, sino la gorra pedida. |
| 4 | Sin calco ni generador | Sí | Ver constancia. |
| 5 | Búsqueda inversa sin coincidencias | **Pendiente** | Hacerla con `propuesta-2.png`. Es la propuesta con más riesgo de parecido genérico, porque "pollito amarillo" es un motivo muy usado. |
| 6 | Solo los elementos pedidos | Sí | Gorra, delantal con isotipo, hamburguesa (mordida). |

### Ficha propuesta 3 "Pomo"

| # | Verificación | Resultado | Por qué |
|---|---|---|---|
| 1 | No es perro ni silueta de perro amarillo | Sí | Es un objeto (frasco de mostaza), con silueta de rectángulo rígido; no tiene hocico, orejas ni cuerpo elástico. |
| 2 | No se parece a Jake ni a otro personaje | Sí (a confirmar) | Ojos rectangulares oscuros con párpado recto, sin blanco; boca en D. El cuerpo es alto pero rígido y corto (no se estira ni se alarga como goma). |
| 3 | No se parece a mascotas gastronómicas o de dibujos | Sí (a confirmar) | No conozco una mascota con derechos que sea un pomo de mostaza con gorra; igual el revisor debería buscar "mustard bottle mascot" y las mascotas de marcas de aderezos. No es un M&M ni un personaje de golosina (no es redondo ni de chocolate). |
| 4 | Sin calco ni generador | Sí | Ver constancia. |
| 5 | Búsqueda inversa sin coincidencias | **Pendiente** | Hacerla con `propuesta-3.png`. |
| 6 | Solo los elementos pedidos | Sí | Gorra, delantal (que es la etiqueta) con isotipo, hamburguesa. El pico del frasco es parte del objeto, no un rasgo copiado. |

## Recomendación del Frontend

**Propuesta 1, "Brioche"**, por tres motivos:
1. Es la que más cuenta MenuSky: el isotipo es una hamburguesa cuya cúpula es a la vez pan y sol, y Brioche es ese pan. Logo y mascota dicen lo mismo.
2. Es la de menor riesgo de parecido: un pan redondo con semillas no se acerca a ninguna silueta conocida, y sus ojos (oscuros, sin blanco) están en el extremo opuesto de los de la referencia. El pollito, en cambio, es un motivo muy transitado.
3. Su animación ociosa (rebote blando) se lee bien aun en chico y es la más barata de percibir como "viva" sin mover partes internas.

Segunda opción: **Pomo** (la silueta más reconocible a 120 px y la idea más graciosa: el delantal es la etiqueta). Si el Director prefiere algo más tierno, Pollito.

## Lo que falta después de la elección

- Borrar las dos propuestas no elegidas del generador y de `components/brand/mascot/`, y el selector `?mascota=` de `app/login/page.tsx` (marcado `BORRADOR`).
- Texto final de la gorra (pregunta 2) y nombre (pregunta 3).
- Pruebas de originalidad pendientes (puntos 2 y 5) con evidencia adjunta.
- Línea en `docs/CREDITS.md` (CA-3.11, la agrega el Líder).
