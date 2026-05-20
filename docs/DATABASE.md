# Database Schema — KitithatITMan.com

PostgreSQL 15+ on Supabase. All tenant tables use Row-Level Security.

## Entity Relationship Overview

```
auth.users ──┐
             ├──< profiles (1:1)
             │
             └──< institution_members >── institutions ──< departments
                                              │              │
                                              │              │
                                              ├──< documents ┘
                                              │     │
                                              │     ├──< document_versions
                                              │     │         │
                                              │     │         └──< document_embeddings
                                              │     │
                                              │     └──< workflows ──< workflow_steps
                                              │
                                              ├──< notifications
                                              ├──< audit_logs
                                              └──< ai_generations

subscription_plans ── (referenced by institutions.subscription_plan_id)
```

## Core Tables

### `institutions` — Tenant root
| Column                  | Type        | Notes                                                  |
|-------------------------|-------------|--------------------------------------------------------|
| `id`                    | uuid (PK)   |                                                        |
| `name`                  | text        | Thai name                                              |
| `name_en`               | text        | English name                                           |
| `slug`                  | text UQ     | URL-safe identifier                                    |
| `type`                  | text        | primary / secondary / vocational / university          |
| `thai_id`               | text        | รหัสสถานศึกษา (10-digit code)                          |
| `address`               | text        |                                                        |
| `province`              | text        |                                                        |
| `subscription_status`   | text        | trial / active / past_due / suspended / cancelled      |
| `subscription_plan_id`  | uuid FK     | → subscription_plans                                   |
| `trial_ends_at`         | timestamptz | Default now() + 30 days                                |
| `created_at`            | timestamptz |                                                        |
| `updated_at`            | timestamptz |                                                        |
| `deleted_at`            | timestamptz | Soft delete                                            |

### `profiles` — User metadata (1:1 with auth.users)
| Column               | Type        | Notes                                |
|----------------------|-------------|--------------------------------------|
| `id`                 | uuid (PK)   | → auth.users(id)                     |
| `full_name`          | text        | English/romanized                    |
| `full_name_th`       | text        | Thai name                            |
| `avatar_url`         | text        |                                      |
| `preferred_language` | text        | 'th' (default) / 'en'                |
| `preferred_theme`    | text        | light / dark / system                |

### `institution_members` — User ↔ institution mapping
| Column            | Type            | Notes                                  |
|-------------------|-----------------|----------------------------------------|
| `id`              | uuid (PK)       |                                        |
| `institution_id`  | uuid FK         |                                        |
| `user_id`         | uuid FK         | → auth.users(id)                       |
| `role`            | member_role     | enum                                   |
| `department_id`   | uuid FK         | → departments (nullable)               |
| `title`           | text            | Job title                              |
| `is_active`       | boolean         |                                        |
| UNIQUE            | (institution_id, user_id) |                              |

### `departments` — Hierarchical
| Column                  | Type        | Notes                              |
|-------------------------|-------------|------------------------------------|
| `id`                    | uuid (PK)   |                                    |
| `institution_id`        | uuid FK     |                                    |
| `parent_department_id`  | uuid FK     | Self-reference for hierarchy       |
| `name`                  | text        |                                    |
| `code`                  | text        | Internal code, unique per inst.    |
| `head_user_id`          | uuid FK     |                                    |

### `documents` — Logical document, versions live in document_versions
| Column                 | Type        | Notes                                       |
|------------------------|-------------|---------------------------------------------|
| `id`                   | uuid (PK)   |                                             |
| `institution_id`       | uuid FK     |                                             |
| `department_id`        | uuid FK     |                                             |
| `title`                | text        |                                             |
| `document_type`        | text        | memo / tor / report / policy / form         |
| `current_version_id`   | uuid FK     | → document_versions                         |
| `visibility`           | text        | private / department / institution / public |
| `status`               | text        | draft / active / archived                   |

