-- ============================================================
-- Health Plan Factory — App Store Reviewer Demo Account
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Review every INSERT before running. Safe to re-run — all statements
-- use ON CONFLICT DO NOTHING so they are idempotent.
--
-- After running, verify the account by logging in as the reviewer
-- and walking through every tab (plan, coach, journal, discover,
-- accountability) to confirm Plus features are unlocked.
--
-- LOGIN NOTE:
--   This app uses OIDC (Replit Auth) or GitHub OAuth -- no password login.
--   To give the Apple reviewer access, generate a magic link via the API
--   after running this script, using profileId 00000000-0000-0000-0000-000000000099.
--   Magic links expire in 15 minutes so generate one fresh before submitting.
--
-- CREDENTIALS FOR APP STORE CONNECT REVIEWER NOTES:
--   Email: appstore-reviewer@healthplanfactory.com
--   Login: Via magic link (see above)
-- ============================================================

--  Fixed IDs used throughout this script 
--   Profile / User ID : 00000000-0000-0000-0000-000000000099
--   Intake ID         : reviewer-intake-2026
--   Plan ID           : reviewer-plan-2026

--  1. users table (required by Replit Auth) 

INSERT INTO users (id, email, first_name, last_name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  'appstore-reviewer@healthplanfactory.com',
  'App Store',
  'Reviewer',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

--  2. profiles 

INSERT INTO profiles (
  id, email, display_name, role,
  subscription_status, lmn_status,
  referral_code, referral_count,
  created_at, updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  'appstore-reviewer@healthplanfactory.com',
  'Alex Rivera',
  'member',
  'plus',       -- Plus subscription active
  'none',
  'HPF-REVIEW99',
  0,
  NOW() - INTERVAL '45 days',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

--  3. member_intakes 
-- Realistic: $250/month budget, stress + sleep + back pain goals,
-- prefers in-person and mind-body modalities, zip 07030 (Hoboken NJ).

INSERT INTO member_intakes (
  id, profile_id, budget,
  goals, conditions, preferences, exclusions,
  zip_code, radius, telehealth,
  created_at
)
VALUES (
  'reviewer-intake-2026',
  '00000000-0000-0000-0000-000000000099',
  250,
  '["stress-reduction", "sleep", "pain-relief", "energy"]'::jsonb,
  '["back-pain", "stress", "insomnia"]'::jsonb,
  '["in-person", "mind-body", "low-impact"]'::jsonb,
  '[]'::jsonb,
  '07030',
  25,
  false,
  NOW() - INTERVAL '44 days'
)
ON CONFLICT (id) DO NOTHING;

--  4. plans 

INSERT INTO plans (
  id, profile_id, intake_id, status,
  total_monthly_cost, budget_utilization, budget,
  share_token, share_goal,
  share_modalities,
  created_at, updated_at
)
VALUES (
  'reviewer-plan-2026',
  '00000000-0000-0000-0000-000000000099',
  'reviewer-intake-2026',
  'active',
  235,   -- $235/month total
  94,    -- 94% budget utilization
  250,
  'review2026share',
  'stress-reduction',
  '[{"name":"Massage Therapy","emoji":"💆"},{"name":"Acupuncture","emoji":"🪡"},{"name":"Yoga","emoji":"🧘"}]'::jsonb,
  NOW() - INTERVAL '44 days',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

--  5. plan_items (5 modalities) 
-- Modality IDs match seed.ts slugs: massage, acupuncture, yoga,
-- meditation, registered-dietitian

INSERT INTO plan_items (
  id, plan_id, modality_id,
  score, frequency, estimated_monthly_cost,
  rationale, is_deprioritized, sort_order,
  nearby_provider_count
)
VALUES
  (
    'reviewer-item-001', 'reviewer-plan-2026', 'massage',
    92, '2x/month', 120,
    'Deep tissue massage is strongly evidence-backed for chronic back pain and stress. Two sessions per month fits your budget and addresses your top two goals.',
    false, 0, 3
  ),
  (
    'reviewer-item-002', 'reviewer-plan-2026', 'acupuncture',
    87, '4x/month', 60,
    'Acupuncture has Grade A evidence for back pain relief and Grade B for insomnia. Four sessions monthly provides the consistency needed for measurable outcomes.',
    false, 1, 2
  ),
  (
    'reviewer-item-003', 'reviewer-plan-2026', 'yoga',
    84, '8x/month', 40,
    'Regular yoga practice addresses all three of your goals — stress, sleep quality, and back pain — through movement, breath work, and mindfulness. Most studios offer unlimited monthly memberships.',
    false, 2, 5
  ),
  (
    'reviewer-item-004', 'reviewer-plan-2026', 'meditation',
    78, 'Daily', 0,
    'Guided meditation apps and free community sessions support your sleep and stress goals at no cost. Pairs well with your other modalities for a compounding effect.',
    false, 3, 1
  ),
  (
    'reviewer-item-005', 'reviewer-plan-2026', 'registered-dietitian',
    71, '1x/month', 15,
    'A registered dietitian session can help optimize your nutrition for energy and sleep. One session monthly is a low-cost way to build sustainable habits.',
    false, 4, 2
  )
ON CONFLICT (id) DO NOTHING;

--  6. providers (5 approved, NJ area) 
-- These are fictional demo providers for reviewer purposes only.
-- Status = 'approved' so they appear in the Discover tab.

INSERT INTO providers (
  id, name, bio,
  city, state, zip_code, lat, lng,
  phone, website,
  status, verification_status,
  accepts_insurance, offers_telehealth, offers_in_person,
  service_radius_miles, cost_per_session,
  created_at, updated_at
)
VALUES
  (
    'reviewer-prov-001',
    'Serene Touch Massage Therapy',
    'Licensed massage therapists specializing in deep tissue, Swedish, and sports massage. Serving Hoboken and Jersey City since 2015. HSA/FSA accepted.',
    'Hoboken', 'NJ', '07030', 40.744057, -74.032517,
    '(201) 555-0101', 'https://example.com/serene-touch',
    'approved', 'verified',
    false, false, true,
    10, 65,
    NOW() - INTERVAL '90 days', NOW()
  ),
  (
    'reviewer-prov-002',
    'Hudson Valley Acupuncture',
    'Board-certified acupuncturist with 12 years of clinical experience. Specializes in pain management, sleep disorders, and stress. Sliding scale available.',
    'Jersey City', 'NJ', '07302', 40.718220, -74.043830,
    '(201) 555-0202', 'https://example.com/hudson-acupuncture',
    'approved', 'verified',
    true, true, true,
    15, 75,
    NOW() - INTERVAL '85 days', NOW()
  ),
  (
    'reviewer-prov-003',
    'Flow State Yoga Studio',
    'Community yoga studio offering vinyasa, restorative, and yin classes. All levels welcome. Monthly unlimited memberships available. HealthKit-connected check-ins.',
    'Hoboken', 'NJ', '07030', 40.741895, -74.030850,
    '(201) 555-0303', 'https://example.com/flow-state-yoga',
    'approved', 'verified',
    false, true, true,
    5, 20,
    NOW() - INTERVAL '80 days', NOW()
  ),
  (
    'reviewer-prov-004',
    'Mindful Moments Meditation',
    'Certified mindfulness instructor offering group and individual guided meditation sessions. Focus areas: sleep, anxiety, and performance optimization.',
    'Hoboken', 'NJ', '07030', 40.743500, -74.029900,
    '(201) 555-0404', 'https://example.com/mindful-moments',
    'approved', 'verified',
    false, true, true,
    20, 0,
    NOW() - INTERVAL '75 days', NOW()
  ),
  (
    'reviewer-prov-005',
    'NutriWell Dietitian Services',
    'Registered Dietitian Nutritionist (RDN) specializing in gut health, sleep optimization, and energy management. Telehealth and in-person available. LMN-eligible.',
    'Jersey City', 'NJ', '07306', 40.726490, -74.066860,
    '(201) 555-0505', 'https://example.com/nutriwell',
    'approved', 'verified',
    true, true, true,
    25, 120,
    NOW() - INTERVAL '70 days', NOW()
  )
ON CONFLICT (id) DO NOTHING;

--  7. provider_modalities 
-- Link each provider to the matching modality from the plan

INSERT INTO provider_modalities (provider_id, modality_id, is_primary, cost_min, cost_max)
VALUES
  ('reviewer-prov-001', 'massage',               true,  55,  80),
  ('reviewer-prov-002', 'acupuncture',            true,  65,  90),
  ('reviewer-prov-003', 'yoga',                   true,  18,  25),
  ('reviewer-prov-004', 'meditation',             true,   0,  20),
  ('reviewer-prov-005', 'registered-dietitian',   true, 100, 140)
ON CONFLICT (provider_id, modality_id) DO NOTHING;

--  8. plan_progress_logs — 14 days of history 
-- Mix of session logs and journal entries.
-- Days 1–7: session logs (modality sessions attended)
-- Days 8–14: journal entries (note-heavy, mood/energy/pain ratings)

INSERT INTO plan_progress_logs (
  id, profile_id, plan_id, modality_id,
  note, rating, mood, pain, energy,
  session_date, session_cost_cents,
  created_at
)
VALUES
  -- Session logs (attended modality sessions)
  (
    'reviewer-log-01',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', 'massage',
    'First deep tissue session. Lower back felt immediate relief. Therapist found tension in shoulders I didn''t even know was there.',
    8, 7, 4, 7,
    NOW() - INTERVAL '13 days', 6500,
    NOW() - INTERVAL '13 days'
  ),
  (
    'reviewer-log-02',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', 'yoga',
    'Restorative yoga class. Much more challenging than I expected — held each pose for 5 minutes. Slept surprisingly well that night.',
    7, 8, 5, 6,
    NOW() - INTERVAL '12 days', 2000,
    NOW() - INTERVAL '12 days'
  ),
  (
    'reviewer-log-03',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', 'acupuncture',
    'First acupuncture session. Nervous going in, but completely relaxed by the end. Fell asleep on the table. Back pain noticeably lower afterward.',
    9, 8, 3, 8,
    NOW() - INTERVAL '11 days', 7500,
    NOW() - INTERVAL '11 days'
  ),
  (
    'reviewer-log-04',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', 'meditation',
    '20-minute guided body scan. Struggled to stay focused at first but got there. Best sleep in weeks afterward.',
    7, 7, 4, 7,
    NOW() - INTERVAL '10 days', 0,
    NOW() - INTERVAL '10 days'
  ),
  (
    'reviewer-log-05',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', 'yoga',
    'Vinyasa flow class. Kept up with the group this time. Shoulder tension significantly better than last week.',
    8, 9, 3, 8,
    NOW() - INTERVAL '9 days', 2000,
    NOW() - INTERVAL '9 days'
  ),
  (
    'reviewer-log-06',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', 'acupuncture',
    'Second acupuncture session. Practitioner added points for sleep this time. Had the deepest sleep I can remember that night — 8 hours straight.',
    9, 9, 2, 9,
    NOW() - INTERVAL '7 days', 7500,
    NOW() - INTERVAL '7 days'
  ),
  (
    'reviewer-log-07',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', 'registered-dietitian',
    'First dietitian consult. Learned my late-night snacking habit was disrupting sleep quality. Simple changes recommended — less screen time, no eating after 8pm, magnesium supplement.',
    8, 8, 3, 8,
    NOW() - INTERVAL '6 days', 12000,
    NOW() - INTERVAL '6 days'
  ),
  -- Journal entries (no modality, richer notes, mood/energy focus)
  (
    'reviewer-log-08',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', NULL,
    'Week 2 check-in. I genuinely can''t believe how much better I feel. The combination of massage + acupuncture is doing something the ibuprofen never did. Pain is down to a 3 from a 7.',
    8, 8, 3, 8,
    NOW() - INTERVAL '5 days', NULL,
    NOW() - INTERVAL '5 days'
  ),
  (
    'reviewer-log-09',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', 'massage',
    'Second massage. Therapist worked specifically on the thoracic spine per my request. Already noticing better posture while working at my desk.',
    9, 9, 2, 9,
    NOW() - INTERVAL '4 days', 6500,
    NOW() - INTERVAL '4 days'
  ),
  (
    'reviewer-log-10',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', 'meditation',
    'Started the 10-minute morning meditation habit. Hard to be consistent but the coach reminded me that even 3 minutes counts. Trying to stack it with morning coffee.',
    7, 7, 3, 8,
    NOW() - INTERVAL '3 days', 0,
    NOW() - INTERVAL '3 days'
  ),
  (
    'reviewer-log-11',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', 'yoga',
    'Third yoga class. Starting to recognize some of the sequences. My lower back actually feels supported now rather than fighting the poses.',
    8, 8, 2, 8,
    NOW() - INTERVAL '2 days', 2000,
    NOW() - INTERVAL '2 days'
  ),
  (
    'reviewer-log-12',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', NULL,
    'Mid-plan reflection. Sleep score on my Apple Watch has gone from averaging 68 to 81 over the past two weeks. Coincidence? Maybe. But I''ll take it.',
    9, 9, 2, 9,
    NOW() - INTERVAL '1 day', NULL,
    NOW() - INTERVAL '1 day'
  ),
  (
    'reviewer-log-13',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', 'acupuncture',
    'Third acupuncture session. Practitioner says the meridian pathways are starting to respond well. Tried to understand the theory — some of it clicked, some didn''t. Results are speaking for themselves.',
    9, 9, 2, 9,
    NOW() - INTERVAL '1 day', 7500,
    NOW() - INTERVAL '1 day'
  ),
  (
    'reviewer-log-14',
    '00000000-0000-0000-0000-000000000099',
    'reviewer-plan-2026', NULL,
    'Day 14. Pain: 2/10 (was 7/10 at start). Sleep: averaging 7.5hrs (was 5.5). Mood: genuinely better. Hard to attribute any single change, but the plan as a whole is working.',
    10, 9, 2, 9,
    NOW(), NULL,
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

--  9. coach_sessions — pre-seeded conversation 

INSERT INTO coach_sessions (profile_id, messages, archived, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000099',
  jsonb_build_array(
    jsonb_build_object('id', 'msg-01', 'role', 'user',
      'content', 'Hey, I just got my plan. I''m a little overwhelmed -- I''ve never really done any of this before.'),
    jsonb_build_object('id', 'msg-02', 'role', 'assistant',
      'content', 'That''s completely normal -- and honestly, the fact that you''re here and asking means you''re already ahead of most people. Your plan has five modalities, but you don''t need to start all of them at once. Which one feels most approachable to you right now?'),
    jsonb_build_object('id', 'msg-03', 'role', 'user',
      'content', 'Probably yoga. I''ve done it a little before. The acupuncture feels scary.'),
    jsonb_build_object('id', 'msg-04', 'role', 'assistant',
      'content', 'Yoga is a great first step -- it touches almost all your goals in one session. And I hear you on acupuncture. Most people feel that way until their first session, and then wonder why they waited so long. The needles are hair-thin and most people barely feel them.'),
    jsonb_build_object('id', 'msg-05', 'role', 'user',
      'content', 'Yes please. Also, how am I doing on my goals so far? It''s been two weeks.'),
    jsonb_build_object('id', 'msg-06', 'role', 'assistant',
      'content', 'You''ve logged 13 sessions in 14 days -- that''s exceptional consistency for week two. Your pain scores have dropped from 7 to 2, your mood trend is up across the board, and your energy is tracking higher in the second week than the first. The sleep improvement is the most notable: you went from averaging 5.5 hours to 7.5 hours. Keep going -- week three is usually when the compounding effects really kick in.')
  ),
  false,
  NOW() - INTERVAL '14 days',
  NOW()
)
ON CONFLICT DO NOTHING;

--  10. insights_cache — pre-computed wellness score 

INSERT INTO insights_cache (
  id, profile_id,
  insights, attention_items,
  wellness_score, journal_count, session_count,
  refreshed_at, created_at
)
VALUES (
  'reviewer-insights-2026',
  '00000000-0000-0000-0000-000000000099',
  '[
    {
      "modalityId": "massage",
      "modalityName": "Massage Therapy",
      "emoji": "💆",
      "metric": "pain",
      "headline": "Pain drops 71% on massage days",
      "withSessionAvg": 2.0,
      "withoutSessionAvg": 6.8,
      "percentDiff": 71,
      "sessionCount": 2,
      "sparklineData": [
        {"date": "2026-05-05", "value": 7, "hasSession": false},
        {"date": "2026-05-06", "value": 4, "hasSession": true},
        {"date": "2026-05-07", "value": 5, "hasSession": false},
        {"date": "2026-05-10", "value": 2, "hasSession": true},
        {"date": "2026-05-12", "value": 2, "hasSession": false}
      ],
      "whyItMatters": "Consistent massage sessions are reducing your chronic pain score. Two sessions per month is the minimum effective dose for your profile."
    },
    {
      "modalityId": "acupuncture",
      "modalityName": "Acupuncture",
      "emoji": "🪡",
      "metric": "energy",
      "headline": "Energy +38% after acupuncture",
      "withSessionAvg": 8.7,
      "withoutSessionAvg": 6.3,
      "percentDiff": 38,
      "sessionCount": 3,
      "sparklineData": [
        {"date": "2026-05-07", "value": 8, "hasSession": true},
        {"date": "2026-05-09", "value": 6, "hasSession": false},
        {"date": "2026-05-11", "value": 9, "hasSession": true},
        {"date": "2026-05-13", "value": 7, "hasSession": false},
        {"date": "2026-05-15", "value": 9, "hasSession": true}
      ],
      "whyItMatters": "Your energy levels spike significantly on acupuncture days. The effect persists 1–2 days post-session."
    }
  ]'::jsonb,
  '[]'::jsonb,
  82,   -- wellness score out of 100
  7,    -- journal_count
  13,   -- session_count
  NOW(),
  NOW() - INTERVAL '14 days'
)
ON CONFLICT (profile_id) DO UPDATE
  SET wellness_score = 82,
      journal_count = 7,
      session_count = 13,
      refreshed_at = NOW();

--  Verification queries 
-- Run these after the inserts to confirm everything looks right.

SELECT 'Profile' AS table_name, id, email, subscription_status
FROM profiles
WHERE id = '00000000-0000-0000-0000-000000000099';

SELECT 'Plan' AS table_name, id, status, total_monthly_cost, budget_utilization
FROM plans
WHERE id = 'reviewer-plan-2026';

SELECT 'Plan items' AS table_name, modality_id, frequency, estimated_monthly_cost
FROM plan_items
WHERE plan_id = 'reviewer-plan-2026'
ORDER BY sort_order;

SELECT 'Providers' AS table_name, id, name, status
FROM providers
WHERE id LIKE 'reviewer-prov-%';

SELECT 'Progress logs' AS table_name, COUNT(*) AS count
FROM plan_progress_logs
WHERE profile_id = '00000000-0000-0000-0000-000000000099';

SELECT 'Wellness score' AS table_name, wellness_score, session_count, journal_count
FROM insights_cache
WHERE profile_id = '00000000-0000-0000-0000-000000000099';
