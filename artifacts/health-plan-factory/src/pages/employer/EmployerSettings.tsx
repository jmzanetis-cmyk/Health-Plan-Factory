import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2, Save } from "lucide-react";
import { EmployerNav } from "./EmployerDashboard";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");
const navy = "#2C2825";
const sage = "#7DB55C";
const amber = "#E02040";

interface Modality {
  id: string;
  name: string;
  emoji: string;
  category: string;
  hsaEligible: boolean;
}

interface Rule {
  modalityId: string;
  covered: boolean;
}

const categoryColors: Record<string, string> = {
  manual: amber,
  movement: sage,
  "mind-body": "#7c5cbf",
  nutrition: "#2e8b57",
  medical: navy,
  telehealth: "#1e7aad",
};

export default function EmployerSettings() {
  const navigate = useNavigate();
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [rules, setRules] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/modalities`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${BASE}/api/employer/modality-rules`, { credentials: "include" }).then((r) => {
        if (r.status === 404) { navigate("/employer"); return []; }
        return r.json();
      }),
    ])
      .then(([mods, existingRules]) => {
        if (Array.isArray(mods)) setModalities(mods);
        const ruleMap: Record<string, boolean> = {};
        if (Array.isArray(existingRules)) {
          for (const r of existingRules as Rule[]) {
            ruleMap[r.modalityId] = r.covered;
          }
        }
        // Default: all covered
        if (Array.isArray(mods)) {
          for (const m of mods as Modality[]) {
            if (!(m.id in ruleMap)) ruleMap[m.id] = true;
          }
        }
        setRules(ruleMap);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [navigate]);

  const toggle = (modalityId: string) => {
    setRules((prev) => ({ ...prev, [modalityId]: !prev[modalityId] }));
  };

  const toggleAll = (covered: boolean) => {
    setRules(Object.fromEntries(modalities.map((m) => [m.id, covered])));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const rulesArray = modalities.map((m) => ({ modalityId: m.id, covered: rules[m.id] ?? true }));
      const res = await fetch(`${BASE}/api/employer/modality-rules`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: rulesArray }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  };

  const categories = [...new Set(modalities.map((m) => m.category))];
  const coveredCount = modalities.filter((m) => rules[m.id] !== false).length;

  return (
    <div style={{ background: "var(--warm-white)", minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 8 }}>
          <div>
            <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.8rem", fontWeight: 700, color: navy, margin: 0 }}>Coverage Rules</h1>
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: 0, marginTop: 4 }}>
              Choose which wellness modalities your stipend covers. {coveredCount}/{modalities.length} covered.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => toggleAll(true)} style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.15)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, color: navy }}>
              All On
            </button>
            <button onClick={() => toggleAll(false)} style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.15)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, color: navy }}>
              All Off
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{
                background: saved ? sage : navy,
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "9px 18px",
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "var(--app-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                opacity: saving ? 0.7 : 1,
                transition: "background 0.3s",
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saved ? "Saved!" : "Save Rules"}
            </button>
          </div>
        </div>

        <EmployerNav active="/employer/settings" />

        {error && (
          <div style={{ background: "rgba(220,53,53,0.08)", border: "1px solid rgba(220,53,53,0.2)", borderRadius: 8, padding: "10px 16px", marginBottom: 20, color: "#c42b2b", fontFamily: "var(--app-font-sans)", fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}><Loader2 size={24} className="animate-spin" style={{ color: navy }} /></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {categories.map((cat) => {
              const catMods = modalities.filter((m) => m.category === cat);
              const catColor = categoryColors[cat] ?? navy;
              return (
                <div key={cat}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ height: 3, width: 20, background: catColor, borderRadius: 2 }} />
                    <h3 style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", color: catColor, margin: 0 }}>
                      {cat}
                    </h3>
                    <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-muted)" }}>
                      {catMods.filter((m) => rules[m.id] !== false).length}/{catMods.length} covered
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                    {catMods.map((m) => {
                      const covered = rules[m.id] !== false;
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggle(m.id)}
                          style={{
                            background: covered ? "white" : "rgba(212,34,126,0.02)",
                            border: covered
                              ? `2px solid ${catColor}30`
                              : "1.5px solid rgba(212,34,126,0.1)",
                            borderRadius: 10,
                            padding: "14px 16px",
                            cursor: "pointer",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            transition: "all 0.15s",
                            opacity: covered ? 1 : 0.55,
                          }}
                        >
                          <span style={{ fontSize: 22 }}>{m.emoji}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 600, color: navy }}>{m.name}</div>
                            {m.hsaEligible && (
                              <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, color: sage, fontWeight: 600, marginTop: 2 }}>
                                HSA eligible
                              </div>
                            )}
                          </div>
                          <div style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            border: covered ? `2px solid ${catColor}` : "2px solid rgba(212,34,126,0.2)",
                            background: covered ? catColor : "transparent",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            {covered && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 28, background: "rgba(125,181,92,0.06)", border: "1px solid rgba(125,181,92,0.2)", borderRadius: 10, padding: "14px 18px", fontFamily: "var(--app-font-sans)", fontSize: 13, color: sage, display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldCheck size={16} />
          Coverage rules apply to new stipend reimbursements. Existing claims are not affected. Changes take effect immediately.
        </div>
      </div>
    </div>
  );
}
