import { describe, it, expect, beforeEach, vi } from "vitest";
import { generatePlan, serializePlan, deserializePlan, planSchema } from "@/lib/planEngine";
import { intakeSchema, type IntakeData } from "@/types/onboarding";

/**
 * Integration test: onboarding → sessionStorage → plan hydration
 *
 * Tests the exact data flow that Onboarding.tsx → Plan.tsx executes:
 *  1. generatePlan produces a Plan
 *  2. serializePlan converts it to PersistedPlan (modality → modalityId)
 *  3. JSON.stringify → sessionStorage → JSON.parse
 *  4. planSchema.safeParse validates the stored shape
 *  5. deserializePlan rehydrates full Modality objects from MODALITIES
 */

const VALID_INTAKE: IntakeData = {
  budget: 350,
  goals: ["stress-reduction", "fitness"],
  conditions: ["stress", "sedentary"],
  preferences: ["mind-body", "in-person"],
  exclusions: [],
  zipCode: "90210",
  radius: 25,
  telehealth: false,
};

// Minimal sessionStorage stub for Node environment
const sessionStorageStub: Record<string, string> = {};
const sessionStorageMock = {
  getItem: (key: string) => sessionStorageStub[key] ?? null,
  setItem: (key: string, value: string) => { sessionStorageStub[key] = value; },
  removeItem: (key: string) => { delete sessionStorageStub[key]; },
  clear: () => { Object.keys(sessionStorageStub).forEach((k) => delete sessionStorageStub[k]); },
};

vi.stubGlobal("sessionStorage", sessionStorageMock);

describe("Onboarding → sessionStorage → Plan hydration integration", () => {
  beforeEach(() => {
    sessionStorageMock.clear();
  });

  it("plan survives full serialize → JSON roundtrip → validate → deserialize", () => {
    const plan = generatePlan(VALID_INTAKE);

    // Simulate Onboarding.tsx: serialize + store
    sessionStorageMock.setItem("hpf_intake", JSON.stringify(VALID_INTAKE));
    sessionStorageMock.setItem("hpf_plan", JSON.stringify(serializePlan(plan)));

    // Simulate Plan.tsx: parse + validate
    const rawIntake = JSON.parse(sessionStorageMock.getItem("hpf_intake")!);
    const intakeResult = intakeSchema.safeParse(rawIntake);
    expect(intakeResult.success).toBe(true);

    const rawPlan = JSON.parse(sessionStorageMock.getItem("hpf_plan")!);
    const planResult = planSchema.safeParse(rawPlan);
    expect(planResult.success).toBe(true);

    if (planResult.success) {
      const rehydrated = deserializePlan(planResult.data);
      expect(rehydrated).not.toBeNull();
      expect(rehydrated!.included.length).toBeGreaterThan(0);
      // Rehydrated modality must have full fields (not just id)
      const firstItem = rehydrated!.included[0];
      expect(firstItem.modality).toHaveProperty("name");
      expect(firstItem.modality).toHaveProperty("emoji");
      expect(firstItem.modality).toHaveProperty("evidenceLevel");
    }
  });

  it("malformed intake is rejected by intakeSchema", () => {
    sessionStorageMock.setItem("hpf_intake", JSON.stringify({ budget: "not-a-number" }));

    const rawIntake = JSON.parse(sessionStorageMock.getItem("hpf_intake")!);
    const intakeResult = intakeSchema.safeParse(rawIntake);
    expect(intakeResult.success).toBe(false);
  });

  it("malformed plan (missing required fields) is rejected by planSchema", () => {
    sessionStorageMock.setItem("hpf_plan", JSON.stringify({ totalMonthlyCost: 0 }));

    const rawPlan = JSON.parse(sessionStorageMock.getItem("hpf_plan")!);
    const planResult = planSchema.safeParse(rawPlan);
    expect(planResult.success).toBe(false);
  });

  it("plan with unknown modalityId is rejected by deserializePlan", () => {
    const plan = generatePlan(VALID_INTAKE);
    const persisted = serializePlan(plan);

    // Tamper one modality ID
    if (persisted.included.length > 0) {
      persisted.included[0].modalityId = "does-not-exist";
    }

    sessionStorageMock.setItem("hpf_plan", JSON.stringify(persisted));
    const rawPlan = JSON.parse(sessionStorageMock.getItem("hpf_plan")!);
    const planResult = planSchema.safeParse(rawPlan);
    expect(planResult.success).toBe(true); // schema is fine — ID is still a string

    if (planResult.success) {
      const rehydrated = deserializePlan(planResult.data);
      expect(rehydrated).toBeNull(); // lookup fails → null
    }
  });

  it("PersistedPlan stores modalityId (not full modality object)", () => {
    const plan = generatePlan(VALID_INTAKE);
    const persisted = serializePlan(plan);

    expect(typeof persisted.included[0].modalityId).toBe("string");
    expect((persisted.included[0] as Record<string, unknown>).modality).toBeUndefined();
  });
});
