-- Enable RLS on all public tables.
-- No policies are added — anon role gets nothing on any table.
-- Service role (used by Express API) bypasses RLS entirely; app is unaffected.
-- Applied to remote via Supabase MCP on 2026-05-19.

ALTER TABLE public.admin_settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_modality_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights_cache           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lmn_requests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magic_links              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_credits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_intakes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modalities               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_progress_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_credentials     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_modalities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_reviews         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_milestones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                    ENABLE ROW LEVEL SECURITY;
