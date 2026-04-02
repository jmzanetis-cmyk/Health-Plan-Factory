import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2, BookmarkIcon, BookmarkCheck, SlidersHorizontal, X, Phone, Globe, Unlock, CheckCircle2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UnlockResult {
  providerId: string;
  unlocked: boolean;
  used_credit: boolean;
  credit_applied_cents: number;
  amount_charged_cents: number;
  amount_charged_formatted: string;
  message: string;
  checkout_url?: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Modality {
  id: string;
  name: string;
  category: string;
}

interface Provider {
  id: string;
  name: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  offersTelehealth: boolean;
  offersInPerson: boolean;
  acceptsInsurance: boolean;
  costPerSession: number | null;
  avatarUrl: string | null;
  status: string;
  credentials: string[];
}

interface Favorite {
  providerId: string;
}

interface Review {
  id: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  memberName: string | null;
}

interface ProviderReviewData {
  reviews: Review[];
  averageRating: number | null;
  reviewCount: number;
}

interface ReviewModalState {
  providerId: string;
  providerName: string;
  existingRating?: number;
  existingText?: string;
}

function StarRating({ rating, onRate, size = 18 }: { rating: number; onRate?: (r: number) => void; size?: number }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onRate && onRate(s)}
          onMouseEnter={() => onRate && setHovered(s)}
          onMouseLeave={() => onRate && setHovered(0)}
          style={{
            background: "none",
            border: "none",
            padding: 2,
            cursor: onRate ? "pointer" : "default",
            color: s <= (hovered || rating) ? "#f59e0b" : "#d1d5db",
            lineHeight: 1,
          }}
          disabled={!onRate}
        >
          <Star size={size} fill={s <= (hovered || rating) ? "#f59e0b" : "none"} />
        </button>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="p-5 rounded-2xl animate-pulse" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: "rgba(212,34,126,0.08)" }} />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-4 rounded" style={{ background: "rgba(212,34,126,0.08)", width: "60%" }} />
          <div className="h-3 rounded" style={{ background: "rgba(212,34,126,0.06)", width: "40%" }} />
        </div>
      </div>
      <div className="h-12 rounded" style={{ background: "rgba(212,34,126,0.04)" }} />
    </div>
  );
}

