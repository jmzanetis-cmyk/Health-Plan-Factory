# HealthPlanFactory — Lovable Build Prompts v3
### Definitive edition · March 2026 · Navy/Amber design · All features included

---

## BEFORE YOU OPEN LOVABLE

### API keys — have all four ready before writing Prompt 1
```
Supabase URL:           (Project Settings → API)
Supabase anon key:      (Project Settings → API)
Anthropic API key:      (console.anthropic.com — never goes in frontend)
Stripe publishable key: (dashboard.stripe.com — safe for frontend)
Stripe secret key:      (Supabase edge function env only — never frontend)
Google Maps API key:    (console.cloud.google.com → enable Places API)
Resend API key:         (resend.com — for transactional email)
```

### Run this SQL in Supabase before Prompt 1
Open Supabase → SQL Editor → paste and run the entire block from
the master document's STEP 2. Every table, every RLS policy.
Confirm all tables exist before touching Lovable.

### Create these two edge functions in Supabase before Prompt 4
- `/build-regimen` — calls Claude API with member profile, returns JSON regimen
- `/create-payment` — creates Stripe PaymentIntent with Connect transfer
- `/ai-coach` — calls Claude API with full member context, returns AI coach reply
Full function code is in the master document STEP 3.
Set `ANTHROPIC_API_KEY` and `STRIPE_SECRET_KEY` in Supabase env vars.

### Credit discipline
- Paste the design token first (free chat message, no credits)
- Fix errors in Lovable chat mode (free) before burning credits on retries
- Batch every related change into one prompt
- Export to GitHub after every successful prompt session

---

## DESIGN SYSTEM TOKEN
### Paste this as your very first Lovable message — no credits spent

```
HealthPlanFactory design system. Apply to every screen without exception.

BRAND IDENTITY
Name: HealthPlanFactory
Tagline: "Build the health plan you actually need."
Tone: Trust-forward, warm, professional — with personality. Not a spa.
Not a hospital portal. Something that feels like it was built by someone
who has been uninsured and is done apologizing for it.

FONTS — load all three from Google Fonts
1. Display: Cormorant Garamond (weights: 600, 700, italic 600, italic 700)
   Used for: all H1/H2, section headings, plan item names, large quotes
2. Body/UI: Outfit (weights: 300, 400, 500, 600, 700)
   Used for: all body copy, buttons, nav links, labels, chips, inputs
3. Mono/data: DM Mono (weights: 400, 500)
   Used for: prices, dollar amounts, stats, step numbers, scores

COLORS — use CSS variables, applied globally
--navy:      #1b2d4f   primary — nav bg, hero card bg, primary buttons, card headers
--navy-mid:  #243a62   gradient mid, secondary navy surfaces
--navy-lt:   #2f4a7a   hover darken, secondary backgrounds
--navy-10:   rgba(27,45,79,0.08)   subtle fills, tag backgrounds
--navy-20:   rgba(27,45,79,0.15)   stronger borders, dividers
--warm:      #fafaf8   page background (warm off-white, not pure white)
--off:       #f4f2ee   alternating section background
--parch:     #edeae3   card inner fills, nested panels
--amber:     #b8892a   primary accent — logo "Factory", section labels, highlights
--amber-l:   #d4a44c   hover amber, lighter accent
--amber-p:   #fdf5e6   amber pale backgrounds, alert banners
--amber-10:  rgba(184,137,42,0.12)   amber borders
--sage:      #3d6b52   success states, HSA badges, verified, on-track
--sage-p:    #eaf2ec   sage pale backgrounds
--rose:      #dc2626   error, missed, urgent
--rose-p:    #fef2f2   rose pale backgrounds
--sky:       #3b82f6   physician accent (blue left borders)
--sky-p:     #eff6ff   sky pale backgrounds
--purple:    #7c3aed   AI coach accent
--purple-p:  #f5f3ff   purple pale backgrounds
--text2:     #4a5e7a   body copy, secondary text
--text3:     #8496b0   muted text, timestamps, labels
--border:    rgba(27,45,79,0.10)   standard card borders
--border-s:  rgba(27,45,79,0.20)   stronger borders, input focus

COMPONENT RULES
Logo: "HealthPlan" Outfit 700 (navy or white) + "Factory" Outfit 700 italic (amber)
  + spinning ⚙️ emoji (CSS: animation: spin 8s linear infinite)
  @keyframes spin { to { transform: rotate(360deg) } }

Nav: navy background, white links (Outfit 500), amber for logo Factory word.
  On scroll: add 1px border-bottom rgba(255,255,255,0.07).

Buttons:
  Primary: navy bg, white text, Outfit 600, 6–8px border-radius, no pill shape
  CTA: amber bg, white text, Outfit 600, same radius
  Ghost: 1.5px navy border, navy text, transparent bg
  Hover primary: navy-mid bg + translateY(-1px)
  Hover CTA: amber-l bg + translateY(-1px)

Cards: white bg, 1px solid var(--border), border-radius 14–16px
Section labels: amber color, 0.7rem, 600 weight, 0.1em letter-spacing, uppercase
Display headings: Cormorant Garamond 700. Italic em tags appear in amber.
Body text: Outfit 300–400, text2 color, 1.7–1.8 line-height
Numbers/prices: DM Mono 500, navy color

Evidence badges:
  Strong: sage-p background, sage text
  Moderate: amber-p background, amber text
  Emerging: navy-10 background, navy text

Status chips:
  On track: sage-p bg, sage text
  Due soon: amber-p bg, amber text
  Missed/overdue: rose-p bg, rose text
  Not started: navy-10 bg, text3

HSA/FSA badge: sky-p bg, sky text "HSA ✓"
Founding provider badge: amber-p bg, amber text "🌟 Founding Provider"
Physician badge: sky-p bg, sky text "👨‍⚕️ Licensed Physician"

Toasts: fixed bottom-right, navy bg, white text, 10px radius, fadeIn/out
Skeleton loading: parch-colored animated shimmer bars

MEDICAL DISCLAIMER — required on every page in footer
"HealthPlanFactory is a wellness optimization platform, not a medical provider.
Content does not constitute medical advice, diagnosis, or treatment.
For medical emergencies call 911 immediately. Mental health crisis: call/text 988."
Footer: navy background. Disclaimer text: text3 color, 0.75rem, Outfit 300.
```

---

## PHASE 1 — FOUNDATION

---

### PROMPT 1 — Landing page + Supabase auth

