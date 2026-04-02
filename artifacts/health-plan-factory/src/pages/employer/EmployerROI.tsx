import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { Loader2, TrendingUp, BarChart2, Info } from "lucide-react";
import { EmployerNav } from "./EmployerDashboard";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");
const navy = "#2C2825";
const pink = "#D4227E";
const sage = "#7DB55C";

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString("default", { month: "short" });
}

function fmtScore(v: number | null) {
  if (v == null) return "—";
  return v.toFixed(1);
}

function fmtPct(v: number | null) {
  if (v == null) return "—";
  return `${v}%`;
}

function fmtDollar(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface TrendPoint {
  month: string;
  avgScore: number | null;
}

interface BenchmarkData {
  privacySuppressed: boolean;
  employer: {
    totalEnrolled: number;
    avgWellnessScore: number | null;
    utilizationRate: number | null;
  };
  platform: {
    avgWellnessScore: number | null;
    utilizationRate: number | null;
    sampleSize: string;
    qualifiedEmployerCount: number;
  };
}

function WellnessTrendChart({ trend, suppressed }: { trend: TrendPoint[]; suppressed: boolean }) {
  const chartData = trend.map((t) => ({
    name: monthLabel(t.month),
    score: t.avgScore,
  }));

  const hasData = trend.some((t) => t.avgScore != null);

  return (
    <div style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.1)", borderRadius: 12, padding: "24px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <TrendingUp size={16} color={pink} />
        <h3 style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 700, color: navy, margin: 0 }}>
          Wellness Score Trend
        </h3>
      </div>
      <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-muted)", margin: "0 0 20px" }}>
        Average employee wellness rating month-over-month (scale 1–10)
      </p>

      {suppressed ? (
        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 28 }}>🔒</span>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", textAlign: "center", margin: 0 }}>
            Data available once 5+ employees enroll
          </p>
        </div>
      ) : !hasData ? (
        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
            No wellness ratings logged yet. Encourage employees to log sessions!
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,34,126,0.06)" />
            <XAxis dataKey="name" tick={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: number | null) => v != null ? [v.toFixed(1), "Avg Score"] : ["—", "Avg Score"]}
              contentStyle={{ fontFamily: "var(--app-font-sans)", fontSize: 12, border: "1px solid rgba(212,34,126,0.15)", borderRadius: 8 }}
            />
            <ReferenceLine y={7} stroke="rgba(125,181,92,0.3)" strokeDasharray="4 4" label={{ value: "Target 7", position: "right", fontSize: 10, fill: sage }} />
            <Line
              type="monotone"
              dataKey="score"
              stroke={pink}
              strokeWidth={2.5}
              dot={{ fill: pink, r: 4 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function BenchmarkCard({ data }: { data: BenchmarkData }) {
  const { employer, platform, privacySuppressed } = data;

  function delta(emp: number | null, plat: number | null) {
    if (emp == null || plat == null) return null;
    return emp - plat;
  }

  const scoreDelta = delta(employer.avgWellnessScore, platform.avgWellnessScore);
  const utilDelta = delta(employer.utilizationRate, platform.utilizationRate);

  function DeltaBadge({ d, unit }: { d: number | null; unit: string }) {
    if (d == null) return null;
    const up = d >= 0;
    return (
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--app-font-sans)",
        padding: "2px 7px",
        borderRadius: 20,
        background: up ? "rgba(125,181,92,0.1)" : "rgba(224,32,64,0.1)",
        color: up ? sage : "#c42b2b",
        marginLeft: 8,
      }}>
        {up ? "+" : ""}{d > 0 ? d.toFixed(1) : d.toFixed(0)}{unit} vs platform
      </span>
    );
  }

  return (
    <div style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.1)", borderRadius: 12, padding: "24px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <BarChart2 size={16} color={pink} />
        <h3 style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 700, color: navy, margin: 0 }}>
          Industry Benchmark
        </h3>
      </div>
      <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-muted)", margin: "0 0 20px" }}>
        Your company vs. anonymized platform-wide averages
        {platform.sampleSize && ` (n = ${platform.sampleSize} employees)`}
      </p>

      {privacySuppressed ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <span style={{ fontSize: 28 }}>🔒</span>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
            Available once 5+ employees enroll
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            {
              label: "Avg Wellness Score",
              yours: fmtScore(employer.avgWellnessScore),
              platform: fmtScore(platform.avgWellnessScore),
              delta: scoreDelta,
              unit: " pts",
            },
            {
              label: "Stipend Utilization Rate",
              yours: fmtPct(employer.utilizationRate),
              platform: fmtPct(platform.utilizationRate),
              delta: utilDelta,
              unit: "%",
            },
          ].map((row) => (
            <div key={row.label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600, color: navy }}>
                  {row.label}
                </span>
                <DeltaBadge d={row.delta} unit={row.unit} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "rgba(212,34,126,0.04)", border: "1px solid rgba(212,34,126,0.1)", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>Your Company</div>
                  <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 22, fontWeight: 700, color: navy }}>{row.yours}</div>
                </div>
                <div style={{ background: "rgba(107,132,153,0.05)", border: "1px solid rgba(107,132,153,0.1)", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>Platform Avg</div>
                  <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 22, fontWeight: 700, color: "var(--text-secondary)" }}>{row.platform}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ margin: "16px 0 0", fontFamily: "var(--app-font-sans)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
        Platform averages are anonymized aggregate data from employers with 5+ enrolled members. No individual or company-level data is shared.
      </p>
    </div>
  );
}

