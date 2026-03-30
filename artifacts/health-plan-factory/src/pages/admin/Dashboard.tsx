import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Stethoscope, FileText, Clock, TrendingUp, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Stats {
  totalMembers: number;
  totalProviders: number;
  totalPlans: number;
  pendingProviders: number;
  recentSignups: number;
  activeModalities?: number;
}

interface WeeklyData {
  week: string;
  signups: number;
}

function StatCard({ label, value, icon, loading, to }: { label: string; value: number; icon: React.ReactNode; loading: boolean; to?: string }) {
  return (
    <div className="p-5 rounded-2xl flex flex-col gap-3" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.08em" }}>{label}</span>
        <span style={{ color: "var(--hpf-amber)" }}>{icon}</span>
      </div>
      {loading ? (
        <div className="h-8 rounded animate-pulse" style={{ background: "rgba(27,45,79,0.06)" }} />
      ) : (
        <span className="text-3xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>{value.toLocaleString()}</span>
      )}
      {to && (
        <Link to={to} className="text-xs no-underline font-medium" style={{ color: "var(--hpf-amber)", fontFamily: "var(--app-font-sans)" }}>
          View details →
        </Link>
      )}
    </div>
  );
}

const navLinks = [
  { to: "/admin/dashboard", label: "Overview" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/providers", label: "Providers" },
  { to: "/admin/modalities", label: "Modalities" },
  { to: "/admin/settings", label: "Settings" },
];

export function AdminNav({ active }: { active: string }) {
  return (
    <nav className="flex gap-1 flex-wrap mb-8">
      {navLinks.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          className="px-4 py-2 rounded-lg text-sm font-medium no-underline"
          style={{
            background: active === n.to ? "var(--navy)" : "white",
            color: active === n.to ? "white" : "var(--navy)",
            border: "1.5px solid rgba(27,45,79,0.12)",
            fontFamily: "var(--app-font-sans)",
          }}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/admin/stats`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${BASE}/api/admin/weekly-signups`, { credentials: "include" }).then((r) => r.json()),
    ]).then(([statsData, weeklyRes]) => {
      setStats(statsData);
      if (Array.isArray(weeklyRes?.data)) setWeeklyData(weeklyRes.data);
      setLoading(false);
      setChartLoading(false);
    }).catch(() => { setLoading(false); setChartLoading(false); });
  }, []);

  return (
    <div className="min-h-screen px-4 md:px-10 py-10" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)" }}>
            Admin Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            Platform overview and management
          </p>
        </div>

        <AdminNav active="/admin/dashboard" />

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Members" value={stats?.totalMembers ?? 0} icon={<Users size={18} />} loading={loading} to="/admin/users" />
          <StatCard label="Providers" value={stats?.totalProviders ?? 0} icon={<Stethoscope size={18} />} loading={loading} to="/admin/providers" />
          <StatCard label="Plans" value={stats?.totalPlans ?? 0} icon={<FileText size={18} />} loading={loading} />
          <StatCard label="Pending" value={stats?.pendingProviders ?? 0} icon={<Clock size={18} />} loading={loading} to="/admin/providers" />
          <StatCard label="30d Signups" value={stats?.recentSignups ?? 0} icon={<TrendingUp size={18} />} loading={loading} />
          <StatCard label="Modalities" value={stats?.activeModalities ?? 0} icon={<Loader2 size={18} />} loading={loading} to="/admin/modalities" />
        </div>

        {/* Weekly signups chart */}
        <div className="p-6 rounded-2xl" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
          <h2 className="text-base font-semibold mb-5" style={{ fontFamily: "var(--app-font-serif)", color: "var(--navy)" }}>
            Weekly Signups
          </h2>
          {chartLoading ? (
            <div className="h-52 animate-pulse rounded-xl" style={{ background: "rgba(27,45,79,0.04)" }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} margin={{ top: 4, right: 20, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,45,79,0.06)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }} />
                <Tooltip contentStyle={{ fontFamily: "var(--app-font-sans)", fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="signups" name="Signups" fill="var(--navy)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
