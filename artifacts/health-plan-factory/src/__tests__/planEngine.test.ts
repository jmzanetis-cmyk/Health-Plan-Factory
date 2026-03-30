import { describe, it, expect } from "vitest";
import { generatePlan } from "@/lib/planEngine";
import type { IntakeData } from "@/types/onboarding";

const BASE_INTAKE: IntakeData = {
  budget: 300,
  goals: [],
  conditions: [],
  preferences: ["in-person"],
  exclusions: [],
  zipCode: "90210",
  radius: 25,
  telehealth: false,
};

describe("planEngine – named scenario rules", () => {
  it("Scenario 1: stress + anxiety + sleep → meditation, yoga, or telehealth appear in top 3", () => {
    const intake: IntakeData = {
      ...BASE_INTAKE,
      budget: 200,
      goals: ["stress-reduction", "sleep"],
      conditions: ["stress", "anxiety"],
      preferences: ["mind-body", "virtual"],
      telehealth: true,
    };
    const plan = generatePlan(intake);
    const topThreeIds = plan.included.slice(0, 3).map((p) => p.modality.id);
    const stressModalityInTop3 = topThreeIds.some((id) =>
      ["meditation", "yoga", "telehealth"].includes(id)
    );
    expect(stressModalityInTop3).toBe(true);
  });

  it("Scenario 2: back pain + posture → PT, massage, or acupuncture appear in top 4", () => {
    const intake: IntakeData = {
      ...BASE_INTAKE,
      budget: 400,
      goals: ["pain-relief", "posture"],
      conditions: ["back-pain", "neck-pain"],
      preferences: ["in-person", "clinically-guided"],
    };
    const plan = generatePlan(intake);
    const topFourIds = plan.included.slice(0, 4).map((p) => p.modality.id);
    const backModality = topFourIds.filter((id) =>
      ["physical-therapy", "massage", "acupuncture", "pilates"].includes(id)
    );
    // At least 2 of the structural modalities appear in top 4
    expect(backModality.length).toBeGreaterThanOrEqual(2);
  });

  it("Scenario 3: fitness + high-accountability → personal-training or pilates are #1 or #2", () => {
    const intake: IntakeData = {
      ...BASE_INTAKE,
      budget: 500,
      goals: ["fitness", "energy"],
      conditions: ["sedentary"],
      preferences: ["exercise-based", "high-accountability", "in-person"],
    };
    const plan = generatePlan(intake);
    const topTwoIds = plan.included.slice(0, 2).map((p) => p.modality.id);
    const fitnessModalityInTop2 = topTwoIds.some((id) =>
      ["personal-training", "pilates"].includes(id)
    );
    expect(fitnessModalityInTop2).toBe(true);
  });

  it("Scenario 4: preventive goals → DPC, telehealth, or RD appear in top 4", () => {
    const intake: IntakeData = {
      ...BASE_INTAKE,
      budget: 250,
      goals: ["preventive", "nutrition"],
      conditions: [],
      preferences: ["clinically-guided", "virtual"],
      telehealth: true,
    };
    const plan = generatePlan(intake);
    const topFourIds = plan.included.slice(0, 4).map((p) => p.modality.id);
    const preventiveModalityInTop4 = topFourIds.some((id) =>
      ["dpc", "telehealth", "registered-dietitian"].includes(id)
    );
    expect(preventiveModalityInTop4).toBe(true);
  });

  it("Exclusions: mobility-limits hard-blocks personal-training and pilates from all results", () => {
    const intake: IntakeData = {
      ...BASE_INTAKE,
      budget: 500,
      goals: ["fitness"],
      conditions: ["sedentary"],
      preferences: ["exercise-based", "high-accountability"],
      exclusions: ["mobility-limits"],
    };
    const plan = generatePlan(intake);
    const allIds = [
      ...plan.included.map((p) => p.modality.id),
      ...plan.deprioritized.map((p) => p.modality.id),
    ];
    expect(allIds).not.toContain("personal-training");
    expect(allIds).not.toContain("pilates");
  });

  it("Exclusions: pregnancy-safe hard-blocks chiropractic, acupuncture, personal-training from all results", () => {
    const intake: IntakeData = {
      ...BASE_INTAKE,
      budget: 600,
      goals: ["pain-relief", "mobility"],
      conditions: ["back-pain"],
      preferences: ["in-person"],
      exclusions: ["pregnancy-safe"],
    };
    const plan = generatePlan(intake);
    const allIds = [
      ...plan.included.map((p) => p.modality.id),
      ...plan.deprioritized.map((p) => p.modality.id),
    ];
    expect(allIds).not.toContain("chiropractic");
    expect(allIds).not.toContain("acupuncture");
    expect(allIds).not.toContain("personal-training");
  });
});
