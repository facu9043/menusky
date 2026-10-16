# Maquetas de Cocina y Salón (fase cocina-salon, SOLO propuesta)

Propuesta para que el Director apruebe antes de construir (`docs/specs/cocina-salon.md` v0.1, punto de
aprobación 2). Ningún archivo de `app/`, `components/` ni `lib/` cambió. Son HTML estáticos sin JS que
enlazan `app/brand.css` (tokens `--ms-*`), `app/admin/admin.css` (las mismas clases de la Carta: botones,
menú de cuenta, punto de pendientes, `.adm-h1`), `../../admin/maquetas/fuentes.css` (Bricolage Grotesque,
Geist y Geist Mono, SIL OFL 1.1, ya versionadas) y `staff.css` (solo piezas nuevas `st-*`). Se abren con
doble clic. Aplican los defaults de la spec §8 (claro, siempre MenuSky, Pomo solo en Cocina vacía, shell
propio liviano, tamaños de CA-3.1/3.2, sin aviso de desconexión, etiqueta "Nuevo").

Datos de ejemplo: local "El Buen Sabor" y platos/opciones del Supabase simulado (`scripts/mock-supabase/server.mjs`);
las personas ("Lucía Ferreyra", "Matías Rivas") y las mesas "Terraza, mesa larga del fondo" y "Barra" son
inventadas para probar nombres largos. Precio con el formato de `lib/format.ts` (`$ 31.400`).

## Qué muestra cada maqueta

Capturas en `capturas/<maqueta>-<ancho>x<alto>.png`, página completa, en 1280x800, 1024x768, 768x1024 y 390x844
(la oscura solo en tablet: 1280x800, 1024x768, 768x1024).

| Maqueta | Qué muestra | CA de la spec |
|---|---|---|
| `cocina.html` | Encabezado de staff (rol cocina), h1 "Cocina" + "restaurante · persona". 5 comandas: 3 en `received` (2 con "Nuevo"), 2 en `in_kitchen` (píldora "En preparación"), una con el botón en proceso (deshabilitado, ícono de carga). Opciones unidas con " · ", notas entre comillas en cursiva sobre fondo mostaza claro. Mesa de nombre largo y cuenta de 7 cifras. Grilla 1 / 2 / 3 columnas (celular / 768 / 1024 y 1280); 4 desde 1440 en el CSS (no capturado). | CA-1.1, 1.4, 1.5; CA-3.1, 3.2, 3.4, 3.6; CA-5.2, 5.3 (`aria-label` "Tomar pedido, Mesa 4"), 5.4; CA-6.1, 6.2, 6.3; CA-NR.1, NR.5; casos límite 4 y 5 |
| `cocina-vacia.html` | Cocina sin pedidos: Pomo estático (`aria-hidden`, el mismo de los vacíos del admin) + "No hay pedidos pendientes." en grande. | CA-NR.9; pregunta 3 |
| `cocina-oscuro.html` | La misma Cocina en variante oscura de marca (fondo carne, tarjetas `#3a2219` como la tarjeta del local del admin, bordes tostado), para comparar. | Pregunta 1 |
| `salon.html` | Rol mozo. "Llamados de mozo · 3" (los 3 motivos; "Cuenta de hoy" solo con "Pide la cuenta"; "Atendido" a la derecha en fila ancha y a lo ancho en celular), "Listos para llevar · 2" (sin notas, uno "Nuevo", "Entregado") y "Mesas" con los 4 estados. En >= 1024 px las acciones van a la izquierda y "Mesas" queda fija a la derecha. | CA-1.4; CA-3.1, 3.2, 3.4; CA-5.3, 5.4; CA-NR.3, NR.4, NR.5, NR.6 |
| `salon-vacio.html` | Salón sin llamados ni listos (solo "Mesas", como hoy, F-3) y restaurante sin mesas con "Todavía no hay mesas." | F-3; caso límite 2; pregunta 9 |
| `shell.html` | Encabezado por rol: cocina (solo Cocina), mozo (solo Salón), admin en /kitchen (Cocina, Salón con pendientes, Admin). Menú de cuenta del celular abierto (admin y mozo). `NoStaffAccess` y `NotAdminAccess` con la marca. En los marcos "Celular" se ve el menú también en vistas anchas: es solo para mostrarlo. | CA-2.1, 2.2, 2.3, 2.4, 2.5; pregunta 4 |

