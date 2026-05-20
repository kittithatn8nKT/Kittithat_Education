// Centralised app-wide config. Import from anywhere via `@/config/site`.

export const siteConfig = {
  name: "KitithatITMan",
  displayName: "kitithat-edu-ai-office",
  description: "Multi-tenant AI office platform for Thai educational institutions.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  locales: ["th", "en"] as const,
  defaultLocale: "th" as const,

  // Feature flags — flip these to gate Phase 2+ features at the UI level.
  features: {
    documentUpload: false,
    ocr: false,
    aiSummary: false,
    aiChat: false,
    workflows: false,
    billing: false,
  },

  // Subscription tier defaults (mirror seed data in 0005_seed_data.sql)
  tiers: {
    free: { maxUsers: 5, maxStorageMb: 500, maxAiRequests: 100 },
    starter: { maxUsers: 25, maxStorageMb: 10000, maxAiRequests: 2000 },
    pro: { maxUsers: 100, maxStorageMb: 50000, maxAiRequests: 10000 },
  },

  links: {
    docs: "https://github.com/kittithatn8nKT/Kittithat_Education#readme",
    repo: "https://github.com/kittithatn8nKT/Kittithat_Education",
  },
} as const;

export type SiteConfig = typeof siteConfig;
