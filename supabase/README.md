# Supabase Migrations

Run in order from the Supabase SQL Editor (or `supabase db push` if you have the CLI linked):

| Order | File                              | Purpose                                              |
|-------|-----------------------------------|------------------------------------------------------|
| 1     | `0001_extensions.sql`             | Enable pgvector, pg_trgm, citext, etc.               |
| 2     | `0002_core_schema.sql`            | All tables, indexes, foreign keys, enums             |
| 3     | `0003_rls_policies.sql`           | Helper functions + RLS policies on every tenant tbl  |
| 4     | `0004_functions_triggers.sql`     | updated_at, audit, profile bootstrap, version bump   |
| 5     | `0005_seed_data.sql`              | Subscription plan catalogue                          |
| 6     | `0006_security_hardening.sql`     | Lock down trigger fns + revoke anon helpers          |
| 7     | `0007_align_profiles_schema.sql`  | Reconcile pre-existing profiles table from prior setup |

After running migrations:

1. Create storage buckets per `docs/DEPLOYMENT.md`.
2. Verify RLS is enabled — open Table Editor, every tenant table should show "RLS enabled".
3. Test isolation: create two users in two institutions, confirm cross-tenant queries return 0 rows.
