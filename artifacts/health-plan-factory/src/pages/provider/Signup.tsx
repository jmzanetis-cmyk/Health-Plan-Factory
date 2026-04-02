import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { useAuth } from "@workspace/replit-auth-web";
import { ChevronRight, ChevronLeft, Check, Loader2, Upload, CreditCard, CheckCircle, ExternalLink, FileCheck } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const step1Schema = z.object({
  name: z.string().min(2, "Practice or provider name required"),
  phone: z.string().optional(),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  credentials: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
});

const step2Schema = z.object({
  city: z.string().min(1, "City required"),
  state: z.string().min(2, "State required"),
  zipCode: z.string().regex(/^\d{5}$/, "5-digit ZIP required"),
  serviceRadiusMiles: z.coerce.number().min(0).max(500).optional(),
  offersTelehealth: z.boolean(),
  offersInPerson: z.boolean(),
  availabilityNotes: z.string().max(300).optional(),
}).refine((d) => d.offersTelehealth || d.offersInPerson, {
  message: "Select at least one service format",
  path: ["offersTelehealth"],
});

const modalityPricingSchema = z.object({
  costMin: z.coerce.number().min(0).max(10000).optional(),
  costMax: z.coerce.number().min(0).max(10000).optional(),
});

const step3Schema = z.object({
  bio: z.string().min(30, "Please write at least 30 characters").max(800),
  modalityIds: z.array(z.string()).min(1, "Select at least one modality"),
  modalityPricing: z.record(z.string(), modalityPricingSchema).optional(),
  acceptsInsurance: z.boolean(),
});

type Step1 = z.infer<typeof step1Schema>;
type Step2 = z.infer<typeof step2Schema>;
type Step3 = z.infer<typeof step3Schema>;

interface Modality {
  id: string;
  name: string;
  category: string;
}

const STEPS = ["Practice & credentials", "Location & format", "Specialties & pricing", "Listing payment"];

