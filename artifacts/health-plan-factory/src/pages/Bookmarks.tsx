import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import { BookmarkCheck, Loader2, Trash2, Globe, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Favorite {
  providerId: string;
}

interface Provider {
  id: string;
  name: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  offersTelehealth: boolean;
  offersInPerson: boolean;
  acceptsInsurance: boolean;
  costPerSession: number | null;
}

export default function Bookmarks() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`${BASE}/api/favorites?profileId=${user.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then(async (data: Favorite[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          setLoading(false);
          return;
        }
        const ids = data.map((f) => f.providerId);
        setFavoriteIds(ids);

        // Fetch provider details for each saved ID
        const allProviders = await fetch(`${BASE}/api/providers?limit=200`, { credentials: "include" })
          .then((r) => r.json())
          .then((rows) => (Array.isArray(rows) ? rows : (rows?.providers ?? [])))
          .catch(() => []);

        const saved = allProviders.filter((p: Provider) => ids.includes(p.id));
        setProviders(saved);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const remove = async (providerId: string) => {
    if (!user) return;
    setRemovingId(providerId);
    try {
      await fetch(`${BASE}/api/favorites/${providerId}?profileId=${user.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setFavoriteIds((prev) => prev.filter((id) => id !== providerId));
      setProviders((prev) => prev.filter((p) => p.id !== providerId));
      toast({ title: "Removed", description: "Provider removed from your saved list." });
    } catch {
      toast({ title: "Error", description: "Could not remove provider.", variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--warm-white)" }}>
        <Loader2 className="animate-spin" size={28} style={{ color: "var(--hpf-pink)" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 md:px-10 py-10" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-deep)" }}>
              Saved Providers
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              Providers you've bookmarked for your plan
            </p>
          </div>
          <Link
            to="/providers"
            className="px-4 py-2.5 rounded-lg text-sm font-semibold no-underline"
            style={{ background: "var(--hpf-pink)", color: "white", fontFamily: "var(--app-font-sans)" }}
          >
            Browse more →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl p-5 h-36" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }} />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="py-20 text-center rounded-2xl" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
            <div className="text-4xl mb-4">🔖</div>
            <p className="text-base mb-2" style={{ color: "var(--hpf-deep)", fontFamily: "var(--app-font-serif)" }}>No saved providers yet</p>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              Browse the provider directory and save providers that match your plan.
            </p>
            <Link
              to="/providers"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white no-underline"
              style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              Browse providers
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {providers.map((p) => (
              <div
                key={p.id}
                className="p-5 flex flex-col gap-3 rounded-2xl relative"
                style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}
              >
                {/* Remove button */}
                <button
                  onClick={() => remove(p.id)}
                  disabled={removingId === p.id}
                  className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors"
                  style={{ background: "rgba(192,57,43,0.06)", border: "none", cursor: "pointer", color: "#c0392b" }}
                  title="Remove from saved"
                >
                  {removingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>

                <div className="flex items-center gap-3 pr-8">
                  <div
                    className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                    style={{ background: "rgba(125,181,92,0.1)", color: "var(--sage)", fontFamily: "var(--app-font-serif)" }}
                  >
                    <BookmarkCheck size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>{p.name}</p>
                    {(p.city || p.state) && (
                      <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                        {[p.city, p.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                {p.bio && (
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                    {p.bio}
                  </p>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {p.offersTelehealth && (
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(212,34,126,0.06)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>Telehealth</span>
                  )}
                  {p.offersInPerson && (
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(212,34,126,0.06)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>In-person</span>
                  )}
                  {p.acceptsInsurance && (
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(224,32,64,0.1)", color: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)" }}>Insurance</span>
                  )}
                  {p.costPerSession != null && (
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(125,181,92,0.08)", color: "var(--sage)", fontFamily: "var(--app-font-mono)" }}>${p.costPerSession}/session</span>
                  )}
                </div>

                {(p.phone || p.website) && (
                  <div className="flex gap-3 pt-1 border-t" style={{ borderColor: "rgba(212,34,126,0.06)" }}>
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
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
