/**
 * Server-side plan engine — mirrors the frontend logic in planEngine.ts but
 * operates on DB Modality rows instead of local TypeScript data.
 *
 * Evidence-based scoring (v2): the engine accepts a pre-loaded clinical
 * evidence corpus and uses evidence grades (A–D) to derive per-(modality ×
 * condition/goal) score contributions instead of flat hardcoded weights.
 */

import type { Modality, ClinicalEvidence } from "@workspace/db";

export type ConditionSeverity = "mild" | "moderate" | "severe";
export type ConditionPriority = "low" | "medium" | "high";

export interface ConditionWeight {
  id: string;
  severity: ConditionSeverity;
  priority: ConditionPriority;
}

export interface IntakeInput {
  budget: number;
  goals: string[];
  conditions: string[];
  conditionWeights?: ConditionWeight[];
  preferences: string[];
  exclusions: string[];
  telehealth: boolean;
  radius?: number;
  zipCode?: string | null;
}

export interface ScoredItem {
  modality: Modality;
  score: number;
  frequency: string;
  estimatedMonthlyCost: number;
  rationale: string;
  isDeprioritized: boolean;
  nearbyProviderCount?: number | null;
}

const SEVERITY_MULT: Record<string, number> = { mild: 1.0, moderate: 1.75, severe: 2.5 };
const PRIORITY_MULT: Record<string, number> = { low: 1.0, medium: 1.5, high: 2.25 };

// Evidence-grade base scores for condition/goal matches.
// Grade A (strong RCTs/systematic reviews) → +8
// Grade B (cohort studies / at least 1 RCT) → +5
// Grade C (limited studies / expert consensus) → +3
// Grade D (emerging / theoretical) → +1
// No corpus entry (modality tags match but no row) → fallback flat weights
const GRADE_SCORE: Record<string, number> = { A: 8, B: 5, C: 3, D: 1 };
const FALLBACK_CONDITION_SCORE = 4;
const FALLBACK_GOAL_SCORE = 3;

type EvidenceLookup = Map<string, ClinicalEvidence>;

function buildEvidenceLookup(corpus: ClinicalEvidence[]): EvidenceLookup {
  const map: EvidenceLookup = new Map();
  for (const row of corpus) {
    const key = `${row.modalityId}:${row.targetType}:${row.targetId}`;
    map.set(key, row);
  }
  return map;
}

function getEvidence(
  lookup: EvidenceLookup,
  modalityId: string,
  targetType: "condition" | "goal",
  targetId: string,
): ClinicalEvidence | undefined {
  return lookup.get(`${modalityId}:${targetType}:${targetId}`);
}

