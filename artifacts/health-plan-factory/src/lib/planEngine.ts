import { z } from "zod";
import { MODALITIES, type Modality } from "@/data/modalities";
import { type IntakeData } from "@/types/onboarding";

export interface PlanItem {
  modality: Modality;
  score: number;
  frequency: string;
  estimatedMonthlyCost: number;
  rationale: string;
}

export interface Plan {
  included: PlanItem[];
  deprioritized: PlanItem[];
  totalMonthlyCost: number;
  budgetUtilization: number;
}

// ── sessionStorage serialization ─────────────────────────────────────────────
// Store only modality IDs to avoid storing redundant/possibly stale modality
// objects in sessionStorage. The full Modality is rehydrated from MODALITIES.

const persistedItemSchema = z.object({
  modalityId: z.string(),
  score: z.number(),
  frequency: z.string(),
  estimatedMonthlyCost: z.number(),
  rationale: z.string(),
});

export const planSchema = z.object({
  included: z.array(persistedItemSchema),
  deprioritized: z.array(persistedItemSchema),
  totalMonthlyCost: z.number(),
  budgetUtilization: z.number(),
});

export type PersistedPlan = z.infer<typeof planSchema>;

/** Serialize a Plan to a storage-safe form (modality → modalityId). */
export function serializePlan(plan: Plan): PersistedPlan {
  const mapItem = (item: PlanItem) => ({
    modalityId: item.modality.id,
    score: item.score,
    frequency: item.frequency,
    estimatedMonthlyCost: item.estimatedMonthlyCost,
    rationale: item.rationale,
  });
  return {
    included: plan.included.map(mapItem),
    deprioritized: plan.deprioritized.map(mapItem),
    totalMonthlyCost: plan.totalMonthlyCost,
    budgetUtilization: plan.budgetUtilization,
  };
}

/** Rehydrate a PersistedPlan to a full Plan by looking up modalities from MODALITIES.
 *  Returns null if any modality ID cannot be resolved. */
export function deserializePlan(persisted: PersistedPlan): Plan | null {
  const rehydrate = (items: PersistedPlan["included"]): PlanItem[] | null => {
    const result: PlanItem[] = [];
    for (const item of items) {
      const modality = MODALITIES.find((m) => m.id === item.modalityId);
      if (!modality) return null;
      result.push({ modality, score: item.score, frequency: item.frequency, estimatedMonthlyCost: item.estimatedMonthlyCost, rationale: item.rationale });
    }
    return result;
  };
  const included = rehydrate(persisted.included);
  const deprioritized = rehydrate(persisted.deprioritized);
  if (!included || !deprioritized) return null;
  return { included, deprioritized, totalMonthlyCost: persisted.totalMonthlyCost, budgetUtilization: persisted.budgetUtilization };
}
// ─────────────────────────────────────────────────────────────────────────────

