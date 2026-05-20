import type { MemberRole } from "@/types/database";

// Centralised permission catalog. The DB enforces tenant isolation via RLS;
// this layer enforces what a *member of the tenant* may do within it.
//
// Keep this file the SINGLE source of truth for permissions. UI affordances
// and Server Action guards should both read from here.

export const PERMISSIONS = {
  institution: {
    view: ["institution_admin", "department_head", "staff", "viewer"],
    update: ["institution_admin"],
    delete: ["institution_admin"], // soft delete only
    manageBilling: ["institution_admin"],
  },
  member: {
    view: ["institution_admin", "department_head", "staff", "viewer"],
    invite: ["institution_admin"],
    updateRole: ["institution_admin"],
    remove: ["institution_admin"],
  },
  department: {
    view: ["institution_admin", "department_head", "staff", "viewer"],
    create: ["institution_admin"],
    update: ["institution_admin", "department_head"],
    delete: ["institution_admin"],
  },
  document: {
    view: ["institution_admin", "department_head", "staff", "viewer"],
    create: ["institution_admin", "department_head", "staff"],
    update: ["institution_admin", "department_head", "staff"], // staff: own docs only — enforced at row level
    delete: ["institution_admin", "department_head"],
    publish: ["institution_admin", "department_head"],
  },
  workflow: {
    view: ["institution_admin", "department_head", "staff", "viewer"],
    initiate: ["institution_admin", "department_head", "staff"],
    approve: ["institution_admin", "department_head"],
    cancel: ["institution_admin"],
  },
  ai: {
    chat: ["institution_admin", "department_head", "staff"],
    generateTor: ["institution_admin", "department_head", "staff"],
    generateMemo: ["institution_admin", "department_head", "staff"],
    viewUsage: ["institution_admin"],
  },
  audit: {
    view: ["institution_admin"],
  },
  platform: {
    // super_admin only — cross-tenant operations
    manageInstitutions: ["super_admin"],
    managePlans: ["super_admin"],
    viewAllUsage: ["super_admin"],
  },
} as const satisfies Record<string, Record<string, readonly MemberRole[]>>;

export type Resource = keyof typeof PERMISSIONS;
export type Action<R extends Resource> = keyof (typeof PERMISSIONS)[R];

/** Check whether a role can perform an action on a resource. */
export function can<R extends Resource>(
  role: MemberRole | null | undefined,
  resource: R,
  action: Action<R>
): boolean {
  if (!role) return false;
  if (role === "super_admin") return true; // super-admin bypass
  const allowed = PERMISSIONS[resource][action] as readonly MemberRole[];
  return allowed.includes(role);
}

/** Role hierarchy — useful for sorting / display only, NOT for permission checks. */
export const ROLE_RANK: Record<MemberRole, number> = {
  super_admin: 100,
  institution_admin: 80,
  department_head: 60,
  staff: 40,
  viewer: 20,
};

export function compareRoles(a: MemberRole, b: MemberRole): number {
  return ROLE_RANK[b] - ROLE_RANK[a];
}

/** All admin-tier roles (used by requireAdmin() in session.ts). */
export const ADMIN_ROLES = [
  "super_admin",
  "institution_admin",
] as const satisfies readonly MemberRole[];
