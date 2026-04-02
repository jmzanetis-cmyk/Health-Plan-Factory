import { useState, useEffect } from "react";
import { Loader2, CalendarPlus, Mail, ExternalLink, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminNav } from "./Dashboard";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

type BookingStatus = "pending" | "contacted" | "declined";

interface BookingRequest {
  id: string;
  memberId: string;
  providerId: string;
  memberEmail: string;
  message: string;
  note: string | null;
  status: string;
  createdAt: string;
  memberName: string | null;
  providerName: string;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  contacted: "Contacted",
  declined: "Declined",
};

const STATUS_COLORS: Record<BookingStatus, { bg: string; color: string }> = {
  pending: { bg: "rgba(245,158,11,0.12)", color: "#d97706" },
  contacted: { bg: "rgba(125,181,92,0.12)", color: "#4a7c2f" },
  declined: { bg: "rgba(212,34,126,0.08)", color: "#9b1d5e" },
};

export default function BookingRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRequests = () => {
    setLoading(true);
    const params = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
    fetch(`${BASE}/api/admin/booking-requests${params}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data: { bookingRequests: BookingRequest[] }) => {
        setRequests(data.bookingRequests ?? []);
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load booking requests.", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const updateStatus = async (id: string, newStatus: BookingStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`${BASE}/api/admin/booking-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      toast({ title: "Status updated", description: `Marked as ${STATUS_LABELS[newStatus]}.` });
    } catch {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    contacted: requests.filter((r) => r.status === "contacted").length,
    declined: requests.filter((r) => r.status === "declined").length,
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 960, margin: "0 auto" }}>
      <AdminNav active="/admin/booking-requests" />
      <div className="flex items-center gap-3 mb-6">
        <CalendarPlus size={22} style={{ color: "var(--hpf-pink)" }} />
        <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.75rem", fontWeight: 700, color: "var(--hpf-pink)", margin: 0 }}>
          Booking Requests
        </h1>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3 mb-6">
        {(["", "pending", "contacted", "declined"] as const).map((s) => {
          const isAll = s === "";
          const label = isAll ? "All" : STATUS_LABELS[s];
          const count = isAll ? requests.length : counts[s];
          const isActive = statusFilter === s;
          const color = isAll ? "#6b7280" : STATUS_COLORS[s].color;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "0.35rem 0.9rem",
                borderRadius: 999,
                border: "1.5px solid",
                borderColor: isActive ? "var(--hpf-pink)" : "rgba(212,34,126,0.12)",
                background: isActive ? "rgba(212,34,126,0.06)" : "white",
                color: isActive ? "var(--hpf-pink)" : color,
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.78rem",
                cursor: "pointer",
                fontFamily: "var(--app-font-sans)",
              }}
            >
              {label} {count > 0 && <span style={{ fontWeight: 700 }}>({count})</span>}
            </button>
          );
        })}
        <button
          onClick={fetchRequests}
          style={{ marginLeft: "auto", padding: "0.35rem 0.9rem", borderRadius: 999, border: "1.5px solid rgba(212,34,126,0.12)", background: "white", color: "var(--hpf-pink)", fontSize: "0.78rem", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
          <Loader2 size={28} className="animate-spin" style={{ color: "var(--hpf-pink)" }} />
        </div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          <CalendarPlus size={36} style={{ color: "rgba(212,34,126,0.2)", marginBottom: "1rem" }} />
          <p style={{ fontSize: "1rem", fontWeight: 600 }}>No booking requests found</p>
          <p style={{ fontSize: "0.82rem", marginTop: 4 }}>
            {statusFilter ? `No requests with status "${STATUS_LABELS[statusFilter as BookingStatus]}".` : "No requests yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {requests.map((r) => {
            const isExpanded = expandedId === r.id;
            const st = (r.status || "pending") as BookingStatus;
            const stColor = STATUS_COLORS[st] ?? STATUS_COLORS.pending;
            return (
              <div
                key={r.id}
                style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)", borderRadius: 14, overflow: "hidden" }}
              >
                {/* Row header */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 1.25rem", cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                >
                  {/* Status chip */}
                  <span
                    style={{
                      padding: "0.2rem 0.6rem",
                      borderRadius: 999,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      background: stColor.bg,
                      color: stColor.color,
                      fontFamily: "var(--app-font-sans)",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {STATUS_LABELS[st]}
                  </span>

                  {/* Member name + email */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "var(--app-font-sans)", fontWeight: 600, fontSize: "0.88rem", color: "var(--hpf-pink)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.memberName ?? "Unknown member"} → {r.providerName}
                    </p>
                    <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.74rem", color: "var(--text-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.memberEmail} · {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>

                  <ChevronDown
                    size={16}
                    style={{ color: "var(--text-muted)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
                  />
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ padding: "0 1.25rem 1.25rem", borderTop: "1px solid rgba(212,34,126,0.06)" }}>
                    <div style={{ paddingTop: "0.75rem" }}>
                      <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--hpf-pink)", marginBottom: 4 }}>
                        Message
                      </p>
                      <div style={{ background: "rgba(212,34,126,0.03)", borderLeft: "3px solid var(--hpf-pink)", borderRadius: "0 8px 8px 0", padding: "0.75rem 1rem", marginBottom: r.note ? "0.75rem" : "1rem" }}>
                        <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                          {r.message}
                        </p>
                      </div>

                      {r.note && (
                        <>
                          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--hpf-pink)", marginBottom: 4 }}>
                            Additional note
                          </p>
                          <div style={{ background: "rgba(212,34,126,0.02)", borderLeft: "3px solid rgba(212,34,126,0.25)", borderRadius: "0 8px 8px 0", padding: "0.75rem 1rem", marginBottom: "1rem" }}>
                            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                              {r.note}
                            </p>
                          </div>
                        </>
                      )}

                      {/* Action row */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                        <a
                          href={`mailto:${r.memberEmail}`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            padding: "0.4rem 0.85rem", borderRadius: 8,
                            background: "rgba(212,34,126,0.06)", color: "var(--hpf-pink)",
                            fontSize: "0.78rem", fontWeight: 600,
                            fontFamily: "var(--app-font-sans)", textDecoration: "none",
                            border: "1.5px solid rgba(212,34,126,0.12)",
                          }}
                        >
                          <Mail size={12} /> Email member
                        </a>

                        <a
                          href={`/admin/providers?highlight=${r.providerId}`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            padding: "0.4rem 0.85rem", borderRadius: 8,
                            background: "white", color: "var(--text-muted)",
                            fontSize: "0.78rem", fontWeight: 500,
                            fontFamily: "var(--app-font-sans)", textDecoration: "none",
                            border: "1.5px solid rgba(0,0,0,0.06)",
                          }}
                        >
                          <ExternalLink size={12} /> View provider
                        </a>

                        <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
                          {(["pending", "contacted", "declined"] as BookingStatus[])
                            .filter((s) => s !== r.status)
                            .map((s) => (
                              <button
                                key={s}
                                onClick={() => updateStatus(r.id, s)}
                                disabled={updatingId === r.id}
                                style={{
                                  padding: "0.35rem 0.75rem",
                                  borderRadius: 8,
                                  border: "1.5px solid",
                                  borderColor: STATUS_COLORS[s].color,
                                  background: STATUS_COLORS[s].bg,
                                  color: STATUS_COLORS[s].color,
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: updatingId === r.id ? "wait" : "pointer",
                                  fontFamily: "var(--app-font-sans)",
                                  opacity: updatingId === r.id ? 0.6 : 1,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                }}
                              >
                                {updatingId === r.id ? <Loader2 size={10} className="animate-spin" /> : null}
                                Mark {STATUS_LABELS[s]}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
