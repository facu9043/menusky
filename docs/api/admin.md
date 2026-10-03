# Contratos de datos: fase ADMIN

Autor: Líder Técnico (2026-10-03). Spec: `docs/specs/admin.md` v1.0. Arquitectura: `docs/STACK.md`,
sección "Arquitectura de la fase Admin". Este documento es el contrato entre Backend y Frontend:
si alguien necesita cambiarlo, lo pide al Líder (no se cambia por cuenta propia).

Convenciones: TypeScript estricto, camelCase en TS, snake_case en SQL. Montos en la misma unidad
que hoy (`menu_items.price`, `orders.total`, formateados con `lib/format.ts`).

---

## 1. Migración `supabase/migrations/0004_role_policies.sql` (Backend)

Una sola migración, idempotente donde se pueda (`drop policy if exists`, `create or replace function`).
No modifica ni borra filas (CA-1.10). Reversa en `supabase/rollback/0004_role_policies_down.sql`
(fuera de `migrations/` para que ninguna herramienta la aplique sola).

### 1.1 Carta solo para admin (SEC-LG-06, HU-1)
- Se borran: `"staff manage categories"`, `"staff manage menu_items"`, `"staff manage option groups"`,
  `"staff manage option choices"`.
- Se crean, por tabla, políticas separadas `for insert` (with check), `for update` (using + with check)
  y `for delete` (using) con `is_admin_of(<restaurant_id resuelto igual que hoy>)`.
  La lectura pública (`"public read ..."`) NO cambia.
- `with check` en update evita "mover" una fila a otro restaurante (CA-1.5).

### 1.2 Pedidos (SEC-LG-07, HU-2)
- Se borran: `"public insert orders"`, `"public insert order_items"`, `"public read orders"`,
  `"public read order_items"`.
- Se crean: `"staff read orders"` (`for select using (is_staff_of(restaurant_id))`) y
  `"staff read order_items"` (`for select using (exists (select 1 from orders o where o.id = order_items.order_id and is_staff_of(o.restaurant_id)))`).
- NO cambian: `"staff update orders"`, `waiter_calls` (todas), `tables`, `restaurants`, `staff_users`, Storage (RNF-S9).
- Funciones `security definer`, `set search_path = public`, `language plpgsql`, `grant execute ... to anon, authenticated`
  (y `revoke ... from public` antes del grant):

```sql
-- Crea el pedido de forma atómica (orders + order_items en la misma transacción).
-- Recalcula TODO en la base: el total del cliente no existe como parámetro.
create or replace function create_order(p_qr_token text, p_items jsonb) returns uuid
-- p_items: [{ "menu_item_id": uuid, "quantity": int, "choice_ids": [uuid], "note": text|null }]
-- Reglas (las mismas de app/api/orders/route.ts hoy):
--   mesa por qr_token (si no existe: raise exception 'table_not_found' using errcode = 'P0002');
--   1..50 renglones; quantity entero 1..99; note recortada (trim, vacía -> null, máx. 500 caracteres);
--   plato existente, is_available, de la categoría del mismo restaurante de la mesa
--     (si no: 'item_unavailable', errcode 'P0001');
--   grupos obligatorios con al menos una elección ('missing_required');
--   grupos single con a lo sumo una ('single_choice_exceeded');
--   choice_ids que no pertenecen al plato se ignoran (como hoy);
--   subtotal = (price + sum(extra_price)) * quantity; total = sum(subtotal);
--   selected_options con la MISMA forma JSON que hoy:
--     [{ "groupId", "groupName", "choiceId", "choiceName", "extraPrice" }];
--   status nace 'received' (default de la tabla).
-- Devuelve el id del pedido.

-- Lectura del pedido propio: exige el qr_token de la mesa Y el id del pedido.
create or replace function get_public_order(p_qr_token text, p_order_id uuid) returns jsonb
-- Devuelve null si no coincide (mismo trato que "no existe").
-- Forma: { "id", "status", "total", "createdAt",
--          "items": [{ "id", "quantity", "selectedOptions", "note", "subtotal",
--                      "menuItemName", "photoUrl" }] }   (items ordenados por created_at/id)

create or replace function get_public_order_status(p_qr_token text, p_order_id uuid) returns text
-- Devuelve el status (o null). Lo usa el sondeo del cliente (sección 3.2).
```

Los totales por mesa del salón (`getTableTotals`, `useTableTotals`) y los tableros siguen funcionando porque
el staff ahora lee por `"staff read orders"`; Realtime `postgres_changes` respeta RLS, así que el staff
sigue recibiendo los eventos de su restaurante y el anónimo deja de recibirlos.

---

## 2. Código de servidor que cambia por la migración (Backend)

### 2.1 `POST /api/orders` (`app/api/orders/route.ts`)
- Contrato HTTP IDÉNTICO (CA-2.5): mismo body, mismas respuestas y textos.
- Se conserva la validación actual en TS (da los mensajes exactos) y la inserción pasa a
  `supabase.rpc("create_order", { p_qr_token, p_items })`. Errores de la RPC: `item_unavailable` -> 409
  "Uno de los platos ya no está disponible"; `table_not_found` -> 404 "Mesa no encontrada"; el resto -> 500
  "No se pudo crear el pedido". Nunca se devuelve `error.message` (RNF-S3).
