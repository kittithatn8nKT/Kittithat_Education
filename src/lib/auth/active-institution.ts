import { cookies } from "next/headers";
import type { Membership } from "@/types/database";

export const ACTIVE_INSTITUTION_COOKIE = "kit-active-institution";

/**
 * Cookie-based tenant switching. A user with multiple memberships can pick
 * which institution they're working in. The cookie stores the institution
 * uuid; getSession() falls back to the first membership if the cookie is
 * missing or points to an institution the user is no longer a member of.
 */
export async function readActiveInstitutionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_INSTITUTION_COOKIE)?.value ?? null;
}

export async function writeActiveInstitutionId(institutionId: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_INSTITUTION_COOKIE, institutionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
}

export async function clearActiveInstitution(): Promise<void> {
  const store = await cookies();
  store.delete(ACTIVE_INSTITUTION_COOKIE);
}

/**
 * Resolve the active membership from a list, preferring the cookie hint.
 * If the cookie points to an institution the user no longer belongs to,
 * silently fall through to the first membership.
 */
export function pickActiveMembership(
  memberships: Membership[],
  hint: string | null
): Membership | null {
  if (memberships.length === 0) return null;
  if (hint) {
    const match = memberships.find((m) => m.institution_id === hint);
    if (match) return match;
  }
  return memberships[0];
}
