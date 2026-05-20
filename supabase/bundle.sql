-- ============================================================
-- KitithatITMan Education Platform — All migrations bundled
-- Run once in Supabase Dashboard → SQL Editor → New query
-- ============================================================


-- ==============================================
-- BEGIN 0001_extensions.sql
-- ==============================================
-- 0001_extensions.sql
-- Enable PostgreSQL extensions required by the platform.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";       -- pgvector for AI embeddings
create extension if not exists "pg_trgm";      -- trigram search for Thai text
create extension if not exists "citext";       -- case-insensitive emails/slugs
create extension if not exists "unaccent";     -- diacritic-insensitive search

-- END 0001_extensions.sql

-- ==============================================
-- BEGIN 0002_core_schema.sql
-- ==============================================
-- 0002_core_schema.sql
-- Core multi-tenant schema for KitithatITMan.com Education AI Office Platform.

------------------------------------------------------------
-- ENUMS
------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type public.member_role as enum (
      'super_admin',
      'institution_admin',
      'department_head',
      'staff',
      'viewer'
    );
  end if;
end$$;

------------------------------------------------------------
-- subscription_plans  (global, no tenant)
------------------------------------------------------------

create table if not exists public.subscription_plans (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null,
  name_th           text not null,
  name_en           text not null,
  description_th    text,
  description_en    text,
  price_thb_monthly integer not null default 0,
  price_thb_yearly  integer not null default 0,
  max_users         integer,
  max_storage_mb    integer,
  max_ai_requests   integer,
  features          jsonb not null default '{}'::jsonb,
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

------------------------------------------------------------
-- institutions  (TENANT ROOT)
------------------------------------------------------------

create table if not exists public.institutions (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  name_en               text,
  slug                  citext unique not null,
  type                  text not null check (type in ('primary','secondary','vocational','university')),
  thai_id               text,
  address               text,
  province              text,
  district              text,
  postal_code           text,
  phone                 text,
  email                 citext,
  website               text,
  logo_url              text,
  subscription_status   text not null default 'trial'
                        check (subscription_status in ('trial','active','past_due','suspended','cancelled')),
  subscription_plan_id  uuid references public.subscription_plans(id),
  trial_ends_at         timestamptz default (now() + interval '30 days'),
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create index if not exists idx_institutions_slug on public.institutions (slug) where deleted_at is null;
create index if not exists idx_institutions_status on public.institutions (subscription_status) where deleted_at is null;

------------------------------------------------------------
-- profiles  (1:1 with auth.users)
------------------------------------------------------------

create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text,
  full_name_th       text,
  avatar_url         text,
  phone              text,
  preferred_language text not null default 'th' check (preferred_language in ('th','en')),
  preferred_theme    text not null default 'system' check (preferred_theme in ('light','dark','system')),
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

------------------------------------------------------------
-- departments
------------------------------------------------------------

create table if not exists public.departments (
  id                   uuid primary key default gen_random_uuid(),
  institution_id       uuid not null references public.institutions(id) on delete cascade,
  parent_department_id uuid references public.departments(id) on delete set null,
  name                 text not null,
  name_en              text,
  code                 text,
  description          text,
  head_user_id         uuid references auth.users(id),
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  unique (institution_id, code)
);

create index if not exists idx_departments_institution on public.departments (institution_id) where deleted_at is null;
create index if not exists idx_departments_parent on public.departments (parent_department_id) where deleted_at is null;

------------------------------------------------------------
-- institution_members  (user ↔ institution mapping)
------------------------------------------------------------

create table if not exists public.institution_members (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            public.member_role not null default 'staff',
  department_id   uuid references public.departments(id) on delete set null,
  title           text,
  is_active       boolean not null default true,
  invited_by      uuid references auth.users(id),
  invited_at      timestamptz,
  joined_at       timestamptz default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (institution_id, user_id)
);

create index if not exists idx_members_user on public.institution_members (user_id) where is_active = true;
create index if not exists idx_members_institution_role on public.institution_members (institution_id, role) where is_active = true;
create index if not exists idx_members_department on public.institution_members (department_id) where is_active = true;

------------------------------------------------------------
-- documents (logical) + document_versions (file-backed)
------------------------------------------------------------

create table if not exists public.documents (
  id                   uuid primary key default gen_random_uuid(),
  institution_id       uuid not null references public.institutions(id) on delete cascade,
  department_id        uuid references public.departments(id) on delete set null,
  title                text not null,
  document_type        text,
  description          text,
  tags                 text[] not null default '{}',
  current_version_id   uuid,
  created_by           uuid not null references auth.users(id),
  visibility           text not null default 'department'
                       check (visibility in ('private','department','institution','public')),
  status               text not null default 'draft'
                       check (status in ('draft','active','archived')),
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

create index if not exists idx_documents_inst_status on public.documents (institution_id, status, created_at desc) where deleted_at is null;
create index if not exists idx_documents_department on public.documents (department_id) where deleted_at is null;
create index if not exists idx_documents_tags on public.documents using gin (tags);
create index if not exists idx_documents_title_trgm on public.documents using gin (title gin_trgm_ops);

create table if not exists public.document_versions (
  id                  uuid primary key default gen_random_uuid(),
  document_id         uuid not null references public.documents(id) on delete cascade,
  institution_id      uuid not null,  -- denormalized for RLS performance
  version_number      integer not null,
  file_path           text not null,
  file_name           text not null,
  file_size_bytes     bigint,
  mime_type           text,
  checksum_sha256     text,
  ocr_text            text,
  ocr_status          text not null default 'pending'
                      check (ocr_status in ('pending','processing','completed','failed','skipped')),
  ocr_error           text,
  ai_summary          text,
  ai_summary_status   text not null default 'pending'
                      check (ai_summary_status in ('pending','processing','completed','failed','skipped')),
  ai_summary_error    text,
  uploaded_by         uuid not null references auth.users(id),
  notes               text,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  unique (document_id, version_number)
);

create index if not exists idx_dv_document on public.document_versions (document_id, version_number desc);
create index if not exists idx_dv_institution on public.document_versions (institution_id);
create index if not exists idx_dv_ocr_pending on public.document_versions (ocr_status) where ocr_status = 'pending';

alter table public.documents
  add constraint documents_current_version_fk
  foreign key (current_version_id) references public.document_versions(id)
  on delete set null
  deferrable initially deferred;

------------------------------------------------------------
-- document_embeddings  (pgvector RAG store)
------------------------------------------------------------

create table if not exists public.document_embeddings (
  id                   uuid primary key default gen_random_uuid(),
  document_version_id  uuid not null references public.document_versions(id) on delete cascade,
  institution_id       uuid not null,
  chunk_index          integer not null,
  chunk_text           text not null,
  embedding            vector(1536),
  metadata             jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  unique (document_version_id, chunk_index)
);

create index if not exists idx_embeddings_institution on public.document_embeddings (institution_id);
create index if not exists idx_embeddings_vector on public.document_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

------------------------------------------------------------
-- workflows + workflow_steps
------------------------------------------------------------

create table if not exists public.workflows (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  name            text not null,
  document_id     uuid references public.documents(id) on delete set null,
  initiated_by    uuid not null references auth.users(id),
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected','cancelled')),
  current_step    integer not null default 1,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz,
  deleted_at      timestamptz
);

create index if not exists idx_workflows_inst_status on public.workflows (institution_id, status) where deleted_at is null;
create index if not exists idx_workflows_document on public.workflows (document_id) where deleted_at is null;

create table if not exists public.workflow_steps (
  id                 uuid primary key default gen_random_uuid(),
  workflow_id        uuid not null references public.workflows(id) on delete cascade,
  institution_id     uuid not null,
  step_number        integer not null,
  approver_user_id   uuid references auth.users(id),
  approver_role      public.member_role,
  status             text not null default 'pending'
                     check (status in ('pending','approved','rejected','skipped')),
  decided_at         timestamptz,
  comment            text,
  created_at         timestamptz not null default now(),
  unique (workflow_id, step_number)
);

create index if not exists idx_steps_approver on public.workflow_steps (approver_user_id) where status = 'pending';

------------------------------------------------------------
-- notifications
------------------------------------------------------------

create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  type            text not null,
  title           text not null,
  body            text,
  link            text,
  is_read         boolean not null default false,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, is_read, created_at desc);

------------------------------------------------------------
-- audit_logs
------------------------------------------------------------

create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid references public.institutions(id) on delete set null,
  actor_user_id   uuid references auth.users(id) on delete set null,
  action          text not null,
  resource_type   text,
  resource_id     text,
  diff            jsonb,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_audit_inst_time on public.audit_logs (institution_id, created_at desc);
create index if not exists idx_audit_actor on public.audit_logs (actor_user_id, created_at desc);

------------------------------------------------------------
-- ai_generations  (token & cost tracking)
------------------------------------------------------------

create table if not exists public.ai_generations (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete cascade,
  user_id           uuid not null references auth.users(id),
  generation_type   text not null check (generation_type in ('summary','tor','memo','chat','search','embedding')),
  prompt            text,
  result            text,
  model             text,
  tokens_input      integer,
  tokens_output     integer,
  cost_usd          numeric(10,6),
  status            text not null default 'completed' check (status in ('completed','failed')),
  error             text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists idx_ai_inst_time on public.ai_generations (institution_id, created_at desc);
create index if not exists idx_ai_user_time on public.ai_generations (user_id, created_at desc);

-- END 0002_core_schema.sql

-- ==============================================
-- BEGIN 0003_rls_policies.sql
-- ==============================================
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

-- END 0003_rls_policies.sql

-- ==============================================
-- BEGIN 0004_functions_triggers.sql
-- ==============================================
-- 0004_functions_triggers.sql
-- updated_at triggers, audit logging, profile bootstrap, institution helpers.

------------------------------------------------------------
-- updated_at trigger
------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'subscription_plans','institutions','profiles','departments',
      'institution_members','documents','workflows'
    ])
  loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%s;', t, t);
    execute format(
      'create trigger trg_%s_updated_at before update on public.%s
       for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end$$;

------------------------------------------------------------
-- Auto-create profile when a user signs up
------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, full_name_th, avatar_url, preferred_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'full_name_th',
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'preferred_language', 'th')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------
-- Bootstrap: create institution + admin membership atomically
------------------------------------------------------------

create or replace function public.create_institution_with_admin(
  p_name        text,
  p_name_en     text,
  p_slug        text,
  p_type        text,
  p_thai_id     text default null,
  p_province    text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_institution_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Institution name required';
  end if;

  insert into public.institutions (name, name_en, slug, type, thai_id, province)
  values (p_name, p_name_en, lower(p_slug), p_type, p_thai_id, p_province)
  returning id into v_institution_id;

  insert into public.institution_members (
    institution_id, user_id, role, is_active, joined_at
  ) values (
    v_institution_id, v_user_id, 'institution_admin', true, now()
  );

  insert into public.audit_logs (institution_id, actor_user_id, action, resource_type, resource_id)
  values (v_institution_id, v_user_id, 'institution.created', 'institution', v_institution_id::text);

  return v_institution_id;
end;
$$;

revoke all on function public.create_institution_with_admin(text,text,text,text,text,text) from public;
grant execute on function public.create_institution_with_admin(text,text,text,text,text,text) to authenticated;

------------------------------------------------------------
-- Auto-increment document version_number per document
------------------------------------------------------------

create or replace function public.assign_document_version_number()
returns trigger
language plpgsql
as $$
begin
  if new.version_number is null or new.version_number = 0 then
    select coalesce(max(version_number), 0) + 1
      into new.version_number
      from public.document_versions
     where document_id = new.document_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dv_assign_version on public.document_versions;
create trigger trg_dv_assign_version
  before insert on public.document_versions
  for each row execute function public.assign_document_version_number();

------------------------------------------------------------
-- Audit logging trigger (generic)
------------------------------------------------------------

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_institution_id uuid;
  v_action text;
  v_resource_id text;
  v_diff jsonb;
begin
  if (tg_op = 'INSERT') then
    v_action := tg_table_name || '.created';
    v_resource_id := (row_to_json(new)->>'id');
    v_institution_id := nullif(row_to_json(new)->>'institution_id','')::uuid;
    v_diff := jsonb_build_object('new', to_jsonb(new));
  elsif (tg_op = 'UPDATE') then
    v_action := tg_table_name || '.updated';
    v_resource_id := (row_to_json(new)->>'id');
    v_institution_id := nullif(row_to_json(new)->>'institution_id','')::uuid;
    v_diff := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  elsif (tg_op = 'DELETE') then
    v_action := tg_table_name || '.deleted';
    v_resource_id := (row_to_json(old)->>'id');
    v_institution_id := nullif(row_to_json(old)->>'institution_id','')::uuid;
    v_diff := jsonb_build_object('old', to_jsonb(old));
  end if;

  insert into public.audit_logs (
    institution_id, actor_user_id, action, resource_type, resource_id, diff
  ) values (
    v_institution_id, auth.uid(), v_action, tg_table_name, v_resource_id, v_diff
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

-- Audit critical tables only (chatty tables like notifications/ai_generations skipped)
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'institutions','institution_members','departments',
      'documents','document_versions','workflows','workflow_steps'
    ])
  loop
    execute format('drop trigger if exists trg_audit_%s on public.%s;', t, t);
    execute format(
      'create trigger trg_audit_%s
       after insert or update or delete on public.%s
       for each row execute function public.audit_row_change();',
      t, t
    );
  end loop;
end$$;

------------------------------------------------------------
-- Convenience view: current user's memberships
------------------------------------------------------------

create or replace view public.my_memberships as
  select
    m.id              as membership_id,
    m.role,
    m.department_id,
    m.title,
    m.is_active,
    i.id              as institution_id,
    i.name            as institution_name,
    i.slug            as institution_slug,
    i.type            as institution_type,
    i.subscription_status
  from public.institution_members m
  join public.institutions i on i.id = m.institution_id
  where m.user_id = auth.uid()
    and m.is_active = true
    and i.deleted_at is null;

grant select on public.my_memberships to authenticated;

-- END 0004_functions_triggers.sql

-- ==============================================
-- BEGIN 0005_seed_data.sql
-- ==============================================
-- 0005_seed_data.sql
-- Subscription plan catalogue. Idempotent.

insert into public.subscription_plans (code, name_th, name_en, description_th, description_en,
  price_thb_monthly, price_thb_yearly, max_users, max_storage_mb, max_ai_requests, features, sort_order)
values
  ('free', 'ทดลองใช้งาน', 'Free Trial',
   'แพ็กเกจทดลองใช้งาน 30 วัน เหมาะสำหรับการประเมินระบบ',
   '30-day trial. Limited features for evaluation.',
   0, 0, 5, 500, 100,
   '{"ai_chat": true, "ocr": false, "workflows": false, "audit_log": false}'::jsonb, 1),

  ('starter', 'เริ่มต้น', 'Starter',
   'เหมาะสำหรับโรงเรียนขนาดเล็ก',
   'For small schools.',
   1990, 19900, 25, 10000, 2000,
   '{"ai_chat": true, "ocr": true, "workflows": true, "audit_log": true, "support": "email"}'::jsonb, 2),

  ('pro', 'โปร', 'Professional',
   'เหมาะสำหรับโรงเรียนมัธยม วิทยาลัย และมหาวิทยาลัย',
   'For secondary schools, colleges, and universities.',
   4990, 49900, 100, 50000, 10000,
   '{"ai_chat": true, "ocr": true, "workflows": true, "audit_log": true, "support": "priority", "tor_generator": true, "memo_generator": true}'::jsonb, 3),

  ('enterprise', 'องค์กร', 'Enterprise',
   'สำหรับมหาวิทยาลัยและองค์กรขนาดใหญ่ ปรับแต่งได้',
   'For large universities and multi-campus organizations. Custom contract.',
   0, 0, null, null, null,
   '{"ai_chat": true, "ocr": true, "workflows": true, "audit_log": true, "support": "dedicated", "tor_generator": true, "memo_generator": true, "sso": true, "white_label": true, "sla": true}'::jsonb, 4)
on conflict (code) do update set
  name_th = excluded.name_th,
  name_en = excluded.name_en,
  description_th = excluded.description_th,
  description_en = excluded.description_en,
  price_thb_monthly = excluded.price_thb_monthly,
  price_thb_yearly = excluded.price_thb_yearly,
  max_users = excluded.max_users,
  max_storage_mb = excluded.max_storage_mb,
  max_ai_requests = excluded.max_ai_requests,
  features = excluded.features,
  sort_order = excluded.sort_order,
  updated_at = now();

-- END 0005_seed_data.sql

-- ==============================================
-- BEGIN 0006_security_hardening.sql
-- ==============================================
-- 0006_security_hardening.sql
-- Tighten function permissions after the initial schema is in place.
-- Addresses Supabase advisors:
--   - function_search_path_mutable on trigger functions
--   - anon_security_definer_function_executable (helper + trigger functions)

-- Set explicit search_path on trigger-only functions
alter function public.set_updated_at() set search_path = public;
alter function public.assign_document_version_number() set search_path = public;
alter function public.audit_row_change() set search_path = public;

-- Trigger-only functions: revoke all REST API exposure
-- (these run from within triggers as the row owner; they should never be
--  invokable via /rest/v1/rpc/*)
revoke all on function public.set_updated_at()                  from public, anon, authenticated;
revoke all on function public.assign_document_version_number()  from public, anon, authenticated;
revoke all on function public.audit_row_change()                from public, anon, authenticated;
revoke all on function public.handle_new_user()                 from public, anon, authenticated;

-- Helper functions: revoke from anon explicitly (keep authenticated)
revoke all on function public.user_is_member_of(uuid)                         from public, anon;
revoke all on function public.user_has_role(uuid, public.member_role[])       from public, anon;
revoke all on function public.user_is_super_admin()                            from public, anon;
grant  execute on function public.user_is_member_of(uuid)                     to authenticated;
grant  execute on function public.user_has_role(uuid, public.member_role[])   to authenticated;
grant  execute on function public.user_is_super_admin()                       to authenticated;

-- Bootstrap RPC: anon must not be able to call it
revoke all on function public.create_institution_with_admin(text,text,text,text,text,text) from public, anon;
grant  execute on function public.create_institution_with_admin(text,text,text,text,text,text) to authenticated;

-- END 0006_security_hardening.sql

-- ==============================================
-- BEGIN 0007_align_profiles_schema.sql
-- ==============================================
-- 0007_align_profiles_schema.sql
-- Reconcile a pre-existing `profiles` table (from an earlier landing-page
-- setup) with the schema this app expects. The legacy table had
-- (id, email, full_name, role, approved, created_at, updated_at) and
-- `create table if not exists` in 0002 silently skipped it, so the
-- handle_new_user() trigger failed with:
--   ERROR: column "full_name_th" of relation "profiles" does not exist
--
-- Strategy: ADD the missing columns, do NOT drop legacy columns (the old
-- `customers` RLS policies reference profiles.approved), and relax the
-- legacy NOT NULL on email. Update handle_new_user() to also populate
-- email if the column exists, so the legacy UNIQUE(email) constraint and
-- any code still reading profiles.email keep working.

alter table public.profiles
  add column if not exists full_name_th       text,
  add column if not exists avatar_url         text,
  add column if not exists phone              text,
  add column if not exists preferred_language text not null default 'th',
  add column if not exists preferred_theme    text not null default 'system',
  add column if not exists metadata           jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_preferred_language_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_preferred_language_check
      check (preferred_language in ('th','en'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_preferred_theme_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_preferred_theme_check
      check (preferred_theme in ('light','dark','system'));
  end if;
end$$;

-- Relax legacy NOT NULL on email so the trigger can insert without it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
  ) then
    alter table public.profiles alter column email drop not null;
  end if;
end$$;

-- Trigger that adapts to whichever schema is present.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_email boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
  ) into v_has_email;

  if v_has_email then
    insert into public.profiles (id, email, full_name, full_name_th, avatar_url, preferred_language)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
      new.raw_user_meta_data->>'full_name_th',
      new.raw_user_meta_data->>'avatar_url',
      coalesce(new.raw_user_meta_data->>'preferred_language', 'th')
    )
    on conflict (id) do nothing;
  else
    insert into public.profiles (id, full_name, full_name_th, avatar_url, preferred_language)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
      new.raw_user_meta_data->>'full_name_th',
      new.raw_user_meta_data->>'avatar_url',
      coalesce(new.raw_user_meta_data->>'preferred_language', 'th')
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- END 0007_align_profiles_schema.sql

-- ==============================================
-- Storage buckets
-- ==============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 52428800,
   array['application/pdf','image/jpeg','image/png','image/webp','image/tiff',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'text/plain','text/csv']),
  ('avatars', 'avatars', true, 2097152,
   array['image/jpeg','image/png','image/webp','image/gif']),
  ('institution-logos', 'institution-logos', true, 2097152,
   array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('exports', 'exports', false, 52428800,
   array['application/pdf','application/zip','text/csv'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
