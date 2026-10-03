# Mascota de MenuSky: "Pomo" (elegida) e historial de propuestas

Autor: Frontend. Fecha: 2026-10-02. Estado: **elegida la propuesta 3, "Pomo"** (Director, `docs/ESTADO-LOGIN.md`, "Respuestas del Director", punto 1). Spec: `docs/specs/login.md` v1.1, HU-3 y HU-10.
Sin nombre visible en pantalla (CA-3.13). Texto de la gorra: "Yo ♥ MenuSky" (default del equipo, el Director puede cambiarlo), dibujado como trazos.

## En la app (desde la v1.1)

- Componente: `components/brand/mascot/MascotPomo.tsx` (exportado como `Mascot` desde `components/brand/mascot/index.tsx`). Solo se usa en `app/login/page.tsx` (CA-3.8). Server Component: el SVG viaja en el HTML, no en el JS.
- Brioche y Pollito se quitaron del código y `?mascota=` ya no existe (CA-3.12). Sus SVG/PNG/siluetas quedan abajo como historial.
- `MascotPomo.tsx` **se mantiene a mano**: parte del dibujo de `propuesta-3.svg`, separado en capas animables. `generar-mascotas.mjs` quedó como histórico: solo reescribe los SVG de las tres propuestas y **ya no escribe componentes** (no puede recrear los borrados).

### Cómo se anima (HU-10)

Técnica: solo CSS sobre `transform`/`opacity` (`app/login/login.css`); React solo cambia tres atributos de `.lg-mascot`: `data-mood` (idle, loading, error-a/error-b, success), `data-look` (none, email, pass, btn) y `data-face` (ok, oops, yay). Sin `requestAnimationFrame`, `setInterval` ni `setTimeout` de animación.

Por qué capas: Chrome solo compone en la GPU las animaciones de cajas CSS; un `<g>` animado dentro de un SVG obliga a repintar el SVG (R-13). Por eso lo que se MUEVE es una caja propia:

| Capa | Qué tiene | Qué hace |
|---|---|---|
| `.lg-mascot` (div) | toda la mascota | reacciones: inclinación "Entrando..." (280 ms), sacudida de error (460 ms, una vez por error), salto de éxito (380 ms) |
| `.m-base` (svg) | pies, cuerpo y etiqueta (`.m-body`), brazos (`.m-arm-hip`, `.m-arm-up`, `.m-arm`), bocas (`.m-ok`, `.m-oops`, `.m-yay`), hamburguesa, gorra (`.m-cap`) | no se mueve; las poses cambian por `opacity` sin transición |
| `.m-look` (div, solo el recuadro de los ojos: x 70-130, y 102-126) | ojos | mirada hacia el campo con foco (transición de 180 ms) |
| `.m-eyes` (svg recortado, `viewBox="70 102 60 24"`) | ojos abiertos (`.m-eyes-open`) y felices (`.m-eyes-yay`) | parpadeo (idle) |

Estados (prioridad: éxito > "Entrando..." > error > mirada > idle):

| Estado | Qué hace Pomo |
|---|---|
| Idle (sin foco ni envío) | parpadeo de 176 ms cada 5,5 s, 16 veces (de 1,2 s a ~89 s desde la carga) y se detiene solo. Se pausa (no se reinicia) con foco o con una reacción; los ojos quedan abiertos. |
| Foco en Email / Contraseña o "Mostrar contraseña" / "Entrar" | mira hacia ese elemento: en dos paneles a la derecha (y arriba, al medio o abajo); en una columna hacia abajo (izquierda, centro o derecha). Cuatro poses distintas (verificado por captura). |
| "Entrando..." | se inclina hacia el formulario (traslado 4 % + giro 4°, 280 ms) y mira el botón. Sin bucle. |
| Error (credenciales o red) | sacude una vez (460 ms) y queda con boca de "uy" hasta el próximo envío o hasta enfocar un campo. |
| Éxito | salto de 380 ms, brazo en alto, ojos felices y boca abierta. Se fija en el mismo render que `router.push` (sin espera artificial). |
| `prefers-reduced-motion: reduce` | cero animaciones y transiciones; las poses (mirada, inclinación, caras, brazo en alto) cambian de golpe. |

### Recortes (orden de CA-10.11) y mediciones

Medido en la PC del Director (Intel Celeron N4020, 2 núcleos, Intel UHD 600), Chrome 154 headless con GPU, build de producción (`next start -p 3200`), `/login` a 1440 x 900, 3 s después de cargar, sin foco. CPU en % de un núcleo, por `SystemInfo.getProcessInfo` (CDP); ventanas de 30 s salvo indicación.

