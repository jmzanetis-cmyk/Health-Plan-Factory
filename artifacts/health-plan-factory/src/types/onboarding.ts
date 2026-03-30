import { z } from "zod";

export const stepBudgetSchema = z.object({
  budget: z.number().min(50).max(1000),
});

export const stepGoalsSchema = z.object({
  goals: z.array(z.string()).min(1, "Select at least one goal"),
});

export const stepConditionsSchema = z.object({
  conditions: z.array(z.string()),
});

export const stepPreferencesSchema = z.object({
  preferences: z.array(z.string()).min(1, "Select at least one preference"),
});

export const stepExclusionsSchema = z.object({
  exclusions: z.array(z.string()),
});

export const stepRegionSchema = z.object({
  zipCode: z.string().regex(/^\d{5}$/, "Enter a valid 5-digit ZIP code"),
  radius: z.number().min(5).max(100),
  telehealth: z.boolean(),
});

export const intakeSchema = z.object({
  budget: stepBudgetSchema.shape.budget,
  goals: stepGoalsSchema.shape.goals,
  conditions: stepConditionsSchema.shape.conditions,
  preferences: stepPreferencesSchema.shape.preferences,
  exclusions: stepExclusionsSchema.shape.exclusions,
  zipCode: stepRegionSchema.shape.zipCode,
  radius: stepRegionSchema.shape.radius,
  telehealth: stepRegionSchema.shape.telehealth,
});

export type IntakeData = z.infer<typeof intakeSchema>;

export const GOALS = [
  { id: "pain-relief", label: "Pain Relief" },
  { id: "stress-reduction", label: "Stress Reduction" },
  { id: "mobility", label: "Mobility" },
  { id: "recovery", label: "Recovery" },
  { id: "posture", label: "Posture" },
  { id: "energy", label: "Energy" },
  { id: "fitness", label: "Fitness" },
  { id: "sleep", label: "Better Sleep" },
  { id: "nutrition", label: "Nutrition Support" },
  { id: "preventive", label: "Preventive Care" },
];

export const CONDITIONS = [
  { id: "back-pain", label: "Back Pain" },
  { id: "neck-pain", label: "Neck Pain" },
  { id: "stress", label: "Stress & Burnout" },
  { id: "anxiety", label: "Anxiety" },
  { id: "sedentary", label: "Sedentary Lifestyle" },
  { id: "recovery-needs", label: "Recovery Needs" },
  { id: "poor-flexibility", label: "Poor Flexibility" },
  { id: "digestive", label: "Digestive Concerns" },
  { id: "none", label: "None of these" },
];

export const PREFERENCES = [
  { id: "in-person", label: "In-Person" },
  { id: "virtual", label: "Virtual / Telehealth" },
  { id: "low-touch", label: "Low-Touch" },
  { id: "high-accountability", label: "High Accountability" },
  { id: "mind-body", label: "Mind-Body Focus" },
  { id: "exercise-based", label: "Exercise-Based" },
  { id: "recovery-based", label: "Recovery-Based" },
  { id: "clinically-guided", label: "Clinically Guided" },
  { id: "gentle", label: "Gentle / Beginner" },
];

export const EXCLUSIONS = [
  { id: "no-chiro", label: "Avoid Chiropractic" },
  { id: "no-needles", label: "Avoid Needles" },
  { id: "no-group", label: "No Group Classes" },
  { id: "no-hiit", label: "No High-Intensity" },
  { id: "mobility-limits", label: "Mobility Limitations" },
  { id: "pregnancy-safe", label: "Pregnancy-Safe Only" },
];

export const RADIUS_OPTIONS = [5, 10, 15, 25, 50, 100];
