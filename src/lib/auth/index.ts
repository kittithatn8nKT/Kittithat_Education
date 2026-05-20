// Public auth API — CLIENT-SAFE surface.
//
// Server pages and Server Actions should import from the specific submodule
// to avoid pulling server-only code into client bundles:
//   - import { requireSession, sessionCan } from "@/lib/auth/session";
//   - import { signOutAction } from "@/lib/auth/actions";
//
// This barrel re-exports only the universally-safe pieces (RBAC catalog,
// constants, pure helpers) so it can be imported from any context.

export {
  can,
  compareRoles,
  ROLE_RANK,
  ADMIN_ROLES,
  PERMISSIONS,
  type Resource,
  type Action,
} from "./rbac";

export { ACTIVE_INSTITUTION_COOKIE, pickActiveMembership } from "./active-institution";