| Variante del idle | Renderer | GPU | Resultado |
|---|---|---|---|
| Sin animación (equivale a reduced-motion) | 0,15 | 0,03 | referencia |
| Respiración (escala de toda la mascota, 4,5 s) + parpadeo | 4,45 | 11,4 | no cumple: **respiración quitada** |
| Parpadeo + "ojeada" periódica al formulario | 2,4 | 2,7-3,2 | no cumple: **ojeada quitada** |
| Parpadeo cada 7 s (en vez de 5,5 s) | 1,96-2,08 | 1,79-1,87 | igual que 5,5 s: alargar el período no baja el costo |
| **Parpadeo cada 5,5 s (final)** | 1,97-2,02 | 1,85-2,16 | cumple (ver nota) |

Nota: el costo del parpadeo (~2 puntos) es el piso de tener cualquier animación viva: el compositor produce cuadros mientras la animación corre aunque esté en la pausa entre parpadeos (traza: ~1250 eventos de cuadro en 10 s con el idle vivo, ~50 con foco). Diferencia contra reduced-motion en 3 pares alternados: renderer +1,82 a +1,87, GPU +1,81 a +2,12 (umbral <= 2): **queda al límite**. Si el Líder no acepta ese margen, el siguiente recorte es "idle solo en reacciones" (quitar el parpadeo: costo ~0).

Resto de CA-10.11 (traza de 10 s en reposo, CPU 1x y 4x): 0 Layout, 0 Paint, 0 `FireAnimationFrame`, 0 `TimerFire`, 0 tareas largas, ninguna animación con "compositeFailed"; `ScriptDuration` 0,3-0,7 ms en 10 s. Con CPU 4x el % de CPU del renderer no sirve (la emulación de throttling inflaba también la página estática: ~55 %).

### Peso (CA-3.5), medido sobre el HTML renderizado

`.lg-mascot .m` (las dos capas): 4671 bytes, 1500 bytes gzip, 54 elementos SVG (56 contando los dos `div`), sin `<image>`, `href`, `url()`, `<text>`, `<script>`, `foreignObject`, filtros ni blur.

## Historial: las 3 propuestas (etapa de propuesta)

### Archivos

| Propuesta | SVG | PNG (para revisión y búsqueda inversa) | Silueta (prueba CA-3.4.2) | Componente del borrador (borrado en v1.1, salvo Pomo) |
|---|---|---|---|---|
| 1 "Brioche" | `propuesta-1.svg` | `propuesta-1.png` | `propuesta-1-silueta.png` | `components/brand/mascot/MascotBrioche.tsx` |
| 2 "Pollito" | `propuesta-2.svg` | `propuesta-2.png` | `propuesta-2-silueta.png` | `components/brand/mascot/MascotPollito.tsx` |
| 3 "Pomo" | `propuesta-3.svg` | `propuesta-3.png` | `propuesta-3-silueta.png` | `components/brand/mascot/MascotPomo.tsx` |

Los nombres entre comillas son de trabajo, no nombres de la mascota (pregunta abierta 3).

Las tres salen de un mismo archivo, `generar-mascotas.mjs` (`node docs/design/mascota/generar-mascotas.mjs`), que en la etapa de propuesta escribía los SVG y los componentes TSX (desde la v1.1 solo los SVG). Así el SVG revisado y el que se ve en `/login` son el mismo dibujo. Los PNG se exportaron con Chrome headless desde los SVG (no son fuente: solo sirven para revisar).

(Hasta la elección había un selector `/login?mascota=1|2|3`; se quitó en la v1.1.)

### Elementos comunes (pedido del Director)