```
Apply the design system I just pasted. Build the landing page at "/"
and configure Supabase auth.

NAVIGATION (sticky, navy background, 68px height):
Left: HPF logo (HealthPlan + Factory italic amber + spinning ⚙️)
Center: links — "How it works · For providers · Pricing" (Outfit 500, white/70)
Right: "Build my plan →" button (navy bg, white text, Outfit 600, 6px radius)
Scroll behavior: add border-bottom 1px solid rgba(255,255,255,0.07)

HERO SECTION (warm-white background, min-height 100vh):
Two-column layout. Left: text content. Right: factory illustration SVG.

LEFT COLUMN:
Small amber pill: "⚙️ AI-powered · Budget-first · Actually yours"
Cormorant Garamond 700 headline, clamp(2.5rem,5vw,4.5rem), line-height 1.1:
  "A health plan
   built around
   [em italic amber]your life.[/em]"
Outfit 300 body, text2, max-width 480px, line-height 1.8:
  "Tell us what you can spend. Tell us what's going on. We assemble a
   prioritized, costed wellness plan — fitted to your budget and your
   actual life. Not your insurance company's."
Two buttons stacked-then-side-by-side:
  [Build my plan free →] amber bg, white, Outfit 600
  [Join as a provider] navy border outline, navy text
Trust badges row below (small, Outfit 400, text2):
  🔒 HIPAA Aligned · ✓ No credit card · 💳 HSA/FSA options · 🚨 Emergency: 911

RIGHT COLUMN — SVG factory illustration (build carefully):
Container: light sky gradient bg, 16px radius, slight shadow
Factory building: navy rectangle body
Windows: 4–6 small rectangles with amber glow (CSS box-shadow amber)
3 chimneys: grey cylinders with animated smoke circles rising
  (CSS: @keyframes smoke — opacity 1→0, translateY 0→-40px, 3s infinite, staggered)
Spinning gear on building side: amber ⚙️ or SVG gear, 4s rotation
Conveyor belt at base: dark rectangle with small boxes sliding along
Waving worker: simple SVG person with hard hat, waving arm animation
Sign on building: "HEALTH PLAN FACTORY" in amber on navy rectangle
Speech bubble above: "🏗️ Building your plan now..." with bob animation
  @keyframes bob: translateY 0→-8px→0, 6s ease-in-out infinite
Background: simple sun + 2 clouds in light sky area

Below illustration — mini plan preview card (floating animation):
"YOUR PLAN — assembled" label in amber small caps
3 plan items with emoji, name, cost, HSA badge
Budget bar: $135 of $150/month (amber fill, grey track)
[Build your plan — it's free →] amber button

TRUST BAR (navy background, after hero):
4 items, centered, Outfit 500, small, white/65:
🏥 Wellness guide — not a medical provider · 💰 Free to build, always ·
🧾 HSA/FSA eligible options · 🚨 Emergency: call 911

EMERGENCY BANNER (dark red #7f1d1d background, after trust bar):
Text: "Medical or mental health emergency?"
3 tap-to-call buttons side by side:
  [Call 911] white on dark-red  [Call 988] [Text 741741]

IS / IS NOT SECTION (amber-pale background, 3px amber top border):
Centered heading: "What HealthPlanFactory is — and isn't"
Two-column grid (1-col on mobile):
Left "✓ HealthPlanFactory IS" (sage header, 7 items with ✓ sage):
  A wellness optimization and care navigation platform
  A tool to explore options across 47+ modalities
  A budget-aware plan ranked by evidence
  A marketplace to find and book vetted local providers
  A complement to your existing medical care
  A way to unlock HSA/FSA spending on eligible services
  A platform that always refers emergencies to 911
Right "✗ HealthPlanFactory is NOT" (rose header, 7 items with ✗ rose):
  A licensed medical provider or healthcare organization
  A diagnostic tool — we do not identify medical conditions
  A treatment provider — no prescribing, curing, or treating
  A replacement for your physician or specialist
  A mental health crisis service — call 988 for that
  A guarantee that any modality will work for you
  A source of medical advice, diagnosis, or clinical opinion
Bottom note: "Always keep your physician informed of your wellness activities."
Amber link: "Read our full disclaimer →" → /disclaimer

HOW IT WORKS (off-white background):
Section label + Cormorant heading with italic amber em.
4 steps in a connected horizontal grid (stacked mobile):
Each step: amber number circle, emoji, Cormorant title, Outfit body:
01 Set your budget — "Tell us what you can realistically spend. $50 or $500."
02 Your health picture — "Conditions, goals, preferences. No jargon required."
03 Your plan is assembled — "AI ranks modalities by evidence, fits to your budget."
04 Book & build — "Find local providers. Book directly. Track your progress."
Dashed line connecting the steps.

MODALITIES (navy background):
Decorative ⚙️ emojis at 4% opacity behind content.
Section label amber + Cormorant heading white with italic amber.
12-card responsive grid:
  🤲 Massage · 🧘 Yoga · 🤸 Pilates · 🦴 Chiropractic
  🪡 Acupuncture · 🏃 Physical Therapy · 🏋️ Personal Trainer · 🥗 Dietitian
  🌿 Nutrition Coach · 🧠 Meditation · 💻 Telehealth · 👨‍⚕️ DPC Physician
Each card: dark translucent bg, amber border 15% opacity, 10px radius,
emoji (1.5rem), name Outfit 500 white, evidence badge.
Hover: navy bg → amber bg, text → navy (CSS transition 0.2s).

PROBLEM SECTION (off-white):
Large DM Mono stat "28M" with amber underline bar.
Problem copy in Outfit 300, text2.
3 stat tiles: navy bg, white text, DM Mono numbers.

PROVIDERS SECTION (white background):
Left: section label, Cormorant heading, body, 4 benefit rows with amber icons,
amber "Apply as founding provider" button.
Right: mock provider card — navy gradient header, provider details, rating,
founding badge, HSA badge, booking row.

PRICING (parchment background):
Section label + Cormorant heading. 3 cards:
Free (white bg) · Plus (navy bg, amber "Most popular" badge) · Employer (white bg)
Prices in Cormorant serif, large. Sage checkmarks. Amber CTA on Plus.

TESTIMONIALS (warm-white):
3 testimonial cards. Stars in amber. Quote in Cormorant italic.
Include one from a DPC physician.

FINAL CTA (sage #3d6b52 background):
Cormorant heading in cream white with italic amber.
Cream white button. Radial gradient overlay.

FOOTER (navy background):
Logo, nav links, legal links. Disclaimer all 3 lines. text3 color, 0.75rem.
© 2026 Zanetis Holdings LLC

AUTH:
Supabase email + password. Routes:
  / (landing, public)
  /signup (public)
  /signin (public)
  /dashboard (protected — redirect to /signin if not authed)
On signup: create profile row in public.profiles.
```

---

### PROMPT 2 — Member signup flow (5 screens)

```
Build /signup/member — 5-screen member intake flow.
Sticky progress bar shows 5 labeled steps with dots.
Completed steps: sage dot. Active: navy dot. Future: border dot.
Each screen: white card, max-width 540px, centered, 3rem padding.
Card animates in: fadeIn + translateY(24px→0), 350ms ease.
Each screen heading: Cormorant Garamond 700, step label in amber above.

SCREEN 1 — About you:
Heading: "Let's start with the basics."
Body: Outfit 300, text2 — "We use your location to find providers near you."
Fields:
  - First name (text input, autocomplete given-name)
  - ZIP code (numeric, maxlength 5)
  - Max commute (select): 5 mi / 10 mi / 25 mi / 50 mi / Telehealth only
  - Age range (single-select chips): Under 25 / 25–34 / 35–44 / 45–54 / 55–64 / 65+
Chips: Outfit 500, 0.8rem, 100px border-radius (pill ok for chips only),
  border 1.5px solid border-s, hover: border-navy + navy text,
  selected: navy bg + white text.

SCREEN 2 — Your health picture:
Heading: "What's going on with your health?"
Body: "Select all that apply. This stays private and personalizes your plan."
Multi-select condition chips (wrap freely):
Back pain · Neck pain · Joint pain · Chronic pain · Anxiety · Chronic stress ·
Sleep issues · Low energy · Burnout · Pre-diabetes · High blood pressure ·
Digestive issues · Weight management · Post-injury recovery · Poor posture ·
Hormonal imbalance · No specific condition
Insurance status (single-select chips):
Insured / Uninsured / Underinsured
HSA/FSA (single-select chips):
Yes — I have HSA / Yes — I have FSA / No / Not sure

SCREEN 3 — Goals (max 3):
Heading: "What matters most to you?"
Body: "Pick your top 3 — we build your plan around these priorities."
Multi-select chips, lock after 3 selected, show rank number 1/2/3:
Reduce pain · Reduce stress · More energy · Better sleep · Lose weight ·
Build strength · Improve flexibility · Prevent disease · Better nutrition ·
Mental clarity · Recover from injury · Build a routine
When 1+ selected show hint: "✓ Your top priorities are locked in." in sage.
Optional free-text textarea: "Anything else we should know?" (Outfit 300)

SCREEN 4 — Budget:
Heading: "What can you spend on wellness each month?"
Body: "Be realistic — we build around what's actual, not ideal."
DM Mono budget display, 2.5rem: $[value]/month
Range slider $25–$500, step $5.
Slider thumb: navy circle 22px. Track fill: navy color left of thumb.
Labels: "$25/mo" left, "$500/mo" right, Outfit 300 text3.
Update live with oninput.
Format preference chips (single-select):
In-person / Virtual / Both work for me

SCREEN 5 — Consent (cannot skip):
Heading: "Almost done — one important step."
Full IS/IS NOT disclaimer in amber-pale card, amber left border 3px:
  Bold title: "⚖️ Important: Please read before continuing"
  Body: HealthPlanFactory is a wellness optimization platform — not a medical
  provider, diagnostic tool, or substitute for professional healthcare. Your
  plan is not medical advice, a diagnosis, or a treatment plan. Always consult
  your physician before starting any new wellness regimen, especially if you
  have chronic conditions. For medical emergencies, call 911. Mental health
  crisis: call or text 988.
Required checkbox (Outfit 0.82rem):
  "I understand HealthPlanFactory is a wellness navigation tool, not a
  substitute for medical care, diagnosis, or treatment. I will consult my
  physician for medical concerns."
[Build my plan ⚙️] amber button — DISABLED until checkbox checked.
  disabled opacity: 0.4, pointer-events: none.

On complete:
- Save to Supabase: members table with all intake data
- Set trial_started_at = now(), trial_ends_at = now() + 14 days
- Set subscription_tier = 'trial'
- Set triage_consent_given = true
- Redirect to /plan/build
```

