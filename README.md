# Carta Digital + Pedidos por QR

Carta digital y sistema de pedidos por QR para restaurantes. Cada mesa tiene un QR
único que lleva a `/m/{qr_token}`, donde el cliente ve la carta, arma su pedido y lo
envía directo a cocina, sin pasar por el mozo y sin instalar nada.

## Stack

- **Next.js 16 (App Router) + TypeScript** — un solo proyecto sirve la vista del
  cliente y los paneles internos (cocina, salón, admin).
- **Supabase** (PostgreSQL + Auth + Realtime) — Realtime para que pedidos y
  llamados al mozo aparezcan en los paneles sin recargar; Auth para el login del
  staff.
- **Tailwind CSS + shadcn/ui**.
- **`qrcode`** para generar el QR de cada mesa.

## Estructura del proyecto

```
app/
  m/[tableId]/       Vista del cliente (carta, carrito, estado del pedido)
  kitchen/           Panel de cocina (KDS) — login requerido
  floor/             Panel de salón/mozos — login requerido
  admin/             Panel de administración — login requerido (rol admin)
  api/               Route handlers (crear pedido, llamar al mozo, generar QR)
components/          Componentes de UI por área + shadcn/ui en components/ui
lib/
  supabase/          Clientes de Supabase (browser, server, middleware)
  types/             Tipos de la base de datos
  cart/               Hook de carrito (localStorage por mesa)
  realtime/          Hooks de suscripción realtime
  qr.ts              Generación de QR por mesa
supabase/
  migrations/        Esquema SQL versionado
  seed.sql           Datos de prueba (restaurante ficticio "El Buen Sabor")
```

## Requisitos

- Node.js 20+ y npm
- Una cuenta y proyecto en [Supabase](https://supabase.com) (plan gratuito alcanza)

## Configuración inicial

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Crear el proyecto en Supabase**

   Entrá a [supabase.com](https://supabase.com) → **New project**. Guardá la
   contraseña de la base y esperá a que termine de aprovisionarse.

3. **Aplicar el esquema de base de datos**

   Abrí el **SQL Editor** de tu proyecto Supabase y ejecutá, en este orden:

   1. El contenido de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
      (crea las tablas, índices, funciones de autorización y políticas RLS).
   2. El contenido de [`supabase/seed.sql`](supabase/seed.sql) (carga el
      restaurante de prueba "El Buen Sabor" con 3 categorías, 6 platos y
      algunas opciones/extras).

   > Alternativa con Supabase CLI (si la tenés instalada y el proyecto linkeado):
   > `npx supabase db push` y después `psql < supabase/seed.sql` (o pegarlo en el
   > SQL Editor igual).

4. **Variables de entorno**

   Copiá `.env.local.example` a `.env.local`:

   ```bash
   cp .env.local.example .env.local
   ```

   Completá con los datos de tu proyecto (Supabase → **Project Settings → API**):

   | Variable | De dónde sale |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role key (solo para scripts server-side; **nunca** exponer al cliente) |
   | `NEXT_PUBLIC_SITE_URL` | En local: `http://localhost:3000`. En producción: tu dominio real (se usa para armar la URL que codifica cada QR) |

5. **Correr en local**

   ```bash
   npm run dev
   ```

   Abrí [http://localhost:3000](http://localhost:3000).

   Para probar la vista de cliente necesitás el `qr_token` de alguna mesa del
   seed. Podés obtenerlo corriendo en el SQL Editor de Supabase:

   ```sql
   select label, qr_token from tables;
   ```

   y entrando a `http://localhost:3000/m/{qr_token}`.

## Roles de staff

`staff_users` vincula un usuario de Supabase Auth (`auth_user_id`) con un
restaurante y un rol (`admin`, `waiter`, `kitchen`). Para crear el primer
usuario admin:

1. Creá el usuario desde **Authentication → Users → Add user** en el dashboard
   de Supabase (o haciendo signup desde `/login` una vez que esa pantalla esté
   implementada).
2. Insertá su fila en `staff_users` desde el SQL Editor, referenciando su
   `auth_user_id` (lo ves en Authentication → Users) y el `id` del restaurante
   del seed:

   ```sql
   insert into staff_users (restaurant_id, auth_user_id, name, role)
   values (
     (select id from restaurants where name = 'El Buen Sabor'),
     '<auth_user_id del usuario creado>',
     'Nombre Apellido',
     'admin'
   );
   ```

## Despliegue

Pensado para **Vercel** (frontend) + **Supabase** (base de datos, auth y
realtime):

1. Subí el repo a GitHub y conectalo en [vercel.com/new](https://vercel.com/new).
2. Cargá las mismas variables de entorno de `.env.local` en **Project
   Settings → Environment Variables** de Vercel (usando la URL de producción en
   `NEXT_PUBLIC_SITE_URL`).
3. Deploy. Las migraciones de `supabase/migrations` se aplican directamente en
   el proyecto de Supabase (no las corre Vercel).

## Estado del desarrollo

- [x] Modelo de datos + RLS + seed de prueba
- [ ] Vista del cliente (carta + carrito)
- [ ] Creación de pedidos + llamado al mozo
- [ ] Panel de cocina (KDS) en tiempo real
- [ ] Panel de salón/mozos
- [ ] Panel de administración