- **Compatibilidad durante el despliegue (CA-RNF.5):** si la RPC no existe (PostgREST `PGRST202` /
  función inexistente), y SOLO en ese caso, se usa el camino viejo (insert directo). Así el código nuevo
  funciona con la base vieja y se puede desplegar ANTES de aplicar la migración. Con la base nueva el
  camino viejo está bloqueado por RLS, así que no abre nada. Comentario `// TEMP-COMPAT-0004` para quitarlo
  cuando la migración esté aplicada en producción.

### 2.2 "Tu pedido" (`lib/orders/getOrder.ts`, `app/m/[tableId]/pedido/[orderId]/page.tsx`)
- `getOrder(qrToken, orderId)` (nueva firma) llama a `get_public_order`. Misma forma de retorno que hoy
  (`{ order: OrderView; items: OrderItemView[] } | null`). Mismo fallback `TEMP-COMPAT-0004`.
- La página pasa `tableId` (que es el qr_token) y sigue haciendo `notFound()` con null.

### 2.3 Estado en vivo del cliente (`lib/realtime/useOrderStatus.ts`)
- Firma nueva: `useOrderStatus(qrToken: string, orderId: string, initialStatus: OrderStatus): OrderStatus`.
- Sondeo con `supabase.rpc("get_public_order_status", ...)` cada 3 s mientras la pestaña está visible,
  consulta inmediata al volver a estar visible (`visibilitychange`), se detiene en `delivered`/`cancelled`,
  sin solapar pedidos (no lanza uno nuevo si el anterior no volvió). Peor caso <= 5 s (CA-2.7).
- `OrderStatusTracker` solo cambia para pasar `qrToken` (cambio mínimo en `components/client`, autorizado).

### 2.4 Roles (R-2, HU-3)
- `app/kitchen/page.tsx`: tras `getStaffUser()`, `if (staff.role === "waiter") redirect("/floor")`.
- `app/floor/page.tsx`: `if (staff.role === "kitchen") redirect("/kitchen")`. Admin ve ambos.
- `components/auth/LoginForm.tsx`: SOLO la línea del destino por rol:
  `admin -> /admin`, `waiter -> /floor`, resto -> `/kitchen`. Nada más del login cambia.
- `components/staff/StaffNav.tsx` (CA-3.9): `waiter` ve solo "Salón", `kitchen` solo "Cocina", `admin` todo.

---

## 3. Capa de datos del admin (Backend escribe; Frontend consume)

### 3.1 Día de hoy (una sola definición, CA-9.3)
`lib/time/today.ts`:
```ts
export const RESTAURANT_TZ = "America/Argentina/Buenos_Aires";
/** Inicio (inclusive) y fin (exclusivo) del día calendario de hoy en Argentina, en ISO UTC. */
export function todayRangeAR(now?: Date): { startIso: string; endIso: string };
/** true si createdAt (ISO) cae en el día de hoy de Argentina. */
export function isTodayAR(createdAtIso: string, now?: Date): boolean;
```
`lib/orders/getTableTotals.ts` pasa a usar `todayRangeAR()` (hoy usa la medianoche del servidor: en Vercel,
UTC, el día se cortaba a las 21:00 de Argentina). Ver D-6.

### 3.2 Lecturas del admin: errores visibles (CA-11.5)
Todas las lecturas de `lib/admin/*` que hoy hacen `data ?? []` pasan a **lanzar** `AdminDataError`
(`lib/admin/errors.ts`, con `message` genérico, sin el detalle de la base) si `error` no es null.
El Frontend las atrapa con `error.tsx` por segmento (Reintentar = `reset()` + `router.refresh()`).
Funciones: `getAdminMenu`, `getAdminTables`, `getRestaurantTheme` (en el admin) y las nuevas de abajo.

### 3.3 Instantánea "en vivo" del admin (una suscripción por sesión, R-9)
`lib/admin/live/types.ts`:
```ts
export type AdminTableState = "free" | "occupied" | "calling";
export interface AdminLiveTable {
  id: string; label: string; qrToken: string;
  state: AdminTableState;
  activeOrders: number;          // pedidos activos (received | in_kitchen | ready)
  todayTotal: number;            // suma del día AR, sin cancelados (misma regla que getTableTotals)
  oldestCallReason: string | null;  // motivo crudo del llamado pendiente más antiguo
  pendingCalls: number;
}
export interface AdminLiveSnapshot {
  tables: AdminLiveTable[];
  ordersToday: number;           // pedidos del día AR, sin cancelados
  salesToday: number;            // suma de total del día AR, sin cancelados (para "Podría")
  pendingCalls: number;
  occupiedTables: number;        // state !== "free"
}
```
- `lib/admin/live/derive.ts`: función PURA que calcula estados con la MISMA prioridad que el salón
  (llamado > listo > activo > libre; listo y activo = "occupied"). Se extrae de `FloorBoard.tsx` a
  `lib/floor/tableStatus.ts` (`deriveTableStatus`) y `FloorBoard` la usa sin cambiar su resultado (CA-8.5).
