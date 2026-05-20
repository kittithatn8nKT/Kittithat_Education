-- 0004_functions_triggers.sql
-- updated_at triggers, audit logging, profile bootstrap, institution helpers.

------------------------------------------------------------
-- updated_at trigger
------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'subscription_plans','institutions','profiles','departments',
      'institution_members','documents','workflows'
    ])
  loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%s;', t, t);
    execute format(
      'create trigger trg_%s_updated_at before update on public.%s
       for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end$$;

------------------------------------------------------------
-- Auto-create profile when a user signs up
------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, full_name_th, avatar_url, preferred_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'full_name_th',
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'preferred_language', 'th')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------
-- Bootstrap: create institution + admin membership atomically
------------------------------------------------------------

create or replace function public.create_institution_with_admin(
  p_name        text,
  p_name_en     text,
  p_slug        text,
  p_type        text,
  p_thai_id     text default null,
  p_province    text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_institution_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Institution name required';
  end if;

  insert into public.institutions (name, name_en, slug, type, thai_id, province)
  values (p_name, p_name_en, lower(p_slug), p_type, p_thai_id, p_province)
  returning id into v_institution_id;

  insert into public.institution_members (
    institution_id, user_id, role, is_active, joined_at
  ) values (
    v_institution_id, v_user_id, 'institution_admin', true, now()
  );

  insert into public.audit_logs (institution_id, actor_user_id, action, resource_type, resource_id)
  values (v_institution_id, v_user_id, 'institution.created', 'institution', v_institution_id::text);

  return v_institution_id;
end;
$$;

revoke all on function public.create_institution_with_admin(text,text,text,text,text,text) from public;
grant execute on function public.create_institution_with_admin(text,text,text,text,text,text) to authenticated;

------------------------------------------------------------
-- Auto-increment document version_number per document
------------------------------------------------------------

create or replace function public.assign_document_version_number()
returns trigger
language plpgsql
as $$
begin
  if new.version_number is null or new.version_number = 0 then
    select coalesce(max(version_number), 0) + 1
      into new.version_number
      from public.document_versions
     where document_id = new.document_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dv_assign_version on public.document_versions;
create trigger trg_dv_assign_version
  before insert on public.document_versions
  for each row execute function public.assign_document_version_number();

------------------------------------------------------------
-- Audit logging trigger (generic)
------------------------------------------------------------

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_institution_id uuid;
  v_action text;
  v_resource_id text;
  v_diff jsonb;
begin
  if (tg_op = 'INSERT') then
    v_action := tg_table_name || '.created';
    v_resource_id := (row_to_json(new)->>'id');
    v_institution_id := nullif(row_to_json(new)->>'institution_id','')::uuid;
    v_diff := jsonb_build_object('new', to_jsonb(new));
  elsif (tg_op = 'UPDATE') then
    v_action := tg_table_name || '.updated';
    v_resource_id := (row_to_json(new)->>'id');
    v_institution_id := nullif(row_to_json(new)->>'institution_id','')::uuid;
    v_diff := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  elsif (tg_op = 'DELETE') then
    v_action := tg_table_name || '.deleted';
    v_resource_id := (row_to_json(old)->>'id');
    v_institution_id := nullif(row_to_json(old)->>'institution_id','')::uuid;
    v_diff := jsonb_build_object('old', to_jsonb(old));
  end if;

  insert into public.audit_logs (
    institution_id, actor_user_id, action, resource_type, resource_id, diff
  ) values (
    v_institution_id, auth.uid(), v_action, tg_table_name, v_resource_id, v_diff
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

-- Audit critical tables only (chatty tables like notifications/ai_generations skipped)
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'institutions','institution_members','departments',
      'documents','document_versions','workflows','workflow_steps'
    ])
  loop
    execute format('drop trigger if exists trg_audit_%s on public.%s;', t, t);
    execute format(
      'create trigger trg_audit_%s
       after insert or update or delete on public.%s
       for each row execute function public.audit_row_change();',
      t, t
    );
  end loop;
end$$;

------------------------------------------------------------
-- Convenience view: current user's memberships
------------------------------------------------------------

create or replace view public.my_memberships as
  select
    m.id              as membership_id,
    m.role,
    m.department_id,
    m.title,
    m.is_active,
    i.id              as institution_id,
    i.name            as institution_name,
    i.slug            as institution_slug,
    i.type            as institution_type,
    i.subscription_status
  from public.institution_members m
  join public.institutions i on i.id = m.institution_id
  where m.user_id = auth.uid()
    and m.is_active = true
    and i.deleted_at is null;

grant select on public.my_memberships to authenticated;
