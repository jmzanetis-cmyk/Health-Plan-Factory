/**
 * One-time script: generates evidence summaries for all 12 modalities via Claude
 * and stores them in the DB. Run with: node scripts/generate-evidence.mjs
 */
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BASE_URL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
const API_KEY = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.error("Missing AI_INTEGRATIONS_ANTHROPIC_BASE_URL or AI_INTEGRATIONS_ANTHROPIC_API_KEY");
  process.exit(1);
}

const MODALITIES = [
  {
    id: "massage",
    name: "Massage Therapy",
    category: "manual",
    evidenceLevel: "Strong",
    costRange: [60, 130],
    conditions: ["back-pain", "neck-pain", "stress", "recovery-needs"],
    related: ["physical-therapy", "acupuncture", "chiropractic"],
  },
  {
    id: "yoga",
    name: "Yoga",
    category: "movement",
    evidenceLevel: "Strong",
    costRange: [20, 60],
    conditions: ["stress", "anxiety", "poor-flexibility", "sedentary"],
    related: ["pilates", "meditation", "personal-training"],
  },
  {
    id: "pilates",
    name: "Pilates",
    category: "movement",
    evidenceLevel: "Strong",
    costRange: [30, 90],
    conditions: ["back-pain", "poor-flexibility", "sedentary"],
    related: ["yoga", "physical-therapy", "personal-training"],
  },
  {
    id: "chiropractic",
    name: "Chiropractic",
    category: "manual",
    evidenceLevel: "Moderate",
    costRange: [50, 120],
    conditions: ["back-pain", "neck-pain", "poor-flexibility"],
    related: ["massage", "physical-therapy", "acupuncture"],
  },
  {
    id: "acupuncture",
    name: "Acupuncture",
    category: "manual",
    evidenceLevel: "Moderate",
    costRange: [70, 130],
    conditions: ["back-pain", "neck-pain", "stress", "anxiety"],
    related: ["massage", "chiropractic", "meditation"],
  },
  {
    id: "physical-therapy",
    name: "Physical Therapy",
    category: "medical",
    evidenceLevel: "Strong",
    costRange: [80, 180],
    conditions: ["back-pain", "neck-pain", "recovery-needs", "poor-flexibility"],
    related: ["massage", "pilates", "chiropractic"],
  },
  {
    id: "personal-training",
    name: "Personal Training",
    category: "movement",
    evidenceLevel: "Strong",
    costRange: [50, 120],
    conditions: ["sedentary", "recovery-needs"],
    related: ["pilates", "yoga", "registered-dietitian"],
  },
  {
    id: "registered-dietitian",
    name: "Registered Dietitian",
    category: "nutrition",
    evidenceLevel: "Strong",
    costRange: [80, 150],
    conditions: ["digestive", "sedentary"],
    related: ["nutrition-coach", "telehealth", "dpc"],
  },
  {
    id: "nutrition-coach",
    name: "Nutrition Coaching",
    category: "nutrition",
    evidenceLevel: "Moderate",
    costRange: [40, 100],
    conditions: ["digestive", "sedentary"],
    related: ["registered-dietitian", "personal-training", "telehealth"],
  },
  {
    id: "meditation",
    name: "Meditation / MBSR",
    category: "mind-body",
    evidenceLevel: "Strong",
    costRange: [15, 50],
    conditions: ["stress", "anxiety", "sleep"],
    related: ["yoga", "acupuncture", "telehealth"],
  },
  {
    id: "telehealth",
    name: "Telehealth Wellness",
    category: "telehealth",
    evidenceLevel: "Moderate",
    costRange: [30, 80],
    conditions: ["stress", "anxiety", "digestive"],
    related: ["dpc", "registered-dietitian", "meditation"],
  },
  {
    id: "dpc",
    name: "Direct Primary Care",
    category: "medical",
    evidenceLevel: "Emerging",
    costRange: [50, 100],
    conditions: ["back-pain", "digestive", "recovery-needs"],
    related: ["telehealth", "registered-dietitian", "physical-therapy"],
  },
];

async function callClaude(prompt) {
  const res = await fetch(`${BASE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Claude API error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

const EVIDENCE_PROMPT = (m) => `You are writing for Health Plan Factory, a premium editorial wellness platform.

Write a 350-450 word evidence summary for ${m.name} for the public library page on our website.

Format requirements:
- Plain prose (no bullet points, no markdown headers)
- 3 short paragraphs
- First paragraph: What it is and what the evidence shows (cite type of research, e.g., "randomized controlled trials", "systematic reviews")
- Second paragraph: What conditions it helps most, mechanism of action in plain language
- Third paragraph: Who it's best for, what to look for in a provider, realistic expectations

Evidence level for this modality: ${m.evidenceLevel}
Category: ${m.category}

Tone: Informed, accessible, no hype. Like a trusted friend who happens to have a clinical background.
Do NOT include: price information, HSA eligibility, or any claims of cure.
Return ONLY the plain text — no markdown, no headers, no extra commentary.`;

const META_PROMPT = (m, summary) => `Write a 140-160 character SEO meta description for a page about ${m.name} on Health Plan Factory.
The page shows evidence level (${m.evidenceLevel}), conditions it helps, and a CTA to find providers.
Return ONLY the meta description text, no quotes.`;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateForModality(m) {
  console.log(`Generating evidence for: ${m.name}...`);
  
  const summary = await callClaude(EVIDENCE_PROMPT(m));
  await sleep(1000);
  const meta = await callClaude(META_PROMPT(m, summary));

  return { id: m.id, evidenceSummary: summary.trim(), metaDescription: meta.trim(), relatedModalities: m.related };
}

async function main() {
  const client = await pool.connect();
  try {
    for (const m of MODALITIES) {
      try {
        const { id, evidenceSummary, metaDescription, relatedModalities } = await generateForModality(m);
        await client.query(
          `UPDATE modalities SET evidence_summary = $1, meta_description = $2, related_modalities = $3, updated_at = NOW() WHERE id = $4`,
          [evidenceSummary, metaDescription, JSON.stringify(relatedModalities), id]
        );
        console.log(`  ✓ Stored: ${id}`);
        await sleep(500);
      } catch (err) {
        console.error(`  ✗ Failed: ${m.id}`, err.message);
      }
    }
    console.log("\nDone! All modalities processed.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
