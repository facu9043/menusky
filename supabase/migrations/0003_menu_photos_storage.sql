-- ============================================================
-- Storage: fotos de platos
-- ============================================================

insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', true)
on conflict (id) do nothing;

-- Lectura pública (las fotos se muestran en la carta del cliente sin login)
create policy "public read menu photos"
on storage.objects for select
using (bucket_id = 'menu-photos');

-- Solo admins pueden subir/reemplazar/borrar fotos
create policy "admin upload menu photos"
on storage.objects for insert
with check (
  bucket_id = 'menu-photos'
  and exists (
    select 1 from staff_users
    where auth_user_id = auth.uid() and role = 'admin'
  )
);

create policy "admin update menu photos"
on storage.objects for update
using (
  bucket_id = 'menu-photos'
  and exists (
    select 1 from staff_users
    where auth_user_id = auth.uid() and role = 'admin'
  )
);

create policy "admin delete menu photos"
on storage.objects for delete
using (
  bucket_id = 'menu-photos'
  and exists (
    select 1 from staff_users
    where auth_user_id = auth.uid() and role = 'admin'
  )
);