---

### PROMPT 3 — Provider signup (wellness + physician branches)

```
Build /signup/provider — branching provider signup.

START SCREEN (before branch):
Two large card options:
  [🧘 I'm a wellness provider] — massage, yoga, PT, nutrition, etc.
  [👨‍⚕️ I'm a physician] — DPC, rural family, integrative MD

WELLNESS PROVIDER FLOW (5 screens):

Screen 1 — Account:
First name, last name, email, password (confirm).
Business name (optional — "or your own name is fine").

Screen 2 — Your modality:
Heading: "What do you offer?"
Modality dropdown (single select). On selection: show credential chips for that modality.
Credential chips (multi-select):
  Massage → LMT · NCTMB · ABMP
  Yoga → RYT-200 · RYT-500 · E-RYT
  PT → PT · DPT · OCS
  Chiropractic → DC · DACBSP
  Acupuncture → LAc · MAc · NCCAOM
  (etc. for all modalities)
Years of experience: number input (min 0, max 50)
Specialties: free-text input with tag chips

Screen 3 — Location + pricing:
Address with Google Places autocomplete (lat/lng stored in Supabase)
Session price: two inputs — min $ and max $
Duration checkboxes: 30 min / 60 min / 90 min
Format toggles: In-person available / Virtual available / Accepts HSA/FSA

Screen 4 — Profile:
Circular avatar upload (Supabase Storage). Preview live.
Bio textarea: 300 char counter, Outfit 300 placeholder.
Instagram handle (optional). Website URL (optional).

Screen 5 — Availability grid:
7-column grid (Mon–Sun) × 3 rows (Morning / Afternoon / Evening).
Each cell is a toggle. Selected: amber background.

FOUNDING PROVIDER SCREEN (all wellness, after Screen 5):
Navy background card with amber star badge.
Cormorant heading: "You're a HealthPlanFactory Founding Provider."
Body: "Zero platform commission on bookings for your first 90 days.
You keep 100% of every session fee during your founding period."
In Supabase: set is_founding_provider = true, founding_expires_at = now() + 90 days,
commission_rate = 0.00.
[Go to my dashboard →] amber button → /provider/dashboard

PHYSICIAN FLOW (triggered from start screen):

Screen 1 — Account: same as wellness

Screen 2 — Credentials:
Heading: "Your medical credentials"
Medical degree chips (single-select): MD / DO / NP / PA
License number input + state select
NPI number (optional)
Board certifications chips (multi-select):
ABFM · ABIM · ABFP · IFM Certified · ABIHM · Other

Screen 3 — Practice type:
Type chips (single-select): Direct Primary Care (DPC) · Rural Family · Integrative MD
Membership model chips: Per session · Monthly membership · Annual membership
If Monthly: fee input ($50–$500/month range shown)
If Annual: fee input ($600–$6,000/year)
Included services chips (multi-select):
Annual physical · Same-day appointments · 24/7 phone/text · Basic labs ·
Care coordination · Chronic disease management · Can write LMN
Toggles: Accepts insurance for procedures · Accepting new patients ·
Serves rural patients · HPSA designated · Telehealth available

Screen 4 — Location + Profile: same as wellness

Founding screen: same as wellness.
In Supabase additionally: set provider_category = 'physician',
physician_type appropriately.
```

---

## PHASE 2 — CORE PRODUCT

---

### PROMPT 4 — Plan builder with pay-per-reveal paywall

```
Build /plan/build — the AI plan generator with pay-per-reveal unlock model.
This is the most important screen. Build it with full attention.

BUILDING STATE (shown while API calls Supabase edge function /build-regimen):
Full-width navy card, centered content.
Factory emoji 🏭 bouncing: @keyframes factoryBob translateY 0→-12px→0, 2s infinite.
Cormorant heading white: "Building your plan, [italic amber]right now.[/italic]"
Outfit 300 body white/55: "Our AI is searching providers near you, ranking options
by evidence, and fitting everything to your budget. About 15 seconds."
5 sequential build steps (animate in one by one, 1.2s apart):
  Each step: dark translucent panel, icon, text, check mark on complete
  01 📍 Scanning providers within [X] miles of [ZIP]
  02 🧬 Matching modalities to your conditions
  03 💰 Fitting everything to your $[budget]/month budget
  04 ⚖️ Ranking by clinical evidence strength
  05 📋 Assembling your personalized plan
Active step: amber border. Completed: sage border + check mark.
Spinner below final step. Disclaimer in white/25 below spinner.
After all 5 complete: transition to plan reveal (fade out building, fade in plan).

PLAN HEADER (navy background):
Left: "[Name]'s Wellness Plan" Cormorant 700 white +
  member's conditions + "$[budget]/month" in text3
Right: [🔓 Unlock all steps — save 40%] amber button
Below: meta badges row —
  ⚙️ [N] steps assembled · [N] providers found nearby · Budget: $[used]/$[total]/mo
Always-visible disclaimer card (below badges):
  Navy-10 bg, navy border, Outfit 0.72rem white/40:
  "⚖️ Wellness plan — not medical advice. Not a diagnosis, treatment plan,
  or prescription. Always consult your physician. Emergency: 911. Crisis: 988."

BUDGET BAR (white card):
Labels: "Monthly budget allocation" left, "$[used] of $[total]/month" right DM Mono
Track: grey 8px height, border-radius 100px
Fill: navy→amber gradient, width = (used/total * 100)%, transitions 0.8s ease
Note below: "$[remaining] remaining"

PLAN ITEM CARDS (one per modality, rendered from edge function JSON):

Each card has three zones:

ZONE A — always visible (free):
Priority badge: navy bg, white DM Mono number. Turns sage after unlock.
Modality emoji (1.6rem) + Cormorant 700 name + Outfit tagline
Tag pills: evidence badge + HSA badge + frequency tag
Right side: DM Mono cost + "per month" label

ZONE B — "why this is in your plan" (always visible, free):
Amber left border 3px, sage-pale background, Outfit 300 italic, 0.82rem text2
Contains 2–3 sentences from the AI explaining why this modality was chosen.
Renders from regimen JSON "why" field.

ZONE C — providers (locked until paid):

LOCKED STATE:
Lock icon 🔒 in parch-colored 40px square, 10px radius
"[N] providers found near you" Outfit 600 navy
"Prices, availability & booking — unlock to see" Outfit 0.75rem text2
3 blurred placeholder names (CSS: filter blur(4px), text-shadow to show shapes)
[🔓 Unlock $[price]] amber button, Outfit 700
  Price: $2 for most modalities. $3 for physician. $1 for app-based.
  Hover: amber-l bg + translateY(-1px)

UNLOCKED STATE (after payment success):
Providers grid: 2–3 cards per modality (responsive)
Each provider card (white bg, border, 10px radius, hover: amber border + lift):
  Avatar: 38px square, 10px radius, navy bg, initials Cormorant 700 white
  Name: Outfit 600 0.85rem navy
  Credentials: Outfit 0.7rem text3
  Stars: amber ★ + count
  Meta pills: price / distance / HSA badge / days available
  [Book a session →] navy button → /book/[providerId]
Below provider grid: Outfit 0.7rem text3 italic:
  "These providers are independently listed. HealthPlanFactory is a referral
  marketplace. The provider relationship is directly between you and the provider."
Rank badge turns sage after unlock.
Toast notification appears: "✅ Step [N] unlocked — providers revealed!"

BUNDLE UPSELL (appears after first unlock, once only):
Amber-pale card, 1.5px amber border, 14px radius.
Left: "💡 Save more" amber label + Cormorant heading "Unlock all remaining steps"
  + Outfit body + "Save 40%" amber pill
Right: [Get the bundle →] amber button
Calculation: remaining steps × individual price × 0.60 = bundle price.
Dismissed on click or after bundle purchase.

PAYMENT MODAL (triggered by unlock or bundle button):
Dark overlay rgba(27,45,79,0.6) + blur(4px). White modal 440px max-width.
Header: "Unlock this step" Cormorant 700 + ✕ close button
Item preview card: emoji + name + "See all [N] matched providers near you" + price DM Mono
"What you get" list (5 items, sage checkmarks):
  All providers near you offering this modality
  Their exact prices, availability, and ratings
  Direct in-app booking — no phone calls needed
  HSA/FSA eligibility flagged automatically
  Yours forever — unlock once, access always
Stripe Elements card input (styled to match brand)
[🔓 Pay $[amount] · Unlock now] navy button (turns amber on hover)
Disclaimer Outfit 0.68rem text3:
  "Secure payment via Stripe. One-time charge — not a subscription.
  Unlocking providers does not constitute a booking or medical referral."
Secure badges: 🔒 SSL encrypted · 💳 Stripe · ✓ One-time charge
On success: close modal, reveal providers inline, show toast.

PLAN FOOTER DISCLAIMER (always visible, white card):
Full medical disclaimer + HSA/FSA note + emergency resources.
Anchored at #disclaimer. Linked from header and modal.

Supabase: on plan build, save to care_plans table (raw_regimen as JSONB).
Track unlock_payments separately in a new table:
  unlock_payments (id, member_id, care_plan_id, modality_key,
  amount_cents, stripe_payment_intent_id, created_at)
```