interface RoiInputs {
  headcount: number;
  avgSalary: number;
  sickDaysReduced: number;
  productivityPct: number;
  annualStipendCents: number;
}

function RoiCalculator({ defaultStipendCents }: { defaultStipendCents: number }) {
  const [inputs, setInputs] = useState<RoiInputs>({
    headcount: 50,
    avgSalary: 75000,
    sickDaysReduced: 2.0,    // RAND 2013 research default
    productivityPct: 2.5,    // HBR 2010 research default
    annualStipendCents: defaultStipendCents,
  });

  // Sync stipend default when async fetch resolves (prop arrives after first render)
  useEffect(() => {
    if (defaultStipendCents > 0) {
      setInputs((prev) => ({ ...prev, annualStipendCents: defaultStipendCents }));
    }
  }, [defaultStipendCents]);

  function upd(field: keyof RoiInputs, raw: string) {
    const val = parseFloat(raw);
    if (!isNaN(val) && val >= 0) {
      setInputs((prev) => ({ ...prev, [field]: val }));
    }
  }

  // Formulas use all editable inputs — sources noted in the disclaimer below.
  const WORK_DAYS_PER_YEAR = 235; // standard US working days

  const dailySalary = inputs.avgSalary / WORK_DAYS_PER_YEAR;
  const sickDaySavings = Math.round(inputs.headcount * inputs.sickDaysReduced * dailySalary);
  const productivityGain = Math.round(inputs.headcount * inputs.avgSalary * (inputs.productivityPct / 100));
  const totalValue = sickDaySavings + productivityGain;
  const annualStipendTotal = Math.round(inputs.annualStipendCents / 100);
  const netROIPct = annualStipendTotal > 0
    ? Math.round(((totalValue - annualStipendTotal) / annualStipendTotal) * 100)
    : 0;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1.5px solid rgba(212,34,126,0.2)",
    fontSize: 14,
    fontFamily: "var(--app-font-sans)",
    color: navy,
    outline: "none",
    boxSizing: "border-box",
    background: "white",
  };

  return (
    <div style={{ background: "white", border: "1.5px solid rgba(212,34,126,0.1)", borderRadius: 12, padding: "24px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>🧮</span>
        <h3 style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 700, color: navy, margin: 0 }}>
          ROI Calculator
        </h3>
      </div>
      <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, color: "var(--text-muted)", margin: "0 0 20px" }}>
        Estimate your program's financial return using industry research averages. Edit inputs to match your organization.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        {([
          { key: "headcount" as const, label: "Enrolled Employees", prefix: "", suffix: "%", min: 1, hint: "" },
          { key: "avgSalary" as const, label: "Avg Annual Salary", prefix: "$", suffix: "", min: 0, hint: "" },
          { key: "sickDaysReduced" as const, label: "Sick Days Reduced / Year", prefix: "", suffix: " days", min: 0, hint: "RAND 2013: ~2 days avg" },
          { key: "productivityPct" as const, label: "Productivity Gain %", prefix: "", suffix: "%", min: 0, hint: "HBR 2010: ~2.5% avg" },
          { key: "annualStipendCents" as const, label: "Annual Stipend Spend", prefix: "$", suffix: " (total)", min: 0, hint: "" },
        ] as const).map((f) => (
          <div key={f.key} style={f.key === "annualStipendCents" ? { gridColumn: "1 / -1" } : {}}>
            <label style={{ display: "block", fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 4 }}>
              {f.label}
              {f.hint && <span style={{ fontSize: 10, fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 6 }}>({f.hint})</span>}
            </label>
            <div style={{ position: "relative" }}>
              {f.prefix && (
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-muted)" }}>
                  {f.prefix}
                </span>
              )}
              <input
                type="number"
                min={f.min}
                step={f.key === "productivityPct" || f.key === "sickDaysReduced" ? 0.1 : 1}
                value={f.key === "annualStipendCents" ? Math.round(inputs[f.key] / 100) : inputs[f.key]}
                onChange={(e) => {
                  if (f.key === "annualStipendCents") {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v >= 0) setInputs((prev) => ({ ...prev, annualStipendCents: Math.round(v * 100) }));
                  } else {
                    upd(f.key, e.target.value);
                  }
                }}
                style={{ ...inputStyle, paddingLeft: f.prefix ? 22 : 12 }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Sick-Day Savings", value: fmtDollar(sickDaySavings), sub: `${inputs.sickDaysReduced} days × ${inputs.headcount} employees`, color: sage },
          { label: "Productivity Gain", value: fmtDollar(productivityGain), sub: `${inputs.productivityPct.toFixed(1)}% of payroll recovered`, color: "#4a90e2" },
          { label: "Total Annual Value", value: fmtDollar(totalValue), sub: "combined program benefit", color: navy },
          {
            label: "Net ROI",
            value: `${netROIPct >= 0 ? "+" : ""}${netROIPct}%`,
            sub: "vs. stipend investment",
            color: netROIPct >= 0 ? sage : "#c42b2b",
          },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(212,34,126,0.03)", border: "1.5px solid rgba(212,34,126,0.08)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: "rgba(107,132,153,0.05)",
        border: "1px solid rgba(107,132,153,0.12)",
        borderRadius: 8,
        padding: "12px 16px",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}>
        <Info size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
          <strong>Disclaimer:</strong> All inputs are editable to reflect your organization's actual data. Research-based defaults:
          Sick-day reduction default (2.0 days/yr): RAND Corporation, <em>Wellness Programs in the Workplace</em> (2013).
          Productivity gain default (2.5%): Berry, Mirabito & Baun (2010), Harvard Business Review.
          Estimates are illustrative — actual results vary by organization, demographics, and program engagement.
        </p>
      </div>
    </div>
  );
}

