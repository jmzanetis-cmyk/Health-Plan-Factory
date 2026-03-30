/**
 * Seed script: inserts demo modalities, providers, and admin settings.
 * Run with: pnpm --filter @workspace/scripts seed
 */
import {
  db,
  pool,
  modalities,
  providers,
  providerModalities,
  adminSettings,
  profiles,
  memberIntakes,
  plans,
  planItems,
} from "@workspace/db";

// ── Modalities ────────────────────────────────────────────────────────────────

const MODALITY_SEED = [
  {
    id: "massage",
    name: "Massage Therapy",
    emoji: "🫁",
    category: "manual" as const,
    evidenceLevel: "Strong" as const,
    costLow: 60,
    costHigh: 130,
    typicalFrequency: "2×/month",
    hsaEligible: true,
    description: "Licensed therapeutic massage targeting musculoskeletal pain, recovery, and stress relief.",
    goals: ["pain-relief", "stress-reduction", "recovery", "mobility"],
    conditions: ["back-pain", "neck-pain", "stress", "anxiety", "fibromyalgia"],
    preferenceMatch: ["in-person", "clinically-guided"],
    exclusionIds: [],
  },
  {
    id: "physical-therapy",
    name: "Physical Therapy",
    emoji: "🏃",
    category: "manual" as const,
    evidenceLevel: "Strong" as const,
    costLow: 80,
    costHigh: 200,
    typicalFrequency: "2×/week",
    hsaEligible: true,
    description: "Evidence-based rehabilitative care from licensed PTs for injury, pain, and functional movement.",
    goals: ["pain-relief", "mobility", "posture", "injury-prevention", "recovery"],
    conditions: ["back-pain", "neck-pain", "sciatica", "knee-pain", "post-surgery"],
    preferenceMatch: ["in-person", "clinically-guided", "high-accountability"],
    exclusionIds: [],
  },
  {
    id: "acupuncture",
    name: "Acupuncture",
    emoji: "🪡",
    category: "manual" as const,
    evidenceLevel: "Moderate" as const,
    costLow: 70,
    costHigh: 150,
    typicalFrequency: "1×/week",
    hsaEligible: true,
    description: "Traditional Chinese medicine technique using fine needles to restore balance and reduce pain.",
    goals: ["pain-relief", "stress-reduction", "sleep", "fertility", "energy"],
    conditions: ["back-pain", "neck-pain", "migraines", "anxiety", "insomnia", "chronic-pain"],
    preferenceMatch: ["in-person", "clinically-guided", "holistic"],
    exclusionIds: ["pregnancy-safe"],
  },
  {
    id: "chiropractic",
    name: "Chiropractic Care",
    emoji: "🦴",
    category: "manual" as const,
    evidenceLevel: "Moderate" as const,
    costLow: 60,
    costHigh: 150,
    typicalFrequency: "2×/week",
    hsaEligible: true,
    description: "Spinal manipulation and musculoskeletal adjustments for pain relief and alignment.",
    goals: ["pain-relief", "posture", "mobility", "injury-prevention"],
    conditions: ["back-pain", "neck-pain", "sciatica", "headaches"],
    preferenceMatch: ["in-person", "clinically-guided"],
    exclusionIds: ["pregnancy-safe"],
  },
  {
    id: "yoga",
    name: "Yoga",
    emoji: "🧘",
    category: "movement" as const,
    evidenceLevel: "Strong" as const,
    costLow: 20,
    costHigh: 50,
    typicalFrequency: "3×/week",
    hsaEligible: false,
    description: "Mind-body practice combining movement, breath, and mindfulness for strength, flexibility, and calm.",
    goals: ["stress-reduction", "flexibility", "strength", "sleep", "mindfulness", "posture"],
    conditions: ["stress", "anxiety", "back-pain", "insomnia", "depression"],
    preferenceMatch: ["in-person", "virtual", "mind-body", "group", "exercise-based"],
    exclusionIds: [],
  },
  {
    id: "pilates",
    name: "Pilates",
    emoji: "🤸",
    category: "movement" as const,
    evidenceLevel: "Moderate" as const,
    costLow: 30,
    costHigh: 90,
    typicalFrequency: "2×/week",
    hsaEligible: false,
    description: "Low-impact core-focused movement system improving strength, posture, and body awareness.",
    goals: ["posture", "core-strength", "flexibility", "pain-relief", "injury-prevention"],
    conditions: ["back-pain", "postural-issues", "sedentary", "post-surgery"],
    preferenceMatch: ["in-person", "exercise-based", "high-accountability", "clinically-guided"],
    exclusionIds: ["mobility-limits", "pregnancy-safe"],
  },
  {
    id: "personal-training",
    name: "Personal Training",
    emoji: "💪",
    category: "movement" as const,
    evidenceLevel: "Strong" as const,
    costLow: 60,
    costHigh: 150,
    typicalFrequency: "2×/week",
    hsaEligible: false,
    description: "One-on-one guided fitness programming with a certified trainer for accountability and results.",
    goals: ["fitness", "weight-management", "strength", "energy", "sport-performance"],
    conditions: ["sedentary", "obesity", "diabetes", "cardiovascular-risk"],
    preferenceMatch: ["in-person", "exercise-based", "high-accountability"],
    exclusionIds: ["mobility-limits", "pregnancy-safe"],
  },
  {
    id: "meditation",
    name: "Guided Meditation",
    emoji: "🧠",
    category: "mind-body" as const,
    evidenceLevel: "Strong" as const,
    costLow: 10,
    costHigh: 30,
    typicalFrequency: "Daily",
    hsaEligible: false,
    description: "Structured mindfulness and meditation practice reducing stress, improving focus, and supporting sleep.",
    goals: ["stress-reduction", "sleep", "mindfulness", "mental-health", "focus"],
    conditions: ["stress", "anxiety", "depression", "insomnia", "adhd"],
    preferenceMatch: ["virtual", "mind-body", "self-guided"],
    exclusionIds: [],
  },
  {
    id: "registered-dietitian",
    name: "Registered Dietitian",
    emoji: "🥗",
    category: "nutrition" as const,
    evidenceLevel: "Strong" as const,
    costLow: 80,
    costHigh: 200,
    typicalFrequency: "2×/month",
    hsaEligible: true,
    description: "Evidence-based nutritional counseling from a licensed RD for whole-body health and disease prevention.",
    goals: ["nutrition", "preventive", "weight-management", "gut-health", "energy"],
    conditions: ["diabetes", "cardiovascular-risk", "ibs", "eating-disorders", "obesity"],
    preferenceMatch: ["in-person", "virtual", "clinically-guided"],
    exclusionIds: [],
  },
  {
    id: "telehealth",
    name: "Telehealth / Virtual Care",
    emoji: "💻",
    category: "telehealth" as const,
    evidenceLevel: "Strong" as const,
    costLow: 50,
    costHigh: 150,
    typicalFrequency: "1×/month",
    hsaEligible: true,
    description: "On-demand access to licensed clinicians via video for primary and preventive care.",
    goals: ["preventive", "mental-health", "stress-reduction", "chronic-disease-management"],
    conditions: ["anxiety", "depression", "stress", "chronic-pain", "diabetes"],
    preferenceMatch: ["virtual", "clinically-guided", "high-accountability"],
    exclusionIds: [],
  },
  {
    id: "dpc",
    name: "Direct Primary Care",
    emoji: "🏥",
    category: "medical" as const,
    evidenceLevel: "Strong" as const,
    costLow: 70,
    costHigh: 150,
    typicalFrequency: "1×/month",
    hsaEligible: false,
    description: "Monthly membership with a DPC physician for unlimited primary care, labs, and preventive screenings.",
    goals: ["preventive", "chronic-disease-management", "health-optimization"],
    conditions: ["diabetes", "hypertension", "cardiovascular-risk", "obesity"],
    preferenceMatch: ["in-person", "clinically-guided"],
    exclusionIds: [],
  },
  {
    id: "nutrition-coach",
    name: "Nutrition Coaching",
    emoji: "🫐",
    category: "nutrition" as const,
    evidenceLevel: "Moderate" as const,
    costLow: 40,
    costHigh: 100,
    typicalFrequency: "2×/month",
    hsaEligible: false,
    description: "Personalized nutrition guidance and habit coaching from a certified nutrition practitioner.",
    goals: ["nutrition", "weight-management", "energy", "gut-health", "fitness"],
    conditions: ["sedentary", "obesity", "stress"],
    preferenceMatch: ["virtual", "in-person", "mind-body", "self-guided"],
    exclusionIds: [],
  },
];

