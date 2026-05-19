# Health Plan Factory — Progress Log

## Current State (as of 2026-05-19)

**Branch:** phase-1-option-c (10+ commits ahead of main, not yet merged)
**Production Supabase:** healthplanfactory (us-east-2, ACTIVE_HEALTHY)
**Deployment status:** Web on Netlify, mobile not yet on TestFlight, API on Replit (currently suspended pending payment)

## Architecture Snapshot

- **Web:** React + Vite, deployed to Netlify
- **Mobile:** Expo SDK 54, bundle com.healthplanfactory.mobile
- **API:** Express on Replit, uses SUPABASE_SERVICE_ROLE_KEY
- **DB:** Supabase Postgres, RLS enabled on all 30 public tables (no policies — service-role-only access)
- **Auth:** Replit Auth + custom magic links (NOT Supabase Auth)
- **Payments:** Stripe Connect (consumer Plus subscription + employer B2B)
- **Monetization:** Option C — web-paid Plus subscription, mobile is logged-in companion

## Completed Work (this branch)

| Commit | Description |
|--------|-------------|
| ff82721 | Phase 1 §1 — API hardening (rate limits, helmet, CORS allowlist) |
| 08ea973 | Phase 1 §3, §4, §5.4, §6 — Option C monetization, mobile paywall, Netlify security headers, Stripe webhook idempotency |
| b7ff9f9 | Phase 2 §1 — HealthKit usage strings, Sentry source maps re-enabled |
| fa231d5 | Phase 2 §3 — Privacy.tsx + Terms.tsx rewritten for App Store + legal review |
| 4ffa625 | Phase 2 §7 — demo reviewer SQL script (scripts/demo-reviewer-account.sql) |
| b26fcf4 | Demo SQL bug fixes (coach_sessions ON CONFLICT, insights_cache constraint) |
| 48570de | Phase 2 §8 — RLS enabled on all 30 public tables (deny-all, migration 0015) |
| 3eb2ac4 | Phase 2 §3 — App Store metadata drafts + privacy labels + provider outreach emails (docs/) |
| pending | Phase 2 §4 — Remove unused providerUnlocks import; update stale PPR copy in Dashboard + App.tsx |
| pending | Phase 2 §5 — .env.example refreshed with SUPABASE_SERVICE_ROLE_KEY, RESEND, Twilio, CORS vars |

## Outstanding Work

### Blocked on Replit ($250 owed to resume)
- [ ] api.healthplanfactory.com DNS (Cloudflare route requires GoDaddy nameserver delegation)
- [ ] Replit custom domain setup
- [ ] EAS secret EXPO_PUBLIC_API_URL
- [ ] TestFlight submission
- [ ] Stripe annual price ID $99/yr in dashboard
- [ ] Run demo-reviewer-account.sql against production
- [ ] App Store submission rehearsal

### Not blocked — can do anytime
- [x] App Store Connect metadata — drafts in `docs/APP_STORE_METADATA.md` (commit 3eb2ac4)
- [x] App Store privacy nutrition labels — `docs/APP_STORE_PRIVACY_LABELS.md` (commit 3eb2ac4)
- [x] Provider outreach email templates (3 lengths) — `docs/PROVIDER_OUTREACH_EMAILS.md` (commit 3eb2ac4)
- [ ] Lawyer review of Privacy.tsx + Terms.tsx ($300-800 quoted; Termly.io $15/mo as alternative)
- [ ] 10 screenshots for 6.7" + 6.5" iPhone for App Store
- [ ] Sentry secrets push to EAS (SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT)
- [ ] Run demo-reviewer-account.sql via Supabase MCP (now trivial — 5 min)

## Key Decisions & Rationale

- **Monetization = Option C** (web-paid Plus, mobile companion). Pay-per-reveal was killed for Apple anti-steering compliance.
- **RLS deny-all strategy** (no policies, service-role-only). Chosen over auth.uid() policies because the architecture is 100% server-side via Express → service role. Documented in migration 0015.
- **Dead supabase.ts files in both web and mobile apps** — left in place intentionally. Despite zero imports, they exist as scaffolding for planned realtime features. CSP and vite.config.ts deliberately support them. RLS now neutralizes the embedded anon key, so no urgent cleanup needed. Revisit when realtime is on the roadmap (or never).
- **Auth approach** — Replit Auth + custom magic links + Express sessions. Supabase Auth is NOT used anywhere in the codebase.

## Tools Setup

- **Supabase MCP** — configured and working. Token name "claude_code" in Supabase dashboard. Future SQL work goes through MCP, not the dashboard SQL editor.
- **Claude Code on Mac** — working dir ~/Health-Plan-Factory, branch phase-1-option-c.

## Where to Start Next Session

If picking up cold, the highest-value next moves (in order):
1. App Store Connect metadata (no code needed, just dashboard work)
2. Lawyer review or Termly.io setup for Privacy + Terms
3. Resolve Replit account → unblock the entire Apple submission chain
4. Sentry EAS secrets (10 min CLI task)
5. Run demo SQL via MCP (5 min)

## Recent Security Incidents

- **2026-05-19** — Database password (Bojidara2019#) was pasted into a Claude.ai chat. Rotated same day. No evidence of unauthorized access. Anon-key attack surface was simultaneously closed via RLS lockdown.
