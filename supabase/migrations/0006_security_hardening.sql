-- 0006_security_hardening.sql
-- Tighten function permissions after the initial schema is in place.
-- Addresses Supabase advisors:
--   - function_search_path_mutable on trigger functions
--   - anon_security_definer_function_executable (helper + trigger functions)

-- Set explicit search_path on trigger-only functions
alter function public.set_updated_at() set search_path = public;
alter function public.assign_document_version_number() set search_path = public;
alter function public.audit_row_change() set search_path = public;

-- Trigger-only functions: revoke all REST API exposure
-- (these run from within triggers as the row owner; they should never be
--  invokable via /rest/v1/rpc/*)
revoke all on function public.set_updated_at()                  from public, anon, authenticated;
revoke all on function public.assign_document_version_number()  from public, anon, authenticated;
revoke all on function public.audit_row_change()                from public, anon, authenticated;
revoke all on function public.handle_new_user()                 from public, anon, authenticated;

-- Helper functions: revoke from anon explicitly (keep authenticated)
revoke all on function public.user_is_member_of(uuid)                         from public, anon;
revoke all on function public.user_has_role(uuid, public.member_role[])       from public, anon;
revoke all on function public.user_is_super_admin()                            from public, anon;
grant  execute on function public.user_is_member_of(uuid)                     to authenticated;
grant  execute on function public.user_has_role(uuid, public.member_role[])   to authenticated;
grant  execute on function public.user_is_super_admin()                       to authenticated;

-- Bootstrap RPC: anon must not be able to call it
revoke all on function public.create_institution_with_admin(text,text,text,text,text,text) from public, anon;
grant  execute on function public.create_institution_with_admin(text,text,text,text,text,text) to authenticated;
