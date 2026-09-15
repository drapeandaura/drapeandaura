-- Drape & Aura product image storage setup
-- First create a PUBLIC bucket named: product-images
-- Supabase Dashboard -> Storage -> New bucket -> product-images -> Public ON

create policy "Admins can upload product images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and public.is_admin()
);

create policy "Admins can update product images"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and public.is_admin()
)
with check (
  bucket_id = 'product-images'
  and public.is_admin()
);

create policy "Admins can delete product images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and public.is_admin()
);