---

### PROMPT 5 — Member dashboard

```
Build /dashboard — authenticated member home.

LAYOUT: Fixed 240px sidebar (navy) + main content (off-white background).

SIDEBAR:
Top: logo + spinning gear
Member section: 40px avatar (amber), member name Outfit 600 white,
  city/state text3, subscription tier badge (amber pill "Plus" or "Free")
Nav items (Outfit 500, 0.84rem):
  🏠 Dashboard · 📋 My Plan · 🔍 Discover
  📅 Routine · 📓 Journal · 💳 HSA/FSA Log
  🤝 Accountability · 🤖 AI Coach · ⚙️ Settings
Active item: amber left border 3px, amber-10 bg, white text.
Hover: white/5 bg.
Plus-gated items (Routine/Journal/HSA/Accountability/Coach):
  Show amber lock icon on hover if on free tier.
Bottom: small disclaimer text white/30 Outfit 0.68rem.

TOPBAR (sticky, warm-white bg, 60px):
Left: page title "Dashboard" Cormorant 700
Right: [⚙️ Rebuild my plan] amber button

TRIAL BADGE (dashboard only, below topbar):
If trial active and days > 3: amber-p pill "✨ [X] days left in your free trial"
If trial active and days ≤ 3: amber bg pulse "⏳ [X] days · Upgrade now →"
If expired: redirect to /trial-expired

WELLNESS SCORE HERO (navy card, full width):
Left: animated SVG ring 110px:
  Outer circle: stroke rgba(255,255,255,0.08), stroke-width 8
  Inner circle: stroke amber, stroke-width 8, stroke-linecap round
  stroke-dasharray 283, stroke-dashoffset = 283 - (score/100 * 283)
  Animate dashoffset on mount: 1s ease transition
  Center: DM Mono score number white, "/ 100" text3
Center: "On Track" Cormorant 700 white (or "Needs attention" etc.)
  Score change pill: "↑8 pts this week" sage text
  Outfit 300 white/55 body: personalized context line
  4 metric pills (DM Mono values): Sessions / Streak / Budget used / Rating
Right: Wearable data mini-panel (navy-10 bg, white border, 12px radius):
  "Apple Health / Google Fit" label text3
  Steps / Sleep / Resting HR rows with ↑↓ change indicators
  [Connect wearable] amber link if not connected

4 STAT CARDS (2×2 grid):
Each: white bg, colored 3px top border, emoji, DM Mono value, label, change.
  📅 Sessions this month — sage top border
  🔥 Day streak — amber top border
  💰 Budget used — navy top border
  ⭐ Avg session rating — amber top border

PLAN PROGRESS (white card):
All current plan items with:
  emoji + name + provider name (if booked) + progress bar + status badge
  [View full plan →] amber link

UPCOMING SESSIONS (white card):
Next 3 sessions as horizontal cards. Provider + modality + date/time.
[View] navy button. Empty state: "No sessions booked yet · Browse providers →"

PROVIDER RELATIONSHIP HISTORY (white card):
Last 3–5 providers seen: avatar + name + session count + last seen + rating
"These are your wellness relationships — built over time in HPF."

AI COACH PREVIEW (amber-p card, amber border):
Last AI coach message preview.
Pulsing amber dot if new message or proactive alert.
[Open AI Coach →] navy button → /ai-coach

ACCOUNTABILITY QUICK-VIEW (white card):
Current level badge (amber pill). Buddy name if connected.
14-day streak dots (sage = done, rose = missed, amber = today).
[Go to Accountability →] link.
```

---

## PHASE 3 — DISCOVERY AND BOOKING

---

### PROMPT 6 — Discover + provider profiles + map

```
Build /discover — provider search with map.

DISCOVER LAYOUT (desktop):
280px filter sidebar left. Results grid right. Map toggle top-right.

FILTER SIDEBAR (white bg, border-right):
Section label "FILTERS" amber uppercase.
Modality: dropdown all modalities + "All"
Distance: radio chips — 5 mi / 10 mi / 25 mi / 50 mi
Price: slider $0–$300/session
Format: In-person / Virtual / Both (chips)
Accepts HSA/FSA: toggle
Can write LMN: toggle (shows physicians who can write Letter of Medical Necessity)
Min rating: ★★★★+ toggle
Accepting new patients: toggle
Provider type: [Wellness] [Physician] [Both] (chips, default Both)
[Apply filters] navy button. [Clear all] amber link.
Mobile: filters in bottom drawer.

RESULTS HEADER:
"[N] providers near [city]" Outfit 600
Sort: Relevance / Distance / Price ↑ / Rating
[≡ List] [🗺 Map] view toggle (amber active state)

WELLNESS PROVIDER CARD (white bg, border, 14px radius, hover lift):
Circular avatar 60px (or photo). Name Outfit 600 navy. Modality badge.
Credentials Outfit 0.7rem text3. Stars amber + review count.
Distance + city. Price range DM Mono. HSA badge if eligible.
Founding badge if is_founding_provider.
[View profile] navy button. [♡ Save] outlined.

PHYSICIAN CARD (same + blue left border 3px):
"Dr." prefix. "👨‍⚕️ Licensed Physician" sky badge.
Practice type + membership price. "Accepting new patients" sage chip.
LMN badge if can_write_lmn. Distance.

MAP VIEW:
Google Maps embedded. Navy map style.
Green pins: wellness. Blue pins: physicians.
Click pin: popup with mini provider card + [Book →] button.

PROVIDER PROFILE — /provider/:id:

Hero section (navy gradient background):
Provider photo or avatar (80px circle) overlapping info card.
Name Cormorant 700 white. Modality badge. Verified badge sage.
Stars + review count. Distance.
[Book a session] amber button. [♡ Save] outlined white.

About card: bio Outfit 300. Certifications chips sage-p. Specialties chips navy-10.

Session details card (sage-pale bg, sage left border):
Price range DM Mono. Durations. In-person/virtual. Accepts HSA/FSA.
If HSA: "May be eligible with your plan — a Letter of Medical Necessity
from your physician may be required. Consult your plan administrator."

Availability: next 7 dates as chips. Amber = available, grey = full.

Reviews: star breakdown + individual review cards (booking-verified badge on each).

Provider disclaimer (Outfit 0.74rem text3, below booking button):
"[Name] is independently listed on HealthPlanFactory. HealthPlanFactory is a
referral marketplace, not a medical provider. The provider-client relationship is
between you and the provider directly. For emergencies call 911."

PHYSICIAN PROFILE ADDITIONS:
Blue "👨‍⚕️ Licensed Physician" badge.
Practice model card (sky-p bg, sky left border 3px):
  Practice type · Membership: $[X]/month · Included services chips
  Insurance for procedures · Accepting new patients: Yes ([N] spots)
  LMN amber pill if can_write_lmn = true
  Rural badge if serves_rural = true
[Join this practice →] navy button → inquiry form (NOT booking calendar).
Inquiry form: name, email, phone, message → save to Supabase physician_inquiries.
```

