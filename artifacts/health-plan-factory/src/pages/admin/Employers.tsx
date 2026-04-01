import { useState, useEffect } from "react";
import { Building2, Plus, ChevronDown, ChevronUp, Loader2, X, Check, Pencil, Trash2 } from "lucide-react";
import { AdminNav } from "./Dashboard";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");
const navy = "#2C2825";
const sage = "#7DB55C";
const amber = "#E02040";

interface Employer {
  id: string;
  companyName: string;
  adminContactName: string;
  adminContactEmail: string;
  billingContactEmail: string | null;
  numberOfEmployees: number;
  stipendPerEmployee: number;
  platformFeePercent: number;
  inviteCode: string;
  stripeCustomerId: string | null;
  status: string;
  memberCount: number;
  createdAt: string;
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(0)}/mo`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active: { bg: "rgba(125,181,92,0.1)", color: sage },
    pending: { bg: "rgba(224,32,64,0.1)", color: amber },
    canceled: { bg: "rgba(220,53,53,0.1)", color: "#c42b2b" },
  };
  const s = map[status] ?? { bg: "rgba(212,34,126,0.07)", color: navy };
  return (
    <span style={{ ...s, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
      {status}
    </span>
  );
}

interface EmployerFormData {
  companyName: string;
  adminContactName: string;
  adminContactEmail: string;
  billingContactEmail?: string;
  numberOfEmployees: number;
  stipendPerEmployee: number;
  status?: string;
}

function EmployerForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Employer>;
  onSave: (data: EmployerFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    companyName: initial?.companyName ?? "",
    adminContactName: initial?.adminContactName ?? "",
    adminContactEmail: initial?.adminContactEmail ?? "",
    billingContactEmail: initial?.billingContactEmail ?? "",
    numberOfEmployees: String(initial?.numberOfEmployees ?? ""),
    stipendPerEmployee: initial ? String(initial.stipendPerEmployee! / 100) : "",
    status: initial?.status ?? "active",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSave({
        companyName: form.companyName,
        adminContactName: form.adminContactName,
        adminContactEmail: form.adminContactEmail,
        billingContactEmail: form.billingContactEmail || undefined,
        numberOfEmployees: parseInt(form.numberOfEmployees, 10),
        stipendPerEmployee: Math.round(parseFloat(form.stipendPerEmployee) * 100),
        status: form.status,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    border: "1.5px solid rgba(212,34,126,0.18)",
    borderRadius: 7,
    padding: "9px 12px",
    fontFamily: "var(--app-font-sans)",
    fontSize: 14,
    color: navy,
    outline: "none",
    background: "white",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    fontFamily: "var(--app-font-sans)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    marginBottom: 5,
  };

  return (
    <form onSubmit={submit} style={{ padding: "20px 24px", background: "rgba(212,34,126,0.02)", borderTop: "1px solid rgba(212,34,126,0.08)" }}>
      {error && (
        <div style={{ background: "rgba(220,53,53,0.08)", border: "1px solid rgba(220,53,53,0.2)", borderRadius: 7, padding: "9px 12px", marginBottom: 16, color: "#c42b2b", fontFamily: "var(--app-font-sans)", fontSize: 13 }}>
          {error}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
        <div>
          <label style={labelStyle}>Company Name</label>
          <input style={inputStyle} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} required />
        </div>
        <div>
          <label style={labelStyle}>Admin Name</label>
          <input style={inputStyle} value={form.adminContactName} onChange={(e) => set("adminContactName", e.target.value)} required />
        </div>
        <div>
          <label style={labelStyle}>Admin Email</label>
          <input style={inputStyle} type="email" value={form.adminContactEmail} onChange={(e) => set("adminContactEmail", e.target.value)} required />
        </div>
        <div>
          <label style={labelStyle}>Billing Email</label>
          <input style={inputStyle} type="email" value={form.billingContactEmail} onChange={(e) => set("billingContactEmail", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Num Employees</label>
          <input style={inputStyle} type="number" min={1} value={form.numberOfEmployees} onChange={(e) => set("numberOfEmployees", e.target.value)} required />
        </div>
        <div>
          <label style={labelStyle}>Stipend/Employee ($)</label>
          <input style={inputStyle} type="number" min={10} step={1} value={form.stipendPerEmployee} onChange={(e) => set("stipendPerEmployee", e.target.value)} required placeholder="75" />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button type="submit" disabled={loading} style={{ background: navy, color: "white", border: "none", borderRadius: 7, padding: "9px 18px", fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: loading ? 0.7 : 1 }}>
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {initial?.id ? "Update" : "Create"} Employer
        </button>
        <button type="button" onClick={onCancel} style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.15)", borderRadius: 7, padding: "9px 14px", fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, color: navy, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <X size={13} /> Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminEmployers() {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"companyName" | "memberCount" | "createdAt">("createdAt");
  const [sortAsc, setSortAsc] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`${BASE}/api/admin/employers`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setEmployers(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createEmployer = async (data: EmployerFormData) => {
    const res = await fetch(`${BASE}/api/admin/employers`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed");
    setShowCreate(false);
    load();
  };

  const updateEmployer = async (id: string, data: EmployerFormData) => {
    const res = await fetch(`${BASE}/api/admin/employers/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed");
    setEditId(null);
    load();
  };

  const deleteEmployer = async (id: string) => {
    if (!confirm("Delete this employer? All member links will be removed.")) return;
    await fetch(`${BASE}/api/admin/employers/${id}`, { method: "DELETE", credentials: "include" });
    load();
  };

  const toggleSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortAsc((v) => !v);
    else { setSortKey(k); setSortAsc(true); }
  };

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null;

  const filtered = employers.filter((e) => {
    const q = search.toLowerCase();
    return e.companyName.toLowerCase().includes(q) || e.adminContactEmail.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    return sortAsc
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const thStyle = {
    fontFamily: "var(--app-font-sans)",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    padding: "10px 14px",
    cursor: "pointer",
    userSelect: "none" as const,
    textAlign: "left" as const,
    whiteSpace: "nowrap" as const,
    borderBottom: "1px solid rgba(212,34,126,0.08)",
  };

  return (
    <div style={{ minHeight: "100vh", padding: "40px 24px", background: "var(--warm-white)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 8 }}>
          <div>
            <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: navy, margin: 0 }}>Employer Accounts</h1>
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: 0, marginTop: 4 }}>
              Manage B2B wellness stipend programs
            </p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setEditId(null); }}
            style={{ background: navy, color: "white", border: "none", borderRadius: 8, padding: "10px 18px", fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
          >
            <Plus size={15} /> New Employer
          </button>
        </div>

        <AdminNav active="/admin/employers" />

        {/* Create form */}
        {showCreate && (
          <div style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.1)", borderRadius: 12, marginBottom: 24, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(212,34,126,0.08)", fontFamily: "var(--app-font-sans)", fontSize: 15, fontWeight: 700, color: navy }}>
              New Employer Account
            </div>
            <EmployerForm onSave={createEmployer} onCancel={() => setShowCreate(false)} />
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Search by company or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "1.5px solid rgba(212,34,126,0.15)",
              borderRadius: 8,
              padding: "9px 14px",
              fontFamily: "var(--app-font-sans)",
              fontSize: 14,
              color: navy,
              outline: "none",
              width: 280,
              background: "white",
            }}
          />
          <span style={{ marginLeft: 12, fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-muted)" }}>
            {sorted.length} of {employers.length}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}><Loader2 size={24} className="animate-spin" style={{ color: navy }} /></div>
        ) : employers.length === 0 ? (
          <div style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.1)", borderRadius: 12, padding: 60, textAlign: "center" }}>
            <Building2 size={40} color="rgba(212,34,126,0.15)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, fontWeight: 600, color: navy }}>No employer accounts yet</h3>
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)" }}>Click "New Employer" to create the first one.</p>
          </div>
        ) : (
          <div style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.1)", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(212,34,126,0.02)" }}>
                  <th style={thStyle} onClick={() => toggleSort("companyName")}>Company <SortIcon k="companyName" /></th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Invite Code</th>
                  <th style={{ ...thStyle, textAlign: "right" as const }}>Stipend</th>
                  <th style={{ ...thStyle, textAlign: "center" as const }} onClick={() => toggleSort("memberCount")}>Enrolled <SortIcon k="memberCount" /></th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle} onClick={() => toggleSort("createdAt")}>Created <SortIcon k="createdAt" /></th>
                  <th style={{ ...thStyle, width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((emp) => (
                  <>
                    <tr key={emp.id}>
                      <td style={{ padding: "12px 14px", fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 600, color: navy, borderBottom: editId === emp.id ? "none" : "1px solid rgba(212,34,126,0.06)" }}>
                        {emp.companyName}
                      </td>
                      <td style={{ padding: "12px 14px", fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", borderBottom: editId === emp.id ? "none" : "1px solid rgba(212,34,126,0.06)" }}>
                        <div style={{ fontWeight: 600, color: navy }}>{emp.adminContactName}</div>
                        <div style={{ fontSize: 12 }}>{emp.adminContactEmail}</div>
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: editId === emp.id ? "none" : "1px solid rgba(212,34,126,0.06)" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 13, background: "rgba(212,34,126,0.05)", padding: "3px 8px", borderRadius: 5, letterSpacing: "0.1em", color: navy, fontWeight: 700 }}>
                          {emp.inviteCode}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 600, color: navy, borderBottom: editId === emp.id ? "none" : "1px solid rgba(212,34,126,0.06)" }}>
                        {fmt(emp.stipendPerEmployee)}
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>{emp.numberOfEmployees} employees</div>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center", fontFamily: "var(--app-font-sans)", fontSize: 14, color: navy, borderBottom: editId === emp.id ? "none" : "1px solid rgba(212,34,126,0.06)" }}>
                        {emp.memberCount}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: editId === emp.id ? "none" : "1px solid rgba(212,34,126,0.06)" }}>
                        <StatusBadge status={emp.status} />
                      </td>
                      <td style={{ padding: "12px 14px", fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-muted)", borderBottom: editId === emp.id ? "none" : "1px solid rgba(212,34,126,0.06)" }}>
                        {new Date(emp.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: editId === emp.id ? "none" : "1px solid rgba(212,34,126,0.06)" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => setEditId(editId === emp.id ? null : emp.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: navy, opacity: 0.6 }}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteEmployer(emp.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#c42b2b", opacity: 0.7 }}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editId === emp.id && (
                      <tr key={`${emp.id}-edit`}>
                        <td colSpan={8} style={{ padding: 0, borderBottom: "1px solid rgba(212,34,126,0.08)" }}>
                          <EmployerForm
                            initial={emp}
                            onSave={(data) => updateEmployer(emp.id, data)}
                            onCancel={() => setEditId(null)}
                          />
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
  );
}
