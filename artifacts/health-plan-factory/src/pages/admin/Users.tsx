import { useState, useEffect } from "react";
import { AdminNav } from "./Dashboard";
import { Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
  createdAt: string;
}

type SortKey = "displayName" | "role" | "createdAt";

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`${BASE}/api/admin/users?limit=200`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.users)) setUsers(data.users);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.displayName ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let av = sortKey === "createdAt" ? a[sortKey] : (a[sortKey] ?? "");
    let bv = sortKey === "createdAt" ? b[sortKey] : (b[sortKey] ?? "");
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  const thStyle = {
    fontFamily: "var(--app-font-sans)",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    padding: "10px 12px",
    cursor: "pointer",
    userSelect: "none" as const,
  };

  const roleColor = (role: string) => {
    if (role === "admin") return { background: "rgba(224,32,64,0.1)", color: "var(--hpf-crimson)" };
    if (role === "provider") return { background: "rgba(125,181,92,0.1)", color: "var(--sage)" };
    return { background: "rgba(212,34,126,0.06)", color: "var(--hpf-pink)" };
  };

  return (
    <div className="min-h-screen px-4 md:px-10 py-10" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-pink)" }}>User Management</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>All registered members, providers, and admins</p>
        </div>

        <AdminNav active="/admin/users" />

        {/* Search */}
        <div className="mb-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role…"
            className="w-full max-w-sm px-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.12)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
          />
        </div>

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
                    <th style={thStyle} onClick={() => toggleSort("displayName")}>
                      <span className="inline-flex items-center gap-1">Name <SortIcon k="displayName" /></span>
                    </th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle} onClick={() => toggleSort("role")}>
                      <span className="inline-flex items-center gap-1">Role <SortIcon k="role" /></span>
                    </th>
                    <th style={thStyle} onClick={() => toggleSort("createdAt")}>
                      <span className="inline-flex items-center gap-1">Joined <SortIcon k="createdAt" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                        {search ? "No users match your search" : "No users yet"}
                      </td>
                    </tr>
                  ) : (
                    sorted.map((u, i) => (
                      <tr key={u.id} style={{ borderTop: i === 0 ? "none" : "1px solid rgba(212,34,126,0.04)" }}>
                        <td className="px-3 py-3">
                          <p className="text-sm font-medium" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                            {u.displayName ?? "—"}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-mono)" }}>
                            {u.id.slice(0, 8)}…
                          </p>
                        </td>
                        <td className="px-3 py-3 text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                          {u.email ?? "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                            style={{ fontFamily: "var(--app-font-sans)", ...roleColor(u.role) }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                          {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          {sorted.length} of {users.length} users
        </p>
      </div>
    </div>
  );
}
