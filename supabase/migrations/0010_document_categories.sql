-- 0010_document_categories.sql
-- User-managed category system for documents. The existing
-- `documents.document_type` column is system-derived from MIME and stays
-- as-is; categories are an additional tenant-managed taxonomy on top.

create table if not exists public.document_categories (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  name            text not null,
  name_en         text,
  description     text,
  /** Tailwind-compatible colour name for the category badge. */
  color           text not null default 'slate',
  /** Lucide icon name (optional). UI maps strings → components. */
  icon            text,
  sort_order      integer not null default 0,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (institution_id, name)
);

create index if not exists idx_categories_institution
  on public.document_categories (institution_id) where deleted_at is null;

-- Add the FK on documents (nullable; nullify on category delete)
alter table public.documents
  add column if not exists category_id uuid references public.document_categories(id) on delete set null;

create index if not exists idx_documents_category
  on public.documents (category_id) where deleted_at is null;

------------------------------------------------------------
-- RLS
------------------------------------------------------------

alter table public.document_categories enable row level security;

drop policy if exists categories_select on public.document_categories;
create policy categories_select on public.document_categories
  for select to authenticated
  using (
    deleted_at is null
    and public.user_is_member_of(institution_id)
  );

drop policy if exists categories_insert on public.document_categories;
create policy categories_insert on public.document_categories
  for insert to authenticated
  with check (
    public.user_has_role(
      institution_id,
      array['institution_admin','department_head']::public.member_role[]
    )
    and created_by = auth.uid()
  );

drop policy if exists categories_update on public.document_categories;
create policy categories_update on public.document_categories
  for update to authenticated
  using (
    public.user_has_role(
      institution_id,
      array['institution_admin','department_head']::public.member_role[]
    )
  );

drop policy if exists categories_delete on public.document_categories;
create policy categories_delete on public.document_categories
  for delete to authenticated
  using (
    public.user_has_role(
      institution_id,
      array['institution_admin']::public.member_role[]
    )
  );

------------------------------------------------------------
-- Triggers
------------------------------------------------------------

drop trigger if exists trg_document_categories_updated_at on public.document_categories;
create trigger trg_document_categories_updated_at
  before update on public.document_categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_audit_document_categories on public.document_categories;
create trigger trg_audit_document_categories
  after insert or update or delete on public.document_categories
  for each row execute function public.audit_row_change();