### Shell de staff (default de la pregunta 4)
- Celular (< 768 px): igual al encabezado del admin en celular (fondo miga, logo, botón de cuenta con punto rojo si
  hay pendientes). El menú de cuenta es el `.adm-menu` del admin: nombre, "Rol · Local", los enlaces del rol (activo en
  cheddar, punto + "(hay pendientes)" oculto) y "Cerrar sesión". Sin barra de pestañas: no tapa nada (CA-2.4).
- Tablet y escritorio (>= 768 px): banda marrón como el menú lateral del admin: logo, píldoras de los paneles del rol
  (activa en cheddar, `aria-current="page"`), avatar con iniciales + nombre + rol, y "Cerrar sesión" (solo ícono entre
  768 y 1023 px, con nombre accesible; con texto desde 1024 px).

### Estados y colores (CA-1.4: texto + ícono + color; los saturados piden acción)
| Pieza | Aspecto |
|---|---|
| Pedido `received` | Encabezado cheddar, botón cheddar "Tomar pedido" (gorro) |
| Pedido `in_kitchen` | Encabezado tostado + píldora "En preparación" (gorro), botón papel "Marcar listo" (tilde) |
| Listo para llevar | Encabezado cheddar, botón cheddar "Entregado" (tilde) |
| Mesa Libre | Verde claro + lechuga oscura, círculo punteado (como "Libre" del admin) |
| Mesa Con pedido | Mostaza clara (como "Ocupada" del admin), cubiertos |
| Mesa Listo | Cheddar lleno con sombra sello, círculo con tilde |
| Mesa Llamando | Tomate lleno, texto papel, campana (como "Llama al mozo" del admin) |
| "Nuevo" | Etiqueta tomate con texto "Nuevo" inclinada en la esquina (estática) + punto que late solo con movimiento permitido |

### Medidas y comprobaciones (salidas versionadas)
- `capturas-salida.txt`: por maqueta y tamaño, sin scroll horizontal en ninguna; Bricolage + Geist cargadas y el
  cuerpo en Geist; texto visible más chico 14 px (la etiqueta "Nuevo", el rol del encabezado, el meta del menú); mesa >= 24 px
  (28 desde 768); renglones 20 px en tablet y 18 px en celular; botones de acción 56 px; columnas de pedidos 3 en
  1024 y 1280, 2 en 768, 1 en 390. Animaciones: 6 a 8 con movimiento permitido (entrada de tarjetas, punto "Nuevo",
  carga) y **0 con `prefers-reduced-motion: reduce`** (CA-6.2). Qué NO cubre: no mide el texto oculto ni los rótulos
  de la maqueta (`.mq-cap`), ni 360x640 ni 1440x900.
- `axe-salida.txt`: axe-core (WCAG 2 A/AA, 2.1 AA, 2.2 AA) en 1024x768 y 390x844 de cada maqueta: 0 violaciones.
  Qué NO cubre: no es la app (sin tiempo real, foco real ni lector de pantalla); el menú abierto es estático.
- `contraste-salida.txt`: ratios de todos los pares usados (todos AA o más; texto principal AAA). Ningún par prohibido
  de `docs/design/direccion-de-arte.md` §2 (sin cheddar ni carne sobre tomate, sin lechuga `#4C9A2A` como texto).
- Movimiento: entrada de tarjeta 280 ms (`--ms-dur`), botones 160 ms (`--ms-dur-fast`), solo `transform`/`opacity`,
  todo dentro de `@media (prefers-reduced-motion: no-preference)`; el punto "Nuevo" late 1 vez cada 1,4 s.