function scoreModality(
  modality: Modality,
  intake: IntakeInput,
  evidenceLookup: EvidenceLookup,
): number {
  let score = 0;

  // ── Goal matching (evidence-grade weighted) ──────────────────────────────
  for (const goal of intake.goals) {
    if ((modality.goals as string[]).includes(goal)) {
      const ev = getEvidence(evidenceLookup, modality.id, "goal", goal);
      score += ev ? (GRADE_SCORE[ev.evidenceGrade] ?? FALLBACK_GOAL_SCORE) : FALLBACK_GOAL_SCORE;
    }
  }

  // ── Condition matching (evidence-grade weighted × severity/priority) ──────
  const weightMap = Object.fromEntries(
    (intake.conditionWeights ?? []).map((w) => [w.id, w])
  );
  for (const cond of intake.conditions) {
    if (cond !== "none" && (modality.conditions as string[]).includes(cond)) {
      const ev = getEvidence(evidenceLookup, modality.id, "condition", cond);
      const baseScore = ev
        ? (GRADE_SCORE[ev.evidenceGrade] ?? FALLBACK_CONDITION_SCORE)
        : FALLBACK_CONDITION_SCORE;
      const w = weightMap[cond];
      const mult = w
        ? (SEVERITY_MULT[w.severity] ?? 1) * (PRIORITY_MULT[w.priority] ?? 1)
        : 1;
      score += Math.round(baseScore * mult);
    }
  }

  // ── Preference matching (unchanged) ─────────────────────────────────────
  for (const pref of intake.preferences) {
    if ((modality.preferenceMatch as string[]).includes(pref)) score += 2;
  }

  // ── Telehealth preference ────────────────────────────────────────────────
  if (intake.telehealth && modality.category === "telehealth") score += 3;
  if (intake.telehealth && (modality.preferenceMatch as string[]).includes("virtual")) score += 2;
  if (intake.telehealth && intake.preferences.includes("virtual") && ["telehealth", "meditation", "nutrition-coach"].includes(modality.id)) score += 4;

  // ── Overall modality evidence level (baseline quality signal) ────────────
  if (modality.evidenceLevel === "Strong") score += 2;
  else if (modality.evidenceLevel === "Moderate") score += 1;

  // ── HSA eligibility for budget-constrained members ───────────────────────
  if (modality.hsaEligible && intake.budget < 250) score += 2;

  // ── Budget-friendly preference boosts ───────────────────────────────────
  if (intake.budget < 150 && ["meditation", "yoga", "nutrition-coach", "breathwork", "qigong", "tai-chi"].includes(modality.id)) score += 3;

  // ── Accountability preference (not condition/goal driven) ────────────────
  const hasFitnessNeed = intake.conditions.includes("sedentary") || intake.goals.includes("fitness");
  const wantsAccountability = intake.preferences.includes("high-accountability");
  if (hasFitnessNeed && wantsAccountability && ["personal-training", "pilates"].includes(modality.id)) score += 5;

  // ── Hard block exclusions ────────────────────────────────────────────────
  for (const excl of intake.exclusions) {
    if ((modality.exclusionIds as string[]).includes(excl)) return -999;
  }

  return score;
}

function estimateFrequency(modality: Modality, budget: number): { frequency: string; monthlyCost: number } {
  const minCost = modality.costLow;
  const maxCost = modality.costHigh;
  const midCost = (minCost + maxCost) / 2;

  if (modality.typicalFrequency.includes("Daily") || modality.typicalFrequency.includes("Unlimited")) {
    return { frequency: modality.typicalFrequency, monthlyCost: minCost };
  }

  const match = modality.typicalFrequency.match(/(\d+).*?(week|month)/i);
  const rawCount = match ? parseInt(match[1]) : 2;
  const isWeekly = match ? match[2].toLowerCase() === "week" : false;
  const typicalSessions = isWeekly ? Math.round(rawCount * 4.3) : rawCount;

  const costPerSession = midCost;
  const canAffordSessions = Math.max(1, Math.floor((budget * 0.35) / costPerSession));
  const sessions = Math.min(typicalSessions, canAffordSessions);

  const monthlyCost = Math.round(sessions * costPerSession);
  const frequency = sessions === 1 ? "1×/month" : sessions <= 4 ? `${sessions}×/month` : `${Math.ceil(sessions / 4.3).toFixed(0)}×/week`;

  return { frequency, monthlyCost };
}

const EFFECT_LABEL: Record<string, string> = {
  large: "large",
  moderate: "moderate",
  small: "small",
  minimal: "minimal",
};

const GRADE_LABEL: Record<string, string> = {
  A: "Grade A",
  B: "Grade B",
  C: "Grade C",
  D: "Grade D",
};

