import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, CheckCircle, XCircle, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

const TAX_BRACKETS = [
  { label: "10%", value: 10 },
  { label: "12%", value: 12 },
  { label: "22%", value: 22 },
  { label: "24%", value: 24 },
  { label: "32%", value: 32 },
  { label: "35%", value: 35 },
  { label: "37%", value: 37 },
];

const MODALITIES = [
  {
    emoji: "🏊",
    name: "Physical Therapy",
    eligible: true,
    eligibleNote: "Fully eligible with prescription",
    avgAnnual: 1200,
    category: "Medical",
  },
  {
    emoji: "💆",
    name: "Massage Therapy",
    eligible: true,
    eligibleNote: "Eligible with Letter of Medical Necessity (LMN)",
    avgAnnual: 900,
    category: "Therapeutic",
  },
  {
    emoji: "🌿",
    name: "Acupuncture",
    eligible: true,
    eligibleNote: "Eligible — widely accepted for pain management",
    avgAnnual: 800,
    category: "Therapeutic",
  },
  {
    emoji: "🦴",
    name: "Chiropractic Care",
    eligible: true,
    eligibleNote: "Fully eligible — recognized medical expense",
    avgAnnual: 700,
    category: "Medical",
  },
  {
    emoji: "🔬",
    name: "Functional Medicine",
    eligible: true,
    eligibleNote: "Eligible when provided by licensed practitioners",
    avgAnnual: 1500,
    category: "Medical",
  },
  {
    emoji: "🧠",
    name: "Mental Wellness / Therapy",
    eligible: true,
    eligibleNote: "Fully eligible — mental health is a covered expense",
    avgAnnual: 1800,
    category: "Medical",
  },
  {
    emoji: "🥗",
    name: "Nutrition Coaching",
    eligible: "partial",
    eligibleNote: "Eligible only when prescribed for a specific medical condition",
    avgAnnual: 600,
    category: "Lifestyle",
  },
  {
    emoji: "🧘",
    name: "Yoga / Mind-Body",
    eligible: false,
    eligibleNote: "Generally not eligible without LMN for specific condition",
    avgAnnual: 500,
    category: "Lifestyle",
  },
  {
    emoji: "🏃",
    name: "Personal Training",
    eligible: false,
    eligibleNote: "Not eligible — general fitness is excluded",
    avgAnnual: 960,
    category: "Lifestyle",
  },
  {
    emoji: "💤",
    name: "Sleep Optimization",
    eligible: "partial",
    eligibleNote: "Eligible for sleep studies and CPAP; apps and coaching generally excluded",
    avgAnnual: 400,
    category: "Lifestyle",
  },
  {
    emoji: "💊",
    name: "Supplements",
    eligible: false,
    eligibleNote: "Not eligible unless prescribed for a specific condition",
    avgAnnual: 300,
    category: "Lifestyle",
  },
  {
    emoji: "📱",
    name: "App-Based Programs",
    eligible: "partial",
    eligibleNote: "Mental health apps may qualify; fitness apps generally do not",
    avgAnnual: 240,
    category: "Lifestyle",
  },
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function EligibilityBadge({ eligible }: { eligible: boolean | "partial" }) {
  if (eligible === true) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: "rgba(34,197,94,0.1)", color: "#15803d", border: "1px solid rgba(34,197,94,0.25)" }}
      >
        <CheckCircle size={11} /> HSA/FSA Eligible
      </span>
    );
  }
  if (eligible === "partial") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: "rgba(234,179,8,0.1)", color: "#a16207", border: "1px solid rgba(234,179,8,0.25)" }}
      >
        <Info size={11} /> Conditional
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: "rgba(239,68,68,0.07)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.15)" }}
    >
      <XCircle size={11} /> Not Eligible
    </span>
  );
}

