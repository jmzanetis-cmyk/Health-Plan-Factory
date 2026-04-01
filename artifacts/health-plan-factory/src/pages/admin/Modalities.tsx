import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminNav } from "./Dashboard";
import { Loader2, Save, X, Pencil, BookOpen, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Modality {
  id: string;
  name: string;
  category: string;
  emoji: string;
  evidenceLevel: "Strong" | "Moderate" | "Emerging" | null;
  costLow: number;
  costHigh: number;
  isActive: boolean;
  lmnEligible: boolean;
  evidenceSummary: string | null;
  metaDescription: string | null;
}

interface EditState {
  evidenceLevel: string;
  costLow: string;
  costHigh: string;
}

interface EvidenceEditState {
  evidenceSummary: string;
  metaDescription: string;
}

export default function AdminModalities() {
  const { toast } = useToast();
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ evidenceLevel: "", costLow: "", costHigh: "" });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [togglingLmnId, setTogglingLmnId] = useState<string | null>(null);

  const [evidenceEditId, setEvidenceEditId] = useState<string | null>(null);
  const [evidenceEditState, setEvidenceEditState] = useState<EvidenceEditState>({ evidenceSummary: "", metaDescription: "" });
  const [savingEvidenceId, setSavingEvidenceId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/admin/modalities`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.modalities)) setModalities(data.modalities);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const startEdit = (m: Modality) => {
    setEditId(m.id);
    setEditState({
      evidenceLevel: m.evidenceLevel ?? "",
      costLow: m.costLow?.toString() ?? "",
      costHigh: m.costHigh?.toString() ?? "",
    });
  };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    try {
      const payload: Record<string, unknown> = {};
      if (editState.evidenceLevel) payload.evidenceLevel = editState.evidenceLevel;
      if (editState.costLow) payload.costLow = Number(editState.costLow);
      if (editState.costHigh) payload.costHigh = Number(editState.costHigh);

      const res = await fetch(`${BASE}/api/admin/modalities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setModalities((prev) => prev.map((m) => (m.id === id ? { ...m, ...data.modality } : m)));
      setEditId(null);
      toast({ title: "Modality updated", description: "Changes saved successfully." });
    } catch {
      toast({ title: "Error", description: "Could not save changes.", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const startEvidenceEdit = (m: Modality) => {
    setEvidenceEditId(m.id);
    setEvidenceEditState({
      evidenceSummary: m.evidenceSummary ?? "",
      metaDescription: m.metaDescription ?? "",
    });
  };

  const saveEvidenceEdit = async (id: string) => {
    setSavingEvidenceId(id);
    try {
      const res = await fetch(`${BASE}/api/admin/modalities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          evidenceSummary: evidenceEditState.evidenceSummary,
          metaDescription: evidenceEditState.metaDescription,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setModalities((prev) => prev.map((m) => (m.id === id ? { ...m, ...data.modality } : m)));
      setEvidenceEditId(null);
      toast({ title: "Evidence summary saved" });
    } catch {
      toast({ title: "Error", description: "Could not save evidence summary.", variant: "destructive" });
    } finally {
      setSavingEvidenceId(null);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    setTogglingId(id);
    try {
      const res = await fetch(`${BASE}/api/admin/modalities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setModalities((prev) => prev.map((m) => (m.id === id ? { ...m, ...data.modality } : m)));
      toast({ title: `Modality ${!current ? "activated" : "deactivated"}` });
    } catch {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const toggleLmnEligible = async (id: string, current: boolean) => {
    setTogglingLmnId(id);
    try {
      const res = await fetch(`${BASE}/api/admin/modalities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lmnEligible: !current }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setModalities((prev) => prev.map((m) => (m.id === id ? { ...m, ...data.modality } : m)));
      toast({ title: `LMN eligibility ${!current ? "enabled" : "disabled"}` });
    } catch {
      toast({ title: "Error", description: "Could not update LMN eligibility.", variant: "destructive" });
    } finally {
      setTogglingLmnId(null);
    }
  };

  const evidenceLevels: Array<"Strong" | "Moderate" | "Emerging"> = ["Strong", "Moderate", "Emerging"];

  const evidenceBadge = (level: string | null) => {
    if (!level) return { bg: "rgba(212,34,126,0.06)", color: "var(--text-muted)" };
    if (level === "Strong") return { bg: "rgba(125,181,92,0.12)", color: "var(--sage)" };
    if (level === "Moderate") return { bg: "rgba(224,32,64,0.12)", color: "var(--hpf-crimson)" };
    return { bg: "rgba(212,34,126,0.06)", color: "var(--text-muted)" };
  };

  const inputStyle = {
    background: "var(--warm-white)",
    border: "1.5px solid rgba(212,34,126,0.15)",
    color: "var(--hpf-pink)",
    fontFamily: "var(--app-font-sans)",
    outline: "none",
    borderRadius: 6,
    fontSize: 12,
    padding: "4px 8px",
  };

  return (
    <div className="min-h-screen px-4 md:px-10 py-10" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-pink)" }}>Modality Management</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>Edit evidence levels, cost ranges, visibility, and evidence summaries</p>
        </div>

        <AdminNav active="/admin/modalities" />

        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin" size={24} style={{ color: "var(--hpf-pink)" }} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead style={{ background: "rgba(212,34,126,0.02)", borderBottom: "1px solid rgba(212,34,126,0.08)" }}>
                  <tr>
                    {["Modality", "Category", "Evidence Level", "Cost Range", "Active", "LMN", "Evidence Page", "Actions"].map((h) => (
                      <th key={h} className="text-left px-3 py-3" style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modalities.map((m, i) => (
                    <>
                    <tr key={m.id} style={{ borderTop: i === 0 ? "none" : "1px solid rgba(212,34,126,0.04)" }}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span>{m.emoji}</span>
                          <span className="text-sm font-medium" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>{m.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs capitalize" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{m.category}</span>
                      </td>
                      <td className="px-3 py-3">
                        {editId === m.id ? (
                          <select value={editState.evidenceLevel} onChange={(e) => setEditState((s) => ({ ...s, evidenceLevel: e.target.value }))} style={inputStyle}>
                            <option value="">—</option>
                            {evidenceLevels.map((l) => <option key={l} value={l}>{l}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ fontFamily: "var(--app-font-sans)", ...evidenceBadge(m.evidenceLevel) }}>
                            {m.evidenceLevel ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {editId === m.id ? (
                          <div className="flex items-center gap-1">
                            <input type="number" placeholder="Low" value={editState.costLow} onChange={(e) => setEditState((s) => ({ ...s, costLow: e.target.value }))} className="w-16" style={inputStyle} />
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>–</span>
                            <input type="number" placeholder="High" value={editState.costHigh} onChange={(e) => setEditState((s) => ({ ...s, costHigh: e.target.value }))} className="w-16" style={inputStyle} />
                          </div>
                        ) : (
                          <span className="text-xs" style={{ fontFamily: "var(--app-font-mono)", color: "var(--text-secondary)" }}>
                            ${m.costLow}–${m.costHigh}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleActive(m.id, m.isActive)} disabled={togglingId === m.id} className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors" style={{ background: m.isActive ? "var(--sage)" : "rgba(212,34,126,0.15)", border: "none", cursor: "pointer" }}>
                          {togglingId === m.id ? <Loader2 size={10} className="animate-spin mx-auto" style={{ color: "white" }} /> : <span className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform" style={{ transform: m.isActive ? "translateX(18px)" : "translateX(2px)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleLmnEligible(m.id, m.lmnEligible)} disabled={togglingLmnId === m.id} title="Toggle LMN eligibility" className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors" style={{ background: m.lmnEligible ? "#E02040" : "rgba(212,34,126,0.15)", border: "none", cursor: "pointer" }}>
                          {togglingLmnId === m.id ? <Loader2 size={10} className="animate-spin mx-auto" style={{ color: "white" }} /> : <span className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform" style={{ transform: m.lmnEligible ? "translateX(18px)" : "translateX(2px)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs" style={{ color: m.evidenceSummary ? "var(--sage)" : "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                            {m.evidenceSummary ? "✓ Has summary" : "No summary"}
                          </span>
                          <Link to={`/modalities/${m.id}`} target="_blank" title="View public page">
                            <ExternalLink size={11} style={{ color: "var(--text-muted)" }} />
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5">
                          {editId === m.id ? (
                            <>
                              <button onClick={() => saveEdit(m.id)} disabled={savingId === m.id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--hpf-pink)", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}>
                                {savingId === m.id ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Save
                              </button>
                              <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg" style={{ background: "rgba(212,34,126,0.06)", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                <X size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(m)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(212,34,126,0.06)", border: "none", cursor: "pointer", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                                <Pencil size={11} /> Edit
                              </button>
                              <button onClick={() => evidenceEditId === m.id ? setEvidenceEditId(null) : startEvidenceEdit(m)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ background: evidenceEditId === m.id ? "rgba(212,34,126,0.12)" : "rgba(212,34,126,0.06)", border: "none", cursor: "pointer", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                                <BookOpen size={11} /> Evidence
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Evidence summary expandable editor */}
                    {evidenceEditId === m.id && (
                      <tr key={`${m.id}-evidence`} style={{ background: "rgba(212,34,126,0.02)", borderTop: "1px solid rgba(212,34,126,0.06)" }}>
                        <td colSpan={8} className="px-4 py-4">
                          <div style={{ maxWidth: 800 }}>
                            <p className="text-xs font-semibold mb-2" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              {m.emoji} {m.name} — Evidence Summary
                            </p>
                            <textarea
                              value={evidenceEditState.evidenceSummary}
                              onChange={(e) => setEvidenceEditState((s) => ({ ...s, evidenceSummary: e.target.value }))}
                              rows={8}
                              placeholder="300–500 word evidence summary. Write 3 short paragraphs: (1) what it is and what evidence shows, (2) conditions it helps and mechanism, (3) who it's best for and provider advice."
                              style={{ ...inputStyle, width: "100%", padding: "10px 12px", fontSize: 13, lineHeight: 1.6, resize: "vertical", marginBottom: 10 }}
                            />
                            <input
                              type="text"
                              value={evidenceEditState.metaDescription}
                              onChange={(e) => setEvidenceEditState((s) => ({ ...s, metaDescription: e.target.value }))}
                              placeholder="SEO meta description (140–160 characters)"
                              style={{ ...inputStyle, width: "100%", padding: "8px 12px", fontSize: 13, marginBottom: 10 }}
                              maxLength={170}
                            />
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => saveEvidenceEdit(m.id)} disabled={savingEvidenceId === m.id} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--hpf-pink)", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}>
                                {savingEvidenceId === m.id ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save Evidence
                              </button>
                              <button onClick={() => setEvidenceEditId(null)} className="px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(212,34,126,0.06)", border: "none", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                                Cancel
                              </button>
                              <span className="text-xs ml-2" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                                {evidenceEditState.evidenceSummary.length} chars
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
