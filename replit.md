# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/health-plan-factory` (`@workspace/health-plan-factory`)

React + Vite frontend for the **Health Plan Factory** product — a premium editorial wellness optimization platform.

- **Brand tokens** (in `src/index.css`): `--navy #1b2d4f`, `--hpf-amber #b8892a`, `--amber-light #d4a44c`, `--sage #3d6b52`, `--warm-white #fafaf8`
- **Fonts**: Cormorant Garamond (serif headings), Outfit (body sans), DM Mono (prices/data/mono)
- **Router**: React Router v7 with `BASE_URL` base path
- **Components**: `Logo`, `Navbar`, `Footer`, `DisclaimerBar`, `Layout` shell, `ProtectedRoute`
- **Page routes** (all wired in `src/App.tsx`):
  - Public: `/`, `/how-it-works`, `/modalities`, `/for-providers`, `/pricing`, `/faq`, `/legal`, `/privacy`, `/terms`, `/contact`
  - Auth: `/sign-in`, `/sign-up`
  - **Public lead-capture** (no auth, no Layout wrapper): `/onboarding`, `/plan`
  - Member (protected): `/dashboard`, `/providers`, `/bookmarks`, `/progress`, `/profile`
  - Provider (protected): `/provider/dashboard`, `/provider/signup`, `/provider/profile`, `/provider/leads`
  - Admin (protected): `/admin/dashboard`, `/admin/users`, `/admin/providers`, `/admin/modalities`, `/admin/settings`
- All marketing/member pages use `<Layout>` (Navbar + Footer + DisclaimerBar)
- Disclaimer bar with 911/988/741741 crisis numbers sitewide

#### Onboarding Wizard (`/onboarding`) — Task #2
7-step intake wizard, full-page layout (no Layout wrapper), public (no auth required):
- Step 1: Budget slider ($50–$1000 with live label + typeahead input)
- Step 2: Goals (chip multi-select from 10 options)
- Step 3: Conditions/concerns (chip multi-select, "None" exclusive)
- Step 4: Preferences (chip multi-select from 9 options)
- Step 5: Exclusions (optional chip multi-select)
- Step 6: Region (ZIP code + radius buttons + telehealth toggle)
- Step 7: Review (all selections + inline Edit links)
- Validates per-step before advancing; "Generate My Plan" on final step triggers BuildingScreen

#### Building Screen (`src/components/onboarding/BuildingScreen.tsx`)
- Navy-background overlay with animated 🏭 factory emoji (CSS translateY bob)
- 6 build steps animate sequentially (600ms each): spinner → checkmark
- Redirects to `/plan` when complete

#### Plan Engine (`src/lib/planEngine.ts`)
- Pure rules-based scorer: goal match (+3), condition match (+4), preference match (+2), telehealth bonus, evidence bonus, HSA bonus, hard exclusion block
- `generatePlan(intake)` returns `{ included: PlanItem[], deprioritized: PlanItem[], totalMonthlyCost, budgetUtilization }`
- Budget-aware: fills plan greedily up to user budget, max 6 included + 4 deprioritized

#### Plan Results (`/plan`) — Task #2
- Reads `hpf_plan` + `hpf_intake` from `sessionStorage`
- Budget allocation bar with utilization % and remaining budget
- Ranked modality cards (rank circle, emoji, name, evidence badge, HSA badge, rationale, cost/frequency)
- Expandable "More ↓" detail: description, tags, locked provider CTA ("Unlock $1–$3")
- Deprioritized section for over-budget modalities
- Navy CTA block: "Create Free Account" + "See Plans"
- Empty-state redirects to `/onboarding`

#### Modality Data (`src/data/modalities.ts`)
12 modalities: Massage, Yoga, Pilates, Chiropractic, Acupuncture, Physical Therapy, Personal Training, Registered Dietitian, Nutrition Coaching, Meditation/MBSR, Telehealth Wellness, Direct Primary Care

- `pnpm --filter @workspace/health-plan-factory run dev` — Vite dev server

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
