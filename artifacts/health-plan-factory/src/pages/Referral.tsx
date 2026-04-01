import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import { Copy, Check, Gift, Users, Star, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");
const navy = "#1b2d4f";
const amber = "#b8892a";
const sage = "#3d6b52";

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid rgba(27,45,79,0.08)",
  borderRadius: 18,
};

interface CreditRow {
  id: string;
  source: string;
  amountCents: number;
  used: boolean;
  createdAt: string;
  usedAt?: string | null;
}

interface ReferralRow {
  id: string;
  status: "pending" | "rewarded";
  code: string;
  createdAt: string;
  rewardedAt?: string | null;
  referredMemberName: string | null;
  referredMemberEmail: string | null;
}

interface ReferralData {
  referralCode: string;
  referralHistory: ReferralRow[];
  creditSummary: {
    totalCredits: number;
    unusedCreditsCents: number;
    unusedCreditsFormatted: string;
    credits: CreditRow[];
  };
}

function StatusPill({ status }: { status: "pending" | "rewarded" }) {
  const isRewarded = status === "rewarded";
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: isRewarded ? "rgba(61,107,82,0.1)" : "rgba(184,137,42,0.1)",
        color: isRewarded ? sage : amber,
        fontFamily: "var(--app-font-sans)",
      }}
    >
      {isRewarded ? "Rewarded ✓" : "Pending"}
    </span>
  );
}

