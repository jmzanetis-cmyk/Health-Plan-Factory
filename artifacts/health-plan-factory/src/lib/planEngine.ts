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
  const typicalStr = modality.typicalFrequency; // e.g. "2×/month"
  const match = typicalStr.match(/(\d+)/);
  const typicalSessions = match ? parseInt(match[1]) : 2;

  const costPerSession = midCost;
  const canAffordSessions = Math.max(1, Math.floor((budget * 0.35) / costPerSession));
  const sessions = Math.min(typicalSessions, canAffordSessions);

  const monthlyCost = Math.round(sessions * costPerSession);
  const frequency = sessions === 1 ? "1×/month" : sessions <= 4 ? `${sessions}×/month` : `${Math.ceil(sessions / 4)}×/week`;

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