- `lib/admin/live/getAdminLiveSnapshot.ts` (server): `getAdminLiveSnapshot(restaurantId): Promise<AdminLiveSnapshot>`.
- `lib/admin/live/AdminLiveProvider.tsx` (client, sin UI): `<AdminLiveProvider restaurantId initial>` abre UNA
  suscripción Realtime (orders INSERT/UPDATE, waiter_calls INSERT/UPDATE, tables INSERT/DELETE si se puede;
  si no, `refreshTables()` explícito) y expone:
  ```ts
  export function useAdminLive(): AdminLiveSnapshot & {
    connected: boolean;                 // estado de la conexión en vivo (CA-8.15)
    refresh(): Promise<void>;           // vuelve a leer todo (al reconectar o tras crear/borrar mesa)
    lastCallEvent: { tableLabel: string; at: number } | null; // para aria-live (CA-8.6)
  };
  ```
  Sin sonido ni toast (CA-8.6). `useWaiterCalls` suma una opción `{ notify?: boolean }` (default `true`:
  `/floor` sin cambios) si se reutiliza.
- Disponibilidad de platos y "Sin stock" NO van en la instantánea: los calcula el Frontend desde la carta.

### 3.4 Escrituras (sin cambios de firma)
`lib/admin/{categories,menuItems,optionGroups,optionChoices,tables,theme,uploadMenuItemPhoto}.ts` conservan sus
firmas y su comportamiento. Si el Frontend necesita algo nuevo (por ejemplo `setMenuItemAvailability(id, value)`
para el interruptor optimista), lo pide al Líder y lo escribe Backend.
Validación de foto (CA-7.6): `uploadMenuItemPhoto` rechaza tipos que no sean `image/jpeg|png|webp|gif` y
archivos > 5 MB con `PhotoValidationError` (texto para el usuario en el Frontend). Ver D-7.

---

## 4. Supabase simulado para pruebas locales (Backend; lo usan Frontend, Seguridad y QA)

`scripts/mock-supabase/` (herramienta de desarrollo; la app NUNCA lo importa):
- `node scripts/mock-supabase/server.mjs --port 3401` escucha SOLO en `127.0.0.1`.
- Implementa lo que usa la app: PostgREST (`/rest/v1/<tabla>` GET/POST/PATCH/DELETE con `select` y
  embebidos, `eq`, `neq`, `gte`, `lt`, `in`, `order`, `limit`, `Prefer: return=representation`, objeto único por
  `Accept: application/vnd.pgrst.object+json`), `/rest/v1/rpc/<fn>` (las 3 RPC de la sección 1.2 con la misma
  lógica), Auth (`/auth/v1/token?grant_type=password`, `/auth/v1/user`, `/auth/v1/logout`), Storage
  (subida y URL pública de `menu-photos`) y, si es viable, Realtime (`/realtime/v1/websocket`, protocolo
  Phoenix mínimo para `postgres_changes`).
- Datos ficticios basados en `supabase/seed.sql` + pedidos y llamados de hoy. Usuarios ficticios:
  `admin@demo.test`, `mozo@demo.test`, `cocina@demo.test`, `sinstaff@demo.test`, `admin-b@demo.test`
  (contraseña ficticia documentada en el README del mock). Endpoints de control `POST /__mock/reset`,
  `POST /__mock/event` (simular pedido nuevo, cambio de estado, llamado) para pruebas en vivo.
- Respeta los permisos por rol de la migración 0004 en lo que la app ejercita (para que una prueba de UI con
  la cuenta de mozo vea el rechazo), pero la verificación de RLS de verdad es la de la sección 5.
- Uso: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3401 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key`.
- Dependencias propias (si hacen falta, p. ej. `ws`) en `scripts/mock-supabase/package.json`, separadas de la app.

## 5. Prueba de las políticas sin base real (Backend)

`supabase/tests/rls/` con su propio `package.json` (Postgres embebido, p. ej. `@electric-sql/pglite`):
aplica `0001..0004` sobre stubs mínimos (`auth.uid()` leído de una variable de sesión, esquema `storage`,
publicación `supabase_realtime`, roles `anon` y `authenticated`), carga el seed y corre la matriz de HU-1/HU-2
(roles: anónimo, waiter, kitchen, admin A, admin B, autenticado sin staff) con `set role` + la variable del
usuario. Salida versionada en `docs/evidencia/backend/rls-<fecha>.txt`. Lo que el stub no pueda reproducir
(Realtime con RLS, Storage real) se marca "pendiente de confirmar en la base real".

## 6. Instructivo para el Director (Backend redacta, Líder revisa)
`docs/releases/admin-migracion-0004.md` (CA-RNF.5): qué cambia, respaldo, cómo aplicarla (SQL Editor de
Supabase o CLI), ORDEN (1. desplegar el código con `TEMP-COMPAT-0004`; 2. aplicar 0004; 3. prueba de humo;
4. en una entrega posterior quitar el fallback), prueba de humo por rol, reversa y qué hacer si falla.
