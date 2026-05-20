# KitithatITMan.com — System Architecture

Multi-tenant Education AI Office Platform for Thai educational institutions.

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (Thai/EN)                         │
│        Next.js 15 App Router · React 19 · Tailwind CSS           │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ HTTPS
┌────────────────────────────────▼─────────────────────────────────┐
│                       Vercel Edge / Node                         │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│   │  RSC + Pages     │  │  API Routes      │  │  Middleware  │   │
│   │  (Server Comps)  │  │  /api/*          │  │  Auth + i18n │   │
│   └────────┬─────────┘  └─────────┬────────┘  └──────┬───────┘   │
└────────────┼──────────────────────┼──────────────────┼───────────┘
             │                      │                  │
             │ supabase-js (SSR)    │ Service Role     │
             │                      │                  │
┌────────────▼──────────────────────▼──────────────────▼───────────┐
│                          Supabase                                │
│  ┌────────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌────────┐  │
│  │ Postgres   │ │ Auth     │ │ Storage│ │ Realtime │ │ Edge   │  │
│  │ + pgvector │ │ JWT/OAuth│ │ S3-API │ │ pub/sub  │ │ Func.  │  │
│  └────────────┘ └──────────┘ └────────┘ └──────────┘ └────────┘  │
└────────────┬─────────────────────────────────────────────────────┘
             │
             │ Outbound calls (server-side only)
             │
┌────────────▼──────────────┐   ┌──────────────────────────────┐
│   OpenAI API              │   │  Google Cloud Vision (OCR)   │
│   - Chat / Completions    │   │  - Thai document recognition │
│   - Embeddings (1536-dim) │   │  - PDF / image processing    │
└───────────────────────────┘   └──────────────────────────────┘
```

## 2. Multi-Tenancy Model

**Pattern:** Single Database, Shared Schema, Row-Level Security.

Every tenant-owned table carries an `institution_id uuid` column. RLS policies pin all reads/writes to the caller's institution via membership lookup. There is no application-level tenant filtering — the database is the source of truth for isolation.

**Tenant root:** `institutions` table. Users are linked to institutions through `institution_members` with a `role` (super_admin, institution_admin, department_head, staff, viewer).

**Cross-tenant entities (no institution_id):**
- `auth.users` (Supabase managed)
- `public.profiles` (user metadata)
- `public.subscription_plans` (global catalog)

**Why RLS over schema-per-tenant:** Schema-per-tenant scales poorly past ~50 tenants (migrations, connection pooling, backups). RLS scales to thousands of tenants on one DB and keeps queries simple.

## 3. Roles & Permissions

| Role                | Scope             | Capabilities                                                                 |
|---------------------|-------------------|------------------------------------------------------------------------------|
| `super_admin`       | Platform-wide     | Manage all institutions, billing, platform settings. (KitithatITMan staff.)  |
| `institution_admin` | Single institution| Manage departments, users, documents, workflows, subscription.               |
| `department_head`   | Department        | Approve workflows in their department, manage department documents.          |
| `staff`             | Department        | Create documents, initiate workflows, use AI features.                       |
| `viewer`            | Department        | Read-only access to department documents.                                    |

Role checks live in three places:
1. **RLS policies** (database) — authoritative
2. **Route handlers / Server Actions** — early rejection
3. **UI** — show/hide affordances

## 4. Frontend Architecture

**Framework:** Next.js 15 App Router, React 19, TypeScript strict mode.

**Routing groups:**
- `(public)` — landing, pricing, public docs
- `(auth)` — login, signup, password reset, OAuth callback
- `(dashboard)` — authenticated app, requires institution membership
- `(admin)` — super_admin only

**Rendering strategy:**
- **Server Components** by default for data fetching (uses server Supabase client)
- **Client Components** only for interactivity (forms, modals, charts)
- **Server Actions** for mutations (auto-CSRF, type-safe)
- **Streaming** with `loading.tsx` and Suspense boundaries

**State:**
- Server state: React Query (TanStack) for client-side caching of authenticated queries
- UI state: React hooks / Zustand for transient state (sidebar, modals)
- Form state: React Hook Form + Zod

**Styling:**
- Tailwind CSS v4 (CSS-first config)
- Design tokens in `globals.css`
- Dark mode via `class` strategy + `next-themes`
- Thai typography: `Noto Sans Thai` + `Sarabun` (variable fonts via `next/font`)

**i18n:**
- `next-intl` for Thai (default) and English
- All UI strings in `messages/{th,en}.json`
- Server-side locale detection via cookie + `Accept-Language`

## 5. Backend Architecture

**API surface:**
- Server Actions for form-driven mutations (preferred)
- Route Handlers (`app/api/*/route.ts`) for webhooks, file uploads, AI streams
- Supabase Postgres functions for atomic multi-table operations

**Authentication flow:**

```
1. User → /login (email/password or OAuth)
2. supabase-js → Supabase Auth → JWT
3. JWT stored in httpOnly cookies (managed by @supabase/ssr)
4. middleware.ts refreshes session on every request
5. Server components read JWT, query DB; RLS enforces tenant isolation
```

**File upload flow:**

```
1. Client → signed upload URL request (Server Action)
2. Server validates: file size, mime type, institution storage quota
3. Server → Supabase Storage → returns signed URL
4. Client uploads directly to Storage (bypasses Next.js server)
5. Client → confirm upload (Server Action)
6. Server creates document_versions row, queues OCR job
```

**AI request flow:**

```
1. User triggers AI feature (chat, summary, search)
2. Server Action validates membership + subscription quota
3. Server calls OpenAI (server-side only — key never exposed)
4. For RAG: query document_embeddings via pgvector cosine similarity
5. Stream response back to client via Server-Sent Events
6. Log to ai_generations table (cost tracking, audit)
```

## 6. AI Workflow Integration

**Embeddings pipeline (background):**
```
document_versions.ocr_text
  → chunk (1000 tokens, 200 overlap)
  → OpenAI text-embedding-3-small (1536 dims)
  → INSERT into document_embeddings
