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
