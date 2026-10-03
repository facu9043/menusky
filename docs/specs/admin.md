# Spec: Fase ADMIN de MenuSky (rediseño del panel de administración, seguridad previa y tema por defecto)

Estado: **v1.0, borrador para el Director** (2026-10-03). Autor: Product Owner.
Rama de trabajo: `feat/admin-redesign` (worktree `C:\Users\Windows10\Desktop\menusky-admin`).
Stack: ver `docs/STACK.md`. Esta spec no define tecnología ni arquitectura (eso es del Líder Técnico).
Fuente visual principal (dirección de arte APROBADA por el Director el 2026-10-03): `docs/design/admin-boceto-aprobado.md`. Paleta y tipografía: `docs/design/direccion-de-arte.md`. Mascota: `docs/design/mascota/mascota.md`. Modelo de formato: `docs/specs/login.md` v1.1. Hallazgos de seguridad: `docs/security/login-2026-10-02.md` (SEC-LG-06, SEC-LG-07, "Evaluación de R-2").

Convenciones (las mismas de `docs/specs/login.md`):
- "Hecho verificado" = respaldado por un archivo de ESTE repositorio (se cita la ruta). Toda afirmación sobre el código sale de este repo.
- "Decisión del Director" = texto del pedido o respuesta del Director.
- "Default del equipo, el Director puede cambiarlo" = decisión tomada por el equipo por falta de respuesta; se implementa salvo que el Director diga otra cosa.
- "Propuesta del PO (a confirmar)" = detalle que el Líder/Frontend pueden ajustar sin cambiar el criterio de fondo.
- "Línea base: a medir por el Líder" = no hay número medido todavía; el PO no lo inventa.
- Criterios: CA-x.y (Dado / Cuando / Entonces). Se prueban sobre `npm run build && npm run start` local. Viewports: **360x640** y **390x844** (celular), **768x1024** (tablet), **1440x900** (escritorio); además **320 px de ancho** solo para la prueba de scroll horizontal.
- Pantalla "táctil" = `pointer: coarse` (celulares y tablets).
- Verificación de seguridad: LOCAL, sin base real (ver 5.A, CA-RNF.5 y CA-RNF.6). La migración la aplica el Director en la base real.

---

## 0. Resumen ejecutivo (lectura de 1 minuto)

1. **Seguridad primero** (aprobado por el Director): HU-1 (SEC-LG-06: la carta solo se escribe con rol admin), HU-2 (SEC-LG-07: pedidos no legibles en masa ni insertables con total arbitrario, sin romper el flujo del cliente por QR) y HU-3 (R-2: `/kitchen` y `/floor` validan rol; el login manda al mozo a `/floor`).
2. **Tema por defecto**: la paleta de la landing pasa a ser el preset "MenuSky", primero de la lista y predeterminado (HU-4). Los 7 temas actuales siguen. Ningún tema ya guardado se rompe.
3. **Admin nuevo** con el lenguaje visual de la landing, según el boceto aprobado: menú lateral en escritorio y barra de pestañas abajo en celular (Inicio, Carta, Mesas, Estilo) (HU-5); Carta con interruptores estilo iOS (HU-6, HU-7); Mesas en vivo con "Imprimir todos" (HU-8); Inicio NUEVO con el resumen del día (HU-9); Apariencia con la MISMA función y otro aspecto (HU-10); Pomo en los estados vacíos (HU-11).
4. **Nada de lo que hoy funciona se rompe**: el inventario verificado de la sección 2.3 (F-01 a F-50) se convierte en criterios de no-regresión (CA-NR.x).
5. **Ninguna pregunta bloquea la construcción** (sección 9). Hay 7 con default aplicado; el Director puede cambiarlas después.

---

## 1. Objetivo y contexto

### 1.1 Pedido del Director (textual)
"La vista de administración me gustaría que se viera más como la que estamos promocionando en la landing, con botones más intuitivos (y la forma de disponible/sin stock me gusta ese formato estilo iOS). La actual se ve muy apagada. Mejorar bastante el aspecto visual y que tenga una vista en móvil (por si más adelante lo convierto en una app móvil y que puedan administrar por ahí)."
Además: "utiliza los colores de la landing para dejarlo como 'por defecto'... implementá todo súper intuitivo, lindo, llamativo, distintivo y característico de MenuSky; que el panel de administración se vea fluido y rápido".

### 1.2 Decisiones ya tomadas por el Director (no son preguntas)
1. Las maquetas de Carta y Mesas (escritorio y celular) están APROBADAS: `docs/design/admin-boceto-aprobado.md`. Los cambios visibles que se aparten de ellas se consultan al Director.
2. Animaciones: NO se limitan por la PC actual del Director (Celeron, es de prueba; pronto usa una de 16 GB). Sí se respeta `prefers-reduced-motion` y las buenas prácticas (animar `transform`/`opacity`). La medición de rendimiento se hace DESPUÉS en la PC de 16 GB: esta spec no trae metas numéricas de Lighthouse. Ese criterio queda "pendiente de medición" y NO bloquea esta fase (CA-RNF.4).
3. Tema por defecto: la paleta de la landing es un preset "MenuSky" en `lib/theme/presets.ts`, primero en la lista y por defecto. Los 7 temas existentes siguen disponibles. No se rompen los restaurantes con tema guardado (`restaurants.theme` guarda el objeto de colores completo).
4. Seguridad (va primero): SEC-LG-06, SEC-LG-07 y R-2 (con la parte 2 y 3 de la propuesta de la auditoría; ver HU-3). La migración la aplica el Director en la base real; el equipo la verifica localmente sin base real.
5. Alcance del admin: shell con menú lateral (escritorio) y barra de pestañas abajo (celular: Inicio, Carta, Mesas, Estilo); Carta y Mesas según el boceto; Inicio NUEVO; Apariencia con rediseño visual y la MISMA función; Pomo en los estados vacíos.
6. NO cambia la función de lo que ya existe (inventario verificado en 2.3 -> CA-NR.x).
7. Deuda técnica de marca (la decide el Líder): unificar los tokens `--ms-*` en un archivo de marca común y centralizar Bricolage Grotesque. Entra como requisito no funcional verificable (CA-RNF.1).
8. Inicio y Apariencia no tienen maqueta: se construyen con el mismo lenguaje y se muestran al Director con capturas en el informe (no bloquean la construcción).
9. Solo se frena por preguntas que bloqueen de verdad; para lo demás, un default razonable.

### 1.3 Problema y objetivo
- Problema: el admin actual se ve "apagado": es oscuro con tinte del color del restaurante (`components/staff/StaffShell.tsx`), con navegación de tres pastillas (`components/admin/AdminNav.tsx`), botones de texto "Disponible/Sin stock" (`components/admin/MenuItemRow.tsx`), sin vista pensada para celular, sin resumen del día y sin forma de ver el estado de las mesas ni de imprimir todos los QR. Además la auditoría de seguridad dejó dos riesgos de severidad Media abiertos (SEC-LG-06 y SEC-LG-07) y una validación de rol faltante en las pantallas de cocina y salón (R-2).
- Para quién: el dueño o encargado del restaurante (rol `admin`), muchas veces desde el celular, durante el servicio y con las manos ocupadas.
- Objetivo: un admin con la identidad de MenuSky (cálido, de hamburguesa, "sello" marrón), usable con una mano en el celular, rápido (respuesta inmediata a cada toque), que muestre de un vistazo cómo viene el día, con la seguridad de roles cerrada en la base y sin perder ninguna función actual.
- "Intuitivo" se mide así (prueba con 3 personas del rubro o ajenas al proyecto, notas como evidencia): sin explicación previa, 3 de 3 logran (a) marcar un plato "Sin stock hoy" en <= 10 s desde abrir `/admin` en celular, (b) crear una mesa y descargar su QR en <= 60 s y (c) ver cuántas mesas están ocupadas en <= 5 s. Las capturas del Director confirman "intuitivo, lindo, llamativo y característico de MenuSky" (CA-5.20).

---

## 2. Hechos verificados del punto de partida

### 2.1 Estructura y comportamiento del admin actual
1. Rutas del admin: `app/admin/page.tsx` redirige a `/admin/menu`; existen `app/admin/menu/page.tsx`, `app/admin/menu/[itemId]/page.tsx`, `app/admin/mesas/page.tsx`, `app/admin/apariencia/page.tsx`. No existe una pantalla de Inicio.
2. `app/admin/layout.tsx` (líneas 9-11): sin fila en `staff_users` (o sin sesión) -> `NoStaffAccess`; rol distinto de `admin` -> `NotAdminAccess` (texto "Esta sección es solo para administradores", `components/staff/NotAdminAccess.tsx`). Luego arma `StaffShell` + `StaffHeader` (título fijo "Administración") + `AdminNav` + `<main>`.
3. `components/staff/StaffShell.tsx`: el admin, la cocina y el salón comparten un cascarón OSCURO (clase `dark`) con tinte del `accentPrimary` del restaurante (`color-mix`) y la fuente Fraunces para títulos. Es decir, hoy el admin hereda el tema del restaurante. (El comentario de `components/admin/ThemeMockupCard.tsx` dice que `/admin` "nunca debe heredar el tema del restaurante", pero el código del cascarón lo hace: contradicción preexistente.)
4. `components/staff/StaffHeader.tsx`: muestra título, "restaurante · nombre del usuario", insignia de rol y `LogoutButton` (cierra sesión y va a `/login`, `components/staff/LogoutButton.tsx`). Incluye `StaffNav` con enlaces Cocina / Salón / Admin (Admin solo si es admin) y un punto rojo de pendientes (`lib/realtime/useStaffPendingCounts.ts`: cocina = pedidos `received`; salón = pedidos `ready` + llamados `pending`).
5. `components/admin/AdminNav.tsx`: tres enlaces (Carta `/admin/menu`, Mesas `/admin/mesas`, Apariencia `/admin/apariencia`), activo por `pathname.startsWith`.
6. Los errores de lectura no se distinguen de "vacío": `lib/admin/getAdminMenu.ts` (línea 58, `categoryRows ?? []`), `lib/admin/getAdminTables.ts` (línea 18, `data ?? []`) y `lib/admin/getRestaurantTheme.ts` (línea 14) descartan el error. Hoy una lectura fallida se vería como "Todavía no hay categorías".
7. Los cambios de datos del admin se hacen desde el navegador con la sesión del usuario (`lib/admin/*.ts` usan `lib/supabase/client`) y luego `router.refresh()`. La disponibilidad de un plato NO es optimista: espera la respuesta (`components/admin/MenuItemRow.tsx` líneas 18-28).
8. El plato nuevo se crea de inmediato en la base con nombre "Nuevo plato", precio 0 y orden = cantidad de platos de la categoría, y se navega a su edición (`components/admin/CategoryList.tsx` líneas 25-34; `lib/admin/menuItems.ts` líneas 3-12). La columna `is_available` nace en `true` (`supabase/migrations/0001_init.sql` línea 43): un "Nuevo plato" abandonado queda visible para el cliente a $0 (ver riesgo R-4 y pregunta 7).
9. `lib/admin/categories.ts` tiene `renameCategory` (líneas 11-15) pero NINGÚN componente lo usa (búsqueda de `renameCategory` en `components/**`: 0 resultados). Hoy no hay forma de renombrar una categoría desde la interfaz. Tampoco hay reordenamiento de categorías, platos ni opciones, ni edición del nombre/precio de una opción ya creada (solo crear y eliminar: `lib/admin/optionChoices.ts`).
10. Mesas: `components/admin/TableList.tsx` lista las mesas con "Descargar QR" (`/api/qr/<qrToken>`, adjunto PNG `qr-<mesa>.png`, `app/api/qr/[qrToken]/route.ts`), "Ver carta" (`/m/<qrToken>` en pestaña nueva con `rel="noopener noreferrer"`) y eliminar con confirmación que dice "El QR impreso dejará de funcionar" (línea 24). No muestra estado en vivo ni hay "Imprimir todos". El QR codifica `NEXT_PUBLIC_SITE_URL/m/<qrToken>` (`lib/qr.ts`), PNG de 512 px con margen 2.
11. Estado de mesa en el panel de salón (`components/floor/FloorBoard.tsx` líneas 34-49): prioridad `calling` (hay llamado pendiente) > `ready` (hay pedido `ready`) > `active` (hay pedido activo) > `free`. "Pedido activo" = estados `received`, `in_kitchen`, `ready` (`lib/realtime/useFloorOrders.ts` línea 7; `lib/orders/getFloorOrders.ts`). Etiquetas actuales: Llamando / Listo / Con pedido / Libre (`components/floor/TableGrid.tsx`). El total por mesa sale de `lib/orders/getTableTotals.ts`: suma de pedidos de "hoy" no cancelados, cortando el día con la hora del servidor (`setHours(0,0,0,0)`, líneas 10-11); no existe "sesión de mesa" en el esquema (comentario del archivo). La zona horaria del servidor de producción no está en el repo: **línea base: a medir/confirmar por el Líder**.
12. Los hooks de salón tienen efectos secundarios: `lib/realtime/useWaiterCalls.ts` (líneas 41-42) hace sonar `playChime()` y muestra `toast.info("Una mesa está llamando al mozo")`; `lib/realtime/useOrdersBoard.ts` (línea 53) hace sonar el aviso en cada pedido nuevo. Motivos de llamado: "Pide la cuenta", "Tiene una consulta", "Llama al mozo" (`lib/waiterCalls/reasons.ts`).
13. Temas: `lib/theme/presets.ts` tiene 7 presets (Default, Glaciar, Galaxia, Madera, Neobrutalista, Neumorfismo, Claymorfismo); `DEFAULT_THEME = THEME_PRESETS[0].theme` (línea 113). Un restaurante con `theme` nulo usa `DEFAULT_THEME` tanto en el admin (`lib/admin/getRestaurantTheme.ts` línea 14) como en la carta del cliente (`app/m/[tableId]/layout.tsx` línea 39). `findPresetByTheme` compara los 7 colores (sin distinguir mayúsculas) y el `style` (ausente = "soft"). `supabase/migrations/0002_restaurant_theme.sql` dice que nulo = tema "default" hardcodeado. El seed (`supabase/seed.sql` línea 20) crea el restaurante sin `theme` (nulo).
14. La landing tiene su propia copia de los 7 temas (`components/landing/Customize.tsx`, líneas 6-13 y 121: "los 7 temas ... Default, Glaciar, ..."): no lee `lib/theme/presets.ts`.
15. Tokens de marca `--ms-*`: están DUPLICADOS en `app/(landing)/landing.css` y `app/login/login.css` (mismos valores; `docs/STACK.md`, "Deuda"). Bricolage Grotesque se carga en dos layouts distintos (`app/(landing)/layout.tsx`, `app/login/layout.tsx`). El admin no la carga hoy; carga Fraunces (`components/staff/StaffShell.tsx`).
16. Mascota: `components/brand/mascot/index.tsx` exporta `Mascot` (Pomo). Hoy se usa solo en `/login` y la regla vigente es "aparece solo en /login" (`docs/specs/login.md` CA-3.8; `docs/design/mascota/mascota.md`). Sus poses y animaciones viven en `app/login/login.css`. Las pruebas de originalidad de Pomo (CA-3.4 puntos 2 y 5 del login) siguen PENDIENTES (`docs/specs/login.md` R-7).
17. `app/layout.tsx` monta `<Toaster position="top-center">` (sonner) para toda la app; el admin usa `toast.error/success` en cada acción con los textos que se listan en 2.3.

