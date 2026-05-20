# kitithat-edu-ai-office

Multi-tenant SaaS for Thai educational institutions (primary schools, secondary schools, vocational colleges, universities). Document management, AI-powered summarization & search, government-document generation, and workflow approvals.

> **Status: Phase 1 — Foundation.** Multi-tenant database with RLS, authentication, institution onboarding, and a Shadcn UI dashboard shell. AI/document/workflow features land in subsequent phases ([docs/ROADMAP.md](docs/ROADMAP.md)).

## Tech Stack

| Layer        | Choice                                                |
|--------------|-------------------------------------------------------|
| Frontend     | **Next.js 16** App Router + React 19 + TS strict      |
| UI           | **Shadcn UI** (base-nova preset, @base-ui/react)      |
| Styling      | **Tailwind CSS v4**, OKLCH theme tokens, dark mode    |
| Fonts        | Geist (Latin) + Noto Sans Thai (Thai)                 |
| i18n         | `next-intl` — Thai (default) + English                |
| State        | React Server Components + Server Actions              |
| Forms        | React + Zod schemas (in `features/*/schemas.ts`)      |
| Toasts       | `sonner` via shadcn                                   |
| Backend      | Supabase (Postgres + Auth + Storage + pgvector)       |
| AI           | OpenAI API (Phase 2+)                                 |
| OCR          | Google Cloud Vision (Phase 2)                         |
| Hosting      | Vercel                                                |
| Code quality | ESLint · **Prettier** · **Husky** + **lint-staged**   |

## Quick Start

```bash
# 1. Install
npm install

# 2. Environment
cp .env.example .env.local
# Fill: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Run migrations (one-shot)
PGURL='postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres' \
  node scripts/apply-migrations.mjs

# 4. Dev server
npm run dev
```

## Available Scripts

| Script              | What it does                                        |
|---------------------|-----------------------------------------------------|
| `npm run dev`       | Next dev server (Turbopack)                         |
| `npm run build`     | Production build                                    |
| `npm run start`     | Run production build                                |
| `npm run lint`      | Next ESLint                                         |
| `npm run format`    | Prettier write across the repo                      |
| `npm run format:check` | Prettier check (CI)                              |
| `npm run type-check`| `tsc --noEmit`                                      |

Husky's `pre-commit` hook runs `lint-staged`, which formats + fixes only staged files.

## Project Structure

```
.
├── .husky/                     # Git hooks (pre-commit → lint-staged)
├── docs/                       # Architecture, deployment, schema docs
├── messages/                   # i18n strings (th.json, en.json)
├── scripts/                    # apply-migrations.mjs
├── supabase/
│   ├── migrations/             # Numbered SQL migrations (0001 → 0007)
│   └── bundle.sql              # All migrations concatenated
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # login, signup, callback, signout
│   │   ├── (dashboard)/        # authenticated app (sidebar layout)
│   │   ├── onboarding/         # first-time institution setup
│   │   └── api/                # route handlers (health check)
│   ├── components/
│   │   ├── ui/                 # Shadcn primitives (button, card, …)
│   │   ├── layout/             # Sidebar, Topbar, ThemeToggle, …
│   │   └── providers/          # ThemeProvider
│   ├── config/                 # siteConfig, navigation
│   ├── features/               # Module-driven feature dirs (see below)
│   │   └── institutions/
│   │       ├── queries.ts
│   │       └── schemas.ts
│   ├── lib/
│   │   ├── supabase/           # browser, server, service-role clients
│   │   ├── i18n/               # next-intl config + request resolver
│   │   └── utils.ts            # cn(), slugify(), formatThaiDate()
│   ├── types/                  # database & app types
│   └── proxy.ts                # Next 16 proxy (session refresh + auth gate)
├── components.json             # Shadcn config
├── .prettierrc.json
├── .prettierignore
└── package.json
```

### Feature modules

`src/features/<feature>/` is a self-contained module. Convention:

```
features/<name>/
├── components/      # feature-scoped UI
├── actions/         # Server Actions
├── queries/         # server-side data fetchers
├── schemas.ts       # Zod schemas
├── types.ts         # types specific to this feature
└── index.ts         # public exports
```

**Rule:** no cross-feature imports — lift shared code to `src/lib` or `src/config`.

## Multi-Tenant Model

Every tenant-owned row carries `institution_id`. Two SECURITY DEFINER helpers (`user_is_member_of`, `user_has_role`) wrap an `institution_members` lookup. RLS policies on every table call these helpers — the database, not the app, enforces tenant isolation. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#2-multi-tenancy-model).

## Theme & Design Tokens

Tailwind v4 + Shadcn UI uses OKLCH colour space in `:root` / `.dark` blocks of [globals.css](src/app/globals.css). Primary brand colour is a blue-violet hue (256°). To rebrand, change `--primary` / `--ring` / `--sidebar-primary` in both light and dark blocks.

Thai typography optimization: `:lang(th)` block adjusts line-height and letter-spacing for Noto Sans Thai.

## Security Note

The `service_role` key bypasses RLS. It must never appear in client code, the browser, or any variable prefixed `NEXT_PUBLIC_`. Use it only in route handlers / Edge Functions where you explicitly need to act outside tenant isolation.

## License

Proprietary © KitithatITMan.com
