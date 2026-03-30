import { useState, useEffect } from "react";
import { AdminNav } from "./Dashboard";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Provider {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: string;
  verificationStatus: string;
  createdAt: string;
  bio: string | null;
  offersTelehealth: boolean;
}

export default function AdminProviders() {
  const { toast } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetch(`${BASE}/api/admin/providers?limit=200`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.providers)) setProviders(data.providers);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateProvider = async (id: string, updates: Record<string, unknown>) => {
    setActingId(id);
    try {
      const res = await fetch(`${BASE}/api/admin/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...data.provider } : p)));
    } catch {
      toast({ title: "Error", description: "Action failed. Please try again.", variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const approve = (id: string) => {
    updateProvider(id, { status: "approved", verificationStatus: "verified" });
    toast({ title: "Provider approved", description: "Provider listing is now active." });
  };

  const reject = async () => {
    if (!rejectTarget) return;
    await updateProvider(rejectTarget, {
      status: "rejected",
      verificationStatus: "rejected",
      rejectionReason: rejectReason.trim() || null,
    });
    toast({ title: "Provider rejected", description: rejectReason ? `Reason: ${rejectReason}` : "Provider application rejected." });
    setRejectTarget(null);
    setRejectReason("");
  };

  const filtered = providers.filter((p) => {
    if (filter === "all") return true;
    return p.status === filter;
  });

  const statusBadge = (status: string) => {
    if (status === "approved") return { background: "rgba(61,107,82,0.1)", color: "var(--sage)", icon: <CheckCircle size={11} /> };
    if (status === "rejected") return { background: "rgba(192,57,43,0.08)", color: "#c0392b", icon: <XCircle size={11} /> };
    return { background: "rgba(184,137,42,0.1)", color: "var(--hpf-amber)", icon: <Clock size={11} /> };
  };

  return (
    <div className="min-h-screen px-4 md:px-10 py-10" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)" }}>Provider Management</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>Review applications and manage provider listings</p>
        </div>

        <AdminNav active="/admin/providers" />

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold capitalize"
              style={{
                background: filter === f ? "var(--navy)" : "white",
                color: filter === f ? "white" : "var(--navy)",
                border: "1.5px solid rgba(27,45,79,0.12)",
                cursor: "pointer",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              {f} {f === "pending" && providers.filter((p) => p.status === "pending").length > 0 ? `(${providers.filter((p) => p.status === "pending").length})` : ""}
            </button>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin" size={24} style={{ color: "var(--navy)" }} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead style={{ background: "rgba(27,45,79,0.02)", borderBottom: "1px solid rgba(27,45,79,0.08)" }}>
                  <tr>
                    {["Name", "Location", "Format", "Applied", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-3 py-3" style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                        No providers in this category
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p, i) => {
                      const badge = statusBadge(p.status);
                      return (
                        <tr key={p.id} style={{ borderTop: i === 0 ? "none" : "1px solid rgba(27,45,79,0.04)" }}>
                          <td className="px-3 py-3">
                            <p className="text-sm font-medium" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>{p.name}</p>
                            {p.bio && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{p.bio}</p>}
                          </td>
                          <td className="px-3 py-3 text-xs" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                            {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-0.5">
                              {p.offersTelehealth && <span className="text-xs" style={{ color: "var(--sage)", fontFamily: "var(--app-font-sans)" }}>Telehealth</span>}
                              {!p.offersTelehealth && <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>In-person</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                            {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={{ fontFamily: "var(--app-font-sans)", ...badge }}>
                              {badge.icon} {p.status}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {p.status === "pending" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => approve(p.id)}
                                  disabled={actingId === p.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                                  style={{ background: "var(--sage)", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
                                >
                                  {actingId === p.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={11} />}
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectTarget(p.id)}
                                  disabled={actingId === p.id}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                                  style={{ background: "rgba(192,57,43,0.08)", color: "#c0392b", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
                                >
                                  <XCircle size={11} /> Reject
                                </button>
                              </div>
                            )}
                            {p.status === "approved" && (
                              <button
                                onClick={() => { updateProvider(p.id, { status: "rejected" }); toast({ title: "Provider revoked", description: "Provider listing removed." }); }}
                                className="text-xs font-medium"
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}
                              >
                                Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reject modal */}
        {rejectTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
            <div className="w-full max-w-md p-6 rounded-2xl" style={{ background: "white" }}>
              <h3 className="text-base font-semibold mb-3" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>
                Reject Provider Application
              </h3>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                Optionally provide a reason for rejection.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional)…"
                rows={3}
                className="w-full px-4 py-3 rounded-lg text-sm resize-none outline-none mb-4"
                style={{ background: "var(--warm-white)", border: "1.5px solid rgba(27,45,79,0.12)", color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: "none", border: "1.5px solid rgba(27,45,79,0.15)", color: "var(--navy)", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={reject}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: "#c0392b", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
