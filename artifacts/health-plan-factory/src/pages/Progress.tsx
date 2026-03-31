import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@workspace/replit-auth-web";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Loader2, Plus, CheckCircle, BadgeCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const logSchema = z.object({
  rating: z.coerce.number().min(1).max(10).optional(),
  mood: z.coerce.number().min(1).max(10).optional(),
  pain: z.coerce.number().min(1).max(10).optional(),
  energy: z.coerce.number().min(1).max(10).optional(),
  note: z.string().max(500).optional(),
  sessionDate: z.string().optional(),
  sessionCostDollars: z.coerce.number().min(0).optional(), // entered in dollars; converted to cents on submit
}).refine((d) => d.rating ?? d.mood ?? d.pain ?? d.energy, {
  message: "Log at least one metric",
  path: ["rating"],
});
type LogForm = z.infer<typeof logSchema>;

interface ProgressLog {
  id: string;
  rating: number | null;
  mood: number | null;
  pain: number | null;
  energy: number | null;
  note: string | null;
  createdAt: string;
  sessionDate: string | null;
}

function SkeletonBlock({ h = 16 }: { h?: number }) {
  return <div className="animate-pulse rounded-md" style={{ height: h, background: "rgba(27,45,79,0.06)" }} />;
}

function MetricInput({ label, name, register }: { label: string; name: keyof LogForm; register: ReturnType<typeof useForm<LogForm>>["register"] }) {
  const inputStyle = {
    background: "var(--warm-white)",
    border: "1.5px solid rgba(27,45,79,0.12)",
    color: "var(--navy)",
    fontFamily: "var(--app-font-sans)",
    outline: "none",
    borderRadius: 8,
    textAlign: "center" as const,
  };
  return (
    <div className="flex flex-col items-center gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.06em" }}>{label}</label>
      <input
        type="number"
        min={1}
        max={10}
        {...register(name)}
        placeholder="1–10"
        className="w-20 px-2 py-2 text-sm"
        style={inputStyle}
      />
    </div>
  );
}

