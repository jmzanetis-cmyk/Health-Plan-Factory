/**
 * Server-side plan engine — mirrors the frontend logic in planEngine.ts but
 * operates on DB Modality rows instead of local TypeScript data.
 */

import type { Modality } from "@workspace/db";

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

function scoreModality(modality: Modality, intake: IntakeInput): number {
  let score = 0;

  for (const goal of intake.goals) {
    if ((modality.goals as string[]).includes(goal)) score += 3;
  }

  const weightMap = Object.fromEntries(
    (intake.conditionWeights ?? []).map((w) => [w.id, w])
  );
  for (const cond of intake.conditions) {
    if (cond !== "none" && (modality.conditions as string[]).includes(cond)) {
      const w = weightMap[cond];
      const mult = w
        ? (SEVERITY_MULT[w.severity] ?? 1) * (PRIORITY_MULT[w.priority] ?? 1)
        : 1;
      score += Math.round(4 * mult);
    }
  }
  for (const pref of intake.preferences) {
    if ((modality.preferenceMatch as string[]).includes(pref)) score += 2;
  }

  if (intake.telehealth && modality.category === "telehealth") score += 3;
  if (intake.telehealth && (modality.preferenceMatch as string[]).includes("virtual")) score += 2;

  if (modality.evidenceLevel === "Strong") score += 2;
  else if (modality.evidenceLevel === "Moderate") score += 1;

  if (modality.hsaEligible && intake.budget < 250) score += 2;

  // Scenario rules
  const hasStressOrAnxiety =
    intake.conditions.some((c) => ["stress", "anxiety"].includes(c)) ||
    intake.goals.some((g) => ["stress-reduction", "sleep"].includes(g));
  if (hasStressOrAnxiety && ["meditation", "yoga", "telehealth"].includes(modality.id)) score += 5;

  const hasBackOrPosture =
    intake.conditions.includes("back-pain") || intake.goals.includes("posture");
  if (hasBackOrPosture && ["physical-therapy", "pilates", "massage", "chiropractic", "acupuncture"].includes(modality.id)) score += 5;

  if (intake.budget < 150 && ["meditation", "yoga", "nutrition-coach"].includes(modality.id)) score += 3;

  const hasFitnessNeed = intake.conditions.includes("sedentary") || intake.goals.includes("fitness");
  const wantsAccountability = intake.preferences.includes("high-accountability");
  if (hasFitnessNeed && wantsAccountability && ["personal-training", "pilates"].includes(modality.id)) score += 6;
  else if (hasFitnessNeed && ["personal-training", "pilates"].includes(modality.id)) score += 3;

  const isPreventive = intake.goals.includes("preventive") || intake.goals.includes("nutrition");
  if (isPreventive && ["dpc", "telehealth", "registered-dietitian"].includes(modality.id)) score += 4;

  if (intake.telehealth && intake.preferences.includes("virtual") && ["telehealth", "meditation", "nutrition-coach"].includes(modality.id)) score += 4;

  // Weight loss scenario
  const hasWeightLoss = intake.goals.includes("weight-loss") || (intake.conditions.includes("sedentary") && intake.goals.includes("fitness"));
  if (hasWeightLoss && ["weight-loss-coaching", "personal-training"].includes(modality.id)) score += 6;
  if (hasWeightLoss && ["herbal-medicine", "nutrition-coach", "registered-dietitian"].includes(modality.id)) score += 3;

  // Mind-body expansion
  const wantsMindBody = intake.preferences.includes("mind-body") || intake.goals.includes("stress-reduction");
  if (wantsMindBody && ["qigong", "tai-chi", "breathwork"].includes(modality.id)) score += 5;
  if (hasStressOrAnxiety && ["qigong", "breathwork"].includes(modality.id)) score += 4;

  // Recovery expansion
  const hasRecovery = intake.goals.includes("recovery") || intake.conditions.includes("recovery-needs");
  if (hasRecovery && ["cold-therapy", "infrared-sauna", "shiatsu"].includes(modality.id)) score += 5;

  // Back/neck pain expansion
  if (hasBackOrPosture && ["shiatsu", "tai-chi", "infrared-sauna"].includes(modality.id)) score += 3;

  // Budget-friendly mind-body
  if (intake.budget < 150 && ["breathwork", "qigong", "tai-chi"].includes(modality.id)) score += 3;

  // Hard block exclusions
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

function buildRationale(modality: Modality, intake: IntakeInput): string {
  const matchedGoals = intake.goals.filter((g) => (modality.goals as string[]).includes(g));
  const matchedConditions = intake.conditions.filter((c) => c !== "none" && (modality.conditions as string[]).includes(c));
  const parts: string[] = [];

  if (matchedGoals.length > 0) {
    const labels = matchedGoals.map((g) => g.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()));
    parts.push(`Matched to your goal${labels.length > 1 ? "s" : ""}: ${labels.join(", ")}.`);
  }
  if (matchedConditions.length > 0) {
    const labels = matchedConditions.map((c) => c.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()));
    parts.push(`Particularly beneficial for ${labels.join(" and ")}.`);
  }
  if (modality.hsaEligible) parts.push("HSA/FSA-eligible — check your plan for reimbursement.");
  if (modality.evidenceLevel === "Strong") parts.push("Backed by strong clinical evidence for your stated goals.");

  return parts.join(" ") || modality.description;
}

