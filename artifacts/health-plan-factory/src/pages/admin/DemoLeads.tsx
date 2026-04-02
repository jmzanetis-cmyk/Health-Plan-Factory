import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Mail, Building2, Users, MessageSquare, StickyNote, Loader2 } from "lucide-react";
import { AdminNav } from "./Dashboard";

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
  new: { bg: "rgba(212,34,126,0.08)", text: "#D4227E", border: "rgba(212,34,126,0.2)" },
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

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status as DemoStatus] ?? { bg: "rgba(107,114,128,0.08)", text: "#6b7280", border: "rgba(107,114,128,0.2)" };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: "0.7rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      background: colors.bg,
      color: colors.text,
      border: `1.5px solid ${colors.border}`,
      fontFamily: "var(--app-font-sans)",
    }}>
      {STATUS_LABELS[status as DemoStatus] ?? status}
    </span>
  );
}

function LeadRow({ lead, onUpdate }: { lead: DemoLead; onUpdate: (updated: DemoLead) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const updateStatus = async (newStatus: DemoStatus) => {
    setStatusUpdating(true);
    try {
      const res = await fetch(`${BASE}/api/admin/demo-requests/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated: DemoLead = await res.json();
        onUpdate(updated);
      }
    } finally {
      setStatusUpdating(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
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
        setNotesDirty(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const st = lead.status as DemoStatus;
  const statusColors = STATUS_COLORS[st] ?? STATUS_COLORS.closed;

  return (
    <div style={{
      background: "white",
      borderRadius: 12,
      border: "1.5px solid rgba(212,34,126,0.08)",
      overflow: "hidden",
      transition: "box-shadow 0.15s",
    }}>
      {/* Row header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          textAlign: "left",
        }}
      >
        {/* Status badge */}
        <span style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 10px",
          borderRadius: 20,
          fontSize: "0.68rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          background: statusColors.bg,
          color: statusColors.text,
          border: `1.5px solid ${statusColors.border}`,
          fontFamily: "var(--app-font-sans)",
          minWidth: 76,
          justifyContent: "center",
        }}>
          {STATUS_LABELS[st] ?? st}
        </span>

        {/* Company + contact */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: "var(--app-font-sans)",
            fontWeight: 700,
            fontSize: "0.9rem",
            color: "var(--hpf-pink)",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {lead.company}
            <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.4rem", fontSize: "0.82rem" }}>
              {lead.companySize}
            </span>
          </p>
          <p style={{
            fontFamily: "var(--app-font-sans)",
            fontSize: "0.74rem",
            color: "var(--text-muted)",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {lead.name} · {lead.email} · {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <ChevronDown
          size={16}
          style={{
            color: "var(--text-muted)",
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(212,34,126,0.07)" }}>
          {/* Quick info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.5rem", margin: "14px 0" }}>
            <div style={{ background: "rgba(212,34,126,0.04)", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ margin: "0 0 2px", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>Contact</p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-primary)", fontFamily: "var(--app-font-sans)", fontWeight: 600 }}>{lead.name}</p>
            </div>
            <div style={{ background: "rgba(212,34,126,0.04)", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ margin: "0 0 2px", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>Team size</p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-primary)", fontFamily: "var(--app-font-sans)", fontWeight: 600 }}>{lead.companySize}</p>
            </div>
            {lead.phone && (
              <div style={{ background: "rgba(212,34,126,0.04)", borderRadius: 8, padding: "10px 14px" }}>
                <p style={{ margin: "0 0 2px", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>Phone</p>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-primary)", fontFamily: "var(--app-font-sans)", fontWeight: 600 }}>{lead.phone}</p>
              </div>
            )}
          </div>

          {/* Message */}
          {lead.message && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 6px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                Their message
              </p>
              <div style={{ background: "#f8f6f1", borderLeft: "3px solid rgba(212,34,126,0.3)", borderRadius: "0 8px 8px 0", padding: "10px 14px" }}>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-primary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {lead.message}
                </p>
              </div>
            </div>
          )}

          {/* Status update */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: "0 0 6px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
              Update status
            </p>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
              {(["new", "contacted", "qualified", "closed"] as DemoStatus[]).map((s) => (
                <button
                  key={s}
                  disabled={lead.status === s || statusUpdating}
                  onClick={() => updateStatus(s)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 8,
                    border: `1.5px solid ${STATUS_COLORS[s].border}`,
                    background: lead.status === s ? STATUS_COLORS[s].bg : "white",
                    color: STATUS_COLORS[s].text,
                    fontFamily: "var(--app-font-sans)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: lead.status === s || statusUpdating ? "default" : "pointer",
                    opacity: statusUpdating ? 0.6 : 1,
                    transition: "background 0.15s",
                  }}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
              {statusUpdating && <Loader2 size={14} className="animate-spin" style={{ color: "var(--hpf-pink)" }} />}
            </div>
          </div>

          {/* Internal notes */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: "0 0 6px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
              Internal notes <span style={{ fontWeight: 400, color: "var(--text-muted)", textTransform: "none", letterSpacing: 0 }}>(private)</span>
            </p>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setNotesDirty(e.target.value !== (lead.notes ?? "")); }}
              rows={3}
              placeholder="Add internal notes about this lead…"
              style={{
                width: "100%",
                border: "1.5px solid rgba(212,34,126,0.15)",
                borderRadius: 8,
                padding: "10px 12px",
                fontFamily: "var(--app-font-sans)",
                fontSize: "0.82rem",
                color: "var(--text-primary)",
                background: "white",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {notesDirty && (
              <button
                onClick={saveNotes}
                disabled={saving}
                style={{
                  marginTop: 6,
                  padding: "6px 16px",
                  background: saving ? "rgba(212,34,126,0.4)" : "var(--hpf-pink)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontFamily: "var(--app-font-sans)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                Save notes
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <a
              href={`mailto:${lead.email}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.3rem",
                padding: "5px 14px", borderRadius: 8,
                background: "rgba(212,34,126,0.06)", color: "var(--hpf-pink)",
                fontSize: "0.78rem", fontWeight: 600,
                fontFamily: "var(--app-font-sans)", textDecoration: "none",
                border: "1.5px solid rgba(212,34,126,0.12)",
              }}
            >
              <Mail size={12} /> Email {lead.name.split(" ")[0]}
            </a>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "5px 14px", borderRadius: 8, background: "rgba(26,42,58,0.04)", color: "var(--hpf-navy)", fontSize: "0.78rem", fontFamily: "var(--app-font-sans)", border: "1.5px solid rgba(26,42,58,0.1)" }}>
              <Building2 size={12} /> {lead.company}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DemoLeads() {
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

  // Also fetch "new" count for the badge
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

  const handleUpdate = (updated: DemoLead) => {
    setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l));
    // Refresh new count after status update
    fetchNewCount();
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <AdminNav active="/admin/demo-requests" />

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
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

        {/* Leads list */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--hpf-pink)" }} />
          </div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", fontSize: "0.9rem" }}>
            No demo leads found{filter ? ` with status "${filter}"` : ""}.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {leads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