export default function Progress() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEnrolledWithEmployer, setIsEnrolledWithEmployer] = useState(false);
  const [lmnStatus, setLmnStatus] = useState<string>("none");
  const [lmnEligibleIds, setLmnEligibleIds] = useState<string[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LogForm>({
    resolver: zodResolver(logSchema),
    defaultValues: { sessionDate: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    if (!user) return;
    fetch(`${BASE}/api/progress?profileId=${user.id}&limit=60`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLogs(data.reverse());
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // Check if member is enrolled with an employer — determines whether to show session cost field
    fetch(`${BASE}/api/employer/enroll-status`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.enrolled) setIsEnrolledWithEmployer(true); })
      .catch(() => {});
    // Check LMN status for badge display
    fetch(`${BASE}/api/lmn/status`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.lmnStatus) setLmnStatus(data.lmnStatus);
        if (Array.isArray(data?.eligibleItems)) {
          setLmnEligibleIds(data.eligibleItems.map((i: { modalityId: string }) => i.modalityId));
        }
      })
      .catch(() => {});
  }, [user]);

  const onSubmit = async (data: LogForm) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE}/api/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profileId: user.id,
          rating: data.rating ? Number(data.rating) : undefined,
          mood: data.mood ? Number(data.mood) : undefined,
          pain: data.pain ? Number(data.pain) : undefined,
          energy: data.energy ? Number(data.energy) : undefined,
          note: data.note || null,
          sessionDate: data.sessionDate || null,
          // Convert dollars → cents for employer stipend deduction
          sessionCostCents: data.sessionCostDollars && data.sessionCostDollars > 0
            ? Math.round(data.sessionCostDollars * 100)
            : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save log");
      const created: ProgressLog = await res.json();
      setLogs((prev) => [...prev, created]);
      reset({ sessionDate: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
      toast({ title: "Progress logged!", description: "Your wellness metrics have been saved." });
    } catch {
      toast({ title: "Error", description: "Could not save your log. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const chartData = logs
    .slice(-30)
    .map((l) => ({
      date: new Date(l.sessionDate ?? l.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      Wellness: l.rating ?? undefined,
      Mood: l.mood ?? undefined,
      Energy: l.energy ?? undefined,
      Pain: l.pain ?? undefined,
    }));

  const avgOf = (field: keyof ProgressLog) => {
    const vals = logs.map((l) => l[field] as number | null).filter((v) => v != null) as number[];
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--warm-white)" }}>
        <Loader2 className="animate-spin" size={28} style={{ color: "var(--navy)" }} />
      </div>
    );
  }

  const cardStyle = { background: "white", border: "1px solid rgba(27,45,79,0.08)", borderRadius: 16 };
  const inputStyle = {
    background: "var(--warm-white)",
    border: "1.5px solid rgba(27,45,79,0.12)",
    color: "var(--navy)",
    fontFamily: "var(--app-font-sans)",
    outline: "none",
    borderRadius: 8,
  };

  return (
    <div className="min-h-screen px-4 md:px-10 py-10" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)" }}>
              Progress Tracker
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              Track mood, energy, pain, and overall wellness over time
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--navy)", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
          >
            <Plus size={15} /> Log Entry
          </button>
        </div>

        {/* Log form */}
        {showForm && (
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 flex flex-col gap-5" style={cardStyle}>
            <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>
              New Wellness Log
            </h2>
            <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              Fill in one or more metrics. Use 1–10 where higher is better (except Pain, where higher = more pain).
            </p>

            <div className="flex flex-wrap items-end gap-6">
              <MetricInput label="Wellness" name="rating" register={register} />
              <MetricInput label="Mood" name="mood" register={register} />
              <MetricInput label="Energy" name="energy" register={register} />
              <MetricInput label="Pain" name="pain" register={register} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.06em" }}>Date</label>
                <input type="date" {...register("sessionDate")} className="px-3 py-2 text-sm" style={{ ...inputStyle, width: 148 }} />
              </div>
            </div>
            {errors.rating && <p className="text-xs" style={{ color: "#c0392b", fontFamily: "var(--app-font-sans)" }}>{errors.rating.message}</p>}

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
                Notes (optional)
              </label>
              <textarea
                {...register("note")}
                rows={2}
                placeholder="How did you feel? What sessions did you complete?"
                className="w-full px-4 py-2.5 text-sm resize-none"
                style={inputStyle}
              />
            </div>

            {/* Session cost field — only shown when the member is enrolled in an employer stipend */}
            {isEnrolledWithEmployer && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
                  Session Cost (optional, $)
                </label>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                  Enter what you paid for this session. Your employer stipend will be applied first; any remainder is your out-of-pocket expense.
                </p>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="e.g. 25.00"
                  {...register("sessionCostDollars")}
                  className="px-3 py-2 text-sm"
                  style={{ ...inputStyle, width: 140 }}
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "none", border: "1.5px solid rgba(27,45,79,0.15)", color: "var(--navy)", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: submitting ? "rgba(27,45,79,0.4)" : "var(--navy)", border: "none", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "var(--app-font-sans)" }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {submitting ? "Saving..." : "Save Log"}
              </button>
            </div>
          </form>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Avg Wellness", value: avgOf("rating") ? `${avgOf("rating")}/10` : "—" },
            { label: "Avg Mood", value: avgOf("mood") ? `${avgOf("mood")}/10` : "—" },
            { label: "Avg Energy", value: avgOf("energy") ? `${avgOf("energy")}/10` : "—" },
            { label: "Total Logs", value: logs.length.toString() },
          ].map((s) => (
            <div key={s.label} className="p-4 text-center" style={cardStyle}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.08em" }}>
                {s.label}
              </p>
              {loading ? <SkeletonBlock h={32} /> : (
                <p className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>
                  {s.value}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="p-6" style={cardStyle}>
          <h2 className="text-base font-semibold mb-5" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>
            Trends Over Time
          </h2>
          {loading ? (
            <SkeletonBlock h={220} />
          ) : chartData.length < 2 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                Log at least 2 entries to see your trend chart.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,45,79,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }} />
                <Tooltip contentStyle={{ fontFamily: "var(--app-font-sans)", fontSize: 12, borderRadius: 8, border: "1px solid rgba(27,45,79,0.12)" }} />
                <Legend wrapperStyle={{ fontFamily: "var(--app-font-sans)", fontSize: 12 }} />
                <Line type="monotone" dataKey="Wellness" stroke="#1b2d4f" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="Mood" stroke="#3d6b52" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="Energy" stroke="#b8892a" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="Pain" stroke="#c0392b" strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 3" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent logs */}
        <div className="p-6" style={cardStyle}>
          <h2 className="text-base font-semibold mb-4" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>
            Recent Entries
          </h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => <SkeletonBlock key={i} h={56} />)}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              No logs yet. Click "Log Entry" to start tracking.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {[...logs].reverse().slice(0, 10).map((l) => {
                const metrics = [
                  l.rating != null ? `Wellness ${l.rating}` : null,
                  l.mood != null ? `Mood ${l.mood}` : null,
                  l.energy != null ? `Energy ${l.energy}` : null,
                  l.pain != null ? `Pain ${l.pain}` : null,
                ].filter(Boolean);
                return (
                  <div key={l.id} className="flex items-start justify-between py-3 px-3 rounded-xl" style={{ background: "var(--warm-white)", border: "1px solid rgba(27,45,79,0.04)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-xs font-medium" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-mono)", margin: 0 }}>
                          {metrics.join(" · ")}
                        </p>
                        {lmnStatus === "received" && lmnEligibleIds.length > 0 && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(61,107,82,0.1)", border: "1px solid rgba(61,107,82,0.22)", borderRadius: 20, padding: "2px 8px", fontFamily: "var(--app-font-sans)", fontSize: 10, fontWeight: 700, color: "#3d6b52", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                            <BadgeCheck size={10} color="#3d6b52" />
                            LMN on file
                          </span>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
                        {l.note ?? <em style={{ color: "var(--text-muted)" }}>No notes</em>}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                        {new Date(l.sessionDate ?? l.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div
                      className="ml-4 shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        background: (l.rating ?? 0) >= 7 ? "rgba(61,107,82,0.1)" : (l.rating ?? 0) >= 5 ? "rgba(184,137,42,0.1)" : "rgba(192,57,43,0.08)",
                        color: (l.rating ?? 0) >= 7 ? "var(--sage)" : (l.rating ?? 0) >= 5 ? "var(--hpf-amber)" : "#c0392b",
                        fontFamily: "var(--app-font-serif)",
                      }}
                    >
                      {l.rating ?? "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
