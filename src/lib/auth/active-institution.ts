import type { Membership } from "@/types/database";

// Constant + pure function — universally importable (client or server).
// The cookie *read/write* helpers live in session.ts (read) and actions.ts
// (write/clear) so that this module stays free of next/headers and can be
// safely imported by Client Components for the cookie name constant.

export const ACTIVE_INSTITUTION_COOKIE = "kit-active-institution";

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