Regenerar: `node docs/design/cocina-salon/maquetas/generar-maquetas.mjs` (HTML) y
`TOOLS_DIR=<carpeta con playwright y @axe-core/playwright> node docs/design/cocina-salon/maquetas/capturar.mjs`
(capturas y salidas; por file://, sin servidor).

## Textos: literales de hoy y nuevos
Literales (se conservan tal cual): "Cocina", "Salón", "Admin", "Mozo" (`StaffHeader.tsx`, `StaffNav.tsx`);
"restaurante · persona"; "Cerrar sesión"; "(hay pendientes)" (`AdminShell.tsx`); "Cuenta de la mesa hoy:";
"N× nombre"; opciones con " · "; nota entre comillas; "Tomar pedido", "Marcar listo" (`OrderCard.tsx`);
"No hay pedidos pendientes." (`OrderBoard.tsx`); "Llamados de mozo", "Listos para llevar", "Mesas" (`FloorBoard.tsx`);
"Pide la cuenta", "Tiene una consulta", "Llama al mozo" (`reasons.ts`); "motivo · hora"; "Cuenta de hoy:"; "Atendido"
(`WaiterCallRow.tsx`); "Entregado" (`ReadyOrderCard.tsx`); "Llamando", "Listo", "Con pedido", "Libre" (`TableGrid.tsx`);
textos completos de `NoStaffAccess.tsx` y `NotAdminAccess.tsx`.

Nuevos (todos a aprobar):
1. "Nuevo" (etiqueta; default de la pregunta 8).
2. "En preparación" en la tarjeta (hoy solo existe como toast "Pedido en preparación").
3. "Todavía no hay mesas." (pregunta 9a).
4. Cantidad junto al título de sección ("Llamados de mozo · 3", "Listos para llevar · 2"), como en la Carta.
5. Nombre de la persona y rol en el encabezado y "Rol · Local" en el menú de cuenta (mismo formato que el admin).
6. "Cerrar sesión" visible como texto (hoy es solo ícono con nombre oculto) en >= 1024 px y en las pantallas sin permiso.
7. Nombres accesibles ocultos: "Tomar pedido, Mesa 4", "Atendido, Mesa 3", etc. (CA-5.3); "MenuSky, ir a Cocina";
   "Cuenta: <nombre>"; "Saltar al contenido".

## Preguntas para el Director
Las de la spec que la maqueta deja a la vista (no están decididas: se muestran con su default):
1. (spec 1) ¿Claro como la Carta (`cocina.html`) u oscuro de marca (`cocina-oscuro.html`)? Ambos pasan contraste.
2. (spec 2) Siempre con la paleta MenuSky, sin el color del restaurante: ¿de acuerdo?
3. (spec 3) Pomo en Cocina vacía (`cocina-vacia.html`): ¿va?
4. (spec 4) Shell propio liviano: banda marrón con los paneles del rol en tablet/escritorio, y en celular encabezado
   + menú de cuenta como el admin (para pasar de Cocina a Salón el admin toca 2 veces). ¿Va así, o prefiere en
   celular una fila de píldoras siempre visible?
5. (spec 5) Tamaños: mesa 24-28 px, renglones 18/20 px, botones 56 px. Con eso entran 3 comandas por fila en tablet
   horizontal y 1 en celular (R-4: menos tarjetas por pantalla, ver capturas). ¿Aprueba, con prueba en tablet real?
6. (spec 8) Etiqueta "Nuevo" tomate en la esquina: ¿va?
7. (spec 9) "Todavía no hay mesas." ¿va ese texto? Salón sin llamados ni listos sigue sin mensaje, como hoy.

Nuevas, que surgieron al dibujar:
8. Salón en >= 1024 px: acciones (llamados y listos) a la izquierda y "Mesas" fija a la derecha, en 3 columnas
   (hoy todo apilado y 6 columnas). En celular, 2 columnas de mesas (hoy 3) para que entren nombre y estado sin
   achicar el texto. ¿Va?
9. Colores de mesa: Libre verde claro y Con pedido mostaza clara (como el admin), Listo cheddar lleno y Llamando
   tomate (los fuertes piden acción). "Listo" y "Con pedido" son de la misma familia de color; se distinguen por
   relleno, sombra, ícono y texto. ¿Le sirve o prefiere otro color para "Listo"?
10. Píldora "En preparación" en las comandas que ya se tomaron (texto nuevo, sale del toast actual). ¿Va?
11. Cantidad en los títulos de sección ("· 3"). ¿Va?
12. "Cerrar sesión" con texto visible (hoy solo ícono). ¿Va?
13. Pantallas sin permiso: tarjeta con logo e ícono (sin Pomo, que hoy no está permitido ahí). ¿Va así?
