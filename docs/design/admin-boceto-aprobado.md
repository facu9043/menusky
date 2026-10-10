# Admin de MenuSky: boceto aprobado por el Director (2026-10-03)

El Director vio y aprobó dos maquetas (Carta y Mesas, en escritorio y celular).
Esta es la dirección de arte aprobada para el admin. El Frontend la refina; los cambios
visibles que se aparten de esto se consultan al Director (regla 14 de CLAUDE.md).

Pedido original del Director: "Que se vea más como la que estamos promocionando en la landing,
con botones más intuitivos. El formato Disponible/Sin stock estilo iOS me gusta. La actual se ve
muy apagada. Mejorar bastante el aspecto visual y que tenga una vista en móvil (por si más adelante
lo convierto en una app móvil y que puedan administrar por ahí)." Animaciones lindas; NO se limitan
por la PC actual del Director (es de prueba; respeta prefers-reduced-motion).

## Lenguaje visual (común a todo el admin)
- Paleta y tipografía de la landing/login (tokens `--ms-*`): fondo miga `#fff5e1`, papel `#fffdf8`,
  cheddar `#ffc21a` (acción principal y sección activa), tomate `#d7261e` (dato principal, alertas),
  lechuga `#4c9a2a` (disponible/libre), carne `#2b1710` (texto, bordes, menú), carne suave `#6a4a3c`.
- Títulos en Bricolage Grotesque (700). Cuerpo en Geist.
- Bordes marrones gruesos (1.5–2 px `--ms-patty`) con sombra "sello" `0 3px 0 var(--ms-patty)`;
  radios 12–16 px en tarjetas, píldoras redondeadas en filtros y estados.
- Animación: interruptores con rebote (`--ms-ease-pop`), tarjetas que se hunden al tocarlas,
  hojas que suben desde abajo. Rápidas, con personalidad, nunca bloquean el trabajo.
- Pomo (mascota) para estados vacíos y confirmaciones.

## Estructura
- Escritorio: menú lateral marrón oscuro (logo MenuSky, Inicio, Carta, Mesas, Apariencia; activa en
  cheddar; abajo una tarjeta con el nombre del local y "X de Y mesas ocupadas").
- Celular: barra de pestañas abajo (Inicio, Carta, Mesas, Estilo), botón "+" flotante cheddar,
  edición en hojas que suben desde abajo (bottom sheet) sin cambiar de pantalla.

## Carta (aprobada)
- Encabezado: rótulo "Carta" + título "Tu carta, al día" + botón cheddar "Nuevo plato".
- Tres datos rápidos: "Pedidos hoy" (tarjeta tomate, dato principal), "Platos en carta",
  "Sin stock hoy" (número en tomate).
- Categorías como píldoras filtrables con cantidad ("Hamburguesas · 6"); la activa en cheddar.
- Cada plato en una tarjeta: foto, nombre, resumen de opciones ("3 opciones · Guarnición, Punto"),
  precio en Bricolage, texto de estado ("Disponible" en lechuga / "Sin stock hoy" en tomate),
  interruptor estilo iOS (lechuga encendido, gris apagado) y lápiz para editar. Sin stock = tarjeta
  atenuada.
- Celular: lista compacta con foto, nombre, precio e interruptor; buscador; "+" flotante.
- Editar plato en celular: hoja inferior con foto ("Cambiar foto"), Nombre, Precio, "Disponible hoy"
  con interruptor y botón tomate "Guardar cambios".

## Mesas (aprobada)
- Encabezado: rótulo "Mesas" + título "Tu salón, de un vistazo" + "Imprimir todos" (secundario)
  + "Nueva mesa" (cheddar).
- Filtros por estado con cantidad: Todas, Libres, Ocupadas, Llamando.
- Grilla de tarjetas (4 por fila en escritorio): nombre de la mesa, QR visible, estado
  (Libre = verde claro; Ocupada = mostaza claro con "N pedidos · $total"; Llama al mozo = tomate
  con campanita y motivo, p. ej. "Pide la cuenta"), y acciones: descargar QR, ver carta (pestaña
  nueva), menú ⋯ con "Eliminar" (con confirmación: el QR impreso deja de funcionar).
- Celular: lista compacta (QR chico, nombre, resumen, estado). Al tocar una mesa sube una hoja con
  el QR grande sobre fondo tomate ("Escaneá y pedí desde la mesa"), estado, resumen,
  "Descargar", "Ver carta" y "Eliminar mesa".
- Nuevo: "Imprimir todos" = hoja imprimible con los QR de todas las mesas (nombre debajo de cada uno)
  lista para recortar. Estado en vivo dentro del admin reutilizando la lógica del panel de salón.

## Inicio y Apariencia (no se mostraron como maqueta)
Se construyen con el mismo lenguaje. Inicio: resumen del día (pedidos de hoy, mesas ocupadas,
llamados pendientes, platos sin stock) con accesos rápidos. Apariencia: rediseño visual del editor
de temas actual, sin cambiar su función. Se le muestran al Director en el informe con capturas.
