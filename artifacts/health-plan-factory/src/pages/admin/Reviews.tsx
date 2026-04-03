import { useState, useEffect } from "react";
import { AdminNav } from "./Dashboard";
import { Loader2, Star, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface AdminReview {
  id: string;
  rating: number;
  reviewText: string | null;
  isHidden: boolean;
  createdAt: string;
  providerId: string;
  providerName: string | null;
  memberId: string;
  memberName: string | null;
  memberEmail: string | null;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={13}
          fill={s <= rating ? "#f59e0b" : "none"}
          style={{ color: s <= rating ? "#f59e0b" : "#d1d5db" }}
        />
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/api/admin/reviews?showHidden=${showHidden}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.reviews)) setReviews(data.reviews);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [showHidden]);

  const toggleHide = async (id: string, currentlyHidden: boolean) => {
    setActingId(id);
    try {
      const res = await fetch(`${BASE}/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isHidden: !currentlyHidden }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isHidden: data.review.isHidden } : r)),
      );
      toast({
        title: currentlyHidden ? "Review unhidden" : "Review hidden",
        description: currentlyHidden ? "Review is now visible to members." : "Review has been hidden from members.",
      });
    } catch {
      toast({ title: "Error", description: "Action failed. Please try again.", variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="min-h-screen px-4 md:px-10 py-10" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-pink)" }}>
            Review Moderation
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
            Review and moderate member reviews of providers
          </p>
        </div>

        <AdminNav active="/admin/reviews" />

        <div className="flex items-center gap-3 mb-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
              Show hidden reviews
            </span>
          </label>
          <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin" size={24} style={{ color: "var(--hpf-pink)" }} />
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-16 text-center">
              <Star size={32} style={{ color: "rgba(212,34,126,0.2)", margin: "0 auto 12px" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                No reviews yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead style={{ background: "rgba(212,34,126,0.02)", borderBottom: "1px solid rgba(212,34,126,0.08)" }}>
                  <tr>
                    {["Provider", "Member", "Rating", "Review", "Date", "Status", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-3 py-3"
                        style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r, i) => (
                    <tr
                      key={r.id}
                      style={{
                        borderTop: i === 0 ? "none" : "1px solid rgba(212,34,126,0.04)",
                        opacity: r.isHidden ? 0.55 : 1,
                      }}
                    >
                      <td className="px-3 py-3">
                        <p className="text-sm font-medium" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                          {r.providerName ?? "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                          {r.memberName ?? "—"}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                          {r.memberEmail}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <StarDisplay rating={r.rating} />
                        <span className="text-xs font-semibold" style={{ color: "#f59e0b", fontFamily: "var(--app-font-sans)" }}>
                          {r.rating}/5
                        </span>
                      </td>
                      <td className="px-3 py-3" style={{ maxWidth: 280 }}>
                        {r.reviewText ? (
                          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                            {r.reviewText.length > 120 ? `${r.reviewText.slice(0, 120)}…` : r.reviewText}
                          </p>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                            No written review
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", whiteSpace: "nowrap" }}>
                        {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-3 py-3">
                        {r.isHidden ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: "rgba(192,57,43,0.08)", color: "#c0392b", fontFamily: "var(--app-font-sans)" }}
                          >
                            <EyeOff size={10} /> Hidden
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: "rgba(125,181,92,0.1)", color: "var(--sage)", fontFamily: "var(--app-font-sans)" }}
                          >
                            <Eye size={10} /> Visible
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleHide(r.id, r.isHidden)}
                          disabled={actingId === r.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{
                            background: r.isHidden ? "rgba(125,181,92,0.1)" : "rgba(192,57,43,0.08)",
                            color: r.isHidden ? "var(--sage)" : "#c0392b",
                            border: "none",
                            cursor: actingId === r.id ? "wait" : "pointer",
                            fontFamily: "var(--app-font-sans)",
                          }}
                        >
                          {actingId === r.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : r.isHidden ? (
                            <Eye size={10} />
                          ) : (
                            <EyeOff size={10} />
                          )}
                          {r.isHidden ? "Unhide" : "Hide"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
