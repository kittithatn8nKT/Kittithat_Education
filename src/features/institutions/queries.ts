import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Membership } from "@/types/database";

/**
 * Returns all institution memberships for the current user.
 * RLS scopes results to the caller.
 */
export async function getMyMemberships(): Promise<Membership[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("my_memberships").select("*").order("institution_name");
  return (data ?? []) as Membership[];
}

/**
 * Returns the user's active institution. Phase 1 picks the first membership;
 * Phase 2 will store the selection in a cookie/preference.
 */
export async function getActiveMembership(): Promise<Membership | null> {
  const memberships = await getMyMemberships();
  return memberships[0] ?? null;
}
