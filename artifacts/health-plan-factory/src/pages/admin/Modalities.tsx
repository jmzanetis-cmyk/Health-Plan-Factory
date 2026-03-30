import { useState, useEffect } from "react";
import { AdminNav } from "./Dashboard";
import { Loader2, Save, X, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Modality {
  id: string;
  name: string;
  category: string;
  emoji: string;
  evidenceLevel: string | null;
  costMin: number | null;
  costMax: number | null;
  isActive: boolean;
}

interface EditState {
  evidenceLevel: string;
  costMin: string;
  costMax: string;
}

export default function AdminModalities() {
  const { toast } = useToast();
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ evidenceLevel: "", costMin: "", costMax: "" });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
      costMin: m.costMin?.toString() ?? "",
      costMax: m.costMax?.toString() ?? "",
    });
  };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    try {
      const payload: Record<string, unknown> = { evidenceLevel: editState.evidenceLevel || null };
      if (editState.costMin) payload.costMin = Number(editState.costMin);
      if (editState.costMax) payload.costMax = Number(editState.costMax);

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

  const evidenceLevels = ["strong", "moderate", "emerging", "limited"];

  const inputStyle = {
    background: "var(--warm-white)",
    border: "1.5px solid rgba(27,45,79,0.15)",
    color: "var(--navy)",
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
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)" }}>Modality Management</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>Edit evidence levels, cost ranges, and visibility</p>
        </div>

        <AdminNav active="/admin/modalities" />

        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin" size={24} style={{ color: "var(--navy)" }} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead style={{ background: "rgba(27,45,79,0.02)", borderBottom: "1px solid rgba(27,45,79,0.08)" }}>
                  <tr>
                    {["Modality", "Category", "Evidence Level", "Cost Range", "Active", "Actions"].map((h) => (
                      <th key={h} className="text-left px-3 py-3" style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modalities.map((m, i) => (
                    <tr key={m.id} style={{ borderTop: i === 0 ? "none" : "1px solid rgba(27,45,79,0.04)" }}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span>{m.emoji}</span>
                          <span className="text-sm font-medium" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>{m.name}</span>
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
                          <span className="text-xs capitalize px-2 py-0.5 rounded-full" style={{
                            fontFamily: "var(--app-font-sans)",
                            background: m.evidenceLevel === "strong" ? "rgba(61,107,82,0.1)" : "rgba(27,45,79,0.06)",
                            color: m.evidenceLevel === "strong" ? "var(--sage)" : "var(--text-muted)",
                          }}>
                            {m.evidenceLevel ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {editId === m.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              placeholder="Min"
                              value={editState.costMin}
                              onChange={(e) => setEditState((s) => ({ ...s, costMin: e.target.value }))}
                              className="w-16"
                              style={inputStyle}
                            />
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>–</span>
                            <input
                              type="number"
                              placeholder="Max"
                              value={editState.costMax}
                              onChange={(e) => setEditState((s) => ({ ...s, costMax: e.target.value }))}
                              className="w-16"
                              style={inputStyle}
                            />
                          </div>
                        ) : (
                          <span className="text-xs" style={{ fontFamily: "var(--app-font-mono)", color: "var(--text-secondary)" }}>
                            {m.costMin != null && m.costMax != null ? `$${m.costMin}–$${m.costMax}` : m.costMin != null ? `from $${m.costMin}` : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleActive(m.id, m.isActive)}
                          disabled={togglingId === m.id}
                          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                          style={{
                            background: m.isActive ? "var(--sage)" : "rgba(27,45,79,0.15)",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          {togglingId === m.id ? (
                            <Loader2 size={10} className="animate-spin mx-auto" style={{ color: "white" }} />
                          ) : (
                            <span
                              className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                              style={{ transform: m.isActive ? "translateX(18px)" : "translateX(2px)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                            />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        {editId === m.id ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => saveEdit(m.id)}
                              disabled={savingId === m.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                              style={{ background: "var(--navy)", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
                            >
                              {savingId === m.id ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                              Save
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="p-1.5 rounded-lg"
                              style={{ background: "rgba(27,45,79,0.06)", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(m)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: "rgba(27,45,79,0.06)", border: "none", cursor: "pointer", color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
                          >
                            <Pencil size={11} /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
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