export interface GeneratedPlan {
  totalMonthlyCost: number;
  budgetUtilization: number;
  items: ScoredItem[];
}

/**
 * Run the plan engine with optional provider availability map.
 * Modalities that require in-person delivery and have zero nearby providers
 * are automatically moved to Deprioritized (not removed from the plan).
 * providerAvailability values are null when location is unknown (no zip),
 * numeric (including 0) when location is known.
 */
export function runPlanEngine(
  modalities: Modality[],
  intake: IntakeInput,
  providerAvailability?: Record<string, number | null>,
): GeneratedPlan {
  // Identify which modalities are force-deprioritized due to zero local providers.
  const forceDeprioritized = new Set<string>();
  if (providerAvailability) {
    for (const m of modalities) {
      const count = providerAvailability[m.id] ?? null;
      // Only force-deprioritize when count is definitively 0 (not null/unknown)
      // and the modality is not telehealth-based.
      if (count === 0 && m.category !== "telehealth") {
        forceDeprioritized.add(m.id);
      }
    }
  }

  const scored = modalities
    .map((m) => {
      const score = scoreModality(m, intake);
      return { modality: m, score };
    })
    // Hard-blocked exclusions (score === -999) are still fully removed.
    .filter((m) => m.score > -999);

  // Sort: force-deprioritized items sort to the bottom; among force-deprioritized
  // items sort by raw score so the best ones appear first in the deprioritized list.
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
    // Skip modalities that scored 0 or below (no relevance) unless they are
    // force-deprioritized — those still need to appear with a note.
    if (score <= 0 && !isForceDeprio) continue;

    const { frequency, monthlyCost } = estimateFrequency(modality, intake.budget);
    const nearbyProviderCount = providerAvailability ? (providerAvailability[modality.id] ?? null) : null;

    if (!isForceDeprio && runningCost + monthlyCost <= intake.budget && includedCount < 6) {
      items.push({ modality, score, frequency, estimatedMonthlyCost: monthlyCost, rationale: buildRationale(modality, intake), isDeprioritized: false, nearbyProviderCount });
      runningCost += monthlyCost;
      includedCount++;
    } else if (deprioritizedCount < 4) {
      items.push({ modality, score, frequency, estimatedMonthlyCost: monthlyCost, rationale: buildRationale(modality, intake), isDeprioritized: true, nearbyProviderCount });
      deprioritizedCount++;
    }
  }

  const totalMonthlyCost = runningCost;
  const budgetUtilization = Math.min(100, Math.round((totalMonthlyCost / intake.budget) * 100));

  return { totalMonthlyCost, budgetUtilization, items };
}
