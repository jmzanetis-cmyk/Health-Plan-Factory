import { describe, it, expect, beforeEach, vi } from "vitest";
import { generatePlan, planSchema } from "@/lib/planEngine";
import { intakeSchema, type IntakeData } from "@/types/onboarding";

/**
 * Integration test: onboarding → sessionStorage → plan hydration
 *
 * Tests the exact data flow that Onboarding.tsx → Plan.tsx executes:
 *  1. Generate plan from valid intake
 *  2. Serialize both to sessionStorage (JSON.stringify)
 *  3. Deserialize and validate (intakeSchema.safeParse + array guard)
 *  4. Assert plan data survives the roundtrip without corruption
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

  it("plan and intake survive a full JSON.stringify/parse roundtrip", () => {
    const plan = generatePlan(VALID_INTAKE);

    // Simulate what Onboarding.tsx does before navigating to /plan
    sessionStorageMock.setItem("hpf_plan", JSON.stringify(plan));
    sessionStorageMock.setItem("hpf_intake", JSON.stringify(VALID_INTAKE));

    // Simulate what Plan.tsx does on mount
    const rawIntake = JSON.parse(sessionStorageMock.getItem("hpf_intake")!);
    const intakeResult = intakeSchema.safeParse(rawIntake);
    expect(intakeResult.success).toBe(true);

    const rawPlan = JSON.parse(sessionStorageMock.getItem("hpf_plan")!);
    const planResult = planSchema.safeParse(rawPlan);
    expect(planResult.success).toBe(true);
    if (planResult.success) {
      expect(planResult.data.included.length).toBeGreaterThan(0);
    }
  });

  it("malformed intake is rejected by the validation guard", () => {
    sessionStorageMock.setItem("hpf_intake", JSON.stringify({ budget: "not-a-number" }));
    sessionStorageMock.setItem("hpf_plan", JSON.stringify({ included: [] }));

    const rawIntake = JSON.parse(sessionStorageMock.getItem("hpf_intake")!);
    const intakeResult = intakeSchema.safeParse(rawIntake);
    expect(intakeResult.success).toBe(false);
  });

  it("malformed plan (missing required fields) is rejected by planSchema", () => {
    sessionStorageMock.setItem("hpf_intake", JSON.stringify(VALID_INTAKE));
    sessionStorageMock.setItem("hpf_plan", JSON.stringify({ totalMonthlyCost: 0 }));

    const rawPlan = JSON.parse(sessionStorageMock.getItem("hpf_plan")!);
    const planResult = planSchema.safeParse(rawPlan);
    expect(planResult.success).toBe(false);
  });

  it("plan includes all expected PlanItem fields after roundtrip", () => {
    const plan = generatePlan(VALID_INTAKE);
    sessionStorageMock.setItem("hpf_plan", JSON.stringify(plan));

    const rawPlan = JSON.parse(sessionStorageMock.getItem("hpf_plan")!);
    const firstItem = rawPlan.included[0];

    expect(firstItem).toHaveProperty("modality");
    expect(firstItem).toHaveProperty("score");
    expect(firstItem).toHaveProperty("frequency");
    expect(firstItem).toHaveProperty("estimatedMonthlyCost");
    expect(firstItem).toHaveProperty("rationale");
    expect(typeof firstItem.estimatedMonthlyCost).toBe("number");
  });
});
