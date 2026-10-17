# Spec: Rediseño de Cocina (`/kitchen`) y Salón (`/floor`)

Estado: **v1.0, aprobada por el Director** (2026-10-15; borrador v0.1 el mismo día). Autor: Product Owner.
Rama: `feat/staff-redesign` (desde master @ d66b639). Estado de la fase: `docs/ESTADO-COCINA-SALON.md`. Decisión técnica del Líder: `docs/DECISIONES.md` D-23.
Referencia visual APROBADA: `docs/design/cocina-salon/maquetas/` (`cocina.html`, `cocina-vacia.html`, `salon.html`, `salon-vacio.html`, `shell.html`; README y capturas). Las variantes oscuras (`cocina-oscuro.html`) NO se construyen. Si la maqueta y un CA parecen distintos, manda el CA y se avisa al Líder.

Registro de cambios:
- v1.0 (2026-10-15): el Director responde las 10 preguntas de v0.1 y las 13 del README de las maquetas (sección 8, "Decisiones del Director"). Tema CLARO. Se agrega HU-8 (detalles aprobados en las maquetas) y la sección Backlog (10). Se actualizan CA-1.2, CA-NR.9, R-1 y R-3. Contradicciones abiertas: sección 11.
- v0.1 (2026-10-15): borrador con 10 preguntas y defaults.
Stack: `docs/STACK.md` (esta spec no define tecnología). Modelo de formato y criterios compartidos: `docs/specs/admin.md` (se CITA, no se repite). Lenguaje visual: `docs/design/admin-boceto-aprobado.md` y `docs/design/direccion-de-arte.md`.

Convenciones: las del admin (`docs/specs/admin.md`, encabezado): "Hecho verificado" = respaldado por un archivo de este repo (ruta:línea); "Propuesta del PO (a confirmar)"; "Línea base: a medir por el Líder" = sin número medido, no se inventa. Criterios CA-x.y (Dado / Cuando / Entonces), probados sobre `npm run build && npm run start` con el Supabase simulado (`scripts/mock-supabase/`, D-5). Viewports: **360x640** y **390x844** (celular), **768x1024** (tablet vertical), **1024x768** y **1280x800** (tablet horizontal), **1440x900** (escritorio); 320 px solo para scroll horizontal.

---

## 0. Resumen (1 minuto)

1. Pedido del Director (2026-10-15, `docs/ESTADO-COCINA-SALON.md` líneas 9-12): Cocina y Salón con el lenguaje de la Carta del admin ("no puede haber un apartado distinto"), con rediseño como los demás paneles. **Mismo funcionamiento, otro aspecto.** Uso en tablet y celular.
2. No cambian datos, API, permisos, tiempo real, textos de acciones ni reglas de estado. No hay funciones nuevas.
3. Decisiones del Director (sección 8): tema CLARO, siempre paleta MenuSky, tamaños grandes con prueba en tablet real, y OK a todo lo de las maquetas (Pomo en Cocina vacía, etiqueta "Nuevo", píldora "En preparación", cantidades en títulos, "Cerrar sesión" con texto, colores de mesa, Salón en dos columnas).
4. Tema oscuro para todos los paneles, aviso de desconexión y mockups de la landing: backlog (sección 10). No se construyen ahora.

---

## 1. Objetivo y contexto

- Problema: Cocina y Salón son lo único que quedó con el aspecto viejo (oscuro con tinte del color del restaurante, `components/staff/StaffShell.tsx:42-52`), mientras landing, login, admin y carta ya comparten la marca. Se ve como "otra app".
- Para quién: cocineros y mozos (y el admin cuando entra), de pie, en tablet o celular, con prisa, a veces mirando de lejos.
- Objetivo: que se vean como MenuSky (paleta, Bricolage en títulos, Geist en cuerpo, bordes marrones gruesos con sombra "sello", píldoras) y que se lean y toquen mejor en tablet y celular, **sin cambiar qué hacen**.
- Se mide así: (a) revisión visual contra la Carta (CA-1.x); (b) lista de funciones de la sección 2 que siguen pasando sin cambios (CA-NR); (c) prueba con 2 personas de cocina o salón en una tablet real: leen mesa y cantidades a 1,5 m y marcan un pedido "listo" al primer toque (notas como evidencia; prueba final en tablet real exigida por el Director, decisión 3).

---

## 2. Hechos verificados del punto de partida (todo de este repo)

