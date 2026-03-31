import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2, BookmarkIcon, BookmarkCheck, SlidersHorizontal, X, Phone, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

function SkeletonCard() {
  return (
    <div className="p-5 rounded-2xl animate-pulse" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full flex-shrink-0" style={{ background: "rgba(27,45,79,0.08)" }} />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-4 rounded" style={{ background: "rgba(27,45,79,0.08)", width: "60%" }} />
          <div className="h-3 rounded" style={{ background: "rgba(27,45,79,0.06)", width: "40%" }} />
        </div>
      </div>
      <div className="h-12 rounded" style={{ background: "rgba(27,45,79,0.04)" }} />
    </div>
  );
}

export default function Providers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filters
  const [selectedModality, setSelectedModality] = useState("");
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
    border: "1.5px solid rgba(27,45,79,0.12)",
    color: "var(--navy)",
    fontFamily: "var(--app-font-sans)",
    outline: "none",
    borderRadius: 8,
  };

  return (
    <div className="min-h-screen px-4 md:px-10 py-10" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)" }}>
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
              background: showFilters ? "var(--navy)" : "white",
              color: showFilters ? "white" : "var(--navy)",
              border: "1.5px solid rgba(27,45,79,0.15)",
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
          <div className="p-5 rounded-2xl flex flex-wrap gap-4 items-end" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>Modality</label>
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
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>ZIP Code</label>
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
              <span className="text-sm font-medium" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>Telehealth only</span>
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
            background: "rgba(184,137,42,0.06)",
            border: "1.5px solid rgba(184,137,42,0.22)",
            padding: "1rem 1.25rem",
            display: "flex",
            gap: "0.875rem",
            alignItems: "flex-start",
          }}>
            <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>🩺</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--navy)", fontFamily: "var(--app-font-sans)", marginBottom: 3 }}>
                DPC physicians can write a Letter of Medical Necessity for your plan
              </p>
              <p style={{ fontSize: "0.73rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6, marginBottom: 8 }}>
                Connect with a Direct Primary Care physician to get an LMN that covers HSA/FSA-reimbursable wellness services in your plan — potentially saving hundreds per year.
              </p>
              <Link
                to="/hsa-unlock"
                style={{ fontSize: "0.73rem", fontWeight: 600, color: "#b8892a", fontFamily: "var(--app-font-sans)", textDecoration: "underline" }}
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
              <p className="text-base mb-2" style={{ color: "var(--navy)", fontFamily: "var(--app-font-serif)" }}>No providers found</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                Try adjusting your filters or clearing your search.
              </p>
            </div>
          ) : (
            providers.map((p) => {
              const isSaved = favorites.has(p.id);
              return (
                <div
                  key={p.id}
                  className="p-5 flex flex-col gap-3 rounded-2xl"
                  style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}
                >
                  {/* Provider header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                        style={{ background: "rgba(27,45,79,0.08)", color: "var(--navy)", fontFamily: "var(--app-font-serif)" }}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-tight" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
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
                        background: isSaved ? "rgba(61,107,82,0.1)" : "rgba(27,45,79,0.04)",
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
                          style={{ background: "rgba(27,45,79,0.05)", color: "var(--navy)", fontFamily: "var(--app-font-mono)", fontSize: "0.68rem", border: "1px solid rgba(27,45,79,0.1)" }}
                        >
                          {cred}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {p.offersTelehealth && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "rgba(27,45,79,0.06)", color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
                        Telehealth
                      </span>
                    )}
                    {p.offersInPerson && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "rgba(27,45,79,0.06)", color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
                        In-person
                      </span>
                    )}
                    {p.acceptsInsurance && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "rgba(184,137,42,0.1)", color: "var(--hpf-amber)", fontFamily: "var(--app-font-sans)" }}>
                        HSA/FSA
                      </span>
                    )}
                    {p.costPerSession != null && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "rgba(61,107,82,0.08)", color: "var(--sage)", fontFamily: "var(--app-font-mono)" }}>
                        ${p.costPerSession}/session
                      </span>
                    )}
                  </div>

                  {/* Contact row */}
                  <div className="flex flex-wrap gap-3 pt-1 border-t items-center" style={{ borderColor: "rgba(27,45,79,0.06)" }}>
                    {p.phone && (
                      <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 text-xs no-underline" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                        <Phone size={11} /> {p.phone}
                      </a>
                    )}
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs no-underline" style={{ color: "var(--hpf-amber)", fontFamily: "var(--app-font-sans)" }}>
                        <Globe size={11} /> Website
                      </a>
                    )}
                    {p.phone ? (
                      <a
                        href={`tel:${p.phone}`}
                        className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold no-underline"
                        style={{ background: "var(--navy)", color: "white", fontFamily: "var(--app-font-sans)" }}
                      >
                        Request Info
                      </a>
                    ) : p.website ? (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold no-underline"
                        style={{ background: "var(--navy)", color: "white", fontFamily: "var(--app-font-sans)" }}
                      >
                        Request Info
                      </a>
                    ) : null}
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