### 2.2 Hechos verificados de seguridad (punto de partida)
1. `supabase/migrations/0001_init.sql` líneas 188-202: las políticas "staff manage categories / menu_items / option groups / option choices" son `for all` con `is_staff_of(...)`. `is_staff_of` (líneas 138-145) NO mira el rol: waiter y kitchen escriben la carta. `is_admin_of` existe (líneas 147-155). Hallazgo SEC-LG-06 (Media, Potencial; `docs/security/login-2026-10-02.md`).
2. Mismo archivo, líneas 179-186: "public insert orders / order_items" `with check (true)` y "public read orders / order_items" `using (true)`. Con la clave pública cualquiera puede listar los pedidos de todos los restaurantes y crear pedidos con `total` arbitrario. Hallazgo SEC-LG-07 (Media, Potencial).
3. Mismo archivo, líneas 205-212: "staff update orders" y "staff manage waiter_calls" usan `is_staff_of` (cualquier rol del restaurante). No hay política de lectura de `orders` para staff: hoy se apoyan en la lectura pública (línea 185).
4. `app/api/orders/route.ts` calcula el total con los precios de la base (líneas 134-137), valida disponibilidad (409, líneas 91-100) y crea el pedido con el cliente de Supabase del servidor con la clave pública (`lib/supabase/server`); `.insert(...).select("id")` (líneas 148-152) depende de las políticas públicas de insert y select. `SUPABASE_SERVICE_ROLE_KEY` figura en `.env.local.example` y `README.md` ("solo para scripts server-side") pero NO se usa en el código de la app (búsqueda en el repo fuera de `docs/`, `node_modules`, `.next`).
5. La pantalla "Tu pedido" (`app/m/[tableId]/pedido/[orderId]/page.tsx`) lee con `lib/orders/getOrder.ts` (cliente servidor con clave pública: pedido y renglones por id). El estado se actualiza solo con `lib/realtime/useOrderStatus.ts` (suscripción Realtime `postgres_changes` sobre `orders` con filtro `id=eq.<orderId>`; `components/client/OrderStatusTracker.tsx`). Realtime está habilitado para `orders` y `waiter_calls` (`0001_init.sql` líneas 240-241). Cerrar la lectura pública de `orders` afecta a `getOrder`, a la suscripción del cliente, y a TODAS las lecturas del staff que hoy dependen de la política pública (`lib/orders/getFloorOrders.ts`, `getKitchenOrders.ts`, `getTableTotals.ts`, `fetchBoardOrder.ts`, `lib/realtime/useStaffPendingCounts.ts`).
6. `/api/waiter-calls` (`app/api/waiter-calls/route.ts`) inserta el llamado con la clave pública; la política "public insert waiter_calls" (línea 182) no es parte de SEC-LG-06/07 y NO se toca en esta fase.
7. `proxy.ts` -> `lib/supabase/middleware.ts` exige sesión en `/kitchen`, `/floor` y `/admin` (redirige a `/login?redirect=<ruta>`) pero no mira el rol (líneas 34-44). `app/kitchen/page.tsx` y `app/floor/page.tsx` llaman a `getStaffUser()` y, si hay fila, muestran el tablero sin importar el rol; solo `/admin` valida el rol (`app/admin/layout.tsx`).
8. `components/auth/LoginForm.tsx` líneas 108-116: con `?redirect=` válido va a esa ruta sin consultar `staff_users`; sin él, `staff?.role === "admin" ? "/admin" : "/kitchen"` (el mozo y quien no tiene fila van a `/kitchen`). Esto contradice lo nuevo que pide HU-3 para el mozo; reemplaza `docs/specs/login.md` CA-4.2 solo en ese punto.
9. Storage de fotos (`supabase/migrations/0003_menu_photos_storage.sql`): ya es admin-only para subir, reemplazar y borrar; lectura pública. No cambia.
10. `tables` es de lectura pública (`0001_init.sql` línea 173), con lo cual los `qr_token` de todas las mesas son legibles con la clave pública, y `generateQrToken` usa `Math.random` (`lib/admin/generateQrToken.ts`). Fuera del alcance de esta fase; ver riesgo R-8.

### 2.3 Inventario de funciones actuales del admin y criterios de no-regresión

Cada fila es una función que HOY existe (evidencia = archivo). Su criterio **CA-NR.x** debe cumplirse en el admin nuevo, en escritorio (1440x900) Y en celular (360x640), con la sesión de un `admin` y los cambios visibles en la base (y, cuando se indica, en la carta del cliente `/m/<qrToken>`). Los textos de error entre comillas se conservan literalmente (toasts de `sonner`). Cómo se hace en la interfaz nueva (hoja, panel, menú ⋯) lo define el Frontend con el boceto; lo que no puede cambiar es el resultado.

| Id | Función actual | Evidencia | Criterio de no-regresión |
|---|---|---|---|
| F-01 | Acceso solo para `admin` | `app/admin/layout.tsx` 9-11; `lib/supabase/middleware.ts` 34-44 | **CA-NR.01** Dado un visitante sin sesión, cuando abre `/admin`, `/admin/menu`, `/admin/mesas` o `/admin/apariencia`, entonces va a `/login?redirect=<ruta>`. Dado un autenticado sin fila de staff, entonces ve `NoStaffAccess`. Dado un `waiter` o `kitchen`, entonces ve `NotAdminAccess` ("Esta sección es solo para administradores") y NINGÚN dato de carta, mesas, pedidos ni tema (ni siquiera en el HTML). |
| F-02 | Cerrar sesión | `components/staff/LogoutButton.tsx` | **CA-NR.02** Dado un admin en el admin nuevo (escritorio y celular), cuando toca "Cerrar sesión", entonces se cierra la sesión y llega a `/login`; al volver atrás y abrir `/admin` se pide login de nuevo. |
| F-03 | Identificación del local, de la persona y del rol | `components/staff/StaffHeader.tsx` 26-30 | **CA-NR.03** Dado un admin logueado, entonces en el shell se ve el nombre del restaurante y el de la persona (escritorio: tarjeta del menú lateral; celular: encabezado o menú de cuenta) y el rol "Admin". |
| F-04 | Ir a Cocina y a Salón desde el admin, con punto de pendientes | `components/staff/StaffNav.tsx` | **CA-NR.04** Dado un admin, entonces desde el shell puede ir a `/kitchen` y a `/floor` (escritorio: grupo "Paneles" del menú lateral; celular: menú de cuenta). Dado un pedido `received` o un pedido `ready`/llamado pendiente, entonces el enlace correspondiente muestra un indicador (Debería: el mismo criterio de pendientes de `lib/realtime/useStaffPendingCounts.ts`). |
| F-10 | Ver TODA la carta (incluye platos sin stock), ordenada por `sort_order` | `lib/admin/getAdminMenu.ts` 38-82 | **CA-NR.10** Dado una carta con 3 categorías y platos disponibles y no disponibles, cuando se abre Carta con "Todas", entonces se ven todas las categorías y todos los platos (disponibles y sin stock) en el mismo orden que antes. |
| F-11 | Crear categoría | `components/admin/CategoryDialog.tsx`; `lib/admin/categories.ts` 3-9 | **CA-NR.11** Dado el formulario de nueva categoría, cuando se escribe "Postres" (con espacios alrededor) y se confirma, entonces aparece al final con el nombre "Postres" (recortado). Con nombre vacío o solo espacios no se crea. Si falla: toast "No se pudo crear la categoría" y el nombre escrito se conserva. |
| F-12 | Eliminar categoría con confirmación (borra también sus platos y opciones) | `components/admin/CategoryList.tsx` 36-52; `0001_init.sql` 38, 53, 61 (`on delete cascade`) | **CA-NR.12** Cuando se elige eliminar la categoría "X" con N platos, entonces se pide confirmación con el texto `¿Eliminar la categoría "X" y sus N platos?`. Cancelar no cambia nada. Confirmar borra la categoría y sus platos. Si falla: toast "No se pudo eliminar la categoría". |
| F-13 | Crear plato en una categoría y abrir su edición | `CategoryList.tsx` 25-34; `lib/admin/menuItems.ts` 3-12 | **CA-NR.13** Cuando se crea un plato en la categoría "X", entonces se crea "Nuevo plato", precio 0, al final de "X" (orden = cantidad previa), y se abre su edición. Si falla: toast "No se pudo crear el plato". (Ver pregunta 7 sobre el riesgo de dejarlo disponible.) |
| F-14 | Cambiar disponibilidad (Disponible / Sin stock) desde la lista | `components/admin/MenuItemRow.tsx` 18-28; `lib/admin/menuItems.ts` 37-44 | **CA-NR.14** Cuando se pasa un plato a "Sin stock hoy", entonces en `/m/<qrToken>` deja de verse (`lib/menu/getTableMenu.ts` 85) y `POST /api/orders` con ese plato responde 409 "Uno de los platos ya no está disponible" (`app/api/orders/route.ts` 91-100); al volver a "Disponible" reaparece. Si falla: toast "No se pudo actualizar la disponibilidad". |
| F-15 | Eliminar plato con confirmación (desde la lista y desde la edición) | `MenuItemRow.tsx` 30-40; `components/admin/MenuItemEditForm.tsx` 63-71 | **CA-NR.15** Cuando se elige eliminar el plato "X", entonces se pide confirmación `¿Eliminar "X" de la carta?`; cancelar no cambia nada; confirmar lo borra (con sus grupos y opciones). Si se hace desde la edición, vuelve a la carta. Si falla: toast "No se pudo eliminar el plato". |
| F-16 | Editar plato: nombre (obligatorio), descripción, precio, disponibilidad | `MenuItemEditForm.tsx` 17-61, 77-102, 142-146; `lib/admin/menuItems.ts` 22-35 | **CA-NR.16** Cuando se cambia nombre, descripción, precio (>= 0, sin decimales en el control actual: `step=1`) y disponibilidad y se guarda, entonces se persisten y se ven en `/m/<qrToken>`; toast "Guardado". Descripción vacía se guarda como vacía (nulo). Nombre vacío no se guarda. Precio no numérico se guarda como 0 (comportamiento actual: `Number(price) \|\| 0`). Si falla: toast "No se pudo guardar el plato" y lo escrito se conserva. |
| F-17 | Foto del plato: subir archivo o pegar URL; quitar | `MenuItemEditForm.tsx` 28-41, 104-140; `lib/admin/uploadMenuItemPhoto.ts` | **CA-NR.17** Cuando se elige un archivo de imagen, entonces se sube al bucket `menu-photos`, se muestra la vista previa con el estado "Subiendo..." mientras tanto y la URL queda en el plato al guardar. Cuando se pega una URL, se usa tal cual. Cuando se vacía la URL y se guarda, el plato queda sin foto. Si falla la subida: toast "No se pudo subir la foto". |
| F-18 | Grupos de opciones: crear, editar (nombre, "Una opción"/"Varias opciones", "Obligatorio") y eliminar con confirmación | `components/admin/NewOptionGroupDialog.tsx`; `components/admin/OptionGroupCard.tsx` 28-53; `lib/admin/optionGroups.ts` | **CA-NR.18** Cuando se crea un grupo (nombre obligatorio, tipo, obligatorio sí/no), entonces aparece en el plato; cuando se cambia nombre/tipo/obligatorio, el botón de guardar solo aparece con cambios y al guardar se persisten; cuando se elimina, se pide `¿Eliminar el grupo "X"?`. Errores: "No se pudo crear el grupo de opciones", "No se pudo guardar el grupo", "No se pudo eliminar el grupo". En la carta del cliente un grupo obligatorio exige elegir (`app/api/orders/route.ts` 110-115) y uno de "Una opción" admite solo una (116-121). |
| F-19 | Opciones (elecciones) de un grupo: agregar con extra de precio y eliminar | `OptionGroupCard.tsx` 55-83, 112-164; `lib/admin/optionChoices.ts` | **CA-NR.19** Cuando se agrega la opción "Papas fritas" con extra 500, entonces aparece como "Papas fritas (+$500)" (formato de `lib/format.ts`) y en la carta del cliente suma al total; extra vacío = 0; nombre vacío no se agrega. Eliminar una opción la borra sin pedir confirmación (comportamiento actual). Errores: "No se pudo agregar la opción", "No se pudo eliminar la opción". |
| F-20 | Entrar directo a un plato por URL | `app/admin/menu/[itemId]/page.tsx` | **CA-NR.20** Dado el plato `<id>`, cuando se abre `/admin/menu/<id>`, entonces se ve su edición completa (datos y grupos de opciones); con un `<id>` que no existe en el restaurante, 404 (`notFound()`), y con un `<id>` de OTRO restaurante, 404 (no se filtra información). |
| F-30 | Listar mesas por nombre | `lib/admin/getAdminTables.ts` | **CA-NR.30** Dado un restaurante con mesas, entonces se listan todas ordenadas por nombre como hoy. |
| F-31 | Crear mesa (nombre obligatorio) con QR único | `components/admin/NewTableForm.tsx`; `lib/admin/tables.ts` 4-11; `lib/admin/generateQrToken.ts` | **CA-NR.31** Cuando se crea "Mesa 7" (con espacios alrededor), entonces aparece "Mesa 7" con un QR propio (`qr_token` único tipo `mesa-7-xxxxxx`); nombre vacío no se crea. Si falla: toast "No se pudo crear la mesa". |
| F-32 | Descargar el QR de la mesa | `app/api/qr/[qrToken]/route.ts`; `lib/qr.ts` | **CA-NR.32** Cuando se toca "Descargar", entonces se baja un PNG `qr-<nombre-en-minúsculas-con-guiones>.png` que, al escanearse, abre `<NEXT_PUBLIC_SITE_URL>/m/<qrToken>`. Con un token inexistente, 404 JSON. |
| F-33 | Ver la carta de la mesa en pestaña nueva | `components/admin/TableList.tsx` 57-65 | **CA-NR.33** Cuando se toca "Ver carta", entonces `/m/<qrToken>` abre en una pestaña nueva (`target="_blank"`, `rel="noopener noreferrer"`) y la pestaña del admin no se mueve. |
| F-34 | Eliminar mesa con confirmación que avisa del QR | `TableList.tsx` 23-34; `0001_init.sql` 79-81 (`orders.table_id ... on delete cascade`) | **CA-NR.34** Cuando se elige eliminar "Mesa 7", entonces se pide confirmación con el texto `¿Eliminar "Mesa 7"? El QR impreso dejará de funcionar.`; cancelar no cambia nada; confirmar la borra y su QR da "no encontrada". Si falla: toast "No se pudo eliminar la mesa". (Ver CA-8.14: aviso adicional de que se borran sus pedidos.) |
| F-40 | Aplicar un tema predefinido | `components/admin/AppearanceEditor.tsx` 23-34; `lib/admin/theme.ts` | **CA-NR.40** Cuando se elige un preset distinto del activo, entonces se guarda el objeto de colores COMPLETO (incluido `style` si lo tiene) en `restaurants.theme`, aparece toast "Tema aplicado" y la carta del cliente lo muestra; el preset activo se marca como activo y su botón no se puede volver a tocar. Si falla: toast "No se pudo aplicar el tema". |
| F-41 | Paleta personalizada: 7 colores (selector + hex), vista previa, avisos de contraste, Guardar, Restablecer | `components/admin/ThemeCustomEditor.tsx`; `lib/theme/contrast.ts` | **CA-NR.41** Cuando se cambia un color, entonces la vista previa cambia en el acto y los avisos de contraste AA se recalculan con las mismas 7 reglas de `ThemeCustomEditor.tsx` (45-67) y los mismos textos; "Guardar" persiste y muestra "Paleta guardada" (error: "No se pudo guardar la paleta"); "Restablecer" vuelve a los valores guardados sin guardar. El campo `style` del tema en uso se conserva al guardar (no se pierde un tema "brutal", "neumorphic" o "clay"). |
| F-42 | Restaurante sin tema usa el tema por defecto | `lib/admin/getRestaurantTheme.ts` 14; `app/m/[tableId]/layout.tsx` 39 | **CA-NR.42** Dado un restaurante con `theme` nulo, entonces el admin y la carta del cliente usan el tema por defecto vigente (HU-4) y NO falla ninguna pantalla. |
| F-50 | Los errores se avisan y los controles se bloquean mientras se procesa | `CategoryList.tsx`, `MenuItemRow.tsx`, `TableList.tsx` (`pendingId`), formularios | **CA-NR.50** Dado cualquier acción que falla (se simula con red cortada o respuesta de error), entonces se ve el aviso de error de la tabla, la pantalla queda usable, el estado visual vuelve al valor real y se puede reintentar. |

Funciones que NO existen hoy y por lo tanto NO son regresión (si se agregan, son novedades): renombrar categoría (hecho 9), reordenar, editar el nombre/extra de una opción ya creada, búsqueda, filtros, estado en vivo de mesas, "Imprimir todos", Inicio.

---

## 3. Alcance y fuera de alcance

### 3.1 Dentro del alcance
**A. Seguridad (primero, bloquea el resto en el orden de entrega)**
- HU-1 RLS de la carta solo admin (SEC-LG-06). HU-2 pedidos no legibles en masa ni insertables con total arbitrario, SIN romper el flujo del cliente (SEC-LG-07). HU-3 validación de rol en `/kitchen` y `/floor` y destino del login por rol (R-2 partes 2 y 3 de la auditoría).
- Migración nueva (siguiente número libre; hoy el último es `0003`) + instructivo para que el Director la aplique y para volver atrás (CA-RNF.5).