---

### PROMPT 7 — Booking flow

```
Build /book/:providerId — 5-step booking flow (wellness only, not physicians).

All steps: white card max-width 560px, centered, progress indicator top.
Cormorant headings, Outfit body. Amber active states.

STEP 1 — Session type:
[In Person] [Virtual] large toggle cards (show only what provider offers).
In-person: shows provider address. Virtual: shows "Video call link sent on confirmation."

STEP 2 — Date and time:
4-week calendar grid. Amber = available, grey = unavailable/past.
Click date → time slot chips appear below.
Time slots from provider availability table. Selected: amber bg.

STEP 3 — Session details:
Duration chips: 30 / 60 / 90 min (show what provider offers).
Notes textarea (optional): "Anything to share with your provider?"
Price breakdown card (navy bg, white text, 12px radius):
  Session fee:     $[X].00  (DM Mono right-aligned)
  Platform fee:    $[Y].00  (12% · or "0% — founding period" if applicable)
  ─────────────────────────
  Total:           $[Z].00  (DM Mono larger)
HSA/FSA badge if eligible. LMN note if required for HSA.
Disclaimer: "Booking is not a medical referral. The provider relationship..."

STEP 4 — Payment:
Stripe Elements card input. Match brand: amber focus ring, navy labels.
[Pay $[total] · Confirm booking] amber button.
🔒 "Secured by Stripe · SSL encrypted" below.
"Cancel within 24 hours for a full refund — no questions asked."

STEP 5 — Confirmation:
Sage animated checkmark (CSS draw animation).
Cormorant "You're booked!" heading.
Booking summary card: provider + modality + date/time + price.
[Add to calendar] (.ics file download). [View my plan →] amber button.
"Add this to your weekly routine?" prompt with [Add] navy button.
If HSA eligible: auto-create hsa_fsa_log entry in Supabase.
Send confirmation email via Resend API.

Supabase on success:
- Create booking row (status = 'confirmed')
- Create hsa_fsa_log row if is_hsa_eligible
- Update care_plan sessions_completed count
```

---

## PHASE 4 — ACCOUNTABILITY + AI

---

### PROMPT 8 — Accountability Center (4 levels, fully interactive)

```
Build /accountability — the full 4-level accountability system.
Plus-gate Levels 3 and 4 for free members. Never gate Levels 1 or 2.

PAGE HEADER:
Section label + Cormorant heading "Your [em italic amber]accountability[/em] center."
Subheading Outfit 300: "ChatGPT gives you a plan and forgets you exist.
HealthPlanFactory stays with you. Choose your level — change it anytime."

LEVEL SELECTOR (white card):
Header row: "Your accountability level" + current level amber pill with pulse dot.
4-column grid (2-col mobile):
Each level card (white bg, border, 16px radius, cursor pointer, hover lift):
  Level number in DM Mono (32px navy square → amber on active)
  Emoji icon (1.3rem)
  Title Outfit 700
  Description Outfit 0.74rem text3
  Tier tag: [Free] sage / [Plus] amber / [Add-on] purple
Active card: amber border 2px, amber-p bg, amber check badge top-right.
onClick: animate panel transition (fadeIn + translateY(8→0), 0.3s).

Current label in amber pill updates on switch.

LEVEL 1 PANEL — SELF (always free):

Daily commitments checklist:
Off-white card, label "Tap to check off what you've done today".
5 items tied to member's active plan:
  Each item: white bg, border, 8px radius, emoji + label + plan tag.
  Click: toggles checked state.
  Checked: sage-p bg, sage border, sage ✓ checkbox.
Today progress bar below checklist (sage fill, shows X/5 completed).

28-day streak grid:
7 columns × 4 rows of 28px × 28px dots. 6px radius.
  Completed days: sage bg, white ✓
  Missed days: rose-p bg, rose ✗
  Today: amber-p bg, amber ●
  Future: off-white bg, border only
Streak stats: Current streak / Best streak / Month % (DM Mono values, Outfit labels).

Quick journal entry:
Date (auto today). Mood: 5 emoji buttons, tap to select (amber border on selected).
Pain 0–10 input. Energy 0–10 input. Sleep quality select.
Sessions completed text. Notes textarea (optional).
[Save today's entry →] amber button → saves to Supabase journal table.

LEVEL 2 PANEL — BUDDY (always free):

Buddy status card (sage-p bg, sage border):
Avatar 48px (sage bg, initials Cormorant 700). Name + shared goals.
Online indicator (green dot + "Active [X] hours ago").
Buddy streak counter right-aligned.

Shared plan progress:
Off-white card. For each plan item: emoji + name + side-by-side progress bars.
  Your bar (amber) and buddy's bar (sage) with labels "You X/Y · [Buddy] X/Y".

Check-in thread (chat UI):
Scrollable 280px height. Message bubbles:
  Buddy messages: off-white bg, navy text, 4px 16px 16px 16px radius.
  Your messages: navy bg, white text, 16px 4px 16px 16px radius. Right-aligned.
  Timestamps in text3 below each message.
Message input + [Send →] navy button.
Auto-reply after 1.5s (for prototype — connect to real messaging in production).

Invite card (dashed border, 2px dashed border-s):
"👥 Invite a second accountability buddy"
[Send an invite →] amber button.

LEVEL 3 PANEL — COMMUNITY (Plus gate):
If free: blur UI + overlay card "Community is a Plus feature · [Upgrade] · [Not now]"

Community header card (navy gradient, 14px radius):
Local community name + member count + active challenge count + session count.

3 tabs: 🏆 Challenges · 📣 Feed · 🥇 Leaderboard

CHALLENGES TAB:
2-column challenge cards (1-col mobile). Each card:
  Header: emoji + status badge (Live/Popular/New/✓Joined)
  Title Outfit 700. Description Outfit 0.75rem.
  Meta: 👥 member count + ⏱ days left.
  Progress bar: community completion %.
  [Join →] navy button → turns sage "✓ Joined", card gets sage border.
Challenges: 30-Day Yoga Streak · March Massage Month · 7-Day Meditation Reset ·
DPC Check-In Challenge (+ more based on active plan items)

FEED TAB:
Anonymous posts (initials only — NEVER real names).
Each post: avatar (initials) + anonymous label + timeago.
Milestone badge if applicable (amber pill).
Post content (Outfit 0.82rem text2).
Reactions: ❤️ count · 💪 count · 🙌 Reply (click to toggle liked state).

LEADERBOARD TAB:
Privacy note: "🔒 All names are anonymous. You control what's visible."
Ranked rows: position + initials avatar + plan focus + score DM Mono + weekly change.
Current member row highlighted amber-p bg.
Points logic: 10 pts per session completed, 5 pts per journal entry,
  20 pts per streak milestone, 15 pts per challenge completed.

LEVEL 4 PANEL — COACH ($49/month add-on):

If not subscribed:
Pricing card (purple-p bg, purple border, 14px radius):
  Left: title + description + 6 feature list items (purple ✓ each)
  Right: "$49/month" DM Mono + "First session free" note
  [Get a coach →] purple bg button

If subscribed (or after clicking Get a coach):
Coach card (purple gradient header):
  Avatar + green online badge + NBC-HWC name + credentials + stars + specialties
Next session banner (purple-p bg, purple border):
  Date/time/duration + [Join session →] purple button
Coach chat (same bubble UI as buddy, purple send button).
Quick actions 2×2 grid:
  Share progress · Reschedule session · Request plan adjustment · Switch coach

NOTIFICATION SETTINGS (bottom of page, all levels):
Toggle switches (custom CSS toggle: sage on active):
  Daily commitment reminder · Session booking reminders · Buddy check-ins ·
  Streak at-risk warning · Weekly progress summary · Community updates · Quiet hours.

Page disclaimer (Outfit 0.74rem text3, bottom):
"Accountability features support wellness habits. They are not medical guidance
and do not replace your physician or licensed mental health provider."
```