### 2.1 Cocina `/kitchen`
| # | Hecho | Evidencia |
|---|---|---|
| K-1 | Sin fila de staff: `NoStaffAccess`. `waiter` va a `/floor` (redirect en el servidor, antes de leer pedidos); admin y cocina ven el tablero. | `app/kitchen/page.tsx:11-14` |
| K-2 | Se leen pedidos de cocina y totales por mesa del restaurante del usuario; el tablero recibe `initialOrders` y `initialTableTotals`. | `app/kitchen/page.tsx:16-28` |
| K-3 | Encabezado: título "Cocina", "restaurante · persona", insignia de rol ("Admin"/"Mozo"/"Cocina") y botón de solo ícono "Cerrar sesión" (nombre accesible `sr-only`). | `components/staff/StaffHeader.tsx:6-10, 21-32`; `LogoutButton.tsx:22-31` |
| K-4 | Pedidos "activos" en cocina = `received` y `in_kitchen`. Un pedido pasado a `ready`, `delivered` o `cancelled` sale del tablero. | `lib/realtime/useKitchenOrders.ts:7`; `lib/realtime/useOrdersBoard.ts:68-72` |
| K-5 | Tarjeta de pedido: etiqueta de mesa, hora (es-AR HH:MM), "Cuenta de la mesa hoy: $X", renglones `N× nombre`, opciones unidas con " · ", nota entre comillas en cursiva. | `components/kitchen/OrderCard.tsx:12-15, 52-84` |
| K-6 | Botón de la tarjeta: `received` -> "Tomar pedido" (principal, ícono sombrero); `in_kitchen` -> "Marcar listo" (secundario, ícono tilde). Mientras procesa queda deshabilitado. Toasts: "Pedido en preparación" / "Pedido listo"; error "No se pudo actualizar el pedido". | `OrderCard.tsx:30-41, 86-94` |
| K-7 | La etiqueta de mesa cambia de variante según el estado (`received` principal, `in_kitchen` secundaria). | `OrderCard.tsx:53-55` |
| K-8 | Vacío: texto "No hay pedidos pendientes." (centrado, sin ilustración). | `components/kitchen/OrderBoard.tsx:20-26` |
| K-9 | Grilla de tarjetas: 1 columna; 2 desde `sm`; 3 desde `lg`; 4 desde `xl`. Los pedidos nuevos se agregan al final de la lista. | `OrderBoard.tsx:29`; `useOrdersBoard.ts:49-51` |
| K-10 | Pedido nuevo (INSERT en tiempo real, estado activo): se agrega, se marca "nuevo" y suena el aviso. Un cambio de estado hecho por OTRO dispositivo también marca "nuevo"; el eco del cambio propio no. Actuar sobre el pedido le quita la marca. | `useOrdersBoard.ts:46-54, 64-77, 96-101` |
| K-11 | La marca "nuevo" es un punto con pulso (`animate-ping`) en la esquina de la tarjeta; solo color y movimiento, sin texto. | `OrderCard.tsx:45-50` |
| K-12 | Aviso sonoro: tono de 880 Hz de 0,4 s con Web Audio; si el navegador bloqueó el audio, falla en silencio. No hay toast al llegar un pedido en cocina. | `lib/notify/playChime.ts:6-28`; `useOrdersBoard.ts:53` |
| K-13 | Los totales por mesa se actualizan sumando cada pedido nuevo (solo INSERT). | `lib/realtime/useTableTotals.ts:24-29` |
| K-14 | Entrada de tarjetas animada con `@starting-style` (0,35 s, opacidad + `translateY` + escala). Esa regla NO tiene excepción para `prefers-reduced-motion` (la única excepción del archivo es para `.reveal-item`). El punto "nuevo" usa `animate-ping` directo. | `app/globals.css:277-288, 348-354`; `OrderCard.tsx:44-47` |
| K-15 | No hay `loading.tsx` ni `error.tsx` en `app/kitchen` ni `app/floor`. Las lecturas de pedidos no manejan errores (búsqueda de `error`/`throw` en `lib/orders/get*.ts`: solo `getOrder.ts`, que es del cliente). D-12 las dejó así a propósito. | Glob `app/{kitchen,floor}/*`; `docs/DECISIONES.md` D-12 |
| K-16 | No hay indicador de conexión ni de reconexión en Cocina ni Salón (los hooks no revisan el estado de la suscripción). El admin sí tiene `OfflineNotice`. | `lib/realtime/useOrdersBoard.ts:34-85`; `components/admin/shell/AdminShell.tsx:238` |
| K-17 | No hay `aria-live` en ninguno de los componentes de cocina/salón/encabezado leídos. Los toasts salen por `<Toaster position="top-center">` de `app/layout.tsx` (hecho 17 de `docs/specs/admin.md` 2.1); si sonner anuncia a lectores de pantalla no se verificó. | lectura de `components/{kitchen,floor,staff}/*` |

### 2.2 Salón `/floor`
| # | Hecho | Evidencia |
|---|---|---|
| F-1 | Sin fila de staff: `NoStaffAccess`. `kitchen` va a `/kitchen` (servidor, antes de leer datos); admin y mozo ven el panel. | `app/floor/page.tsx:13-16` |
| F-2 | Se leen mesas, pedidos, llamados pendientes y totales del restaurante; el tablero los recibe como iniciales. | `app/floor/page.tsx:18-34` |
| F-3 | Tres secciones con título: "Llamados de mozo" (solo si hay llamados), "Listos para llevar" (solo si hay pedidos `ready`) y "Mesas" (siempre). Sin estado vacío propio: si no hay llamados ni listos, esas secciones no aparecen. | `components/floor/FloorBoard.tsx:47-88` |
| F-4 | Pedidos "activos" en salón = `received`, `in_kitchen`, `ready`; solo se muestran como tarjeta los `ready`. | `lib/realtime/useFloorOrders.ts:7`; `FloorBoard.tsx:33, 66-83` |
| F-5 | Fila de llamado: ícono campana, mesa, "motivo · hora" (Pide la cuenta / Tiene una consulta / Llama al mozo), "Cuenta de hoy: $X" solo si el motivo es "cuenta", botón "Atendido" (pequeño, secundario). Toasts: "Llamado atendido" / "No se pudo marcar como atendido". | `components/floor/WaiterCallRow.tsx:30-60`; `lib/waiterCalls/reasons.ts:1-5` |
| F-6 | Tarjeta "listo para llevar": mesa, hora, "Cuenta de la mesa hoy", renglones con opciones (SIN la nota del cliente), botón "Entregado" (principal). Toasts: "Pedido entregado" / "No se pudo marcar como entregado". | `components/floor/ReadyOrderCard.tsx:30-40, 51-81` |
| F-7 | Grilla de mesas: 3 / 4 / 6 columnas; cada mesa muestra nombre y estado en texto: Llamando / Listo / Con pedido / Libre. Prioridad: llamando > listo > con pedido > libre. Texto de estado de 11 px. Con cero mesas la grilla queda vacía, sin mensaje. | `components/floor/TableGrid.tsx:5-10, 25-37`; `lib/floor/tableStatus.ts:15-20` |
| F-8 | Entra un llamado nuevo (INSERT): se agrega, suena el aviso y sale el toast "Una mesa está llamando al mozo". Un llamado deja la lista cuando deja de estar `pending`. | `lib/realtime/useWaiterCalls.ts:31-51, 61-66` |
| F-9 | Entra un pedido nuevo en estado activo (incluso `received`): suena el aviso y se marca "nuevo", aunque en Salón solo se vea cuando llega a `ready`. | `useOrdersBoard.ts:46-54`; `useFloorOrders.ts:7` |
| F-10 | `TableStatus` (tipo) se define en `TableGrid.tsx` y lo importa `lib/floor/tableStatus.ts`, que reutiliza el admin en vivo (Mesas e Inicio). La lógica de estados no se modifica (`docs/specs/admin.md` §2.1 hecho 11, HU-8). | `lib/floor/tableStatus.ts:1-4` |
| F-11 | Ningún panel tiene botón de cancelar pedido; `cancelled` solo sale del tablero si llega por tiempo real. | lectura de `OrderCard.tsx`, `ReadyOrderCard.tsx` |

