export interface BlogPost {
  slug: string;
  title: string;
  category: string;
  publishDate: string;
  excerpt: string;
  readingTimeMin: number;
  coverEmoji: string;
  body: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "hsa-fsa-eligibility-guide",
    title: "The Complete Guide to HSA & FSA Eligibility for Wellness Services",
    category: "HSA / FSA",
    publishDate: "2025-03-10",
    excerpt:
      "Massage therapy, acupuncture, nutrition counseling — many wellness services you already use may qualify for tax-advantaged HSA or FSA dollars. Here's what you need to know before your next appointment.",
    readingTimeMin: 7,
    coverEmoji: "💳",
    body: `
## What Are HSA and FSA Accounts?

A **Health Savings Account (HSA)** and a **Flexible Spending Account (FSA)** are tax-advantaged accounts that let you pay for qualified medical and wellness expenses with pre-tax dollars. That means every dollar you spend through these accounts is effectively discounted by your marginal tax rate — often 22–32% for many Americans.

The key difference: HSAs are tied to high-deductible health plans and roll over indefinitely, while FSAs are employer-sponsored and typically have a "use it or lose it" rule (with some exceptions for a grace period or $610 rollover in 2024).

## Which Wellness Services Qualify?

Eligibility is determined by the IRS and your specific plan administrator. That said, many common wellness services **do** qualify when deemed medically necessary or prescribed by a qualified provider:

- **Massage therapy** — qualifies when prescribed by a physician for a specific medical condition (e.g., chronic back pain, injury recovery)
- **Acupuncture** — generally HSA/FSA eligible when treating a diagnosed condition
- **Chiropractic care** — eligible for treatment of musculoskeletal conditions
- **Physical therapy** — typically fully eligible
- **Mental health counseling** — eligible, including telehealth sessions
- **Nutrition counseling** — eligible when prescribed for a specific condition (obesity, diabetes, etc.)
- **Prescription eyewear / contacts** — eligible
- **Smoking cessation programs** — eligible

Services like gym memberships, yoga classes, and general wellness apps are **not** eligible unless a physician writes a specific Letter of Medical Necessity (LMN).

## The Letter of Medical Necessity (LMN)

An LMN is a written prescription from a qualified healthcare provider (MD, DO, or NP) that establishes a clinical need for a specific service. A well-written LMN can unlock HSA/FSA reimbursement for:

- Personal training (for obesity, diabetes, cardiac conditions)
- Yoga or Pilates (for diagnosed anxiety, chronic pain, or spinal conditions)
- Meditation apps (for anxiety or insomnia diagnosed by a provider)
- Massage therapy (for fibromyalgia, injury recovery, etc.)

**Pro tip:** Direct Primary Care (DPC) physicians are often more willing to write LMNs for integrative wellness services because they aren't constrained by insurance billing codes. Many DPC practices offer LMN consultations for a flat fee.

## How to Submit for Reimbursement

1. **Pay out-of-pocket** for the service and get an itemized receipt showing the date, provider name, service rendered, and cost.
2. **Keep the LMN** if applicable — your plan administrator may request it during auditing.
3. **Submit through your HSA/FSA portal** — most custodians (Fidelity, HealthEquity, WEX) have mobile apps and online portals for easy submission.
4. **Funds are reimbursed** directly to your bank account, usually within 3–5 business days.

## HealthPlanFactory and HSA/FSA

Every modality in your HealthPlanFactory plan includes an HSA/FSA eligibility flag. When you build your plan, eligible services are clearly marked so you can prioritize them for reimbursement. Our LMN guide helps you understand how to approach your physician for documentation.

The bottom line: if you're not using tax-advantaged dollars for wellness, you're leaving money on the table. A $200/month wellness budget can stretch to the equivalent of $270+ in purchasing power with HSA/FSA — without spending a dollar more.
`,
  },
  {
    slug: "holistic-modalities-evidence-overview",
    title: "From Acupuncture to Yoga: What the Evidence Actually Says",
    category: "Wellness Science",
    publishDate: "2025-03-24",
    excerpt:
      "With hundreds of alternative and complementary health modalities available, it's hard to know what's backed by science and what's hype. We break down the evidence for the most popular modalities on our platform.",
    readingTimeMin: 9,
    coverEmoji: "🔬",
    body: `
## Why Evidence Matters in Wellness

The wellness industry is a $1.8 trillion market, and not all of it is created equal. At HealthPlanFactory, every modality in our library is scored on an evidence tier that reflects the quality and breadth of research supporting it. Here's a plain-English breakdown of the most popular modalities and what science actually says.

## Massage Therapy — Evidence Tier: Strong

Massage therapy has the most robust body of research among complementary modalities. Systematic reviews consistently show:

- **Reduced musculoskeletal pain** (back pain, neck pain, shoulder pain)
- **Lower anxiety and cortisol levels** after sessions
- **Improved sleep quality** in patients with insomnia
- **Reduced DOMS (delayed onset muscle soreness)** post-exercise

The evidence is strongest for chronic low-back pain, where massage often matches or outperforms physical therapy for patient-reported outcomes. Insurance coverage is expanding, and HSA/FSA reimbursement with a physician's note is widely available.

## Acupuncture — Evidence Tier: Moderate-Strong

Acupuncture has moved from fringe to mainstream in many hospital systems. The evidence base includes:

- Strong evidence for **chronic pain** (back, neck, knee, headache)
- Moderate evidence for **chemotherapy-induced nausea**
- Emerging evidence for **anxiety and depression** (as adjunct therapy)
- Mixed evidence for fertility and other systemic conditions

The mechanism debate (meridians vs. neurological stimulation) remains unresolved, but clinical outcomes in well-designed RCTs are real and meaningful. Many major insurance plans now cover acupuncture for chronic pain.

## Yoga and Mind-Body Practices — Evidence Tier: Moderate

Yoga has a surprisingly large and growing evidence base:

- **Anxiety reduction**: Multiple meta-analyses show significant reductions in GAD-7 scores
- **Chronic pain**: Yoga outperforms usual care for chronic back pain in several high-quality trials
- **Cardiovascular health**: Regular yoga practice is associated with lower blood pressure and improved lipid profiles
- **Sleep improvement**: Particularly for older adults and cancer survivors

The caveat: study quality varies widely, and effect sizes are generally modest. Yoga works best as part of a comprehensive wellness plan rather than a standalone intervention.

## Nutrition Counseling — Evidence Tier: Strong

Registered Dietitians (RDs) and Certified Nutrition Specialists (CNS) offer evidence-based counseling that rivals pharmaceutical interventions for certain conditions:

- **Type 2 diabetes management**: Medical nutrition therapy reduces HbA1c by 1–2 points
- **Cardiovascular disease**: Mediterranean diet counseling reduces major cardiac events
- **IBS and digestive disorders**: Low-FODMAP diet guidance has strong RCT support
- **Weight management**: Behavioral nutrition coaching produces durable results when combined with exercise

This is one of the most underutilized modalities in the U.S. healthcare system, partly because insurance reimbursement is inconsistent outside of specific diagnoses.

## Cold Water Therapy — Evidence Tier: Emerging

Ice baths, cold plunges, and contrast therapy are having a cultural moment — but what does science say?

- **Post-exercise recovery**: Moderate evidence for reducing muscle soreness and inflammation markers
- **Mood and mental health**: Preliminary evidence for endorphin release and reduced depression symptoms
- **Metabolic effects**: Brown fat activation is real, but metabolic impact at typical exposure durations is modest

The honest take: cold therapy is probably beneficial for active recovery and mental resilience, but the extreme claims circulating on social media are ahead of the evidence.

## Chiropractic Care — Evidence Tier: Moderate

Chiropractic is best supported for:

- **Acute low-back pain**: On par with standard medical care in RCTs
- **Neck pain**: Good evidence for short-term relief
- **Headache**: Moderate evidence for tension-type headaches

The key is finding practitioners who focus on musculoskeletal conditions rather than broader systemic claims. Spinal manipulation is a legitimate, evidence-based intervention for mechanical pain — claims extending beyond that require more skepticism.

## The HealthPlanFactory Evidence Tier System

When we score modalities for your plan, we use a four-tier system:

1. **Strong** — Consistent evidence from multiple high-quality RCTs and systematic reviews
2. **Moderate** — Good evidence with some inconsistency or limited trial quality
3. **Emerging** — Promising early evidence, but more research needed
4. **Practitioner-Reported** — Limited formal research; primarily clinical consensus

Your plan prioritizes modalities with higher evidence tiers for your specific goals and conditions, while still surfacing emerging options you can explore with lower financial commitment.
`,
  },
  {
    slug: "building-your-first-wellness-plan",
    title: "How to Build a Wellness Plan That Actually Fits Your Life (and Budget)",
    category: "Getting Started",
    publishDate: "2025-04-01",
    excerpt:
      "A wellness plan isn't a luxury item — it's a budget framework for investing in your health before you need expensive reactive care. Here's how to build one that sticks.",
    readingTimeMin: 6,
    coverEmoji: "🗺️",
    body: `
## The Problem with Most Wellness Advice

Most wellness content falls into two traps: it's either aspirational lifestyle content that assumes unlimited time and money, or it's overly medicalized advice that ignores the practical realities of daily life. Neither is useful for someone trying to actually improve their health with $150/month to spend.

A real wellness plan starts with your actual budget, not an ideal one.

## Step 1: Set a Realistic Monthly Budget

Before you research modalities or providers, define your number. Ask yourself:

- What am I already spending on wellness-adjacent things (gym membership, supplements, streaming fitness apps)?
- What could I redirect from other spending (eating out less, etc.)?
- What's a number that feels sustainable for 12 months — not just 30 days?

Most people find a range of **$100–$300/month** is genuinely achievable with mindful budgeting. You don't need $800/month to get meaningful health improvements.

## Step 2: Identify Your Primary Health Goals

Rather than trying to optimize everything at once, pick **2–3 primary goals**:

- **Physical**: fitness, weight management, chronic pain reduction, injury recovery
- **Mental**: stress reduction, anxiety management, better sleep, mood improvement
- **Preventive**: metabolic health, cardiovascular health, immune support
- **Specific condition**: managing a chronic diagnosis with complementary care

Goals determine which modalities should be prioritized. Someone with chronic back pain has a different optimal plan than someone primarily seeking stress relief.

## Step 3: Map Modalities to Your Goals

Once you have goals, research which modalities have the strongest evidence for those specific outcomes. (Our modalities library does this for you, but the principle applies universally.)

For example, a plan targeting **stress + sleep** might prioritize:
- Yoga or meditation (cortisol reduction, sleep quality)
- Massage therapy (parasympathetic activation)
- Nutrition coaching (gut-brain axis support)

A plan targeting **chronic pain** might prioritize:
- Physical therapy (direct mechanical intervention)
- Acupuncture (neuromodulation for pain)
- Chiropractic (spinal manipulation for mechanical causes)

## Step 4: Allocate Budget Across Modalities

A simple framework: spend **60–70%** of your budget on your highest-evidence, highest-priority modality, and distribute the rest across complementary options.

Example ($200/month budget):
- Massage therapy (2×/month): $120 (60%)
- Yoga classes (8×/month at a budget studio): $48 (24%)
- Supplement protocol: $32 (16%)

This gives you primary, secondary, and tertiary investment tiers — so if budget tightens, you know exactly what to cut first without losing the most impactful intervention.

## Step 5: Build in Flexibility

Life happens. The best wellness plan accounts for variability:

- Build in one "skip month" buffer per modality per quarter — don't treat missed sessions as plan failures
- Have a $0 version of each modality you can default to (YouTube yoga, foam rolling, walking)
- Review and update your plan every 90 days based on what's working

## Step 6: Track Progress Simply

You don't need an elaborate system. A simple weekly check-in (1–10 scale on energy, pain, mood, sleep) gives you enough data to know if your plan is working. After 90 days with consistent logging, patterns become clear.

## Where HealthPlanFactory Fits In

Our platform automates steps 2–5 based on your intake responses. You enter your budget, goals, and conditions — we score every modality against your inputs and allocate your budget optimally, like a financial planner for wellness spending.

The plan is free. You only pay when you're ready to connect with a specific provider. That way you can see the full picture before committing to anything.

Start with your budget. Everything else follows.
`,
  },
  {
    slug: "direct-primary-care-explained",
    title: "Direct Primary Care: The Membership Model Changing How Americans Pay for Healthcare",
    category: "Healthcare Models",
    publishDate: "2025-04-14",
    excerpt:
      "DPC physicians charge a flat monthly membership fee — no insurance billing, no surprise bills, and often dramatically lower costs. Here's how the model works and whether it makes sense for you.",
    readingTimeMin: 8,
    coverEmoji: "🏥",
    body: `
## What Is Direct Primary Care?

Direct Primary Care (DPC) is a healthcare practice model where physicians charge patients a flat monthly membership fee — typically $50–$150/month for adults — in exchange for unlimited primary care services. No insurance billing. No co-pays per visit. No surprise statements.

The model strips out the administrative overhead of insurance processing (which consumes 30–40% of traditional practice revenue) and allows physicians to see fewer patients with more time per visit. The typical DPC physician has 300–600 patients. The typical insurance-based physician has 2,000–3,000.

## What Does the Membership Include?

DPC membership typically covers:

- **Unlimited office visits** (same-day and next-day appointments are the norm)
- **Telehealth consultations** (text, call, or video with your physician directly)
- **Comprehensive preventive care** (physicals, screenings, lab interpretation)
- **Chronic condition management** (diabetes, hypertension, thyroid disorders, etc.)
- **Minor in-office procedures** (wound care, skin biopsies, joint injections) — often at cost
- **Extended visit times** (30–60 minutes, not 7-minute factory visits)
- **Direct physician access** via cell phone or messaging app

What's **not** typically included: specialty referrals, hospital care, imaging, and labs — though many DPC practices negotiate dramatically reduced rates for these through wholesale pricing.

## The Cost Math

Let's run the numbers for a relatively healthy adult:

**Traditional model (with insurance):**
- Premium: $350/month (individual ACA bronze plan)
- Deductible: $6,000/year before insurance kicks in
- 4 primary care visits/year: ~$200 in co-pays
- Annual cost before hitting deductible: ~$4,400

**DPC + Catastrophic insurance:**
- DPC membership: $80/month
- Catastrophic insurance (for hospitalizations/major events): $120/month
- All primary care included in membership
- Annual cost: ~$2,400

For the relatively healthy person who uses primary care regularly but rarely needs hospitalization, the savings are substantial. DPC is not a replacement for insurance — it's a complement to it, often paired with a high-deductible plan or catastrophic coverage.

## Letters of Medical Necessity

One underutilized benefit of DPC relationships: LMN access. Because DPC physicians have direct relationships with patients and aren't constrained by insurance billing requirements, they're often more willing to:

- Write Letters of Medical Necessity for wellness services (massage, yoga, personal training)
- Document conditions that support HSA/FSA reimbursement
- Provide detailed documentation for health insurance appeals

A single LMN that unlocks 12 months of HSA-eligible massage therapy could be worth $1,000+ in tax savings — often more than the cost of a DPC membership itself.

## Is DPC Right for You?

DPC tends to work best for:

- **Healthy individuals with chronic conditions** who need frequent monitoring and management
- **Self-employed individuals** who control their own insurance decisions
- **Small business owners** who want an affordable primary care benefit for employees
- **People dissatisfied with the 7-minute visit model** who want more physician attention

It may be less ideal for:

- People with complex, multi-specialty conditions who primarily need specialist care
- Those with existing employer insurance with low co-pays for primary care
- People in rural areas with limited DPC availability (though telehealth DPC is expanding)

## Finding a DPC Physician

The DPC Alliance and Atlas MD maintain directories of DPC practices across the U.S. When evaluating a practice, ask:

1. What is included in the monthly membership? What isn't?
2. What are the lab and imaging wholesale rates you've negotiated?
3. Can I contact you directly between visits? What's your typical response time?
4. What insurance do you recommend pairing with your membership?

HealthPlanFactory's physician provider category includes DPC practices in our directory, tagged and filterable by specialty, location, and telehealth availability.
`,
  },
  {
    slug: "sleep-wellness-modalities",
    title: "The Wellness Modalities That Actually Improve Sleep Quality",
    category: "Sleep Health",
    publishDate: "2025-04-28",
    excerpt:
      "Poor sleep is the silent driver behind dozens of chronic conditions. The right combination of wellness modalities can meaningfully improve sleep quality — without pharmaceutical side effects.",
    readingTimeMin: 7,
    coverEmoji: "🌙",
    body: `
## Why Sleep Is the Foundation

You can optimize every other health variable — diet, exercise, stress management — and still make minimal progress if your sleep is poor. Sleep is the recovery interval during which every other wellness intervention consolidates its gains. Chronic sleep deprivation is associated with:

- **Metabolic disruption**: Insulin resistance, weight gain, increased appetite (especially for high-carb foods)
- **Immune suppression**: Reduced NK cell activity and antibody response
- **Cognitive impairment**: Processing speed, working memory, and emotional regulation all degrade predictably with < 7 hours
- **Cardiovascular risk**: Chronic short sleep is an independent risk factor for hypertension and cardiac events
- **Mental health**: Bidirectional relationship with anxiety and depression — poor sleep worsens both, and both worsen sleep

The CDC estimates that 35% of U.S. adults regularly get less than 7 hours of sleep. This is a population-level health crisis with well-understood but underutilized solutions.

## Modality 1: Massage Therapy

Multiple RCTs demonstrate that massage therapy significantly improves objective sleep metrics — not just self-reported quality. The mechanism involves:

- Activation of the parasympathetic nervous system (rest-and-digest mode)
- Reduction in cortisol and increase in serotonin and dopamine
- Relief of musculoskeletal tension that can prevent comfortable sleep positioning

**Evidence level**: Strong for insomnia, moderate-strong for general sleep quality improvement. Particularly effective for older adults, cancer patients, and individuals with chronic pain.

**Practical approach**: 60-minute sessions 1–2× per month, timed for the late afternoon or early evening rather than immediately before bed (the post-massage alertness window varies by individual).

## Modality 2: Yoga and Mindfulness-Based Practices

Yoga Nidra (yogic sleep) and restorative yoga specifically target the sleep system through systematic nervous system downregulation. The evidence:

- A 2019 meta-analysis (14 RCTs, 1,832 participants) found yoga significantly improved sleep quality, sleep efficiency, sleep duration, and daytime dysfunction
- Yoga Nidra specifically induces theta-wave brain activity similar to sleep onset, making it useful for training the arousal-to-sleep transition
- Mindfulness-Based Stress Reduction (MBSR) programs show significant improvements in sleep quality in patients with chronic insomnia

**Practical approach**: 20–30 minutes of restorative yoga or yoga nidra within 90 minutes of bedtime. Apps and YouTube channels can deliver this at $0 cost.

## Modality 3: Acupuncture

Acupuncture has a moderate-to-strong evidence base for insomnia:

- A 2019 systematic review of 30 RCTs found acupuncture significantly superior to medication for sleep quality improvement
- Effects appear to operate through modulation of GABA-A receptors and regulation of melatonin secretion
- Most effective for insomnia associated with anxiety, pain, or hormonal disruption

**Practical approach**: 6–8 weekly sessions initially, with monthly maintenance. Particularly effective when combined with sleep hygiene education from the acupuncturist.

## Modality 4: Nutrition Adjustments (With Coaching Support)

Several nutritional factors have strong evidence for sleep impact:

- **Magnesium glycinate**: 200–400mg before bed improves sleep onset and quality (strong evidence)
- **Tryptophan-rich foods** at dinner (turkey, eggs, dairy) support serotonin/melatonin synthesis
- **Caffeine timing**: Most people underestimate caffeine's half-life (~5–7 hours). A 2pm coffee can still meaningfully affect sleep at 11pm.
- **Alcohol**: Disrupts REM sleep architecture even at moderate doses — net negative for sleep quality despite helping with initial sleep onset

A nutrition coach can help you audit your current patterns and design an evening eating protocol that supports your sleep architecture.

## Modality 5: Light Therapy and Circadian Rhythm Training

Circadian rhythm disruption is an underappreciated driver of insomnia. Key interventions:

- **Morning bright light exposure** (10,000 lux for 20–30 minutes within an hour of waking) anchors your circadian clock and advances sleep timing
- **Evening light reduction** (blue-blocking glasses or dimmed warm lighting after 8pm) prevents melatonin suppression
- **Consistent wake time** is the single most powerful lever for circadian regularity — more so than bedtime

Light therapy devices are HSA/FSA eligible when documented for Seasonal Affective Disorder or circadian rhythm disorders.

## Building a Sleep-Optimized Wellness Plan

A practical $150/month sleep-focused plan might look like:

- **Massage therapy** (1×/month): $65
- **Yoga classes** (6×/month at a community studio): $48
- **Magnesium glycinate supplement** (90-day supply): $20
- **Sleep tracking app** (1-month subscription): $10
- **Remaining buffer for acupuncture** (every other month): $7 toward every-other-month session

The goal is layered reinforcement — each modality addresses a different mechanism of sleep disruption, and their effects compound over time.

HealthPlanFactory flags sleep improvement as a goal in your intake and prioritizes these modalities accordingly. If sleep is your primary concern, tell us — your plan will reflect it.
`,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function formatPublishDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