**B. Tema por defecto**
- Preset "MenuSky" primero y predeterminado en `lib/theme/presets.ts`; los 7 existentes siguen (HU-4).

**C. Admin nuevo**
- Shell: menú lateral (escritorio) y barra de pestañas (celular) (HU-5).
- Carta (HU-6) y edición de plato con hoja inferior (HU-7), según el boceto.
- Mesas con estado en vivo, filtros, QR, hoja en celular e "Imprimir todos" (HU-8), según el boceto.
- Inicio NUEVO con resumen del día y accesos rápidos (HU-9).
- Apariencia: mismo funcionamiento, nuevo aspecto (HU-10).
- Estados vacíos con Pomo, de carga y de error (HU-11); movimiento y `prefers-reduced-motion` (HU-12); accesibilidad y responsive (HU-13).
- Requisito no funcional de marca: tokens `--ms-*` y Bricolage unificados (CA-RNF.1).

### 3.2 Fuera de alcance (explícito)
- `/kitchen` y `/floor` NO se rediseñan (siguen con su cascarón actual, `StaffShell`). Solo cambia en ellos la validación de rol (HU-3). Su lógica de estados de mesa se REUTILIZA en el admin pero no se modifica.
- La carta del cliente `/m/*` NO cambia, salvo (1) el tema por defecto (HU-4) y (2) lo necesario para que el flujo de pedido siga funcionando tras SEC-LG-07 (HU-2). Se muestran capturas de `/m/*` con el tema MenuSky al Director.
- La landing (`/`) y el login (`/login`) NO cambian visualmente (CA-RNF.1). El login solo cambia en una línea de lógica: a dónde manda al `waiter` (HU-3).
- Restringir por rol las escrituras de `orders` y `waiter_calls` (mozo solo entregas, cocina solo estados): es la parte opcional de la propuesta de la auditoría y NO está aprobada. Siguen con `is_staff_of`.
- Política "public insert waiter_calls" (cualquiera puede crear llamados), lectura pública de `tables` y robustez del `qr_token`: observaciones de seguridad no aprobadas para esta fase (riesgo R-8).
- Gestión de usuarios del staff, roles nuevos, multi-restaurante en el admin, cambio de contraseña, edición del logo/nombre/teléfono del restaurante.
- Renombrar o reordenar categorías y platos, edición de opciones ya creadas, duplicar platos, importar/exportar carta, historial o reportes de ventas, gráficos, cierre de caja, cobro, impresión de comandas. ("No por ahora": ver sección 11.)
- Cambiar el modelo de datos de la carta o de los pedidos (salvo lo estrictamente necesario para HU-2, que decide el Líder).
- Modo oscuro del admin: el admin nuevo tiene un único aspecto (como la landing y el login).
- Aplicar la migración en la base real, desplegar a producción, usar credenciales o datos reales (reglas 9 y 11 de `CLAUDE.md`): el Director aplica la migración.
- Medición de rendimiento con Lighthouse (se hace después en la PC de 16 GB; no bloquea esta fase).
- App móvil nativa. Solo se pide una vista responsive que sirva de base para una futura app.
- Dependencias nuevas sin aprobación del Líder (`docs/STACK.md`, regla 3).
- Idiomas distintos del español rioplatense.

---

## 4. Usuarios y roles

| Rol | Qué hace en esta fase |
|---|---|
| `admin` | Usa el admin completo (Inicio, Carta, Mesas, Apariencia). Puede entrar también a `/kitchen` y `/floor` (decisión del Director en R-2: "admin ve ambos"). Sus escrituras de carta pasan por RLS con `is_admin_of`. |
| `waiter` (mozo) | No usa el admin (ve `NotAdminAccess`). Su panel es `/floor`. En `/kitchen` es redirigido a `/floor`. Tras el login va a `/floor`. NO puede escribir la carta (SEC-LG-06). |
| `kitchen` (cocina) | No usa el admin. Su panel es `/kitchen`. En `/floor` es redirigido a `/kitchen`. Tras el login va a `/kitchen`. NO puede escribir la carta. |
| Autenticado SIN fila en `staff_users` | No tiene rol: en `/kitchen`, `/floor` y `/admin` ve `NoStaffAccess` y no se lee ningún dato (hecho 7 de 2.2; `lib/auth/getStaffUser.ts`). Tras el login sigue yendo a `/kitchen` (default; ahí ve `NoStaffAccess`). Con la clave pública y su sesión no puede más que un anónimo. |
| Anónimo (cliente por QR) | Ve la carta, arma el pedido, lo envía, ve "Tu pedido" y su estado, llama al mozo. NO puede listar pedidos ni crear uno saltándose `/api/orders`. |
| Director | Aprueba el boceto (hecho), decide las preguntas de la sección 9, aplica la migración en la base real y aprueba salidas a producción. |

Permisos de datos del admin nuevo: toda lectura y escritura se limita al restaurante del admin (`staff.restaurantId`), igual que hoy. Un admin no ve ni modifica datos de otro restaurante (CA-1.5, CA-2.8).

---

## 5. Historias de usuario y criterios de aceptación

Orden de entrega: HU-1, HU-2 y HU-3 (seguridad) van primero y cada una se audita antes de seguir con el rediseño (decisión del Director). HU-4 (tema) es previa a HU-10 y a las capturas del Director.

### 5.A SEGURIDAD

**Forma de verificar (sin base real).** El equipo NO usa la base real ni datos reales (`CLAUDE.md`, reglas 9 y 11). Cada CA de HU-1 y HU-2 se prueba, en este orden de preferencia, con (a) una base local descartable de Postgres/Supabase si el Líder la tiene disponible, o (b) un mock/stub aprobado por el Líder que reproduzca las políticas, más (c) revisión línea por línea del SQL de la migración por Seguridad. **Qué método usa cada CA lo fija el Líder y queda escrito en el informe de QA; si un CA solo pudo verificarse por lectura de SQL, se marca "verificado solo por revisión de SQL; confirmar en la base real con el instructivo de CA-RNF.5"**. Con cuentas de prueba ficticias: un `admin`, un `waiter`, un `kitchen` (todos del restaurante A), un `admin` del restaurante B, un usuario autenticado sin fila de staff, y un anónimo. Nunca credenciales reales.

#### HU-1 La carta solo la escribe un admin (SEC-LG-06)
Como dueño quiero que un mozo o un cocinero no puedan cambiar precios, platos ni categorías aunque usen la clave pública desde el navegador, para que el precio que ve el cliente y el que se cobra sea el que yo definí.

Tablas: `categories`, `menu_items`, `item_option_groups`, `item_option_choices` (hecho 1 de 2.2). Operaciones: crear, modificar y borrar.

- CA-1.1 Dado un `admin` del restaurante A, cuando crea, modifica o borra una categoría, un plato, un grupo de opciones y una opción del restaurante A, entonces la operación se aplica (los 4 tipos x 3 operaciones = 12 casos).
- CA-1.2 Dado un `waiter` del restaurante A y, aparte, un `kitchen` del restaurante A, cuando intentan cualquiera de esas 12 operaciones sobre datos del restaurante A con su propia sesión (por la interfaz de datos, no por la pantalla), entonces la base las rechaza (error de permisos o 0 filas afectadas) y los datos quedan idénticos. Ej.: cambiar `price` de un plato a 0 no tiene efecto.
- CA-1.3 Dado un anónimo con la clave pública, cuando intenta las 12 operaciones, entonces se rechazan y los datos no cambian.
- CA-1.4 Dado un usuario autenticado SIN fila en `staff_users`, cuando intenta las 12 operaciones, entonces se rechazan.
- CA-1.5 Dado un `admin` del restaurante B, cuando intenta las 12 operaciones sobre datos del restaurante A, entonces se rechazan. Incluye "mover" un plato de A a una categoría de B (o crear en B un plato que apunte a una categoría de A): se rechaza (la condición debe valer también para la fila nueva).
- CA-1.6 Dado cualquiera (anónimo incluido), cuando lee categorías, platos, grupos y opciones, entonces sigue obteniendo las filas (la lectura pública no cambia) y `/m/<qrToken>` se ve completa.
- CA-1.7 Dado un `admin` del restaurante A, cuando se ejecutan TODOS los criterios CA-NR.10 a CA-NR.20 con las políticas nuevas, entonces pasan (el admin nuevo funciona igual con la base endurecida).
- CA-1.8 Dado un `waiter` y un `kitchen`, cuando hacen lo que hoy hacen (cambiar el estado de un pedido, atender un llamado), entonces siguen pudiendo: esta historia NO reduce los permisos sobre `orders` ni `waiter_calls`.
- CA-1.9 Dado un `admin`, cuando sube, reemplaza o borra una foto de plato, entonces funciona igual que hoy (`0003_menu_photos_storage.sql` no cambia).
- CA-1.10 Dado el seed del repo (`supabase/seed.sql`), cuando se aplica la migración sobre una base con datos, entonces no se pierde ni se modifica ninguna fila (conteo de filas por tabla igual antes y después).

#### HU-2 Los pedidos no se pueden listar ni inventar, y el cliente por QR sigue pidiendo (SEC-LG-07)
Como dueño quiero que nadie con la clave pública pueda leer los pedidos de todos los restaurantes (con las notas de los clientes) ni crear pedidos con el total que quiera, y que mis clientes sigan pidiendo desde la mesa sin notar nada.

- CA-2.1 Dado un anónimo con la clave pública, cuando consulta `orders` y `order_items` directamente, SIN filtro y CON filtro (incluso por el `id` de un pedido real), entonces no obtiene ninguna fila (o recibe un error de permisos).
- CA-2.2 Dado un anónimo con la clave pública, cuando intenta insertar directamente en `orders` y en `order_items` (con `total` 0, 1 y 999999, y con cualquier `restaurant_id`/`table_id`), entonces se rechaza y no se crea ninguna fila.
- CA-2.3 Dado un cliente en `/m/<qrToken>` (360x640 y 390x844), cuando agrega platos (con opciones obligatorias y extras) y envía el pedido, entonces `POST /api/orders` responde 200 `{ orderId }`, el cliente llega a "Tu pedido" y el pedido aparece en `/kitchen` y en `/floor` sin recargar (flujo actual de punta a punta).
- CA-2.4 Dado el pedido de CA-2.3, entonces su `total` es la suma, calculada en el servidor con los precios actuales de la base, de (precio del plato + extras de las opciones elegidas) x cantidad (regla actual de `app/api/orders/route.ts` 134-137). Dado un body con campos extra (`total`, `status`, `restaurant_id`), entonces se ignoran: el pedido nace `received` con el total calculado.
- CA-2.5 Dado el contrato actual de `/api/orders`, entonces se conservan sus respuestas: 400 "Body inválido" / "Faltan datos del pedido" / "Falta elegir ..." / "... admite una sola opción", 404 "Mesa no encontrada", 409 "Uno de los platos ya no está disponible", 500 en fallas, con los mismos textos.
- CA-2.6 Dado un anónimo con el link `/m/<qrToken>/pedido/<orderId>` de su pedido, cuando lo abre (360x640 y 390x844), entonces ve "Tu pedido", la hora ("Hecho a las HH:MM"), cada renglón con cantidad, opciones, nota y subtotal, el total y el seguimiento (Recibido / En preparación / Listo / Entregado). Con un `orderId` que no existe, ve la página 404 (`notFound()`), no un error.
- CA-2.7 Dado el cliente en "Tu pedido", cuando cocina o salón cambia el estado (`received` -> `in_kitchen` -> `ready` -> `delivered`, o `cancelled`), entonces la pantalla del cliente refleja el estado nuevo SIN recargar y SIN acción del cliente, en **<= 5 s** desde el cambio (default del equipo, pregunta 6; el Líder busca la menor demora posible). `cancelled` muestra "Este pedido fue cancelado.". Medir con cronómetro sobre 5 cambios; todos <= 5 s.
- CA-2.8 Dado un `waiter`, un `kitchen` o un `admin` del restaurante A, cuando abre `/floor`, `/kitchen` o el Inicio/Mesas del admin, entonces ve los pedidos del restaurante A (listas, totales por mesa, indicadores de pendientes) y los pedidos nuevos y los cambios de estado llegan en vivo como hoy (incluido el aviso sonoro de `/kitchen` y `/floor`). Dado un staff del restaurante B, entonces NO ve pedidos del A (ni por pantalla ni por la interfaz de datos).
- CA-2.9 Dado un staff del restaurante A, cuando cambia el estado de un pedido, entonces se guarda (la política de actualización del staff sigue vigente).
- CA-2.10 Dado un autenticado sin fila de staff, entonces no lee pedidos (igual que un anónimo).
- CA-2.11 Dado `POST /api/waiter-calls` con un `qrToken` válido y un motivo válido, entonces sigue creando el llamado y aparece en `/floor` (esta historia no lo toca).

#### HU-3 Cada rol va a su panel y no ve el del otro (R-2, partes 2 y 3 de la auditoría)
Como dueño quiero que el mozo caiga en el Salón, que la cocina caiga en Cocina y que cada panel valide el rol en el servidor, para que nadie vea la pantalla que no le corresponde.

Decisión del Director: mozo en `/kitchen` va a `/floor`; cocina en `/floor` va a `/kitchen`; admin ve ambos; el login manda `waiter` a `/floor`, `admin` a `/admin`, `kitchen` a `/kitchen`.

- CA-3.1 Dado un `waiter`, cuando abre `/kitchen`, entonces termina en `/floor` (redirección hecha en el servidor, antes de mostrar nada) y la respuesta no contiene datos de pedidos de cocina.
- CA-3.2 Dado un `kitchen`, cuando abre `/floor`, entonces termina en `/kitchen` (misma regla).
- CA-3.3 Dado un `admin`, cuando abre `/kitchen` y `/floor`, entonces ve cada panel completo, sin redirección.
- CA-3.4 Dado un `waiter` en `/floor` y un `kitchen` en `/kitchen`, entonces ven su panel como hoy.
- CA-3.5 Dado un autenticado SIN fila de staff, cuando abre `/kitchen` o `/floor`, entonces ve `NoStaffAccess` y no se leen datos (comportamiento actual, se conserva). Dado un anónimo, entonces va a `/login?redirect=<ruta>` (comportamiento actual, se conserva).
- CA-3.6 Sin bucles: ningún rol rebota entre `/kitchen` y `/floor` (cada rol da como máximo 1 redirección) y un `admin` nunca es redirigido.
- CA-3.7 Login (`components/auth/LoginForm.tsx`): dado un login válido SIN `?redirect=` válido, entonces `admin` -> `/admin`, `waiter` -> `/floor`, `kitchen` -> `/kitchen`, sin fila -> `/kitchen` (default; ahí ve `NoStaffAccess`). Dado un `?redirect=` válido, entonces se va a esa ruta SIN consultar `staff_users` (como hoy, login CA-4.3) y la validación de rol de la página decide: `waiter` con `?redirect=/kitchen` termina en `/floor`; `kitchen` con `?redirect=/floor` termina en `/kitchen`; `waiter` con `?redirect=/admin` ve `NotAdminAccess`.
- CA-3.8 El cambio en el login se limita a esa asignación de destino: el aspecto del login no cambia (CA-RNF.1), `scripts/check-safe-redirect.mjs` sigue en 40/40 casos y el resto de `docs/specs/login.md` sigue vigente. Este CA-3.7 reemplaza solo el CA-4.2 de `docs/specs/login.md` para el `waiter` (Líder/PO lo anotan en esa spec al integrar).
- CA-3.9 (Debería) Dado el encabezado de `/kitchen` y `/floor` (`components/staff/StaffNav.tsx`), cuando lo ve un `waiter`, entonces muestra solo "Salón"; un `kitchen`, solo "Cocina"; un `admin`, "Cocina", "Salón" y "Admin". Así nadie toca un enlace que lo rebota.
- CA-3.10 Alcance de la defensa (para que nadie se confunda): esta validación es de PANTALLA. La autorización real de datos está en la base (HU-1 y HU-2). Un mozo con su sesión sigue pudiendo, por la interfaz de datos, cambiar estados de pedidos del restaurante A (parte opcional no aprobada; riesgo R-2 baja de la auditoría).

### 5.B TEMA POR DEFECTO

