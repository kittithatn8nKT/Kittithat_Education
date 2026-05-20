-- 0007_align_profiles_schema.sql
-- Reconcile a pre-existing `profiles` table (from an earlier landing-page
-- setup) with the schema this app expects. The legacy table had
-- (id, email, full_name, role, approved, created_at, updated_at) and
-- `create table if not exists` in 0002 silently skipped it, so the
-- handle_new_user() trigger failed with:
--   ERROR: column "full_name_th" of relation "profiles" does not exist
--
-- Strategy: ADD the missing columns, do NOT drop legacy columns (the old
-- `customers` RLS policies reference profiles.approved), and relax the
-- legacy NOT NULL on email. Update handle_new_user() to also populate
-- email if the column exists, so the legacy UNIQUE(email) constraint and
-- any code still reading profiles.email keep working.

alter table public.profiles
  add column if not exists full_name_th       text,
  add column if not exists avatar_url         text,
  add column if not exists phone              text,
  add column if not exists preferred_language text not null default 'th',
  add column if not exists preferred_theme    text not null default 'system',
  add column if not exists metadata           jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_preferred_language_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_preferred_language_check
      check (preferred_language in ('th','en'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_preferred_theme_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_preferred_theme_check
      check (preferred_theme in ('light','dark','system'));
  end if;
end$$;

-- Relax legacy NOT NULL on email so the trigger can insert without it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
  ) then
    alter table public.profiles alter column email drop not null;
  end if;
end$$;

-- Trigger that adapts to whichever schema is present.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_email boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'email'
  ) into v_has_email;

  if v_has_email then
    insert into public.profiles (id, email, full_name, full_name_th, avatar_url, preferred_language)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
      new.raw_user_meta_data->>'full_name_th',
      new.raw_user_meta_data->>'avatar_url',
      coalesce(new.raw_user_meta_data->>'preferred_language', 'th')
    )
    on conflict (id) do nothing;
  else
    insert into public.profiles (id, full_name, full_name_th, avatar_url, preferred_language)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
      new.raw_user_meta_data->>'full_name_th',
      new.raw_user_meta_data->>'avatar_url',
      coalesce(new.raw_user_meta_data->>'preferred_language', 'th')
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