export default function EmployerROI() {
  const navigate = useNavigate();
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendSuppressed, setTrendSuppressed] = useState(false);
  const [benchmarks, setBenchmarks] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [defaultStipend, setDefaultStipend] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetch(`${BASE}/api/employer/wellness-trend`, { credentials: "include" }),
      fetch(`${BASE}/api/employer/benchmarks`, { credentials: "include" }),
      fetch(`${BASE}/api/employer/me`, { credentials: "include" }),
    ])
      .then(async ([tr, bk, me]) => {
        if (tr.status === 404 || bk.status === 404) {
          navigate("/employer");
          return;
        }
        if (cancelled) return;
        const [trData, bkData, meData] = await Promise.all([tr.json(), bk.json(), me.json()]);
        setTrend(trData.trend ?? []);
        setTrendSuppressed(!!trData.privacySuppressed);
        setBenchmarks(bkData);
        if (meData?.stipendPerEmployee) {
          setDefaultStipend(meData.stipendPerEmployee * 12 * (meData.numberOfEmployees ?? 1));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: navy }} />
      </div>
    );
  }

  return (
    <div style={{ background: "var(--warm-white)", minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: 8 }}>
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.8rem", fontWeight: 700, color: navy, margin: "0 0 4px" }}>
            ROI & Impact
          </h1>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
            Measure the return on your wellness investment with trend data, benchmarks, and research-backed estimates.
          </p>
        </div>

        <EmployerNav active="/employer/roi" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <WellnessTrendChart trend={trend} suppressed={trendSuppressed} />
          {benchmarks && <BenchmarkCard data={benchmarks} />}
        </div>

        <RoiCalculator defaultStipendCents={defaultStipend} />
      </div>
    </div>
  );
}