```

**Retrieval-Augmented Generation (RAG):**
```
user query
  → embed query
  → SELECT chunk_text FROM document_embeddings
    WHERE institution_id = $tenant
    ORDER BY embedding <=> $query_embedding
    LIMIT 8
  → build prompt with retrieved context
  → OpenAI gpt-4o-mini stream
```

**TOR / Memo generators:** Template-driven with user-provided variables, then OpenAI to expand into formal Thai government register. Output goes through approval workflow before publication.

## 7. Security

| Layer            | Mechanism                                                   |
|------------------|-------------------------------------------------------------|
| Transport        | HTTPS only (Vercel default), HSTS                           |
| Authentication   | Supabase Auth, httpOnly cookies, JWT rotation               |
| Authorization    | Postgres RLS (primary), route guards, UI checks             |
| Tenant isolation | `institution_id` on every tenant row + RLS policies         |
| Secrets          | Vercel env vars, never in code, never in client bundles     |
| Uploads          | Mime type + size validation, virus scan hook (future)       |
| CSRF             | Server Actions are CSRF-safe by design (Next.js)            |
| Rate limiting    | Vercel + upstash/ratelimit per `user_id` for AI endpoints   |
| Audit            | `audit_logs` table; trigger-based on critical tables        |

**Service role key** is used only in Edge Functions or server-side admin routes for operations RLS cannot express (e.g., super_admin actions). Never exposed to the browser.

## 8. Storage Strategy

Supabase Storage buckets:

| Bucket              | Public | Use                                          |
|---------------------|--------|----------------------------------------------|
| `documents`         | No     | Uploaded files, versioned                    |
| `avatars`           | Yes    | User profile pictures                        |
| `institution-logos` | Yes    | Logos for branding                           |
| `exports`           | No     | Generated PDFs, signed downloads             |

Storage RLS policies mirror the table-level policies (path prefix = `institution_id/...`).

## 9. Subscription / Billing

Schema in place from Phase 1 (`subscription_plans`, `institutions.subscription_status`). Phase 2 wires Stripe/Omise for payment. Quotas enforced at AI/upload endpoints by comparing usage against `subscription_plans.max_*` columns.

## 10. Observability

- **App logs:** Vercel logs + structured JSON
- **DB queries:** Supabase logs + `pg_stat_statements`
- **AI cost:** `ai_generations` table aggregated per institution per month
- **Audit trail:** `audit_logs` with `actor`, `action`, `diff` JSONB
- **Errors:** Sentry (Phase 2)

## 11. Deployment Topology

```
GitHub (main)
    ↓
GitHub Actions (lint, type-check, build)
    ↓
Vercel (preview per PR, production on main)
    ↓
Supabase (cloud, single project per environment)
```

Environment separation:
- `local` — Supabase CLI local stack
- `staging` — Supabase project + Vercel preview
- `production` — Supabase project + Vercel production

## 12. Future Phases

| Phase | Scope                                                              |
|-------|--------------------------------------------------------------------|
| 1     | **Foundation** (this delivery) — schema, auth, dashboard, tenant   |
| 2     | Documents: upload, versioning, OCR (GCV), AI summary, AI search    |
| 3     | AI chat with documents (RAG), TOR generator, memo generator        |
| 4     | Workflow approvals, notifications, audit log UI                    |
| 5     | Billing (Stripe/Omise), subscription enforcement, super admin UI   |
| 6     | Mobile-friendly PWA, offline drafts, e-signature                   |