---

### PROMPT 9 — AI Accountability Coach (live Claude API)

```
Build /ai-coach — live Claude-powered accountability chat.
This screen has a fixed sidebar (member context) + chat area.
Full viewport height. No scroll on outer layout.

SIDEBAR (300px, white bg, border-right, overflow-y auto):
Section: "Wellness Score" — mini SVG ring (52px), score DM Mono, status + change.
Section: "Current Plan" — list of plan items with colored status badges.
  On track: sage. Due soon: amber. Not started: text3. Missed: rose.
Section: "28-Day Streak" — compact dot grid (20×20px dots, 4px radius).
  Sage = done, rose = missed, amber = today, off = empty.
  Streak stats: current / best / month %.
Section: "Recent Journal (7 days)" — compact entries:
  Date (DM Mono) + mood emoji + pain badge (sage 0–3, amber 4–6, rose 7–10) + note.
Section: "Upcoming Sessions" — next 3 with emoji + provider + date + days-away badge.

TOPBAR (navy bg, 58px):
Left: HPF logo.
Center: green pulse dot + "AI Accountability Coach · Powered by Claude · Knows your plan"
Right: member name chip (navy-10 bg, member initials avatar).

COACH INTRO BAR (navy gradient, 70px, below topbar):
Left: gear emoji avatar (amber gradient, 44px, 12px radius) + name + status.
Center: "I've reviewed your journal, tracked your streak, and know your plan."
Right: tags — "🔒 Not medical advice" · "📋 Plan-aware" · "📓 Journal-aware"

PROACTIVE ALERT BAR (amber-p bg, amber-10 border, below intro):
Shown when AI detected something in member's data on page load.
💡 icon + specific observation text + "Ask about it →" link + ✕ dismiss.
Clicking "Ask about it →" sends that specific question to the chat automatically.
Dismiss hides the bar for current session.

MESSAGES AREA (flex-1, overflow-y auto, 1.25rem padding):
AI messages: gear emoji avatar (amber gradient, 36px) + white bubble (navy border,
  4px 16px 16px 16px radius, box-shadow soft). Left-aligned.
User messages: member initials avatar (navy, 36px) + navy bubble
  (16px 4px 16px 16px radius). Right-aligned.
Timestamps: text3, 0.62rem, below each bubble.
Typing indicator: 3 bouncing dots in white bubble (CSS: translateY animation staggered).
Message animations: fadeIn + translateY(8→0), 0.25s ease on each new message.
Parse **bold** → <strong>. Parse *italic* → <em>. \n\n → new paragraph.

SUGGESTION CHIPS (above input, shown before first user message):
6 chips tied to member's actual data gaps. Outfit 500, 0.78rem.
Navy border, text2. Hover: amber border, amber text, amber-p bg.
Disappear after first user message is sent.
Examples based on member's plan:
  "🔥 How's my streak looking?"
  "😣 My back is hurting today"
  "📅 What should I focus on this week?"
  "💸 Am I getting value from my plan?"
  "🧘 I skipped yoga again"
  "👨‍⚕️ Should I book the DPC doctor?"

INPUT AREA (warm-white bg, border-top, padding 0.875rem 1.5rem):
Auto-resizing textarea (max 4 lines, Outfit 0.88rem, warm-white bg, no border on textarea itself).
Wrap textarea in a white card with amber focus border (the card has the border, not the textarea).
Emoji mood button left of textarea. Navy send button (→ icon) right.
Send button: hover → amber. Enter key sends. Shift+Enter = newline.
Disclaimer below input (Outfit 0.66rem text3):
  "⚖️ AI wellness coach — not medical advice. Not a substitute for your physician.
  Emergency: 911. Mental health crisis: 988. [Full disclaimer →]"

CLAUDE API INTEGRATION:
NEVER call Anthropic API directly from frontend — all calls go through
Supabase edge function /ai-coach.

Frontend sends to /ai-coach:
  { memberContext: {...}, conversationHistory: [{role, content}] }

Edge function /ai-coach builds the system prompt server-side:
System prompt includes ALL of:
  - Member name, location, conditions, goals, budget, insurance status
  - All plan items with status, session counts, provider names, upcoming dates
  - Last 7 journal entries (date, mood, pain/10, energy/10, note)
  - Streak stats (current, best, month %)
  - Upcoming sessions with provider name + date + days away
  - Accountability level + buddy name and shared goals
  - Today's date

System prompt coach instructions:
  1. You know this member's full data — never ask for info you already have
  2. Lead proactively — notice patterns, flag concerns, celebrate wins
  3. Be warm but direct — accountability partner, not cheerleader
  4. NEVER give medical advice, diagnoses, or clinical recommendations
  5. Keep responses to 2–4 short paragraphs max
  6. Reference specific journal entries, plan gaps, and upcoming sessions
  7. Nudge toward un-started plan items (especially DPC if uninsured)
  8. Occasionally reference accountability buddy when relevant
  9. Naturally include "consult your physician" when health topics arise
  10. For emergencies: "please call 911 immediately"

ON PAGE LOAD: send hidden system message to trigger proactive opening:
"[Generate a proactive opening check-in based on this member's data.
Lead with something specific from their journal, streak, or plan.
Reference actual numbers. End with one focused question or nudge.]"
This generates the first AI message without the member needing to type anything.

Model: claude-sonnet-4-20250514
Max tokens: 1000
Maintain full conversation history in React state. Pass entire history with each call.

EMERGENCY INTERCEPTOR (runs on every user message before API call):
Check for keywords: chest pain, heart attack, can't breathe, stroke, suicidal,
want to die, kill myself, overdose, seizure, anaphylaxis, throat closing,
unconscious, severe bleeding, can't stop bleeding, mental breakdown
On match: STOP API call. Show full-screen overlay (z-index 9999):
  Dark red rgba(127,29,29,0.95) backdrop + white card:
  "⚠️ This may be a medical emergency"
  "HealthPlanFactory cannot assist with emergencies."
  [Call 911] red button · [Call 988 — Mental Health] outlined · [Text 741741]
  Small text: "I'm safe — this was a misunderstanding" → dismisses
  CANNOT dismiss by clicking outside overlay.
  Log to emergency_log table: keyword, trigger text, timestamp.
```

---

## PHASE 5 — PLUS FEATURES

---

### PROMPT 10 — Routine builder + journal + HSA log