function ShareButton({
  annualBudget,
  taxBracket,
  estimatedSavings,
}: {
  annualBudget: number;
  taxBracket: number;
  estimatedSavings: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `I could save ${formatCurrency(estimatedSavings)}/year by using HSA/FSA for my $${annualBudget} wellness budget (${taxBracket}% bracket). Check your savings: ${url}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "My HSA/FSA Savings Estimate", text, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center px-7 py-4 rounded-lg text-sm font-medium transition-all"
      style={{
        border: "1.5px solid rgba(212,34,126,0.2)",
        color: "var(--hpf-pink)",
        fontFamily: "var(--app-font-sans)",
        background: "transparent",
        cursor: "pointer",
      }}
    >
      {copied ? "Link copied!" : "Share my savings estimate"}
    </button>
  );
}

const BUDGET_MIN = 600;
const BUDGET_MAX = 8400;
const VALID_BRACKETS = new Set(TAX_BRACKETS.map((b) => b.value));
const DEFAULT_BUDGET = 2400;
const DEFAULT_BRACKET = 22;

function normalizeParams(rawBudget: string | null, rawBracket: string | null) {
  const parsedBudget = parseInt(rawBudget ?? "", 10);
  const budget = Number.isFinite(parsedBudget)
    ? Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, parsedBudget))
    : DEFAULT_BUDGET;

  const parsedBracket = parseInt(rawBracket ?? "", 10);
  const bracket = VALID_BRACKETS.has(parsedBracket) ? parsedBracket : DEFAULT_BRACKET;

  return { budget, bracket };
}

export default function SavingsCalculator() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { budget: initBudget, bracket: initBracket } = normalizeParams(
    searchParams.get("budget"),
    searchParams.get("bracket"),
  );

  const [annualBudget, setAnnualBudget] = useState(initBudget);
  const [taxBracket, setTaxBracket] = useState(initBracket);
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);

  const updateUrl = useCallback((budget: number, bracket: number) => {
    const params = new URLSearchParams();
    params.set("budget", String(budget));
    params.set("bracket", String(bracket));
    navigate(`?${params.toString()}`, { replace: true });
  }, [navigate]);

  useEffect(() => {
    updateUrl(annualBudget, taxBracket);
  }, [annualBudget, taxBracket, updateUrl]);

  const eligibleModalities = MODALITIES.filter((m) => m.eligible === true);
  const eligibleAnnualCost = eligibleModalities.reduce((sum, m) => sum + m.avgAnnual, 0);
  const hsaFsaSpendable = Math.min(annualBudget, eligibleAnnualCost);
  const estimatedSavings = Math.round((hsaFsaSpendable * taxBracket) / 100);

  const visibleModalities = MODALITIES.filter((m) => m.avgAnnual <= annualBudget * 1.5);

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>

      {/* ── HERO ── */}
      <section
        className="relative px-6 md:px-12 py-10 md:py-16"
        style={{
          background: "var(--off-white)",
          borderBottom: "1px solid rgba(212,34,126,0.08)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(212,34,126,0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="section-tag">HSA/FSA Savings</div>
          <h1
            className="mb-5 leading-tight"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(1.8rem, 5vw, 3.8rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--hpf-deep)",
            }}
          >
            How much could you save with{" "}
            <em style={{ color: "var(--hpf-crimson)" }}>tax-free</em> wellness dollars?
          </h1>
          <p
            className="mb-8 max-w-xl leading-relaxed"
            style={{ fontSize: "1.05rem", fontWeight: 300, color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
          >
            Enter your annual wellness budget and tax bracket to see your estimated HSA/FSA tax savings
            — plus a full breakdown of which wellness services qualify.
          </p>
          <div
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
            style={{ background: "rgba(34,197,94,0.08)", color: "#15803d", border: "1px solid rgba(34,197,94,0.2)" }}
          >
            <Info size={12} />
            For illustrative purposes only — consult your plan administrator for eligibility
          </div>
        </div>
      </section>

      {/* ── CALCULATOR ── */}
      <section className="px-6 md:px-12 py-8 md:py-14">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-start">

          {/* Inputs */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: "white",
              border: "1px solid rgba(212,34,126,0.1)",
              boxShadow: "0 4px 20px rgba(212,34,126,0.06)",
            }}
          >
            <h2
              className="mb-6 text-lg font-bold"
              style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}
            >
              Your inputs
            </h2>

            {/* Annual Budget */}
            <div className="mb-8">
              <label
                className="flex items-center gap-2 text-sm font-semibold mb-3"
                style={{ color: "var(--hpf-deep)", fontFamily: "var(--app-font-sans)" }}
              >
                <DollarSign size={14} style={{ color: "var(--hpf-pink)" }} />
                Annual wellness budget
              </label>
              <div className="flex items-center gap-4 mb-3">
                <span
                  className="text-3xl font-bold"
                  style={{ fontFamily: "var(--app-font-mono)", color: "var(--hpf-pink)" }}
                >
                  {formatCurrency(annualBudget)}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                  / year
                </span>
              </div>
              <input
                type="range"
                min={600}
                max={8400}
                step={100}
                value={annualBudget}
                onChange={(e) => setAnnualBudget(parseInt(e.target.value, 10))}
                className="w-full"
                style={{ accentColor: "var(--hpf-pink)" }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-mono)" }}>
                <span>$600</span>
                <span>$8,400</span>
              </div>
            </div>

            {/* Tax Bracket */}
            <div>
              <label
                className="flex items-center gap-2 text-sm font-semibold mb-3"
                style={{ color: "var(--hpf-deep)", fontFamily: "var(--app-font-sans)" }}
              >
                <TrendingUp size={14} style={{ color: "var(--hpf-pink)" }} />
                Federal tax bracket
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TAX_BRACKETS.map((bracket) => (
                  <button
                    key={bracket.value}
                    type="button"
                    onClick={() => setTaxBracket(bracket.value)}
                    className="rounded-lg py-2 text-sm font-semibold transition-all"
                    style={{
                      background: taxBracket === bracket.value ? "var(--hpf-pink)" : "var(--off-white)",
                      color: taxBracket === bracket.value ? "white" : "var(--text-secondary)",
                      border: taxBracket === bracket.value
                        ? "1.5px solid var(--hpf-pink)"
                        : "1.5px solid rgba(212,34,126,0.1)",
                      fontFamily: "var(--app-font-mono)",
                      cursor: "pointer",
                    }}
                  >
                    {bracket.label}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                HSA/FSA contributions reduce your taxable income at your marginal rate.
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="flex flex-col gap-4">
            {/* Savings Card */}
            <div
              className="rounded-2xl p-8"
              style={{
                background: "var(--hpf-pink)",
                boxShadow: "0 8px 30px rgba(212,34,126,0.2)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--app-font-sans)" }}
              >
                Estimated annual tax savings
              </p>
              <div
                className="mb-2"
                style={{
                  fontFamily: "var(--app-font-serif)",
                  fontSize: "clamp(2.8rem, 6vw, 4rem)",
                  fontWeight: 700,
                  color: "white",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {formatCurrency(estimatedSavings)}
              </div>
              <p
                className="text-sm font-light mb-6"
                style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--app-font-sans)" }}
              >
                based on {formatCurrency(hsaFsaSpendable)} in HSA/FSA-eligible spending at {taxBracket}% tax rate
              </p>
              <div
                className="rounded-xl p-4"
                style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(4px)" }}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--app-font-sans)" }}>
                      Your annual budget
                    </p>
                    <p className="text-lg font-bold" style={{ fontFamily: "var(--app-font-mono)", color: "white" }}>
                      {formatCurrency(annualBudget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--app-font-sans)" }}>
                      HSA/FSA eligible
                    </p>
                    <p className="text-lg font-bold" style={{ fontFamily: "var(--app-font-mono)", color: "white" }}>
                      {formatCurrency(hsaFsaSpendable)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Share banner */}
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{
                background: "white",
                border: "1px solid rgba(212,34,126,0.1)",
                boxShadow: "0 2px 8px rgba(212,34,126,0.04)",
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                  Share this scenario
                </p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-mono)" }}>
                  {typeof window !== "undefined" ? window.location.href : ""}
                </p>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                style={{
                  background: "var(--off-white)",
                  color: "var(--hpf-pink)",
                  border: "1.5px solid rgba(212,34,126,0.15)",
                  cursor: "pointer",
                  fontFamily: "var(--app-font-sans)",
                }}
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
              >
                Copy link
              </button>
            </div>

            {/* Disclaimer */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "rgba(234,179,8,0.05)",
                border: "1px solid rgba(234,179,8,0.2)",
              }}
            >
              <p className="text-xs leading-relaxed" style={{ color: "#92400e", fontFamily: "var(--app-font-sans)" }}>
                <strong>Disclaimer:</strong> This calculator is for illustrative purposes only. Actual HSA/FSA eligibility is determined by your plan administrator and IRS guidelines. The 2024 HSA contribution limit is $4,150 (self) / $8,300 (family). Consult a tax advisor for personalized advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MODALITY BREAKDOWN ── */}
      <section
        className="px-6 md:px-12 py-16"
        style={{ background: "var(--off-white)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="section-tag">{t("savingsCalculator.eligibilityBreakdown")}</div>
          <h2
            className="mb-3"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.015em",
              color: "var(--hpf-pink)",
            }}
          >
            Which wellness services qualify?
          </h2>
          <p
            className="mb-8 max-w-xl text-sm font-light leading-relaxed"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
          >
            Common modalities on the HealthPlanFactory platform, with their HSA/FSA eligibility status
            and typical annual costs. Services are filtered to those within reach of your budget.
          </p>

          <div className="flex flex-col gap-3">
            {visibleModalities.map((m) => (
              <div
                key={m.name}
                className="rounded-xl overflow-hidden"
                style={{
                  background: "white",
                  border: "1px solid rgba(212,34,126,0.07)",
                  boxShadow: "0 1px 6px rgba(212,34,126,0.03)",
                }}
              >
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                  onClick={() => setTooltipVisible(tooltipVisible === m.name ? null : m.name)}
                >
                  <span className="text-xl flex-shrink-0">{m.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
                      >
                        {m.name}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--off-white)",
                          color: "var(--text-muted)",
                          border: "1px solid rgba(212,34,126,0.08)",
                          fontFamily: "var(--app-font-sans)",
                        }}
                      >
                        {m.category}
                      </span>
                    </div>
                    {tooltipVisible === m.name && (
                      <p
                        className="text-xs leading-relaxed mt-1"
                        style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
                      >
                        {m.eligibleNote}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p
                        className="text-sm font-bold"
                        style={{ fontFamily: "var(--app-font-mono)", color: "var(--hpf-deep)" }}
                      >
                        {formatCurrency(m.avgAnnual)}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                        avg/year
                      </p>
                    </div>
                    <EligibilityBadge eligible={m.eligible} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-6 rounded-xl p-4 flex items-start gap-3"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}
          >
            <Info size={14} style={{ color: "#15803d", flexShrink: 0, marginTop: 2 }} />
            <p className="text-xs leading-relaxed" style={{ color: "#166534", fontFamily: "var(--app-font-sans)" }}>
              Click any row above to see detailed eligibility notes. Eligibility rules can change — always confirm with your HSA/FSA plan administrator before submitting a claim. A Letter of Medical Necessity (LMN) from a licensed physician can expand eligibility for many services.
            </p>
          </div>
        </div>
      </section>

      {/* ── POST-CALCULATION CTA ── */}
      <section
        className="px-6 md:px-12 py-20 text-center"
        style={{ background: "var(--warm-white)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-3xl mb-4">🏭</div>
          <h2
            className="mb-4"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--hpf-pink)",
            }}
          >
            Ready to put those savings to work?
          </h2>
          <p
            className="text-sm font-light leading-relaxed mb-8 mx-auto"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", maxWidth: 460 }}
          >
            Build a personalized wellness plan with HSA/FSA flags on every modality — completely free.
            We'll match it to vetted providers near you so your savings are ready to spend.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mb-5">
            <Link
              to="/survey"
              className="inline-flex items-center px-8 py-4 rounded-lg text-sm font-semibold text-white no-underline"
              style={{
                background: "var(--hpf-pink)",
                fontFamily: "var(--app-font-sans)",
                boxShadow: "0 4px 20px rgba(212,34,126,0.25)",
                letterSpacing: "0.01em",
              }}
            >
              Build my free plan →
            </Link>
            <ShareButton annualBudget={annualBudget} taxBracket={taxBracket} estimatedSavings={estimatedSavings} />
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            Free to start · No credit card required
          </p>
        </div>
      </section>

    </div>
  );
}
