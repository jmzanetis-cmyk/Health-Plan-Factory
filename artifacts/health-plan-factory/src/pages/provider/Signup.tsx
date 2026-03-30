import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { useAuth } from "@workspace/replit-auth-web";
import { ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const step1Schema = z.object({
  name: z.string().min(2, "Practice name required"),
  phone: z.string().optional(),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});
const step2Schema = z.object({
  city: z.string().min(1, "City required"),
  state: z.string().min(2, "State required"),
  zipCode: z.string().regex(/^\d{5}$/, "5-digit ZIP required"),
  offersTelehealth: z.boolean(),
});
const step3Schema = z.object({
  bio: z.string().min(30, "Please write at least 30 characters").max(800),
  acceptsInsurance: z.boolean(),
  costPerSession: z.coerce.number().min(0).max(10000).optional(),
  modalityIds: z.array(z.string()).min(1, "Select at least one modality"),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;

interface Modality {
  id: string;
  name: string;
  category: string;
}

const STEPS = ["Practice info", "Location", "Specialties & bio"];

const inputStyle = {
  border: "1px solid rgba(27,45,79,0.15)",
  background: "var(--warm-white)",
  color: "var(--navy)",
  fontFamily: "var(--app-font-sans)",
};
const labelStyle = { color: "var(--navy)", fontFamily: "var(--app-font-sans)" };
const errorStyle = { color: "#c0392b", fontFamily: "var(--app-font-sans)" };

export default function ProviderSignup() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Step1 & Step2 & Step3>>({});

  useEffect(() => {
    fetch(`${BASE}/api/modalities`)
      .then((r) => r.json())
      .then((data: Modality[]) => setModalities(data))
      .catch(() => {});
  }, []);

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema), defaultValues: formData });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema), defaultValues: { offersTelehealth: false, ...formData } });
  const form3 = useForm<Step3>({ resolver: zodResolver(step3Schema), defaultValues: { acceptsInsurance: false, modalityIds: [], ...formData } });

  const nextStep = async (data: Step1 | Step2) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep((s) => s + 1);
  };

  const handleFinalSubmit = async (data: Step3) => {
    const payload = { ...formData, ...data };
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${BASE}/api/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...payload,
          costPerSession: payload.costPerSession ? Number(payload.costPerSession) : undefined,
          website: payload.website || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Error ${res.status}`);
      }
      navigate("/provider/dashboard");
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed");
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--warm-white)" }}>
        <Loader2 className="animate-spin" size={28} style={{ color: "var(--navy)" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ background: "var(--warm-white)" }}>
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6"><Logo variant="auth" /></div>
          <h1 className="mb-3" style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.75rem", fontWeight: 700, color: "var(--navy)" }}>
            Provider Application
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            Sign in first to apply as a founding provider.
          </p>
          <button
            onClick={() => login()}
            className="w-full py-3.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-3"
            style={{ background: "var(--navy)", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
          >
            Sign in to apply →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 md:px-12 py-16" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6"><Logo variant="auth" /></div>
          <h1 className="mb-2" style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)" }}>
            Provider Application
          </h1>
          <p className="text-sm font-light" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            Join as a founding provider — 0% commission for your first 90 days
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: i < step ? "var(--sage)" : i === step ? "var(--navy)" : "rgba(27,45,79,0.1)",
                    color: i <= step ? "white" : "var(--text-muted)",
                  }}
                >
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className="hidden sm:block text-xs font-medium" style={{ color: i === step ? "var(--navy)" : "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="w-8 h-px" style={{ background: "rgba(27,45,79,0.12)" }} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-8 md:p-10" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)", boxShadow: "0 8px 32px rgba(27,45,79,0.06)" }}>
          {/* Step 1 */}
          {step === 0 && (
            <form onSubmit={form1.handleSubmit(nextStep)} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Practice or provider name *</label>
                <input {...form1.register("name")} placeholder="Austin Integrative Health" className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                {form1.formState.errors.name && <p className="text-xs mt-1" style={errorStyle}>{form1.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Phone number</label>
                <input {...form1.register("phone")} type="tel" placeholder="(512) 555-0100" className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Website</label>
                <input {...form1.register("website")} type="url" placeholder="https://yourpractice.com" className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                {form1.formState.errors.website && <p className="text-xs mt-1" style={errorStyle}>{form1.formState.errors.website.message}</p>}
              </div>
              <div className="mt-2 flex justify-end">
                <button type="submit" className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--navy)", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* Step 2 */}
          {step === 1 && (
            <form onSubmit={form2.handleSubmit(nextStep)} className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>City *</label>
                  <input {...form2.register("city")} placeholder="Austin" className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                  {form2.formState.errors.city && <p className="text-xs mt-1" style={errorStyle}>{form2.formState.errors.city.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>State *</label>
                  <input {...form2.register("state")} placeholder="TX" maxLength={2} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                  {form2.formState.errors.state && <p className="text-xs mt-1" style={errorStyle}>{form2.formState.errors.state.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>ZIP code *</label>
                <input {...form2.register("zipCode")} placeholder="78701" maxLength={5} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                {form2.formState.errors.zipCode && <p className="text-xs mt-1" style={errorStyle}>{form2.formState.errors.zipCode.message}</p>}
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg" style={{ background: "rgba(27,45,79,0.03)", border: "1px solid rgba(27,45,79,0.08)" }}>
                <input type="checkbox" {...form2.register("offersTelehealth")} className="w-4 h-4 accent-navy" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>Offer telehealth / virtual sessions</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Expand your reach to members statewide</p>
                </div>
              </label>
              <div className="mt-2 flex justify-between">
                <button type="button" onClick={() => setStep(0)} className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium" style={{ border: "1.5px solid rgba(27,45,79,0.2)", color: "var(--navy)", background: "transparent", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}>
                  <ChevronLeft size={16} /> Back
                </button>
                <button type="submit" className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--navy)", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* Step 3 */}
          {step === 2 && (
            <form onSubmit={form3.handleSubmit(handleFinalSubmit)} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Your bio / practice description *</label>
                <textarea {...form3.register("bio")} rows={4} placeholder="Tell members about your approach, training, and what makes your practice unique..." className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none" style={inputStyle} />
                {form3.formState.errors.bio && <p className="text-xs mt-1" style={errorStyle}>{form3.formState.errors.bio.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={labelStyle}>Modalities offered * (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {modalities.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Loading modalities...</p>
                  ) : (
                    modalities.map((m) => {
                      const selected = form3.watch("modalityIds")?.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            const cur = form3.getValues("modalityIds") || [];
                            form3.setValue("modalityIds", selected ? cur.filter((id) => id !== m.id) : [...cur, m.id], { shouldValidate: true });
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                          style={{
                            background: selected ? "var(--navy)" : "rgba(27,45,79,0.05)",
                            color: selected ? "white" : "var(--navy)",
                            border: `1.5px solid ${selected ? "var(--navy)" : "rgba(27,45,79,0.12)"}`,
                            cursor: "pointer",
                            fontFamily: "var(--app-font-sans)",
                          }}
                        >
                          {m.name}
                        </button>
                      );
                    })
                  )}
                </div>
                {form3.formState.errors.modalityIds && <p className="text-xs mt-1" style={errorStyle}>{form3.formState.errors.modalityIds.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Cost per session ($)</label>
                  <input {...form3.register("costPerSession")} type="number" min={0} placeholder="150" className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...form3.register("acceptsInsurance")} className="w-4 h-4" />
                    <span className="text-sm" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>Accepts insurance</span>
                  </label>
                </div>
              </div>
              {submitError && (
                <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.15)", color: "#c0392b", fontFamily: "var(--app-font-sans)" }}>
                  {submitError}
                </div>
              )}
              <div className="mt-2 flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium" style={{ border: "1.5px solid rgba(27,45,79,0.2)", color: "var(--navy)", background: "transparent", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}>
                  <ChevronLeft size={16} /> Back
                </button>
                <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white" style={{ background: submitting ? "rgba(27,45,79,0.4)" : "var(--navy)", border: "none", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "var(--app-font-sans)" }}>
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {submitting ? "Submitting..." : "Submit application →"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 rounded-xl p-5" style={{ background: "rgba(184,137,42,0.06)", border: "1px solid rgba(184,137,42,0.12)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
            <strong style={{ color: "var(--hpf-amber)" }}>Founding Provider Program:</strong>{" "}
            Providers who join during our early access period pay <strong>0% commission</strong> on bookings for 90 days.
            After that, a small platform fee applies. Limited spots available.
          </p>
        </div>
      </div>
    </div>
  );
}
