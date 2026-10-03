-- ============================================================
-- 0004: permisos por rol (SEC-LG-06, SEC-LG-07)
-- ============================================================
-- 1) La carta (categories, menu_items, item_option_groups,
--    item_option_choices) solo la modifica un admin del restaurante.
--    La lectura publica NO cambia.
-- 2) Los pedidos dejan de ser legibles/creables por cualquiera con la
--    anon key: se crean con create_order() (recalcula el total en la base)
--    y el cliente lee SU pedido con get_public_order() /
--    get_public_order_status() (exigen qr_token de la mesa + id del pedido).
--    El staff lee los pedidos de su restaurante por RLS.
-- No modifica ni borra filas. Reversa: supabase/rollback/0004_role_policies_down.sql
-- ============================================================

-- ---------- 1. Carta solo para admin ----------
drop policy if exists "staff manage categories" on categories;
drop policy if exists "staff manage menu_items" on menu_items;
drop policy if exists "staff manage option groups" on item_option_groups;
drop policy if exists "staff manage option choices" on item_option_choices;

-- categories
drop policy if exists "admin insert categories" on categories;
drop policy if exists "admin update categories" on categories;
drop policy if exists "admin delete categories" on categories;
create policy "admin insert categories" on categories for insert
  with check (is_admin_of(restaurant_id));
create policy "admin update categories" on categories for update
  using (is_admin_of(restaurant_id)) with check (is_admin_of(restaurant_id));
create policy "admin delete categories" on categories for delete
  using (is_admin_of(restaurant_id));

-- menu_items
drop policy if exists "admin insert menu_items" on menu_items;
drop policy if exists "admin update menu_items" on menu_items;
drop policy if exists "admin delete menu_items" on menu_items;
create policy "admin insert menu_items" on menu_items for insert
  with check (is_admin_of((select c.restaurant_id from categories c where c.id = menu_items.category_id)));
create policy "admin update menu_items" on menu_items for update
  using (is_admin_of((select c.restaurant_id from categories c where c.id = menu_items.category_id)))
  with check (is_admin_of((select c.restaurant_id from categories c where c.id = menu_items.category_id)));
create policy "admin delete menu_items" on menu_items for delete
  using (is_admin_of((select c.restaurant_id from categories c where c.id = menu_items.category_id)));

-- item_option_groups
drop policy if exists "admin insert option groups" on item_option_groups;
drop policy if exists "admin update option groups" on item_option_groups;
drop policy if exists "admin delete option groups" on item_option_groups;
create policy "admin insert option groups" on item_option_groups for insert
  with check (is_admin_of((select c.restaurant_id from menu_items mi join categories c on c.id = mi.category_id where mi.id = item_option_groups.menu_item_id)));
create policy "admin update option groups" on item_option_groups for update
  using (is_admin_of((select c.restaurant_id from menu_items mi join categories c on c.id = mi.category_id where mi.id = item_option_groups.menu_item_id)))
  with check (is_admin_of((select c.restaurant_id from menu_items mi join categories c on c.id = mi.category_id where mi.id = item_option_groups.menu_item_id)));
create policy "admin delete option groups" on item_option_groups for delete
  using (is_admin_of((select c.restaurant_id from menu_items mi join categories c on c.id = mi.category_id where mi.id = item_option_groups.menu_item_id)));

-- item_option_choices
drop policy if exists "admin insert option choices" on item_option_choices;
drop policy if exists "admin update option choices" on item_option_choices;
drop policy if exists "admin delete option choices" on item_option_choices;
create policy "admin insert option choices" on item_option_choices for insert
  with check (is_admin_of((select c.restaurant_id from item_option_groups g join menu_items mi on mi.id = g.menu_item_id join categories c on c.id = mi.category_id where g.id = item_option_choices.option_group_id)));
