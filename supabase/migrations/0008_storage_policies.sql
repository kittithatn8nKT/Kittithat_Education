-- 0008_storage_policies.sql
-- Row-level security on storage.objects, mirroring the tenant isolation
-- model used by the table policies. Path conventions:
--
--   documents/          <institution_id>/<document_id>/<version>/<file>
--   avatars/            <user_id>/<file>
--   institution-logos/  <institution_id>/<file>
--   exports/            <institution_id>/<user_id>/<file>
--
-- All policies key off (storage.foldername(name))[N] to extract the
-- relevant uuid from the object's path.

------------------------------------------------------------
-- documents bucket
------------------------------------------------------------

drop policy if exists "documents_select_own_tenant"  on storage.objects;
drop policy if exists "documents_insert_own_tenant"  on storage.objects;
drop policy if exists "documents_update_own_tenant"  on storage.objects;
drop policy if exists "documents_delete_own_tenant"  on storage.objects;

create policy "documents_select_own_tenant"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and public.user_is_member_of(((storage.foldername(name))[1])::uuid)
  );

create policy "documents_insert_own_tenant"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.user_is_member_of(((storage.foldername(name))[1])::uuid)
  );

-- Update / Delete on the file blob: uploader or admin/dept-head
create policy "documents_update_own_tenant"
  on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and public.user_is_member_of(((storage.foldername(name))[1])::uuid)
    and (
      owner = auth.uid()
      or public.user_has_role(
        ((storage.foldername(name))[1])::uuid,
        array['institution_admin','department_head']::public.member_role[]
      )
    )
  );

create policy "documents_delete_own_tenant"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and public.user_is_member_of(((storage.foldername(name))[1])::uuid)
    and (
      owner = auth.uid()
      or public.user_has_role(
        ((storage.foldername(name))[1])::uuid,
        array['institution_admin','department_head']::public.member_role[]
      )
    )
  );

------------------------------------------------------------
-- avatars bucket (public read; self-write)
------------------------------------------------------------

drop policy if exists "avatars_insert_self" on storage.objects;
drop policy if exists "avatars_update_self" on storage.objects;
drop policy if exists "avatars_delete_self" on storage.objects;

create policy "avatars_insert_self"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_self"
  on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_self"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public SELECT is automatic because bucket is `public = true`.

------------------------------------------------------------
-- institution-logos bucket (public read; admin write)
------------------------------------------------------------

drop policy if exists "logos_insert_admin" on storage.objects;
drop policy if exists "logos_update_admin" on storage.objects;
drop policy if exists "logos_delete_admin" on storage.objects;

create policy "logos_insert_admin"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'institution-logos'
    and public.user_has_role(
      ((storage.foldername(name))[1])::uuid,
      array['institution_admin']::public.member_role[]
    )
  );

create policy "logos_update_admin"
  on storage.objects
  for update to authenticated
  using (
    bucket_id = 'institution-logos'
    and public.user_has_role(
      ((storage.foldername(name))[1])::uuid,
      array['institution_admin']::public.member_role[]
    )
  )
  with check (
    bucket_id = 'institution-logos'
    and public.user_has_role(
      ((storage.foldername(name))[1])::uuid,
      array['institution_admin']::public.member_role[]
    )
  );

create policy "logos_delete_admin"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'institution-logos'
    and public.user_has_role(
      ((storage.foldername(name))[1])::uuid,
      array['institution_admin']::public.member_role[]
    )
  );

------------------------------------------------------------
-- exports bucket (private; SELECT only by the user who owns the export)
-- Path: <institution_id>/<user_id>/<filename> — segment [2] is the user id
------------------------------------------------------------

drop policy if exists "exports_select_own" on storage.objects;

create policy "exports_select_own"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.user_is_member_of(((storage.foldername(name))[1])::uuid)
  );

-- Inserts to `exports` are made by background workers using the service_role
-- key, which bypasses RLS — no INSERT policy needed for authenticated users.
