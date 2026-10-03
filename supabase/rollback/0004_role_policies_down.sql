-- ============================================================
-- Reversa de 0004_role_policies.sql
-- Vuelve a las politicas de 0001_init.sql. No modifica filas.
-- OJO: restituye las politicas inseguras SEC-LG-06 y SEC-LG-07; usar solo
-- si la migracion 0004 rompe algo y mientras se corrige.
-- Fuera de supabase/migrations/ a proposito: ninguna herramienta la aplica sola.
-- ============================================================

-- Funciones nuevas
drop function if exists create_order(text, jsonb);
drop function if exists get_public_order(text, uuid);
drop function if exists get_public_order_status(text, uuid);

-- Pedidos: politicas nuevas fuera, viejas de vuelta
drop policy if exists "staff read orders" on orders;
drop policy if exists "staff read order_items" on order_items;
drop policy if exists "public insert orders" on orders;
drop policy if exists "public insert order_items" on order_items;
drop policy if exists "public read orders" on orders;
drop policy if exists "public read order_items" on order_items;
create policy "public insert orders" on orders for insert with check (true);
create policy "public insert order_items" on order_items for insert with check (true);
create policy "public read orders" on orders for select using (true);
create policy "public read order_items" on order_items for select using (true);

-- Carta: politicas por admin fuera
drop policy if exists "admin insert categories" on categories;
drop policy if exists "admin update categories" on categories;
drop policy if exists "admin delete categories" on categories;
drop policy if exists "admin insert menu_items" on menu_items;
drop policy if exists "admin update menu_items" on menu_items;
drop policy if exists "admin delete menu_items" on menu_items;
drop policy if exists "admin insert option groups" on item_option_groups;
drop policy if exists "admin update option groups" on item_option_groups;
drop policy if exists "admin delete option groups" on item_option_groups;
drop policy if exists "admin insert option choices" on item_option_choices;
drop policy if exists "admin update option choices" on item_option_choices;
drop policy if exists "admin delete option choices" on item_option_choices;

-- Carta: politicas viejas (0001_init.sql) de vuelta
drop policy if exists "staff manage categories" on categories;
drop policy if exists "staff manage menu_items" on menu_items;
drop policy if exists "staff manage option groups" on item_option_groups;
drop policy if exists "staff manage option choices" on item_option_choices;

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
