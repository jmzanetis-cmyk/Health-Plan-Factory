import { useState, useEffect } from "react";
import { AdminNav } from "./Dashboard";
import { Mail, MessageSquare, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");
const navy = "#2C2825";

interface NotificationLogEntry {
  id: string;
  profileId: string;
  channel: "email" | "sms";
  type: string;
  status: "queued" | "sent" | "failed";
  sentAt: string | null;
  scheduledFor: string | null;
  createdAt: string;
  email: string | null;
  displayName: string | null;
}

interface NotificationLogResponse {
  total: number;
  page: number;
  limit: number;
  entries: NotificationLogEntry[];
}

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(125,181,92,0.1)", color: "#7DB55C", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, fontFamily: "var(--app-font-sans)" }}>
      <CheckCircle2 size={11} /> Sent
    </span>
  );
  if (status === "failed") return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(192,57,43,0.1)", color: "#c0392b", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, fontFamily: "var(--app-font-sans)" }}>
      <XCircle size={11} /> Failed
    </span>
  );
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(224,32,64,0.1)", color: "#E02040", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, fontFamily: "var(--app-font-sans)" }}>
      <Clock size={11} /> Queued
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  if (channel === "sms") return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(212,34,126,0.07)", color: navy, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, fontFamily: "var(--app-font-sans)" }}>
      <MessageSquare size={11} /> SMS
    </span>
  );
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(212,34,126,0.07)", color: navy, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, fontFamily: "var(--app-font-sans)" }}>
      <Mail size={11} /> Email
    </span>
  );
}

function fmtType(type: string): string {
  return type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminMessages() {
  const [data, setData] = useState<NotificationLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");

  const LIMIT = 50;

  const load = (p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
    if (statusFilter) params.set("status", statusFilter);
    if (channelFilter) params.set("channel", channelFilter);
    fetch(`${BASE}/api/admin/notification-log?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page, statusFilter, channelFilter]);

  const pages = data ? Math.ceil(data.total / LIMIT) : 0;

  return (
    <div style={{ background: "var(--warm-white)", minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: navy, marginBottom: 4 }}>Admin</h1>
        <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", marginBottom: 28 }}>
          Platform administration
        </p>

        <AdminNav active="/admin/messages" />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.4rem", fontWeight: 700, color: navy, margin: 0 }}>Message History</h2>
            {data && <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{data.total.toLocaleString()} total messages</p>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid rgba(212,34,126,0.15)", fontFamily: "var(--app-font-sans)", fontSize: 13, color: navy, background: "white" }}
            >
              <option value="">All statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="queued">Queued</option>
            </select>
            <select
              value={channelFilter}
              onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
              style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid rgba(212,34,126,0.15)", fontFamily: "var(--app-font-sans)", fontSize: 13, color: navy, background: "white" }}
            >
              <option value="">All channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Loader2 size={28} className="animate-spin" style={{ color: navy }} />
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div style={{ background: "white", borderRadius: 12, padding: 48, textAlign: "center", border: "1px solid rgba(212,34,126,0.08)" }}>
            <Mail size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, color: "var(--text-secondary)" }}>No messages sent yet.</p>
          </div>
        ) : (
          <>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(212,34,126,0.08)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(212,34,126,0.08)" }}>
                    {["Member", "Channel", "Type", "Status", "Sent At"].map((h) => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <tr key={entry.id} style={{ borderBottom: "1px solid rgba(212,34,126,0.05)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, color: navy }}>{entry.displayName ?? "—"}</div>
                        <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, color: "var(--text-muted)" }}>{entry.email ?? entry.profileId}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}><ChannelBadge channel={entry.channel} /></td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: navy }}>{fmtType(entry.type)}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}><StatusBadge status={entry.status} /></td>
                      <td style={{ padding: "12px 16px", fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)" }}>{fmtDate(entry.sentAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
                <button
                  onClick={() => { if (page > 1) setPage(page - 1); }}
                  disabled={page <= 1}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid rgba(212,34,126,0.15)", background: "white", fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, color: navy, cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}
                >
                  ← Previous
                </button>
                <span style={{ display: "flex", alignItems: "center", fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)" }}>
                  Page {page} of {pages}
                </span>
                <button
                  onClick={() => { if (page < pages) setPage(page + 1); }}
                  disabled={page >= pages}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid rgba(212,34,126,0.15)", background: "white", fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, color: navy, cursor: page >= pages ? "not-allowed" : "pointer", opacity: page >= pages ? 0.4 : 1 }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
