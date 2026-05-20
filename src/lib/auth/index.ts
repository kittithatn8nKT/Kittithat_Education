// Public auth API. Anywhere outside src/lib/auth/* should import from here.

export {
  getSession,
  requireSession,
  requireRole,
  requireAdmin,
  sessionCan,
  type Session,
  type AuthenticatedSession,
} from "./session";

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

export { setActiveInstitution, signOutAction } from "./actions";
