// Hand-written types for Phase 1. Regenerate with `supabase gen types typescript`
// once you've linked the project and want full schema-derived types.

export type MemberRole =
  | "super_admin"
  | "institution_admin"
  | "department_head"
  | "staff"
  | "viewer";

export type InstitutionType = "primary" | "secondary" | "vocational" | "university";

export type SubscriptionStatus = "trial" | "active" | "past_due" | "suspended" | "cancelled";

export type Locale = "th" | "en";

export interface Profile {
  id: string;
  full_name: string | null;
  full_name_th: string | null;
  avatar_url: string | null;
  phone: string | null;
  preferred_language: Locale;
  preferred_theme: "light" | "dark" | "system";
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  type: InstitutionType;
  thai_id: string | null;
  province: string | null;
  district: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  subscription_status: SubscriptionStatus;
  subscription_plan_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Membership {
  membership_id: string;
  role: MemberRole;
  department_id: string | null;
  title: string | null;
  is_active: boolean;
  institution_id: string;
  institution_name: string;
  institution_slug: string;
  institution_type: InstitutionType;
  subscription_status: SubscriptionStatus;
}

export interface SubscriptionPlan {
  id: string;
  code: "free" | "starter" | "pro" | "enterprise" | string;
  name_th: string;
  name_en: string;
  description_th: string | null;
  description_en: string | null;
  price_thb_monthly: number;
  price_thb_yearly: number;
  max_users: number | null;
  max_storage_mb: number | null;
  max_ai_requests: number | null;
  features: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
}
