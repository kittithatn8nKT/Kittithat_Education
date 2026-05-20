-- 0011_document_ocr_jobs.sql
-- Audit table for every OCR attempt. document_versions.ocr_status remains
-- the source of truth for the *current* state; this table records the
-- history (provider, latency, cost, error per attempt) and enables retry
-- analytics + per-tenant dashboards.

create table if not exists public.document_ocr_jobs (
  id                    uuid primary key default gen_random_uuid(),
  institution_id        uuid not null references public.institutions(id) on delete cascade,
  document_version_id   uuid not null references public.document_versions(id) on delete cascade,
  attempt               integer not null default 1,
  status                text not null check (status in ('queued','processing','completed','failed','skipped')),
  provider              text not null default 'google-vision',
  language_hints        text[] not null default array['th','en'],
  pages_processed       integer,
  characters_extracted  integer,
  confidence            numeric(5,4),
  duration_ms           integer,
  cost_micro_usd        integer,
  error_code            text,
  error_message         text,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists idx_ocr_jobs_version
  on public.document_ocr_jobs (document_version_id, attempt desc);

create index if not exists idx_ocr_jobs_inst_time
  on public.document_ocr_jobs (institution_id, created_at desc);

create index if not exists idx_ocr_jobs_status_pending
  on public.document_ocr_jobs (status, created_at)
  where status in ('queued','processing');

-- Counter on document_versions so the worker can enforce a retry cap
alter table public.document_versions
  add column if not exists ocr_attempt integer not null default 0;
alter table public.document_versions
  add column if not exists ocr_max_attempts integer not null default 3;
alter table public.document_versions
  add column if not exists ocr_completed_at timestamptz;

------------------------------------------------------------
-- RLS
------------------------------------------------------------

alter table public.document_ocr_jobs enable row level security;

drop policy if exists ocr_jobs_select on public.document_ocr_jobs;
create policy ocr_jobs_select on public.document_ocr_jobs
  for select to authenticated
  using (
    public.user_has_role(
      institution_id,
      array['institution_admin','department_head']::public.member_role[]
    )
    or public.user_is_super_admin()
    or exists (
      select 1 from public.document_versions v
      where v.id = document_ocr_jobs.document_version_id
        and v.uploaded_by = auth.uid()
    )
  );

-- All writes via service_role from the worker. No insert/update policies
-- for authenticated users.