### 2.3 Shell compartido (Cocina, Salón y, hoy, también los avisos de acceso)
| # | Hecho | Evidencia |
|---|---|---|
| S-1 | `StaffShell`: contenedor oscuro (`dark`) con `--primary`, `--secondary`, fondo y tarjetas teñidos con el color del restaurante (`color-mix`), estilo del tema (`data-theme-style`) y Fraunces para títulos. | `components/staff/StaffShell.tsx:6-11, 40-53` |
| S-2 | `StaffNav`: píldoras "Cocina" (kitchen, admin), "Salón" (waiter, admin), "Admin" (solo admin); activa por `pathname`; punto rojo con pulso si hay pendientes: cocina = pedidos `received`; salón = pedidos `ready` + llamados `pending`. Los pendientes se cuentan con su propia suscripción (`useStaffPendingCounts`). El punto no tiene texto alternativo. | `components/staff/StaffNav.tsx:11-15, 28-50`; `lib/realtime/useStaffPendingCounts.ts:37-40` |
| S-3 | El admin ya tiene su shell de marca: menú lateral (>= 768 px) con grupo "Paneles" (Cocina, Salón, con punto "(hay pendientes)" `sr-only`), tarjeta del local, avatar con iniciales y rol, "Cerrar sesión"; en celular, encabezado con logo y menú de cuenta que lleva a Cocina/Salón. Siempre con la paleta MenuSky (nunca el tema del restaurante). | `components/admin/shell/AdminShell.tsx:69-152, 156-211`; `app/admin/layout.tsx:50-52` |
| S-4 | `NoStaffAccess` ("Tu cuenta no está vinculada a ningún restaurante" + ayuda con `staff_users`) y `NotAdminAccess` ("Esta sección es solo para administradores") son pantallas simples con `LogoutButton`; las usan Cocina, Salón y Admin. | `components/staff/NoStaffAccess.tsx`, `NotAdminAccess.tsx`; `app/admin/layout.tsx:36-37` |
| S-5 | La landing muestra mockups de tablero de cocina/salón copiados de estos componentes; no se leyó cuánto se apartan del aspecto nuevo. | `components/landing/mockups/Pieces.tsx:11, 115, 170` |
| S-6 | Hasta ahora Cocina/Salón quedaron fuera de alcance a propósito; Pomo está prohibido en ellos; "el admin se ve SIEMPRE con la paleta MenuSky". | `docs/specs/admin.md` §3.2 y CA-11.3, CA-5.1 |
| S-7 | Fuente del body: la causa de Times New Roman en `/floor` y `/kitchen` ya fue diagnosticada (D-19); verificar en el build que el cuerpo salga en Geist antes de dar por buena la tipografía. | `docs/DECISIONES.md` D-19 |

---

## 3. Alcance y fuera de alcance

### 3.1 Dentro
- Aspecto de `/kitchen` y `/floor`: tarjetas de pedido, filas de llamado, grilla de mesas, secciones, estado vacío, botones, insignias, textos.
- Shell de staff (encabezado, navegación, identidad, cerrar sesión, puntos de pendientes) coherente con el shell del admin.
- Uso en tablet (vertical y horizontal) y celular: tamaños de texto, objetivos táctiles, grillas.
- Aspecto de `NoStaffAccess` y `NotAdminAccess` (Debería: son lo primero que ve un usuario mal vinculado).
- Accesibilidad y reduced-motion de lo anterior (incluida la corrección de K-14 y K-17, ver HU-5 y HU-6).

### 3.2 Fuera (explícito)
- Cualquier cambio de datos, esquema, RLS, API, `proxy.ts`, hooks de `lib/realtime/*`, `lib/orders/*`, `lib/waiterCalls/*`, reglas de estado (K-4, F-4, F-7) y permisos. Tampoco el sonido ni el texto de toasts (salvo los textos y etiquetas nuevos aprobados en HU-8). Aviso de desconexión, tema oscuro y mockups de la landing: backlog (sección 10).
- Funciones nuevas: cancelar pedido, notas en "Listos para llevar", filtros, búsqueda, historial, tiempos de espera/cronómetro por pedido, agrupar por mesa, impresión de comandas, reordenar, ajustes de sonido, modo oscuro conmutable.
- Admin, carta del cliente, landing y login (solo se reutilizan sus tokens y componentes de marca).
- Medición de rendimiento con Lighthouse (se hace después en la PC de 16 GB; `docs/ESTADO-ADMIN.md` líneas 78-81, `docs/specs/admin.md` CA-RNF.4).
- Aplicar cambios en producción, base real o credenciales reales.

---

## 4. Usuarios y roles

| Rol | Pantalla | Regla que NO cambia |
|---|---|---|
| `kitchen` | `/kitchen`; en `/floor` va a `/kitchen` | R-2: `docs/specs/admin.md` CA-3.2, 3.6 |
| `waiter` | `/floor`; en `/kitchen` va a `/floor` | CA-3.1, 3.6 |
| `admin` | ve ambos, sin redirección; además `/admin` | CA-3.3 |
| Sin fila de staff | `NoStaffAccess`, sin leer datos | CA-3.5 |
| Anónimo | `/login?redirect=<ruta>` | CA-3.5 |
| Navegación por rol: mozo solo ve "Salón"; cocina solo "Cocina"; admin "Cocina", "Salón" y "Admin" | | CA-3.9, `StaffNav.tsx:11-15` |

---

## 5. Historias y criterios de aceptación

Los criterios de contraste, foco, nombres, teclado, objetivos táctiles base, scroll horizontal y zoom son los de `docs/specs/admin.md` CA-13.1 a 13.9 y CA-12.1 a 12.6: **valen también acá** (se citan, no se copian). Abajo solo lo propio o más exigente.