export default function Referral() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`${BASE}/api/referrals/mine`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: navy }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <p style={{ fontFamily: "var(--app-font-sans)", color: "var(--text-secondary)" }}>
          Please <Link to="/sign-in" style={{ color: amber }}>sign in</Link> to access your referral program.
        </p>
      </div>
    );
  }

  const referralLink = data?.referralCode
    ? `${window.location.origin}/?ref=${data.referralCode}`
    : null;

  const unusedCents = data?.creditSummary.unusedCreditsCents ?? 0;

  async function copyLink() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: "Link copied!", description: "Your referral link is on the clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Please copy the link manually.", variant: "destructive" });
    }
  }

  function shareVia(channel: "sms" | "email" | "whatsapp" | "twitter") {
    if (!referralLink) return;
    const msg = `Join me on HealthPlanFactory — the personalized wellness platform that helps you find the right modalities for your goals and budget. Use my referral link for a free unlock credit: ${referralLink}`;
    const encodedMsg = encodeURIComponent(msg);
    const encodedLink = encodeURIComponent(referralLink);
    const urls: Record<string, string> = {
      sms: `sms:?body=${encodedMsg}`,
      email: `mailto:?subject=${encodeURIComponent("Join me on HealthPlanFactory")}&body=${encodedMsg}`,
      whatsapp: `https://wa.me/?text=${encodedMsg}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent("Building my personalized wellness plan with @HealthPlanFactory. Join me:")}&url=${encodedLink}`,
    };
    window.open(urls[channel], "_blank", "noopener,noreferrer");
  }

  const rewarded = data?.referralHistory.filter((r) => r.status === "rewarded") ?? [];
  const pending = data?.referralHistory.filter((r) => r.status === "pending") ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Gift size={20} style={{ color: amber }} />
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: navy }}>
            Refer &amp; Earn
          </h1>
        </div>
        <p className="text-sm" style={{ fontFamily: "var(--app-font-sans)", color: "var(--text-secondary)" }}>
          Share HealthPlanFactory with friends and earn a free modality unlock credit for every person who joins and builds their first plan. They get a free unlock credit too.
        </p>
      </div>

      {/* ── Credit Balance ─────────────────────────────────────────────────── */}
      {unusedCents > 0 && (
        <div
          className="p-5 rounded-2xl flex items-center gap-5"
          style={{ background: "rgba(61,107,82,0.07)", border: `1.5px solid rgba(61,107,82,0.2)` }}
        >
          <Star size={28} style={{ color: sage, flexShrink: 0 }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: navy, fontFamily: "var(--app-font-sans)" }}>
              You have {data?.creditSummary.unusedCreditsFormatted} in referral credits
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              Credits are automatically applied to your next modality unlock or plan upgrade.
            </p>
          </div>
        </div>
      )}

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <div className="p-6 flex flex-col gap-4" style={cardStyle}>
        <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: navy }}>
          How it works
        </h2>
        <div className="flex flex-col gap-3">
          {[
            { step: "1", text: "Share your unique referral link with friends, family, or colleagues." },
            { step: "2", text: "When they sign up and build their first wellness plan, the reward triggers." },
            { step: "3", text: "You both receive a $3.00 modality unlock credit — enough to unlock your first app-based plan." },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: navy, color: "white", fontFamily: "var(--app-font-sans)" }}
              >
                {item.step}
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Referral Link ──────────────────────────────────────────────────── */}
      <div className="p-6 flex flex-col gap-4" style={cardStyle}>
        <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: navy }}>
          Your referral link
        </h2>
        {loading ? (
          <div className="h-10 rounded-lg animate-pulse" style={{ background: "rgba(27,45,79,0.06)" }} />
        ) : referralLink ? (
          <>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-3 py-2.5 rounded-lg text-sm truncate select-all"
                style={{
                  background: "rgba(27,45,79,0.04)",
                  border: "1px solid rgba(27,45,79,0.12)",
                  color: navy,
                  fontFamily: "var(--app-font-sans)",
                  fontSize: 13,
                }}
              >
                {referralLink}
              </div>
              <button
                onClick={copyLink}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  background: copied ? sage : navy,
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--app-font-sans)",
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* ── Social Share ─────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-medium mb-2.5" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Share via
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { channel: "email" as const, label: "✉️ Email", bg: "#ea4335" },
                  { channel: "sms" as const, label: "💬 SMS", bg: "#34a853" },
                  { channel: "whatsapp" as const, label: "📱 WhatsApp", bg: "#25D366" },
                  { channel: "twitter" as const, label: "𝕏 Twitter", bg: "#000000" },
                ].map((s) => (
                  <button
                    key={s.channel}
                    onClick={() => shareVia(s.channel)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: s.bg,
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--app-font-sans)",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1">
              <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                Your referral code: <span className="font-mono font-semibold" style={{ color: navy }}>{data?.referralCode}</span>
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            Unable to load referral link. Please refresh the page.
          </p>
        )}
      </div>

      {/* ── Referral History ───────────────────────────────────────────────── */}
      <div className="p-6 flex flex-col gap-4" style={cardStyle}>
        <div className="flex items-center gap-2">
          <Users size={16} style={{ color: navy }} />
          <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: navy }}>
            Referral history
          </h2>
          {(data?.referralHistory.length ?? 0) > 0 && (
            <span
              className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(27,45,79,0.08)", color: navy, fontFamily: "var(--app-font-sans)" }}
            >
              {data?.referralHistory.length} total
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((n) => (
              <div key={n} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(27,45,79,0.04)" }} />
            ))}
          </div>
        ) : (data?.referralHistory.length ?? 0) === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              No referrals yet. Share your link to get started!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data?.referralHistory.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(27,45,79,0.03)", border: "1px solid rgba(27,45,79,0.06)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: navy, fontFamily: "var(--app-font-sans)" }}>
                    {row.referredMemberName ?? row.referredMemberEmail ?? "Anonymous member"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                    Joined {new Date(row.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {row.rewardedAt ? ` · Rewarded ${new Date(row.rewardedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                  </p>
                </div>
                <StatusPill status={row.status} />
              </div>
            ))}
          </div>
        )}

        {/* Stats summary */}
        {(data?.referralHistory.length ?? 0) > 0 && (
          <div className="flex gap-4 pt-2 border-t" style={{ borderColor: "rgba(27,45,79,0.06)" }}>
            <div className="text-center flex-1">
              <div className="text-xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: navy }}>
                {data?.referralHistory.length ?? 0}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Total sent</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: sage }}>
                {rewarded.length}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Rewarded</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: amber }}>
                {pending.length}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Pending</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: sage }}>
                {data?.creditSummary.unusedCreditsFormatted ?? "$0.00"}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Available</div>
            </div>
          </div>
        )}
      </div>

      {/* ── CTA to Dashboard ──────────────────────────────────────────────── */}
      <Link
        to="/dashboard"
        className="flex items-center gap-2 text-sm font-medium no-underline"
        style={{ color: amber, fontFamily: "var(--app-font-sans)" }}
      >
        ← Back to Dashboard
      </Link>
    </div>
  );
}
