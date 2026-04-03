# Overview

This project is a pnpm workspace monorepo using TypeScript, designed for a premium editorial wellness optimization platform called "Health Plan Factory". It includes a React + Vite frontend, an Express API server, and shared libraries for database interactions, API specifications, and authentication.

The Health Plan Factory aims to provide users with personalized wellness plans, leveraging a sophisticated plan engine, and offers features like an onboarding wizard, progress tracking, and a member referral program. The platform integrates with Supabase for database and authentication services and is designed for a seamless user experience across web and potentially mobile platforms.

# User Preferences

I prefer detailed explanations and iterative development. Ask before making major changes. Do not make changes to folder `artifacts/health-plan-mobile` or any files within it.

# System Architecture

The project is structured as a pnpm monorepo, separating deployable applications (`artifacts/`) from shared libraries (`lib/`) and utility scripts (`scripts/`). TypeScript is enforced across all packages, utilizing composite projects for efficient type-checking and build processes.

**Core Technologies:**
- **Monorepo Tool:** pnpm workspaces
- **Node.js:** v24
- **Package Manager:** pnpm
- **TypeScript:** v5.9
- **API Framework:** Express 5
- **Database:** PostgreSQL with Drizzle ORM
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API Codegen:** Orval (from OpenAPI spec)
- **Build Tool:** esbuild (CJS bundle) for backend, Vite for frontend

**Frontend (`artifacts/health-plan-factory`):**
- **Framework:** React + Vite
- **Authentication:** Replit Auth via `@workspace/replit-auth-web`
- **Styling:** Custom brand tokens (Navy, HPF Amber, Sage, Warm White), specific fonts (Cormorant Garamond, Outfit, DM Mono).
- **Routing:** React Router v7
- **Key Features:**
    - **Onboarding Wizard:** A 7-step public intake process for budget, goals, conditions, preferences, exclusions, and region.
    - **Plan Engine:** A pure rules-based scorer (`src/lib/planEngine.ts`) that generates personalized wellness plans based on user input, considering budget and prioritizing modalities.
    - **Clinical Evidence Corpus:** `clinical_evidence` DB table with 168+ rows mapping each modality × condition/goal pair to structured evidence data (grade A–D, effect size, study types, clinical notes, contraindications, weeks-to-benefit). The server plan engine (`serverPlanEngine.ts`) consults this corpus at plan-generation time, weighting recommendations by evidence grade (A=8, B=5, C=3, D=1 base points). Member plan rationale text surfaces clinical evidence grades and notes (e.g., "Grade A evidence for back pain — large effect, typically 2 weeks").
    - **Plan Results Page:** Displays ranked modality cards, budget allocation, and deprioritized options.
    - **Longitudinal Outcome Insights Engine:** Tracks `wellnessScore`, `journalCount`, `sessionCount` per user. Provides correlation insights based on journal logs and modality sessions, and attention items for neglected modalities. This data is displayed on the Dashboard and a dedicated Progress page with sparkline charts.
    - **Member Referral Program:** Enables users to refer others and earn credits. Referral codes are captured from URLs, and a dedicated referral page shows history and credit balance.
    - **Social Proof & Trust Signals:** Testimonials section on Landing and How It Works pages, fetched live from the database. Provider count badge ("X providers near you") on Plan page modality cards based on user zip code. Admin can manage testimonials from `/admin/testimonials`.

**Backend (`artifacts/api-server`):**
- **Framework:** Express 5
- **Data Access:** `@workspace/db` for Drizzle ORM.
- **Validation:** `@workspace/api-zod` for request/response validation.
- **API Endpoints:**
    - **Health Check:** `/api/health`
    - **Insights:** `/api/insights/mine` (returns cached or recomputes insights), `/api/insights/refresh` (forces recomputation).
    - **Referrals:** `/api/referrals/mine` (generates/returns referral code, history, credits), `/api/referrals/register` (registers pending referral).
    - **Credits:** `/api/credits/mine` (returns credit balance/history).
    - **Coach Enrichment:** Injects top insights into system prompts for context-aware coaching.
    - **Demo Requests:** `POST /api/demo-request` (stores lead in DB, sends admin alert + confirmation email). `GET /api/admin/demo-requests` (admin only).
    - **Employer PDF Export:** `GET /api/employer/export-pdf` (authenticated employer — generates a branded PDF wellness report with spend, utilization buckets, top modalities, and monthly chart).
    - **Booking Requests:** `POST /api/providers/:id/book` (Plus members only — inserts into `booking_requests`, emails provider via their profile email, sends confirmation to member). `GET /api/admin/booking-requests` (admin — returns all requests with member/provider names; supports `?status=` filter). `PATCH /api/admin/booking-requests/:id` (admin — updates status to `pending|contacted|declined`).
    - **Employer Wellness Trend:** `GET /api/employer/wellness-trend` (month-over-month avg wellness scores from planProgressLogs; K-anonymity floor = 5 members).
    - **Employer Benchmarks:** `GET /api/employer/benchmarks` (employer vs. platform-wide anonymized averages for wellness score and stipend utilization; K-anonymity).
    - **Coach Memory:** `GET /api/coach/memory` + `POST /api/coach/memory` (persistent long-term memory per user; Claude auto-summarizes sessions into facts; injected into system prompt).
    - **Referral Direct Invite:** `POST /api/referrals/send-invite` (already existed; now exposed in UI with email form on Referral page).

**Shared Libraries (`lib/`):**
- **`lib/db`:** Drizzle ORM schema and PostgreSQL connection. Handles migrations and schema definitions.
- **`lib/api-spec`:** Manages OpenAPI 3.1 specification (`openapi.yaml`) and Orval codegen configuration, generating client and validation code.
- **`lib/api-zod`:** Generated Zod schemas from the OpenAPI spec for API validation.
- **`lib/api-client-react`:** Generated React Query hooks and fetch client for frontend API interaction.
- **`lib/replit-auth-web`:** React hook library for Replit Auth integration in the frontend.

**Design Patterns:**
- **Monorepo:** Centralized codebase management for multiple interdependent packages.
- **Code Generation:** Orval generates API client and validation code from a single OpenAPI spec, ensuring consistency.
- **Database Migrations:** Drizzle ORM is used for schema management, with migrations handled via `drizzle-kit`.
- **Environment-based Configuration:** Utilizes environment variables (e.g., `PORT`, `DATABASE_URL`, `SUPABASE_URL`) for flexible deployment.

# External Dependencies

- **PostgreSQL:** Primary database.
- **Supabase:** Used for database hosting, authentication, and potentially other services. Requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DATABASE_URL` secrets.
- **GitHub:** Project is mirrored to GitHub for version control.
- **Replit Integrations:** Used for GitHub connector and potentially for other services.
- **Orval:** OpenAPI client code generator.
- **Drizzle ORM:** TypeScript ORM for PostgreSQL.
- **Zod:** Schema declaration and validation library.
- **React Query:** Data fetching and state management for React applications.
- **Vite:** Frontend build tool.
- **Express:** Backend web framework.