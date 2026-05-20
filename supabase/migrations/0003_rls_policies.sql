-- 0003_rls_policies.sql
-- Row-Level Security policies for all tenant-scoped tables.
-- Helper functions are defined here too (SECURITY DEFINER) so policies can
-- safely query institution_members without recursing into RLS.

------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, schema-locked)
------------------------------------------------------------

create or replace function public.user_is_member_of(p_institution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.institution_members m
    where m.institution_id = p_institution_id
      and m.user_id = auth.uid()
      and m.is_active = true
  );
$$;

create or replace function public.user_has_role(
  p_institution_id uuid,
  p_roles public.member_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.institution_members m
    where m.institution_id = p_institution_id
      and m.user_id = auth.uid()
      and m.is_active = true
      and m.role = any(p_roles)
  );
$$;

create or replace function public.user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.institution_members m
    where m.user_id = auth.uid()
      and m.role = 'super_admin'
      and m.is_active = true
  );
$$;

revoke all on function public.user_is_member_of(uuid) from public;
revoke all on function public.user_has_role(uuid, public.member_role[]) from public;
revoke all on function public.user_is_super_admin() from public;
grant execute on function public.user_is_member_of(uuid) to authenticated;
grant execute on function public.user_has_role(uuid, public.member_role[]) to authenticated;
grant execute on function public.user_is_super_admin() to authenticated;

------------------------------------------------------------
-- Enable RLS on every table
------------------------------------------------------------

alter table public.subscription_plans   enable row level security;
alter table public.institutions         enable row level security;
alter table public.profiles             enable row level security;
alter table public.departments          enable row level security;
alter table public.institution_members  enable row level security;
alter table public.documents            enable row level security;
alter table public.document_versions    enable row level security;
alter table public.document_embeddings  enable row level security;
alter table public.workflows            enable row level security;
alter table public.workflow_steps       enable row level security;
alter table public.notifications        enable row level security;
alter table public.audit_logs           enable row level security;
alter table public.ai_generations       enable row level security;

------------------------------------------------------------
-- subscription_plans  (read-only catalog for everyone authenticated)
------------------------------------------------------------

drop policy if exists subscription_plans_select on public.subscription_plans;
create policy subscription_plans_select on public.subscription_plans
  for select to authenticated
  using (is_active = true);

-- Writes only via service_role (super_admin path goes through Edge Function).

------------------------------------------------------------
-- profiles  (each user manages their own row)
------------------------------------------------------------

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      -- Allow seeing teammates within shared institutions
      select 1
      from public.institution_members m1
      join public.institution_members m2 on m1.institution_id = m2.institution_id
      where m1.user_id = auth.uid()
        and m2.user_id = profiles.id
        and m1.is_active = true
        and m2.is_active = true
    )
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

------------------------------------------------------------
-- institutions
------------------------------------------------------------

drop policy if exists institutions_select on public.institutions;
create policy institutions_select on public.institutions
  for select to authenticated
  using (
    deleted_at is null
    and (
      public.user_is_member_of(id)
      or public.user_is_super_admin()
    )
  );

-- Insert: any authenticated user can create an institution (they become admin via trigger).
drop policy if exists institutions_insert on public.institutions;
create policy institutions_insert on public.institutions
  for insert to authenticated
  with check (auth.uid() is not null);

drop policy if exists institutions_update on public.institutions;
create policy institutions_update on public.institutions
  for update to authenticated
  using (
    deleted_at is null
    and (
      public.user_has_role(id, array['institution_admin']::public.member_role[])
      or public.user_is_super_admin()
    )
  )
  with check (
    public.user_has_role(id, array['institution_admin']::public.member_role[])
    or public.user_is_super_admin()
  );

------------------------------------------------------------
-- institution_members
------------------------------------------------------------

drop policy if exists members_select on public.institution_members;
create policy members_select on public.institution_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.user_is_member_of(institution_id)
    or public.user_is_super_admin()
  );

-- Insert: institution admins add members. Special case: when an institution is first created
-- the creator inserts their own admin row (handled by trigger/bootstrap function).
drop policy if exists members_insert on public.institution_members;
create policy members_insert on public.institution_members
  for insert to authenticated
  with check (
    (
      -- Creator bootstrapping themselves into a freshly-created institution
      user_id = auth.uid()
      and role = 'institution_admin'
      and exists (
        select 1 from public.institutions i
        where i.id = institution_id
          and not exists (
            select 1 from public.institution_members m2
            where m2.institution_id = i.id
          )
      )
    )
    or public.user_has_role(institution_id, array['institution_admin']::public.member_role[])
    or public.user_is_super_admin()
  );

