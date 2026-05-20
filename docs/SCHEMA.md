# Database Schema — kitithat-edu-ai-office

Definitive reference for the multi-tenant Postgres schema. Mirrors what's actually deployed in Supabase (migrations `0001` through `0008`).

Design constraints — every tenant-owned row carries `institution_id`, every table has UUID primary keys, soft delete via `deleted_at`, timestamps via `created_at`/`updated_at`, and RLS is enabled on every table.

---

## 1. ER Diagram

```mermaid
erDiagram
  auth_users ||--o| profiles : "1:1"
  auth_users ||--o{ institution_members : "joins via"

  institutions ||--o{ institution_members : "has"
  institutions ||--o{ departments : "has"
  institutions ||--o{ documents : "owns"
  institutions ||--o{ workflows : "owns"
  institutions ||--o{ notifications : "owns"
  institutions ||--o{ audit_logs : "owns"
  institutions ||--o{ ai_generations : "owns"
  subscription_plans ||--o{ institutions : "plan_for"

  departments ||--o{ institution_members : "assigns"
  departments ||--o{ documents : "categorises"
  departments ||--o{ departments : "parent_of"

  documents ||--o{ document_versions : "versions"
  document_versions ||--o{ document_embeddings : "chunks"
  documents ||--o{ workflows : "approval_for"
  workflows ||--o{ workflow_steps : "has"

  auth_users {
    uuid id PK
    text email UK
  }

  profiles {
    uuid id PK_FK
    text full_name
    text full_name_th
    text avatar_url
    text phone
    text preferred_language
    text preferred_theme
    timestamptz created_at
    timestamptz updated_at
  }

  subscription_plans {
    uuid id PK
    text code UK "free/starter/pro/enterprise"
    text name_th
    text name_en
    int price_thb_monthly
    int max_users
    int max_storage_mb
    int max_ai_requests
    jsonb features
  }

  institutions {
    uuid id PK
    text name
    text name_en
    citext slug UK
    text type "primary/secondary/vocational/university"
    text thai_id "รหัสสถานศึกษา"
    text province
    text subscription_status
    uuid subscription_plan_id FK
    timestamptz trial_ends_at
    timestamptz created_at
    timestamptz updated_at
    timestamptz deleted_at "soft"
  }

  institution_members {
    uuid id PK
    uuid institution_id FK
    uuid user_id FK
    member_role role
    uuid department_id FK
    text title
    bool is_active
    timestamptz joined_at
  }

  departments {
    uuid id PK
    uuid institution_id FK
    uuid parent_department_id FK
    text name
    text code
    uuid head_user_id FK
    timestamptz deleted_at "soft"
  }

  documents {
    uuid id PK
    uuid institution_id FK
    uuid department_id FK
    text title
    text document_type "memo/tor/report/policy/form"
    text_array tags
    uuid current_version_id FK
    uuid created_by FK
    text visibility "private/department/institution/public"
    text status "draft/active/archived"
    timestamptz deleted_at "soft"
  }

  document_versions {
    uuid id PK
    uuid document_id FK
    uuid institution_id "denorm for RLS"
    int version_number
    text file_path "Storage path"
    bigint file_size_bytes
    text mime_type
    text ocr_text
    text ocr_status "pending/processing/completed/failed/skipped"
    text ai_summary
    uuid uploaded_by FK
  }

  document_embeddings {
    uuid id PK
    uuid document_version_id FK
    uuid institution_id "denorm for RLS"
    int chunk_index
    text chunk_text
    vector embedding "1536-dim, OpenAI text-embedding-3-small"
  }

  workflows {
    uuid id PK
    uuid institution_id FK
    uuid document_id FK
    uuid initiated_by FK
    text status "pending/approved/rejected/cancelled"
    int current_step
    timestamptz deleted_at "soft"
  }

  workflow_steps {
    uuid id PK
    uuid workflow_id FK
    uuid institution_id "denorm for RLS"
    int step_number
    uuid approver_user_id FK
    member_role approver_role
    text status "pending/approved/rejected/skipped"
  }

  notifications {
    uuid id PK
    uuid institution_id FK
    uuid user_id FK
    text type
    text title
    bool is_read
  }

  audit_logs {
    uuid id PK
    uuid institution_id FK
    uuid actor_user_id FK
    text action "table.created/updated/deleted"
    text resource_type
    text resource_id
    jsonb diff
  }

  ai_generations {
    uuid id PK
    uuid institution_id FK
    uuid user_id FK
    text generation_type "summary/tor/memo/chat/search/embedding"
    text model
    int tokens_input
    int tokens_output
    numeric cost_usd
  }
```