create policy "admin update option choices" on item_option_choices for update
  using (is_admin_of((select c.restaurant_id from item_option_groups g join menu_items mi on mi.id = g.menu_item_id join categories c on c.id = mi.category_id where g.id = item_option_choices.option_group_id)))
  with check (is_admin_of((select c.restaurant_id from item_option_groups g join menu_items mi on mi.id = g.menu_item_id join categories c on c.id = mi.category_id where g.id = item_option_choices.option_group_id)));
create policy "admin delete option choices" on item_option_choices for delete
  using (is_admin_of((select c.restaurant_id from item_option_groups g join menu_items mi on mi.id = g.menu_item_id join categories c on c.id = mi.category_id where g.id = item_option_choices.option_group_id)));

-- ---------- 2. Pedidos ----------
drop policy if exists "public insert orders" on orders;
drop policy if exists "public insert order_items" on order_items;
drop policy if exists "public read orders" on orders;
drop policy if exists "public read order_items" on order_items;

drop policy if exists "staff read orders" on orders;
drop policy if exists "staff read order_items" on order_items;
create policy "staff read orders" on orders for select
  using (is_staff_of(restaurant_id));
create policy "staff read order_items" on order_items for select
  using (exists (
    select 1 from orders o
    where o.id = order_items.order_id and is_staff_of(o.restaurant_id)
  ));

-- ---------- 3. Funciones ----------

-- Crea el pedido de forma atomica. Recalcula TODO en la base: el total del
-- cliente no existe como parametro.
-- p_items: [{ "menu_item_id": uuid, "quantity": int, "choice_ids": [uuid], "note": text|null }]
-- Errores (message): table_not_found (P0002); invalid_items, item_unavailable,
-- missing_required, single_choice_exceeded (P0001).
create or replace function create_order(p_qr_token text, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c_uuid constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_table_id uuid;
  v_restaurant_id uuid;
  v_elem jsonb;
  v_menu_item_id uuid;
  v_qty int;
  v_note text;
  v_choice_ids uuid[];
  v_item record;
  v_group record;
  v_chosen int;
  v_opts jsonb;
  v_extra numeric;
  v_subtotal numeric;
  v_total numeric := 0;
  v_lines jsonb := '[]'::jsonb;
  v_order_id uuid;
begin
  if p_qr_token is null or length(p_qr_token) = 0 then
    raise exception 'table_not_found' using errcode = 'P0002';
  end if;

  select t.id, t.restaurant_id into v_table_id, v_restaurant_id
  from tables t where t.qr_token = p_qr_token;
  if v_table_id is null then
    raise exception 'table_not_found' using errcode = 'P0002';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  for v_elem in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_elem) <> 'object'
       or jsonb_typeof(v_elem -> 'menu_item_id') is distinct from 'string'
       or (v_elem ->> 'menu_item_id') !~ c_uuid
       or jsonb_typeof(v_elem -> 'quantity') is distinct from 'number'
       or (v_elem ->> 'quantity') !~ '^[0-9]{1,3}$' then
      raise exception 'invalid_items' using errcode = 'P0001';
    end if;

    v_menu_item_id := (v_elem ->> 'menu_item_id')::uuid;
    v_qty := (v_elem ->> 'quantity')::int;
    if v_qty < 1 or v_qty > 99 then
      raise exception 'invalid_items' using errcode = 'P0001';
    end if;

    if jsonb_typeof(v_elem -> 'note') = 'string' then
      v_note := nullif(left(btrim(v_elem ->> 'note'), 500), '');
    else
      v_note := null;
    end if;

    -- choice_ids: solo uuid validos; el resto (y los que no son del plato) se ignora.
    v_choice_ids := '{}';
    if jsonb_typeof(v_elem -> 'choice_ids') = 'array' then
      select coalesce(array_agg(s.x::uuid), '{}')
        into v_choice_ids
      from (
        select e.value as x
        from jsonb_array_elements_text(v_elem -> 'choice_ids') as e(value)
        where e.value ~ c_uuid
        limit 200
      ) s;
    end if;

    select mi.id, mi.price, mi.is_available, c.restaurant_id as restaurant_id
      into v_item
    from menu_items mi join categories c on c.id = mi.category_id
    where mi.id = v_menu_item_id;

    if v_item.id is null or not v_item.is_available
       or v_item.restaurant_id is distinct from v_restaurant_id then
      raise exception 'item_unavailable' using errcode = 'P0001';
    end if;

    v_opts := '[]'::jsonb;
    v_extra := 0;

    for v_group in
      select g.id, g.name, g.selection_type, g.is_required
      from item_option_groups g
      where g.menu_item_id = v_item.id
      order by g.sort_order, g.id
    loop
      select count(*) into v_chosen
      from item_option_choices ch
      where ch.option_group_id = v_group.id and ch.id = any (v_choice_ids);

      if v_group.is_required and v_chosen = 0 then
        raise exception 'missing_required' using errcode = 'P0001';
      end if;
      if v_group.selection_type = 'single' and v_chosen > 1 then
        raise exception 'single_choice_exceeded' using errcode = 'P0001';
      end if;

      v_opts := v_opts || coalesce((
        select jsonb_agg(jsonb_build_object(
          'groupId', v_group.id,
          'groupName', v_group.name,
          'choiceId', ch.id,
          'choiceName', ch.name,
          'extraPrice', ch.extra_price
        ) order by ch.sort_order, ch.id)
        from item_option_choices ch
        where ch.option_group_id = v_group.id and ch.id = any (v_choice_ids)
      ), '[]'::jsonb);

      v_extra := v_extra + coalesce((
        select sum(ch.extra_price)
        from item_option_choices ch
        where ch.option_group_id = v_group.id and ch.id = any (v_choice_ids)
      ), 0);
    end loop;

    v_subtotal := (v_item.price + v_extra) * v_qty;
    v_total := v_total + v_subtotal;

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'menu_item_id', v_item.id,
      'quantity', v_qty,
      'selected_options', v_opts,
      'note', v_note,
      'subtotal', v_subtotal
    ));
  end loop;

  -- El pedido nace con su total final (Realtime emite el INSERT ya correcto).
  insert into orders (table_id, restaurant_id, total)
  values (v_table_id, v_restaurant_id, v_total)
  returning id into v_order_id;

  insert into order_items (order_id, menu_item_id, quantity, selected_options, note, subtotal)
  select v_order_id,
         (t.l ->> 'menu_item_id')::uuid,
         (t.l ->> 'quantity')::int,
         t.l -> 'selected_options',
         case when jsonb_typeof(t.l -> 'note') = 'string' then t.l ->> 'note' else null end,
         (t.l ->> 'subtotal')::numeric
  from jsonb_array_elements(v_lines) with ordinality as t(l, ord)
  order by t.ord;

  return v_order_id;
