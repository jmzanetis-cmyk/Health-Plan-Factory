import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import { Copy, Check, Gift, Users, Star, ArrowRight, Send, Trophy, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");
const navy = "#2C2825";
const amber = "#E02040";
const sage = "#7DB55C";
const pink = "#D4227E";

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid rgba(212,34,126,0.08)",
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

interface MilestoneInfo {
  id: string;
  label: string;
  emoji: string;
  threshold: number;
  bonusCents: number;
  earned: boolean;
  rewardedAt: string | null;
  newlyEarned?: boolean;
}

interface NextMilestoneInfo {
  id: string;
  label: string;
  threshold: number;
  emoji: string;
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
  milestones: MilestoneInfo[];
  rewardedCount: number;
  nextMilestone: NextMilestoneInfo | null;
}

function StatusPill({ status }: { status: "pending" | "rewarded" }) {
  const isRewarded = status === "rewarded";
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: isRewarded ? "rgba(125,181,92,0.1)" : "rgba(224,32,64,0.1)",
        color: isRewarded ? sage : amber,
        fontFamily: "var(--app-font-sans)",
      }}
    >
      {isRewarded ? "Rewarded ✓" : "Pending"}
    </span>
  );
}

function MilestoneBadge({
  milestone,
  rewardedCount,
}: {
  milestone: MilestoneInfo;
  rewardedCount: number;
}) {
  const progress = Math.min(rewardedCount / milestone.threshold, 1);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "14px 10px",
        borderRadius: 14,
        background: milestone.earned ? "rgba(125,181,92,0.06)" : "rgba(212,34,126,0.03)",
        border: `1.5px solid ${milestone.earned ? "rgba(125,181,92,0.25)" : "rgba(212,34,126,0.08)"}`,
        minWidth: 100,
        flex: 1,
        opacity: milestone.earned ? 1 : 0.7,
        position: "relative",
      }}
    >
      {milestone.earned && (
        <div style={{ position: "absolute", top: 8, right: 8, width: 16, height: 16, borderRadius: 8, background: sage, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={10} color="white" strokeWidth={3} />
        </div>
      )}
      <span style={{ fontSize: 28 }}>{milestone.emoji}</span>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 700, color: milestone.earned ? sage : navy, margin: 0 }}>
          {milestone.label}
        </p>
        <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 10, color: "var(--text-muted)", margin: "2px 0 0" }}>
          {milestone.threshold} rewarded
        </p>
        {milestone.bonusCents > 0 && (
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 10, color: pink, margin: "2px 0 0", fontWeight: 600 }}>
            +${(milestone.bonusCents / 100).toFixed(2)} bonus
          </p>
        )}
      </div>
      {!milestone.earned && (
        <div style={{ width: "100%", height: 4, borderRadius: 2, background: "rgba(212,34,126,0.1)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "rgba(212,34,126,0.35)", borderRadius: 2, transition: "width 0.5s" }} />
        </div>
      )}
    </div>
  );
}

