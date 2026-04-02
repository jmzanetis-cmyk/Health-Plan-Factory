/**
 * Seed testimonials: inserts 6 initial member success stories.
 * Run with: pnpm --filter @workspace/scripts tsx src/seed-testimonials.ts
 */
import { db, pool, testimonials } from "@workspace/db";

const TESTIMONIAL_SEED = [
  {
    id: "testimonial-1",
    name: "Sarah M.",
    location: "Denver, CO",
    goal: "Stress relief & budget management",
    quote: "I finally have a plan I can actually afford. The AI figured out that massage + online yoga fits my $120/month budget better than a gym membership I'd never use.",
    stars: 5,
    isVisible: true,
    displayOrder: 1,
  },
  {
    id: "testimonial-2",
    name: "James T.",
    location: "Austin, TX",
    goal: "HSA/FSA optimization",
    quote: "The HSA unlock feature alone paid for itself. I had no idea my massage therapist qualified. That's $600 in tax-free spending I was missing.",
    stars: 5,
    isVisible: true,
    displayOrder: 2,
  },
  {
    id: "testimonial-3",
    name: "Dr. Priya R., MD",
    location: "Seattle, WA",
    goal: "Provider referrals",
    quote: "As a DPC physician, this is the referral platform I've been waiting for. My patients come in already knowing what they want to try and how it fits their budget.",
    stars: 5,
    isVisible: true,
    displayOrder: 3,
  },
  {
    id: "testimonial-4",
    name: "Marcus L.",
    location: "Chicago, IL",
    goal: "Chronic pain management",
    quote: "Six months of acupuncture + physical therapy recommended by my plan — and my back pain is manageable for the first time in years. The plan paid for itself.",
    stars: 5,
    isVisible: true,
    displayOrder: 4,
  },
  {
    id: "testimonial-5",
    name: "Elena V.",
    location: "Phoenix, AZ",
    goal: "Sleep & mental wellness",
    quote: "I went from winging my wellness to having a structured routine with local providers who actually match my goals. I sleep better. I feel better. Worth every penny.",
    stars: 5,
    isVisible: true,
    displayOrder: 5,
  },
  {
    id: "testimonial-6",
    name: "David K.",
    location: "Nashville, TN",
    goal: "Weight loss & fitness",
    quote: "The provider count badge showed 12 personal trainers near my zip code. Found my trainer through the plan reveal — best decision I made this year.",
    stars: 5,
    isVisible: true,
    displayOrder: 6,
  },
];

async function main() {
  console.log("🌱 Seeding testimonials...");

  for (const t of TESTIMONIAL_SEED) {
    await db.insert(testimonials).values(t).onConflictDoNothing();
  }

  console.log(`   ✓ ${TESTIMONIAL_SEED.length} testimonials seeded`);
  console.log("✅ Done!");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