### HU-1 Mismo aspecto que la Carta
Como cocinero o mozo quiero que mi pantalla se vea como el resto de MenuSky, para que sea una sola app.

- CA-1.1 Dado `/kitchen` y `/floor` abiertos con un `kitchen`, un `waiter` y un `admin`, cuando se comparan con la Carta del admin (1440x900 y 390x844), entonces usan los mismos tokens `--ms-*` (fondo miga, papel, patty, cheddar, tomate, lechuga oscura), Bricolage Grotesque 700 en títulos y números grandes, Geist en el cuerpo, borde marrón de 1,5-2 px con sombra "sello" `0 3px 0` en tarjetas y botones, radios de 12-16 px y píldoras en estados. Evidencia: capturas lado a lado y búsqueda en el CSS de que los colores salen de los tokens, sin HEX sueltos.
- CA-1.2 Dado que el Director dijo "no puede haber un apartado distinto", cuando se revisa el código de estilos de los paneles, entonces no queda ninguna clase `dark`, `color-mix` con `accentPrimary` ni Fraunces en Cocina/Salón (decisiones 1 y 2 de la sección 8). La variante oscura no se construye.
- CA-1.3 Dado un restaurante con cualquiera de los 8 temas guardados, cuando se abre `/kitchen` o `/floor`, entonces se ve igual (decisión 2: siempre MenuSky). Capturas con 2 temas distintos.
- CA-1.4 Estados de pedido y de mesa distinguibles sin depender solo del color: cada uno tiene texto (los de K-5/F-7, que se conservan) más ícono o forma. Contraste AA de cada par (ver `direccion-de-arte.md` §2: prohibidos cheddar sobre tomate, lechuga #4C9A2A como texto, patty sobre tomate).
- CA-1.5 El texto del cuerpo se ve en Geist (no en Times; S-7). Evidencia: `getComputedStyle(body).fontFamily` en `/kitchen` y `/floor`.

### HU-2 Shell de staff coherente con el del admin
Como persona del equipo quiero reconocer encabezado, identidad y navegación como en el admin.

- CA-2.1 Dado cualquiera de los roles, cuando abre su panel, entonces ve el logo MenuSky (enlace a su panel), el nombre del local, el nombre de la persona con avatar de iniciales, el rol y "Cerrar sesión", con el mismo estilo que `AdminShell` (S-3). Cerrar sesión lleva a `/login` y al volver atrás se pide login (como `docs/specs/admin.md` CA-NR.02).
- CA-2.2 Dado el rol, entonces los enlaces de navegación son los de la tabla de la sección 4 (CA-3.9): visibles en la banda del encabezado desde 768 px; en celular quedan dentro del menú de cuenta como en `shell.html` (2 toques, igual que el admin; resolución 11.1). Estado activo marcado con `aria-current="page"`.
- CA-2.3 Dado un pedido `received` o un pedido `ready` / llamado pendiente en otra pantalla, cuando se mira la navegación (en celular: el punto rojo visible en el botón del menú de cuenta y en el enlace dentro del menú, como la maqueta), entonces el enlace de la otra pantalla muestra el indicador de pendientes con la MISMA regla que hoy (S-2) y con texto alternativo ("(hay pendientes)", como `AdminShell.tsx:110-112`). Si el admin está en `/kitchen` o `/floor`, el enlace a "Admin" sigue ahí.
- CA-2.4 En celular (360x640, 390x844) la navegación no tapa contenido ni el botón de acción de la última tarjeta (se puede hacer scroll hasta verlo completo); respeta el área segura del teléfono.
- CA-2.5 `NoStaffAccess` y `NotAdminAccess` conservan sus textos literales (S-4) y el botón de cerrar sesión, con el aspecto de marca.
- CA-2.6 Dado un `waiter` abre `/kitchen`, entonces termina en `/floor` sin mostrar nada de cocina; `kitchen` en `/floor` termina en `/kitchen`; un admin nunca es redirigido; ningún rol rebota (R-2, `docs/specs/admin.md` CA-3.1 a 3.6 siguen pasando).

### HU-3 Legible a distancia y usable en tablet y celular
Como cocinero quiero leer mesa y cantidades desde 1-2 m y tocar con la mano mojada o con prisa.

Los números de abajo están **aprobados por el Director (decisión 5), con prueba final en tablet real**; hoy el tamaño más chico es 11 px (F-7) y el de los renglones es `text-sm` (K-5). Línea base de las alturas actuales de botón: a medir por el Líder.

- CA-3.1 Mesa en cada tarjeta: >= 24 px, Bricolage 700. Renglones del pedido (`N× nombre`): >= 20 px en tablet y >= 18 px en celular. Opciones, nota, hora y "Cuenta ... hoy": >= 16 px. Ningún texto con información (incluido el estado de mesa) por debajo de 14 px.
- CA-3.2 Botones de acción de las tarjetas ("Tomar pedido", "Marcar listo", "Entregado", "Atendido"): ancho completo de la tarjeta (excepto "Atendido" en fila ancha) y alto >= 56 px; separación >= 12 px entre botones de tarjetas distintas para no tocar el vecino. Cualquier otro control táctil >= 44x44 px (CA-13.5 del admin).
- CA-3.3 Dado un `pointer: coarse`, entonces ninguna acción depende de hover.
- CA-3.4 Tablet horizontal (1024x768, 1280x800): las tarjetas de Cocina se ven en 3 columnas como mínimo sin scroll horizontal y con la mesa y el botón visibles sin zoom; en 768x1024, 2 columnas; en celular, 1 columna. La grilla de mesas muestra el nombre completo y el estado sin cortarse.
- CA-3.5 El panel no bloquea la orientación; al girar la tablet no se pierde el estado (pedidos en pantalla, botones en proceso).
- CA-3.6 Una acción en proceso deja el botón deshabilitado con estado visible (como K-6), y al volver el resultado el aviso es el mismo texto de hoy.

### HU-4 No se rompe nada de lo que hoy funciona (no-regresión)
Cada fila es un criterio CA-NR; los textos entre comillas se conservan **literalmente**. Se prueban con el Supabase simulado con 3 roles.

| Id | Criterio |
|---|---|
| CA-NR.1 | Cocina: un pedido `received` muestra "Tomar pedido"; al tocarlo pasa a `in_kitchen`, el botón pasa a "Marcar listo" y sale toast "Pedido en preparación". "Marcar listo" lo pasa a `ready`, lo saca de Cocina y sale "Pedido listo" (K-4, K-6). |
| CA-NR.2 | Si la actualización falla: toast "No se pudo actualizar el pedido", el pedido sigue donde estaba y el botón se puede volver a tocar. |
| CA-NR.3 | Un pedido `ready` aparece en Salón en "Listos para llevar" sin recargar, con botón "Entregado"; al tocarlo sale "Pedido entregado" y desaparece. Error: "No se pudo marcar como entregado" (F-6). |
| CA-NR.4 | Un llamado de la carta del cliente aparece en "Llamados de mozo" sin recargar con mesa, motivo y hora; con motivo "cuenta" muestra "Cuenta de hoy: $X". "Atendido" -> "Llamado atendido" y desaparece. Error: "No se pudo marcar como atendido" (F-5). |
| CA-NR.5 | Cada tarjeta de Cocina muestra mesa, hora, "Cuenta de la mesa hoy: $X", renglones, opciones y notas; la de "Listos para llevar" las mismas SIN notas (F-6). Formato de moneda de `lib/format.ts`. |
| CA-NR.6 | La grilla "Mesas" muestra todas las mesas con el estado Llamando / Listo / Con pedido / Libre y la prioridad de F-7; cambia sola cuando llega un pedido, un `ready` o un llamado. |
| CA-NR.7 | Sonido: suena el aviso al llegar un pedido activo nuevo (Cocina y Salón) y al llegar un llamado (Salón), y sale el toast "Una mesa está llamando al mozo" SOLO en `/floor` (K-12, F-8, F-9; en el admin no suena, `docs/specs/admin.md` CA-8.6). No suena al cargar la página. |
| CA-NR.8 | Un pedido o llamado hecho desde otro dispositivo se ve en <= 5 s sin recargar (mismo comportamiento de tiempo real de hoy; la demora real es: línea base a medir por el Líder con el simulado). |
| CA-NR.9 | Cocina vacía: texto "No hay pedidos pendientes." (K-8). Con la misma frase y con Pomo decorativo (decisión 3, HU-8). |
| CA-NR.10 | Navegación, redirecciones por rol, cerrar sesión e indicador de pendientes: HU-2. |
| CA-NR.11 | `git diff` contra `master` no toca `lib/**`, `app/api/**`, `proxy.ts`, `supabase/**` ni la lógica de `components/{kitchen,floor}/*` salvo marcado, clases y atributos de accesibilidad, y el código cliente mínimo para los anuncios en vivo (CA-5.1) y los contadores de los títulos, derivado de los datos que la pantalla ya tiene, sin consultas nuevas ni cambios de tiempo real (D-24). Se exceptúa `lib/floor/tableStatus.ts`/`TableStatus` solo si hace falta mover el tipo de lugar sin cambiar su resultado (F-10). |

### HU-5 Accesibilidad
Reglas base: `docs/specs/admin.md` CA-13.1 a 13.10. Propio de acá:

- CA-5.1 **Avisos en vivo.** Dado un lector de pantalla (NVDA / VoiceOver), cuando llega un pedido nuevo a Cocina o un llamado o pedido listo a Salón, entonces se anuncia una vez, sin interrumpir, con un texto corto que dice qué pasó y de qué mesa (p. ej. "Pedido nuevo: Mesa 4"; textos aprobados, decisión 7). Al cargar la página no se anuncia todo el tablero. Evidencia: notas de QA y el DOM con la región `aria-live="polite"` (`assertive` solo para llamados, a confirmar por QA).
- CA-5.2 **Marca de "nuevo" sin depender del color ni del movimiento.** Dado un pedido nuevo (K-10, K-11), entonces además del punto hay una señal estática no cromática (la etiqueta "Nuevo", CA-8.1) que se sigue viendo con `prefers-reduced-motion` y sin ver colores.
- CA-5.3 **Nombres accesibles.** Cada botón de acción incluye la mesa en su nombre ("Tomar pedido, Mesa 4"), manteniendo el texto visible dentro del nombre (WCAG 2.5.3). "Cerrar sesión" conserva su nombre.
- CA-5.4 **Estados de mesa y de pedido** se anuncian como texto, no solo por color (CA-1.4). Tarjetas y secciones con encabezados (`h2`/`h3`) en orden lógico; `h1` único con el nombre del panel.
- CA-5.5 **Contraste y foco** según CA-13.1 y CA-13.3 del admin, medidos sobre los estados reales: tarjeta con pedido recibido, en preparación, llamado, mesa llamando, deshabilitado y atenuado. Adjuntar pares y ratios.
- CA-5.6 axe: 0 errores críticos o serios en `/kitchen` y `/floor`, en celular y tablet, con tarjetas, con vacío y con el menú de cuenta abierto (si lo hay).

### HU-6 Movimiento
Reglas base: `docs/specs/admin.md` CA-12.1 a 12.6.

- CA-6.1 Entradas, "hundimiento" al tocar y cambio de estado con `transform`/`opacity` y los tokens `--ms-dur-fast` (160 ms) y `--ms-dur` (280 ms); ninguna interacción > 400 ms; sin `filter`, `backdrop-filter` ni animación de `box-shadow` (CA-12.3). No se limita ninguna animación por la PC de prueba (decisión del Director, `docs/ESTADO-ADMIN.md` líneas 78-81).
- CA-6.2 Con `prefers-reduced-motion: reduce`: `document.getAnimations().length === 0` en reposo, al llegar un pedido nuevo, al llegar un llamado, al tocar "Tomar pedido" / "Marcar listo" / "Entregado" / "Atendido" y al cambiar de panel. Esto corrige K-14 (hoy la entrada de tarjetas y el `animate-ping` no se apagan).
- CA-6.3 Sin bucles infinitos salvo, como máximo, el pulso del punto "nuevo" y de los pendientes (que se apaga con reduced-motion y nunca parpadea más de 3 veces por segundo, CA-12.5). El pulso se detiene cuando el pedido deja de ser nuevo (K-10).
- CA-6.4 El tablero responde a toques durante cualquier animación (CA-12.2).

### HU-7 Rendimiento
- CA-7.1 Sin librería de animación ni de UI nueva (`docs/STACK.md`, regla 3).
- CA-7.2 Con 30 pedidos activos en Cocina y 20 llamados + 40 mesas en Salón (simulado), tocar un botón cambia su estado visible en <= 100 ms y no hay scroll horizontal ni saltos de diseño al entrar una tarjeta nueva. Medición de cuadros, INP y CPU: **PENDIENTE en la PC de 16 GB; no bloquea esta fase**. Línea base: a medir por el Líder; ningún número del Celeron se usa como meta.
- CA-7.3 El JS cliente de `/kitchen` y `/floor` no crece más de lo que pese Pomo (CA-8.8); peso antes y después: a medir por el Líder.

### HU-8 Detalles aprobados en las maquetas (decisiones 3, 8, 9, 11 a 16)
Referencia visual: `docs/design/cocina-salon/maquetas/` (README: tablas "Shell de staff" y "Estados y colores"). Los textos nuevos son literales.

- CA-8.1 **"Nuevo".** Dado un pedido marcado "nuevo" (K-10), entonces la tarjeta muestra la etiqueta de texto "Nuevo" (estática, en la esquina; `cocina.html`, `salon.html`), visible con `prefers-reduced-motion`; el punto que late solo se anima con el movimiento permitido. Al actuar sobre el pedido (K-10) la etiqueta desaparece.
- CA-8.2 **"En preparación".** Dado un pedido `in_kitchen` en Cocina, entonces la tarjeta muestra la píldora "En preparación" (con ícono) y su botón es "Marcar listo"; un pedido `received` no la muestra y su botón es "Tomar pedido". El toast "Pedido en preparación" no cambia.
- CA-8.3 **Cantidades en títulos.** Dado Salón con 3 llamados y 2 pedidos listos, entonces los títulos dicen "Llamados de mozo · 3" y "Listos para llevar · 2" y el número se actualiza solo al llegar o salir un elemento. Las secciones siguen apareciendo solo si tienen elementos (F-3).
- CA-8.4 **"Cerrar sesión" con texto.** Dado >= 1024 px, el menú de cuenta del celular o las pantallas `NoStaffAccess` / `NotAdminAccess`, entonces el control dice "Cerrar sesión" en texto visible. Entre 768 y 1023 px puede ser solo ícono con nombre accesible "Cerrar sesión". Comportamiento sin cambios (CA-2.1).
- CA-8.5 **Salón en dos columnas.** Dado >= 1024 px, entonces Salón muestra a la izquierda las acciones ("Llamados de mozo" y "Listos para llevar") y a la derecha "Mesas" fija; por debajo de 1024 px todo apilado. En celular (< 768 px) la grilla de mesas va en 2 columnas con el nombre completo y el estado visibles sin achicar el texto (CA-3.1). Verificar en 1024x768, 1280x800, 768x1024 y 390x844. En >= 1024 px son 2 columnas de PÁGINA (acciones a la izquierda, más anchas; panel "Mesas" a la derecha) y la grilla de mesas dentro del panel va en 3 columnas, como `capturas/salon-1280x800.png` (resolución 11.1).
- CA-8.6 **Colores de mesa.** Cada estado (prioridad de F-7) se reconoce por texto + ícono + color, con estos colores de marca: Libre = verde claro con lechuga oscura (círculo punteado); Con pedido = mostaza clara (cubiertos); Listo = cheddar lleno con sombra sello (círculo con tilde); Llamando = tomate lleno con texto papel al 100 % (campana). "Con pedido" y "Listo" son de la misma familia de color: se distinguen por relleno, sombra, ícono y texto (CA-1.4). Ningún par prohibido de `direccion-de-arte.md` §2.
- CA-8.7 **Sin mesas.** Dado un restaurante sin mesas, entonces la sección "Mesas" muestra "Todavía no hay mesas." (`salon-vacio.html`). Salón sin llamados ni listos no muestra mensaje (F-3).
- CA-8.8 **Pomo en Cocina vacía.** Dado Cocina sin pedidos, entonces se ve Pomo estático (`aria-hidden`, el mismo del admin) y "No hay pedidos pendientes." en grande. Pomo no aparece junto a pedidos, ni en Salón, ni en las pantallas sin permiso (que llevan logo e ícono). Se mantiene la prohibición de `docs/specs/admin.md` CA-11.3 para el resto de `/kitchen` y `/floor`.
- CA-8.9 **Textos de estado de mesa.** Se conservan Llamando / Listo / Con pedido / Libre (no se alinean con Libre / Ocupada / Llama al mozo del admin).
- CA-8.10 **Shell.** Celular (< 768 px): encabezado con logo y botón de cuenta (punto rojo si hay pendientes); el menú de cuenta muestra nombre, "Rol · Local", los enlaces del rol (activo marcado, con "(hay pendientes)" oculto) y "Cerrar sesión". Sin barra de pestañas. Tablet y escritorio (>= 768 px): banda marrón con logo, enlaces del rol (`aria-current="page"`), avatar con iniciales, nombre, rol y "Cerrar sesión". Pendientes con la regla de S-2 y una sola suscripción para pendientes (D-23).

---

## 6. Casos límite y errores

1. **Muchos pedidos** (30+ en Cocina; 40+ mesas): scroll vertical de la página, sin scroll horizontal; encabezado y navegación no tapan la última fila (CA-2.4). Sin paginar ni virtualizar (no hay funciones nuevas).
2. **Ninguno**: Cocina muestra K-8. Salón sin llamados ni listos muestra solo "Mesas" (F-3), como hoy; sin mesas, la sección "Mesas" queda vacía hoy (F-7): se muestra "Todavía no hay mesas." (CA-8.7).
3. **Desconexión**: hoy no se avisa (K-16); la pantalla puede quedar con datos viejos sin que se note. No se agrega aviso (backlog, decisión 6). Riesgo R-1 aceptado.
4. **Nombres largos**: mesa de 40 caracteres, plato de 80, opción/nota de 200+ caracteres, mesa "Mesa 10" vs "Mesa 2": sin cortes ni desborde, el texto baja de línea (renglones y notas) o se corta con puntos suspensivos y nombre completo accesible (etiquetas de mesa); el botón de acción no sale de la tarjeta (CA-13.6 del admin).
5. **Precios de 7 cifras** ($1.234.567) en "Cuenta ... hoy" sin desborde.
6. **Pedido con muchos renglones** (50, tope de `create_order`, D-10): la tarjeta crece; el botón sigue alcanzable sin perder la mesa de vista (propuesta: el botón queda al pie de la tarjeta).
7. **Doble toque** en un botón: la segunda pulsación no hace nada mientras está en proceso (K-6).
8. **Error de acción**: toasts de hoy; sin cambiar el estado mostrado.
9. **Error de lectura inicial** (K-15): hoy puede verse como vacío. No se cambia (D-12). Riesgo R-2.
10. **Audio bloqueado** por el navegador: falla en silencio (K-12); la señal visual (CA-5.2) debe alcanzar.
11. **Texto del sistema grande / zoom 200 %**: nada se corta ni se superpone (CA-13.7 del admin).
12. **Mozo con rol equivocado, sin sesión, sin fila**: HU-2 (CA-2.5, CA-2.6).

---

## 7. Referencias

- Lenguaje visual aprobado: `docs/design/admin-boceto-aprobado.md` (sello, píldoras, estados lechuga/mostaza/tomate); maquetas del admin como modelo de entrega: `docs/design/admin/maquetas/README.md`.
- Colores y pares de contraste permitidos/prohibidos: `docs/design/direccion-de-arte.md` §2; movimiento: §6.
- Los mockups de cocina/salón de la landing (`components/landing/mockups/Pieces.tsx`) son una referencia visual posible; no se verificó su detalle.
- Referencias externas de mercado: no se investigaron en esta tanda (la fuente de verdad es el repo y el pedido del Director).

---

## 8. Decisiones del Director (2026-10-15)

Fuente: respuestas del Director registradas en `docs/ESTADO-COCINA-SALON.md` (líneas 11-18). Cubren las 10 preguntas de v0.1 y las 13 del README de las maquetas. Ya no hay preguntas abiertas (salvo la sección 11, que son diferencias de documentos, no del Director).

1. **Tema: CLARO** en todo (Cocina, Salón, shell, pantallas vacías y sin permiso), como la Carta y las maquetas `cocina.html`, `salon.html`, `shell.html`. La variante oscura NO se construye; un tema oscuro para todos los paneles va al backlog. Reemplaza una primera respuesta que había dicho oscuro.
2. **Paleta: siempre MenuSky**, sin el color del restaurante. `StaffShell` deja de teñirse (D-23).
3. **Pomo: sí, solo en el estado vacío de Cocina** ("No hay pedidos pendientes."), decorativo y con el mismo texto (`cocina-vacia.html`). Levanta la prohibición de `docs/specs/admin.md` CA-11.3 solo para ese estado. En Salón y en las pantallas sin permiso no hay Pomo (esas llevan logo e ícono).
4. **Shell propio liviano de staff** con el lenguaje del admin: celular = encabezado + menú de cuenta (para pasar de Cocina a Salón el admin toca 2 veces, como en el admin); tablet y escritorio (>= 768 px) = banda marrón con los paneles del rol. Sin barra de pestañas.
5. **Tamaños grandes: SÍ** (mesa 24-28 px, renglones 20 px en tablet y 18 px en celular, botones 56 px; 3 comandas por fila en tablet horizontal y 1 en celular), con **prueba final en tablet real**.
6. **Aviso de desconexión: backlog.** No se construye (riesgo R-1 aceptado).
7. **Anuncios para lector de pantalla:** "Pedido nuevo: <mesa>", "Llamado de <mesa>: <motivo>", "Pedido listo: <mesa>", texto oculto.
8. **Etiqueta "Nuevo"** estática en la esquina de la tarjeta, más el punto con pulso solo si el movimiento está permitido.
9. **Textos nuevos:** (a) "Todavía no hay mesas." (b) Salón sin llamados ni listos queda sin mensaje, como hoy. (c) Los textos de estado de mesa NO se unifican con los del admin.
10. **Mockups de la landing: sin tocar** (backlog).
11. **Salón en >= 1024 px:** acciones (llamados y listos) a la izquierda y "Mesas" fija a la derecha; en celular, mesas en 2 columnas.
12. **Colores de mesa:** Libre verde claro, Con pedido mostaza clara, Listo cheddar lleno con sombra sello, Llamando tomate lleno.
13. **Píldora "En preparación"** en las comandas ya tomadas.
14. **Cantidades en los títulos de sección** ("Llamados de mozo · 3", "Listos para llevar · 2").
15. **"Cerrar sesión" con texto visible** (>= 1024 px, menú de cuenta del celular y pantallas sin permiso).
16. **Pantallas sin permiso** con logo e ícono, sin Pomo.

---

## 9. Riesgos y notas por rol

- **R-1 (producto)** Sin aviso de desconexión, una tablet sin red parece "sin pedidos" y la cocina no se entera (K-16). El Director lo mandó al backlog (sección 10): riesgo ACEPTADO por ahora.
- **R-2 (producto)** Una lectura inicial fallida se ve como vacío (K-15, D-12). Preexistente, no cambia el veredicto.
- **R-3 (producto)** Pasar de oscuro a claro cambia el aspecto en cocinas con poca luz (brillo, reflejos). El Director eligió claro (decisión 1); mitigación: prueba en tablet real en el lugar de uso, con el brillo habitual.
- **R-4 (UX)** Aumentar tamaños reduce cuántas tarjetas entran por pantalla. Equilibrio a mostrar en las maquetas con 1280x800 y 390x844.
- **R-5 (regresión)** Tocar `TableGrid.tsx` puede romper el tipo `TableStatus` que usa el admin (F-10). Mantener el contrato.
- **R-6 (regresión)** El sonido y el toast solo en `/floor` (CA-8.6 del admin) comparten hooks con el admin (`useWaiterCalls`, `notify`); no cambiar el valor por defecto.
- **Frontend**: maquetas HTML estáticas primero (Cocina con pedidos en `received`, en `in_kitchen`, vacía; Salón con llamados, listos y mesas en los 4 estados; accesos sin permiso), en 360x640, 390x844, 768x1024, 1024x768 y 1280x800; mismas fuentes y tokens que `app/brand.css`; sin tocar `app/` ni `components/` hasta la aprobación.
- **Backend**: sin tareas previstas. Si el Frontend necesita un dato nuevo (p. ej. conteos para el shell), lo pide al Líder; no se agrega en esta fase.
- **Seguridad**: auditar que el rediseño no abra datos antes de la redirección por rol (CA-2.6), que `NoStaffAccess`/`NotAdminAccess` no muestren datos de otro restaurante, y que no se agreguen consultas nuevas.
- **QA**: reutilizar `scripts/mock-supabase/` para los 3 roles; probar los CA-NR con red cortada; adjuntar capturas por viewport, pares de contraste, salida de axe y notas con lector de pantalla; la prueba de tablet real y de iPhone queda como pendiente registrada, no bloqueante, como en el admin (`docs/specs/admin.md` CA-13.11).
- **Líder**: el shell ya está decidido (D-23: una sola suscripción de pendientes, `useStaffPendingCounts`); medir las líneas base siguientes; medir líneas base de CA-NR.8, CA-7.2 y CA-7.3; confirmar D-19 antes de dar por buena la tipografía.

---

## 10. Backlog (decidido por el Director; NO se construye en esta fase)

1. **Tema oscuro para TODOS los paneles** (admin, Cocina y Salón), como función única; lo decide el Director más adelante. `cocina-oscuro.html` queda solo como referencia.
2. **Aviso de desconexión** en Cocina y Salón (K-16, R-1): hoy una tablet sin red parece "sin pedidos".
3. **Mockups de cocina/salón de la landing** (`components/landing/mockups/Pieces.tsx`): revisar si quedan muy distintos tras publicar el rediseño (S-5).

---

## 11. Diferencias entre la spec, las maquetas y los documentos (NO decididas; las resuelve el Líder o el Director)

1. **Navegación en celular vs CA-2.2 / CA-2.3.** CA-2.2 dice que "los enlaces visibles" son los del rol, y CA-2.3 que el indicador de pendientes se ve "en la navegación". En la maqueta aprobada, en celular los enlaces están dentro del menú de cuenta (2 toques; solo se ve el punto rojo en el botón de cuenta). Hay que decidir si CA-2.2/2.3 se leen "visibles en el menú de cuenta" en celular (CA-8.10 lo describe así).
2. **Columnas de "Mesas" en >= 1024 px.** El README de las maquetas dice "acciones a la izquierda y 'Mesas' fija a la derecha, en 3 columnas". No queda claro si son 3 columnas de mesas dentro del panel derecho o 3 columnas de página. CA-8.5 solo fija las dos zonas. Hoy son 3/4/6 columnas (F-7).
3. **CA-5.1 (anuncios en vivo) vs CA-NR.11 ("sin cambios de lógica").** Detectar qué pedido o llamado es nuevo para anunciarlo, y mostrar el contador en los títulos, puede requerir código nuevo de cliente en los tableros. CA-NR.11 solo admite marcado, clases y atributos. Falta decidir si se amplía la excepción.
4. **CA-3.1 (opciones, nota y hora >= 16 px) sin respaldo en la medición de las maquetas.** `capturas-salida.txt` informa 14 px como mínimo visible (etiqueta "Nuevo", rol, meta del menú) y mesa y renglones, pero no dice el tamaño de opciones, nota y hora. No es una contradicción comprobada: está sin verificar.
5. **Maquetas y README desactualizados frente a la decisión de tema.** El README de las maquetas todavía dice que se aplican los defaults "claro..." pero deja la pregunta 1 abierta y documenta `cocina-oscuro.html`; en `docs/ESTADO-COCINA-SALON.md` la respuesta 1 (líneas 14-18) sigue diciendo OSCURO, con captura de Salón oscuro como paso pendiente, y la línea 11 la reemplaza. Conviene corregirlos para que nadie construya la variante oscura.
6. **Ancho de página no capturado.** El CSS de las maquetas usa 4 columnas de comandas desde 1440 px; no hay captura ni medición a 1440x900 ni a 360x640 (README, "Qué NO cubre"), y CA-3.4 solo fija 1 / 2 / 3 columnas hasta 1280 px.
7. **"Cerrar sesión" entre 768 y 1023 px.** La decisión 15 pide texto visible; la maqueta lo muestra como solo ícono en ese rango (README). CA-8.4 lo permite; el Director aprobó "como está en las maquetas".

### 11.1 Resoluciones del Líder (2026-10-15; criterio: el Director aprobó "como está en las maquetas"; D-24)
1. Navegación en celular: manda la maqueta (`shell.html`): enlaces dentro del menú de cuenta, 2 toques, punto rojo visible. CA-2.2 y CA-2.3 ajustados.
2. Salón >= 1024 px: 2 columnas de página y la grilla de "Mesas" en 3 columnas dentro de su panel, como `capturas/salon-1280x800.png`. CA-8.5 ajustado.
3. Anuncios para lector de pantalla y contador en los títulos: se permite el código cliente mínimo, derivado de los datos que la pantalla ya tiene, sin consultas nuevas ni cambios de tiempo real. CA-NR.11 ampliado.
4. CA-3.1 (>= 16 px en opciones, nota, hora y "Cuenta ... hoy"): rige; el Frontend lo mide y ajusta en la construcción.
5. Documentos desactualizados sobre el tema: corregidos (README de las maquetas y ESTADO-COCINA-SALON.md). Rige el tema CLARO.
6. 1440x900 y 360x640: el Frontend verifica y ajusta en la construcción (4 columnas de comandas desde 1440 px como en el CSS de las maquetas; sin scroll horizontal en 360 px).
7. "Cerrar sesión" entre 768 y 1023 px: como la maqueta (ícono con nombre accesible); con texto visible desde 1024 px y en el menú de cuenta del celular.