// ── Demo Providers ────────────────────────────────────────────────────────────

const PROVIDER_SEED = [
  {
    id: "prov-001",
    name: "Dr. Sarah Chen, DPT",
    bio: "Board-certified physical therapist with 12 years of experience in orthopedic rehabilitation and sports medicine. Specializes in back pain, post-surgical recovery, and movement analysis.",
    city: "Austin",
    state: "TX",
    zipCode: "78701",
    phone: "(512) 555-0101",
    website: "https://chenptsolutions.com",
    offersTelehealth: false,
    acceptsInsurance: true,
    costPerSession: 140,
    modalityIds: ["physical-therapy"],
  },
  {
    id: "prov-002",
    name: "Marcus Williams, LMT",
    bio: "Licensed massage therapist certified in deep tissue, Swedish, and myofascial release. 8 years helping clients recover from chronic tension and athletic injuries.",
    city: "Austin",
    state: "TX",
    zipCode: "78704",
    phone: "(512) 555-0202",
    website: null,
    offersTelehealth: false,
    acceptsInsurance: false,
    costPerSession: 90,
    modalityIds: ["massage"],
  },
  {
    id: "prov-003",
    name: "Dr. Priya Nair, L.Ac.",
    bio: "Licensed acupuncturist and herbalist trained in classical Chinese medicine. Focuses on chronic pain, fertility, and stress-related conditions.",
    city: "Chicago",
    state: "IL",
    zipCode: "60601",
    phone: "(312) 555-0303",
    website: "https://priyaacupuncture.com",
    offersTelehealth: false,
    acceptsInsurance: true,
    costPerSession: 110,
    modalityIds: ["acupuncture"],
  },
  {
    id: "prov-004",
    name: "Jasmine Torres, RD, MS",
    bio: "Registered dietitian specializing in gut health, plant-forward eating, and sustainable weight management. Offers both in-person and telehealth consultations.",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90001",
    phone: "(323) 555-0404",
    website: "https://torresnutrition.com",
    offersTelehealth: true,
    acceptsInsurance: true,
    costPerSession: 130,
    modalityIds: ["registered-dietitian", "nutrition-coach"],
  },
  {
    id: "prov-005",
    name: "Kevin Park, NASM-CPT",
    bio: "NASM-certified personal trainer and corrective exercise specialist. Works with busy professionals to build sustainable fitness habits with measurable results.",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    phone: "(212) 555-0505",
    website: "https://parkfitness.com",
    offersTelehealth: true,
    acceptsInsurance: false,
    costPerSession: 120,
    modalityIds: ["personal-training"],
  },
  {
    id: "prov-006",
    name: "Rebecca Singh, E-RYT 500",
    bio: "500-hour certified yoga teacher with expertise in therapeutic yoga, breathwork, and yoga nidra. Teaches small group and private sessions both in-studio and online.",
    city: "Denver",
    state: "CO",
    zipCode: "80202",
    phone: "(720) 555-0606",
    website: "https://singhatyoga.com",
    offersTelehealth: true,
    acceptsInsurance: false,
    costPerSession: 55,
    modalityIds: ["yoga", "meditation"],
  },
  {
    id: "prov-007",
    name: "Allison Park, DC",
    bio: "Doctor of Chiropractic focused on spinal health, posture correction, and functional movement. Uses gentle diversified techniques and myofascial work.",
    city: "Seattle",
    state: "WA",
    zipCode: "98101",
    phone: "(206) 555-0707",
    website: null,
    offersTelehealth: false,
    acceptsInsurance: true,
    costPerSession: 95,
    modalityIds: ["chiropractic"],
  },
];

