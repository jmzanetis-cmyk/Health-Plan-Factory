/**
 * Seed the clinical_evidence table with per-(modality × condition/goal) structured
 * clinical evidence data. Batches all targets per modality into a single Claude call.
 * Safe to re-run — upserts via ON CONFLICT (modality_id, target_type, target_id).
 *
 * Run with: node scripts/seed-clinical-evidence.mjs
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Build a prompt that asks Claude to evaluate evidence for all targets
 * using exact slug strings (no conversion to display text) so the returned
 * target_id values can be matched back to the original input.
 */
function buildBatchPrompt(modalityName, modalityCategory, targets) {
  // List targets with their exact slugs so Claude returns them verbatim.
  const targetList = targets.map((t, i) =>
    `${i + 1}. type="${t.type}" id="${t.id}"`
  ).join("\n");

  return `You are a clinical evidence analyst for Health Plan Factory, a wellness platform.

For the modality "${modalityName}" (category: ${modalityCategory}), assess the clinical evidence for each of the following targets:

${targetList}

Return ONLY a valid JSON array. Each element must correspond to one target in the order listed. Use the EXACT type and id strings from the input — do NOT alter, translate, or reformat the id values.

Each element:
{
  "target_type": "<exact value from input: condition or goal>",
  "target_id": "<exact slug from input, e.g. back-pain>",
  "evidence_grade": "A" | "B" | "C" | "D",
  "effect_size": "large" | "moderate" | "small" | "minimal",
  "study_types": ["randomized-controlled-trial" | "systematic-review" | "cohort-study" | "case-control" | "pilot-study" | "expert-consensus" | "observational-study"],
  "num_studies_approx": <integer>,
  "clinical_notes": "<1-2 factual sentences about what the evidence shows for this modality + this condition/goal. Cite study types. No brand names, no first person.>",
  "contraindications": ["<specific contraindications>"],
  "weeks_to_benefit": <integer>
}

Evidence grade guide:
- A: Multiple high-quality RCTs or systematic reviews with consistent results
- B: Multiple cohort studies, controlled trials, or at least one RCT
- C: Limited studies, case series, or strong expert consensus
- D: Emerging evidence, theoretical basis, or very limited data

Return ONLY the JSON array, no markdown, no extra text.`;
}

const VALID_GRADES = new Set(["A", "B", "C", "D"]);
const VALID_EFFECTS = new Set(["large", "moderate", "small", "minimal"]);
const VALID_TARGET_TYPES = new Set(["condition", "goal"]);

/**
 * Validate a single Claude-returned row and enforce that its (target_type, target_id)
 * is one of the originally requested pairs to prevent silent slug drift.
 */
function validateRow(row, requestedTargetSet) {
  if (!VALID_TARGET_TYPES.has(row.target_type)) throw new Error(`Invalid target_type: ${row.target_type}`);
  if (!VALID_GRADES.has(row.evidence_grade)) throw new Error(`Invalid grade: ${row.evidence_grade}`);
  if (!VALID_EFFECTS.has(row.effect_size)) throw new Error(`Invalid effect: ${row.effect_size}`);
  if (!Array.isArray(row.study_types)) throw new Error("study_types must be array");
  if (typeof row.clinical_notes !== "string" || !row.clinical_notes.trim()) throw new Error("clinical_notes empty");
  if (!Array.isArray(row.contraindications)) throw new Error("contraindications must be array");

  const key = `${row.target_type}:${row.target_id}`;
  if (!requestedTargetSet.has(key)) {
    throw new Error(`Returned target_id "${row.target_id}" (type=${row.target_type}) not in requested set`);
  }

  return {
    target_type: row.target_type,
    target_id: row.target_id,
    evidence_grade: row.evidence_grade,
    effect_size: row.effect_size,
    study_types: row.study_types.slice(0, 5),
    num_studies_approx: Math.max(0, parseInt(row.num_studies_approx) || 0),
    clinical_notes: String(row.clinical_notes).trim().slice(0, 500),
    contraindications: row.contraindications.slice(0, 6),
    weeks_to_benefit: Math.max(1, parseInt(row.weeks_to_benefit) || 4),
  };
}

async function generateBatch(modalityName, modalityCategory, targets, retries = 3) {
  const requestedTargetSet = new Set(targets.map((t) => `${t.type}:${t.id}`));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const raw = await callClaude(buildBatchPrompt(modalityName, modalityCategory, targets));
      const cleaned = raw.trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "");
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("Expected JSON array");
      return parsed.map((row) => validateRow(row, requestedTargetSet));
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`  Retry ${attempt}/${retries}: ${err.message}`);
      await sleep(3000 * attempt);
    }
  }
}

async function upsertRow(client, modalityId, row) {
  await client.query(
    `INSERT INTO clinical_evidence
       (modality_id, target_type, target_id, evidence_grade, effect_size, study_types,
        num_studies_approx, clinical_notes, contraindications, weeks_to_benefit, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     ON CONFLICT (modality_id, target_type, target_id)
     DO UPDATE SET
       evidence_grade     = EXCLUDED.evidence_grade,
       effect_size        = EXCLUDED.effect_size,
       study_types        = EXCLUDED.study_types,
       num_studies_approx = EXCLUDED.num_studies_approx,
       clinical_notes     = EXCLUDED.clinical_notes,
       contraindications  = EXCLUDED.contraindications,
       weeks_to_benefit   = EXCLUDED.weeks_to_benefit,
       updated_at         = NOW()`,
    [
      modalityId,
      row.target_type,
      row.target_id,
      row.evidence_grade,
      row.effect_size,
      JSON.stringify(row.study_types),
      row.num_studies_approx,
      row.clinical_notes,
      JSON.stringify(row.contraindications),
      row.weeks_to_benefit,
    ]
  );
}

async function main() {
  const client = await pool.connect();
  try {
    const { rows: modalityRows } = await client.query(
      `SELECT id, name, category, goals, conditions FROM modalities WHERE is_active = true ORDER BY id`
    );

    console.log(`\nFound ${modalityRows.length} active modalities.\n`);

    let totalPairs = 0;
    let successCount = 0;
    let failCount = 0;

    for (const m of modalityRows) {
      const goals = Array.isArray(m.goals) ? m.goals : JSON.parse(m.goals || "[]");
      const conditions = Array.isArray(m.conditions) ? m.conditions : JSON.parse(m.conditions || "[]");

      const targets = [
        ...goals.filter(Boolean).map((g) => ({ type: "goal", id: g })),
        ...conditions.filter((c) => c && c !== "none").map((c) => ({ type: "condition", id: c })),
      ];

      if (targets.length === 0) {
        console.log(`  ${m.name}: no targets, skipping`);
        continue;
      }

      totalPairs += targets.length;
      process.stdout.write(`${m.name} (${targets.length} targets)... `);

      try {
        const rows = await generateBatch(m.name, m.category, targets);

        let ok = 0;
        for (const row of rows) {
          try {
            await upsertRow(client, m.id, row);
            ok++;
            successCount++;
          } catch (err) {
            console.error(`\n  ✗ DB error for ${m.id} × ${row.target_type}:${row.target_id}: ${err.message}`);
            failCount++;
          }
        }
        console.log(`✓ ${ok}/${targets.length} upserted`);
      } catch (err) {
        console.error(`✗ FAILED: ${err.message}`);
        failCount += targets.length;
      }

      await sleep(800);
    }

    console.log(`\n${"─".repeat(60)}`);
    console.log(`Total pairs: ${totalPairs} | Upserted: ${successCount} | Failed: ${failCount}`);
    console.log("Done!");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