```
Build three Plus-gated member features.
Gate all three for free/expired: blur target UI + overlay card:
  "📅 [Feature name] is a Plus feature · $9.99/month unlocks everything"
  [Upgrade to Plus →] amber button · [Not now] grey link
NEVER gate booking.

/routine — WEEKLY ROUTINE BUILDER:

Top: wellness score animated ring (large, 120px, same SVG ring as dashboard).
"Your Wellness Score: [N]/100" Cormorant heading. Change pill.
Ring updates live as activities are checked complete.

Weekly grid: 7 columns (Mon–Sun) × 3 rows (Morning/Afternoon/Evening).
Pre-populate from active plan items in relevant time slots.
Each cell with activity: colored card (modality color), time, provider if booked, checkbox.
Click checkbox: mark complete, increment wellness score, animate ring.
Each empty cell: "+" button → activity sheet:
  Activity type chips (from plan modalities) + time input + optional provider link.

Color coding: massage=amber, yoga=purple, PT=sky, training=navy,
nutrition=sage, meditation=lavender, rest=text3.

/journal — SYMPTOM + MOOD JOURNAL:

Quick-add form (top, white card):
  Date (auto today). Mood: 5 emoji buttons. Pain 0–10. Energy 0–10.
  Sleep select. Sessions completed. Notes. [Log entry] amber button.

Timeline (below): entries newest first, date-grouped.
Each entry: date DM Mono + mood emoji + pain badge + energy badge + note preview.
Click to expand full entry inline.

Insights panel (after 5+ entries, sage-p card):
Line chart: pain score and energy score over 7 days (DM Mono axis, amber/sage lines).
Pattern insight text: "You tend to feel better on days after yoga sessions."
  (derived from comparing journal_data with booking dates)

/hsa-log — HSA/FSA EXPENSE LOG:

3 summary stat cards: Total this year / HSA eligible / Potential reimbursable.
All in DM Mono, sage/amber colors.

Table: Date / Provider / Modality / Amount / Eligible (sage ✓ or —) / Receipt
Auto-populate from completed bookings where is_hsa_eligible = true.
[+ Add manual entry] for expenses outside HPF.

[Export PDF] amber button → generates receipt log PDF:
  HPF logo + member name + date range
  Itemized table of eligible expenses
  Total amount + modality breakdown
  Disclaimer footer (bold):
  "For personal record-keeping only. HSA/FSA eligibility is not guaranteed.
  Consult your plan administrator. A Letter of Medical Necessity may be required."
```

---

### PROMPT 11 — Provider dashboard

```
Build /provider/dashboard — provider home.

TOPBAR: HPF logo + "Provider Dashboard" + [View my public profile →] link.

FOUNDING PROVIDER BANNER (if active, amber bg, full width):
"🌟 You're a Founding Provider — Zero commission until [date]"
"You keep 100% of every session fee during your founding period."
Countdown: "[N] days remaining" in DM Mono.

4 STAT CARDS (2×2 grid, matching member dashboard style):
This month earnings DM Mono · YTD earnings · Profile views · Avg rating.

BOOKING REQUESTS (priority section):
Pending bookings need action. Each row:
  Member (anonymous — first name only) + modality + requested date/time
  [✓ Accept] sage button · [✗ Decline] outlined rose button
Empty state: "No pending requests — your profile is live and searchable."

UPCOMING BOOKINGS TABLE:
Columns: Member / Modality / Date & Time / Duration / Amount / Status
Status chips: Pending amber / Confirmed sage / Completed grey / Cancelled rose.
[Message] button per row.

PROFILE COMPLETION METER:
Progress bar 0–100%. Checklist:
  Profile photo ✓ · Bio ✓ · Certifications ✓ · Availability ✓ ·
  Stripe Connected · First booking completed
Each item links to the step to complete it.

YOUR SHARE LINK:
"healthplanfactory.com/p/[username]"
[Copy link] button (copies to clipboard, shows "Copied!" toast).
[Share on Instagram] · [Share on LinkedIn] amber links.

STRIPE CONNECT:
If stripe_account_id is null: amber callout "Connect your bank to receive payouts →"
  → Stripe Connect onboarding flow
If connected: "✓ Payouts connected" sage badge + next payout date DM Mono.

PHYSICIAN ADDITIONS (if provider_category = 'physician'):
"Practice inquiries this month: [N]" with inbox link.
LMN request messages count.

EARNINGS CHART:
Line chart, last 12 months. Amber line, DM Mono axis. Responsive.
```

---

## PHASE 6 — POLISH AND LAUNCH

---

### PROMPT 12 — Trial system + upgrade flow + emergency interceptor

```
Build the full trial and upgrade system plus global emergency detection.

TRIAL SYSTEM:
On member signup: set trial_started_at, trial_ends_at (14 days), subscription_tier='trial'.
Trial badge on dashboard (already in Prompt 5). Connect it to real Supabase data.
Daily cron via pg_cron: if trial_ends_at < now() AND subscription_tier = 'trial':
  set trial_expired = true, subscription_tier = 'free'
On expired member's next login: redirect to /trial-expired once.

/upgrade PAGE:
Cormorant heading: "Keep everything you've built."
Subheading Outfit 300: "Your plan, accountability, and journal — $9.99/month."

Dynamic "What you'll keep" card (reads real member Supabase data):
✓ Plan built — [N] items, $[budget]/month
✓ Routine — [N] activities scheduled (or "Nothing yet — start building")
✓ Journal — [N] entries logged (or "No entries yet")
✓ AI Coach conversations
✓ Accountability buddy connected (or "No buddy yet")
✓ HSA/FSA tracked — $[X] eligible (or "Not tracked yet")
✓ Provider relationships — [N] providers seen

Pricing toggle (monthly/annual, default annual):
  Monthly: $9.99/month
  Annual: $89.99/year (pill: "Save 25% — 2 months free")

Features list (sage checkmarks):
Unlimited plan rebuilds · Weekly routine builder · Symptom + mood journal ·
HSA/FSA log + PDF export · In-app booking (always free regardless) ·
AI Accountability Coach access · Community challenges + leaderboard ·
"Share with my doctor" PDF · Priority provider matching

[Start Plus — no contract, cancel anytime] amber button → Stripe Checkout.

Beneath button (Outfit 0.78rem text3):
"No contract. Cancel in 30 seconds in account settings.
We'll remind you 3 days before any renewal. No surprise fees.
Your plan PDF is yours to keep even if you cancel."

ALWAYS visible at bottom: "Prefer to stay free? [Continue with free account →]"

/trial-expired PAGE:
"Your 14-day trial has ended." Cormorant heading.
Show trial activity summary (dynamic from Supabase).
Same upgrade card. "[Go to my free account →]" link at bottom.

FEATURE GATE COMPONENT (reusable):
Blurs the target UI. Shows centered overlay card:
"[Feature name] is a Plus feature · $9.99/month unlocks everything"
[Upgrade to Plus →] amber · [Not now] grey text link
Never gate: booking flow, provider discovery, plan viewing (just unlocking).

GLOBAL EMERGENCY INTERCEPTOR (runs on every page):
Monitor all textarea and input elements for these keywords (case insensitive):
chest pain, chest tightness, heart attack, can't breathe, difficulty breathing,
stroke, facial drooping, suicidal, want to die, kill myself, overdose,
seizure, anaphylaxis, throat closing, unconscious, severe bleeding

On keyword match: full-screen overlay (z-index 9999):
Dark red rgba(127,29,29,0.95) background + centered white card:
  "⚠️ This may be a medical emergency"
  Outfit body: "HealthPlanFactory is a wellness platform and cannot assist
  with emergencies. Please seek help immediately."
  2×2 button grid:
    [Call 911] red filled · [Call 988 — Mental Health] outlined dark red
    [Find nearest ER] (links to Google Maps emergency room search)
    [Text HOME to 741741] (sms:741741)
  Small text below: "I'm safe — this was a misunderstanding. Return to HealthPlanFactory."
CANNOT dismiss by clicking outside. Only the "I'm safe" link dismisses.
Log to emergency_log: member_id, trigger_text, trigger_keywords[], timestamp.

GLOBAL POLISH (apply to all screens):
1. Skeleton loading: parch-colored shimmer bars on all data-fetching components
2. Empty states: every list has a friendly empty state with a CTA
3. Error boundary: Supabase connection failure → white card + retry button + support email
4. Footer disclaimer: every single route, every page
5. Mobile responsive: test every screen at 375px, 428px, 768px
6. Smooth page transitions: opacity 0→1, 200ms ease on route change
7. 404 page: factory illustration + "This page got lost on the factory floor." + [Go home] amber button
8. Toast notifications: fixed bottom-right, navy bg, white text, 3s auto-dismiss
```

