-- ============================================================
-- Datos de prueba: restaurante ficticio "El Buen Sabor"
-- ============================================================

do $$
declare
  v_restaurant_id uuid;
  v_cat_entradas uuid;
  v_cat_principales uuid;
  v_cat_bebidas uuid;
  v_item_empanadas uuid;
  v_item_provoleta uuid;
  v_item_bife uuid;
  v_item_milanesa uuid;
  v_item_ensalada uuid;
  v_item_gaseosa uuid;
  v_group_guarnicion uuid;
  v_group_punto uuid;
begin
  insert into restaurants (name, phone, address)
  values ('El Buen Sabor', '+54 11 5555-1234', 'Av. Siempre Viva 742')
  returning id into v_restaurant_id;

  insert into tables (restaurant_id, label, qr_token) values
    (v_restaurant_id, 'Mesa 1', 'mesa-1-' || substr(md5(random()::text), 1, 8)),
    (v_restaurant_id, 'Mesa 2', 'mesa-2-' || substr(md5(random()::text), 1, 8)),
    (v_restaurant_id, 'Mesa 3', 'mesa-3-' || substr(md5(random()::text), 1, 8));

  insert into categories (restaurant_id, name, sort_order) values
    (v_restaurant_id, 'Entradas', 1) returning id into v_cat_entradas;
  insert into categories (restaurant_id, name, sort_order) values
    (v_restaurant_id, 'Platos principales', 2) returning id into v_cat_principales;
  insert into categories (restaurant_id, name, sort_order) values
    (v_restaurant_id, 'Bebidas', 3) returning id into v_cat_bebidas;

  -- Entradas
  insert into menu_items (category_id, name, description, price, sort_order)
  values (v_cat_entradas, 'Empanadas (x3)', 'Carne cortada a cuchillo, jamón y queso, o verdura', 3800, 1)
  returning id into v_item_empanadas;

  insert into menu_items (category_id, name, description, price, sort_order)
  values (v_cat_entradas, 'Provoleta', 'Provolone a la parrilla con orégano y aceite de oliva', 5200, 2)
  returning id into v_item_provoleta;

  -- Platos principales
  insert into menu_items (category_id, name, description, price, sort_order)
  values (v_cat_principales, 'Bife de chorizo', '300g con guarnición a elección', 12500, 1)
  returning id into v_item_bife;

  insert into menu_items (category_id, name, description, price, sort_order)
  values (v_cat_principales, 'Milanesa napolitana', 'Con jamón, queso y salsa, guarnición a elección', 10800, 2)
  returning id into v_item_milanesa;

  insert into menu_items (category_id, name, description, price, sort_order)
  values (v_cat_principales, 'Ensalada César', 'Lechuga, pollo grillado, panceta, parmesano y aderezo césar', 8900, 3)
  returning id into v_item_ensalada;

  -- Bebidas
  insert into menu_items (category_id, name, description, price, sort_order)
  values (v_cat_bebidas, 'Gaseosa línea Coca-Cola 500ml', 'Coca-Cola, Sprite o Fanta', 2500, 1)
  returning id into v_item_gaseosa;

  insert into menu_items (category_id, name, description, price, sort_order)
  values (v_cat_bebidas, 'Agua mineral 500ml', 'Con o sin gas', 2000, 2);

  -- Opciones: guarnición (para bife y milanesa)
  insert into item_option_groups (menu_item_id, name, selection_type, is_required, sort_order)
  values (v_item_bife, 'Guarnición', 'single', true, 1)
  returning id into v_group_guarnicion;

  insert into item_option_choices (option_group_id, name, extra_price, sort_order) values
    (v_group_guarnicion, 'Papas fritas', 0, 1),
    (v_group_guarnicion, 'Puré de papas', 0, 2),
    (v_group_guarnicion, 'Ensalada mixta', 0, 3);

  insert into item_option_groups (menu_item_id, name, selection_type, is_required, sort_order)
  values (v_item_bife, 'Punto de cocción', 'single', true, 2)
  returning id into v_group_punto;

  insert into item_option_choices (option_group_id, name, extra_price, sort_order) values
    (v_group_punto, 'Jugoso', 0, 1),
    (v_group_punto, 'A punto', 0, 2),
    (v_group_punto, 'Bien cocido', 0, 3);

  insert into item_option_groups (menu_item_id, name, selection_type, is_required, sort_order)
  values (v_item_milanesa, 'Guarnición', 'single', true, 1);

  insert into item_option_choices (option_group_id, name, extra_price, sort_order)
  select id, choice.name, 0, choice.ord
  from item_option_groups,
       (values ('Papas fritas',1), ('Puré de papas',2), ('Ensalada mixta',3)) as choice(name, ord)
  where menu_item_id = v_item_milanesa;

  -- Opciones múltiples: extras para empanadas
  insert into item_option_groups (menu_item_id, name, selection_type, is_required, sort_order)
  values (v_item_empanadas, 'Extras', 'multiple', false, 1);

  insert into item_option_choices (option_group_id, name, extra_price, sort_order)
  select g.id, extra.name, extra.price, extra.ord
  from item_option_groups g,
       (values ('Salsa criolla', 500, 1), ('Ajíes en vinagre', 300, 2)) as extra(name, price, ord)
  where g.menu_item_id = v_item_empanadas;

end $$;