- Personaje cartoon amarillo (`--ms-cheddar` #FFC21A), contorno grueso color carne (`--ms-patty` #2B1710, 5 unidades sobre un viewBox de 200 x 240: unos 2,5 px a 120 px de alto y unos 9 px a 440 px).
- Gorra roja (`--ms-tomato`, visera `--ms-ketchup`) con "Yo ♥ MenuSky". Las letras están **dibujadas como trazos**, letra por letra (no hay `<text>` ni fuentes); el corazón es un path relleno cheddar. La visera apunta a la derecha, hacia el formulario.
- Delantal oscuro (`--ms-patty`) con el **isotipo de MenuSky** (los mismos trazos de `Isotype` en `components/landing/brand/Logo.tsx`).
- Hamburguesa con pan tostado (`--ms-toasted`), cheddar, lechuga (`--ms-lettuce`), carne (`--ms-patty`) y semillas mostaza.
- Pose y mirada hacia la derecha (el formulario en escritorio).
- Excepción de color a confirmar por el Líder: el verde de la lechuga **dentro del isotipo** es `#7CCB4E`, porque así está en `Logo.tsx` (ese verde no figura en la tabla de tokens). Si se prefiere, se cambia por `--ms-lettuce` en el generador.

### Propuesta 1: "Brioche", el pan de la casa

- Concepto: el pan de arriba de la hamburguesa hecho personaje. La cúpula del isotipo (que también es el sol del "Sky") se vuelve un bollo redondo, con semillas de sésamo en los costados. Es la que más se ata a la marca: el logo es una hamburguesa y este es su pan.
- Personalidad: bonachón, servicial, "el que te recibe en la puerta de la cocina". Sostiene la hamburguesa con las dos manos frente al delantal, como quien la ofrece.
- Rasgos: cuerpo ancho y redondo (más ancho que alto en la parte media), ojos de grano ovalados oscuros sin blanco con un punto de brillo, mejillas tomate, boca abierta en D, pies mostaza ovalados.
- Paleta: cheddar, patty, tomato, ketchup, mustard, toasted, lettuce, bun, paper.
- Animación liviana (solo `transform`/`opacity`, en `app/login/login.css`):
  - Ocioso: rebote blando (aplastar y estirar) sobre la raíz `<svg>`, 3,4 s, 3 repeticiones, arranca a los 1,6 s y se pausa si algo del login tiene foco.
  - "Entrando...": se inclina hacia el formulario (traslado 4 % + giro 4°, 280 ms).
  - Error: sacude una vez (460 ms) y cambia la boca por una línea ondulada de "uy" (cambio de `opacity`).

### Propuesta 2: "Pollito", el pollito cocinero

- Concepto: un pollito con gorra y delantal que se escapó de la cocina con su hamburguesa. Es la más tierna y la más "cartoon".
- Personalidad: entusiasta y un poco atolondrado; está comiendo (la hamburguesa ya tiene un mordisco).
- Rasgos: cuerpo en forma de pera (cabeza y cuerpo de una pieza), **ojos cerrados de felicidad** (dos arcos), pico mostaza abierto, copete de tres plumas que asoma por detrás de la gorra, cola de tres plumas en punta, ala que sostiene la hamburguesa mordida, patas mostaza.
- Paleta: cheddar, mustard, patty, tomato, ketchup, toasted, lettuce, bun, paper.
- Animación liviana:
  - Ocioso: cabeceo hacia la hamburguesa (giro de 4° desde los pies), 3,4 s, 3 repeticiones.
  - "Entrando...": misma inclinación hacia el formulario.
  - Error: sacude una vez; se apagan las mejillas y aparece una gota de sudor.

### Propuesta 3: "Pomo", el pomo de mostaza

- Concepto: un frasco de mostaza aplastable. **El delantal es la etiqueta del frasco** (con el isotipo) y el pico del frasco asoma por arriba de la gorra. Es la más gráfica y la más fácil de reconocer a 120 px.
- Personalidad: canchero y rápido, el que "le pone onda" al servicio. Muestra la hamburguesa con el brazo extendido hacia el formulario y la otra mano en la cintura.
- Rasgos: cuerpo de frasco (rectángulo con hombros redondeados, más alto que ancho pero rígido, sin cuello ni estiramiento), ojos rectangulares oscuros con párpado recto, sonrisa amplia en D, brillo de plástico (trazo crema vertical), zapatos mostaza.
- Paleta: cheddar, mustard, patty, tomato, ketchup, toasted, lettuce, bun, paper.
- Animación liviana:
  - Ocioso: saltito con apretón al caer (traslado y escala), 3,4 s, 3 repeticiones.
  - "Entrando...": misma inclinación hacia el formulario.
  - Error: sacude una vez y la sonrisa pasa a boca de "uy".

### Mediciones (CA-3.5: <= 12 KB, <= 4 KB gzip, <= 120 elementos, sin filtros)

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

### Fichas de originalidad (CA-3.4)

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

### Recomendación del Frontend

**Propuesta 1, "Brioche"**, por tres motivos:
1. Es la que más cuenta MenuSky: el isotipo es una hamburguesa cuya cúpula es a la vez pan y sol, y Brioche es ese pan. Logo y mascota dicen lo mismo.
2. Es la de menor riesgo de parecido: un pan redondo con semillas no se acerca a ninguna silueta conocida, y sus ojos (oscuros, sin blanco) están en el extremo opuesto de los de la referencia. El pollito, en cambio, es un motivo muy transitado.
3. Su animación ociosa (rebote blando) se lee bien aun en chico y es la más barata de percibir como "viva" sin mover partes internas.

Segunda opción: **Pomo** (la silueta más reconocible a 120 px y la idea más graciosa: el delantal es la etiqueta). Si el Director prefiere algo más tierno, Pollito.

### Estado después de la elección (2026-10-02, v1.1)

- Hecho: Brioche y Pollito fuera de `components/brand/mascot/`, selector `?mascota=` quitado, generador limitado a los SVG (CA-3.12).
- Hecho: gorra "Yo ♥ MenuSky" (default del equipo) y sin nombre visible (CA-3.13).
- Hecho: línea en `docs/CREDITS.md` (CA-3.11).
- **Pendiente (bloquea el release):** pruebas de originalidad de Pomo, puntos 2 (silueta con 3 personas, `propuesta-3-silueta.png`) y 5 (búsqueda inversa sobre `propuesta-3.png`). Las asigna el Líder al Director (decisión (d) de la spec v1.1). Las capas animadas no cambian el dibujo: los PNG siguen representando a Pomo (la cara de éxito y el brazo en alto son poses nuevas del mismo personaje).
