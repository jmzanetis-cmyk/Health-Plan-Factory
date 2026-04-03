import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Video, Phone, Globe, Star, CheckCircle, ArrowLeft, Edit2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Provider {
  id: string;
  name: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  acceptsInsurance: boolean;
  offersTelehealth: boolean;
  costPerSession: string | null;
  status: string;
  rating: string | null;
  reviewCount: number;
  modalities?: Array<{ id: string; name: string }>;
}

export default function ProviderPreview() {
  const { t } = useTranslation();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/providers/me`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: { provider: Provider | null }) => {
        setProvider(data.provider);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--warm-white)" }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--hpf-pink)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--warm-white)" }}>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>No provider profile found.</p>
        <Link to="/provider/signup" className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white no-underline" style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>Complete your application →</Link>
      </div>
    );
  }

  const initials = provider.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen px-6 md:px-12 py-12" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-3xl mx-auto">

        {/* Back navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/provider/dashboard" className="flex items-center gap-2 text-sm no-underline" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
            <ArrowLeft size={14} />
            Back to dashboard
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs" style={{ background: "rgba(224,32,64,0.08)", border: "1px solid rgba(224,32,64,0.2)", color: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--hpf-crimson)" }} />
            Member preview — how your card appears in search
          </div>
        </div>

        {/* Provider card (member-facing view) */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(212,34,126,0.1)", boxShadow: "0 4px 24px rgba(212,34,126,0.08)" }}>

          {/* Header band */}
          <div className="h-24" style={{ background: "linear-gradient(135deg, var(--hpf-pink) 0%, #2a4a7a 100%)" }} />

          <div className="px-8 pb-8">
            {/* Avatar + name */}
            <div className="flex items-end gap-5 -mt-10 mb-6">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-bold text-white" style={{ background: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)", border: "3px solid white", boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
                {initials}
              </div>
              <div className="pb-1 flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight truncate" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>{provider.name}</h1>
                {provider.modalities && provider.modalities.length > 0 && (
                  <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                    {provider.modalities.slice(0, 2).map((m) => m.name).join(" · ")}
                    {provider.modalities.length > 2 && ` +${provider.modalities.length - 2} more`}
                  </p>
                )}
              </div>
              {provider.rating && (
                <div className="flex items-center gap-1.5 pb-1">
                  <Star size={14} style={{ color: "var(--hpf-crimson)", fill: "var(--hpf-crimson)" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>{Number(provider.rating).toFixed(1)}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>({provider.reviewCount})</span>
                </div>
              )}
            </div>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {provider.city && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ background: "rgba(212,34,126,0.05)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                  <MapPin size={11} />
                  {provider.city}, {provider.state}
                </div>
              )}
              {provider.offersTelehealth && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ background: "rgba(125,181,92,0.08)", color: "var(--sage)", fontFamily: "var(--app-font-sans)" }}>
                  <Video size={11} />
                  Telehealth
                </div>
              )}
              {provider.acceptsInsurance && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ background: "rgba(125,181,92,0.08)", color: "var(--sage)", fontFamily: "var(--app-font-sans)" }}>
                  <CheckCircle size={11} />
                  Accepts insurance
                </div>
              )}
              {provider.costPerSession && (
                <div className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: "rgba(224,32,64,0.08)", color: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)" }}>
                  ${Number(provider.costPerSession).toFixed(0)}/session
                </div>
              )}
            </div>

            {/* Bio */}
            {provider.bio && (
              <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                {provider.bio}
              </p>
            )}

            {/* Specialties */}
            {provider.modalities && provider.modalities.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.08em" }}>Specialties</p>
                <div className="flex flex-wrap gap-2">
                  {provider.modalities.map((m) => (
                    <span key={m.id} className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: "rgba(212,34,126,0.06)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact */}
            {(provider.phone || provider.website) && (
              <div className="pt-4" style={{ borderTop: "1px solid rgba(212,34,126,0.06)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", letterSpacing: "0.08em" }}>Contact</p>
                <div className="flex flex-wrap gap-4">
                  {provider.phone && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                      <Phone size={13} />
                      {provider.phone}
                    </div>
                  )}
                  {provider.website && (
                    <a href={provider.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm no-underline" style={{ color: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)" }}>
                      <Globe size={13} />
                      Visit website
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CTA footer (member view) */}
          <div className="px-8 py-5" style={{ background: "rgba(212,34,126,0.02)", borderTop: "1px solid rgba(212,34,126,0.06)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Members see a "Book intro call" button here after unlocking</p>
              <div className="px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: "rgba(212,34,126,0.3)", fontFamily: "var(--app-font-sans)" }}>
                Book intro call
              </div>
            </div>
          </div>
        </div>

        {/* Edit prompt */}
        <div className="flex justify-center mt-6">
          <Link
            to="/provider/profile"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold no-underline"
            style={{ border: "1.5px solid rgba(212,34,126,0.2)", color: "var(--hpf-pink)", background: "white", fontFamily: "var(--app-font-sans)" }}
          >
            <Edit2 size={14} />
            Edit your profile
          </Link>
        </div>

      </div>
    </div>
  );
}