### `document_versions` — File-backed, OCR + AI metadata
| Column                  | Type        | Notes                                 |
|-------------------------|-------------|---------------------------------------|
| `id`                    | uuid (PK)   |                                       |
| `document_id`           | uuid FK     |                                       |
| `institution_id`        | uuid        | Denormalized for RLS performance      |
| `version_number`        | int         | Auto-incremented per document         |
| `file_path`             | text        | Storage path                          |
| `file_size_bytes`       | bigint      |                                       |
| `mime_type`             | text        |                                       |
| `ocr_text`              | text        | Full OCR output (Thai-aware)          |
| `ocr_status`            | text        | pending / processing / completed / failed |
| `ai_summary`            | text        |                                       |
| `ai_summary_status`     | text        |                                       |

### `document_embeddings` — pgvector for AI search/RAG
| Column                   | Type           | Notes                            |
|--------------------------|----------------|----------------------------------|
| `id`                     | uuid (PK)      |                                  |
| `document_version_id`    | uuid FK        |                                  |
| `institution_id`         | uuid           | Denormalized for RLS             |
| `chunk_index`            | int            |                                  |
| `chunk_text`             | text           |                                  |
| `embedding`              | vector(1536)   | OpenAI text-embedding-3-small    |
| Index                    | ivfflat        | cosine, lists=100                |

### `workflows`, `workflow_steps`
Linear approval chains. `current_step` advances on each approval. Rejection halts and notifies the initiator.

### `notifications`
Per-user, per-institution. `is_read` for inbox UX. Realtime via Supabase channel.

### `audit_logs`
Trigger-populated on critical tables. `diff` is a JSONB `{old, new}` snapshot.

### `ai_generations`
Every OpenAI call logged with token count and estimated cost. Aggregated for billing/quotas.

## Enums

```sql
member_role: super_admin | institution_admin | department_head | staff | viewer
```

## Indexes (key ones — full list in SQL migrations)

- `institution_members(user_id)` — auth lookup hot path
- `institution_members(institution_id, role)` — permission checks
- `documents(institution_id, status, created_at DESC)` — list pages
- `document_embeddings` — ivfflat cosine on `embedding`
- `notifications(user_id, is_read, created_at DESC)` — inbox
- `audit_logs(institution_id, created_at DESC)`

## RLS Strategy

Two helper functions are the workhorses (defined in `0004_functions_triggers.sql`):

```sql
public.user_is_member_of(p_institution_id uuid) returns boolean
public.user_has_role(p_institution_id uuid, p_roles member_role[]) returns boolean
```

Both are `SECURITY DEFINER` so the policy can read `institution_members` without recursing into RLS.

Pattern for every tenant table:

```sql
alter table public.<table> enable row level security;

create policy "<table>_select" on public.<table>
  for select using (
    deleted_at is null
    and public.user_is_member_of(institution_id)
  );

create policy "<table>_insert" on public.<table>
  for insert with check (
    public.user_is_member_of(institution_id)
  );

create policy "<table>_update" on public.<table>
  for update using (
    public.user_is_member_of(institution_id)
  );

-- Delete is soft (update deleted_at), no hard delete policy by default.
```

For tables with write-restricted roles (e.g., `departments` requires admin), the policy adds a `user_has_role(..., ARRAY['institution_admin','super_admin'])` check.

## Soft Delete

Every tenant table has `deleted_at timestamptz`. Application sets `deleted_at = now()` instead of `DELETE`. SELECT policies always filter `deleted_at is null`. A nightly cron purges rows past retention (Phase 2).

## Timestamps

All tables: `created_at timestamptz NOT NULL DEFAULT now()`. Tables that change: `updated_at timestamptz NOT NULL DEFAULT now()` plus a trigger `set_updated_at()` that fires `BEFORE UPDATE`.

## Migration Files

| File                              | Purpose                                          |
|-----------------------------------|--------------------------------------------------|
| `0001_extensions.sql`             | pgvector, uuid-ossp, pg_trgm, citext             |
| `0002_core_schema.sql`            | All tables, indexes, enums, foreign keys         |
| `0003_rls_policies.sql`           | Enable RLS + policies on every tenant table      |
| `0004_functions_triggers.sql`     | Helper functions, audit triggers, updated_at     |
| `0005_seed_data.sql`              | Subscription plans, sample institutions (dev)    |

Run them in order from the Supabase SQL editor or via `supabase db push`.
