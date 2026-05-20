# KitithatITMan.com — Education AI Office Platform

Multi-tenant SaaS for Thai educational institutions (primary schools, secondary schools, vocational colleges, universities). Document management, AI-powered summarization & search, government-document generation, and workflow approvals.

> **Status: Phase 1 — Foundation.** Architecture, multi-tenant database with RLS, authentication, institution onboarding, and dashboard shell. AI/document/workflow features land in subsequent phases ([docs/ROADMAP.md](docs/ROADMAP.md)).

## Tech Stack

| Layer       | Choice                                      |
|-------------|---------------------------------------------|
| Frontend    | Next.js 15 App Router + React 19 + TS       |
| Styling     | Tailwind CSS v4, `next-themes`, Noto Sans Thai |
| i18n        | `next-intl` — Thai (default) + English      |
| Backend     | Supabase (Postgres + Auth + Storage)        |
| AI          | OpenAI API (chat, embeddings)               |
| Vector DB   | Supabase pgvector                            |
| OCR         | Google Cloud Vision (Phase 2)               |
| Hosting     | Vercel                                       |

## Quick Start

```bash
pnpm install
cp .env.example .env.local
# Fill in Supabase URL, anon key, service role, OpenAI key
pnpm dev
```

Run SQL migrations from [supabase/migrations/](supabase/migrations/) in numbered order via the Supabase SQL Editor.

## Documentation

- **[Architecture](docs/ARCHITECTURE.md)** — multi-tenancy, RLS, AI workflows, security
- **[Database](docs/DATABASE.md)** — schema, ERD, RLS strategy
- **[Deployment](docs/DEPLOYMENT.md)** — Supabase setup, Vercel, environment vars
- **[Roadmap](docs/ROADMAP.md)** — what's in each phase

## Project Structure

```
.
├── docs/                       # Architecture, deployment, schema docs
├── supabase/migrations/        # Numbered SQL migrations
├── messages/                   # i18n strings (th.json, en.json)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # login, signup, callback
│   │   ├── (dashboard)/        # authenticated app
│   │   ├── (public)/           # landing
│   │   └── api/                # route handlers
│   ├── components/             # UI components
│   ├── lib/
│   │   ├── supabase/           # browser, server, middleware clients
│   │   └── i18n/               # next-intl config
│   ├── types/                  # database & app types
│   └── middleware.ts           # session refresh + locale
└── package.json
```

## Multi-Tenant Model in One Paragraph

Every tenant-owned row carries `institution_id`. Two SECURITY DEFINER helper functions (`user_is_member_of`, `user_has_role`) wrap an `institution_members` lookup. RLS policies on every table call these helpers — the database itself, not the application, enforces tenant isolation. A user with no membership row sees nothing. A user with membership in Institution A sees only Institution A's data. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#2-multi-tenancy-model) for the full discussion.

## Security Note

The `service_role` key bypasses RLS. It must never appear in client code, the browser, or any variable prefixed `NEXT_PUBLIC_`. Use it only in route handlers and Edge Functions where you explicitly need to act outside tenant isolation (e.g., super-admin operations, background embedding jobs).

## License

Proprietary © KitithatITMan.com
