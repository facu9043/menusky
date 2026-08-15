-- ============================================================
-- Carta Digital + Pedidos por QR — esquema inicial
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- RESTAURANTS ----------
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

-- ---------- TABLES (mesas) ----------
create table tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  label text not null,
  qr_token text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- CATEGORIES ----------
create table categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- MENU ITEMS ----------
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null,
  photo_url text,
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- ITEM OPTION GROUPS (ej "Punto de cocción") ----------
create table item_option_groups (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  name text not null,
  selection_type text not null check (selection_type in ('single','multiple')),
  is_required boolean not null default false,
  sort_order int not null default 0
);

-- ---------- ITEM OPTION CHOICES (ej "Jugoso", "Papas fritas (+500)") ----------
create table item_option_choices (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references item_option_groups(id) on delete cascade,
  name text not null,
  extra_price numeric(10,2) not null default 0,
  sort_order int not null default 0
);

-- ---------- STAFF USERS ----------
create table staff_users (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin','waiter','kitchen')),
  created_at timestamptz not null default now()
);

-- ---------- ORDERS ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references tables(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  status text not null default 'received'
    check (status in ('received','in_kitchen','ready','delivered','cancelled')),
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- ORDER ITEMS ----------
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  quantity int not null default 1,
  selected_options jsonb not null default '[]',
  note text,
  subtotal numeric(10,2) not null
);

-- ---------- WAITER CALLS ----------
create table waiter_calls (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references tables(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','attended')),
  reason text,
  created_at timestamptz not null default now(),
  attended_at timestamptz
);

-- ---------- Índices ----------
create index on menu_items(category_id);
create index on item_option_groups(menu_item_id);
create index on item_option_choices(option_group_id);
create index on order_items(order_id);
create index on orders(table_id, status);
create index on orders(restaurant_id, created_at desc);
create index on waiter_calls(restaurant_id, status);
create index on tables(qr_token);
create index on staff_users(auth_user_id);

-- ---------- updated_at automático en orders ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_set_updated_at
before update on orders
for each row execute function set_updated_at();

-- ============================================================
-- Helpers de autorización (staff)
-- ============================================================
create or replace function is_staff_of(target_restaurant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff_users
    where auth_user_id = auth.uid()
      and restaurant_id = target_restaurant_id
  );
$$;

create or replace function is_admin_of(target_restaurant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff_users
    where auth_user_id = auth.uid()
      and restaurant_id = target_restaurant_id
      and role = 'admin'
  );
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table restaurants enable row level security;
alter table tables enable row level security;
alter table categories enable row level security;
alter table menu_items enable row level security;
alter table item_option_groups enable row level security;
alter table item_option_choices enable row level security;
alter table staff_users enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table waiter_calls enable row level security;

-- Lectura pública de la carta (necesaria para /m/[tableId] sin login)
create policy "public read restaurants" on restaurants for select using (true);
create policy "public read tables" on tables for select using (true);
create policy "public read categories" on categories for select using (true);
create policy "public read menu_items" on menu_items for select using (true);
create policy "public read option groups" on item_option_groups for select using (true);
create policy "public read option choices" on item_option_choices for select using (true);

-- El cliente crea pedidos y llama al mozo sin login
create policy "public insert orders" on orders for insert with check (true);
create policy "public insert order_items" on order_items for insert with check (true);
create policy "public insert waiter_calls" on waiter_calls for insert with check (true);

-- El cliente puede ver el estado de SU pedido (conoce el id por la URL tras crearlo)
create policy "public read orders" on orders for select using (true);
create policy "public read order_items" on order_items for select using (true);

-- Staff: gestión completa de la carta dentro de su restaurante
create policy "staff manage categories" on categories for all
  using (is_staff_of(restaurant_id)) with check (is_staff_of(restaurant_id));

create policy "staff manage menu_items" on menu_items for all
  using (is_staff_of((select restaurant_id from categories where categories.id = menu_items.category_id)))
  with check (is_staff_of((select restaurant_id from categories where categories.id = menu_items.category_id)));

create policy "staff manage option groups" on item_option_groups for all
  using (is_staff_of((select c.restaurant_id from menu_items mi join categories c on c.id = mi.category_id where mi.id = item_option_groups.menu_item_id)))
  with check (is_staff_of((select c.restaurant_id from menu_items mi join categories c on c.id = mi.category_id where mi.id = item_option_groups.menu_item_id)));

create policy "staff manage option choices" on item_option_choices for all
  using (is_staff_of((select c.restaurant_id from item_option_groups g join menu_items mi on mi.id = g.menu_item_id join categories c on c.id = mi.category_id where g.id = item_option_choices.option_group_id)))
  with check (is_staff_of((select c.restaurant_id from item_option_groups g join menu_items mi on mi.id = g.menu_item_id join categories c on c.id = mi.category_id where g.id = item_option_choices.option_group_id)));

-- Staff: operación de pedidos y llamados (cocina/mozos/admin)
create policy "staff update orders" on orders for update
  using (is_staff_of(restaurant_id)) with check (is_staff_of(restaurant_id));

create policy "staff manage waiter_calls" on waiter_calls for all
  using (is_staff_of(restaurant_id)) with check (is_staff_of(restaurant_id));

create policy "staff read waiter_calls select" on waiter_calls for select
  using (is_staff_of(restaurant_id));

-- staff_users: cada usuario ve su propia fila; los admins ven/gestionan el staff de su restaurante
create policy "staff read own row" on staff_users for select
  using (auth_user_id = auth.uid() or is_admin_of(restaurant_id));

create policy "admin manage staff" on staff_users for all
  using (is_admin_of(restaurant_id)) with check (is_admin_of(restaurant_id));

-- restaurants/tables: solo admins pueden modificar (la lectura pública ya está arriba)
create policy "admin update restaurants" on restaurants for update
  using (is_admin_of(id)) with check (is_admin_of(id));

create policy "admin insert tables" on tables for insert
  with check (is_admin_of(restaurant_id));

create policy "admin update tables" on tables for update
  using (is_admin_of(restaurant_id)) with check (is_admin_of(restaurant_id));

create policy "admin delete tables" on tables for delete
  using (is_admin_of(restaurant_id));

-- ============================================================
-- Realtime
-- ============================================================
-- Necesario para que el estado del pedido se actualice solo en /m/[tableId]
-- y para que cocina/salón (fases siguientes) vean pedidos y llamados sin
-- recargar la página.
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table waiter_calls;