// ── Admin settings ─────────────────────────────────────────────────────────────

const ADMIN_SETTINGS_SEED = [
  {
    key: "disclaimer_text",
    value: "Health Plan Factory provides general wellness information for educational purposes only. This is not medical advice. Always consult a qualified healthcare provider before starting any new wellness program.",
  },
  {
    key: "reveal_pricing",
    value: {
      tier1: { price: 100, label: "Single Provider", description: "Unlock one provider profile" },
      tier2: { price: 200, label: "Full Plan", description: "Unlock all providers in your plan" },
      tier3: { price: 300, label: "Plan + Booking", description: "Unlock all providers + book directly" },
    },
  },
  {
    key: "plus_subscription",
    value: {
      monthlyPriceCents: 999,
      features: [
        "Unlimited plan regeneration",
        "Full provider reveal",
        "AI accountability coach",
        "Priority booking",
        "Progress tracking",
      ],
    },
  },
  {
    key: "feature_flags",
    value: {
      aiCoachEnabled: false,
      stripeConnectEnabled: false,
      teleHealthBookingEnabled: false,
    },
  },
];

// ── Demo Profile, Intake, Plans ───────────────────────────────────────────────

const DEMO_PROFILE_ID = "demo-member-001";
const DEMO_INTAKE_ID = "demo-intake-001";