#### HU-4 La paleta de MenuSky es el tema predeterminado
Como Director quiero que lo nuevo (un restaurante recién creado, un restaurante sin tema) se vea con los colores de la landing, sin romper a los que ya eligieron uno.

Valores propuestos (Propuesta del PO, a confirmar por el Frontend con la medición de contraste): `background` #FFF5E1 (bun), `cardBackground` #FFFDF8 (paper), `textPrimary` #2B1710 (patty), `textSecondary` #6A4A3C (patty-soft), `accentPrimary` #D7261E (tomato), `accentSecondary` #FFC21A (cheddar), `waiterButton` #2B1710 (patty). El campo `style` lo propone el Frontend (por ejemplo el que mejor represente el "sello" de bordes marrones) y se muestra al Director en capturas de `/m/*`. Todos los colores salen de `docs/design/direccion-de-arte.md`, sección 2.

- CA-4.1 Dado `lib/theme/presets.ts`, cuando se lee la lista, entonces el primer preset es "MenuSky" (clave `menusky`), los 7 anteriores siguen en la lista con los mismos colores y `style` que hoy (ver pregunta 4 por el nombre del primero de ellos), y el tema por defecto del código es el de MenuSky.
- CA-4.2 Dado el preset MenuSky abierto en la paleta personalizada (`ThemeCustomEditor`), entonces los avisos de contraste están vacíos (0 avisos de las 7 reglas), y cada color coincide con un token de `direccion-de-arte.md` sección 2 (mismos HEX).
- CA-4.3 Dado un restaurante con `restaurants.theme` NULO, cuando se abre `/admin/apariencia` y `/m/<qrToken>`, entonces se ve MenuSky (marcado como activo en Apariencia) y no falla nada (CA-NR.42). (Pregunta 5: qué pasa con restaurantes ya existentes con tema nulo.)
- CA-4.4 Dado un restaurante con un tema GUARDADO (cualquiera de los 7 presets o una paleta personalizada), cuando se abre `/m/<qrToken>` y `/admin/apariencia` antes y después del cambio, entonces la carta del cliente se ve IDÉNTICA (comparación de capturas en 360x640 y 1440x900) y el preset activo es el mismo (un tema igual al viejo "Default" aparece activo en el preset renombrado, no en MenuSky). No hay migración de datos de `restaurants.theme`.
- CA-4.5 Dado un tema personalizado guardado que no coincide con ningún preset, entonces ningún preset figura activo y la paleta personalizada muestra sus valores (como hoy).
- CA-4.6 Dado el admin, cuando elige MenuSky, entonces se guarda el objeto completo (7 colores y `style` si lo tiene) y la carta del cliente lo muestra (CA-NR.40).
- CA-4.7 Dado `/m/<qrToken>` con el tema MenuSky (360x640 y 1440x900), entonces todos los textos cumplen contraste AA (el script `docs/qa/scripts/14-contrast-themes.mjs` se corre también con MenuSky) y las pantallas carta, detalle de plato con opciones, carrito, "Tu pedido" y botón de llamar al mozo se ven bien. QA adjunta capturas para el Director.
- CA-4.8 La landing y el login no cambian (CA-RNF.1). La landing mantiene su lista propia de 7 temas (hecho 14): su texto "7 temas ... Default" queda como está (riesgo R-6, decide el Director).

### 5.C ADMIN NUEVO

Orden de construcción sugerido (el Líder lo ajusta): HU-5 (shell) -> HU-6 y HU-7 (Carta y edición) -> HU-8 (Mesas) -> HU-9 (Inicio) -> HU-10 (Apariencia) -> HU-11 a HU-13 (transversales, se verifican en cada pantalla).

#### HU-5 Shell y navegación
Como admin quiero moverme entre Inicio, Carta, Mesas y Apariencia con un toque, desde la PC o desde el celular, y saber siempre dónde estoy.

