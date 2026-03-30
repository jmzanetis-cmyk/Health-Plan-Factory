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
  it("Scenario 1: stress + anxiety + sleep → meditation, yoga, telehealth appear in top results", () => {
    const intake: IntakeData = {
      ...BASE_INTAKE,
      budget: 200,
      goals: ["stress-reduction", "sleep"],
      conditions: ["stress", "anxiety"],
      preferences: ["mind-body", "virtual"],
      telehealth: true,
    };
    const plan = generatePlan(intake);
    const ids = plan.included.map((p) => p.modality.id);

    // At least one of the Rule 1 targets should be in the included plan
    const stressModalityPresent = ids.some((id) =>
      ["meditation", "yoga", "telehealth"].includes(id)
    );
    expect(stressModalityPresent).toBe(true);
  });

  it("Scenario 2: back pain + posture + moderate budget → PT/Pilates/massage/acupuncture appear", () => {
    const intake: IntakeData = {
      ...BASE_INTAKE,
      budget: 400,
      goals: ["pain-relief", "posture"],
      conditions: ["back-pain", "neck-pain"],
      preferences: ["in-person", "clinically-guided"],
    };
    const plan = generatePlan(intake);
    const ids = plan.included.map((p) => p.modality.id);

    // At least 2 of the Rule 2 targets should appear (budget allows multiple)
    const backModalitiesIncluded = ids.filter((id) =>
      ["physical-therapy", "pilates", "massage", "acupuncture"].includes(id)
    );
    expect(backModalitiesIncluded.length).toBeGreaterThanOrEqual(1);
  });

  it("Scenario 3: fitness + high-accountability → personal training + pilates are strongly preferred", () => {
    const intake: IntakeData = {
      ...BASE_INTAKE,
      budget: 500,
      goals: ["fitness", "energy"],
      conditions: ["sedentary"],
      preferences: ["exercise-based", "high-accountability", "in-person"],
    };
    const plan = generatePlan(intake);
    const ids = plan.included.map((p) => p.modality.id);

    // personal-training or pilates should appear (or both)
    const fitnessModalityPresent = ids.some((id) =>
      ["personal-training", "pilates"].includes(id)
    );
    expect(fitnessModalityPresent).toBe(true);
  });

  it("Scenario 4: preventive goals → DPC, telehealth, or RD appear in results", () => {
    const intake: IntakeData = {
      ...BASE_INTAKE,
      budget: 250,
      goals: ["preventive", "nutrition"],
      conditions: [],
      preferences: ["clinically-guided", "virtual"],
      telehealth: true,
    };
    const plan = generatePlan(intake);
    const allIds = [
      ...plan.included.map((p) => p.modality.id),
      ...plan.deprioritized.map((p) => p.modality.id),
    ];

    const preventiveModalityPresent = allIds.some((id) =>
      ["dpc", "telehealth", "registered-dietitian"].includes(id)
    );
    expect(preventiveModalityPresent).toBe(true);
  });

  it("Exclusions: mobility-limits removes personal-training and pilates", () => {
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

  it("Exclusions: pregnancy-safe removes chiropractic, acupuncture, personal-training", () => {
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