const inputStyle = {
  border: "1px solid rgba(212,34,126,0.15)",
  background: "var(--warm-white)",
  color: "var(--hpf-pink)",
  fontFamily: "var(--app-font-sans)",
};
const labelStyle = { color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" };
const errorStyle = { color: "#c0392b", fontFamily: "var(--app-font-sans)" };

export default function ProviderSignup() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Step1 & Step2 & Step3>>({});
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [stripeMode, setStripeMode] = useState<"live" | "demo" | null>(null);
  const [credentialDocPath, setCredentialDocPath] = useState<string | null>(null);
  const [credentialDocName, setCredentialDocName] = useState<string | null>(null);
  const credentialInputRef = useRef<HTMLInputElement | null>(null);

  const { uploadFile, isUploading: isUploadingCredential } = useUpload({
    basePath: `${BASE}/api/storage`,
    onSuccess: (response) => {
      setCredentialDocPath(response.objectPath);
    },
  });

  useEffect(() => {
    fetch(`${BASE}/api/modalities`)
      .then((r) => r.json())
      .then((data: Modality[]) => setModalities(data))
      .catch(() => {});
  }, []);

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema), defaultValues: formData });
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema), defaultValues: { offersTelehealth: false, offersInPerson: true, serviceRadiusMiles: 25, ...formData } });
  const form3 = useForm<Step3>({ resolver: zodResolver(step3Schema), defaultValues: { acceptsInsurance: false, modalityIds: [], ...formData } });

  const nextStep = async (data: Step1 | Step2) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinalSubmit = async (data: Step3) => {
    const payload = { ...formData, ...data };
    setSubmitting(true);
    setSubmitError(null);

    const modalityPricingRanges = (payload.modalityIds as string[]).map((id: string) => {
      const p = (payload.modalityPricing as Record<string, { costMin?: number; costMax?: number }> | undefined)?.[id];
      return { modalityId: id, costMin: p?.costMin ? Number(p.costMin) : undefined, costMax: p?.costMax ? Number(p.costMax) : undefined };
    });

    try {
      const res = await fetch(`${BASE}/api/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...payload,
          modalityPricingRanges,
          website: payload.website || undefined,
          serviceRadiusMiles: payload.serviceRadiusMiles ? Number(payload.serviceRadiusMiles) : undefined,
          credentialDocPath: credentialDocPath || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string })?.error ?? `Error ${res.status}`);
      }
      const created = await res.json();
      const newProviderId = created.id ?? null;
      setProviderId(newProviderId);
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed");
      setSubmitting(false);
    }
  };

  const handleListingCheckout = async () => {
    if (!providerId) return;
    setCheckoutLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${BASE}/api/providers/listing-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json() as { checkout_url?: string; error?: string };
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error(data.error ?? "Unexpected response from payment server");
      }
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Payment setup failed");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleDemoComplete = () => {
    navigate("/provider/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--warm-white)" }}>
        <Loader2 className="animate-spin" size={28} style={{ color: "var(--hpf-pink)" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ background: "var(--warm-white)" }}>
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6"><Logo variant="auth" /></div>
          <h1 className="mb-3" style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.75rem", fontWeight: 700, color: "var(--hpf-pink)" }}>
            Provider Application
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            Sign in first to apply as a founding provider.
          </p>
          <button
            onClick={() => login()}
            className="w-full py-3.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-3"
            style={{ background: "var(--hpf-pink)", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
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
          <h1 className="mb-2" style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-pink)" }}>
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
                    background: i < step ? "var(--sage)" : i === step ? "var(--hpf-pink)" : "rgba(212,34,126,0.1)",
                    color: i <= step ? "white" : "var(--text-muted)",
                  }}
                >
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className="hidden sm:block text-xs font-medium" style={{ color: i === step ? "var(--hpf-pink)" : "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className="w-8 h-px" style={{ background: "rgba(212,34,126,0.12)" }} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-8 md:p-10" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)", boxShadow: "0 8px 32px rgba(212,34,126,0.06)" }}>

          {/* Step 1 — Practice info & credentials */}
          {step === 0 && (
            <form onSubmit={form1.handleSubmit(nextStep)} className="flex flex-col gap-5">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.08em" }}>Practice information</p>

              {/* Photo upload placeholder */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Profile photo</label>
                <div
                  className="relative flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-all"
                  style={{ border: "2px dashed rgba(212,34,126,0.15)", background: "rgba(212,34,126,0.02)", minHeight: "72px" }}
                  onClick={() => setPhotoNote("Photo uploads will be available after your application is approved.")}
                >
                  <Upload size={20} style={{ color: "var(--text-muted)" }} />
                  <p className="text-xs text-center" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                    {photoNote ?? "Upload a professional headshot (available after approval)"}
                  </p>
                </div>
              </div>

              {/* Credential document upload */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>License / credential document</label>
                <div
                  className="relative flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-all"
                  style={{ border: credentialDocPath ? "2px solid rgba(125,181,92,0.4)" : "2px dashed rgba(212,34,126,0.15)", background: credentialDocPath ? "rgba(125,181,92,0.04)" : "rgba(212,34,126,0.02)", minHeight: "72px" }}
                  onClick={() => credentialInputRef.current?.click()}
                >
                  {isUploadingCredential ? (
                    <Loader2 size={20} className="animate-spin" style={{ color: "var(--hpf-pink)" }} />
                  ) : credentialDocPath ? (
                    <>
                      <FileCheck size={20} style={{ color: "var(--sage)" }} />
                      <p className="text-xs text-center font-medium" style={{ color: "var(--sage)", fontFamily: "var(--app-font-sans)" }}>
                        {credentialDocName ?? "Document uploaded"}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Click to replace</p>
                    </>
                  ) : (
                    <>
                      <Upload size={20} style={{ color: "var(--text-muted)" }} />
                      <p className="text-xs text-center" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                        Upload your license or certificate (PDF, JPG, PNG)
                      </p>
                    </>
                  )}
                  <input
                    ref={credentialInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setCredentialDocName(file.name);
                      await uploadFile(file);
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Used for verification only — not shown publicly. (Optional)</p>
              </div>

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

              <div style={{ borderTop: "1px solid rgba(212,34,126,0.06)", paddingTop: "16px" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.08em" }}>Credentials & licensing</p>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Professional credentials</label>
                    <input {...form1.register("credentials")} placeholder="e.g. RD, LMT, ACE-CPT, NMD" className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Abbreviations shown on your public profile</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>License number</label>
                      <input {...form1.register("licenseNumber")} placeholder="e.g. RD-123456" className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>License state</label>
                      <input {...form1.register("licenseState")} placeholder="TX" maxLength={2} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                    </div>
                  </div>
                  <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(224,32,64,0.06)", border: "1px solid rgba(224,32,64,0.12)", color: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)" }}>
                    License info is used for verification and not shown publicly.
                  </p>
                </div>
              </div>

              <div className="mt-2 flex justify-end">
                <button type="submit" className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--hpf-pink)", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* Step 2 — Location & service format */}
          {step === 1 && (
            <form onSubmit={form2.handleSubmit(nextStep)} className="flex flex-col gap-5">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.08em" }}>Location</p>
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
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>In-person service radius (miles)</label>
                <div className="flex items-center gap-3">
                  <input {...form2.register("serviceRadiusMiles")} type="number" min={0} max={500} placeholder="25" className="w-28 px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                  <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Leave blank if you only see patients at your office</span>
                </div>
              </div>

              <div style={{ borderTop: "1px solid rgba(212,34,126,0.06)", paddingTop: "16px" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.08em" }}>Session formats *</p>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg" style={{ background: "rgba(212,34,126,0.03)", border: "1px solid rgba(212,34,126,0.08)" }}>
                    <input type="checkbox" {...form2.register("offersInPerson")} className="w-4 h-4" />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>In-person sessions</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Members can book appointments at your location</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg" style={{ background: "rgba(212,34,126,0.03)", border: "1px solid rgba(212,34,126,0.08)" }}>
                    <input type="checkbox" {...form2.register("offersTelehealth")} className="w-4 h-4" />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>Telehealth / virtual sessions</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Expand your reach to members statewide</p>
                    </div>
                  </label>
                  {form2.formState.errors.offersTelehealth && <p className="text-xs" style={errorStyle}>{form2.formState.errors.offersTelehealth.message}</p>}
                </div>
              </div>

              <div style={{ borderTop: "1px solid rgba(212,34,126,0.06)", paddingTop: "16px" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.08em" }}>Availability & hours</p>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Typical hours / scheduling notes</label>
                  <textarea
                    {...form2.register("availabilityNotes")}
                    rows={3}
                    placeholder="e.g. Mon–Fri 9am–5pm, evening slots available on Tuesdays"
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none"
                    style={inputStyle}
                  />
                  {form2.formState.errors.availabilityNotes && <p className="text-xs mt-1" style={errorStyle}>{form2.formState.errors.availabilityNotes.message}</p>}
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Shown on your public profile to help members plan appointments.</p>
                </div>
              </div>

              <div className="mt-2 flex justify-between">
                <button type="button" onClick={() => setStep(0)} className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium" style={{ border: "1.5px solid rgba(212,34,126,0.2)", color: "var(--hpf-pink)", background: "transparent", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}>
                  <ChevronLeft size={16} /> Back
                </button>
                <button type="submit" className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white" style={{ background: "var(--hpf-pink)", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* Step 3 — Specialties, bio & pricing */}
          {step === 2 && (
            <form onSubmit={form3.handleSubmit(handleFinalSubmit)} className="flex flex-col gap-5">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.08em" }}>Specialties & bio</p>

              <div>
                <label className="block text-xs font-semibold mb-2" style={labelStyle}>Modalities offered * (select all that apply)</label>
                <div className="flex flex-wrap gap-2 mb-3">
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
                            background: selected ? "var(--hpf-pink)" : "rgba(212,34,126,0.05)",
                            color: selected ? "white" : "var(--hpf-pink)",
                            border: `1.5px solid ${selected ? "var(--hpf-pink)" : "rgba(212,34,126,0.12)"}`,
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
                {form3.formState.errors.modalityIds && <p className="text-xs mt-1 mb-2" style={errorStyle}>{form3.formState.errors.modalityIds.message}</p>}

                {(form3.watch("modalityIds") || []).length > 0 && (
                  <div className="flex flex-col gap-2 mt-1">
                    <p className="text-xs font-semibold" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Pricing per modality (optional — min / max $)</p>
                    {(form3.watch("modalityIds") || []).map((mId) => {
                      const mod = modalities.find((m) => m.id === mId);
                      return (
                        <div key={mId} className="flex items-center gap-2">
                          <span className="text-xs w-32 shrink-0" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", fontWeight: 500 }}>{mod?.name ?? mId}</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="Min $"
                            className="w-24 px-2 py-1.5 rounded-md text-xs outline-none"
                            style={inputStyle}
                            {...form3.register(`modalityPricing.${mId}.costMin`)}
                          />
                          <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>–</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="Max $"
                            className="w-24 px-2 py-1.5 rounded-md text-xs outline-none"
                            style={inputStyle}
                            {...form3.register(`modalityPricing.${mId}.costMax`)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Your bio / practice description *</label>
                <textarea {...form3.register("bio")} rows={5} placeholder="Tell members about your approach, training, and what makes your practice unique..." className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none" style={inputStyle} />
                {form3.formState.errors.bio && <p className="text-xs mt-1" style={errorStyle}>{form3.formState.errors.bio.message}</p>}
              </div>

              <div style={{ borderTop: "1px solid rgba(212,34,126,0.06)", paddingTop: "16px" }}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...form3.register("acceptsInsurance")} className="w-4 h-4" />
                  <div>
                    <span className="text-sm font-semibold block" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>Accepts insurance</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Shown as a filter on member search</span>
                  </div>
                </label>
              </div>

              {submitError && (
                <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.15)", color: "#c0392b", fontFamily: "var(--app-font-sans)" }}>
                  {submitError}
                </div>
              )}
              <div className="mt-2 flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium" style={{ border: "1.5px solid rgba(212,34,126,0.2)", color: "var(--hpf-pink)", background: "transparent", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}>
                  <ChevronLeft size={16} /> Back
                </button>
                <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white" style={{ background: submitting ? "rgba(212,34,126,0.4)" : "var(--hpf-pink)", border: "none", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "var(--app-font-sans)" }}>
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
                  {submitting ? "Saving..." : "Continue to payment →"}
                </button>
              </div>
            </form>
          )}

          {/* Step 4 — Listing payment */}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(212,34,126,0.08)" }}>
                  <CreditCard size={22} style={{ color: "var(--hpf-pink)" }} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.08em" }}>Almost there</p>
                <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.4rem", fontWeight: 700, color: "var(--hpf-pink)" }}>
                  Activate your listing
                </h3>
                <p className="text-sm mt-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  Your profile has been submitted and is pending review. Set up your monthly listing to go live when approved.
                </p>
              </div>

              {/* Pricing summary */}
              <div className="rounded-xl p-5" style={{ background: "rgba(212,34,126,0.03)", border: "1px solid rgba(212,34,126,0.1)" }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>Provider Listing — Monthly</span>
                  <span className="text-lg font-bold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>$29/mo</span>
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    "Active listing visible to all members",
                    "Lead notifications when members view your profile",
                    "Provider dashboard to manage availability & pricing",
                    "0% commission for first 90 days (Founding Provider)",
                    "Cancel anytime from your dashboard",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <CheckCircle size={12} style={{ color: "var(--sage)", flexShrink: 0 }} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {stripeMode === "demo" ? (
                <div className="flex flex-col gap-4">
                  <div className="p-4 rounded-xl text-sm" style={{ background: "rgba(125,181,92,0.08)", border: "1px solid rgba(125,181,92,0.2)", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                    <p className="font-semibold mb-1" style={{ color: "var(--sage)" }}>Demo mode — payment skipped</p>
                    <p className="text-xs">Stripe is not configured in this environment. Your application has been submitted and is pending admin review.</p>
                  </div>
                  <button
                    onClick={handleDemoComplete}
                    className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                    style={{ background: "var(--sage)", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
                  >
                    <CheckCircle size={15} /> Go to my dashboard
                  </button>
                </div>
              ) : (
                <>
                  {submitError && (
                    <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.15)", color: "#c0392b", fontFamily: "var(--app-font-sans)" }}>
                      {submitError}
                    </div>
                  )}
                  <button
                    onClick={handleListingCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                    style={{ background: checkoutLoading ? "rgba(212,34,126,0.4)" : "var(--hpf-pink)", border: "none", cursor: checkoutLoading ? "not-allowed" : "pointer", fontFamily: "var(--app-font-sans)" }}
                  >
                    {checkoutLoading ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
                    {checkoutLoading ? "Preparing checkout..." : "Subscribe — $29/month →"}
                  </button>
                  <p className="text-xs text-center" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                    Secured by Stripe. Your listing activates after admin approval — you won't be charged until then.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl p-5" style={{ background: "rgba(224,32,64,0.06)", border: "1px solid rgba(224,32,64,0.12)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
            <strong style={{ color: "var(--hpf-crimson)" }}>Founding Provider Program:</strong>{" "}
            Providers who join during our early access period pay <strong>0% commission</strong> on bookings for 90 days.
            After that, a small platform fee applies. Limited spots available.
          </p>
        </div>
      </div>
    </div>
  );
}
