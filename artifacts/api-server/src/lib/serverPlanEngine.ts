/**
 * Server-side plan engine — mirrors the frontend logic in planEngine.ts but
 * operates on DB Modality rows instead of local TypeScript data.
 */

import type { Modality } from "@workspace/db";

export interface IntakeInput {
  budget: number;
  goals: string[];
  conditions: string[];
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
}

function scoreModality(modality: Modality, intake: IntakeInput): number {
  let score = 0;

  for (const goal of intake.goals) {
    if ((modality.goals as string[]).includes(goal)) score += 3;
  }
  for (const cond of intake.conditions) {
    if (cond !== "none" && (modality.conditions as string[]).includes(cond)) score += 4;
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

export function runPlanEngine(modalities: Modality[], intake: IntakeInput): GeneratedPlan {
  const scored = modalities
    .map((m) => ({ modality: m, score: scoreModality(m, intake) }))
    .filter((m) => m.score > -999);

  scored.sort((a, b) => b.score - a.score);

  const items: ScoredItem[] = [];
  let runningCost = 0;
  let includedCount = 0;
  let deprioritizedCount = 0;

  for (const { modality, score } of scored) {
    if (score <= 0) continue;
    const { frequency, monthlyCost } = estimateFrequency(modality, intake.budget);

    if (runningCost + monthlyCost <= intake.budget && includedCount < 6) {
      items.push({ modality, score, frequency, estimatedMonthlyCost: monthlyCost, rationale: buildRationale(modality, intake), isDeprioritized: false });
      runningCost += monthlyCost;
      includedCount++;
    } else if (deprioritizedCount < 4) {
      items.push({ modality, score, frequency, estimatedMonthlyCost: monthlyCost, rationale: buildRationale(modality, intake), isDeprioritized: true });
      deprioritizedCount++;
    }
  }

  const totalMonthlyCost = runningCost;
  const budgetUtilization = Math.min(100, Math.round((totalMonthlyCost / intake.budget) * 100));

  return { totalMonthlyCost, budgetUtilization, items };
}
