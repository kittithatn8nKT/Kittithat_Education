# Implementation Roadmap

## Phase 1 — Foundation (this release)

Goal: a deployable shell with multi-tenant data isolation and authenticated dashboard.

- [x] Architecture documentation
- [x] Database schema with RLS
- [x] Next.js 15 + Tailwind v4 project scaffold
- [x] Supabase SSR clients (browser, server, middleware)
- [x] Auth: signup, login, logout, OAuth callback
- [x] Institution onboarding flow (first-login → create institution → become admin)
- [x] Dashboard shell: sidebar, topbar, dark mode, Thai/EN switch
- [x] User profile page
- [x] Health check endpoint
- [x] GitHub repo initialized, pushed to `main`

## Phase 2 — Documents & AI Core

- [ ] Department CRUD (admin only)
- [ ] User invitation flow (admin → email invite → accept)
- [ ] Document upload with version history
- [ ] Supabase Storage RLS policies
- [ ] OCR job queue (Edge Function → Google Cloud Vision)
- [ ] AI summary generation (gpt-4o-mini)
- [ ] Embedding pipeline → pgvector
- [ ] AI semantic search over documents

## Phase 3 — AI Chat & Generators

- [ ] RAG chat with documents (streaming)
- [ ] TOR (Terms of Reference) generator with Thai government register
- [ ] Official memo (บันทึกข้อความ) generator
- [ ] PDF export with letterhead

## Phase 4 — Workflows & Notifications

- [ ] Workflow templates per department
- [ ] Multi-step approval chains
- [ ] In-app notifications (Supabase Realtime)
- [ ] Email notifications (Resend)
- [ ] Audit log UI

## Phase 5 — Billing & Admin

- [ ] Stripe / Omise integration
- [ ] Subscription enforcement (quotas on AI/storage)
- [ ] Super-admin platform console
- [ ] Usage analytics per institution

## Phase 6 — Polish

- [ ] PWA / offline drafts
- [ ] E-signature integration
- [ ] Native mobile companion (Expo)
- [ ] White-label per institution
