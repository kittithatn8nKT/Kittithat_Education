import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyMemberships } from "@/features/institutions";
import type { MemberRole, Membership, Profile } from "@/types/database";
import { ADMIN_ROLES, can, type Action, type Resource } from "./rbac";
import { ACTIVE_INSTITUTION_COOKIE, pickActiveMembership } from "./active-institution";

/**
 * The session shape used everywhere on the server. Fields are computed
 * once per request — call getSession() inside an RSC / Server Action
 * and TypeScript flow analysis will narrow correctly.
 */
export interface AuthenticatedSession {
  user: User;
  profile: Profile | null;
  memberships: Membership[];
  /** The currently-active membership (chosen by cookie or first match). */
  active: Membership;
  /** Convenience alias for active.role. */
  role: MemberRole;
}

export type Session = AuthenticatedSession | null;

async function readActiveInstitutionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_INSTITUTION_COOKIE)?.value ?? null;
}

/**
 * Read the current session. Returns null if no user, or if the user has no
 * institution memberships yet (still in onboarding).
 *
 * Pure read: never redirects. Use requireSession() to enforce.
 */
export async function getSession(): Promise<Session> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const memberships = await getMyMemberships();
  if (memberships.length === 0) return null;

  const hint = await readActiveInstitutionId();
  const active = pickActiveMembership(memberships, hint);
  if (!active) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, full_name_th, avatar_url, phone, preferred_language, preferred_theme, created_at, updated_at, metadata"
    )
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: (profile ?? null) as Profile | null,
    memberships,
    active,
    role: active.role,
  };
}

/**
 * Require a fully-authenticated session. Redirects:
 *   - no user        → /login?next=<current>
 *   - no membership  → /onboarding
 */
export async function requireSession(redirectTo = "/dashboard"): Promise<AuthenticatedSession> {
  const session = await getSession();
  if (!session) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect(`/login?next=${encodeURIComponent(redirectTo)}`);
    redirect("/onboarding");
  }
  return session;
}

/**
 * Require a session whose active role is one of the allowed roles.
 * Renders the dashboard's 403 page (via redirect to /dashboard?error=forbidden)
 * if the role doesn't match.
 *
 * The DB enforces tenant isolation regardless — this just gives the UI a
 * fast path to reject before any data fetching happens.
 */
export async function requireRole(
  roles: MemberRole[],
  redirectTo = "/dashboard"
): Promise<AuthenticatedSession> {
  const session = await requireSession(redirectTo);
  if (!roles.includes(session.role) && session.role !== "super_admin") {
    redirect(`/dashboard?error=forbidden`);
  }
  return session;
}

/** Shorthand: institution_admin OR super_admin. */
export function requireAdmin(redirectTo = "/dashboard") {
  return requireRole([...ADMIN_ROLES], redirectTo);
}

/**
 * Inline permission check, useful for conditionally rendering UI affordances
 * (e.g. hide the "delete" button if the user lacks the permission). For
 * server-action-level guards prefer requireRole().
 */
export function sessionCan<R extends Resource>(
  session: Session,
  resource: R,
  action: Action<R>
): boolean {
  return can(session?.role, resource, action);
}
