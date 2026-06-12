export interface NpiCategory {
  label: string;
  taxonomy: string;
  taxonomyDesc: string;
  hsaEligible: boolean;
  costNote: string;
  costs: {
    initial: [number, number];
    followup: [number, number];
    monthly: [number, number] | null;
  };
}

export const NPI_CATEGORIES: Record<string, NpiCategory> = {
  massage: {
    label: "Massage Therapists",
    taxonomy: "225700000X",
    taxonomyDesc: "Massage Therapist",
    hsaEligible: true,
    costNote: "Medical massage with a physician Rx may qualify for HSA/FSA",
    costs: { initial: [80, 160], followup: [70, 140], monthly: null },
  },
  chiropractic: {
    label: "Chiropractors",
    taxonomy: "111N00000X",
    taxonomyDesc: "Chiropractor",
    hsaEligible: true,
    costNote: "Package plans (10–20 visits) are often 20–30% cheaper",
    costs: { initial: [100, 250], followup: [45, 100], monthly: null },
  },
  acupuncture: {
    label: "Acupuncturists",
    taxonomy: "171100000X",
    taxonomyDesc: "Acupuncturist",
    hsaEligible: true,
    costNote: "Package sessions (5–10) typically discounted 15–25%",
    costs: { initial: [100, 200], followup: [65, 120], monthly: null },
  },
  "physical-therapy": {
    label: "Physical Therapists",
    taxonomy: "225100000X",
    taxonomyDesc: "Physical Therapist",
    hsaEligible: true,
    costNote: "Often covered by insurance; check your out-of-pocket first",
    costs: { initial: [150, 300], followup: [75, 150], monthly: null },
  },
  "registered-dietitian": {
    label: "Registered Dietitians",
    taxonomy: "133V00000X",
    taxonomyDesc: "Dietitian",
    hsaEligible: true,
    costNote: "Often covered when linked to a diagnosed condition",
    costs: { initial: [100, 200], followup: [75, 150], monthly: null },
  },
  dpc: {
    label: "Concierge / DPC Physicians",
    taxonomy: "208D00000X",
    taxonomyDesc: "General Practice",
    hsaEligible: true,
    costNote: "Monthly retainer; labs and LMNs for HSA billing billed separately",
    costs: { initial: [300, 600], followup: [150, 300], monthly: [150, 250] },
  },
  shiatsu: {
    label: "Massage Therapists (Shiatsu / Bodywork)",
    taxonomy: "225700000X",
    taxonomyDesc: "Massage Therapist",
    hsaEligible: true,
    costNote: "Shiatsu with a physician referral may be HSA/FSA-eligible",
    costs: { initial: [80, 160], followup: [70, 140], monthly: null },
  },
  "herbal-medicine": {
    label: "Naturopathic Physicians",
    taxonomy: "175F00000X",
    taxonomyDesc: "Naturopath",
    hsaEligible: false,
    costNote: "Licensed NDs may qualify for HSA in some states; check your plan",
    costs: { initial: [120, 250], followup: [75, 150], monthly: null },
  },
};

export function getModalityNpiCategory(modalityId: string): NpiCategory | null {
  return NPI_CATEGORIES[modalityId] ?? null;
}