---

### PROMPT 13 — DPC physicians + disclaimer pages + IS/IS NOT

```
Complete the physician system and all disclaimer infrastructure.

REGIMEN BUILDER additions (extend Prompt 4):
When edge function includes a physician (is_physician: true in JSON):
  Card gets sky left border 3px instead of standard border
  "Medical anchor" label in sky color (not standard evidence badge)
  If can_write_lmn: amber LMN callout below why-text:
    "This physician can write a Letter of Medical Necessity, which may
    unlock HSA/FSA reimbursement for your massage, PT, and other plan items."
  Physician unlock price: $3 (hardcode)

DISCOVER additions:
"Can write LMN" filter chip → filters providers where can_write_lmn = true.
Physician cards: sky left border 3px, sky "👨‍⚕️ Licensed Physician" badge.

RURAL MEMBER EXPERIENCE:
Check member.is_rural on login.
If true, show sage banner on /dashboard and /plan/build:
  "📍 Rural member — we prioritize providers who serve your area,
  including telehealth options when local care isn't available."
In /discover: weight results toward serves_rural=true and telehealth providers.

/disclaimer PAGE (full dedicated page):
Navy header with amber heading "Medical Disclaimer & Important Notices"
Subheading: "We believe transparency builds trust."

Emergency box (rose-p bg, rose left border 4px, 8px radius, at top):
"🚨 Medical Emergency: Stop and call 911 immediately if you are experiencing
a medical emergency. HealthPlanFactory cannot assist with emergencies.
🧠 Mental Health Crisis: Call or text 988 (Suicide & Crisis Lifeline) or
text HOME to 741741 (Crisis Text Line). Free and available 24/7."

8 disclaimer blocks in 2-column grid:
  Not a Medical Provider · Not Medical Advice · Not a Diagnostic Tool ·
  Consult Your Physician · Provider Relationships · HSA/FSA Eligibility ·
  AI-Generated Plans · Mental Health
Each block: amber uppercase label + Outfit 300 paragraph body.

Final block (full width): limitation of liability + accuracy of information.
Date updated + © Zanetis Holdings LLC + legal links.

STICKY DISCLAIMER BAR (global, dismissible):
Fixed bottom, z-index 200, navy rgba(27,45,79,0.97) bg, amber top border 2px.
Text: "HealthPlanFactory is not a medical provider. Not medical advice.
Emergency: 911. Mental health crisis: 988." + "Full disclaimer ↑" amber link.
[Dismiss ✕] small button right. On dismiss: localStorage flag, never shows again.

PHYSICIAN SUPABASE COLUMNS (run if not already added from Prompt 3):
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS provider_category text DEFAULT 'wellness';
(All other physician columns should exist from Prompt 3's physician flow.)
```

---

### PROMPT 14 — Employer B2B + provider share links + full integration test

```
Build employer features, share links, and run the complete integration pass.

/employer/signup:
Company name + size + HR contact name + email + password.
Seat count selector (min 10, step of 5).
"30-day free trial — 25 seats included."
[100+ seats? Contact sales →] link → mailto.
Save to Supabase: create employer account type.

/employer/dashboard:
Requires employer auth. Stats: Active members / Sessions booked / Avg wellness score / Cost per seat.
Anonymous team wellness chart (no individual data — privacy first).
Seat management: add members via email invite, remove members.
"Custom provider network": flag preferred local providers for your team.
[Export team wellness report PDF] amber button.
Employer disclaimer: "Individual member data is never shared with employers."

PROVIDER SHARE LINKS:
Every provider gets: healthplanfactory.com/p/[username]
This is their public-facing profile (same as /provider/:id but at custom URL).
Shows: full profile, reviews, availability, [Book now] button.
"Powered by HealthPlanFactory" sage badge at bottom (tasteful, not intrusive).
Providers can use this as their booking page / Linktree replacement.

REFERRAL SYSTEM:
Members: ref code in account settings. Share link: healthplanfactory.com/join/[code].
Both referrer and referee get $5 booking credit on referee's first booking.
Providers: refer a colleague → $50 credit after their first booking completion.
Track in referrals table. Show credits in /settings.

FINAL INTEGRATION TEST — verify every critical flow:
1. Member signup → /plan/build → plan renders → click unlock → modal → payment → providers reveal ✓
2. Provider signup → founding screen → /provider/dashboard ✓
3. /discover → filter → view profile → /book/:id → confirmation → booking in Supabase ✓
4. /dashboard → sidebar nav → all routes load ✓
5. /ai-coach → proactive opening message loads → member types → AI responds with context ✓
6. /accountability → all 4 levels switch → buddy chat works → challenges joinable ✓
7. Trial expires → /trial-expired page → upgrade flow → Stripe test payment ✓
8. Emergency keyword typed → overlay appears → cannot dismiss by clicking outside ✓
9. HSA/FSA log populates from completed eligible bookings ✓
10. Physician inquiry form submits to Supabase ✓
11. Rural banner shows for rural members ✓
12. Disclaimer footer on every page ✓
13. 375px mobile: all screens usable ✓
14. Founding provider: commission_rate 0.00 in booking receipt ✓
15. Provider share link /p/[username] resolves and shows public profile ✓

SEED DATA (insert before any member testing):
Add to Supabase providers table — 6 providers in North Jersey area:
1. Jane Smith, LMT — massage_therapist, Hoboken NJ, $70–90/session, HSA eligible
2. Sunrise Yoga Studio — yoga_instructor, Hoboken NJ, $15/class, 6 instructors
3. Dr. Michael Torres, DC — chiropractor, Jersey City NJ, $65–85/session, HSA
4. Amanda Lee, RDN — dietitian, Hoboken NJ, $85/session, HSA, first session free
5. Maria Santos, LAc — acupuncturist, Jersey City NJ, $75/session, HSA eligible
6. Dr. Rebecca Santos, MD — dpc_physician, Hoboken NJ, $75/month, can_write_lmn=true,
   provider_category=physician, physician_type=dpc, accepts_new_patients=true
All marked is_founding_provider=true, commission_rate=0.00.
Give each realistic bios, lat/lng for Hoboken/JC area, availability slots.
```

---

## NOTES FOR LOVABLE SESSIONS

**The 4 most important prompts — do these before anything else:**
Design Token → Prompt 1 → Prompt 4 → Prompt 9
These define the entire product experience. If these four work, everything else is layered on top.

**Credit efficiency:**
- Use Lovable chat mode (free) to diagnose errors before burning credits
- Batch all related changes into one prompt — never split tiny fixes
- If Lovable misses a detail: describe the specific fix in chat first, then send a short targeted prompt
- Export to GitHub after every session (Settings → Export → GitHub)

**If a component looks wrong:**
- Describe the exact mismatch in chat mode
- Reference the design token colors/fonts by CSS variable name
- Ask Lovable to show you the specific component code before editing

**API keys reminder:**
- Anthropic key: Supabase edge function env only. Never in Lovable frontend.
- Stripe secret key: Supabase edge function env only. Never in Lovable frontend.
- Stripe publishable key: safe in Lovable frontend for Stripe Elements.
- Google Maps key: safe in Lovable frontend (restrict by domain in console).

**Before going live with real payments:**
- Test with Stripe test card 4242 4242 4242 4242
- Confirm RLS policies with two separate test accounts
- Have one developer review booking + payment flow specifically
- Attorney review /disclaimer, /privacy, /terms before live payments

