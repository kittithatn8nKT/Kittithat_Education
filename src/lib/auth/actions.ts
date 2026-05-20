"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ACTIVE_INSTITUTION_COOKIE,
  writeActiveInstitutionId,
  clearActiveInstitution,
} from "./active-institution";
import { getSession } from "./session";

/**
 * Switch the active institution for the current user. Validates that
 * the user is actually a member of the target institution before writing
 * the cookie — defence-in-depth on top of the RLS policies that already
 * scope every query.
 */
export async function setActiveInstitution(institutionId: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  const member = session.memberships.find((m) => m.institution_id === institutionId);
  if (!member) {
    throw new Error("Not a member of the selected institution");
  }

  await writeActiveInstitutionId(institutionId);
  revalidatePath("/", "layout");
}

/** Sign the user out and clear all session cookies. */
export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await clearActiveInstitution();
  redirect("/login");
}

// Re-export the cookie name so client code can read it for navigation hints.
export { ACTIVE_INSTITUTION_COOKIE };
