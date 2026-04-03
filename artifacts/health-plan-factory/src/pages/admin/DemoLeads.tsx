import { useState, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, Mail, Loader2, AlertCircle } from "lucide-react";
import { AdminNav } from "./Dashboard";
import { useTranslation } from "react-i18next";

const DEMO_LEAD_REFRESH_EVENT = "demo-leads-status-changed";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

type DemoStatus = "new" | "contacted" | "qualified" | "closed";

interface DemoLead {
  id: string;
  name: string;
  company: string;
  companySize: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<DemoStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  closed: "Closed",
};

const STATUS_COLORS: Record<DemoStatus, { bg: string; text: string; border: string }> = {
  new: { bg: "rgba(212,34,126,0.1)", text: "#D4227E", border: "rgba(212,34,126,0.25)" },
  contacted: { bg: "rgba(59,130,246,0.08)", text: "#2563eb", border: "rgba(59,130,246,0.2)" },
  qualified: { bg: "rgba(22,163,74,0.08)", text: "#15803d", border: "rgba(22,163,74,0.2)" },
  closed: { bg: "rgba(107,114,128,0.08)", text: "#6b7280", border: "rgba(107,114,128,0.2)" },
};

const ALL_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
];

function StatusSelect({ lead, onUpdate, filter }: {
  lead: DemoLead;
  onUpdate: (updated: DemoLead, removedFromFilter: boolean) => void;
  filter: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (newStatus: DemoStatus) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/admin/demo-requests/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated: DemoLead = await res.json();
        const removedFromFilter = Boolean(filter && filter !== newStatus);
        onUpdate(updated, removedFromFilter);
        window.dispatchEvent(new CustomEvent(DEMO_LEAD_REFRESH_EVENT));
      } else {
        setError("Failed to update status");
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  };

  const colors = STATUS_COLORS[lead.status as DemoStatus] ?? STATUS_COLORS.closed;

  return (
    <div>
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <select
          value={lead.status}
          onChange={(e) => handleChange(e.target.value as DemoStatus)}
          disabled={busy}
          style={{
            appearance: "none",
            padding: "4px 28px 4px 10px",
            borderRadius: 20,
            border: `1.5px solid ${colors.border}`,
            background: colors.bg,
            color: colors.text,
            fontFamily: "var(--app-font-sans)",
            fontSize: "0.72rem",
            fontWeight: 700,
            cursor: busy ? "not-allowed" : "pointer",
            outline: "none",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {(["new", "contacted", "qualified", "closed"] as DemoStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        {busy ? (
          <Loader2 size={10} className="animate-spin" style={{ position: "absolute", right: 8, color: colors.text, pointerEvents: "none" }} />
        ) : (
          <ChevronDown size={10} style={{ position: "absolute", right: 8, color: colors.text, pointerEvents: "none" }} />
        )}
      </div>
      {error && (
        <p style={{ margin: "3px 0 0", display: "flex", alignItems: "center", gap: 3, fontSize: "0.68rem", color: "#dc2626", fontFamily: "var(--app-font-sans)" }}>
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

function NotesCell({ lead, onUpdate }: { lead: DemoLead; onUpdate: (updated: DemoLead) => void }) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${BASE}/api/admin/demo-requests/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        const updated: DemoLead = await res.json();
        onUpdate(updated);
        setEditing(false);
      } else {
        setSaveError("Failed to save");
      }
    } catch {
      setSaveError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title={lead.notes || "Click to add notes"}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px 4px",
          borderRadius: 4,
          maxWidth: 160,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          display: "block",
          textAlign: "left",
          color: lead.notes ? "var(--text-primary)" : "var(--text-muted)",
          fontFamily: "var(--app-font-sans)",
          fontSize: "0.78rem",
          lineHeight: "1.4",
        }}
      >
        {lead.notes || <span style={{ fontStyle: "italic", opacity: 0.6 }}>Add note…</span>}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        autoFocus
        style={{
          border: "1.5px solid rgba(212,34,126,0.2)",
          borderRadius: 6,
          padding: "6px 8px",
          fontFamily: "var(--app-font-sans)",
          fontSize: "0.76rem",
          color: "var(--text-primary)",
          resize: "vertical",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ padding: "3px 10px", borderRadius: 5, background: "var(--hpf-pink)", color: "white", border: "none", fontFamily: "var(--app-font-sans)", fontSize: "0.72rem", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "…" : "Save"}
        </button>
        <button
          onClick={() => { setEditing(false); setNotes(lead.notes ?? ""); setSaveError(null); }}
          style={{ padding: "3px 10px", borderRadius: 5, background: "white", color: "var(--text-muted)", border: "1px solid rgba(0,0,0,0.1)", fontFamily: "var(--app-font-sans)", fontSize: "0.72rem", cursor: "pointer" }}
        >
          Cancel
        </button>
        {saveError && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.68rem", color: "#dc2626", fontFamily: "var(--app-font-sans)" }}>
            <AlertCircle size={10} /> {saveError}
          </span>
        )}
      </div>
    </div>
  );
}

function MessageCell({ message }: { message: string | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!message) return <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.76rem", fontFamily: "var(--app-font-sans)" }}>—</span>;

  const short = message.length > 80 ? message.slice(0, 80) + "…" : message;

  return (
    <div>
      <p style={{ margin: 0, fontFamily: "var(--app-font-sans)", fontSize: "0.78rem", color: "var(--text-primary)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
        {expanded ? message : short}
      </p>
      {message.length > 80 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", fontSize: "0.72rem", fontWeight: 600, padding: "2px 0", display: "flex", alignItems: "center", gap: 2 }}
        >
          {expanded ? <><ChevronUp size={11} /> Show less</> : <><ChevronDown size={11} /> Show more</>}
        </button>
      )}
    </div>
  );
}

export default function DemoLeads() {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [newCount, setNewCount] = useState(0);

  const fetchLeads = useCallback(async (statusFilter: string) => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`${BASE}/api/admin/demo-requests${qs}`, { credentials: "include" });
      if (res.ok) {
        const data: DemoLead[] = await res.json();
        setLeads(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNewCount = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/admin/demo-requests?status=new`, { credentials: "include" });
      if (res.ok) {
        const data: DemoLead[] = await res.json();
        setNewCount(data.length);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchLeads(filter);
    fetchNewCount();
  }, [filter, fetchLeads, fetchNewCount]);

  const handleStatusUpdate = (updated: DemoLead, removedFromFilter: boolean) => {
    if (removedFromFilter) {
      // Remove the row from filtered view since it no longer matches
      setLeads((prev) => prev.filter((l) => l.id !== updated.id));
    } else {
      setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l));
    }
    fetchNewCount();
  };

  const handleNotesUpdate = (updated: DemoLead) => {
    setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l));
  };

  const cellStyle: React.CSSProperties = {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(212,34,126,0.06)",
    verticalAlign: "top",
    fontFamily: "var(--app-font-sans)",
    fontSize: "0.82rem",
    color: "var(--text-primary)",
  };

  const headerStyle: React.CSSProperties = {
    padding: "10px 14px",
    fontFamily: "var(--app-font-sans)",
    fontSize: "0.68rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
    background: "rgba(212,34,126,0.03)",
    borderBottom: "1.5px solid rgba(212,34,126,0.1)",
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <AdminNav active="/admin/demo-requests" />

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.6rem", fontWeight: 700, color: "var(--hpf-pink)", margin: "0 0 4px" }}>
            Demo Lead Pipeline
          </h1>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
            Inbound employer demo requests · {leads.length} lead{leads.length !== 1 ? "s" : ""} shown
            {newCount > 0 && (
              <span style={{ marginLeft: 8, background: "var(--hpf-pink)", color: "white", borderRadius: 20, padding: "1px 8px", fontSize: "0.72rem", fontWeight: 700 }}>
                {newCount} new
              </span>
            )}
          </p>
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: 20 }}>
          {ALL_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                border: "1.5px solid rgba(212,34,126,0.15)",
                background: filter === f.value ? "var(--hpf-pink)" : "white",
                color: filter === f.value ? "white" : "var(--hpf-pink)",
                fontFamily: "var(--app-font-sans)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--hpf-pink)" }} />
          </div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", fontSize: "0.9rem" }}>
            No demo leads found{filter ? ` with status "${filter}"` : ""}.
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: 14, border: "1.5px solid rgba(212,34,126,0.1)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={headerStyle}>Company</th>
                    <th style={headerStyle}>Contact</th>
                    <th style={headerStyle}>Email</th>
                    <th style={headerStyle}>Team size</th>
                    <th style={{ ...headerStyle, minWidth: 160 }}>Message</th>
                    <th style={headerStyle}>Status</th>
                    <th style={{ ...headerStyle, minWidth: 180 }}>Notes</th>
                    <th style={headerStyle}>Date</th>
                    <th style={headerStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, idx) => (
                    <tr
                      key={lead.id}
                      style={{ background: idx % 2 === 0 ? "white" : "rgba(212,34,126,0.015)" }}
                    >
                      <td style={{ ...cellStyle, fontWeight: 700, color: "var(--hpf-pink)", whiteSpace: "nowrap" }}>
                        {lead.company}
                      </td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{lead.name}</td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        <a href={`mailto:${lead.email}`} style={{ color: "var(--hpf-pink)", textDecoration: "none", fontSize: "0.78rem", fontFamily: "var(--app-font-sans)" }}>
                          {lead.email}
                        </a>
                      </td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>{lead.companySize}</td>
                      <td style={{ ...cellStyle, maxWidth: 220 }}>
                        <MessageCell message={lead.message} />
                      </td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        <StatusSelect lead={lead} onUpdate={handleStatusUpdate} filter={filter} />
                      </td>
                      <td style={{ ...cellStyle }}>
                        <NotesCell lead={lead} onUpdate={handleNotesUpdate} />
                      </td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap", fontSize: "0.74rem", color: "var(--text-muted)" }}>
                        {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td style={{ ...cellStyle, whiteSpace: "nowrap" }}>
                        <a
                          href={`mailto:${lead.email}`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "4px 10px", borderRadius: 6,
                            background: "rgba(212,34,126,0.06)", color: "var(--hpf-pink)",
                            fontSize: "0.74rem", fontWeight: 600,
                            fontFamily: "var(--app-font-sans)", textDecoration: "none",
                            border: "1.5px solid rgba(212,34,126,0.12)",
                          }}
                        >
                          <Mail size={11} /> Email
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