drop policy if exists members_update on public.institution_members;
create policy members_update on public.institution_members
  for update to authenticated
  using (
    public.user_has_role(institution_id, array['institution_admin']::public.member_role[])
    or public.user_is_super_admin()
  );

drop policy if exists members_delete on public.institution_members;
create policy members_delete on public.institution_members
  for delete to authenticated
  using (
    public.user_has_role(institution_id, array['institution_admin']::public.member_role[])
    or public.user_is_super_admin()
  );

------------------------------------------------------------
-- departments
------------------------------------------------------------

drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments
  for select to authenticated
  using (
    deleted_at is null
    and public.user_is_member_of(institution_id)
  );

drop policy if exists departments_write on public.departments;
create policy departments_write on public.departments
  for all to authenticated
  using (
    public.user_has_role(institution_id, array['institution_admin','department_head']::public.member_role[])
    or public.user_is_super_admin()
  )
  with check (
    public.user_has_role(institution_id, array['institution_admin','department_head']::public.member_role[])
    or public.user_is_super_admin()
  );

------------------------------------------------------------
-- documents
------------------------------------------------------------

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select to authenticated
  using (
    deleted_at is null
    and public.user_is_member_of(institution_id)
  );

drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents
  for insert to authenticated
  with check (
    public.user_is_member_of(institution_id)
    and created_by = auth.uid()
  );

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
  for update to authenticated
  using (
    public.user_is_member_of(institution_id)
    and (
      created_by = auth.uid()
      or public.user_has_role(institution_id, array['institution_admin','department_head']::public.member_role[])
    )
  );

------------------------------------------------------------
-- document_versions
------------------------------------------------------------

drop policy if exists dv_select on public.document_versions;
create policy dv_select on public.document_versions
  for select to authenticated
  using (public.user_is_member_of(institution_id));

drop policy if exists dv_insert on public.document_versions;
create policy dv_insert on public.document_versions
  for insert to authenticated
  with check (
    public.user_is_member_of(institution_id)
    and uploaded_by = auth.uid()
  );

drop policy if exists dv_update on public.document_versions;
create policy dv_update on public.document_versions
  for update to authenticated
  using (
    public.user_is_member_of(institution_id)
    and (
      uploaded_by = auth.uid()
      or public.user_has_role(institution_id, array['institution_admin','department_head']::public.member_role[])
    )
  );

------------------------------------------------------------
-- document_embeddings
------------------------------------------------------------

drop policy if exists embeddings_select on public.document_embeddings;
create policy embeddings_select on public.document_embeddings
  for select to authenticated
  using (public.user_is_member_of(institution_id));

-- Embeddings are written by server-side jobs using service_role.

------------------------------------------------------------
-- workflows + workflow_steps
------------------------------------------------------------

drop policy if exists workflows_select on public.workflows;
create policy workflows_select on public.workflows
  for select to authenticated
  using (
    deleted_at is null
    and public.user_is_member_of(institution_id)
  );

drop policy if exists workflows_insert on public.workflows;
create policy workflows_insert on public.workflows
  for insert to authenticated
  with check (
    public.user_is_member_of(institution_id)
    and initiated_by = auth.uid()
  );

drop policy if exists workflows_update on public.workflows;
create policy workflows_update on public.workflows
  for update to authenticated
  using (
    public.user_is_member_of(institution_id)
    and (
      initiated_by = auth.uid()
      or public.user_has_role(institution_id, array['institution_admin','department_head']::public.member_role[])
    )
  );

drop policy if exists steps_select on public.workflow_steps;
create policy steps_select on public.workflow_steps
  for select to authenticated
  using (public.user_is_member_of(institution_id));

drop policy if exists steps_update on public.workflow_steps;
create policy steps_update on public.workflow_steps
  for update to authenticated
  using (
    public.user_is_member_of(institution_id)
    and (
      approver_user_id = auth.uid()
      or public.user_has_role(institution_id, array['institution_admin']::public.member_role[])
    )
  );

------------------------------------------------------------
-- notifications
------------------------------------------------------------

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Inserts are made by server jobs using service_role.

------------------------------------------------------------
-- audit_logs  (read-only for institution admins)
------------------------------------------------------------

drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
  for select to authenticated
  using (
    institution_id is not null
    and (
      public.user_has_role(institution_id, array['institution_admin']::public.member_role[])
      or public.user_is_super_admin()
    )
  );

-- Inserts: trigger-driven, service_role only.

------------------------------------------------------------
-- ai_generations  (users see their own; admins see all in institution)
------------------------------------------------------------

drop policy if exists ai_select on public.ai_generations;
create policy ai_select on public.ai_generations
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.user_has_role(institution_id, array['institution_admin']::public.member_role[])
    or public.user_is_super_admin()
  );

-- Inserts: server-side only (service_role).
