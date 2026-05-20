# Features

Module-driven feature directory. Each subdirectory is a self-contained feature.

```
features/
├── auth/            # signup, login, session helpers (lands here in Phase 1.5)
├── institutions/    # institution + membership CRUD
├── departments/     # department CRUD (Phase 2)
├── documents/       # upload, OCR, AI summary (Phase 2)
├── workflows/       # approval chains (Phase 4)
└── ai/              # chat, TOR/memo generators (Phase 3)
```

Each feature follows the same convention:

```
features/<name>/
├── components/      # client + server components scoped to this feature
├── actions/         # Server Actions
├── queries/         # data fetchers (server-side Supabase)
├── schemas.ts       # Zod schemas
├── types.ts         # feature-specific types
└── index.ts         # public exports
```

Rules:

- **No cross-feature imports.** If feature A needs something from feature B, lift it to `src/lib` or `src/config`.
- **Shared UI primitives live in `src/components/ui` (shadcn).** Don't duplicate them inside a feature.
- **Page routes stay in `src/app`.** Pages import from `features/*` — features don't import from `app/*`.