function slugToLabel(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function buildRationale(
  modality: Modality,
  intake: IntakeInput,
  evidenceLookup: EvidenceLookup,
): string {
  const matchedGoals = intake.goals.filter((g) => (modality.goals as string[]).includes(g));
  const matchedConditions = intake.conditions.filter(
    (c) => c !== "none" && (modality.conditions as string[]).includes(c),
  );
  const parts: string[] = [];

  // ── Goal sentence ────────────────────────────────────────────────────────
  if (matchedGoals.length > 0) {
    const labels = matchedGoals.map(slugToLabel);
    parts.push(`Matched to your goal${labels.length > 1 ? "s" : ""}: ${labels.join(", ")}.`);

    // Append clinical evidence for first matched goal that has corpus data
    for (const goal of matchedGoals) {
      const ev = getEvidence(evidenceLookup, modality.id, "goal", goal);
      if (ev) {
        const weeks = ev.weeksToBenefit;
        const effect = EFFECT_LABEL[ev.effectSize] ?? ev.effectSize;
        const grade = GRADE_LABEL[ev.evidenceGrade] ?? ev.evidenceGrade;
        parts.push(
          `${grade} evidence for ${slugToLabel(goal).toLowerCase()} — ${effect} effect, typically noticeable within ${weeks} week${weeks !== 1 ? "s" : ""}.`,
        );
        break;
      }
    }
  }

  // ── Condition sentence ───────────────────────────────────────────────────
  if (matchedConditions.length > 0) {
    const labels = matchedConditions.map(slugToLabel);
    parts.push(`Particularly beneficial for ${labels.join(" and ")}.`);

    // Append clinical evidence for first matched condition that has corpus data
    for (const cond of matchedConditions) {
      const ev = getEvidence(evidenceLookup, modality.id, "condition", cond);
      if (ev && ev.clinicalNotes) {
        parts.push(ev.clinicalNotes);
        break;
      }
    }
  }

  if (modality.hsaEligible) parts.push("HSA/FSA-eligible — check your plan for reimbursement.");

  return parts.join(" ") || modality.description;
}

export interface GeneratedPlan {
  totalMonthlyCost: number;
  budgetUtilization: number;
  items: ScoredItem[];
}

/**
 * Run the plan engine with optional provider availability map and clinical evidence corpus.
 *
 * @param modalities   Active modality rows from DB.
 * @param intake       Member intake input.
 * @param providerAvailability  Optional map of modalityId → nearby provider count (null = unknown).
 * @param clinicalEvidenceCorpus  Pre-loaded clinical evidence rows for evidence-based scoring.
 */
export function runPlanEngine(
  modalities: Modality[],
  intake: IntakeInput,
  providerAvailability?: Record<string, number | null>,
  clinicalEvidenceCorpus?: ClinicalEvidence[],
): GeneratedPlan {
  const evidenceLookup = buildEvidenceLookup(clinicalEvidenceCorpus ?? []);

  // Identify which modalities are force-deprioritized due to zero local providers.
  const forceDeprioritized = new Set<string>();
  if (providerAvailability) {
    for (const m of modalities) {
      const count = providerAvailability[m.id] ?? null;
      if (count === 0 && m.category !== "telehealth") {
        forceDeprioritized.add(m.id);
      }
    }
  }

  const scored = modalities
    .map((m) => {
      const score = scoreModality(m, intake, evidenceLookup);
      return { modality: m, score };
    })
    .filter((m) => m.score > -999);

  scored.sort((a, b) => {
    const aDeprio = forceDeprioritized.has(a.modality.id) ? 1 : 0;
    const bDeprio = forceDeprioritized.has(b.modality.id) ? 1 : 0;
    if (aDeprio !== bDeprio) return aDeprio - bDeprio;
    return b.score - a.score;
  });

  const items: ScoredItem[] = [];
  let runningCost = 0;
  let includedCount = 0;
  let deprioritizedCount = 0;

  for (const { modality, score } of scored) {
    const isForceDeprio = forceDeprioritized.has(modality.id);
    if (score <= 0 && !isForceDeprio) continue;

    const { frequency, monthlyCost } = estimateFrequency(modality, intake.budget);
    const nearbyProviderCount = providerAvailability ? (providerAvailability[modality.id] ?? null) : null;
    const rationale = buildRationale(modality, intake, evidenceLookup);

    if (!isForceDeprio && runningCost + monthlyCost <= intake.budget && includedCount < 6) {
      items.push({ modality, score, frequency, estimatedMonthlyCost: monthlyCost, rationale, isDeprioritized: false, nearbyProviderCount });
      runningCost += monthlyCost;
      includedCount++;
    } else if (deprioritizedCount < 4) {
      items.push({ modality, score, frequency, estimatedMonthlyCost: monthlyCost, rationale, isDeprioritized: true, nearbyProviderCount });
      deprioritizedCount++;
    }
  }

  const totalMonthlyCost = runningCost;
  const budgetUtilization = Math.min(100, Math.round((totalMonthlyCost / intake.budget) * 100));

  return { totalMonthlyCost, budgetUtilization, items };
}
