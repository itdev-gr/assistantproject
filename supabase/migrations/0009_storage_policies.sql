-- Storage policies for the business-images bucket.
-- Public read, super-admin write/delete.

drop policy if exists "business-images public read" on storage.objects;
create policy "business-images public read"
  on storage.objects for select
  using (bucket_id = 'business-images');

drop policy if exists "business-images super-admin write" on storage.objects;
create policy "business-images super-admin write"
  on storage.objects for insert
  with check (bucket_id = 'business-images' and public.is_super_admin());

drop policy if exists "business-images super-admin update" on storage.objects;
create policy "business-images super-admin update"
  on storage.objects for update
  using (bucket_id = 'business-images' and public.is_super_admin());

drop policy if exists "business-images super-admin delete" on storage.objects;
create policy "business-images super-admin delete"
  on storage.objects for delete
  using (bucket_id = 'business-images' and public.is_super_admin());
