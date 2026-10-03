# Maquetas del admin: Inicio, Apariencia y estados (paso 4a-bis)

SOLO PROPUESTA para que el Director apruebe antes de construir (4b). Ningún archivo de `app/`,
`components/` ni `lib/` cambió por esto. Las maquetas son HTML estático sin JS: enlazan
`app/brand.css` (tokens `--ms-*`), `app/admin/admin.css` (las mismas clases de la Carta) y
`maquetas.css` (solo piezas nuevas `mq-*`). Se abren con doble clic.

| Maqueta | Capturas | Qué muestra | Criterios |
|---|---|---|---|
| `inicio.html` | `inicio-1440x900.png`, `inicio-390x844.png` | Rótulo "Inicio", h1 "Así viene el día", fecha; 4 datos (Pedidos de hoy en tomate, Mesas ocupadas "X de Y", Llamados pendientes, Platos sin stock) con los 3 últimos como enlaces; accesos rápidos (Nuevo plato, Nueva mesa, Imprimir todos los QR, Ir al Salón). | HU-9: CA-9.1, 9.2, 9.5 |
| `apariencia.html` | `apariencia-1440x900.png`, `apariencia-390x844.png` | Rótulo "Apariencia", h1 "Tu carta, a tu estilo", los 8 temas en tarjetas con borde y sombra sello (MenuSky primero, "Predeterminado"; activo con "Activo" + ícono + aro cheddar; "Tema actual" deshabilitado), paleta personalizada (7 colores con muestra, `<label>` y hex), vista previa, Restablecer y Guardar (en celular, barra fija sobre las pestañas). Misma función que hoy. | HU-10: CA-10.1, 10.2, 10.3, 10.5 |
| `estados.html` | `estados-1440x900.png`, `estados-390x844.png` | Inicio sin pedidos, cargando, con un dato que falló y sin poder leer nada; filtro "Sin stock" vacío; error al leer el tema; aviso de contraste y hex inválido; y, como referencia, los estados que ya están construidos (carta vacía, búsqueda, sin mesas, filtro de mesas, error de carta/mesas). | HU-11: CA-11.1, 11.4, 11.5, 11.6; CA-9.6, 9.7; CA-10.6 |

Las vistas previas de los temas, el shell (menú, pestañas) y Pomo NO están redibujados: el generador los
copia del build de producción, así son idénticos a la app. Fuentes: Bricolage Grotesque, Geist y Geist Mono
(subset latin, SIL Open Font License 1.1), los mismos archivos que la app sirve con next/font, embebidos en
`fuentes.css` para que la maqueta se vea bien sin servidor.

Regenerar (con mock y build levantados como en `../evidencia/mesas-4a/README.md`):
`node docs/design/admin/maquetas/generar-maquetas.mjs` (salida en `generar-salida.txt`: sin scroll horizontal
en 1440 y 390, fuentes cargadas).

## Preguntas para el Director
1. Inicio: ¿el título "Así viene el día" (propuesta del PO) va?
2. Fecha: la spec escribe "sábado 3 de octubre"; el formato estándar de es-AR pone coma ("sábado, 3 de octubre"). ¿Cuál?
3. Los datos de Inicio que son enlaces llevan un texto nuevo: "Ver ocupadas", "Ver mesas llamando", "Ver en la carta". ¿Van esos textos? "Pedidos de hoy" no es enlace (la spec no lo pide).
4. Accesos rápidos (propuesta del PO): Nuevo plato (en cheddar, el principal), Nueva mesa, Imprimir todos los QR, Ir al Salón. ¿Van los cuatro?
5. El total vendido del día y la lista de platos sin stock con "Reponer" son "Podría" (CA-9.9) y NO están en la maqueta. ¿Se suman ahora o quedan para después?
6. Carta: el filtro "Sin stock" (al que lleva Inicio) es una píldora nueva que se puede quitar; es un desvío del boceto (spec sección 8). ¿Se aprueba? Su estado vacío dice "No hay platos sin stock." y, según la tabla de la spec, el botón es "Limpiar búsqueda": ¿queda así o "Quitar filtro"?
7. Errores de lectura: Inicio "No pudimos cargar el resumen" (de la spec); Apariencia "No pudimos cargar el tema" (la spec no da el texto). ¿Van así?
8. Inicio con un solo dato que falló: esa tarjeta dice "No pudimos cargar" con "Reintentar" y las demás siguen (CA-9.7). ¿Va ese aspecto?
9. Apariencia: ¿el título "Tu carta, a tu estilo" (propuesta del PO) va? El texto de ayuda es el de hoy.
10. Temas: 4 por fila en escritorio y 1 por fila en celular (la spec admite 1 o 2; con 2 la vista previa queda chica a 360 px). El activo lleva "Activo" + ícono + un aro cheddar. ¿Va así?
11. Hex inválido (CA-10.6, validación nueva): texto propuesto "Usá un color con el formato #RRGGBB (por ejemplo #FFC21A)." y "Guardar" deshabilitado mientras haya uno inválido. ¿Va ese texto?
12. "Guardar" de la paleta en tomate (como "Guardar cambios" de la Carta) y "Restablecer" en blanco. En celular quedan en una barra fija sobre las pestañas. ¿Va así?
13. Siguen abiertas las preguntas de la spec que afectan a Inicio (sección 9, defaults D-9): 1 (qué cuenta como "pedidos de hoy") y 2 (qué es "Ocupada").