GitHub renders this Mermaid block natively in markdown previews.

---

## 2. PostgreSQL Schema (deployed)

13 application tables + 4 storage buckets, all in the `public` schema except auth which lives in `auth.*`.

| Table                  | RLS | Soft-delete | Audit | Purpose                                      |
|------------------------|:---:|:-----------:|:-----:|----------------------------------------------|
| `subscription_plans`   | ✔  |             |       | Global plan catalogue (no tenant)            |
| `profiles`             | ✔  |             |       | 1:1 with `auth.users`                        |
| `institutions`         | ✔  | ✔           | ✔     | **Tenant root**                              |
| `institution_members`  | ✔  |             | ✔     | User ↔ institution mapping (carries role)    |
| `departments`          | ✔  | ✔           | ✔     | Hierarchical org structure                   |
| `documents`            | ✔  | ✔           | ✔     | Logical document                             |
| `document_versions`    | ✔  |             | ✔     | File-backed version, OCR + AI metadata       |
| `document_embeddings`  | ✔  |             |       | pgvector chunks (1536-dim)                   |
| `workflows`            | ✔  | ✔           | ✔     | Linear approval chain                        |
| `workflow_steps`       | ✔  |             | ✔     | Per-step approver + decision                 |
| `notifications`        | ✔  |             |       | Per-user inbox                               |
| `audit_logs`           | ✔  |             |       | Trigger-populated event log                  |
| `ai_generations`       | ✔  |             |       | Token + cost tracking per OpenAI call        |

Every tenant table has:

```sql
id              uuid primary key default gen_random_uuid(),
institution_id  uuid not null references public.institutions(id) on delete cascade,
-- ... business columns ...
created_at      timestamptz not null default now(),
updated_at      timestamptz not null default now(),  -- on tables that mutate
deleted_at      timestamptz                          -- on soft-delete tables
```

`document_versions`, `document_embeddings`, and `workflow_steps` also carry a **denormalised** `institution_id` so RLS policies don't need to join to the parent table — keeps the hot path fast.

---

## 3. Migration Files

Run in numerical order via Supabase SQL Editor, or one-shot through the pooler:

```bash
PGURL='postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres' \
  node scripts/apply-migrations.mjs
```

| # | File                              | Purpose                                                      |
|---|-----------------------------------|--------------------------------------------------------------|
| 1 | `0001_extensions.sql`             | `pgvector`, `pg_trgm`, `citext`, `unaccent`, `pgcrypto`, etc.|
| 2 | `0002_core_schema.sql`            | All 13 tables, indexes, FKs, enums                           |
| 3 | `0003_rls_policies.sql`           | Helper functions + RLS on every tenant table                 |
| 4 | `0004_functions_triggers.sql`     | `updated_at`, audit, version bump, profile bootstrap, RPC    |
| 5 | `0005_seed_data.sql`              | Subscription plan catalogue (free / starter / pro / ent.)    |
| 6 | `0006_security_hardening.sql`     | Revoke trigger fns + lock helpers to authenticated only      |
| 7 | `0007_align_profiles_schema.sql`  | Reconcile pre-existing profiles tables on existing projects  |
| 8 | `0008_storage_policies.sql`       | Storage bucket RLS (new — this delivery)                     |

---

## 4. RLS Policies

### 4.1 Helper functions (security-definer, locked to `authenticated`)

```sql
public.user_is_member_of(p_institution_id uuid) returns boolean
public.user_has_role(p_institution_id uuid, p_roles member_role[]) returns boolean
public.user_is_super_admin() returns boolean
```

