# Deployment Guide

End-to-end deployment of KitithatITMan.com — Phase 1 (Foundation).

## Prerequisites

| Tool                    | Version       | Notes                              |
|-------------------------|---------------|-------------------------------------|
| Node.js                 | 20 LTS        | `node -v`                          |
| pnpm                    | 9+            | `npm i -g pnpm`                    |
| Supabase CLI            | latest        | `npm i -g supabase`                |
| Vercel CLI (optional)   | latest        | `npm i -g vercel`                  |
| Git                     | any recent    |                                    |
| GitHub account          |               | with push to your repo             |
| Supabase account        |               | project already created            |
| OpenAI API key          |               | for embeddings + chat              |
| Google Cloud project    |               | Vision API enabled (Phase 2)       |

## Step 1 — Supabase project setup

1. Open your Supabase project: https://supabase.com/dashboard
2. **Rotate the database password** (the one shared in chat must be considered compromised).
3. Copy from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY` (server only, never to client)

### Run migrations

Open the Supabase SQL Editor and run, in order:

```
supabase/migrations/0001_extensions.sql
supabase/migrations/0002_core_schema.sql
supabase/migrations/0003_rls_policies.sql
supabase/migrations/0004_functions_triggers.sql
supabase/migrations/0005_seed_data.sql
```

Or via CLI (if you've linked the project):

```bash
supabase link --project-ref <your-ref>
supabase db push
```

### Create storage buckets

In Supabase Dashboard → Storage:

| Bucket               | Public | File size limit | Allowed MIME types                                     |
|----------------------|--------|-----------------|--------------------------------------------------------|
| `documents`          | No     | 50 MB           | application/pdf, image/*, application/vnd.openxmlformats-officedocument.*, application/msword |
| `avatars`            | Yes    | 2 MB            | image/*                                                |
| `institution-logos`  | Yes    | 2 MB            | image/*                                                |
| `exports`            | No     | 50 MB           | application/pdf                                        |

Storage RLS policies (Phase 2) will mirror table policies.

### Enable Auth providers

Authentication → Providers:
- **Email** (enabled, confirm email recommended)
- **Google** (optional, for school staff convenience)

Set Site URL and Redirect URLs:
- Local: `http://localhost:3000`
- Production: `https://kitithatitman.com` (or your domain)
- Add `/auth/callback` for both

## Step 2 — Local development

```bash
git clone https://github.com/kittithatn8nKT/Kittithat_Education.git
cd Kittithat_Education
pnpm install
cp .env.example .env.local
# Fill in the values you copied above
pnpm dev
```

Visit http://localhost:3000.

## Step 3 — Vercel deployment

1. Push to GitHub `main` branch (or use Vercel preview deploys from any branch).
2. Go to https://vercel.com/new and import the repo.
3. Add environment variables (same as `.env.local`):

| Variable                          | Scope      | Source                                       |
|-----------------------------------|------------|----------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`        | All        | Supabase Project URL                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | All        | Supabase anon key                            |
| `SUPABASE_SERVICE_ROLE_KEY`       | Server     | Supabase service role (mark as secret)       |
| `OPENAI_API_KEY`                  | Server     | OpenAI dashboard                             |
| `GOOGLE_VISION_API_KEY`           | Server     | GCP — Phase 2                                |
| `NEXT_PUBLIC_APP_URL`             | All        | e.g. `https://kitithatitman.com`             |

4. Click **Deploy**. First build will take ~3 minutes.

### Custom domain

Vercel → Settings → Domains → Add `kitithatitman.com`. Update your DNS A/CNAME records as instructed.

In Supabase, update Site URL and add the new domain to redirect URLs.

## Step 4 — Verify the deployment

1. Visit your production URL → landing page renders.
2. Sign up with a test email → confirmation email arrives.
3. Complete institution onboarding → row created in `institutions`, membership row in `institution_members`.
4. Open Supabase → Table Editor → verify isolation: log in as a second test user in a different institution, confirm they cannot see the first institution's data.
5. Check `/api/health` returns `200 OK` with DB ping.

## Step 5 — Production checklist

- [ ] Rotated the database password
- [ ] Service role key stored only in Vercel server env (not `NEXT_PUBLIC_*`)
- [ ] RLS enabled on every tenant table (run `\d+ <table>` in psql, look for "Row security policies")
- [ ] Auth email templates customized (Supabase → Authentication → Email Templates) in Thai
- [ ] CORS / Site URL restricted to production domain only
- [ ] Backups enabled (Supabase Pro tier; daily snapshots)
- [ ] Sentry or equivalent error tracking wired (Phase 2)
- [ ] Rate limiting on AI endpoints (Phase 2)

## Troubleshooting

**"new row violates row-level security policy"** — User is not a member of the institution referenced in the insert. Confirm an `institution_members` row exists for the user.

**Vercel build fails on `@supabase/ssr`** — Ensure Node 20 runtime in `package.json` `engines` field.

**Thai characters render as boxes** — Confirm `Noto Sans Thai` is loaded via `next/font/google` in `app/layout.tsx`.

**OpenAI 401 in production** — Server-only key was not set on Vercel, or accidentally prefixed `NEXT_PUBLIC_`.