const DEMO_PLANS = [
  {
    id: "demo-plan-001",
    label: "Stress & Back Pain Focus ($250/mo)",
    budget: 250,
    totalMonthlyCost: 230,
    budgetUtilization: 92,
    items: [
      {
        id: "demo-item-001",
        modalityId: "massage",
        score: 92,
        frequency: "2×/month",
        estimatedMonthlyCost: 100,
        rationale: "Directly targets chronic tension and stress; HSA-eligible and proven for back pain.",
        isDeprioritized: false,
        sortOrder: 0,
      },
      {
        id: "demo-item-002",
        modalityId: "yoga",
        score: 85,
        frequency: "3×/week",
        estimatedMonthlyCost: 80,
        rationale: "Builds back strength and flexibility while reducing cortisol; strong evidence for stress.",
        isDeprioritized: false,
        sortOrder: 1,
      },
      {
        id: "demo-item-003",
        modalityId: "meditation",
        score: 78,
        frequency: "Daily",
        estimatedMonthlyCost: 20,
        rationale: "Low cost, high impact for stress and sleep; reinforces yoga practice.",
        isDeprioritized: false,
        sortOrder: 2,
      },
      {
        id: "demo-item-004",
        modalityId: "acupuncture",
        score: 65,
        frequency: "1×/month",
        estimatedMonthlyCost: 110,
        rationale: "Strong evidence for back pain; deprioritized due to budget constraints — consider adding when budget allows.",
        isDeprioritized: true,
        sortOrder: 3,
      },
    ],
  },
  {
    id: "demo-plan-002",
    label: "Nutrition & Fitness Overhaul ($400/mo)",
    budget: 400,
    totalMonthlyCost: 380,
    budgetUtilization: 95,
    items: [
      {
        id: "demo-item-005",
        modalityId: "registered-dietitian",
        score: 94,
        frequency: "2×/month",
        estimatedMonthlyCost: 160,
        rationale: "Clinical nutrition guidance; HSA-eligible and highly effective for weight management.",
        isDeprioritized: false,
        sortOrder: 0,
      },
      {
        id: "demo-item-006",
        modalityId: "personal-training",
        score: 90,
        frequency: "2×/week",
        estimatedMonthlyCost: 160,
        rationale: "Structured resistance training with accountability; accelerates metabolic and fitness goals.",
        isDeprioritized: false,
        sortOrder: 1,
      },
      {
        id: "demo-item-007",
        modalityId: "meditation",
        score: 72,
        frequency: "Daily",
        estimatedMonthlyCost: 20,
        rationale: "Supports behavior change around eating and exercise habits.",
        isDeprioritized: false,
        sortOrder: 2,
      },
      {
        id: "demo-item-008",
        modalityId: "nutrition-coach",
        score: 60,
        frequency: "2×/month",
        estimatedMonthlyCost: 80,
        rationale: "Complements dietitian; deprioritized to avoid redundancy at current budget.",
        isDeprioritized: true,
        sortOrder: 3,
      },
    ],
  },
  {
    id: "demo-plan-003",
    label: "Whole-Body Preventive ($150/mo)",
    budget: 150,
    totalMonthlyCost: 140,
    budgetUtilization: 93,
    items: [
      {
        id: "demo-item-009",
        modalityId: "telehealth",
        score: 88,
        frequency: "1×/month",
        estimatedMonthlyCost: 75,
        rationale: "On-demand access to licensed clinicians; HSA-eligible and high value for preventive care.",
        isDeprioritized: false,
        sortOrder: 0,
      },
      {
        id: "demo-item-010",
        modalityId: "yoga",
        score: 82,
        frequency: "2×/week",
        estimatedMonthlyCost: 45,
        rationale: "Low-cost movement and mindfulness practice with strong preventive evidence.",
        isDeprioritized: false,
        sortOrder: 1,
      },
      {
        id: "demo-item-011",
        modalityId: "meditation",
        score: 75,
        frequency: "Daily",
        estimatedMonthlyCost: 20,
        rationale: "Daily stress regulation for long-term preventive health.",
        isDeprioritized: false,
        sortOrder: 2,
      },
    ],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...");

  // Modalities
  console.log("  → Seeding modalities...");
  for (const m of MODALITY_SEED) {
    await db
      .insert(modalities)
      .values({ ...m, isActive: true, createdAt: new Date(), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: modalities.id,
        set: { name: m.name, description: m.description, updatedAt: new Date() },
      });
  }
  console.log(`     ✓ ${MODALITY_SEED.length} modalities`);

  // Providers
  console.log("  → Seeding providers...");
  for (const p of PROVIDER_SEED) {
    const { modalityIds, ...providerData } = p;
    await db
      .insert(providers)
      .values({
        id: providerData.id,
        profileId: null,
        name: providerData.name,
        bio: providerData.bio,
        city: providerData.city,
        state: providerData.state,
        zipCode: providerData.zipCode,
        lat: null,
        lng: null,
        phone: providerData.phone,
        website: providerData.website,
        avatarUrl: null,
        status: "approved",
        acceptsInsurance: providerData.acceptsInsurance,
        offersTelehealth: providerData.offersTelehealth,
        costPerSession: providerData.costPerSession,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: providers.id,
        set: { name: providerData.name, updatedAt: new Date() },
      });

    for (let i = 0; i < modalityIds.length; i++) {
      await db
        .insert(providerModalities)
        .values({ providerId: providerData.id, modalityId: modalityIds[i], isPrimary: i === 0 })
        .onConflictDoNothing();
    }
  }
  console.log(`     ✓ ${PROVIDER_SEED.length} providers`);

  // Admin settings
  console.log("  → Seeding admin settings...");
  for (const s of ADMIN_SETTINGS_SEED) {
    await db
      .insert(adminSettings)
      .values({ key: s.key, value: s.value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: { value: s.value, updatedAt: new Date() },
      });
  }
  console.log(`     ✓ ${ADMIN_SETTINGS_SEED.length} admin settings`);

  // Demo profile
  console.log("  → Seeding demo member profile...");
  await db
    .insert(profiles)
    .values({
      id: DEMO_PROFILE_ID,
      email: "demo@healthplanfactory.com",
      displayName: "Demo Member",
      role: "member",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
  console.log("     ✓ 1 demo profile");

  // Demo intake
  console.log("  → Seeding demo member intake...");
  await db
    .insert(memberIntakes)
    .values({
      id: DEMO_INTAKE_ID,
      profileId: DEMO_PROFILE_ID,
      budget: 300,
      goals: ["stress-reduction", "pain-relief", "sleep"],
      conditions: ["back-pain", "stress", "insomnia"],
      preferences: ["in-person", "virtual", "mind-body"],
      exclusions: [],
      zipCode: "78701",
      radius: 25,
      telehealth: true,
      createdAt: new Date(),
    })
    .onConflictDoNothing();
  console.log("     ✓ 1 demo intake");

  // Demo plans
  console.log("  → Seeding demo plans and plan items...");
  for (const plan of DEMO_PLANS) {
    await db
      .insert(plans)
      .values({
        id: plan.id,
        profileId: DEMO_PROFILE_ID,
        intakeId: DEMO_INTAKE_ID,
        status: "saved",
        budget: plan.budget,
        totalMonthlyCost: plan.totalMonthlyCost,
        budgetUtilization: plan.budgetUtilization,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();

    for (const item of plan.items) {
      await db
        .insert(planItems)
        .values({
          id: item.id,
          planId: plan.id,
          modalityId: item.modalityId,
          score: item.score,
          frequency: item.frequency,
          estimatedMonthlyCost: item.estimatedMonthlyCost,
          rationale: item.rationale,
          isDeprioritized: item.isDeprioritized,
          sortOrder: item.sortOrder,
        })
        .onConflictDoNothing();
    }
  }
  console.log(`     ✓ ${DEMO_PLANS.length} demo plans with ${DEMO_PLANS.reduce((s, p) => s + p.items.length, 0)} items`);

  console.log("✅ Seeding complete!");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