- CA-5.1 **Aspecto propio de MenuSky.** Dado cualquier tema guardado del restaurante (p. ej. Galaxia), cuando se abre el admin, entonces el admin se ve SIEMPRE con la paleta MenuSky (fondo `--ms-bun` #FFF5E1, papel #FFFDF8, texto #2B1710, menú #2B1710, acción cheddar #FFC21A, tomate #D7261E), títulos en Bricolage Grotesque 700 y cuerpo en Geist. Comprobación: se cambia el tema del restaurante a Galaxia y los colores calculados del admin no cambian. (Default del equipo, el Director puede cambiarlo: el tema del restaurante es la marca del restaurante en la carta del cliente, no la de la herramienta de gestión; hecho 3 de 2.1 lo contradice hoy.)
- CA-5.2 **Escritorio (>= 768 px: 768x1024 y 1440x900).** Hay un menú lateral marrón oscuro (`--ms-patty`) con el logo de MenuSky (`components/landing/brand/Logo.tsx` importado sin modificarlo), los ítems Inicio, Carta, Mesas y Apariencia (el activo en cheddar con texto marrón), un grupo "Paneles" con enlaces a Cocina y Salón (CA-NR.04), el acceso a "Cerrar sesión" (CA-NR.02) y abajo una tarjeta con el nombre del local y "X de Y mesas ocupadas" (en vivo, misma definición que HU-8; sin mesas: "Todavía sin mesas"). Se ven el nombre de la persona y el rol "Admin" (CA-NR.03).
- CA-5.3 **Celular (< 768 px: 360x640 y 390x844).** No hay menú lateral. Hay una barra de pestañas fija abajo con 4 pestañas (ícono + texto): Inicio, Carta, Mesas, Estilo (la activa en cheddar). Arriba hay un encabezado compacto con el logo y un botón de cuenta que abre un menú con el nombre de la persona, el rol, "Cocina", "Salón" y "Cerrar sesión" (CA-NR.02 a CA-NR.04). "Estilo" lleva a Apariencia (el título de esa pantalla es "Apariencia").
- CA-5.4 **La barra inferior no tapa contenido.** Dado cualquier pantalla del admin en celular, cuando se hace scroll hasta el final, entonces el último elemento (tarjeta, botón, texto) queda totalmente visible por encima de la barra (espacio inferior >= alto de la barra + área segura del dispositivo). Prueba: `document.elementFromPoint` en el centro y esquinas del último elemento devuelve ese elemento, no la barra. Lo mismo para el "+" flotante de Carta: no tapa la barra ni el último plato.
- CA-5.5 Con el teclado virtual abierto (360x640, campo enfocado en una hoja o formulario), el campo activo y el botón de guardar quedan alcanzables (con scroll si hace falta) y la barra de pestañas no los tapa (puede ocultarse mientras haya teclado).
- CA-5.6 **Sección activa.** La pestaña/ítem activo lleva `aria-current="page"` y el resalte visual. Carta sigue activa dentro de `/admin/menu/<id>` y con la hoja de edición abierta. No hay dos activos a la vez.
- CA-5.7 **Rutas.** `/admin` muestra Inicio (ya NO redirige a `/admin/menu`); `/admin/menu`, `/admin/mesas` y `/admin/apariencia` se mantienen (default del equipo: no se renombran las URLs existentes para no romper marcadores). Atrás y adelante del navegador funcionan entre secciones. Cada pantalla tiene exactamente un `h1` y título de pestaña "Inicio | MenuSky", "Carta | MenuSky", "Mesas | MenuSky", "Apariencia | MenuSky".
- CA-5.8 **Teclado y foco.** El menú es un `nav` con nombre accesible ("Principal"); se recorre con Tab y se activa con Enter; el foco visible mide >= 2 px con contraste >= 3:1 contra el fondo adyacente (sobre el marrón del menú y sobre el crema del contenido). (Debería) Hay un enlace "Saltar al contenido" que lleva a `main`.
- CA-5.9 **Navegación fluida.** Dado el admin abierto, cuando se pasa de una sección a otra, entonces NO se recarga el documento (Network: sin pedido de documento HTML completo; el menú lateral/barra no parpadea ni se vuelve a montar) y la sección nueva muestra su esqueleto de carga si los datos tardan (HU-11). Objetivo de diseño, medición pendiente en la PC de 16 GB: sin demora perceptible entre el toque y el cambio de pestaña activa.
- CA-5.10 No hay scroll horizontal ni solapamientos en 768x1024 (menú lateral compacto o completo; lo decide el Frontend y se le muestra al Director) ni en 1440x900 (HU-13).
- CA-5.20 **Evaluación del Director (aplica a todo el admin).** El Director revisa capturas de Inicio, Carta, Mesas y Apariencia en 360x640, 390x844 y 1440x900 (y en vivo cuando pueda) y confirma "intuitivo, lindo, llamativo y característico de MenuSky". Carta y Mesas se comparan con `docs/design/admin-boceto-aprobado.md` (diferencias visibles = consulta al Director). Inicio y Apariencia no tienen maqueta: se muestran por primera vez en el informe y NO bloquean la construcción.

#### HU-6 Carta: ver el estado de la carta y marcar "Sin stock" con un toque
Como admin quiero ver mi carta ordenada por categoría y marcar un plato como sin stock con un interruptor, en el celular y en la PC.

Boceto: `docs/design/admin-boceto-aprobado.md`, sección "Carta".

- CA-6.1 **Encabezado.** Se ven el rótulo "Carta", el `h1` "Tu carta, al día" y, en escritorio, el botón cheddar "Nuevo plato". En celular el botón es un "+" flotante cheddar (abajo a la derecha, sobre la barra de pestañas) con nombre accesible "Nuevo plato" (CA-5.4).
- CA-6.2 **Tres datos rápidos**: "Pedidos hoy" (tarjeta tomate con texto `--ms-paper` al 100 %, dato principal), "Platos en carta" (cantidad total de platos de la carta, disponibles o no) y "Sin stock hoy" (cantidad de platos con `is_available = false`, número en tomate). Los valores coinciden con los datos de prueba. "Pedidos hoy" sigue la definición de la pregunta 1 (default: día calendario de Argentina, sin cancelados). Al cambiar un interruptor, "Sin stock hoy" cambia en el mismo instante (sin esperar la red) y "Pedidos hoy" sube en vivo cuando entra un pedido.
- CA-6.3 **Píldoras de categoría con conteo.** Debajo hay una fila de píldoras: "Todas · N" (default del equipo: la primera) y una por categoría, con su cantidad de platos ("Hamburguesas · 6"). La activa va en cheddar con texto marrón; las demás en papel con borde marrón. Tocar una filtra la lista sin recargar; hay una sola activa a la vez; el conteo se actualiza al crear o borrar platos. Es operable con teclado, el estado activo se anuncia (`aria-pressed` o `aria-selected`) y el nombre accesible incluye el conteo ("Hamburguesas, 6 platos"). En celular la fila scrollea horizontalmente DENTRO de su contenedor, sin mover la página (CA-13.6). La última píldora de la fila es "+ Categoría" (abre el alta de CA-NR.11).
- CA-6.4 **Tarjeta de plato (escritorio).** Cada plato es una tarjeta con borde marrón de 1,5-2 px y sombra "sello" `0 3px 0 var(--ms-patty)`, radio 12-16 px, con: foto (si no hay, un espacio reservado del mismo tamaño), nombre, resumen de opciones (Propuesta del PO, a confirmar con el boceto: "N opciones · nombre de grupo, nombre de grupo", con N = cantidad de grupos de opciones y los nombres cortados con "…" si no entran; sin grupos no se muestra la línea), precio en Bricolage, texto de estado ("Disponible" en lechuga oscura `--ms-lettuce-dark` #2E6B1A, o "Sin stock hoy" en tomate), interruptor y un lápiz con nombre accesible "Editar <plato>". En "Todas" los platos se agrupan bajo el título de su categoría y se conserva el orden de hoy (CA-NR.10).
- CA-6.5 **Plato sin stock = tarjeta atenuada, sin perder legibilidad.** Se atenúa la foto y el fondo, pero el nombre, el precio y el texto de estado siguen cumpliendo contraste AA (CA-13.1); no se usa `opacity` sobre toda la tarjeta si eso baja el texto de 4,5:1 (se mide con herramienta).
- CA-6.6 **Interruptor estilo iOS (accesible).** Es un control con rol `switch` y `aria-checked`; nombre accesible que incluye el plato ("Disponible: Milanesa"); se opera con toque, con Espacio y con Enter; encendido en lechuga, apagado en gris; el estado NO depende solo del color (además cambia la posición del botón y el texto "Disponible" / "Sin stock hoy"); el track apagado y el prendido tienen contraste >= 3:1 contra el fondo de la tarjeta; el área táctil mide >= 44x44 px aunque el dibujo sea más chico (CA-13.5); foco visible; la animación es el rebote del boceto (HU-12).
- CA-6.7 **Respuesta inmediata (optimista).** Dado un interruptor, cuando se toca, entonces cambia de posición, de color y de texto en el mismo cuadro del toque, sin esperar la respuesta del servidor. Prueba: con la red en "Slow 3G", el cambio visual ocurre antes de que termine la petición, y con la red en "Offline" también ocurre (y luego se revierte, CA-6.8).
- CA-6.8 **Reversión si falla.** Dado un interruptor que cambió y cuya petición falla (Offline, 500 o permiso rechazado), entonces el interruptor, el texto de estado, la atenuación y el contador "Sin stock hoy" vuelven al valor anterior, aparece el aviso "No se pudo actualizar la disponibilidad" y el control queda usable (no trabado) para reintentar.
- CA-6.9 **Toques seguidos.** Dado un interruptor, cuando se toca 5 veces seguidas muy rápido (< 300 ms entre toques), entonces el estado final en pantalla es el correcto por paridad (impar = invertido), el servidor termina con ese mismo estado (se verifica tras 3 s y tras recargar) y no queda un estado intermedio ni invertido por respuestas desordenadas.
- CA-6.10 **Persistencia.** Tras cambiar un interruptor y recargar la página, el estado se mantiene; en `/m/<qrToken>` el plato sin stock no aparece (CA-NR.14). El scroll, la píldora activa y el texto del buscador se mantienen al cambiar un interruptor (la lista no salta al inicio).
- CA-6.11 **Buscador.** En celular hay un campo "Buscar plato" arriba de la lista. Filtra mientras se escribe por nombre, sin distinguir mayúsculas ni tildes ("milanesa" encuentra "Milanesa"), combinado con la píldora activa; tiene un botón "Limpiar" (>= 44 px). Sin resultados: estado vacío con Pomo (CA-11.1). El texto escrito se muestra siempre como texto (nunca como HTML). (Debería: el mismo buscador en escritorio; el boceto lo muestra solo en celular, ver nota de desvío en sección 8.)
- CA-6.12 **Lista compacta (celular).** Cada plato es una fila con foto, nombre, precio e interruptor; tocar la fila o el lápiz abre la hoja de edición (HU-7). Los controles miden >= 44 px y las filas no se solapan con la barra inferior.
- CA-6.13 **Nuevo plato.** Cuando se toca "Nuevo plato" / "+": con una categoría activa se crea en esa categoría; con "Todas" se pide elegir la categoría; si no hay categorías se ofrece crear la primera. Se crea según CA-NR.13 y se abre la hoja de edición del plato nuevo con el nombre seleccionado (escribir lo reemplaza). Si falla: "No se pudo crear el plato" y no queda nada colgado.
- CA-6.14 **Categorías.** Con una categoría activa, junto a su título hay un menú ⋯ con "Eliminar categoría" (CA-NR.12, con el recuento de platos en el texto de confirmación). Crear categoría: CA-NR.11.
- CA-6.15 **Carga masiva razonable.** Con 8 categorías y 200 platos de prueba, los interruptores y el filtro responden sin demora perceptible a ojo y sin congelar el desplazamiento. Línea base: a medir por el Líder en la PC de 16 GB (no bloquea).

#### HU-7 Editar un plato desde una hoja que sube desde abajo
Como admin quiero editar un plato sin salir de la carta y sin perder mi lugar, con todos sus datos y opciones.

- CA-7.1 **Hoja inferior (celular, < 768 px).** Cuando se toca el lápiz o la fila, entonces sube desde abajo una hoja con: foto ("Cambiar foto"), Nombre, Precio, Descripción, "Disponible hoy" con interruptor estilo iOS, la sección "Opciones y extras" (HU-7, CA-7.8), el botón tomate "Guardar cambios" y "Eliminar plato". La carta sigue visible detrás (oscurecida). El boceto muestra foto, nombre, precio, disponible y guardar; Descripción, Opciones y Eliminar NO están en el boceto pero SÍ son funciones actuales (CA-NR.15, 16, 18, 19) y por eso se incluyen.
- CA-7.2 **Escritorio (>= 768 px).** El mismo contenido se muestra como panel lateral derecho o diálogo centrado (lo elige el Frontend y se le muestra al Director).
- CA-7.3 **Guardar.** Cuando se toca "Guardar cambios", el botón pasa a "Guardando..." y se deshabilita; al terminar bien, la hoja se cierra, aparece el aviso "Guardado" y la tarjeta/fila muestra de inmediato el nombre, precio y foto nuevos sin recargar; si falla, la hoja sigue abierta, lo escrito se conserva y aparece "No se pudo guardar el plato" (CA-NR.16).
- CA-7.4 **Cambios sin guardar.** Dado que se editó algún campo, cuando se intenta cerrar la hoja (botón cerrar, tocar fuera, Escape, arrastrar hacia abajo o Atrás), entonces se pide confirmar el descarte ("Tenés cambios sin guardar. ¿Descartarlos?"). Sin cambios, se cierra directo. (Propuesta del PO, texto a confirmar.)
- CA-7.5 **"Disponible hoy"** es un campo del formulario: se guarda con "Guardar cambios" (igual que hoy, `components/admin/MenuItemEditForm.tsx`), a diferencia del interruptor de la lista, que guarda al instante (CA-6.7). Ambos usan el mismo componente visual y el texto es "Disponible hoy" / "Sin stock hoy".
- CA-7.6 **Foto.** "Cambiar foto" abre el selector de archivos (en celular, cámara o galería; solo imágenes); durante la subida se ve "Subiendo..." y, al terminar, la vista previa; también se puede pegar un link (opción secundaria) y vaciarlo para quitar la foto (CA-NR.17). Si el archivo no es una imagen o es demasiado grande, se avisa con un mensaje claro y no se sube (límite de tamaño: a definir por el Líder; hoy no hay validación, `lib/admin/uploadMenuItemPhoto.ts`; línea base: a medir por el Líder).
- CA-7.7 **Campos.** Nombre y Precio son obligatorios; vacío o negativo no se envía y se señala el campo con un mensaje en línea; Precio abre el teclado numérico en celular. Mantienen las reglas actuales (CA-NR.16).
- CA-7.8 **Opciones y extras en la hoja.** Se pueden crear, editar y eliminar grupos, y agregar y eliminar opciones con su extra de precio, igual que CA-NR.18 y CA-NR.19, con controles >= 44 px. "Una opción" / "Varias opciones" se presentan como un grupo de selección única con estado anunciado (hoy `components/admin/TogglePill.tsx` no anuncia estado) y "Obligatorio" como un interruptor/casilla con estado anunciado. Eliminar un grupo pide confirmación (`¿Eliminar el grupo "X"?`).
- CA-7.9 **Accesibilidad de la hoja.** `role="dialog"`, `aria-modal="true"`, nombre accesible (el nombre del plato); el foco entra a la hoja al abrirse, queda atrapado dentro, `Escape` la cierra (con CA-7.4), y al cerrarse vuelve al lápiz/fila que la abrió; el scroll de fondo se bloquea; el botón de cerrar mide >= 44 px y se llama "Cerrar".
- CA-7.10 **Teclado virtual.** En 360x640, con el teclado abierto, el campo enfocado y "Guardar cambios" siguen alcanzables (el botón queda fijo al pie de la hoja o se llega con scroll).
- CA-7.11 **Atrás.** En celular, el botón Atrás del navegador/Android cierra la hoja y deja al admin en Carta (no sale de la sección). (Propuesta del PO.) Abrir `/admin/menu/<id>` directo muestra el editor de ese plato (CA-NR.20) y cerrar lo deja en Carta.
- CA-7.12 **Eliminar plato** (en la hoja): pide confirmación `¿Eliminar "X" de la carta?` en un diálogo propio de la marca (no el `window.confirm` del navegador), con el foco inicial en "Cancelar" (CA-NR.15). Un plato que ya tiene pedidos puede no poder borrarse (caso límite 4 de la sección 7).
- CA-7.13 La hoja entra con un deslizamiento hacia arriba de <= 280 ms (solo `transform`/`opacity`); con `prefers-reduced-motion` aparece sin deslizarse (HU-12).

#### HU-8 Mesas: estado en vivo, QR e "Imprimir todos"
Como admin quiero ver de un vistazo qué mesas están libres, ocupadas o llamando, y manejar los QR (bajar uno, ver su carta, imprimir todos).

Boceto: `docs/design/admin-boceto-aprobado.md`, sección "Mesas". La lógica de estados se REUTILIZA de `components/floor/FloorBoard.tsx` (hecho 11 de 2.1) sin modificarla.

- CA-8.1 **Encabezado.** Rótulo "Mesas", `h1` "Tu salón, de un vistazo", botón secundario "Imprimir todos" y botón cheddar "Nueva mesa". En celular los dos botones caben sin desbordar (320 px incluido) y "Nueva mesa" se alcanza sin scroll horizontal.
- CA-8.2 **Filtros con conteo.** Píldoras "Todas · N", "Libres · N", "Ocupadas · N", "Llamando · N" (la activa en cheddar). Los conteos suman bien (Libres + Ocupadas + Llamando = Todas) y se actualizan en vivo. Un filtro sin mesas muestra estado vacío con Pomo (CA-11.1).
- CA-8.3 **Tres estados** (default del equipo; preguntas 2 y 3): 
  - **Llama al mozo**: hay al menos un llamado en estado `pending` de esa mesa. Tarjeta tomate con campanita y el motivo del llamado más antiguo con las etiquetas de `lib/waiterCalls/reasons.ts` ("Pide la cuenta", "Tiene una consulta", "Llama al mozo"); si hay más de uno, "+N". Tiene prioridad sobre los otros estados (igual que el panel de salón).
  - **Ocupada**: no hay llamado pendiente y hay al menos un pedido activo (`received`, `in_kitchen` o `ready`). Tarjeta mostaza clara con "N pedidos · $total" (default: N = pedidos activos de la mesa y $total = total del día de la mesa que hoy ve el mozo, `lib/orders/getTableTotals.ts`; pregunta 2). El estado "Listo" del panel de salón (pedido `ready`) cuenta como Ocupada.
  - **Libre**: ninguna de las anteriores. Tarjeta verde clara.
  El estado se identifica también por texto e ícono (no solo por color).
- CA-8.4 **En vivo.** Con `/admin/mesas` abierto y sin recargar, y con una conexión en vivo activa: (a) un cliente llama al mozo -> la mesa pasa a "Llama al mozo" y los conteos cambian; (b) el llamado se atiende en `/floor` -> la mesa vuelve a su estado anterior; (c) entra un pedido -> la mesa pasa a "Ocupada" con "1 pedido · $total"; (d) el pedido pasa a `delivered` o `cancelled` y no quedan activos -> "Libre". Cada cambio se ve en <= 3 s (objetivo de diseño; medición pendiente en la PC de 16 GB, no bloquea).
- CA-8.5 **Coincide con el salón.** Para el mismo conjunto de datos, el estado de cada mesa en el admin coincide con el de `/floor` (Llamando = Llama al mozo; Listo/Con pedido = Ocupada; Libre = Libre). QA lo verifica lado a lado con 6 mesas en las 4 combinaciones.
- CA-8.6 **Sin sonido ni toast de llamados dentro del admin** (default, pregunta 3): en `/admin/*` un llamado nuevo NO hace sonar `playChime()` ni muestra el toast "Una mesa está llamando al mozo"; el cambio es visual (la mesa cambia de estado y el conteo "Llamando" sube). `/floor` y `/kitchen` siguen igual. (Debería) El ítem "Mesas" del menú/barra muestra el número de llamados pendientes para que se note desde otra sección. (Debería) Un cambio nuevo de "Llamando" se anuncia a lectores de pantalla con una región `aria-live="polite"` ("Mesa 4 llama al mozo").
- CA-8.7 **Tarjeta de mesa (escritorio).** Grilla de 4 por fila en 1440x900 (mínimo 2 por fila en 768x1024) con: nombre de la mesa, QR visible (con `alt` "QR de <mesa>"), estado, y las acciones "Descargar" (CA-NR.32), "Ver carta" (CA-NR.33; nombre accesible "Ver carta de <mesa>") y un menú ⋯ ("Más acciones de <mesa>") con "Eliminar" (CA-NR.34). Los QR se cargan de forma diferida y la tarjeta reserva su espacio (sin saltos de diseño al llegar el QR).
- CA-8.8 **Lista compacta y hoja (celular).** Cada mesa es una fila con QR chico, nombre, resumen y estado. Tocarla sube una hoja con el QR grande dentro de un recuadro claro con margen (zona de silencio) sobre un fondo tomate, el texto "Escaneá y pedí desde la mesa" (`--ms-paper` al 100 %), el estado, el resumen, y los botones "Descargar", "Ver carta" y "Eliminar mesa". Los módulos del QR son oscuros sobre fondo claro (nunca directamente sobre el tomate). Prueba: el QR de la hoja se escanea con 2 celulares reales desde la pantalla y abre `<NEXT_PUBLIC_SITE_URL>/m/<qrToken>` de esa mesa.
- CA-8.9 La hoja de mesa cumple lo mismo que la de plato en accesibilidad, foco, Escape, Atrás y teclado virtual (CA-7.9 a CA-7.11). "Eliminar mesa" abre una confirmación propia (foco inicial en "Cancelar") con el texto de CA-NR.34.
- CA-8.10 **Nueva mesa.** El botón abre un diálogo (escritorio) o una hoja (celular) con el campo "Nombre de la mesa" (ejemplo "Mesa 7"), enviable con Enter. Con nombre vacío o solo espacios no se crea. Al crear, la mesa aparece de inmediato, sin recargar, como "Libre" y con su QR (CA-NR.31); si falla: "No se pudo crear la mesa". Los nombres repetidos se permiten como hoy.
- CA-8.11 **"Imprimir todos".** Cuando se toca, entonces se abre una vista de impresión con los QR de TODAS las mesas del restaurante (aunque haya un filtro activo), cada uno con el nombre de la mesa DEBAJO, en grilla, con borde punteado o marcas para recortar, en el mismo orden que la lista (nombre, como hoy), y se ofrece "Imprimir" (diálogo del sistema). Verificación: con la impresión emulada en DevTools y exportada a PDF, hay un QR por mesa y cada QR decodificado da `<NEXT_PUBLIC_SITE_URL>/m/<qrToken>` de su mesa.
- CA-8.12 **Calidad de impresión.** En la salida impresa no aparecen el menú, la barra, los botones ni los avisos; el fondo es blanco y los QR son negros (sin tomate ni sombras, aunque el navegador no imprima fondos); ningún QR ni su nombre se parte entre dos páginas; con 60 mesas el paginado es correcto. El tamaño impreso de cada QR lo define el Frontend y se valida escaneando una hoja impresa real con 2 celulares a 30 cm (línea base de tamaño: a definir por el Líder tras esa prueba). Con 0 mesas el botón está deshabilitado y explica "Creá una mesa para imprimir". Si algún QR no cargó, la vista lo avisa en pantalla ("No se pudo cargar el QR de <mesa>") y no imprime un hueco en silencio. Al volver de la impresión, Mesas conserva el filtro.
- CA-8.13 **Eliminar mesa.** Desde ⋯ (escritorio) o la hoja (celular) con la confirmación de CA-NR.34; al confirmar la tarjeta desaparece y los conteos se actualizan; su QR da "no encontrada".
- CA-8.14 (Debería) Si la mesa tiene pedidos (hoy o activos), la confirmación agrega "También se borran sus pedidos." (hecho: `orders.table_id ... on delete cascade`, `0001_init.sql` 79-81; hoy la confirmación avisa solo del QR). Propuesta del PO, texto a confirmar.
- CA-8.15 (Debería) Si se pierde la conexión en vivo, aparece un aviso discreto "Sin conexión en vivo" y, al volver, el estado de las mesas se vuelve a leer (no quedan estados viejos).
- CA-8.16 El menú ⋯ se abre con teclado, se recorre con flechas, se cierra con Escape y devuelve el foco al botón; el botón mide >= 44 px en pantallas táctiles.

#### HU-9 Inicio: cómo viene el día (NUEVO, sin maqueta)
Como admin quiero abrir el admin y saber en 5 segundos cómo viene el día y qué requiere mi atención.

Se construye con el lenguaje del boceto (`docs/design/admin-boceto-aprobado.md`, sección "Inicio y Apariencia"). Se muestra al Director en capturas; no bloquea.

- CA-9.1 `/admin` muestra Inicio con el rótulo "Inicio", un `h1` (Propuesta del PO: "Así viene el día") y la fecha de hoy ("sábado 3 de octubre", en es-AR).
- CA-9.2 **Cuatro datos**: "Pedidos de hoy" (N), "Mesas ocupadas" ("X de Y"), "Llamados pendientes" (N) y "Platos sin stock" (N). Definiciones (defaults, preguntas 1 y 2): pedidos de hoy = pedidos creados desde las 00:00:00 hasta las 23:59:59 de HOY en hora de Argentina, sin los cancelados; mesas ocupadas = mesas con "Ocupada" o "Llama al mozo" (HU-8) sobre el total de mesas; llamados pendientes = llamados en estado `pending` de todas las mesas; platos sin stock = platos con `is_available = false`.
- CA-9.3 **Valores correctos y borde del día.** Con datos de prueba (5 pedidos de hoy, 1 de ellos cancelado, 2 de ayer a las 23:50, 1 de mañana a las 00:05), el dato muestra 4. Un pedido a las 23:59:59 cuenta para su día y uno a las 00:00:00 para el siguiente. El resultado es el mismo con la zona horaria del navegador en UTC, en Argentina y en otra, y con la hora del servidor en UTC (el día se calcula en `America/Argentina/Buenos_Aires`). El Inicio, la barra "Pedidos hoy" de Carta y el total del admin usan UNA sola definición.
- CA-9.4 **En vivo.** Sin recargar: un pedido nuevo suma 1 a "Pedidos de hoy" y actualiza "Mesas ocupadas"; un llamado nuevo suma 1 a "Llamados pendientes" y se resta al atenderse; marcar un plato sin stock en Carta se refleja al volver a Inicio. Objetivo <= 3 s desde el evento (medición pendiente en la PC de 16 GB, no bloquea).
- CA-9.5 **Accesos rápidos** (Propuesta del PO): "Nuevo plato" (va a Carta con el editor de plato nuevo abierto), "Nueva mesa" (va a Mesas con el alta abierta), "Imprimir todos los QR" (va a Mesas con la vista de impresión) e "Ir al Salón" (va a `/floor`). Miden >= 44 px y tienen nombre accesible. Las tarjetas "Llamados pendientes", "Mesas ocupadas" y "Platos sin stock" son enlaces a Mesas con filtro "Llamando", a Mesas con filtro "Ocupadas" y a Carta con el filtro "Sin stock" (nuevo, aparece como una píldora removible; desvío del boceto marcado para el Director, ver sección 8).
- CA-9.6 **Estado vacío.** Sin pedidos hoy: el dato muestra 0 (no queda en blanco) y un mensaje con Pomo ("Todavía no entraron pedidos hoy"). Con 0 llamados: "Sin llamados".
- CA-9.7 **Carga y error.** Mientras llegan los datos se ven esqueletos de las cuatro tarjetas. Si un dato falla, esa tarjeta muestra "No pudimos cargar" con "Reintentar" y las demás siguen visibles (CA-11.6).
- CA-9.8 Solo se cuentan datos del restaurante del admin.
- CA-9.9 (Podría) Una lista corta de los platos sin stock con un interruptor "Reponer" y el total de ventas del día. NO forma parte del MVP.

#### HU-10 Apariencia: la misma función con otro aspecto (sin maqueta)
Como admin quiero elegir o armar la paleta de mi carta con una pantalla que se vea de MenuSky, desde la PC o el celular.

- CA-10.1 **Misma función.** Se cumplen CA-NR.40, CA-NR.41 y CA-NR.42 sin cambios de resultado: presets, paleta personalizada de 7 colores con selector y hex, vista previa, avisos de contraste con las mismas 7 reglas y textos, Guardar, Restablecer, conservación de `style`.
- CA-10.2 **Aspecto.** Rótulo "Apariencia" y `h1` (Propuesta del PO: "Tu carta, a tu estilo"). Las tarjetas de preset llevan el borde y la sombra "sello" de la marca; MenuSky es la primera, con la marca "Predeterminado"; el preset activo se marca con texto "Activo" y un ícono además del color; el botón del activo dice "Tema actual" y está deshabilitado (comportamiento actual).
- CA-10.3 **Celular.** Los presets van en 1 columna (o 2 si caben a 360 px sin comprimir la vista previa); los 7 campos de color se apilan; la vista previa se ve entera; "Guardar" y "Restablecer" se alcanzan sin esfuerzo y no quedan tapados por la barra inferior (CA-5.4); sin scroll horizontal.
- CA-10.4 **Feedback.** Al elegir un preset, todos los botones de preset quedan deshabilitados mientras se aplica (como hoy), el botón elegido dice "Aplicando..." y al terminar se marca el nuevo activo y aparece "Tema aplicado".
- CA-10.5 **Accesibilidad del editor.** Cada color tiene su selector con nombre accesible y su campo hex con `<label>` asociado (hoy `components/admin/ThemeCustomEditor.tsx` línea 102 usa `Label` sin `htmlFor`); los avisos de contraste se anuncian como texto (no solo color) y están asociados a la vista previa.
- CA-10.6 (Debería) Un hex que no sea `#RRGGBB` válido se señala en línea y bloquea "Guardar" (hoy se puede guardar cualquier texto: `ThemeCustomEditor.tsx` líneas 26-28, 71-82; un valor inválido en `restaurants.theme` puede romper los colores de la carta del cliente). Es la única validación nueva de esta pantalla.
- CA-10.7 Cambiar el tema del restaurante NO cambia el aspecto del admin (CA-5.1); sí cambia la vista previa y la carta del cliente.
- CA-10.8 Se muestra al Director en capturas (360x640 y 1440x900); no bloquea.

#### HU-11 Estados vacíos con Pomo, de carga y de error
Como admin quiero que cuando no hay nada, está cargando o algo falló, la pantalla me diga qué pasó y qué hacer.

- CA-11.1 **Estados vacíos con Pomo** (el SVG de `components/brand/mascot/`, decorativo con `aria-hidden="true"`, junto a un texto y, si corresponde, un botón). Textos (Propuesta del PO, en voseo, a confirmar):

  | Situación | Mensaje | Acción |
  |---|---|---|
  | Carta sin categorías (hoy: "Todavía no hay categorías. Creá la primera con el botón de arriba.", `CategoryList.tsx` 61) | "Tu carta está vacía. Creá la primera categoría y empezá a sumar platos." | "Nueva categoría" |
  | Categoría sin platos (hoy: "Sin platos todavía.") | "Esta categoría todavía no tiene platos." | "Nuevo plato" |
  | Búsqueda o filtro "Sin stock" sin resultados | "No encontramos platos con \"<texto>\"." / "No hay platos sin stock." | "Limpiar búsqueda" |
  | Mesas sin mesas (hoy: "Todavía no hay mesas creadas.", `TableList.tsx` 44) | "Todavía no hay mesas. Creá la primera y bajá su QR." | "Nueva mesa" |
  | Filtro de mesas sin resultados | "No hay mesas libres / ocupadas / llamando ahora." | "Ver todas" |
  | Inicio sin pedidos hoy | "Todavía no entraron pedidos hoy." | (accesos rápidos) |

- CA-11.2 Pomo se ve en una pose estática (sin idle, sin parpadeo; default del equipo). Como mucho, una animación de entrada corta (solo `transform`/`opacity`, una vez) que se apaga con `prefers-reduced-motion`. Mide <= 120 px de alto y, en 360x640, el mensaje y su botón se ven sin scroll. Nunca aparece cuando hay contenido ni tapa nada.
- CA-11.3 Pomo se usa solo dentro de `/admin/*` en esta fase. Esto levanta para el admin la regla "solo en /login" (`docs/specs/login.md` CA-3.8) y se anota en `docs/design/mascota/mascota.md`; sigue prohibido en `/kitchen`, `/floor`, `/m/*` y landing. Cómo se comparten sus estilos con el login lo decide el Líder (hoy viven en `app/login/login.css`, hecho 16).
- CA-11.4 **Carga.** Cada pantalla muestra esqueletos (formas grises cálidas con la forma final: datos rápidos, píldoras, tarjetas, filas) mientras llegan los datos; no hay una pantalla en blanco ni un spinner a pantalla completa; al llegar los datos, el contenido real ocupa el lugar del esqueleto sin desplazar el resto (captura antes/después). Las acciones largas muestran su estado en el propio botón ("Guardando...", "Subiendo...", "Aplicando...").
- CA-11.5 **Error de carga distinto del vacío.** Dado que la lectura de la carta, las mesas o el tema falla (se simula cortando la respuesta), entonces se ve un estado de error (Pomo con cara de "uy" estática, "No pudimos cargar <la carta / las mesas / el resumen>" y botón "Reintentar") y NUNCA el estado vacío ("Tu carta está vacía"). "Reintentar" vuelve a pedir los datos sin recargar toda la página y el menú sigue usable. (Requiere que las lecturas de `lib/admin/*` dejen de descartar el error, hecho 6 de 2.1: es parte de esta fase.)
- CA-11.6 **Error de acción.** Toda acción que falla muestra el aviso con el texto de la tabla 2.3 (CA-NR.50), revierte lo que cambió en pantalla y deja el control usable. Los avisos (toasts) son accesibles (se anuncian), no tapan la barra de pestañas, el "+" flotante ni "Guardar cambios" y se leen con contraste AA.
- CA-11.7 **Sin conexión.** Con la red en Offline, el admin muestra un aviso persistente y discreto ("Sin conexión") y las acciones de escritura fallan como en CA-11.6, sin quedar colgadas. (Debería)

#### HU-12 Movimiento con carácter, sin trabar
Como Director quiero animaciones lindas que se sientan rápidas, y que respeten a quien las desactiva.

Decisión del Director: las animaciones NO se limitan por el Celeron actual; sí `prefers-reduced-motion` y buenas prácticas.

- CA-12.1 **Lenguaje del boceto**: interruptores con rebote (`--ms-ease-pop`), tarjetas y botones que "se hunden" al presionarlos, hojas que suben desde abajo, píldoras con cambio suave. Duraciones con los tokens de la marca (`--ms-dur-fast` 160 ms y `--ms-dur` 280 ms; `docs/design/direccion-de-arte.md` sección 6); ninguna interacción dura > 400 ms.
- CA-12.2 **Nunca bloquea.** Durante cualquier animación el admin responde a toques y teclas (se puede tocar otro interruptor mientras una hoja sube).
- CA-12.3 **Buenas prácticas.** En el CSS del admin las animaciones y transiciones solo usan `transform` y `opacity`; ninguna sobre `width`, `height`, `top`, `left`, `margin`, `padding`, ni `filter`/`backdrop-filter`/blur; `box-shadow` no se anima (el "hundimiento" se hace con `transform`). Búsqueda de texto en los CSS y componentes del admin.
- CA-12.4 **`prefers-reduced-motion: reduce`.** Con la preferencia activa, `document.getAnimations().length === 0` en reposo y después de: abrir y cerrar una hoja, cambiar un interruptor, cambiar de píldora, cambiar de sección y ver un estado vacío; no hay rebote, deslizamiento ni entradas; el estado se sigue entendiendo por cambio instantáneo de color, texto y posición. Si se activa la preferencia con la página abierta, las animaciones se detienen sin recargar.
- CA-12.5 Sin bucles infinitos de animación en el admin salvo, como mucho, un pulso de opacidad en los esqueletos de carga, que también se apaga con `prefers-reduced-motion`; ningún elemento parpadea más de 3 veces por segundo (WCAG 2.3.1).
- CA-12.6 Sin librería de animación nueva (CA-RNF.2).
- CA-12.7 Medición de fluidez (cuadros, INP, CPU, Lighthouse): PENDIENTE en la PC de 16 GB; no bloquea esta fase (CA-RNF.4).

#### HU-13 Accesibilidad y responsive (transversal)
Como persona con distintas capacidades, o con las manos ocupadas y el celular en una mano, quiero poder usar todo el admin.

- CA-13.1 **Contraste WCAG AA** medido con herramienta (se adjuntan pares y ratios): texto normal >= 4,5:1; texto grande (>= 24 px, o >= 18,66 px en negrita) y componentes de interfaz (bordes de campos, track del interruptor, íconos que transmiten estado) >= 3:1. Pares mínimos: marrón sobre crema y sobre papel; marrón suave sobre crema y papel; texto claro sobre el menú marrón; texto marrón sobre cheddar (ítem activo y botones cheddar); "Disponible" (lechuga oscura) y "Sin stock hoy" (tomate) sobre papel; texto papel sobre tarjeta tomate y sobre el botón "Guardar cambios"; placeholders; texto deshabilitado; los bordes de los interruptores. Prohibido para texto normal: cheddar sobre tomate (3,10), lechuga #4C9A2A sobre crema (3,25), marrón sobre tomate (3,40) (`docs/design/direccion-de-arte.md` sección 2). Sobre tomate el texto claro va siempre al 100 % de opacidad.
- CA-13.2 **Nombres accesibles.** Todo botón de solo ícono tiene nombre ("Editar <plato>", "Más acciones de <mesa>", "Nuevo plato", "Cerrar", "Descargar QR de <mesa>", "Ver carta de <mesa>", "Eliminar categoría"); los interruptores incluyen el plato; las fotos de platos tienen `alt` con el nombre del plato (o vacío si es decorativa) y los QR "QR de <mesa>"; el texto visible de cada control está contenido en su nombre accesible (WCAG 2.5.3).
- CA-13.3 **Teclado.** Todas las funciones del inventario se pueden hacer solo con teclado (menú, píldoras, interruptores con Espacio, abrir/cerrar hojas con Escape, menús ⋯ con flechas, diálogos de confirmación con el foco inicial en "Cancelar", formularios con Enter). Foco visible >= 2 px y >= 3:1; orden lógico; sin trampas de foco salvo los diálogos modales, que lo atrapan y lo devuelven.
- CA-13.4 **Lector de pantalla** (NVDA con Firefox o Chrome; VoiceOver en iOS o macOS): el interruptor se anuncia como "Disponible: Milanesa, interruptor, activado/desactivado"; las hojas se anuncian como diálogo con su nombre; los errores se anuncian una vez; las píldoras anuncian su estado. QA adjunta notas.
- CA-13.5 **Objetivos táctiles >= 44x44 px** en 360x640, 390x844 y en cualquier pantalla táctil (768x1024 incluido): interruptores, píldoras, pestañas, lápiz, ⋯, "+", cerrar, botones de hojas y diálogos, botones de las tarjetas, accesos rápidos. Los botones destructivos ("Eliminar") quedan separados de los de guardar. Se mide el área táctil, no el dibujo.
- CA-13.6 **Sin scroll horizontal**: `document.documentElement.scrollWidth <= window.innerWidth` en 320, 360, 390, 768 y 1440 px de ancho, en Inicio, Carta, Mesas, Apariencia, con la hoja de edición abierta, con un diálogo de confirmación abierto y en la vista previa de impresión en pantalla; también durante las animaciones, con un nombre de plato de 80 caracteres, una mesa de 40, y precios de 7 cifras ($1.234.567). La fila de píldoras scrollea dentro de su contenedor y deja ver que hay más (la última píldora asoma cortada).
- CA-13.7 **Zoom y texto grande.** Con zoom 200 % en 1280x720 y con el texto al 200 %, no se pierde contenido ni función (WCAG 1.4.4 y 1.4.10); en celular con el texto del sistema grande, nada se corta ni se superpone.
- CA-13.8 **Orientación.** En celular horizontal (640x360) el admin sigue usable con scroll vertical, la barra inferior no se come la pantalla (puede reducirse) y el "+" no tapa contenido.
- CA-13.9 **Contenido.** Español rioplatense con voseo, sin emojis en la interfaz (los íconos son vectoriales), moneda con el mismo formato que hoy en todas las pantallas (`lib/format.ts`), fecha y hora en es-AR. Los textos nuevos se listan en el informe del Frontend.
- CA-13.10 **Herramienta automática.** axe: 0 errores críticos o serios en Inicio, Carta, Mesas y Apariencia, en escritorio y celular, con las hojas abiertas y cerradas (se adjunta la salida). Lighthouse queda pendiente (CA-RNF.4).
- CA-13.11 **Navegadores.** Últimas 2 versiones estables de Chrome, Edge y Firefox, y Safari (macOS e iOS). Prueba en iPhone real: pendiente heredado de la landing y el login (`docs/specs/login.md` CA-7.5); se registra, no bloquea.

---

## 6. Requisitos no funcionales

### 6.1 Seguridad y privacidad (para que Seguridad tenga contra qué auditar)
- RNF-S1 Toda lectura y escritura del admin se hace con la sesión del usuario; el navegador nunca recibe una clave de servicio. Si el Líder decide usar `SUPABASE_SERVICE_ROLE_KEY` en el servidor para cerrar SEC-LG-07 (hoy no se usa, hecho 4 de 2.2), solo vive en código de servidor y NUNCA con prefijo `NEXT_PUBLIC_`. Verificación: búsqueda de la clave y de `service_role` en el HTML y los chunks de `.next/static` = 0 resultados; Seguridad audita.
- RNF-S2 Ningún secreto, clave ni credencial en el código, los docs, el CSS ni los scripts de prueba. Las cuentas de prueba son ficticias.
- RNF-S3 Los errores que ve el usuario no muestran `error.message`, códigos de la base ni trazas; solo los textos de esta spec.
- RNF-S4 Todo texto que escribe el admin (nombres de plato, categoría, mesa, opciones, búsqueda, descripción) y todo texto que viene de la base se muestra como texto, nunca como HTML (sin `dangerouslySetInnerHTML`, sin `innerHTML`). QA prueba nombres como `<img src=x onerror=alert(1)>` y `"><script>`: se ven literales.
- RNF-S5 Los enlaces que abren pestaña nueva llevan `rel="noopener noreferrer"` (CA-NR.33). (Debería) La URL de foto pegada solo acepta `http:` y `https:`.
- RNF-S6 Aislamiento por restaurante: ningún dato de otro restaurante es visible ni modificable desde el admin, ni por pantalla ni por la interfaz de datos (CA-1.5, CA-2.8, CA-NR.20).
- RNF-S7 Las cabeceras de seguridad de `next.config.ts` (`docs/STACK.md`, "Cabeceras HTTP") siguen aplicadas a `/admin`, `/kitchen`, `/floor` y `/m/*`. Ninguna pantalla nueva necesita ser enmarcada.
- RNF-S8 `npm audit`: esta fase no agrega dependencias y no empeora el estado vigente (SEC-LG-03 sigue abierto y lo decide el Líder/Director, `docs/security/login-2026-10-02.md`).
- RNF-S9 Se conservan sin cambios las políticas que esta fase NO toca: lectura pública de la carta, "public insert waiter_calls", actualización de `orders` y gestión de `waiter_calls` por staff, permisos de `tables`, `restaurants`, `staff_users` y Storage.

### 6.2 Criterios transversales verificables (numerados)
- **CA-RNF.1 Marca unificada, sin cambios visibles en landing ni login** (deuda técnica decidida por el Líder). (a) Los tokens `--ms-*` están definidos en UN solo archivo de marca común: búsqueda de `--ms-bun:` en `app/**` = 1 resultado (hoy 2, `app/(landing)/landing.css` y `app/login/login.css`); los demás CSS los usan, no los redefinen. (b) Los valores computados de cada token `--ms-*` son iguales a la tabla de `docs/design/direccion-de-arte.md` sección 2 y a los de hoy. (c) Bricolage Grotesque se declara en UN solo lugar: búsqueda de `Bricolage_Grotesque(` = 1 resultado (hoy 2: `app/(landing)/layout.tsx` y `app/login/layout.tsx`) y una página que la usa descarga un solo archivo de fuente (pestaña Red). (d) Regresión visual: capturas de la landing (1440x900 y 360x640, con el 3D apagado por `prefers-reduced-motion` o el estado estático) y del login (1440x900 y 360x640, en reposo y con error) antes y después son idénticas salvo ruido de antialiasing; la línea de partida del login está en `docs/qa/capturas/login/` y la de la landing en `docs/qa/capturas/`. (e) El login no supera sus topes: JS inicial <= 265,8 KB gzip y total <= 380 KB contando fuentes (`docs/specs/login.md` CA-9.1 y CA-9.2; `scripts/measure-login-weight.mjs`). (f) `components/landing/brand/Logo.tsx` queda sin modificar.
- **CA-RNF.2 Sin dependencias nuevas** sin aprobación escrita del Líder (`docs/STACK.md`, regla 3): `package.json` y `package-lock.json` sin cambios; si se aprueba una, se reporta su peso gzip.
- **CA-RNF.3 Sin secretos** en el repo (RNF-S2): búsqueda de patrones de claves en el diff y en el historial de la rama = 0 coincidencias reales.
- **CA-RNF.4 Rendimiento: PENDIENTE de medición en la PC de 16 GB (NO bloquea esta fase).** No hay metas de Lighthouse en esta spec (decisión del Director). Cuando esté la PC, se mide Lighthouse móvil, INP, cuadros descartados y CPU en reposo de `/admin`, `/admin/menu`, `/admin/mesas` y `/admin/apariencia`, y se define con el Director qué metas fijar. Mientras tanto se verifican las condiciones de diseño que no dependen de una PC: respuesta optimista del interruptor (CA-6.7), navegación sin recarga (CA-5.9), QR y fotos diferidos (CA-8.7), solo `transform`/`opacity` (CA-12.3), sin bucles de animación (CA-12.5). El Líder mide, antes y después, el JS inicial de `/admin/menu` y `/admin/mesas` y lo informa (línea base: a medir por el Líder; sin umbral fijo en esta fase).
- **CA-RNF.5 Instructivo de la migración (paso del Director).** Existe, en `docs/`, un instructivo en español simple (nombre a elegir por el Líder) que cubre: (1) qué cambia la migración, en palabras de dueño; (2) hacer un respaldo de la base ANTES; (3) cómo aplicarla en la base real (por el método que el Director use hoy; el Líder lo confirma); (4) el ORDEN respecto del despliegue del código nuevo y la ventana en que ambos conviven; (5) una prueba de humo posterior, con una lista corta de comprobaciones por rol (la tabla de CA-1.x a CA-3.x resumida: crear un pedido desde un QR de prueba, verlo en cocina, ver "Tu pedido" actualizarse, intentar cambiar un precio con la cuenta de mozo); (6) cómo volver atrás (script de reversa que restituye las políticas anteriores) y la advertencia de que volver atrás REABRE SEC-LG-06 y SEC-LG-07; (7) qué hacer si algo falla ("si los clientes no pueden pedir después de aplicar, hacer esto"). Además, el código nuevo funciona con la base ANTES y DESPUÉS de la migración (para que no haya corte), o el instructivo explica la ventana sin servicio.
- **CA-RNF.6 Verificación de seguridad sin base real.** El informe de QA y el de Seguridad indican, para cada CA de HU-1 a HU-3, el método usado (base local, mock aprobado o revisión de SQL) y marcan lo que queda "pendiente de confirmar en la base real".
- **CA-RNF.7 Sin cambios fuera de alcance.** `git diff` contra la rama base no muestra cambios de comportamiento en `/kitchen` ni `/floor` más allá de la validación de rol (HU-3) y, si se aprueba CA-3.9, el filtrado de enlaces del encabezado; ni en `/m/*` más allá de HU-2 y HU-4; ni en la landing ni en el login más allá de CA-RNF.1 y CA-3.7.

### 6.3 Accesibilidad (WCAG 2.2 AA) y responsive
Ver HU-13. Viewports de aceptación: 360x640, 390x844, 768x1024, 1440x900 y 320 px de ancho (solo scroll horizontal).

### 6.4 Contenido
Español rioplatense con voseo; sin emojis; sin palabras que la landing prohíbe (`docs/specs/landing.md`, CA-3.2). Los textos de error existentes se conservan literales (tabla 2.3).

---

## 7. Casos límite y manejo de errores

1. **Datos vacíos**: carta sin categorías, categoría sin platos, sin mesas, sin pedidos hoy, buscador sin resultados: estados vacíos con Pomo (CA-11.1).
2. **Falla la lectura inicial**: estado de error con "Reintentar", nunca el vacío (CA-11.5; hecho 6 de 2.1).
3. **Falla una acción** (red, 500, permiso): aviso de la tabla 2.3, reversión visual, control usable (CA-NR.50, CA-6.8, CA-11.6).
4. **Plato o categoría que ya tiene pedidos**: `order_items.menu_item_id` referencia a `menu_items` sin borrado en cascada (`0001_init.sql` línea 93), así que borrar un plato (o una categoría que lo contiene) con pedidos en el historial FALLA en la base y hoy solo se ve el aviso genérico. (Debería) Mostrar un mensaje claro: "Este plato ya tiene pedidos y no se puede borrar. Marcalo como sin stock." (a validar contra el comportamiento real en la base de prueba; el PO no lo ejecutó).
5. **Mesa eliminada**: sus pedidos y llamados se borran por cascada (`0001_init.sql` líneas 79-81, 101-104): se ven afectados los números de "Pedidos hoy" y el historial. Se avisa (CA-8.14).
6. **Sesión vencida mientras se usa el admin**: la acción falla por permiso/autenticación. (Debería) Mensaje "Tu sesión venció. Ingresá de nuevo." con enlace a `/login?redirect=<ruta>` en lugar del aviso genérico; el contenido escrito en una hoja no se pierde antes de mostrar el aviso.
7. **Rol cambiado o rechazado por la base** durante el uso (p. ej. un admin al que le quitan el rol): la acción falla con aviso y el siguiente refresco muestra `NotAdminAccess`.
8. **Dos admins a la vez (dos dispositivos)**: gana el último guardado (como hoy). "Guardar cambios" de una hoja abierta puede pisar un cambio de disponibilidad hecho desde otro dispositivo en el medio, porque `updateMenuItem` envía todos los campos (`lib/admin/menuItems.ts` 22-35). Se acepta; (Podría) refrescar los datos al volver la pestaña a primer plano.
9. **Foto**: archivo que no es imagen, imagen muy grande (las fotos de celular pesan varios MB y hoy no hay validación), formato que el navegador no puede mostrar (p. ej. HEIC), URL pegada rota o inaccesible: mensaje claro, el plato no queda con una foto rota (se muestra el espacio reservado) y no se pierde el resto de lo escrito (CA-7.6). (Debería) Si la imagen de una tarjeta no carga, se muestra el espacio reservado.
10. **Nombres**: plato de 80 caracteres, mesa de 40, categorías con tildes y ñ, nombres repetidos de mesa (permitidos como hoy), mesas "Mesa 2" / "Mesa 10" (hoy se ordenan como texto: `order("label")`, `lib/admin/getAdminTables.ts` línea 16, así que "Mesa 10" va antes que "Mesa 2"; (Podría) orden numérico natural; hoy NO es regresión). Sin cortes, desbordes ni scroll horizontal (CA-13.6).
11. **Precios**: 0, 7 cifras, decimales (el control actual es entero, `step=1`), vacío (no se guarda), negativo (no se guarda). Formato de moneda como hoy.
12. **Volumen**: 200 platos y 60 mesas (CA-6.15, CA-8.12).
13. **Medianoche y zona horaria**: pedidos a las 23:59 y 00:01 hora de Argentina, con el navegador y el servidor en otra zona (CA-9.3).
14. **Tema**: restaurante con `theme` nulo (CA-4.3), con tema guardado de los 7 presets o personalizado (CA-4.4, CA-4.5). (Podría) Un `theme` guardado incompleto (faltan claves) no rompe el admin ni la carta del cliente.
15. **Conexión en vivo caída** o suspensión del celular: aviso y relectura al volver (CA-8.15). Al volver del segundo plano en el celular, los estados de mesas no quedan viejos.
16. **Doble toque** en "Guardar cambios", "Crear", "Nueva mesa" o "Nuevo plato": no se duplica (el control se deshabilita mientras procesa, como hoy).
17. **Pedido de cliente mientras el admin marca "Sin stock"**: el servidor responde 409 como hoy (CA-NR.14).
18. **Hoja abierta y cambio de tamaño u orientación** (celular a horizontal, escritorio redimensionado): la hoja/panel se adapta sin perder lo escrito (CA-13.8).
19. **Modo oscuro del sistema** (`prefers-color-scheme: dark`): el admin se ve igual (un solo aspecto) y se lee bien.
20. **JavaScript desactivado**: el admin requiere JavaScript (hoy también: formularios en componentes cliente); se acepta y se anota.
21. **Impresión desde celular**: la vista de "Imprimir todos" funciona con el diálogo de impresión del navegador; en celulares que solo permiten "guardar como PDF" el PDF sale correcto (Podría verificarlo).
22. **Hay pedidos activos con la mesa eliminada o con la mesa llamando y eliminándose**: al eliminarse, la tarjeta desaparece y los conteos se corrigen en vivo; una hoja abierta de esa mesa avisa "Esta mesa ya no existe" y se cierra (Debería).
23. **Pedido creado sin renglones**: `app/api/orders/route.ts` (líneas 148-164) crea el pedido y después sus renglones; si fallan los renglones queda un pedido con total y sin detalle. Preexistente, fuera de alcance; el Líder lo evalúa al tocar ese flujo por HU-2 (riesgo R-8).

---

## 8. Referencias de diseño o mercado

Leídas desde el repositorio. No se hizo búsqueda externa nueva; las notas de patrones habituales son conocimiento general, no verificado con un sitio concreto.

| Referencia | Qué tomar | Qué NO tomar |
|---|---|---|
| `docs/design/admin-boceto-aprobado.md` | TODO lo visual de Carta y Mesas (lenguaje, estructura, textos de encabezado, estados, hojas) | — |
| `docs/design/direccion-de-arte.md` | Paleta "hamburguesa completa", tabla de contrastes verificados, Bricolage + Geist, tokens de movimiento (160 / 280 / 560 ms, `--ms-ease-pop`), borde de comanda y sombra "sello" | El 3D, los degradados y los blobs |
| `docs/design/mascota/mascota.md` | Pomo SVG propio y liviano, poses estáticas | El idle del login (en el admin queda estático) |
| `docs/specs/login.md` | Formato de spec, convenciones, criterios de teclado/foco/contraste, reglas de reduced-motion | Sus decisiones propias del login |
| Patrón habitual de apps de gestión para móvil (conocimiento general) | Barra de pestañas inferior, hoja inferior para editar, interruptor estilo iOS, botón de acción flotante, objetivos táctiles de >= 44 px (la guía de iOS usa 44 pt; WCAG 2.2 pide >= 24 px como mínimo AA) | Menús hamburguesa que esconden las secciones principales |
| Interruptor accesible (patrón `switch` de WAI-ARIA, conocimiento general) | Rol `switch`, `aria-checked`, Espacio/Enter, estado no solo por color | — |

**Desvíos y agregados respecto del boceto aprobado** (el Director los ve en las capturas y puede rechazarlos; ninguno cambia la dirección de arte): 
1. La hoja/panel de edición incluye Descripción, "Opciones y extras" y "Eliminar plato" (son funciones actuales: CA-NR.15, 16, 18, 19).
2. Píldora "Todas" y píldora "+ Categoría" en la fila de categorías; menú ⋯ "Eliminar categoría" (necesarios para conservar CA-NR.11 y CA-NR.12).
3. Filtro "Sin stock" (píldora removible) al llegar desde Inicio.
4. Buscador también en escritorio (Debería).
5. Menú de cuenta en celular y grupo "Paneles" en escritorio (para Cocina, Salón y Cerrar sesión: CA-NR.02 y CA-NR.04).
6. Confirmaciones en diálogos propios de la marca en lugar del `window.confirm` del navegador (mismos textos).
7. El texto "Disponible" va en lechuga oscura #2E6B1A (el verde #4C9A2A sobre crema da 3,25:1 y está prohibido para texto, `direccion-de-arte.md`); el verde claro se usa en el interruptor y en gráficos.
8. El QR de la hoja de mesa va en un recuadro claro con margen dentro del fondo tomate, para que sea escaneable.
9. "Listo" del panel de salón se muestra como "Ocupada" en las mesas del admin (el boceto tiene solo tres estados).

---

## 9. Preguntas abiertas para el Director

**Ninguna bloquea la construcción.** Cada una tiene un default que el equipo aplica si el Director no responde; cambiarlo después es chico (se indica cuánto). Las preguntas 1 a 7 salen de la evaluación pedida: todas son decisiones de negocio que el equipo no debe inventar, pero ninguna impide empezar.

### Pregunta 1. ¿Qué cuenta como "pedidos de hoy"?
- Dónde impacta: Inicio, datos rápidos de Carta, tarjeta "Pedidos hoy" (CA-6.2, CA-9.2, CA-9.3).
- Opciones: (A) día calendario de Argentina, de 00:00:00 a 23:59:59 hora de Buenos Aires, sin pedidos cancelados; (B) "día de trabajo" con corte configurable para locales nocturnos (ej. el día termina a las 05:00); (C) por turno, con un botón "Cerrar turno" (concepto nuevo; el esquema no tiene turnos ni sesiones, `lib/orders/getTableTotals.ts`).
- Recomendación del PO: A.
- **Default aplicado: A.** Hecho a tener en cuenta: el total por mesa que hoy ve el mozo corta el día con la hora del servidor (`getTableTotals.ts` 10-11), no con la de Argentina; si el servidor no está en hora argentina, ese total y el "Pedidos de hoy" del admin pueden diferir hasta la diferencia horaria. El panel de salón NO se toca en esta fase.
- Bloquea: **No.** Cambiar a B o C requeriría una definición nueva (B: chica; C: cambio de datos).

### Pregunta 2. ¿Qué significa "Ocupada" en una mesa?
- Dónde impacta: Mesas, Inicio, tarjeta del menú lateral (CA-8.3, CA-9.2, CA-5.2).
- Opciones: (A) la mesa tiene un pedido activo (recibido, en cocina o listo): es lo que hoy muestra el panel de salón (`components/floor/FloorBoard.tsx` 34-49); cuando se entrega el último pedido, vuelve a Libre aunque los clientes sigan sentados; (B) la mesa tuvo algún pedido hoy (aunque esté entregado) y sigue "ocupada" hasta que alguien la libere; (C) A + un botón manual "Liberar mesa" (concepto nuevo: "sesión de mesa", cambio de datos).
- Recomendación del PO: A para esta fase (consistente con el salón y sin cambios de datos).
- **Default aplicado: A**, con el resumen "N pedidos · $total" donde N = pedidos activos de la mesa y $total = el total del día de la mesa (el mismo número que hoy ve el mozo). El estado "Listo" del salón cuenta como Ocupada.
- Bloquea: **No.** B y C se agregan después sin rehacer la pantalla.

### Pregunta 3. ¿Suena el aviso (y sale el cartel) de llamados del salón dentro del admin?
- Hoy el sonido y el cartel "Una mesa está llamando al mozo" salen de `lib/realtime/useWaiterCalls.ts` 41-42 y el sonido de pedido nuevo de `lib/realtime/useOrdersBoard.ts` 53.
- Opciones: (A) No: en el admin el llamado se ve (la mesa pasa a "Llama al mozo", sube el conteo, número en el menú) pero no suena ni sale cartel; (B) Sí, igual que en `/floor`; (C) configurable con un interruptor "Avisos sonoros" (guardado por dispositivo).
- Recomendación del PO: A. Motivo: si el dueño tiene abiertos el admin y `/floor` en la misma PC, B haría sonar dos veces; la gestión no es la pantalla de atención.
- **Default aplicado: A.** C queda como "Podría".
- Bloquea: **No.**

### Pregunta 4. ¿Cómo se llama el tema que hoy se llama "Default" ahora que el predeterminado es MenuSky?
- Hoy hay un preset "Default" (naranja/crema) que es el que usan los restaurantes sin tema (`lib/theme/presets.ts` 14-25). Con dos "por defecto" habría confusión.
- Opciones: (A) "Clásico"; (B) conservar "Default"; (C) otro nombre que elija el Director (ej. "Naranja").
- Recomendación del PO: A (neutro, no describe un color).
- **Default aplicado: A "Clásico".** Solo cambia la etiqueta visible; los colores, la comparación para detectar el tema activo y los temas ya guardados NO cambian (CA-4.4). Consecuencia: la landing sigue mostrando "Default" y "7 temas" en `components/landing/Customize.tsx` (hecho 14); no se toca la landing en esta fase (riesgo R-6).
- Bloquea: **No.** (Cambiar el nombre después es una línea.)

### Pregunta 5. Restaurantes que hoy tienen `theme` vacío (nulo): ¿pasan a verse MenuSky?
- Hoy ven "Default" (naranja/crema), tanto en el admin como en la carta del cliente (`lib/admin/getRestaurantTheme.ts` 14; `app/m/[tableId]/layout.tsx` 39). Con el cambio verían MenuSky sin haber elegido nada. No se rompe nada técnicamente (CA-NR.42), pero la carta de sus clientes cambiaría de aspecto de un día para el otro.
- Opciones: (A) sí, pasan a MenuSky (es lo que el Director pidió: "por defecto"); (B) los que ya existen con tema vacío se "congelan" como Clásico (un script de datos que guarda ese tema en esos restaurantes) y solo los nuevos nacen MenuSky; (C) A y se avisa a esos restaurantes antes.
- Recomendación del PO: A si el Director confirma que ningún restaurante en producción con clientes reales tiene el tema vacío; si hay alguno, B para ese caso. Qué hay en la base real no se puede ver desde el repo (el seed crea el restaurante de prueba con tema vacío, `supabase/seed.sql` 20): el Director cuenta cuántos restaurantes reales tienen el tema vacío.
- **Default aplicado: A.**
- Bloquea: **No.** (B es un script de datos aparte que el Director aplica.)

### Pregunta 6. ¿El estado de "Tu pedido" puede actualizarse con una demora de pocos segundos?
- Contexto: hoy se actualiza al instante porque el cliente escucha la tabla de pedidos directamente (`lib/realtime/useOrderStatus.ts`). Cerrar SEC-LG-07 impide que el público lea pedidos, y esa escucha directa depende de poder leerlos (hecho 5 de 2.2). Es posible que el Líder tenga que usar una consulta periódica; también puede encontrar una forma instantánea.
- Opciones: (A) se acepta hasta 5 segundos de demora; (B) tiene que ser instantáneo (el Líder diseña un canal propio para ese pedido: más trabajo y más superficie de error).
- Recomendación del PO: A, y que el Líder tome la solución instantánea solo si le cuesta lo mismo.
- **Default aplicado: A (<= 5 s, CA-2.7).**
- Bloquea: **No.**

### Pregunta 7. ¿Un plato recién creado nace disponible o sin stock?
- Hoy "Nuevo plato" se crea con precio 0 y DISPONIBLE (`lib/admin/menuItems.ts` 3-12; `0001_init.sql` 43). Si el admin toca "+" y se va sin completarlo, los clientes lo ven en la carta a $0 y pueden pedirlo. El "+" flotante lo hace más fácil de dejar así.
- Opciones: (A) como hoy; (B) se crea sin stock y la hoja del plato nuevo abre con "Disponible hoy" ENCENDIDO: si el admin guarda, queda disponible; si cierra sin guardar, queda sin stock y no se vende; (C) no se crea hasta tocar "Guardar" (requiere resolver cómo agregar opciones a un plato que todavía no existe).
- Recomendación del PO: B.
- **Default aplicado: A (comportamiento actual, para respetar "no cambia la función")**; B es un cambio de una línea más el valor inicial del interruptor.
- Bloquea: **No.**

### 9.2 Defaults del equipo que no son preguntas (el Director puede cambiarlos)
1. El admin usa SIEMPRE la paleta MenuSky, no el tema del restaurante (CA-5.1; los bocetos aprobados lo muestran así).
2. URLs sin cambios; `/admin` pasa a ser Inicio (CA-5.7).
3. Corte entre layout de celular y de escritorio en 768 px (CA-5.2, CA-5.3).
4. Mobile: pestaña "Estilo"; pantalla "Apariencia".
5. Pomo estático en estados vacíos y solo dentro de `/admin/*` (CA-11.2, CA-11.3).
6. Textos nuevos propuestos en voseo (tabla CA-11.1, "Así viene el día", "Tu carta, a tu estilo", "Tenés cambios sin guardar. ¿Descartarlos?"): el Director puede reescribirlos.
7. El interruptor de la lista guarda al instante; "Disponible hoy" dentro de la hoja se guarda con "Guardar cambios" (CA-7.5).
8. Verificación de seguridad local sin base real; la migración la aplica el Director (CA-RNF.5, CA-RNF.6).
9. Aviso de red/servicio en acciones: los textos actuales (tabla 2.3), sin cambios.

---

## 10. Riesgos

- R-1 **Romper el flujo del cliente al cerrar SEC-LG-07.** Hoy dependen de la lectura/inserción pública: `/api/orders` (`.insert().select("id")`), la página "Tu pedido" (`lib/orders/getOrder.ts`), la escucha en vivo del cliente (`lib/realtime/useOrderStatus.ts`) y TODAS las lecturas de cocina, salón y contadores (hecho 5 de 2.2), porque no existe una política de lectura de `orders` para el staff (hecho 3). Si se cierra la lectura pública sin dar lectura al staff, cocina y salón quedan ciegos. Mitigación: CA-2.3 a CA-2.10, el Líder diseña y QA prueba el flujo completo ANTES de entregar; pregunta 6 por la demora.
- R-2 **Orden de despliegue app y migración.** Si la migración se aplica antes que el código nuevo, el código viejo deja de poder crear pedidos; si se aplica después y el código nuevo no soporta la base vieja, hay corte. Mitigación: CA-RNF.5 (compatibilidad en ambos sentidos o ventana explicada, y script de reversa).
- R-3 **Verificación de seguridad sin base real.** Los criterios de HU-1 y HU-2 pueden quedar "verificados solo por revisión de SQL". Mitigación: CA-RNF.5 incluye prueba de humo para el Director en la base real y CA-RNF.6 deja constancia del método.
- R-4 **Plato nuevo a $0 disponible** (pregunta 7), agravado por el "+" flotante en celular.
- R-5 **Borrados con efectos grandes.** Un plato o una categoría con pedidos no se puede borrar (la base lo impide, caso 4 de la sección 7); borrar una mesa borra sus pedidos y mueve los contadores (caso 5). Mitigación: CA-8.14 y mensaje claro (Debería).
- R-6 **Landing desincronizada**: tiene su propia copia de "los 7 temas" con "Default" (`components/landing/Customize.tsx`) y su texto alternativo los nombra; la app pasa a tener 8 presets con el primero "MenuSky" y otro "Clásico". Se decide con el Director si se actualiza la landing en otra fase (esta fase no la modifica, CA-RNF.1).
- R-7 **Originalidad de Pomo pendiente** (puntos 2 y 5 del CA-3.4 del login: silueta con 3 personas y búsqueda inversa de imagen; `docs/specs/login.md` R-7). Usar a Pomo en el admin hereda ese riesgo: si la prueba falla y hay que rehacerlo, se rehacen los estados vacíos del admin.
- R-8 **Observaciones de seguridad fuera del alcance aprobado** (para el backlog del Director): (a) `waiter_calls` acepta inserciones públicas (`0001_init.sql` 182): cualquiera puede generar llamados falsos y ahora se verían como una mesa en tomate en el admin; (b) `tables` es de lectura pública (línea 173) y los `qr_token` salen de `Math.random` (`lib/admin/generateQrToken.ts`), por lo que un `qrToken` válido se puede obtener y, tras SEC-LG-07, `/api/orders` seguirá aceptando pedidos "legítimos" falsos para esa mesa; (c) la auditoría recomendó un límite de pedidos por origen, no aprobado; (d) si fallan los renglones, queda un pedido sin detalle (`app/api/orders/route.ts` 158-164); (e) la restricción por rol de `orders` y `waiter_calls` (parte opcional de la auditoría) no está aprobada: un mozo puede, por la interfaz de datos, cambiar estados de pedidos de su restaurante.
- R-9 **Suscripciones en vivo duplicadas.** Si el menú lateral, Inicio, Carta y Mesas abren cada uno su propio canal de Realtime y reutilizan hooks con efectos (sonido, cartel), se duplican conexiones y avisos. Mitigación: CA-8.6 (sin sonido ni cartel) y que el Líder defina una sola suscripción compartida por sesión de admin.
- R-10 **Día calendario y zona horaria**: el admin cuenta el día en hora de Argentina; el panel de salón usa la hora del servidor (pregunta 1). Pueden diferir.
- R-11 **Salto visual entre paneles**: el admin pasa a ser claro y de MenuSky mientras `/kitchen` y `/floor` siguen oscuros con tinte del restaurante (no se rediseñan). Se acepta; se informa al Director.
- R-12 **Fotos de celular pesadas** sin validación: lentitud y mayor uso de Storage (CA-7.6; límite a definir por el Líder).
- R-13 **Edición simultánea**: último guardado gana; una hoja abierta puede pisar un cambio de disponibilidad hecho en otro dispositivo (caso 8).
- R-14 **Rendimiento en PC viejas de restaurantes.** Las animaciones ricas no se limitan por decisión del Director y la medición queda pendiente (CA-RNF.4). Muchos restaurantes tienen PC viejas (`docs/specs/login.md` sección 1.1). Mitigación: solo `transform`/`opacity`, `prefers-reduced-motion`, nada bloquea la interacción; (recomendación del PO) probar una vez en una PC vieja cuando se mida en la de 16 GB.
- R-15 **Hex inválido en el tema** puede dañar los colores de la carta del cliente (CA-10.6, Debería).
- R-16 **Conflicto de ramas**: el cambio de destino por rol toca `components/auth/LoginForm.tsx`, que pertenece a `feat/login-redesign` (otro worktree). Coordinar la integración para no pisarse (CA-3.8).
- R-17 **Hallazgo preexistente sin resolver**: SEC-LG-03 (`npm audit`, 8 altas por `braces`) sigue abierto; esta fase no lo empeora (RNF-S8) ni lo resuelve.
- R-18 **Estimación de alcance.** Esta fase combina seguridad en la base, un shell nuevo, cuatro pantallas y una unificación de marca. Mitigación: orden de entrega por valor (sección 11) y tres cortes con auditoría (HU-1 a HU-3, luego HU-5 a HU-8, luego HU-9 a HU-13).

---

## 11. Priorización (MoSCoW)

| Prioridad | Elemento |
|---|---|
| **Debe** | HU-1, HU-2 y HU-3 completas (CA-1.x, CA-2.x, CA-3.1 a CA-3.8, instructivo CA-RNF.5, método CA-RNF.6); HU-4 (preset MenuSky, sin romper temas guardados); shell (HU-5); Carta con datos rápidos, píldoras, tarjeta de plato, interruptor iOS accesible con feedback optimista y reversión, buscador en celular, "+" flotante, hoja de edición con TODAS las funciones actuales (HU-6, HU-7); Mesas con filtros, estados en vivo, QR, descargar, ver carta, eliminar con confirmación, hoja en celular, "Imprimir todos" (HU-8); Inicio con los 4 datos y accesos rápidos (HU-9); Apariencia con la misma función (HU-10); estados vacíos con Pomo, de carga y de error distinto del vacío (HU-11); `prefers-reduced-motion`, solo `transform`/`opacity` (HU-12); accesibilidad AA, objetivos >= 44 px, sin scroll horizontal (HU-13); todos los CA-NR (inventario); CA-RNF.1, .2, .3, .5, .6, .7 |
| **Debería** | CA-3.9 (enlaces del encabezado por rol); CA-8.6 (conteo en el menú y aviso a lectores de pantalla), CA-8.14 (aviso de pedidos al borrar mesa), CA-8.15 (conexión en vivo); filtro "Sin stock" desde Inicio; buscador en escritorio; CA-10.6 (validar hex); "Saltar al contenido"; mensajes claros ante plato con pedidos y ante sesión vencida; placeholder de foto rota; solo http(s) en URL de foto; validación de tipo y tamaño de foto; aviso "Sin conexión"; indicadores de pendientes de Cocina/Salón en el shell |
| **Podría** | Lista de platos sin stock con "Reponer" y ventas del día en Inicio; avisos sonoros configurables en el admin; orden natural de mesas ("Mesa 2" antes que "Mesa 10"); refrescar datos al volver la pestaña; animación corta de entrada de Pomo; toasts con estilo de marca; tema incompleto tolerado |
| **No por ahora** | Renombrar o reordenar categorías y platos; editar opciones ya creadas; duplicar platos; importar/exportar; reportes e historial de ventas; cierre de caja; gestión de usuarios y roles; restringir por rol `orders` y `waiter_calls`; rate limit de pedidos; cerrar `waiter_calls` público y `tables` público; modo oscuro del admin; PWA / "agregar a inicio" / app nativa; rediseño de `/kitchen` y `/floor`; Pomo fuera del admin y del login; cambios en la landing; medición con Lighthouse (pendiente, otra PC); multi-idioma |

**MVP**: todo lo "Debe". La seguridad (HU-1 a HU-3) se entrega, audita y aprueba primero; el Director aplica la migración con el instructivo antes del release de producción. Ningún criterio de rendimiento numérico bloquea la fase.

---

## 12. Notas para cada rol

- **Líder Técnico**: decidir la estrategia de HU-2 (cómo crear pedidos, leer "Tu pedido" y mantenerlo actualizado sin lectura pública; qué hacer con Realtime del cliente; pregunta 6) y de compatibilidad antes/después de la migración (CA-RNF.5); decidir cómo se comparten los tokens `--ms-*`, Bricolage, los estilos de Pomo y una suscripción en vivo por sesión (R-9); definir método de verificación local de seguridad (CA-RNF.6) y límite de foto; aprobar dependencias (CA-RNF.2); asegurar el orden y los cortes de auditoría; actualizar `docs/STACK.md` con la arquitectura del admin cuando se decida (no la define esta spec); anotar en `docs/specs/login.md` el reemplazo de CA-4.2 (CA-3.8) y en `docs/design/mascota/mascota.md` el uso de Pomo en el admin (CA-11.3); coordinar la rama del login (R-16); leer la guía de Next 16 de `node_modules/next/dist/docs/` antes de escribir código (`docs/STACK.md`, regla 1).
- **Backend**: HU-1, HU-2, HU-3 (validación de rol en `/kitchen` y `/floor`), migración, instructivo y reversa; lecturas de `lib/admin/*` que no descarten el error (CA-11.5); datos para Inicio y Mesas (día en hora de Argentina, CA-9.3); todo respetando el contrato de `/api/orders` (CA-2.5). No tocar las políticas que la spec deja igual (RNF-S9).
- **Frontend**: HU-4 (valores del preset y su `style`, con medición de contraste), HU-5 a HU-13 según el boceto aprobado; avisar al Director de cualquier desvío visible (sección 8); capturas de Inicio y Apariencia para el Director (360x640, 390x844, 1440x900) y de `/m/*` con MenuSky; lista de textos nuevos; no modificar `Logo.tsx`; reutilizar `FloorBoard.tsx` sin modificarlo.
- **Seguridad**: auditar HU-1 a HU-3 con los CA por rol (anónimo, waiter, kitchen, admin A, admin B, autenticado sin fila), RNF-S1 a S9, que no haya clave de servicio en el cliente, que el instructivo y la reversa sean correctos y las observaciones de R-8. Re-auditar los cambios del login en `LoginForm.tsx` (CA-3.7).
- **QA**: cada CA es una prueba. Viewports 360x640, 390x844, 768x1024, 1440x900 y 320 px; emulación de `prefers-reduced-motion` y `prefers-color-scheme: dark`; red en Slow 3G y Offline (CA-6.7, CA-6.8); toques rápidos (CA-6.9); lector de pantalla (NVDA y VoiceOver); axe; impresión emulada y exportada a PDF (CA-8.11, CA-8.12); escaneo real del QR con 2 celulares; regresión completa de CA-NR con la sesión de un admin y con las políticas nuevas (CA-1.7); comparación de capturas de landing y login (CA-RNF.1). Datos y cuentas ficticias; método de verificación de seguridad en el informe (CA-RNF.6). Medición de rendimiento: NO en esta fase (CA-RNF.4).
- **Director**: responder (si quiere cambiar algún default) las preguntas 1 a 7; revisar capturas (CA-5.20); aplicar la migración con el instructivo y correr la prueba de humo; contar cuántos restaurantes reales tienen el tema vacío (pregunta 5); decidir sobre la landing (R-6) y las observaciones de R-8; medir en la PC de 16 GB cuando la tenga (CA-RNF.4).

---

## 13. Registro de cambios

- v1.0 (2026-10-03): primera versión, borrador para el Director. Fuente del pedido: mensaje del Director y `docs/design/admin-boceto-aprobado.md`.

