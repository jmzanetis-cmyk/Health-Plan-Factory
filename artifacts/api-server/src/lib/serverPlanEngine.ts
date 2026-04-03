/**
 * Server-side plan engine. Scores modalities against member intake data.
 * Accepts a pre-loaded clinical evidence corpus to weight condition/goal
 * matches by evidence grade (A=8, B=5, C=3, D=1) instead of flat weights.
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

export interface GeneratedPlan {
  totalMonthlyCost: number;
  budgetUtilization: number;
  items: ScoredItem[];
}

const SEVERITY_MULT: Record<string, number> = { mild: 1.0, moderate: 1.75, severe: 2.5 };
const PRIORITY_MULT: Record<string, number> = { low: 1.0, medium: 1.5, high: 2.25 };

// Evidence-grade base scores: A=strong RCTs, B=cohort studies, C=expert consensus, D=emerging
const GRADE_SCORE: Record<string, number> = { A: 8, B: 5, C: 3, D: 1 };
const FALLBACK_CONDITION_SCORE = 4;
const FALLBACK_GOAL_SCORE = 3;

type EvidenceLookup = Map<string, ClinicalEvidence>;

function buildEvidenceLookup(corpus: ClinicalEvidence[]): EvidenceLookup {
  const map: EvidenceLookup = new Map();
  for (const row of corpus) {
    map.set(`${row.modalityId}:${row.targetType}:${row.targetId}`, row);
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

function slugToLabel(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

const STUDY_TYPE_SHORT: Record<string, string> = {
  "randomized-controlled-trial": "RCT",
  "systematic-review": "systematic review",
  "cohort-study": "cohort study",
  "case-control": "case-control",
  "pilot-study": "pilot study",
  "expert-consensus": "expert consensus",
  "observational-study": "observational study",
};

function formatStudyTypes(types: string[]): string {
  if (!types.length) return "";
  return types
    .slice(0, 2)
    .map((t) => STUDY_TYPE_SHORT[t] ?? t)
    .join(", ");
}

/** Build a standardized evidence sentence for a single matched goal or condition. */
function evidenceSentence(ev: ClinicalEvidence, label: string): string {
  const grade = `Grade ${ev.evidenceGrade}`;
  const effect = ev.effectSize;
  const weeks = ev.weeksToBenefit;
  const studies = formatStudyTypes(ev.studyTypes as string[]);
  const studyPart = studies ? ` (${studies})` : "";
  return `${grade} evidence for ${label} — ${effect} effect${studyPart}, typically noticeable within ${weeks} week${weeks !== 1 ? "s" : ""}.`;
}

function scoreModality(modality: Modality, intake: IntakeInput, evidenceLookup: EvidenceLookup): number {
  let score = 0;

  for (const goal of intake.goals) {
    if ((modality.goals as string[]).includes(goal)) {
      const ev = getEvidence(evidenceLookup, modality.id, "goal", goal);
      score += ev ? (GRADE_SCORE[ev.evidenceGrade] ?? FALLBACK_GOAL_SCORE) : FALLBACK_GOAL_SCORE;
    }
  }

  const weightMap = Object.fromEntries((intake.conditionWeights ?? []).map((w) => [w.id, w]));
  for (const cond of intake.conditions) {
    if (cond !== "none" && (modality.conditions as string[]).includes(cond)) {
      const ev = getEvidence(evidenceLookup, modality.id, "condition", cond);
      const baseScore = ev ? (GRADE_SCORE[ev.evidenceGrade] ?? FALLBACK_CONDITION_SCORE) : FALLBACK_CONDITION_SCORE;
      const w = weightMap[cond];
      const mult = w ? (SEVERITY_MULT[w.severity] ?? 1) * (PRIORITY_MULT[w.priority] ?? 1) : 1;
      score += Math.round(baseScore * mult);
    }
  }

  for (const pref of intake.preferences) {
    if ((modality.preferenceMatch as string[]).includes(pref)) score += 2;
  }

  if (intake.telehealth && modality.category === "telehealth") score += 3;
  if (intake.telehealth && (modality.preferenceMatch as string[]).includes("virtual")) score += 2;
  if (intake.telehealth && intake.preferences.includes("virtual") && ["telehealth", "meditation", "nutrition-coach"].includes(modality.id)) score += 4;

  // Modality-level tiebreaker (overall quality signal, distinct from per-target corpus scores)
  if (modality.evidenceLevel === "Strong") score += 2;
  else if (modality.evidenceLevel === "Moderate") score += 1;

  if (modality.hsaEligible && intake.budget < 250) score += 2;

  // Budget-friendly preference boost for low-cost mind-body modalities
  if (intake.budget < 150 && ["meditation", "yoga", "nutrition-coach", "breathwork", "qigong", "tai-chi"].includes(modality.id)) score += 3;

  // Accountability preference boost (not duplicated by clinical corpus)
  const hasFitnessNeed = intake.conditions.includes("sedentary") || intake.goals.includes("fitness");
  if (hasFitnessNeed && intake.preferences.includes("high-accountability") && ["personal-training", "pilates"].includes(modality.id)) score += 5;

  for (const excl of intake.exclusions) {
    if ((modality.exclusionIds as string[]).includes(excl)) return -999;
  }

  return score;
}