export default function Referral() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Celebration banner — shown when ?milestone=<id> is in the URL OR a newly-earned milestone is returned by the API
  const celebrationMilestoneIdParam = searchParams.get("milestone");

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
  const rewardedCount = data?.rewardedCount ?? 0;
  const milestones = data?.milestones ?? [];
  const nextMilestone = data?.nextMilestone ?? null;

  // Show celebration banner for: ?milestone= query param OR newly-earned milestone from API (within last hour)
  const newlyEarnedMilestone = milestones.find((m) => m.newlyEarned);
  const celebrationMilestone = celebrationMilestoneIdParam
    ? milestones.find((m) => m.id === celebrationMilestoneIdParam)
    : newlyEarnedMilestone ?? null;

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

  async function sendDirectInvite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed || inviteSending) return;
    setInviteSending(true);
    try {
      const res = await fetch(`${BASE}/api/referrals/invite`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          ...(inviteNote.trim() ? { note: inviteNote.trim() } : {}),
        }),
      });
      if (res.ok) {
        setInviteSuccess(trimmed);
        setInviteEmail("");
        setInviteNote("");
        setTimeout(() => setInviteSuccess(null), 6000);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Failed to send", description: err?.error ?? "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Unable to send invite. Please try again.", variant: "destructive" });
    } finally {
      setInviteSending(false);
    }
  }

  function shareVia(channel: "sms" | "email" | "whatsapp" | "twitter") {
    if (!referralLink) return;
    const msg = `Join me on HealthPlanFactory — the personalized wellness platform that builds you a custom health plan. Use my referral link and your first month of Plus is free: ${referralLink}`;
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
            {t("referral.title")}
          </h1>
        </div>
        <p className="text-sm" style={{ fontFamily: "var(--app-font-sans)", color: "var(--text-secondary)" }}>
          {t("referral.sub")}
        </p>
      </div>

      {/* ── Celebration Banner ─────────────────────────────────────────────── */}
      {celebrationMilestone && (
        <div
          className="p-5 rounded-2xl flex items-center gap-5"
          style={{ background: "linear-gradient(135deg, #D4227E 0%, #b81c6a 100%)" }}
        >
          <span className="text-4xl flex-shrink-0">{celebrationMilestone.emoji}</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-white" style={{ fontFamily: "var(--app-font-sans)", marginBottom: 2 }}>
              {celebrationMilestone.label} milestone unlocked! 🎉
            </p>
            <p className="text-xs text-white" style={{ fontFamily: "var(--app-font-sans)", opacity: 0.85 }}>
              You've reached {celebrationMilestone.threshold} rewarded referral{celebrationMilestone.threshold !== 1 ? "s" : ""}.
              {celebrationMilestone.bonusCents > 0
                ? ` A $${(celebrationMilestone.bonusCents / 100).toFixed(2)} bonus credit has been added to your account.`
                : " Keep referring to unlock the next tier with a bonus credit."}
            </p>
          </div>
          <Sparkles size={20} color="rgba(255,255,255,0.7)" className="flex-shrink-0" />
        </div>
      )}

      {/* ── Credit Balance ─────────────────────────────────────────────────── */}
      {unusedCents > 0 && (
        <div
          className="p-5 rounded-2xl flex items-center gap-5"
          style={{ background: "rgba(125,181,92,0.07)", border: `1.5px solid rgba(125,181,92,0.2)` }}
        >
          <Star size={28} style={{ color: sage, flexShrink: 0 }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: navy, fontFamily: "var(--app-font-sans)" }}>
              {t("referral.creditBalanceAmount", { amount: data?.creditSummary.unusedCreditsFormatted })}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              {t("referral.creditsAppliedDesc")}
            </p>
          </div>
        </div>
      )}

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <div className="p-6 flex flex-col gap-4" style={cardStyle}>
        <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: navy }}>
          {t("referral.howItWorks")}
        </h2>
        <div className="flex flex-col gap-3">
          {[
            { step: "1", text: t("referral.howItWorksStep1") },
            { step: "2", text: t("referral.howItWorksStep2") },
            { step: "3", text: t("referral.howItWorksStep3") },
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
          <div className="h-10 rounded-lg animate-pulse" style={{ background: "rgba(212,34,126,0.06)" }} />
        ) : referralLink ? (
          <>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-3 py-2.5 rounded-lg text-sm truncate select-all"
                style={{
                  background: "rgba(212,34,126,0.04)",
                  border: "1px solid rgba(212,34,126,0.12)",
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

      {/* ── Direct Invite ──────────────────────────────────────────────────── */}
      {referralLink && (
        <div className="p-6 flex flex-col gap-4" style={cardStyle}>
          <div className="flex items-center gap-2">
            <Send size={16} style={{ color: navy }} />
            <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: navy }}>
              Send a direct invite
            </h2>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            Enter a friend's email address and we'll send them a personalized invitation with your referral link. Up to 10 invites per day.
          </p>
          <form onSubmit={sendDirectInvite} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1.5px solid rgba(212,34,126,0.2)",
                  fontFamily: "var(--app-font-sans)",
                  fontSize: 14,
                  color: navy,
                  background: "white",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={inviteSending || !inviteEmail.trim()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: inviteSending || !inviteEmail.trim() ? "rgba(212,34,126,0.25)" : "#D4227E",
                  color: "white",
                  fontFamily: "var(--app-font-sans)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: inviteSending || !inviteEmail.trim() ? "not-allowed" : "pointer",
                  flexShrink: 0,
                }}
              >
                {inviteSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {inviteSending ? "Sending…" : "Send"}
              </button>
            </div>
            <textarea
              value={inviteNote}
              onChange={(e) => setInviteNote(e.target.value)}
              placeholder="Add a personal note (optional, max 300 chars)…"
              maxLength={300}
              rows={2}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1.5px solid rgba(212,34,126,0.12)",
                fontFamily: "var(--app-font-sans)",
                fontSize: 13,
                color: navy,
                background: "white",
                outline: "none",
                resize: "vertical",
              }}
            />
          </form>
          {inviteSuccess && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                borderRadius: 10,
                background: "rgba(125,181,92,0.08)",
                border: "1.5px solid rgba(125,181,92,0.3)",
                marginTop: 4,
              }}
            >
              <Check size={16} style={{ color: sage, flexShrink: 0 }} />
              <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: sage, margin: 0, fontWeight: 600 }}>
                Invite sent to <span style={{ textDecoration: "underline" }}>{inviteSuccess}</span>! They'll receive your personalized invitation shortly.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Milestone Progress ─────────────────────────────────────────────── */}
      {milestones.length > 0 && nextMilestone && (
        <div className="p-6 flex flex-col gap-4" style={cardStyle}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={16} style={{ color: navy }} />
              <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: navy }}>
                Next milestone
              </h2>
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              {rewardedCount} / {nextMilestone.threshold} rewarded
            </span>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs mb-2" style={{ fontFamily: "var(--app-font-sans)", color: "var(--text-muted)" }}>
              <span className="font-semibold" style={{ color: navy }}>
                {nextMilestone.emoji} {nextMilestone.label}
              </span>
              <span>
                {nextMilestone.threshold - rewardedCount} more to go
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "rgba(212,34,126,0.08)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min((rewardedCount / nextMilestone.threshold) * 100, 100)}%`,
                  background: "linear-gradient(90deg, #D4227E, #e84393)",
                  borderRadius: 4,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Milestones ─────────────────────────────────────────────────────── */}
      <div className="p-6 flex flex-col gap-4" style={cardStyle}>
        <div className="flex items-center gap-2">
          <Trophy size={16} style={{ color: navy }} />
          <h2 className="text-base font-semibold" style={{ fontFamily: "var(--app-font-serif)", color: navy }}>
            Milestone badges
          </h2>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          Earn badges as you grow your referral network. Bonus credits unlock at Advocate (5), Champion (10), and Ambassador (25) tiers.
        </p>
        {milestones.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {milestones.map((m) => (
              <MilestoneBadge
                key={m.id}
                milestone={m}
                rewardedCount={rewardedCount}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { id: "pioneer", label: "Pioneer", emoji: "🌱", threshold: 1, bonusCents: 0, earned: false, rewardedAt: null },
              { id: "advocate", label: "Advocate", emoji: "🌿", threshold: 5, bonusCents: 200, earned: false, rewardedAt: null },
              { id: "champion", label: "Champion", emoji: "🏆", threshold: 10, bonusCents: 700, earned: false, rewardedAt: null },
              { id: "ambassador", label: "Ambassador", emoji: "💎", threshold: 25, bonusCents: 1700, earned: false, rewardedAt: null },
            ].map((m) => (
              <MilestoneBadge key={m.id} milestone={m} rewardedCount={0} />
            ))}
          </div>
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
              style={{ background: "rgba(212,34,126,0.08)", color: navy, fontFamily: "var(--app-font-sans)" }}
            >
              {data?.referralHistory.length} total
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((n) => (
              <div key={n} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(212,34,126,0.04)" }} />
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
                style={{ background: "rgba(212,34,126,0.03)", border: "1px solid rgba(212,34,126,0.06)" }}
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
          <div className="flex gap-4 pt-2 border-t" style={{ borderColor: "rgba(212,34,126,0.06)" }}>
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
        <ArrowRight size={14} style={{ transform: "rotate(180deg)" }} />
        Back to Dashboard
      </Link>
    </div>
  );
}
