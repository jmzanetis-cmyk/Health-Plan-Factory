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

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema; SSL is enabled automatically when `DATABASE_URL` contains `supabase.com`
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config; uses `SUPABASE_DATABASE_URL` if set, falls back to `DATABASE_URL`
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

To push migrations to Supabase: set `SUPABASE_DATABASE_URL` to the Supabase session-mode pooler URL (`postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres`) and run `pnpm --filter @workspace/db run push`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `lib/replit-auth-web` (`@workspace/replit-auth-web`)

React hook library for Replit Auth integration in the frontend. Exposes `useAuth()` hook and `AuthUser` type.

- `useAuth()` — fetches `GET /api/auth/user`, exposes `{ user, isLoading, isAuthenticated, login(), logout() }`
- `login()` — redirects to `/api/login?returnTo=<current path>`
- `logout()` — redirects to `/api/logout`
- `AuthUser` re-exported from `@workspace/api-client-react` (Replit OIDC claims: id, email, firstName, lastName, profileImageUrl, role)
- **tsconfig**: `composite: true` required for frontend project references; uses `moduleResolution: bundler`

### `artifacts/health-plan-factory` (`@workspace/health-plan-factory`)

React + Vite frontend for the **Health Plan Factory** product — a premium editorial wellness optimization platform.

- **Auth**: Replit Auth via `@workspace/replit-auth-web`; `useAuth()` hook used in Navbar, ProtectedRoute, SignIn, SignUp, provider pages
- **Brand tokens** (in `src/index.css`): `--navy #1b2d4f`, `--hpf-amber #b8892a`, `--amber-light #d4a44c`, `--sage #3d6b52`, `--warm-white #fafaf8`
- **Fonts**: Cormorant Garamond (serif headings), Outfit (body sans), DM Mono (prices/data/mono)
- **Router**: React Router v7 with `BASE_URL` base path
- **Components**: `Logo`, `Navbar` (auth-aware avatar/dropdown), `Footer`, `DisclaimerBar`, `Layout` shell, `ProtectedRoute` (real auth + role guard)
- **Page routes** (all wired in `src/App.tsx`):
  - Public: `/`, `/how-it-works`, `/modalities`, `/for-providers`, `/pricing`, `/faq`, `/legal`, `/privacy`, `/terms`, `/contact`
  - Auth: `/sign-in`, `/sign-up`
  - **Public lead-capture** (no auth, no Layout wrapper): `/onboarding`, `/plan`
  - Member (protected): `/dashboard`, `/providers`, `/bookmarks`, `/progress`, `/profile`
  - Provider (protected): `/provider/dashboard`, `/provider/signup`, `/provider/profile`, `/provider/leads`
  - Admin (protected): `/admin/dashboard`, `/admin/users`, `/admin/providers`, `/admin/modalities`, `/admin/settings`, `/admin/employers`
  - Employer (public landing + protected portal): `/employer`, `/employer/dashboard`, `/employer/members`, `/employer/settings`
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

## Supabase Integration (Task #19)

`@supabase/supabase-js` is installed in all three apps. Supabase clients are available as shared modules:

- **API server** — `artifacts/api-server/src/lib/supabase.ts` exports a server-side admin client using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS, for trusted server operations only)
- **Web app** — `artifacts/health-plan-factory/src/lib/supabase.ts` exports a browser client using `import.meta.env.VITE_SUPABASE_URL` + `import.meta.env.VITE_SUPABASE_ANON_KEY`; these are injected at Vite build time via `define` in `vite.config.ts` from the `SUPABASE_URL`/`SUPABASE_ANON_KEY` server-side secrets
- **Mobile app** — `artifacts/health-plan-mobile/lib/supabase.ts` exports a client using `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`; forwarded from secrets via the dev script in `package.json`

### Required Secrets
- `SUPABASE_URL` — project URL (`https://rlugmlnozbertfuonlwp.supabase.co`)
- `SUPABASE_ANON_KEY` — public anon key (safe for browser/mobile)
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-side only, bypasses RLS)
- `SUPABASE_DATABASE_URL` — full Postgres connection string for running Drizzle migrations; must use the session-mode pooler on port 6543: `postgresql://postgres.rlugmlnozbertfuonlwp:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

### Running Migrations Against Supabase

**Network note:** Replit's network blocks outbound Postgres connections to Supabase's PgBouncer pooler (ports 5432 and 6543) and direct IPv6-only db hosts. Migrations cannot be run from within Replit.

**Option 1 — Supabase SQL Editor (recommended from Replit):**
1. Open `lib/db/supabase_schema.sql` (combined migration SQL, generated from all migration files)
2. Go to Supabase Dashboard → SQL Editor
3. Paste the contents and click Run

**Option 2 — drizzle-kit push from local machine or CI:**
Set `SUPABASE_DATABASE_URL` to the full pooler URL:
```
postgresql://postgres.rlugmlnozbertfuonlwp:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```
Then run: `cd lib/db && SUPABASE_DATABASE_URL=<url> pnpm exec drizzle-kit push`

**Verification:** After running migrations, confirm tables exist via Supabase Dashboard → Table Editor, or run:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

## GitHub Integration

The project is mirrored to GitHub at **https://github.com/jmzanetis-cmyk/Health-Plan-Factory** (private repo, owner: `jmzanetis-cmyk`).

The GitHub OAuth connection is wired via the Replit integrations system (GitHub connector, linked in `.replit`). Because the agent shell environment blocks interactive HTTPS git authentication, the initial push was performed using the **GitHub Git Data API** (blobs → tree → commit → ref update). Future pushes from the Replit UI or a developer workstation can use standard `git push origin main`.

