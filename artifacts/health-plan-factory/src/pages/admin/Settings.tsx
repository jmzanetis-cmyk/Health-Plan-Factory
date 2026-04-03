import { useState, useEffect } from "react";
import { AdminNav } from "./Dashboard";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Setting {
  key: string;
  value: string | null;
  updatedAt: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

const DEFAULT_DISCLAIMER = "HealthPlanFactory is a wellness optimization platform — not a medical provider, diagnostic tool, or substitute for professional medical care. This is not medical advice. For emergencies call 911. For mental health crisis call 988.";

export default function AdminSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState(DEFAULT_DISCLAIMER);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [pricingLabels, setPricingLabels] = useState<Record<string, string>>({
    free: "Free",
    plus: "$9.99/mo",
    provider: "3% booking fee",
  });

  useEffect(() => {
    fetch(`${BASE}/api/admin/settings`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: Setting[]) => {
        if (Array.isArray(data)) {
          const map: Record<string, string> = {};
          data.forEach((s) => { if (s.value) map[s.key] = s.value; });
          if (map.disclaimer) setDisclaimer(map.disclaimer);
          if (map.faq_items) {
            try { setFaqs(JSON.parse(map.faq_items)); } catch { setFaqs([]); }
          }
          if (map.pricing_labels) {
            try { setPricingLabels(JSON.parse(map.pricing_labels)); } catch {}
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saveSetting = async (key: string, value: string) => {
    setSaving(key);
    try {
      await fetch(`${BASE}/api/admin/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key, value }),
      });
      toast({ title: "Saved", description: `${key.replace(/_/g, " ")} updated.` });
    } catch {
      toast({ title: "Error", description: "Could not save setting.", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const inputStyle = {
    background: "var(--warm-white)",
    border: "1.5px solid rgba(212,34,126,0.12)",
    color: "var(--hpf-pink)",
    fontFamily: "var(--app-font-sans)",
    outline: "none",
    borderRadius: 8,
  };

  const sectionCard = {
    background: "white",
    border: "1px solid rgba(212,34,126,0.08)",
    borderRadius: 16,
  };

  const SaveBtn = ({ k, onClick }: { k: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={saving === k}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
      style={{ background: saving === k ? "rgba(212,34,126,0.4)" : "var(--hpf-pink)", border: "none", cursor: saving === k ? "not-allowed" : "pointer", fontFamily: "var(--app-font-sans)" }}
    >
      {saving === k ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
      {t("admin.settings.save")}
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--warm-white)" }}>
        <Loader2 className="animate-spin" size={28} style={{ color: "var(--hpf-pink)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 md:px-10 py-10" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div>
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-pink)" }}>
            {t("admin.settings.title")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            {t("admin.settings.subtitle")}
          </p>
        </div>

        <AdminNav active="/admin/settings" />

        {/* Disclaimer */}
        <div className="p-6 flex flex-col gap-4" style={sectionCard}>
          <div>
            <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>{t("admin.settings.disclaimerH2")}</h2>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              {t("admin.settings.disclaimerDesc")}
            </p>
          </div>
          <textarea
            value={disclaimer}
            onChange={(e) => setDisclaimer(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 text-sm resize-none"
            style={inputStyle}
          />
          <div className="flex justify-end">
            <SaveBtn k="disclaimer" onClick={() => saveSetting("disclaimer", disclaimer)} />
          </div>
        </div>

        {/* Pricing tier labels */}
        <div className="p-6 flex flex-col gap-4" style={sectionCard}>
          <div>
            <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>{t("admin.settings.pricingH2")}</h2>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              {t("admin.settings.pricingDesc")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(pricingLabels).map(([key, val]) => (
              <div key={key}>
                <label className="block text-xs font-semibold mb-1 capitalize" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                  {key} tier
                </label>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => setPricingLabels((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <SaveBtn k="pricing_labels" onClick={() => saveSetting("pricing_labels", JSON.stringify(pricingLabels))} />
          </div>
        </div>

        {/* FAQ management */}
        <div className="p-6 flex flex-col gap-4" style={sectionCard}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>{t("admin.settings.faqH2")}</h2>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                {t("admin.settings.faqDesc")}
              </p>
            </div>
            <button
              onClick={() => setFaqs((prev) => [...prev, { question: "", answer: "" }])}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
              style={{ background: "rgba(212,34,126,0.06)", border: "none", cursor: "pointer", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              <Plus size={14} /> {t("admin.settings.addFaqBtn")}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {faqs.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                {t("admin.settings.noFaqP")}
              </p>
            )}
            {faqs.map((faq, i) => (
              <div key={i} className="p-4 rounded-xl flex flex-col gap-3" style={{ background: "var(--warm-white)", border: "1px solid rgba(212,34,126,0.06)" }}>
                <div className="flex items-start justify-between gap-2">
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => setFaqs((prev) => prev.map((f, idx) => idx === i ? { ...f, question: e.target.value } : f))}
                    placeholder="Question…"
                    className="flex-1 px-3 py-2 text-sm"
                    style={inputStyle}
                  />
                  <button
                    onClick={() => setFaqs((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-2 rounded-lg"
                    style={{ background: "rgba(192,57,43,0.06)", border: "none", cursor: "pointer", color: "#c0392b" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <textarea
                  value={faq.answer}
                  onChange={(e) => setFaqs((prev) => prev.map((f, idx) => idx === i ? { ...f, answer: e.target.value } : f))}
                  placeholder="Answer…"
                  rows={2}
                  className="w-full px-3 py-2 text-sm resize-none"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <SaveBtn k="faq_items" onClick={() => saveSetting("faq_items", JSON.stringify(faqs))} />
          </div>
        </div>
      </div>
    </div>
  );
}