export default function Providers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Credit & unlock state
  const [userCreditsCents, setUserCreditsCents] = useState(0);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [unlockModal, setUnlockModal] = useState<UnlockResult | null>(null);

  // Reviews state
  const [reviewsMap, setReviewsMap] = useState<Record<string, ProviderReviewData>>({});
  const [reviewModal, setReviewModal] = useState<ReviewModalState | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [expandedReviewsId, setExpandedReviewsId] = useState<string | null>(null);

  // Filters — initialise selectedModality from ?modality= query param
  // (supports deep-link from /modalities/:slug evidence library pages)
  const [selectedModality, setSelectedModality] = useState(searchParams.get("modality") ?? "");
  const [zipCode, setZipCode] = useState("");
  const [telehealth, setTelehealth] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/modalities`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setModalities(data);
      });
  }, []);

  useEffect(() => {
    if (user) {
      fetch(`${BASE}/api/favorites?profileId=${user.id}`, { credentials: "include" })
        .then((r) => r.json())
        .then((data: Favorite[]) => {
          if (Array.isArray(data)) setFavorites(new Set(data.map((f) => f.providerId)));
        });

      // Fetch credit balance to show credit badge and discount in checkout modal
      fetch(`${BASE}/api/credits/mine`, { credentials: "include" })
        .then((r) => r.json())
        .then((data: { unusedCreditsCents: number }) => {
          if (typeof data?.unusedCreditsCents === "number") setUserCreditsCents(data.unusedCreditsCents);
        })
        .catch(() => {});

      // Restore persisted unlocks from the server (survives page refresh)
      fetch(`${BASE}/api/providers/unlocked`, { credentials: "include" })
        .then((r) => r.json())
        .then((data: { unlockedProviderIds: string[] }) => {
          if (Array.isArray(data?.unlockedProviderIds)) {
            setUnlockedIds(new Set(data.unlockedProviderIds));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Handle return from Stripe Checkout — confirm payment and record unlock
  useEffect(() => {
    const sessionId = searchParams.get("unlock_session");
    if (!sessionId || !user) return;
    fetch(`${BASE}/api/providers/unlock-status?session_id=${encodeURIComponent(sessionId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: { unlocked: boolean; providerId?: string; credit_applied_cents?: number; amount_charged_cents?: number }) => {
        if (data.unlocked && data.providerId) {
          setUnlockedIds((prev) => new Set([...prev, data.providerId!]));
          toast({ title: "Provider unlocked!", description: "Payment confirmed. You can now view full contact details." });
        }
      })
      .catch(() => {});
  }, [searchParams, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUnlock = async (providerId: string) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Sign in to unlock provider details.", variant: "destructive" });
      return;
    }
    setUnlockingId(providerId);
    try {
      const res = await fetch(`${BASE}/api/providers/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ providerId }),
      });
      const data: UnlockResult = await res.json();

      if (!res.ok && !data.checkout_url) {
        toast({ title: "Unlock failed", description: (data as { error?: string }).error ?? "Something went wrong.", variant: "destructive" });
        return;
      }

      // Phase A: unlock granted immediately (credit covered the full price)
      if (data.unlocked) {
        setUnlockedIds((prev) => new Set([...prev, providerId]));
        setUnlockModal(data);
        if (data.used_credit) {
          setUserCreditsCents((prev) => Math.max(0, prev - data.credit_applied_cents));
        }
        return;
      }

      // Phase B or Stripe-not-configured: show checkout modal with credit
      // breakdown BEFORE redirecting/confirming — so the user sees the discount
      // applied to the price before leaving the page.
      setUnlockModal(data);
    } catch {
      toast({ title: "Unlock failed", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setUnlockingId(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedModality) params.set("modalityId", selectedModality);
    if (zipCode) params.set("zipCode", zipCode);
    if (telehealth) params.set("telehealth", "true");
    params.set("limit", "50");

    fetch(`${BASE}/api/providers?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProviders(data);
        else if (Array.isArray(data?.providers)) setProviders(data.providers);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedModality, zipCode, telehealth]);

  const fetchReviews = (providerId: string) => {
    if (!user || reviewsMap[providerId]) return;
    fetch(`${BASE}/api/providers/${providerId}/reviews`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: ProviderReviewData | null) => {
        if (data) setReviewsMap((prev) => ({ ...prev, [providerId]: data }));
      })
      .catch(() => {});
  };

  const openReviewModal = (p: { id: string; name: string }) => {
    const existing = reviewsMap[p.id];
    const myReview = existing?.reviews?.find((r) => r.memberName === user?.firstName);
    setReviewModal({ providerId: p.id, providerName: p.name, existingRating: myReview?.rating, existingText: myReview?.reviewText ?? undefined });
    setReviewRating(myReview?.rating ?? 0);
    setReviewText(myReview?.reviewText ?? "");
  };

  const submitReview = async () => {
    if (!reviewModal || reviewRating === 0) {
      toast({ title: "Rating required", description: "Please select a star rating before submitting.", variant: "destructive" });
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`${BASE}/api/providers/${reviewModal.providerId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating: reviewRating, reviewText: reviewText.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to submit review");
      }
      toast({ title: "Review submitted!", description: "Thank you for sharing your experience." });
      // Refresh reviews for this provider
      setReviewsMap((prev) => {
        const { [reviewModal.providerId]: _, ...rest } = prev;
        return rest;
      });
      fetchReviews(reviewModal.providerId);
      setReviewModal(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not submit review";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmittingReview(false);
    }
  };

  // Open review modal if ?reviewProvider=<id> is set (from email nudge link)
  useEffect(() => {
    const reviewProviderId = searchParams.get("reviewProvider");
    if (!reviewProviderId || !user) return;
    const p = providers.find((pr) => pr.id === reviewProviderId);
    if (!p) return;
    fetchReviews(reviewProviderId);
    openReviewModal(p);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, providers, user]);

  const toggleFavorite = async (providerId: string) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Sign in to save providers to your list.", variant: "destructive" });
      return;
    }
    setSavingId(providerId);
    const isSaved = favorites.has(providerId);
    try {
      if (isSaved) {
        await fetch(`${BASE}/api/favorites/${providerId}?profileId=${user.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        setFavorites((prev) => { const n = new Set(prev); n.delete(providerId); return n; });
        toast({ title: "Removed from saved", description: "Provider removed from your list." });
      } else {
        await fetch(`${BASE}/api/favorites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ profileId: user.id, providerId }),
        });
        setFavorites((prev) => new Set([...prev, providerId]));
        toast({ title: "Provider saved!", description: "Added to your bookmarks." });
      }
    } catch {
      toast({ title: "Error", description: "Could not update your saved list.", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const clearFilters = () => {
    setSelectedModality("");
    setZipCode("");
    setTelehealth(false);
  };

  const hasFilters = selectedModality || zipCode || telehealth;
  const inputStyle = {
    background: "var(--warm-white)",
    border: "1.5px solid rgba(212,34,126,0.12)",
    color: "var(--hpf-pink)",
    fontFamily: "var(--app-font-sans)",
    outline: "none",
    borderRadius: 8,
  };

  return (
    <div className="min-h-screen px-4 md:px-10 py-10" style={{ background: "var(--warm-white)" }}>

      {/* ── Unlock Checkout Modal ── */}
      {unlockModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(212,34,126,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
          }}
          onClick={() => setUnlockModal(null)}
        >
          <div
            style={{ background: "white", borderRadius: 16, padding: "1.75rem", maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(212,34,126,0.22)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              {unlockModal.unlocked
                ? <CheckCircle2 size={20} style={{ color: "var(--sage)" }} />
                : <Unlock size={20} style={{ color: "var(--hpf-crimson)" }} />}
              <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.15rem", fontWeight: 700, color: "var(--hpf-pink)", margin: 0 }}>
                {unlockModal.unlocked ? "Provider Unlocked" : "Complete Payment to Unlock"}
              </h3>
            </div>

            {/* Price breakdown — shown for both immediate unlock and Stripe redirect cases */}
            <div style={{ background: "rgba(212,34,126,0.03)", borderRadius: 10, padding: "1rem", marginBottom: "1rem", border: "1px solid rgba(212,34,126,0.08)" }}>
              <div className="flex justify-between text-sm mb-1" style={{ fontFamily: "var(--app-font-sans)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Unlock fee</span>
                <span style={{ color: "var(--hpf-pink)", fontWeight: 600 }}>
                  ${((unlockModal.amount_charged_cents + unlockModal.credit_applied_cents) / 100).toFixed(2)}
                </span>
              </div>
              {unlockModal.credit_applied_cents > 0 && (
                <div className="flex justify-between text-sm mb-1" style={{ fontFamily: "var(--app-font-sans)" }}>
                  <span style={{ color: "var(--hpf-crimson)", fontWeight: 600 }}>🎁 Referral credit applied</span>
                  <span style={{ color: "var(--hpf-crimson)", fontWeight: 700 }}>
                    −${(unlockModal.credit_applied_cents / 100).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 mt-1" style={{ borderTop: "1px solid rgba(212,34,126,0.08)", fontFamily: "var(--app-font-sans)" }}>
                <span style={{ color: "var(--hpf-pink)", fontWeight: 700 }}>
                  {unlockModal.unlocked ? "Total charged" : "Due now"}
                </span>
                <span style={{ color: unlockModal.amount_charged_cents === 0 ? "var(--sage)" : "var(--hpf-pink)", fontWeight: 700 }}>
                  {unlockModal.amount_charged_cents === 0 ? "Free" : unlockModal.amount_charged_formatted}
                </span>
              </div>
            </div>

            <p className="text-xs mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6 }}>
              {unlockModal.unlocked
                ? "Your referral credit covered this unlock. You can now view full contact details."
                : "Your referral credit discount is applied. Complete payment via Stripe to reveal full contact details."}
            </p>

            {unlockModal.unlocked ? (
              <button
                onClick={() => setUnlockModal(null)}
                style={{ width: "100%", padding: "0.75rem", borderRadius: 10, background: "var(--hpf-pink)", color: "white", fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
              >
                View Provider
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setUnlockModal(null)}
                  style={{ flex: 1, padding: "0.7rem", borderRadius: 10, background: "transparent", color: "var(--hpf-pink)", fontWeight: 600, fontSize: "0.85rem", border: "1.5px solid rgba(212,34,126,0.15)", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (unlockModal.checkout_url) window.location.href = unlockModal.checkout_url;
                    else setUnlockModal(null);
                  }}
                  style={{ flex: 2, padding: "0.7rem", borderRadius: 10, background: "var(--hpf-crimson)", color: "white", fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
                >
                  Proceed to payment →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Review Modal ── */}
      {reviewModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
          }}
          onClick={() => setReviewModal(null)}
        >
          <div
            style={{ background: "white", borderRadius: 16, padding: "1.75rem", maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              <Star size={20} style={{ color: "#f59e0b" }} />
              <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.15rem", fontWeight: 700, color: "var(--hpf-pink)", margin: 0 }}>
                Rate {reviewModal.providerName}
              </h3>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              Your review helps other members choose the right provider.
            </p>
            <div className="mb-4">
              <p className="text-sm font-semibold mb-2" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>Star rating</p>
              <StarRating rating={reviewRating} onRate={setReviewRating} size={28} />
            </div>
            <div className="mb-5">
              <p className="text-sm font-semibold mb-1.5" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>Written review (optional)</p>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this provider…"
                rows={3}
                maxLength={800}
                className="w-full px-3 py-2.5 text-sm resize-none outline-none"
                style={{ background: "var(--warm-white)", border: "1.5px solid rgba(212,34,126,0.12)", borderRadius: 8, color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setReviewModal(null)}
                style={{ flex: 1, padding: "0.7rem", borderRadius: 10, background: "transparent", color: "var(--hpf-pink)", fontWeight: 600, fontSize: "0.85rem", border: "1.5px solid rgba(212,34,126,0.15)", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                disabled={submittingReview || reviewRating === 0}
                style={{ flex: 2, padding: "0.7rem", borderRadius: 10, background: reviewRating === 0 ? "rgba(212,34,126,0.1)" : "var(--hpf-pink)", color: reviewRating === 0 ? "var(--text-muted)" : "white", fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: reviewRating === 0 || submittingReview ? "not-allowed" : "pointer", fontFamily: "var(--app-font-sans)", opacity: submittingReview ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
              >
                {submittingReview && <Loader2 size={14} className="animate-spin" />}
                {reviewModal.existingRating ? "Update review" : "Submit review"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-pink)" }}>
              Provider Directory
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              Browse verified wellness providers matched to your plan
            </p>
            {user && userCreditsCents > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", marginTop: "0.5rem", background: "rgba(224,32,64,0.1)", border: "1px solid rgba(224,32,64,0.3)", borderRadius: 8, padding: "0.25rem 0.625rem", fontSize: "0.72rem", fontWeight: 600, color: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)" }}>
                🎁 {(userCreditsCents / 100).toFixed(2)} referral credit available
              </span>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
            style={{
              background: showFilters ? "var(--hpf-pink)" : "white",
              color: showFilters ? "white" : "var(--hpf-pink)",
              border: "1.5px solid rgba(212,34,126,0.15)",
              cursor: "pointer",
              fontFamily: "var(--app-font-sans)",
            }}
          >
            <SlidersHorizontal size={15} />
            Filters {hasFilters ? "●" : ""}
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="p-5 rounded-2xl flex flex-wrap gap-4 items-end" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>Modality</label>
              <select
                value={selectedModality}
                onChange={(e) => setSelectedModality(e.target.value)}
                className="px-3 py-2 text-sm"
                style={{ ...inputStyle, minWidth: 160 }}
              >
                <option value="">All modalities</option>
                {modalities.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>ZIP Code</label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="e.g. 78701"
                maxLength={5}
                className="px-3 py-2 text-sm w-32"
                style={inputStyle}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={telehealth}
                onChange={(e) => setTelehealth(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>Telehealth only</span>
            </label>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-medium"
                style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
              >
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        {!loading && (
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            {providers.length} provider{providers.length !== 1 ? "s" : ""} found
          </p>
        )}

        {/* DPC / physician LMN callout — shown when a medical-category modality is selected */}
        {selectedModality && modalities.find((m) => m.id === selectedModality)?.category === "medical" && (
          <div style={{
            borderRadius: 12,
            background: "rgba(224,32,64,0.06)",
            border: "1.5px solid rgba(224,32,64,0.22)",
            padding: "1rem 1.25rem",
            display: "flex",
            gap: "0.875rem",
            alignItems: "flex-start",
          }}>
            <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>🩺</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", marginBottom: 3 }}>
                DPC physicians can write a Letter of Medical Necessity for your plan
              </p>
              <p style={{ fontSize: "0.73rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6, marginBottom: 8 }}>
                Connect with a Direct Primary Care physician to get an LMN that covers HSA/FSA-reimbursable wellness services in your plan — potentially saving hundreds per year.
              </p>
              <Link
                to="/hsa-unlock"
                style={{ fontSize: "0.73rem", fontWeight: 600, color: "#E02040", fontFamily: "var(--app-font-sans)", textDecoration: "underline" }}
              >
                See how to unlock your HSA →
              </Link>
            </div>
          </div>
        )}

        {/* Provider grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            [1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)
          ) : providers.length === 0 ? (
            <div className="col-span-full py-16 text-center">
              <p className="text-base mb-2" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-serif)" }}>No providers found</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                Try adjusting your filters or clearing your search.
              </p>
            </div>
          ) : (
            providers.map((p) => {
              const isSaved = favorites.has(p.id);
              const reviewData = reviewsMap[p.id];
              const isExpanded = expandedReviewsId === p.id;
              return (
                <div
                  key={p.id}
                  className="p-5 flex flex-col gap-3 rounded-2xl"
                  style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}
                >
                  {/* Provider header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                        style={{ background: "rgba(212,34,126,0.08)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-serif)" }}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                          {p.name}
                        </p>
                        {(p.city || p.state) && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                            {[p.city, p.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFavorite(p.id)}
                      disabled={savingId === p.id}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{
                        background: isSaved ? "rgba(125,181,92,0.1)" : "rgba(212,34,126,0.04)",
                        border: "none",
                        cursor: savingId === p.id ? "wait" : "pointer",
                        color: isSaved ? "var(--sage)" : "var(--text-muted)",
                      }}
                      title={isSaved ? "Remove from saved" : "Save provider"}
                    >
                      {isSaved ? <BookmarkCheck size={16} /> : <BookmarkIcon size={16} />}
                    </button>
                  </div>

                  {/* Bio */}
                  {p.bio && (
                    <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                      {p.bio}
                    </p>
                  )}

                  {/* Credentials */}
                  {p.credentials && p.credentials.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {p.credentials.slice(0, 3).map((cred) => (
                        <span
                          key={cred}
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: "rgba(212,34,126,0.05)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-mono)", fontSize: "0.68rem", border: "1px solid rgba(212,34,126,0.1)" }}
                        >
                          {cred}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {p.offersTelehealth && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "rgba(212,34,126,0.06)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                        Telehealth
                      </span>
                    )}
                    {p.offersInPerson && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "rgba(212,34,126,0.06)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                        In-person
                      </span>
                    )}
                    {p.acceptsInsurance && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "rgba(224,32,64,0.1)", color: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)" }}>
                        HSA/FSA
                      </span>
                    )}
                    {p.costPerSession != null && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "rgba(125,181,92,0.08)", color: "var(--sage)", fontFamily: "var(--app-font-mono)" }}>
                        ${p.costPerSession}/session
                      </span>
                    )}
                  </div>

                  {/* Rating summary row — always visible to logged-in members */}
                  {user && (
                    <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: "rgba(212,34,126,0.06)" }}>
                      {reviewData ? (
                        reviewData.reviewCount > 0 ? (
                          <>
                            <StarRating rating={Math.round(reviewData.averageRating ?? 0)} size={13} />
                            <span className="text-xs font-semibold" style={{ color: "#f59e0b", fontFamily: "var(--app-font-sans)" }}>
                              {reviewData.averageRating?.toFixed(1)}
                            </span>
                            <button
                              onClick={() => {
                                if (isExpanded) setExpandedReviewsId(null);
                                else { setExpandedReviewsId(p.id); fetchReviews(p.id); }
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", fontSize: "0.7rem" }}
                            >
                              {reviewData.reviewCount} review{reviewData.reviewCount !== 1 ? "s" : ""} {isExpanded ? "▲" : "▼"}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>No reviews yet</span>
                        )
                      ) : (
                        <button
                          onClick={() => { fetchReviews(p.id); setExpandedReviewsId(p.id); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <Star size={12} /> See reviews
                        </button>
                      )}
                      {unlockedIds.has(p.id) && (
                        <button
                          onClick={() => openReviewModal(p)}
                          className="ml-auto text-xs font-semibold"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)" }}
                        >
                          + Rate
                        </button>
                      )}
                    </div>
                  )}

                  {/* Expanded reviews list */}
                  {isExpanded && reviewData && reviewData.reviews.length > 0 && (
                    <div className="flex flex-col gap-2 pt-1 border-t" style={{ borderColor: "rgba(212,34,126,0.06)" }}>
                      {reviewData.reviews.slice(0, 3).map((r) => (
                        <div key={r.id} style={{ background: "rgba(212,34,126,0.03)", borderRadius: 8, padding: "0.5rem 0.75rem" }}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <StarRating rating={r.rating} size={11} />
                            <span className="text-xs font-semibold" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                              {r.memberName ?? "Member"}
                            </span>
                            <span className="text-xs ml-auto" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                              {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                            </span>
                          </div>
                          {r.reviewText && (
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", margin: 0 }}>
                              {r.reviewText}
                            </p>
                          )}
                        </div>
                      ))}
                      {reviewData.reviews.length > 3 && (
                        <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", textAlign: "center" }}>
                          +{reviewData.reviews.length - 3} more review{reviewData.reviews.length - 3 !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Contact row — gated behind unlock */}
                  <div className="flex flex-wrap gap-3 pt-1 border-t items-center" style={{ borderColor: "rgba(212,34,126,0.06)" }}>
                    {unlockedIds.has(p.id) ? (
                      <>
                        {p.phone && (
                          <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 text-xs no-underline" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                            <Phone size={11} /> {p.phone}
                          </a>
                        )}
                        {p.website && (
                          <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs no-underline" style={{ color: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)" }}>
                            <Globe size={11} /> Website
                          </a>
                        )}
                        {(p.phone || p.website) && (
                          <a
                            href={p.phone ? `tel:${p.phone}` : p.website ?? "#"}
                            target={p.phone ? undefined : "_blank"}
                            rel="noopener noreferrer"
                            className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold no-underline"
                            style={{ background: "var(--sage)", color: "white", fontFamily: "var(--app-font-sans)" }}
                          >
                            <CheckCircle2 size={11} /> Request Info
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                          🔒 Contact details locked
                        </span>
                        {userCreditsCents > 0 && (
                          <span className="text-xs" style={{ color: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)", fontWeight: 600 }}>
                            🎁 Credit available
                          </span>
                        )}
                        <button
                          onClick={() => handleUnlock(p.id)}
                          disabled={unlockingId === p.id}
                          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{
                            background: userCreditsCents > 0 ? "var(--hpf-crimson)" : "var(--hpf-pink)",
                            color: "white",
                            border: "none",
                            cursor: unlockingId === p.id ? "wait" : "pointer",
                            fontFamily: "var(--app-font-sans)",
                            opacity: unlockingId === p.id ? 0.7 : 1,
                          }}
                        >
                          {unlockingId === p.id ? <Loader2 size={11} className="animate-spin" /> : <Unlock size={11} />}
                          {userCreditsCents > 0 ? "Unlock Free" : "Unlock"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