### Mobile App Icon Note

`artifacts/health-plan-mobile/assets/images/icon.png` was resized from **1024×1024 to 512×512** (Task #13) to work within the Replit connectors proxy's ~1 MB request body limit during the initial GitHub push. The 512×512 size is fully functional for development and Expo preview builds. For App Store submission (iOS recommends 1024×1024), replace the icon with a higher-resolution original and push via standard git.

## Longitudinal Outcome Insights Engine (Task #10)

### DB — `insights_cache` table (`lib/db/src/schema/index.ts`)
- Stores `InsightCard[]` JSON, `AttentionItem[]` JSON, `wellnessScore`, `journalCount`, `sessionCount`, `refreshedAt` per profile
- Keyed by `profileId` (varchar FK → profiles.id), upserted on refresh

### API Routes (`artifacts/api-server/src/routes/insights.ts`)
- `GET /api/insights/mine` — returns cached insights; auto-recomputes if cache is >24 hours stale
- `POST /api/insights/refresh` — force-recomputes and updates cache
- **Correlation engine:** joins `journal_logs` with `modality_sessions` by date; computes per-modality per-metric correlations (pain, energy, mood, rating) using days-with-session vs days-without averages; generates 90-day sparkline data with `hasSession` flags
- **Wellness score (0–100):** `base` (avg rating / 10 × 70) + `completion` (active modalities with sessions / plan modalities × 20) + `trend` (+10 if last-7-day avg > prev-7-day avg, +5 if equal)
- **Unlock threshold:** 14+ journal entries required for correlation computation; returns empty arrays otherwise
- **Attention items:** plan modalities with 0 sessions in the last 30 days

### Coach enrichment (`artifacts/api-server/src/routes/coach.ts`)
- Top-3 positive insights injected into system prompt for context-aware coaching responses

### Dashboard (`artifacts/health-plan-factory/src/pages/Dashboard.tsx`)
- Wellness Score stat card added to stats row (shows 0–100 or "–")
- "What's Working for You" section: top 3 insight cards with correlation headlines; locked/teaser state if <14 entries
- "What Might Need Attention" section: attention item CTA cards for neglected modalities

### Progress Page (`artifacts/health-plan-factory/src/pages/Progress.tsx`)
- Full insights panel with Recharts `ComposedChart` sparklines (metric line + session dot markers)
- "Book a Session" CTAs link to `/discover?modality=:id`
- "Share with Doctor" print section (`.print-only`, hidden on screen)

### Print CSS
- Global `.print-only` / `.no-print` utility classes added to `src/index.css`

### OpenAPI spec (`lib/api-spec/openapi.yaml`)
- `GET /insights/mine` and `POST /insights/refresh` endpoints documented
- New schemas: `InsightSparklinePoint`, `InsightCard`, `AttentionItem`, `InsightsResponse`
- Orval codegen regenerated after spec update

## Member Referral Program (Task #11)

### DB schema (`lib/db/src/schema/index.ts`)
- `profiles.referralCode` — nullable unique text column `referral_code` with uniqueIndex; auto-generated on first `GET /api/referrals/mine` call
- `referrals` table: `id`, `referrerId`, `referredMemberId`, `code`, `status` (pending|rewarded), `createdAt`, `rewardedAt`
- `memberCredits` table: `id`, `profileId`, `source` (referral|promo), `amountCents`, `used`, `referralId` (FK → referrals.id), `createdAt`, `usedAt`

### API Routes (`artifacts/api-server/src/routes/referrals.ts`)
- `GET /api/referrals/mine` — returns/generates referral code, enriched referral history (with referred member name/email), and credit summary
- `POST /api/referrals/register` — creates a pending referral row (self-referral blocked; one-per-member limit enforced)
- `GET /api/credits/mine` — returns unused credit balance and full credit history
- `maybeRewardReferrer(profileId)` — exported helper called from plans.ts; on first plan generation marks referral as rewarded and issues $2 (200 cents) to both referrer and referred member

### Reward trigger (`artifacts/api-server/src/routes/plans.ts`)
- After a plan is saved, `maybeRewardReferrer(profileId)` fires non-blocking (no impact on plan generation)

### Referral code capture (frontend)
- `ReferralCapture` component in `App.tsx` silently reads `?ref=CODE` from any URL and stores it in `localStorage` key `hpf_ref_code` (only if not already set, i.e. first referral wins)
- Dashboard.tsx reads `hpf_ref_code` on mount and calls `POST /api/referrals/register`; clears the key on success and shows a green welcome banner

### Referral page (`/referral`) — `artifacts/health-plan-factory/src/pages/Referral.tsx`
- Shows referral link (copy + social share buttons: Email, SMS, WhatsApp, Twitter/X)
- Shows referral history table with StatusPill (Pending / Rewarded) and join dates
- Shows summary stats: total sent, rewarded, pending, available credit balance
- Shows $2 credit balance banner when credits are unused
- ProtectedRoute: redirects unauthenticated users to /sign-in

### Dashboard (`artifacts/health-plan-factory/src/pages/Dashboard.tsx`)
- Quick Actions grid updated to 4 items (2-col on sm, 4-col on lg): added "Refer & Earn" → `/referral`
- Welcome banner shown once for referred users post-login (green gradient, $2 credit notice, View link)

### OpenAPI spec
- New paths: `GET /referrals/mine`, `POST /referrals/register`, `GET /credits/mine`
- New schemas: `ReferralRow`, `MemberCreditRow`, `ReferralsMineResponse`, `RegisterReferralBody`, `CreditsMineResponse`
- Orval codegen regenerated after spec update
