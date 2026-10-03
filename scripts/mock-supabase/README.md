# Supabase simulado (mock) para pruebas locales

Herramienta de desarrollo para que Frontend, Seguridad y QA usen la app de punta a punta
**sin una base real**. La app nunca la importa. No tiene dependencias (solo Node >= 20) y escucha
**solo en 127.0.0.1**. Todos los datos y usuarios son **ficticios** y viven en memoria.

## Levantarlo

```
node scripts/mock-supabase/server.mjs --port 3401
```

Puertos del equipo Backend: 3400-3419 (sugerido: mock en 3401, `next` en 3402).
Variable opcional `MOCK_LOG=1` para ver cada request.

## Levantar la app contra el mock

Las variables `NEXT_PUBLIC_*` se incrustan **al compilar**, así que hay que compilar con ellas:

```
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3401
export NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key
export NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3402
npm run build
npx next start -H 127.0.0.1 -p 3402
```

(Con `next dev` basta con exportarlas antes: `npx next dev -H 127.0.0.1 -p 3402`.)

## Usuarios ficticios (contraseña de todos: `demo-1234`)

| Email | Rol | Restaurante | Entra a |
|---|---|---|---|
| `admin@demo.test` | admin | A (El Buen Sabor) | `/admin`, `/kitchen`, `/floor` |
| `mozo@demo.test` | waiter | A | `/floor` (en `/kitchen` lo manda a `/floor`) |
| `cocina@demo.test` | kitchen | A | `/kitchen` (en `/floor` lo manda a `/kitchen`) |
| `sinstaff@demo.test` | autenticado sin fila de staff | - | ve "sin acceso" |
| `admin-b@demo.test` | admin | B (La Esquina) | `/admin` del restaurante B (aislamiento) |

## Datos de partida

- Restaurante A = `supabase/seed.sql` (3 mesas, 3 categorías, 7 platos con opciones) + un plato "sin stock".
  Códigos QR de las mesas: `mesa-1-demo0001`, `mesa-2-demo0002`, `mesa-3-demo0003` -> `/m/mesa-1-demo0001`.
- Pedidos de hoy: uno recibido (Mesa 1), uno en preparación (Mesa 2), uno listo (Mesa 3), uno entregado,
  uno cancelado, y un llamado de mozo pendiente (Mesa 2). Restaurante B: una mesa (`mesa-b1-demo0001`), un plato y un pedido.

## Qué implementa

- **PostgREST** `/rest/v1/<tabla>`: GET/HEAD/POST/PATCH/DELETE, `select` con embebidos (`a(b)`, `a!inner(b)`),
  filtros `eq neq gt gte lt lte in is like ilike not.`, filtros en embebidos (`tabla.col=eq.x`), `order`, `limit`,
  `offset`, `Prefer: return=representation` y `count=exact`, `Accept: application/vnd.pgrst.object+json` (single).
  Restricciones: not null, únicos, claves foráneas (cascade; `order_items.menu_item_id` restringe, como la base real:
  borrar un plato con pedidos da 409 `23503`).
- **RPC** `create_order`, `get_public_order`, `get_public_order_status` con la lógica de la migración 0004
  (mismos errores `item_unavailable`, `table_not_found`, `invalid_items`, ...). Cualquier otra función da `PGRST202`.
- **Permisos por rol** como la 0004: carta, mesas y restaurante solo los escribe el admin de su restaurante;
  `orders`/`order_items`/`waiter_calls` los lee el staff de su restaurante; el anónimo no lee ni inserta pedidos
  (inserta llamados); `staff_users`: cada uno ve su fila, el admin la de su restaurante. Un mozo que intenta editar
  la carta recibe 403 `42501`. **No reemplaza** la prueba de RLS real: `supabase/tests/rls/`.
- **Auth** `/auth/v1/token` (password y refresh_token), `/user`, `/logout`. Emite JWT HS256 con un secreto ficticio.
- **Storage** bucket `menu-photos`: subir (solo admin, multipart), URL pública `/storage/v1/object/public/menu-photos/<archivo>`.
- **Realtime** `/realtime/v1/websocket` (Phoenix v2 que usa `@supabase/realtime-js` 2.112) para `postgres_changes`
  con filtro `col=eq.valor`. Los eventos de `orders`/`order_items`/`waiter_calls` solo llegan a sockets con sesión de staff
  del restaurante (imita RLS). Como en Postgres con identidad por defecto, `old_record` solo trae el `id`.

## Control en vivo

```
curl -X POST http://127.0.0.1:3401/__mock/reset                              # vuelve a los datos de partida
curl http://127.0.0.1:3401/__mock/state                                      # conteos y ids (depuración)
curl -X POST http://127.0.0.1:3401/__mock/event -H "content-type: application/json" \
  -d '{"type":"new_order","table":"Mesa 1","items":[{"name":"Provoleta","quantity":2}]}'
curl -X POST http://127.0.0.1:3401/__mock/event -H "content-type: application/json" \
  -d '{"type":"order_status","table":"Mesa 1","status":"in_kitchen"}'       # o "orderId"
curl -X POST http://127.0.0.1:3401/__mock/event -H "content-type: application/json" \
  -d '{"type":"waiter_call","table":"Mesa 3","reason":"cuenta"}'
curl -X POST http://127.0.0.1:3401/__mock/event -H "content-type: application/json" \
  -d '{"type":"attend_call","table":"Mesa 3"}'
```

## Limitaciones (lo que NO reproduce)

- No es Postgres: no hay SQL, ni vistas, ni triggers reales (`orders.updated_at` se actualiza a mano), ni transacciones.
  Operadores de PostgREST no listados dan 400 `PGRST100`.
- Los eventos Realtime se emiten al escribir por el mock; no hay replicación lógica real, ni `broadcast`/`presence`.
- Los datos viven en memoria; al reiniciar vuelven a los de partida.
- Storage: sin límites de tamaño ni de tipo (esa validación está en la app, D-7), sin firmas ni buckets privados.
- Auth: un solo flujo (contraseña); no hay registro, recuperación ni confirmación de email.