function estimateFrequency(modality: Modality, budget: number): { frequency: string; monthlyCost: number } {
  const midCost = (modality.costLow + modality.costHigh) / 2;

  if (modality.typicalFrequency.includes("Daily") || modality.typicalFrequency.includes("Unlimited")) {
    return { frequency: modality.typicalFrequency, monthlyCost: modality.costLow };
  }

  const match = modality.typicalFrequency.match(/(\d+).*?(week|month)/i);
  const rawCount = match ? parseInt(match[1]) : 2;
  const isWeekly = match ? match[2].toLowerCase() === "week" : false;
  const typicalSessions = isWeekly ? Math.round(rawCount * 4.3) : rawCount;
  const canAffordSessions = Math.max(1, Math.floor((budget * 0.35) / midCost));
  const sessions = Math.min(typicalSessions, canAffordSessions);
  const monthlyCost = Math.round(sessions * midCost);
  const frequency = sessions === 1 ? "1×/month" : sessions <= 4 ? `${sessions}×/month` : `${Math.ceil(sessions / 4.3).toFixed(0)}×/week`;

  return { frequency, monthlyCost };
}

function buildRationale(modality: Modality, intake: IntakeInput, evidenceLookup: EvidenceLookup): string {
  const matchedGoals = intake.goals.filter((g) => (modality.goals as string[]).includes(g));
  const matchedConditions = intake.conditions.filter((c) => c !== "none" && (modality.conditions as string[]).includes(c));
  const parts: string[] = [];

  if (matchedGoals.length > 0) {
    parts.push(`Matched to your goal${matchedGoals.length > 1 ? "s" : ""}: ${matchedGoals.map(slugToLabel).join(", ")}.`);
    for (const goal of matchedGoals) {
      const ev = getEvidence(evidenceLookup, modality.id, "goal", goal);
      if (ev) {
        parts.push(evidenceSentence(ev, slugToLabel(goal).toLowerCase()));
        if (ev.clinicalNotes) parts.push(ev.clinicalNotes);
      }
    }
  }

  if (matchedConditions.length > 0) {
    parts.push(`Particularly beneficial for ${matchedConditions.map(slugToLabel).join(" and ")}.`);
    for (const cond of matchedConditions) {
      const ev = getEvidence(evidenceLookup, modality.id, "condition", cond);
      if (ev) {
        parts.push(evidenceSentence(ev, slugToLabel(cond).toLowerCase()));
        if (ev.clinicalNotes) parts.push(ev.clinicalNotes);
      }
    }
  }

  if (modality.hsaEligible) parts.push("HSA/FSA-eligible — check your plan for reimbursement.");

  return parts.join(" ") || modality.description;
}

export function runPlanEngine(
  modalities: Modality[],
  intake: IntakeInput,
  providerAvailability?: Record<string, number | null>,
  clinicalEvidenceCorpus?: ClinicalEvidence[],
): GeneratedPlan {
  const evidenceLookup = buildEvidenceLookup(clinicalEvidenceCorpus ?? []);

  const forceDeprioritized = new Set<string>();
  if (providerAvailability) {
    for (const m of modalities) {
      const count = providerAvailability[m.id] ?? null;
      if (count === 0 && m.category !== "telehealth") forceDeprioritized.add(m.id);
    }
  }

  const scored = modalities
    .map((m) => ({ modality: m, score: scoreModality(m, intake, evidenceLookup) }))
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
