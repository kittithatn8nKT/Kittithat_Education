-- 0009_document_upload_logs.sql
-- Audit table — every upload attempt (started / completed / failed) lands here.
-- Useful for: troubleshooting, abuse detection, quota dashboards, the per-user
-- "recent uploads" UI in Phase 3.

create table if not exists public.document_upload_logs (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  document_version_id uuid references public.document_versions(id) on delete set null,
  file_name           text not null,
  file_size_bytes     bigint,
  mime_type           text,
  storage_path        text,
  status              text not null check (status in ('started','completed','failed')),
  error               text,
  ip_address          inet,
  user_agent          text,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists idx_upload_logs_inst_time
  on public.document_upload_logs (institution_id, created_at desc);

create index if not exists idx_upload_logs_user_time
  on public.document_upload_logs (user_id, created_at desc);

create index if not exists idx_upload_logs_status
  on public.document_upload_logs (status, created_at desc)
  where status <> 'completed';

------------------------------------------------------------
-- RLS
------------------------------------------------------------

alter table public.document_upload_logs enable row level security;

drop policy if exists upload_logs_select on public.document_upload_logs;
create policy upload_logs_select on public.document_upload_logs
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.user_has_role(
      institution_id,
      array['institution_admin']::public.member_role[]
    )
    or public.user_is_super_admin()
  );

-- Authenticated users can log their own uploads (used by Server Actions).
drop policy if exists upload_logs_insert on public.document_upload_logs;
create policy upload_logs_insert on public.document_upload_logs
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.user_is_member_of(institution_id)
  );

-- No update policy on purpose — log rows are immutable.