Both are `SECURITY DEFINER` with `search_path = public` set explicitly. They wrap an `institution_members` lookup — RLS policies invoke them to break recursion when checking membership.

### 4.2 Standard pattern

```sql
alter table public.<table> enable row level security;

-- READ: deleted rows are invisible; tenant isolation enforced
create policy <table>_select on public.<table>
  for select to authenticated using (
    deleted_at is null
    and public.user_is_member_of(institution_id)
  );

-- INSERT: caller must be a member, and must "own" the row they're creating
create policy <table>_insert on public.<table>
  for insert to authenticated with check (
    public.user_is_member_of(institution_id)
    and created_by = auth.uid()
  );

-- UPDATE: owner OR institution admin / department head
create policy <table>_update on public.<table>
  for update to authenticated using (
    public.user_is_member_of(institution_id)
    and (
      created_by = auth.uid()
      or public.user_has_role(
        institution_id,
        array['institution_admin','department_head']::public.member_role[]
      )
    )
  );

-- DELETE: omitted by convention — application sets deleted_at = now() instead
```

### 4.3 Special cases

| Table                  | Why it differs                                                                  |
|------------------------|---------------------------------------------------------------------------------|
| `subscription_plans`   | Public catalogue. `SELECT` open to `authenticated`. Writes via service_role.    |
| `profiles`             | Self + teammates within shared institutions. No tenant column.                  |
| `institutions`         | INSERT open to any authenticated user (creates tenant). UPDATE requires admin role. |
| `institution_members`  | First-row insert exception: the creator inserts their own admin row.            |
| `audit_logs`           | SELECT only for institution admins. Inserts via triggers (service_role).        |
| `ai_generations`       | Users see their own rows. Admins see all in their institution.                  |

### 4.4 Tenant bootstrap RPC

```sql
create_institution_with_admin(p_name, p_name_en, p_slug, p_type, p_thai_id, p_province)
  returns uuid
  security definer
```

Atomically inserts the institution + the creator's `institution_admin` membership + an audit log entry. Exposed to `authenticated` only.

---

## 5. Index Strategy

Indexes are colocated with their tables in `0002_core_schema.sql`. Strategy:

| Index kind                                          | Where                                                           | Why                                  |
|-----------------------------------------------------|------------------------------------------------------------------|--------------------------------------|
| Hot-path FK lookups                                 | `institution_members(user_id)` partial WHERE `is_active`         | Auth flow: who am I?                 |
| Role checks                                         | `institution_members(institution_id, role)` partial             | RLS helper hot path                   |
| List-page sorts                                     | `documents(institution_id, status, created_at DESC)` partial    | Paginated dashboards                  |
| Full-text-ish search                                | `documents(title) USING gin (gin_trgm_ops)`                     | Type-ahead title search               |
| Array containment                                   | `documents(tags) USING gin`                                     | Tag filtering                         |
| Vector cosine                                       | `document_embeddings(embedding) USING ivfflat lists=100`        | RAG / AI search                       |
| Inbox                                               | `notifications(user_id, is_read, created_at DESC)`              | Bell icon query                       |
| Audit                                               | `audit_logs(institution_id, created_at DESC)`                   | Admin event feed                      |
| Background queue                                    | `document_versions(ocr_status)` partial WHERE `pending`         | OCR worker poll                       |

Partial indexes (`WHERE deleted_at IS NULL`, `WHERE is_active = true`) keep working sets small.

`pg_trgm` and `pgvector` are the only non-default extensions on the hot path; both are battle-tested on Supabase.

---

## 6. Storage Bucket Structure

Four buckets created in `storage.buckets`:

| Bucket               | Public | Limit | Path convention                                  | Allowed types                                                  |
|----------------------|:------:|:-----:|--------------------------------------------------|----------------------------------------------------------------|
| `documents`          | ✗      | 50 MB | `<institution_id>/<document_id>/<version>/<filename>` | PDF, image, Office docs                                       |
| `avatars`            | ✔      | 2 MB  | `<user_id>/<filename>`                           | image/jpeg, png, webp, gif                                     |
| `institution-logos`  | ✔      | 2 MB  | `<institution_id>/<filename>`                    | image/jpeg, png, webp, svg+xml                                 |
| `exports`            | ✗      | 50 MB | `<institution_id>/<user_id>/<filename>`          | PDF, ZIP, CSV                                                  |

