import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Loader2, Check, MapPin, Video, Phone, Globe, DollarSign, Shield } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Modality {
  id: string;
  name: string;
  category: string;
}

interface Provider {
  id: string;
  name: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  acceptsInsurance: boolean;
  offersTelehealth: boolean;
  costPerSession: number | string | null;
  status: string;
  rating: string | null;
  reviewCount: number;
  modalityIds?: string[];
}

const profileSchema = z.object({
  name: z.string().min(2, "Name required"),
  bio: z.string().min(30, "At least 30 characters").max(800).optional().or(z.literal("")),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().regex(/^\d{5}$/, "5-digit ZIP").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  acceptsInsurance: z.boolean(),
  offersTelehealth: z.boolean(),
  costPerSession: z.coerce.number().min(0).max(10000).optional(),
  modalityIds: z.array(z.string()).optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const inputStyle = {
  border: "1px solid rgba(212,34,126,0.15)",
  background: "var(--warm-white)",
  color: "var(--hpf-pink)",
  fontFamily: "var(--app-font-sans)",
};
const labelStyle = { color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" };

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "rgba(224,32,64,0.08)", color: "var(--hpf-crimson)", label: "Pending review" },
    approved: { bg: "rgba(125,181,92,0.08)", color: "var(--sage)", label: "Active listing" },
    rejected: { bg: "rgba(192,57,43,0.08)", color: "#c0392b", label: "Not approved" },
    suspended: { bg: "rgba(212,34,126,0.08)", color: "var(--text-muted)", label: "Suspended" },
  };
  const c = config[status] ?? config.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.color, fontFamily: "var(--app-font-sans)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

export default function ProviderProfile() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { acceptsInsurance: false, offersTelehealth: false, modalityIds: [] },
  });

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/providers/me`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${BASE}/api/modalities`).then((r) => r.json()),
    ]).then(([providerData, modalityData]: [{ provider: Provider | null }, Modality[]]) => {
      setModalities(modalityData);
      if (providerData.provider) {
        const p = providerData.provider;
        setProvider(p);
        form.reset({
          name: p.name,
          bio: p.bio || "",
          city: p.city || "",
          state: p.state || "",
          zipCode: p.zipCode || "",
          phone: p.phone || "",
          website: p.website || "",
          acceptsInsurance: p.acceptsInsurance,
          offersTelehealth: p.offersTelehealth,
          costPerSession: p.costPerSession ? Number(p.costPerSession) : undefined,
          modalityIds: p.modalityIds || [],
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const onSubmit = async (data: ProfileForm) => {
    if (!provider) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${BASE}/api/providers/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          costPerSession: data.costPerSession ?? null,
          website: data.website || undefined,
          bio: data.bio || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `Error ${res.status}`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--warm-white)" }}>
        <Loader2 className="animate-spin" size={28} style={{ color: "var(--hpf-pink)" }} />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--warm-white)" }}>
        <div className="text-center max-w-sm">
          <h1 className="mb-3 text-2xl" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)", fontWeight: 700 }}>No profile yet</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            Complete your provider application to create a listing.
          </p>
          <Link to="/provider/signup" className="px-5 py-3 rounded-lg text-sm font-semibold text-white no-underline" style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
            Apply as a provider →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 md:px-12 py-16" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-pink)" }}>
              Edit Profile
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              Your public listing on Health Plan Factory
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={provider.status} />
            <Link to="/provider/dashboard" className="text-sm no-underline font-medium" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {provider.status === "pending" && (
          <div className="mb-6 p-4 rounded-xl" style={{ background: "rgba(224,32,64,0.06)", border: "1px solid rgba(224,32,64,0.15)" }}>
            <p className="text-sm" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
              <strong style={{ color: "var(--hpf-crimson)" }}>Under review</strong> — our team is verifying your application.
              You can update your profile while you wait. We'll notify you by email when approved.
            </p>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Practice Info</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Practice name *</label>
                <input {...form.register("name")} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                {form.formState.errors.name && <p className="text-xs mt-1" style={{ color: "#c0392b", fontFamily: "var(--app-font-sans)" }}>{form.formState.errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Bio</label>
                <textarea {...form.register("bio")} rows={5} className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none" style={inputStyle} />
                {form.formState.errors.bio && <p className="text-xs mt-1" style={{ color: "#c0392b", fontFamily: "var(--app-font-sans)" }}>{form.formState.errors.bio.message}</p>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Contact & Location</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}><Phone size={11} className="inline mr-1" />Phone</label>
                <input {...form.register("phone")} type="tel" className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}><Globe size={11} className="inline mr-1" />Website</label>
                <input {...form.register("website")} type="url" className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}><MapPin size={11} className="inline mr-1" />City</label>
                <input {...form.register("city")} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>State</label>
                  <input {...form.register("state")} maxLength={2} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>ZIP</label>
                  <input {...form.register("zipCode")} maxLength={5} className="w-full px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
                  {form.formState.errors.zipCode && <p className="text-xs mt-1" style={{ color: "#c0392b", fontFamily: "var(--app-font-sans)" }}>{form.formState.errors.zipCode.message}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Services & Pricing</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={labelStyle}><DollarSign size={11} className="inline mr-1" />Cost per session ($)</label>
                <input {...form.register("costPerSession")} type="number" min={0} className="w-full sm:w-1/2 px-4 py-3 rounded-lg text-sm outline-none" style={inputStyle} />
              </div>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg" style={{ background: "rgba(212,34,126,0.03)", border: "1px solid rgba(212,34,126,0.08)" }}>
                  <input type="checkbox" {...form.register("offersTelehealth")} className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                      <Video size={13} /> Offer telehealth / virtual sessions
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg" style={{ background: "rgba(212,34,126,0.03)", border: "1px solid rgba(212,34,126,0.08)" }}>
                  <input type="checkbox" {...form.register("acceptsInsurance")} className="w-4 h-4" />
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                      <Shield size={13} /> Accepts insurance
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
            <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Modalities</h2>
            <div className="flex flex-wrap gap-2">
              {modalities.map((m) => {
                const selected = form.watch("modalityIds")?.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      const cur = form.getValues("modalityIds") || [];
                      form.setValue("modalityIds", selected ? cur.filter((id) => id !== m.id) : [...cur, m.id]);
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
              })}
            </div>
          </div>

          {saveError && (
            <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(192,57,43,0.06)", border: "1px solid rgba(192,57,43,0.15)", color: "#c0392b", fontFamily: "var(--app-font-sans)" }}>
              {saveError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            {saved && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--sage)", fontFamily: "var(--app-font-sans)" }}>
                <Check size={15} /> Saved
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white"
              style={{
                background: saving ? "rgba(212,34,126,0.4)" : "var(--hpf-pink)",
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