function scoreModality(modality: Modality, intake: IntakeData): number {
  let score = 0;

  // Goal match
  for (const goal of intake.goals) {
    if (modality.goals.includes(goal)) score += 3;
  }

  // Condition match
  for (const condition of intake.conditions) {
    if (condition !== "none" && modality.conditions.includes(condition)) score += 4;
  }

  // Preference match
  for (const pref of intake.preferences) {
    if (modality.preferenceMatch.includes(pref)) score += 2;
  }

  // Telehealth boost
  if (intake.telehealth && modality.category === "telehealth") score += 3;
  if (intake.telehealth && modality.preferenceMatch.includes("virtual")) score += 2;

  // Evidence bonus
  if (modality.evidenceLevel === "Strong") score += 2;
  else if (modality.evidenceLevel === "Moderate") score += 1;

  // HSA eligible bonus (users with tight budgets benefit more)
  if (modality.hsaEligible && intake.budget < 250) score += 2;

  // ── Named scenario rules ─────────────────────────────────────────────────
  // Rule 1: stress / anxiety / sleep → mind-body modalities strongly preferred
  const hasStressOrAnxiety =
    intake.conditions.some((c) => ["stress", "anxiety"].includes(c)) ||
    intake.goals.some((g) => ["stress-reduction", "sleep"].includes(g));
  if (hasStressOrAnxiety && ["meditation", "yoga", "telehealth"].includes(modality.id)) {
    score += 5;
  }

  // Rule 2: back pain + posture goals → manual/movement structural care
  // Includes acupuncture per scenario: back pain + posture + moderate budget → PT/Pilates/massage/acupuncture
  const hasBackOrPosture =
    intake.conditions.includes("back-pain") || intake.goals.includes("posture");
  if (hasBackOrPosture && ["physical-therapy", "pilates", "massage", "chiropractic", "acupuncture"].includes(modality.id)) {
    score += 5;
  }

  // Rule 3: low budget (<$150) → highest-value-per-dollar options first
  if (intake.budget < 150 && ["meditation", "yoga", "nutrition-coach"].includes(modality.id)) {
    score += 3;
  }

  // Rule 4: fitness + accountability preference → personal training + Pilates (accountability-gated)
  const hasFitnessNeed =
    intake.conditions.includes("sedentary") || intake.goals.includes("fitness");
  const wantsAccountability = intake.preferences.includes("high-accountability");
  if (hasFitnessNeed && wantsAccountability && ["personal-training", "pilates"].includes(modality.id)) {
    score += 6;
  } else if (hasFitnessNeed && ["personal-training", "pilates"].includes(modality.id)) {
    score += 3;
  }

  // Rule 5: preventive / comprehensive goals → DPC + telehealth + RD as foundation
  const isPreventive = intake.goals.includes("preventive") || intake.goals.includes("nutrition");
  if (isPreventive && ["dpc", "telehealth", "registered-dietitian"].includes(modality.id)) {
    score += 4;
  }

  // Rule 6: virtual preference with telehealth enabled → telehealth / meditation / nutrition coach
  if (
    intake.telehealth &&
    intake.preferences.includes("virtual") &&
    ["telehealth", "meditation", "nutrition-coach"].includes(modality.id)
  ) {
    score += 4;
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Exclusion penalty — hard block
  for (const excl of intake.exclusions) {
    if (modality.exclusionIds.includes(excl)) return -999;
  }

  return score;
}

function estimateFrequency(modality: Modality, budget: number): { frequency: string; monthlyCost: number } {
  const [minCost, maxCost] = modality.costRange;
  const midCost = (minCost + maxCost) / 2;

  // If the modality has a fixed frequency description, use min cost
  if (modality.typicalFrequency.includes("Daily") || modality.typicalFrequency.includes("Unlimited")) {
    return { frequency: modality.typicalFrequency, monthlyCost: minCost };
  }

  // For session-based, scale with budget
  const typicalStr = modality.typicalFrequency; // e.g. "2×/month" or "3×/week"
  const match = typicalStr.match(/(\d+).*?(week|month)/i);
  const rawCount = match ? parseInt(match[1]) : 2;
  const isWeekly = match ? match[2].toLowerCase() === "week" : false;
  // Convert to monthly: weekly × 4.3 (average weeks per month)
  const typicalSessions = isWeekly ? Math.round(rawCount * 4.3) : rawCount;

  const costPerSession = midCost;
  const canAffordSessions = Math.max(1, Math.floor((budget * 0.35) / costPerSession));
  const sessions = Math.min(typicalSessions, canAffordSessions);

  const monthlyCost = Math.round(sessions * costPerSession);
  // Display as weekly if >= 4 sessions/month, otherwise monthly
  const frequency = sessions === 1 ? "1×/month" : sessions <= 4 ? `${sessions}×/month` : `${Math.ceil(sessions / 4.3).toFixed(0)}×/week`;

  return { frequency, monthlyCost };
}

function buildRationale(modality: Modality, intake: IntakeData): string {
  const matchedGoals = intake.goals.filter((g) => modality.goals.includes(g));
  const matchedConditions = intake.conditions.filter((c) => c !== "none" && modality.conditions.includes(c));

  const parts: string[] = [];

  if (matchedGoals.length > 0) {
    const goalLabels = matchedGoals.map((g) =>
      g.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
    parts.push(`Matched to your goal${goalLabels.length > 1 ? "s" : ""}: ${goalLabels.join(", ")}.`);
  }

  if (matchedConditions.length > 0) {
    const condLabels = matchedConditions.map((c) =>
      c.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
    parts.push(`Particularly beneficial for ${condLabels.join(" and ")}.`);
  }

  if (modality.hsaEligible) {
    parts.push("HSA/FSA-eligible — check your plan for reimbursement.");
  }

  if (modality.evidenceLevel === "Strong") {
    parts.push("Backed by strong clinical evidence for your stated goals.");
  }

  return parts.join(" ") || modality.description;
}

export function generatePlan(intake: IntakeData): Plan {
  const scored = MODALITIES.map((modality) => ({
    modality,
    score: scoreModality(modality, intake),
  })).filter((m) => m.score > -999);

  scored.sort((a, b) => b.score - a.score);

  const included: PlanItem[] = [];
  const deprioritized: PlanItem[] = [];
  let runningCost = 0;

  for (const { modality, score } of scored) {
    const { frequency, monthlyCost } = estimateFrequency(modality, intake.budget);

    if (score <= 0) {
      // Low relevance — skip entirely
      continue;
    }

    if (runningCost + monthlyCost <= intake.budget && included.length < 6) {
      included.push({
        modality,
        score,
        frequency,
        estimatedMonthlyCost: monthlyCost,
        rationale: buildRationale(modality, intake),
      });
      runningCost += monthlyCost;
    } else if (deprioritized.length < 4) {
      deprioritized.push({
        modality,
        score,
        frequency,
        estimatedMonthlyCost: monthlyCost,
        rationale: buildRationale(modality, intake),
      });
    }
  }

  const totalMonthlyCost = runningCost;
  const budgetUtilization = Math.min(100, Math.round((totalMonthlyCost / intake.budget) * 100));

  return { included, deprioritized, totalMonthlyCost, budgetUtilization };
}