### Storage RLS (migration 0008)

Storage policies on `storage.objects` mirror table-level policies — `(storage.foldername(name))[1]` extracts the first path segment, which is always the tenant key:

```sql
-- documents bucket: SELECT
create policy "documents_select_own_tenant" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and public.user_is_member_of(((storage.foldername(name))[1])::uuid)
  );

-- documents bucket: INSERT (any member can upload to their tenant's folder)
create policy "documents_insert_own_tenant" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.user_is_member_of(((storage.foldername(name))[1])::uuid)
    and (owner_id = auth.uid()::text or owner = auth.uid())
  );

-- avatars: SELECT public (bucket is public; no policy needed)
-- avatars: INSERT/UPDATE/DELETE only for the user themselves
create policy "avatars_write_self" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- institution-logos: writes only by institution admin
create policy "logos_write_admin" on storage.objects
  for all to authenticated
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

-- exports: SELECT only by the user who generated the export
create policy "exports_select_self" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
-- exports: INSERT done by service_role only (no policy → bypass)
```

Full statements live in `0008_storage_policies.sql`. They use the **same** `user_is_member_of` / `user_has_role` helpers as table policies, so adding new tenant-isolation rules to one place propagates to both layers.

---

## 7. Authentication Schema

Supabase Auth lives in the `auth.*` schema (Supabase-managed). The platform layers role/tenant data on top:

```
auth.users ─┬──< public.profiles (1:1, auto-created via trigger)
            │
            └──< public.institution_members (N:M, carries role)
                                          │
                                          └──> public.institutions
```

### 7.1 Roles (Postgres enum `member_role`)

| Role                | Scope             | Capabilities                                                                 |
|---------------------|-------------------|------------------------------------------------------------------------------|
| `super_admin`       | Platform-wide     | Manage all institutions, billing, platform settings. (KitithatITMan staff.)  |
| `institution_admin` | Single institution| Manage departments, users, documents, workflows, subscription.               |
| `department_head`   | Department        | Approve workflows in their department, manage department documents.          |
| `staff`             | Department        | Create documents, initiate workflows, use AI features.                       |
| `viewer`            | Department        | Read-only access to department documents.                                    |

### 7.2 Sign-up flow

```
1. POST /signup  →  Supabase Auth creates auth.users row + sends confirmation email
2. trigger on_auth_user_created  →  handle_new_user() inserts public.profiles row
3. user opens /onboarding (no membership yet)
4. submits institution form  →  rpc.create_institution_with_admin()
   → inserts institutions + institution_members(role=institution_admin)
   → writes audit_logs row
5. user lands on /dashboard
```

### 7.3 Session refresh

`src/proxy.ts` (Next 16's middleware-replacement convention) calls `supabase.auth.getUser()` on every request. The `@supabase/ssr` client refreshes the JWT into `httpOnly` cookies as a side effect. Unauthenticated requests for non-public paths get a 307 to `/login?next=<path>`.

### 7.4 Service-role usage

`createSupabaseServiceClient()` in `src/lib/supabase/server.ts` exposes a client that bypasses RLS. **Server-only.** Used for:

- Background OCR / embedding workers (write to `document_versions.ocr_text`, `document_embeddings`)
- Super-admin operations
- Audit-log inserts that originate outside a user session (system events)

The key lives in `SUPABASE_SERVICE_ROLE_KEY` (Vercel server env, never `NEXT_PUBLIC_*`).

---

## Verification

The deployed schema can be inspected directly:

```bash
psql "$PGURL" -c "select tablename, rowsecurity from pg_tables where schemaname='public' order by tablename"
psql "$PGURL" -c "select code, name_th, price_thb_monthly from public.subscription_plans order by sort_order"
psql "$PGURL" -c "select id, public, file_size_limit from storage.buckets order by id"
```

Or via the [scripts/apply-migrations.mjs](../scripts/apply-migrations.mjs) runner which prints the table list on completion.
