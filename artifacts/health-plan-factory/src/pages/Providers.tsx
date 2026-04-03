import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2, BookmarkIcon, BookmarkCheck, SlidersHorizontal, X, Phone, Globe, CheckCircle2, Star, Lock, Sparkles, CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

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
  contactGated?: boolean;
  modalities?: { id: string; name: string }[];
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

interface CheckoutResult {
  checkout_url?: string;
  error?: string;
}

export default function Providers() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Subscription / gating state
  const [isPlus, setIsPlus] = useState(false);
  const [lockedCount, setLockedCount] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState<CheckoutResult | null>(null);

  // Reviews state
  const [reviewsMap, setReviewsMap] = useState<Record<string, ProviderReviewData>>({});
  const [reviewModal, setReviewModal] = useState<ReviewModalState | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [expandedReviewsId, setExpandedReviewsId] = useState<string | null>(null);

  // Booking request state
  const [bookingModal, setBookingModal] = useState<{ providerId: string; providerName: string; providerModality?: string } | null>(null);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [bookingContactEmail, setBookingContactEmail] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [memberWellnessGoal, setMemberWellnessGoal] = useState<string | null>(null);

  // Filters — initialise selectedModality from ?modality= query param
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
    }
  }, [user]);

  // Fetch member's primary wellness goal from their intakes for booking prefill
  useEffect(() => {
    if (!user) return;
    fetch(`${BASE}/api/intakes?profileId=${user.id}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: Array<{ goals?: string[] }> | null) => {
        if (!Array.isArray(data) || data.length === 0) return;
        // Use the most recently created intake (last in array) as the primary source
        const latest = data[data.length - 1];
        const goal = Array.isArray(latest?.goals) && latest.goals.length > 0 ? latest.goals[0] : null;
        if (goal) setMemberWellnessGoal(goal);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedModality) params.set("modalityId", selectedModality);
    if (zipCode) params.set("zipCode", zipCode);
    if (telehealth) params.set("telehealth", "true");
    params.set("limit", "50");

    fetch(`${BASE}/api/providers?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: { locked?: boolean; count?: number; providers?: Provider[] }) => {
        if (data?.locked === true) {
          // Explorer member — no real provider records returned
          setIsPlus(false);
          setLockedCount(data.count ?? 0);
          setProviders([]);
        } else {
          // Plus/employer member — real provider records
          setIsPlus(true);
          setLockedCount(null);
          setProviders(Array.isArray(data?.providers) ? data.providers : []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedModality, zipCode, telehealth, user]);

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

  const openBookingModal = (p: { id: string; name: string }, modalityLabel?: string) => {
    // Pre-fill a personalised message based on available context
    const providerFirstName = p.name.split(" ")[0];
    let preFill = `Hi ${providerFirstName},\n\nI found your listing on Health Plan Factory and would love to schedule a session with you.`;
    if (modalityLabel) {
      preFill += ` I'm specifically interested in ${modalityLabel}.`;
    }
    if (memberWellnessGoal) {
      preFill += ` My primary wellness goal is: ${memberWellnessGoal}.`;
    }
    preFill += "\n\nPlease let me know your availability and next steps. Thank you!";
    setBookingMessage(preFill);
    setBookingNote("");
    setBookingContactEmail(user?.email ?? "");
    setBookingModal({ providerId: p.id, providerName: p.name, providerModality: modalityLabel });
  };

  const submitBooking = async () => {
    if (!bookingModal || bookingMessage.trim().length < 10) {
      toast({ title: "Message too short", description: "Please write at least 10 characters.", variant: "destructive" });
      return;
    }
    setSubmittingBooking(true);
    try {
      const res = await fetch(`${BASE}/api/providers/${bookingModal.providerId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: bookingMessage.trim(),
          note: bookingNote.trim() || undefined,
          contactEmail: bookingContactEmail.trim() || undefined,
          requestedModality: bookingModal.providerModality || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to send request");
      }
      toast({ title: "Request sent!", description: "Your request was sent. The provider will contact you directly." });
      setBookingModal(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not send booking request";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmittingBooking(false);
    }
  };

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

  const handlePlusCheckout = async () => {
    if (!user) {
      navigate("/sign-up?plan=plus");
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch(`${BASE}/api/subscriptions/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data: CheckoutResult = await res.json();
      setCheckoutModal(data);
    } catch {
      toast({ title: "Checkout error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleConfirmCheckout = () => {
    if (!checkoutModal) return;
    if (checkoutModal.checkout_url) {
      window.location.href = checkoutModal.checkout_url;
    } else {
      toast({ title: "Checkout unavailable", description: "Unable to start checkout. Please try again or contact support.", variant: "destructive" });
      setCheckoutModal(null);
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

      {/* ── Plus Checkout Confirmation Modal ── */}
      {checkoutModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(44,40,37,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
          }}
          onClick={() => setCheckoutModal(null)}
        >
          <div
            style={{ background: "white", borderRadius: 16, padding: "1.75rem", maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={20} style={{ color: "var(--hpf-pink)" }} />
              <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.15rem", fontWeight: 700, color: "var(--hpf-pink)", margin: 0 }}>
                Upgrade to Plus
              </h3>
            </div>
            <p className="text-sm mb-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6 }}>
              <strong>$9.99/mo</strong> — See real matched local providers for every modality in your plan. Phone, website, and booking info included.
            </p>
            <p className="text-xs mb-5" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              Cancel anytime. Referral credits apply as a first-month discount.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCheckoutModal(null)}
                style={{ flex: 1, padding: "0.7rem", borderRadius: 10, background: "transparent", color: "var(--hpf-pink)", fontWeight: 600, fontSize: "0.85rem", border: "1.5px solid rgba(212,34,126,0.15)", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCheckout}
                style={{ flex: 2, padding: "0.7rem", borderRadius: 10, background: "var(--hpf-pink)", color: "white", fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
              >
                Continue to checkout →
              </button>
            </div>
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

      {/* ── Booking Request Modal ── */}
      {bookingModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
          }}
          onClick={() => setBookingModal(null)}
        >
          <div
            style={{ background: "white", borderRadius: 16, padding: "1.75rem", maxWidth: 460, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              <CalendarPlus size={20} style={{ color: "var(--hpf-pink)" }} />
              <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.15rem", fontWeight: 700, color: "var(--hpf-pink)", margin: 0 }}>
                Request Booking
              </h3>
              <button
                onClick={() => setBookingModal(null)}
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              Your message will be emailed to <strong>{bookingModal.providerName}</strong>.
              {bookingModal.providerModality && (
                <span> Requesting: <strong>{bookingModal.providerModality}</strong>.</span>
              )}
              {" "}They'll reply directly to your email.
            </p>
            <div className="mb-3">
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                Your contact email <span style={{ fontWeight: 400, fontSize: "0.75rem", color: "var(--text-muted)" }}>(optional — defaults to your account email)</span>
              </label>
              <input
                type="email"
                value={bookingContactEmail}
                onChange={(e) => setBookingContactEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--warm-white)", border: "1.5px solid rgba(212,34,126,0.12)", borderRadius: 8, color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                Message <span style={{ color: "var(--hpf-crimson)" }}>*</span>
              </label>
              <textarea
                value={bookingMessage}
                onChange={(e) => setBookingMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full px-3 py-2.5 text-sm resize-none outline-none"
                style={{ background: "var(--warm-white)", border: "1.5px solid rgba(212,34,126,0.12)", borderRadius: 8, color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
              />
              <p className="text-xs mt-1 text-right" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                {bookingMessage.length}/2000
              </p>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                Additional note (optional)
              </label>
              <textarea
                value={bookingNote}
                onChange={(e) => setBookingNote(e.target.value)}
                placeholder="Availability, insurance questions, specific concerns…"
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2.5 text-sm resize-none outline-none"
                style={{ background: "var(--warm-white)", border: "1.5px solid rgba(212,34,126,0.12)", borderRadius: 8, color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setBookingModal(null)}
                style={{ flex: 1, padding: "0.7rem", borderRadius: 10, background: "transparent", color: "var(--hpf-pink)", fontWeight: 600, fontSize: "0.85rem", border: "1.5px solid rgba(212,34,126,0.15)", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
              >
                Cancel
              </button>
              <button
                onClick={submitBooking}
                disabled={submittingBooking || bookingMessage.trim().length < 10}
                style={{ flex: 2, padding: "0.7rem", borderRadius: 10, background: bookingMessage.trim().length < 10 ? "rgba(212,34,126,0.1)" : "var(--hpf-pink)", color: bookingMessage.trim().length < 10 ? "var(--text-muted)" : "white", fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: bookingMessage.trim().length < 10 || submittingBooking ? "not-allowed" : "pointer", fontFamily: "var(--app-font-sans)", opacity: submittingBooking ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
              >
                {submittingBooking && <Loader2 size={14} className="animate-spin" />}
                Send booking request →
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

        {/* Plus upgrade banner — shown only for Explorer (non-Plus, logged-in) members */}
        {user && !isPlus && (
          <div style={{
            background: "linear-gradient(135deg, rgba(212,34,126,0.06) 0%, rgba(224,32,64,0.08) 100%)",
            border: "1.5px solid rgba(212,34,126,0.2)",
            borderRadius: 14,
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}>
            <Lock size={18} style={{ color: "var(--hpf-pink)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.85rem", fontWeight: 700, color: "var(--hpf-pink)", marginBottom: 2 }}>
                {lockedCount != null && lockedCount > 0
                  ? `${lockedCount} matched provider${lockedCount !== 1 ? "s" : ""} available — upgrade to Plus to see them`
                  : "Upgrade to Plus to see matched providers"}
              </p>
              <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Plus members see real local providers with phone, website, and booking info — $9.99/mo, cancel anytime.
              </p>
            </div>
            <button
              onClick={handlePlusCheckout}
              disabled={checkoutLoading}
              style={{
                padding: "0.5rem 1.1rem",
                borderRadius: 8,
                background: "var(--hpf-pink)",
                color: "white",
                fontWeight: 700,
                fontSize: "0.8rem",
                border: "none",
                cursor: checkoutLoading ? "wait" : "pointer",
                fontFamily: "var(--app-font-sans)",
                whiteSpace: "nowrap",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              {checkoutLoading && <Loader2 size={13} className="animate-spin" />}
              Upgrade to Plus →
            </button>
          </div>
        )}

        {/* Guest upgrade banner */}
        {!user && (
          <div style={{
            background: "linear-gradient(135deg, rgba(212,34,126,0.06) 0%, rgba(224,32,64,0.08) 100%)",
            border: "1.5px solid rgba(212,34,126,0.2)",
            borderRadius: 14,
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}>
            <Lock size={18} style={{ color: "var(--hpf-pink)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.85rem", fontWeight: 700, color: "var(--hpf-pink)", marginBottom: 2 }}>
                Sign up to connect with providers
              </p>
              <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Create a free account, then upgrade to Plus ($9.99/mo) to see contact info for all matched providers.
              </p>
            </div>
            <Link
              to="/sign-up"
              style={{
                padding: "0.5rem 1.1rem",
                borderRadius: 8,
                background: "var(--hpf-pink)",
                color: "white",
                fontWeight: 700,
                fontSize: "0.8rem",
                textDecoration: "none",
                fontFamily: "var(--app-font-sans)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Get started free →
            </Link>
          </div>
        )}

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
        {!loading && isPlus && (
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            {providers.length} provider{providers.length !== 1 ? "s" : ""} found
          </p>
        )}
        {!loading && !isPlus && lockedCount !== null && (
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            {lockedCount} provider{lockedCount !== 1 ? "s" : ""} matched — contact info visible to Plus members
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
          ) : !isPlus && lockedCount !== null ? (
            // Explorer member: show locked placeholder tiles
            lockedCount === 0 ? (
              <div className="col-span-full py-16 text-center">
                <p className="text-base mb-2" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-serif)" }}>No providers match your filters</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  Try adjusting your filters or clearing your search.
                </p>
              </div>
            ) : (
              Array.from({ length: Math.min(lockedCount, 9) }).map((_, i) => (
                <div
                  key={i}
                  className="p-5 flex flex-col gap-3 rounded-2xl"
                  style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)", position: "relative", overflow: "hidden" }}
                >
                  {/* Blurred/locked content */}
                  <div style={{ filter: "blur(5px)", pointerEvents: "none", userSelect: "none" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full flex-shrink-0" style={{ background: "rgba(212,34,126,0.12)" }} />
                      <div className="flex flex-col gap-1.5">
                        <div style={{ height: 12, width: 120, background: "rgba(212,34,126,0.12)", borderRadius: 6 }} />
                        <div style={{ height: 10, width: 80, background: "rgba(212,34,126,0.08)", borderRadius: 6 }} />
                      </div>
                    </div>
                    <div style={{ height: 10, width: "90%", background: "rgba(212,34,126,0.06)", borderRadius: 6, marginBottom: 6 }} />
                    <div style={{ height: 10, width: "75%", background: "rgba(212,34,126,0.06)", borderRadius: 6 }} />
                  </div>
                  {/* Overlay CTA */}
                  <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem",
                    background: "rgba(255,255,255,0.82)", backdropFilter: "blur(1px)",
                  }}>
                    <Lock size={18} style={{ color: "var(--hpf-pink)" }} />
                    <p style={{ fontFamily: "var(--app-font-sans)", fontSize: "0.78rem", fontWeight: 700, color: "var(--hpf-pink)", textAlign: "center", lineHeight: 1.4, maxWidth: 180 }}>
                      Provider details visible with Plus
                    </p>
                    <button
                      onClick={handlePlusCheckout}
                      disabled={checkoutLoading}
                      style={{
                        padding: "0.45rem 1rem",
                        borderRadius: 8,
                        background: "var(--hpf-pink)",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        border: "none",
                        cursor: checkoutLoading ? "wait" : "pointer",
                        fontFamily: "var(--app-font-sans)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      {checkoutLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                      Upgrade to Plus
                    </button>
                  </div>
                </div>
              ))
            )
          ) : isPlus && providers.length === 0 ? (
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
                      {isPlus && (
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

                  {/* Contact row — gated behind Plus subscription */}
                  <div className="flex flex-wrap gap-3 pt-1 border-t items-center" style={{ borderColor: "rgba(212,34,126,0.06)" }}>
                    {isPlus ? (
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
                        <button
                          onClick={() => {
                            // Use the active filter modality label if available, otherwise the provider's first modality
                            const filterModality = selectedModality
                              ? modalities.find((m) => m.id === selectedModality)?.name
                              : undefined;
                            const providerModalityLabel = filterModality ?? p.modalities?.[0]?.name;
                            openBookingModal(p, providerModalityLabel);
                          }}
                          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{ background: "var(--hpf-pink)", color: "white", fontFamily: "var(--app-font-sans)", border: "none", cursor: "pointer" }}
                        >
                          <CalendarPlus size={11} /> Request Booking
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                          <Lock size={10} /> Contact info with Plus
                        </span>
                        <Link
                          to="/pricing"
                          className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold no-underline"
                          style={{
                            background: "var(--hpf-pink)",
                            color: "white",
                            fontFamily: "var(--app-font-sans)",
                          }}
                        >
                          Upgrade to Plus
                        </Link>
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
