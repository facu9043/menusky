# Créditos de imágenes y recursos de terceros

Mantenido por el Product Owner. Fecha de verificación: 2026-09-30.

La atribución NO es obligatoria en ninguna de las licencias usadas. Se registra igual por trazabilidad (quién es el autor, dónde se obtuvo, qué licencia se leyó y cuándo). No hace falta mostrar créditos en la landing.

## Licencias (leídas en la página oficial el 2026-09-30)

- Unsplash License, https://unsplash.com/license: se pueden usar las imágenes gratis, incluso con fines comerciales, sin permiso; la atribución es apreciada pero no necesaria. Restricciones: no se pueden vender sin modificación significativa y no se pueden compilar para replicar un servicio similar o competidor. (La página no trata marcas ni personas identificables.)
- Pexels License, https://www.pexels.com/license/: todas las fotos son gratis de usar; "Attribution is not required". Restricciones: no vender copias sin modificar; personas identificables no pueden aparecer de forma ofensiva; no sugerir aval de personas o marcas; no usar la foto como parte de una marca registrada, nombre comercial o de negocio; no redistribuir en otras plataformas de fotos.
- Uso previsto en MenuSky: ilustrar la landing. Ninguna foto se presenta como foto de un cliente ni como aval; no se usa como parte del logo.

## Fotos aprobadas para uso

Todas las URLs de descarga se probaron el 2026-09-30 y devolvieron un JPEG. Las imágenes se inspeccionaron visualmente (no solo por descripción) para buscar logos y marcas.

| Archivo destino sugerido | Uso sugerido en la landing | Página de origen | Autor | Licencia | URL de descarga directa | Nota de marcas |
|---|---|---|---|---|---|---|
| `public/landing/pizza-1.webp` | Sección de carta digital / mockup de celular (foto de plato) | https://unsplash.com/photos/pizza-with-green-leaves-and-red-sauce-XtLPfib7OuM | amirali mirhashemian (@amir_v_ali) | [Unsplash License](https://unsplash.com/license) | `https://images.unsplash.com/photo-1598023696416-0193a0bcd302?w=1600&q=80&fm=jpg` | Vista: pizza sobre tabla de madera con servilleta; sin logos ni texto. Sin personas. |
| `public/landing/pizza-2.webp` | Fondo/tarjeta de plato en "cómo funciona" o galería | https://unsplash.com/photos/round-cooked-pizza-x00CzBt4Dfk | Aurélien Lemasson-Théobald (@aurel__lens) | [Unsplash License](https://unsplash.com/license) | `https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1600&q=80&fm=jpg` | Vista: pizza napolitana en plato azul y mármol; cortapizza al fondo; sin logos ni texto. Sin personas. |
| `public/landing/burger-1.webp` | Imagen principal del hero / tarjeta de carta (hamburguesa con cheddar, panceta, tomate, pepino) | https://unsplash.com/photos/close-up-photography-of-burger-with-patty-and-slice-cheese-F_xGk7V0Xbc | Erik Odiin (@eodiin) | [Unsplash License](https://unsplash.com/license) | `https://images.unsplash.com/photo-1534790566855-4cb788d389ec?w=1600&q=80&fm=jpg` | Vista: fondo desenfocado con una mancha azul sin texto legible (posible envoltorio, irreconocible). Sin marcas legibles. Sin personas. |
| `public/landing/burger-2.webp` | Tarjeta de plato / sección de pedidos por QR (hamburguesa doble con cheddar) | https://unsplash.com/photos/burger-with-cheese-and-lettuce-BqH1t46q-78 | Nathan Dumlao (@nate_dumlao) | [Unsplash License](https://unsplash.com/license) | `https://images.unsplash.com/photo-1603508102983-99b101395d1a?w=1600&q=80&fm=jpg` | Vista: papel de envolver blanco liso, sin logo. Se ven manos con guantes negros, sin rostro. Imagen muy oscura: recortar o aclarar si el contraste con texto superpuesto es insuficiente. |
| `public/landing/burger-3.webp` | Mockup de celular con carta (hamburguesa con papas) | https://www.pexels.com/photo/fries-and-burger-on-plate-70497/ | Robin Stickel | [Pexels License](https://www.pexels.com/license/) | `https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?w=1600` | Vista: plato con hamburguesa, papas y salsas; sin logos ni envoltorios de marca. Sin personas identificables. |
| `public/landing/ambiente-1.webp` | Sección de salón / "para tu restaurante" (mesa con ambiente) | https://unsplash.com/photos/KsVXWwHwhzo | Doğu Tuncer (@tuncerdogu) | [Unsplash License](https://unsplash.com/license) | `https://images.unsplash.com/photo-1681219916726-036039b9b20d?w=1600&q=80&fm=jpg` | Vista: mesa con platos y copas de vino en terraza; sin logos ni personas. Formato vertical (1600x2400): recortar para uso horizontal. |

Notas para el Frontend:
- Convertir a WebP/AVIF y generar los tamaños necesarios (no servir el original de 1600 px a celulares); usar `next/image`.
- Dimensiones declaradas para evitar CLS; la foto del hero con `priority` solo si es el LCP.
- Las fotos son ilustrativas de la ESTÉTICA; no deben presentarse como platos de un cliente real.

## Foto descartada

| Foto | Motivo |
|---|---|
| https://unsplash.com/photos/cooked-food-on-round-white-ceramic-plate-cC0_UO1Obg4 (Louis Hansel) | El borde del plato tiene impreso un texto de marca ("OLDSCUOLA"). Incumple "nada de marcas de terceros visibles". |

## Otros recursos

- Tipografía: Geist / Geist Mono vía `next/font/google` (ya en la app, licencia SIL OFL; no requiere crédito).
- Logo, isotipo y favicon de MenuSky: diseño propio del Frontend; no hay terceros.
- Mascota de MenuSky: diseño original del equipo, SVG propio ("Pomo", nombre de trabajo; `components/brand/mascot/MascotPomo.tsx`, historial en `docs/design/mascota/`). Sin imágenes, calcos ni generadores de terceros (constancia en `docs/design/mascota/mascota.md`).
- Mockups de la app: UI recreada en código/SVG con datos ficticios genéricos; sin marcas de terceros.

## Limitación de la verificación

La verificación visual la hizo el PO sobre las imágenes descargadas en tamaño 1600 px. Pequeños detalles de fondo pueden escapar; el QA debe hacer una revisión visual final de cada imagen ya recortada antes del release.
