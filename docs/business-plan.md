# Health Plan Factory — Business Plan

*Confidential · Draft as of April 2026*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem & Solution](#2-problem--solution)
3. [Product Overview](#3-product-overview)
4. [Business Model & Pricing](#4-business-model--pricing)
5. [Market Size](#5-market-size)
6. [Go-to-Market Strategy](#6-go-to-market-strategy)
7. [Competitive Analysis](#7-competitive-analysis)
8. [Traction & Milestones](#8-traction--milestones)
9. [Financial Projections (3-Year)](#9-financial-projections-3-year)
10. [Team & Founders](#10-team--founders)

---

## 1. Executive Summary

Health Plan Factory (HPF) is a wellness planning and provider-matching platform that turns a five-minute health intake into a personalized, budget-aware wellness plan — and then connects the member to vetted local providers ready to book. The platform operates as a three-sided marketplace: consumers, employers, and wellness providers each derive direct value, and each revenue stream reinforces the others.

**The core insight** is simple: 73% of American adults want a structured wellness plan but don't know where to start or what they can afford. Preventive wellness spending remains nearly zero for most households despite $2.4 trillion in annual US healthcare expenditure. At the same time, 68% of HSA/FSA holders don't realize that many wellness services — massage, acupuncture, nutrition counseling, physical therapy — qualify for tax-advantaged spending. Health Plan Factory closes all three of those gaps simultaneously.

**The product** is free to start. Members complete a short intake (budget, goals, conditions, preferences) and receive a prioritized, costed wellness plan built by a rule-based AI engine. They can browse matched providers for free; they pay only when they unlock a specific provider's contact information ($3–$8 per reveal). A Plus subscription ($9.99/month) unlocks unlimited reveals, an AI accountability coach, routine and journal tools, HSA/FSA spending logs, and progress tracking — all for less than a single massage session.

**The B2B channel** sells the same experience as an employer benefit at $6–$8 per employee per month, billed annually. Employers get a wellness dashboard with aggregate engagement data; employees get a fully personalized plan at no out-of-pocket cost. This channel provides predictable recurring revenue and drives large-batch provider supply.

**The provider channel** gives practitioners a free or low-cost listing in a high-intent directory — members view a provider profile only after building a plan that includes that modality, meaning every lead is pre-qualified. Early ("Founding") providers pay zero platform commission for their first 90 days; thereafter a 2% booking commission applies. Premium listing tiers ($29/month) are available for increased visibility.

Health Plan Factory is at the early-access stage, with the core consumer product fully built and live, employer demo infrastructure in place, and provider onboarding active. The company is raising its seed round to fund growth engineering, provider network expansion, and enterprise sales.

---

## 2. Problem & Solution

### The Problem

The US healthcare system excels at treating acute illness. It is poorly structured for preventing it. Three compounding failures make the status quo expensive and frustrating for the average consumer:

**1. No map for preventive wellness.**
Mainstream healthcare offers no guidance on where to spend a personal wellness budget. An individual who wants to address chronic back pain, stress, and low energy faces a fragmented landscape of gyms, chiropractors, nutritionists, therapists, and mobile apps — with no objective scoring system, no cost transparency, and no way to allocate a limited monthly budget across modalities. Most people default to nothing, or to whatever is most visible (usually the gym).

**2. Untapped HSA/FSA spending.**
Americans hold approximately $104 billion in HSA accounts. Yet 68% of account holders do not know that services such as massage therapy (with a Letter of Medical Necessity), acupuncture, physical therapy, nutrition counseling, and Direct Primary Care memberships can be HSA/FSA-eligible. Without a trusted guide, that money sits unspent or gets used on eligible but suboptimal purchases.

**3. Provider discovery is broken.**
Wellness providers — massage therapists, yoga instructors, licensed nutritionists, functional medicine practitioners — are largely invisible to motivated buyers. They rely on Google Maps, word of mouth, or expensive ad platforms to find new clients. There is no channel that delivers high-intent leads to practitioners whose specialty directly matches the buyer's stated health plan.

### The Solution

Health Plan Factory addresses all three problems with a single, integrated platform:

- **AI-assembled wellness plans** — Members complete a 5-minute health intake covering budget, goals, conditions, preferences, telehealth openness, and location. The plan engine scores every modality in the evidence library against the member's inputs, allocates the monthly budget across the highest-scoring modalities, estimates realistic session frequency and cost, and produces a prioritized plan with plain-language rationale for every recommendation. The plan is completely free to generate and view.

- **HSA/FSA integration built in** — Every modality in the plan is automatically flagged for HSA/FSA eligibility. Members are guided toward Letter of Medical Necessity (LMN) workflows where applicable (e.g., massage therapy prescribed by a Direct Primary Care physician). An HSA/FSA spending log (included in Plus) helps members track and maximize their tax-advantaged dollars.

- **High-intent provider matching** — The platform surfaces vetted local providers whose specialty matches modalities in the member's plan. A member browsing massage providers has already decided they want massage therapy — they built it into their plan. This is fundamentally different from passive directory browsing.

**Mission statement:** *To make personalized preventive wellness accessible to every American — regardless of income, medical literacy, or geography.*

---

## 3. Product Overview

### 3.1 Consumer Application (Web & Mobile)

The consumer product is available as a web application and a companion mobile app. The user journey follows four stages:

**Stage 1 — Health Intake (5 minutes)**
Members answer seven short screens: monthly wellness budget, health goals (fitness, stress relief, sleep, chronic pain, nutrition, preventive, and more), current conditions (back pain, anxiety, sedentary lifestyle, etc.), preferences (in-person vs. virtual, solo vs. group, low vs. high accountability), exclusions (modalities to avoid), location, and a final review. All inputs are privacy-first; no medical records are collected.

**Stage 2 — AI Plan Assembly**
The plan engine scores every modality in the evidence library using a multi-factor algorithm:
- *Goal match* — each goal match contributes points
- *Condition match* — clinical condition alignment contributes higher weight
- *Preference alignment* — matches to in-person, virtual, group, accountability preferences
- *Evidence level* — modalities with "Strong" evidence earn bonus points
- *HSA/FSA eligibility* — budget-constrained members receive a bonus for eligible modalities
- *Named scenario rules* — specific patterns (stress + anxiety → mind-body; back pain → structural care; low budget → highest value-per-dollar) apply targeted score boosts
- *Exclusion hard-blocks* — user-excluded modalities are removed entirely

The engine then allocates the monthly budget in descending score order, up to six included modalities and four "next cycle" (deprioritized) modalities. Each plan item shows estimated frequency, estimated monthly cost, and a plain-language rationale.

**Stage 3 — Provider Discovery**
Members browse matched local providers for each modality. Provider cards display name, specialty, session rate, HSA/FSA acceptance, and rating. Contact information is blurred for Explorer (free) members; it is unlocked via à la carte payment or automatically revealed for Plus subscribers.

**Stage 4 — Unlock, Book & Track**
Members unlock provider contacts at tiered rates: app-based programs ($3), wellness providers ($5), physician/DPC providers ($8). Plus members pay $0 per reveal. Referral credits earned through the referral program can fully offset unlock fees. Members log sessions, build routines, use the AI accountability coach, and track a wellness score over time.

### 3.2 Modality Evidence Library

The platform currently supports twenty wellness modalities across six categories, each rated by evidence level (Strong, Moderate, or Emerging). Evidence levels are sourced directly from the platform's modality data:

| Modality | Category | Evidence Level | HSA/FSA Eligible |
|---|---|---|---|
| Massage Therapy | Manual | Strong | Yes |
| Yoga | Movement | Strong | No |
| Pilates | Movement | Strong | No |
| Physical Therapy | Medical | Strong | Yes |
| Personal Training | Movement | Strong | No |
| Registered Dietitian | Nutrition | Strong | Yes |
| Meditation / MBSR | Mind-body | Strong | No |
| Chiropractic | Manual | Moderate | Yes |
| Acupuncture | Manual | Moderate | Yes |
| Nutrition Coaching | Nutrition | Moderate | No |
| Telehealth Wellness | Telehealth | Moderate | Yes |
| Weight Loss Coaching | Nutrition | Moderate | No |
| Qigong | Mind-body | Moderate | No |
| Shiatsu Massage | Manual | Moderate | Yes |
| Tai Chi | Mind-body | Moderate | No |
| Breathwork | Mind-body | Moderate | No |
| Direct Primary Care | Medical | Emerging | Yes |
| Herbal Medicine | Nutrition | Emerging | No |
| Cold Therapy | Movement | Emerging | No |
| Infrared Sauna | Manual | Emerging | No |

Each modality carries rich metadata: goals served, conditions treated, HSA/FSA eligibility, typical session cost range, typical frequency, provider category, telehealth availability, and exclusion IDs (e.g., pregnancy-safe flags). The library is designed to expand as evidence accumulates for additional modalities.

### 3.3 Employer Dashboard

The B2B product extends the consumer experience to employer benefit programs. Each employee completes the standard health intake; the employer funds a monthly per-seat allowance. Features exclusive to the B2B tier include:

- **Employer wellness dashboard** — aggregate engagement data, team wellness score trends, and modality adoption rates, without individual privacy exposure
- **HSA/FSA guidance tools** — LMN documentation workflows and eligibility flags at the employee plan level
- **HRIS integrations** (Enterprise, roadmap) — Rippling, Gusto, and custom HRIS sync for automated seat provisioning
- **Slack/Teams digest** (Growth+, roadmap) — weekly team wellness digest without individual data
- **Monthly HR report** — participation metrics, top modalities, and budget utilization

### 3.4 Provider Marketplace

Providers apply to be listed and, upon approval, receive:

- A profile in the modality-matched provider directory
- Lead alerts when a member builds a plan that includes their modality
- A booking calendar integration with confirmation flow
- Founding Program: 0% platform commission for the first 90 days

Standard commission after the Founding period is 2% of bookings made through the platform. Premium listing ($29/month) elevates visibility within modality search results.

### 3.5 Mobile Application

The iOS/Android mobile app (built with React Native / Expo) mirrors the web experience with native optimizations: push notifications for AI accountability coach nudges, offline plan access, session logging, and a mobile-optimized intake flow.

---

## 4. Business Model & Pricing

Health Plan Factory operates a three-sided revenue model with distinct monetization layers per segment.

### 4.1 Consumer Tiers

| Tier | Price | Key Features |
|---|---|---|
| **Explorer** | Free forever | Full AI plan generation, modality library, provider browse (blurred), 1 free provider unlock included |
| **Plus** | $9.99/month · $79.99/year | Unlimited provider reveals, AI accountability coach, routine & journal builder, HSA/FSA spending log, progress tracking, 14-day free trial |

À la carte provider unlocks (Explorer members):

| Provider Type | Unlock Price |
|---|---|
| App-based program | $3.00 |
| Wellness provider | $5.00 |
| Physician / DPC | $8.00 |

Referral credits are earned by inviting new members. Credits never expire and can fully offset unlock fees or Plus subscription charges.

### 4.2 B2B Employer Tiers

| Tier | Price | Seats |
|---|---|---|
| **Starter** | $8/employee/month | 10–49 employees |
| **Growth** | $6/employee/month | 50–199 employees |
| **Enterprise** | Custom | 200+ employees |

Annual billing required. Minimum 10 seats. Enterprise includes HRIS integration, custom reporting, SLAs, and a dedicated Customer Success Manager.

### 4.3 Provider Revenue

| Revenue Stream | Rate |
|---|---|
| Standard listing | Free (with Founding period) |
| Platform booking commission | 2% of bookings (post-Founding) |
| Premium listing | $29/month |

### 4.4 Revenue Model Dynamics

The three revenue streams are mutually reinforcing:
- Consumer growth expands the provider lead funnel, making premium listings more valuable
- Provider density increases plan quality and provider match rates, improving consumer conversion and retention
- Employer accounts deliver large cohorts of active consumers and drive concentrated local provider demand

The unlock model creates a natural freemium conversion funnel: Explorer members regularly encounter high-quality provider matches that motivate Plus upgrades, particularly once they realize the math ($9.99/month vs. $5/unlock × 3+ unlocks per month).

---

## 5. Market Size

### 5.1 Total Addressable Market

Health Plan Factory operates at the intersection of two large and growing markets:

**US Preventive Wellness Market**
The US consumer wellness market is estimated at $480 billion annually, with the preventive/integrative segment growing at 7–9% per year. Key demand drivers include rising awareness of mental health, chronic disease prevention, and the post-pandemic prioritization of proactive health management. The platform's addressable slice — consumers who seek structured, budget-aware wellness guidance and local provider matching — numbers in the tens of millions.

**US Employer Wellness Benefits Market**
The employer wellness market was valued at approximately $61 billion in 2023 and is projected to reach $100 billion by 2030 (CAGR ~7%). Despite this spend, participation rates in generic wellness programs average just 5–15%. Health Plan Factory's personalization-first approach directly attacks this engagement gap. There are approximately 6 million US employers with 10+ employees, representing a deep B2B sales motion.

**HSA/FSA Ecosystem**
Approximately $104 billion sits in HSA accounts across the US, and roughly $180 billion in FSA funds are available for qualified medical expenses annually. A meaningful but underdetermined fraction of this total is eligible for wellness services that the HPF platform surfaces. As a channel that helps members understand and deploy these funds, HPF is positioned to capture platform revenue on a broader base of wellness spending.

### 5.2 Serviceable Addressable Market (SAM)

Narrowing to adults aged 25–55 who actively seek wellness guidance, have internet access, and live in markets with sufficient provider density, the SAM is estimated at 30–40 million US consumers and 200,000+ SMB and mid-market employers. The initial geographic focus is English-speaking US markets with high consumer wellness awareness.

### 5.3 Serviceable Obtainable Market (SOM)

With seed funding deployed into growth channels, the three-year SOM target is 250,000 active consumer members (Explorer + Plus), 200 employer accounts representing ~15,000 funded employee seats, and 5,000 listed providers.

---

## 6. Go-to-Market Strategy

Health Plan Factory's go-to-market strategy leverages organic content, referral mechanics, and a B2B direct sales motion to build a defensible, high-retention user base.

### 6.1 Consumer Acquisition

**SEO via the Evidence Library**
Each modality page doubles as a high-value SEO asset targeting queries such as "does massage therapy help with back pain?", "is acupuncture HSA eligible?", and "how much does nutrition coaching cost?". As the library expands to dozens of modalities and conditions, organic search becomes a durable, compounding acquisition channel with zero marginal cost per visit.

**Referral Program**
Members earn referral credits when they invite friends who sign up and generate plans. Credits can offset unlock fees and Plus subscriptions. This creates a viral loop anchored to the core product value: the more members unlock providers and find real wellness benefit, the more they share.

**Pre-Survey Funnel**
A lightweight pre-intake survey (budget, goals, primary concern) captures intent from organic and paid traffic before requiring account creation. Survey data personalizes the post-signup experience and increases activation rates by letting users see a tailored welcome message on the landing page before building their full plan.

**Content Marketing**
The HSA/FSA Savings Calculator (a dedicated tool on the platform) attracts users from tax and benefits forums who want to understand how to maximize their health accounts. This content is highly linkable and drives qualified traffic from a financial angle, not just a wellness angle.

**Paid Acquisition (post-seed)**
Targeted paid campaigns on Google Search (intent-driven) and Instagram/TikTok (aspirational wellness audiences) will be tested once organic benchmarks establish conversion baselines. Anticipated CAC target: under $15 for Explorer, under $30 for Plus.

### 6.2 B2B Acquisition

**Direct Outbound to HR/Benefits Teams**
A focused outbound motion targeting HR Directors and Benefits Managers at 50–500 employee companies in health-conscious industries (tech, professional services, fitness-adjacent sectors). The ROI narrative is strong: $1,700 average annual cost of preventable absenteeism per employee, 3.2× documented ROI on wellness programs (Harvard School of Public Health source cited in the platform), and a starting price of $8/employee/month — less than a gym membership.

**Inbound via Demo Form**
The ForEmployers page features a high-conversion demo request form. Inbound leads from organic content are routed to a 30-minute product demo and proposal flow.

**Benefits Broker Partnerships**
Partnerships with benefits brokers and HR consultancies give Health Plan Factory access to employer books of business at low marginal acquisition cost. Brokers are compensated on a revenue-share basis for accounts they refer.

**Employer Referral**
Satisfied HR contacts are a natural referral channel. A structured employer referral program with account credits for successful introductions will be activated in Year 1.

### 6.3 Provider Acquisition

**Direct Outreach to Practitioner Communities**
Targeted outreach to professional associations (AMTA for massage therapists, AND for dietitians, ACA for chiropractors, etc.) and local practitioner Facebook groups. The Founding Provider offer (0% commission for 90 days) is the primary hook — it removes all financial risk for early adopters.

**Network Effects**
Provider network quality directly improves plan quality. As provider density grows in a metro area, member plan completion rates rise, provider lead volumes increase, and the marketplace becomes more defensible against new entrants. This creates a winner-take-most dynamic at the local level.

**Inbound via Provider Signup Flow**
A dedicated provider signup and application flow (accessible from all provider-facing CTAs) captures inbound applicants. Applications are reviewed within 1–2 business days per the platform's published commitment.

---

## 7. Competitive Analysis

### 7.1 Competitive Landscape

Health Plan Factory competes across several adjacent categories, but no direct competitor combines all three of its defining capabilities: AI-personalized wellness planning, budget-aware modality allocation, and a high-intent provider marketplace with HSA/FSA integration.

**Generic Wellness Apps (Calm, Noom, Headspace, Hims/Hers)**
These platforms target a single modality (meditation, weight management, mental health, telehealth prescriptions). They are broad in awareness but narrow in scope. A member using Calm for meditation still has no guidance on whether to add nutrition coaching, physical therapy, or massage to their overall wellness routine. HPF's multi-modality plan engine fills this gap and can actually recommend app-based programs (including competitors) as modalities within a plan.

**Traditional Health Plans (BCBS, Aetna, UHC wellness add-ons)**
Employer health plan wellness riders are formulaic, difficult to navigate, and generate notoriously low engagement. They are designed for compliance, not genuine behavior change. Health Plan Factory is not a health insurance product; it is an optimization layer that helps members deploy their existing wellness budgets (including HSA/FSA dollars) more effectively.

**Gym Memberships / Corporate Fitness Benefits (ClassPass for Business, Gympass)**
These platforms aggregate fitness access but remain firmly in the physical fitness category. They do not address mental wellness, nutrition, manual therapy, functional medicine, or the full spectrum of modalities in the HPF library. Their revenue model requires high ongoing engagement to justify cost; HPF's provider unlock model aligns incentives differently — members pay for information, not gym swipes.

**Provider Directories (Zocdoc, Healthgrades, Psychology Today)**
These are reactive search tools. Members arrive with a specific provider type already in mind and search for listings. There is no planning layer, no budget optimization, no HSA/FSA guidance, and no algorithmic matching to health goals. HPF's provider directory is downstream of a plan-building experience that pre-qualifies intent.

**Other Wellness Planning Tools**
A handful of early-stage apps (some inside insurance portals) offer wellness assessments. None combines the evidence-based modality scoring, budget allocation engine, à la carte provider unlock model, and employer B2B layer that HPF provides.

### 7.2 Competitive Advantages

| Dimension | Health Plan Factory | Generic Wellness App | Traditional Wellness Benefit | Provider Directory |
|---|---|---|---|---|
| Multi-modality planning | ✓ | ✗ | Limited | ✗ |
| Budget-aware allocation | ✓ | ✗ | ✗ | ✗ |
| HSA/FSA integration | ✓ | Partial | Partial | ✗ |
| High-intent provider matching | ✓ | ✗ | ✗ | ✗ |
| Employer B2B dashboard | ✓ | ✗ | ✓ | ✗ |
| Freemium consumer entry | ✓ | Mixed | ✗ | ✓ |
| Mobile app | ✓ | ✓ | Mixed | Mixed |
| Evidence-based scoring | ✓ | Mixed | ✗ | ✗ |

### 7.3 Moat

Health Plan Factory's durable competitive advantages are:

1. **Data flywheel** — Plan generation data teaches the engine which modalities produce high retention and provider conversion in specific demographic and geographic segments. This data becomes proprietary and harder to replicate as volume scales.

2. **Local provider network density** — First-mover advantage in building vetted provider supply in each metro creates switching costs for both members (who value local access) and providers (who value the exclusive lead channel).

3. **HSA/FSA guidance expertise** — Integrating LMN workflows, spending logs, and eligibility flags into the product creates a compliance-adjacent layer that is technically and legally complex to replicate quickly.

4. **Employer relationships** — Once HPF is embedded in a company's benefits stack, switching costs are meaningful (HRIS integration, onboarding investment, employee familiarity).

---

## 8. Traction & Milestones

### 8.1 Product Milestones (Achieved)

- **Core consumer product live** — Full web application with health intake, AI plan engine, provider browse/unlock, referral program, and HSA/FSA spending log.
- **Mobile app live** — React Native / Expo mobile application with all core consumer features, push notifications, and session logging.
- **Employer infrastructure complete** — ForEmployers page, demo request form with backend submission routing, and employer-facing pricing tiers.
- **Provider signup and application flow live** — Provider onboarding with credential collection, Founding Provider program, and listing management.
- **Stripe payment integration architected** — Subscription checkout flow (Plus at $9.99/month, annual at $79.99/year) and à la carte provider unlock payments connected to Stripe, with referral credit application logic.
- **Evidence library built** — 20 evidence-rated modalities across six categories, each with full metadata (goals, conditions, HSA eligibility, cost range, typical frequency, telehealth support).
- **AI accountability coach** — Plus-tier AI coaching feature active in the product.
- **HSA/FSA Savings Calculator** — Standalone SEO-optimized tool for tax savings estimation.
- **Referral program** — Full credit issuance and redemption logic live.

### 8.2 Near-Term Milestones (Next 6 Months)

- Onboard first 50 Founding Providers across 3 metro markets
- Close first 5 employer pilot accounts (Starter/Growth tier)
- Reach 2,000 registered consumer members
- Launch referral-driven growth campaign targeting wellness enthusiast communities
- Publish first 10 modality SEO articles in the evidence library

### 8.3 12-Month Milestones

- 10,000 registered consumer members; 1,500+ active Plus subscribers
- 200+ listed providers across 5 metro markets
- 20 employer accounts (300–500 funded employee seats)
- Commission revenue active (post-Founding provider period)
- First enterprise employer pilot (200+ seat) signed

---

## 9. Financial Projections (3-Year)

*These projections are indicative and based on reasonable assumptions for a seed-stage SaaS/marketplace company. They should not be construed as guarantees.*

### 9.1 Key Assumptions

**Consumer:**
- Explorer-to-Plus conversion rate: 8% (Year 1) → 12% (Year 3), driven by improved activation and referral loops
- Monthly Plus churn: 5% (Year 1) → 3.5% (Year 3)
- Average à la carte unlock revenue per Explorer member: $4.50/month
- Annual plan ($79.99) adoption: 30% of Plus subscribers

**Employer B2B:**
- Average deal size: 35 seats (Starter), 90 seats (Growth)
- Annual contract value (ACV): ~$3,360 (Starter 35 seats × $8 × 12), ~$6,480 (Growth 90 seats × $6 × 12)
- Gross retention: 85% Year 1 → 90% Year 2/3

**Provider:**
- Standard listings free; commission revenue at 2% of estimated bookings processed through platform
- Premium listing ($29/month) adoption: 15% of listed providers

### 9.2 Year 1

| Metric | Target |
|---|---|
| Total registered members | 10,000 |
| Active Plus subscribers (month-end, Year 1) | 1,500 |
| Employer accounts | 20 |
| Funded employee seats | 800 |
| Listed providers | 250 |
| **Consumer MRR (Plus + unlocks)** | **~$18,000** |
| **B2B ARR** | **~$115,000** |
| **Provider revenue (commissions + premium)** | **~$8,000** |
| **Total ARR (run-rate, end of Year 1)** | **~$350,000** |

### 9.3 Year 2

| Metric | Target |
|---|---|
| Total registered members | 55,000 |
| Active Plus subscribers | 8,000 |
| Employer accounts | 80 |
| Funded employee seats | 4,500 |
| Listed providers | 1,200 |
| **Consumer ARR** | **~$1.1M** |
| **B2B ARR** | **~$500,000** |
| **Provider revenue** | **~$90,000** |
| **Total ARR** | **~$1.7M** |

### 9.4 Year 3

| Metric | Target |
|---|---|
| Total registered members | 250,000 |
| Active Plus subscribers | 32,000 |
| Employer accounts | 200 |
| Funded employee seats | 15,000 |
| Listed providers | 5,000 |
| **Consumer ARR** | **~$4.5M** |
| **B2B ARR** | **~$1.5M** |
| **Provider revenue** | **~$550,000** |
| **Total ARR** | **~$6.5M** |

### 9.5 Path to Gross Margin

Consumer Plus subscriptions and B2B per-seat fees are predominantly software gross margin (70–80%+ at scale). Provider unlock fees and commission revenue carry modest transaction costs. The highest cost items in Year 1–2 are growth (CAC) and provider network operations. By Year 3, the organic referral and SEO channels are expected to reduce blended CAC significantly, expanding contribution margin.

### 9.6 Use of Seed Funds

The seed round is intended to fund approximately 18 months of runway covering:

- **Engineering & product** (40%) — Growth feature development, mobile app maturation, employer dashboard, HRIS integrations, plan engine improvements
- **Go-to-market** (35%) — B2B sales hire, content/SEO program, provider network operations, early paid acquisition tests
- **Operations & infrastructure** (15%) — Legal, compliance infrastructure for HSA/FSA workflows, cloud infrastructure scaling
- **G&A** (10%) — Finance, HR, legal

---

## 10. Team & Founders

Health Plan Factory is built by a team with direct experience at the intersection of consumer health technology, marketplace businesses, and AI-driven personalization.

### Founding Vision

The founding team recognized a persistent failure in the wellness market: the same people who buy gym memberships in January and cancel by March are not unmotivated — they are under-guided. Nobody has helped them understand what their specific body needs, what it costs, and how to find the people who provide it locally. The plan factory metaphor is intentional: just as a factory takes raw inputs (a budget, a set of goals) and produces a precision output (a structured, costed plan), the platform does for wellness what financial planning software did for retirement savings — it takes something opaque, overwhelming, and personal, and makes it systematic and actionable.

### Team Background

The founding team brings expertise in:
- **Consumer product design** — deep experience building freemium consumer applications with complex intake and personalization flows
- **Marketplace dynamics** — prior experience building supply-demand platforms with network-effect moats
- **Health & wellness domain knowledge** — familiarity with HSA/FSA regulatory frameworks, wellness modality evidence bases, and the provider credentialing landscape
- **B2B SaaS** — experience selling software to HR and benefits buyers, structuring annual contracts, and managing enterprise customer success

*(Detailed founder bios, including prior company affiliations and relevant exits, are available upon request under NDA.)*

### Advisors

The company is building an advisory network spanning:
- **Clinical advisors** — licensed practitioners in key modalities (massage, nutrition, DPC) who validate the evidence library and modality scoring logic
- **Benefits advisor** — former HR/benefits executive with deep relationships in the mid-market employer segment
- **Growth advisor** — consumer health app veteran with experience scaling freemium user bases to seven figures

---

## Appendix: Key Metrics Definitions

| Metric | Definition |
|---|---|
| **Active Plus Subscriber** | A paying member on the $9.99/month or $79.99/year plan who has not churned |
| **Funded Employee Seat** | An employer-paid seat where the employee has completed the health intake and generated an active plan |
| **Listed Provider** | A provider who has completed the application process and has an active listing in the directory |
| **Plan Generation** | A member who has completed the full health intake and generated at least one wellness plan |
| **Provider Unlock** | A single à la carte purchase of a provider's contact information by an Explorer member |
| **ARR** | Annual Recurring Revenue: (active Plus subscribers × $119.88 blended annual value) + (employer seats × blended per-seat rate × 12) + annualized provider premium subscriptions |

---

## Appendix B: Source Notes

The following codebase files were used as primary sources for the product facts, pricing, and feature claims in this document. Readers performing investor diligence may verify claims directly against these files.

| Claim / Section | Source File |
|---|---|
| Free unlock count (Explorer: 1 included) | `artifacts/health-plan-factory/src/pages/Pricing.tsx` — `TIERS[0].features` |
| Plus pricing ($9.99/mo · $79.99/yr, 14-day trial) | `artifacts/health-plan-factory/src/pages/Pricing.tsx` — `TIERS[1]` |
| À la carte unlock prices ($3/$5/$8) | `artifacts/health-plan-factory/src/pages/Pricing.tsx` — unlock table |
| Provider commission (0% for 90 days, 2% after) | `artifacts/health-plan-factory/src/pages/Pricing.tsx` — `TIERS[2].features` |
| Employer tiers (Starter $8, Growth $6, Enterprise custom) | `artifacts/health-plan-factory/src/pages/ForEmployers.tsx` — pricing grid |
| Employer minimum seats (10), annual billing | `artifacts/health-plan-factory/src/pages/ForEmployers.tsx` — pricing footnote |
| Premium provider listing ($29/mo) | `artifacts/health-plan-factory/src/pages/ForProviders.tsx` — CTA button |
| Modality library (20 modalities, evidence levels, HSA flags) | `artifacts/health-plan-factory/src/data/modalities.ts` — `MODALITIES` array |
| Plan engine scoring logic | `artifacts/health-plan-factory/src/lib/planEngine.ts` — `scoreModality()` |
| Plan engine budget allocation (up to 6 included, 4 deprioritized) | `artifacts/health-plan-factory/src/lib/planEngine.ts` — `generatePlan()` |
| Intake flow stages (7 screens) | `artifacts/health-plan-factory/src/pages/HowItWorks.tsx` — `STAGES[0]` bullets |
| Employer dashboard features | `artifacts/health-plan-factory/src/pages/ForEmployers.tsx` — value props section |
| ROI stats (absenteeism $1,700, 3.2× ROI, 67% retention influence) | `artifacts/health-plan-factory/src/pages/ForEmployers.tsx` — stat card |
| Landing page stats (73%, $2.4T, 68% HSA/FSA) | `artifacts/health-plan-factory/src/pages/Landing.tsx` — `STATS` array |
| Referral credit system | `artifacts/health-plan-factory/src/pages/Pricing.tsx` — checkout modal and credit display |

**Notes on roadmap vs. implemented features:**
- HRIS integrations (Rippling, Gusto) and Slack/Teams digest are listed in the employer pricing page as Growth/Enterprise features but do not have confirmed backend implementations in the reviewed codebase. These are treated as roadmap items in Section 3.3.
- Mobile app is live as a React Native / Expo application (`artifacts/health-plan-mobile/`) with core consumer features.
- Stripe checkout is architected (`/api/subscriptions/checkout`) but requires `STRIPE_SECRET_KEY` configuration for live payments; this is consistent with early-access/pre-revenue stage.

---

*This document contains forward-looking statements and projections that involve significant risk and uncertainty. Actual results may differ materially from those expressed or implied. This document is intended for informational purposes only and does not constitute an offer to sell or a solicitation to buy any securities.*

*Health Plan Factory is a wellness optimization platform and is not a medical provider, diagnostic tool, or substitute for licensed healthcare advice.*