end;
$$;

-- Lectura del pedido propio: exige el qr_token de la mesa Y el id del pedido.
-- Devuelve null si no coincide (mismo trato que "no existe").
create or replace function get_public_order(p_qr_token text, p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id', o.id,
    'status', o.status,
    'total', o.total,
    'createdAt', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'quantity', oi.quantity,
        'selectedOptions', oi.selected_options,
        'note', oi.note,
        'subtotal', oi.subtotal,
        'menuItemName', mi.name,
        'photoUrl', mi.photo_url
      ) order by oi.id)
      from order_items oi
      left join menu_items mi on mi.id = oi.menu_item_id
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  into v_result
  from orders o
  join tables t on t.id = o.table_id
  where o.id = p_order_id and t.qr_token = p_qr_token;

  return v_result;
end;
$$;

create or replace function get_public_order_status(p_qr_token text, p_order_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select o.status
  from orders o
  join tables t on t.id = o.table_id
  where o.id = p_order_id and t.qr_token = p_qr_token;
$$;

revoke all on function create_order(text, jsonb) from public;
revoke all on function get_public_order(text, uuid) from public;
revoke all on function get_public_order_status(text, uuid) from public;
grant execute on function create_order(text, jsonb) to anon, authenticated;
grant execute on function get_public_order(text, uuid) to anon, authenticated;
grant execute on function get_public_order_status(text, uuid) to anon, authenticated;
