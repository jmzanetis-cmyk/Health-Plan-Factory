import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import { Users, Star, Calendar, TrendingUp, ChevronRight, ExternalLink, Clock, MapPin, Video } from "lucide-react";

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

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend?: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(27,45,79,0.06)" }}>
          {icon}
        </div>
        {trend && <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(61,107,82,0.08)", color: "var(--sage)", fontFamily: "var(--app-font-sans)" }}>{trend}</span>}
      </div>
      <p className="text-2xl font-bold mb-0.5" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>{value}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{label}</p>
    </div>
  );
}

export default function ProviderDashboard() {
  const { user } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/providers?limit=100`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: Provider[]) => {
        const match = data.find((p) => p.name && user?.firstName && p.name.toLowerCase().includes(user.firstName.toLowerCase()));
        setProvider(match ?? data[0] ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const displayName = user?.firstName ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}` : user?.email ?? "Provider";

  return (
    <div className="min-h-screen px-6 md:px-12 py-16" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--navy)" }}>
              Welcome back, {displayName.split(" ")[0]}
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              Provider dashboard · {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/provider/profile"
              className="px-4 py-2 rounded-lg text-sm font-semibold no-underline"
              style={{ border: "1.5px solid rgba(27,45,79,0.2)", color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
            >
              Edit profile
            </Link>
            <Link
              to="/provider/leads"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white no-underline flex items-center gap-2"
              style={{ background: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
            >
              View leads <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users size={18} style={{ color: "var(--navy)" }} />} label="Profile views this month" value="—" trend="+12%" />
          <StatCard icon={<Star size={18} style={{ color: "var(--hpf-amber)" }} />} label="Average rating" value={provider?.rating ? Number(provider.rating).toFixed(1) : "—"} />
          <StatCard icon={<Calendar size={18} style={{ color: "var(--sage)" }} />} label="Bookings this month" value="—" />
          <StatCard icon={<TrendingUp size={18} style={{ color: "var(--navy)" }} />} label="Plan recommendations" value="—" trend="Coming soon" />
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile card */}
          <div className="md:col-span-2 rounded-xl p-6" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
            <div className="flex items-start justify-between mb-5">
              <h2 className="text-base font-semibold" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>Your profile</h2>
              <Link to="/provider/profile" className="text-xs no-underline flex items-center gap-1" style={{ color: "var(--hpf-amber)", fontFamily: "var(--app-font-sans)" }}>
                Edit <ExternalLink size={11} />
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--navy)", borderTopColor: "transparent" }} />
                <span className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Loading...</span>
              </div>
            ) : provider ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="font-semibold text-sm mb-1" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>{provider.name}</p>
                  {provider.bio && (
                    <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>{provider.bio}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {provider.city && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                      <MapPin size={12} />
                      {provider.city}, {provider.state}
                    </div>
                  )}
                  {provider.offersTelehealth && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--sage)", fontFamily: "var(--app-font-sans)" }}>
                      <Video size={12} />
                      Telehealth available
                    </div>
                  )}
                  {provider.costPerSession && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                      ${Number(provider.costPerSession).toFixed(0)}/session
                    </div>
                  )}
                </div>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                  style={{
                    background: provider.status === "approved" ? "rgba(61,107,82,0.08)" : "rgba(184,137,42,0.08)",
                    color: provider.status === "approved" ? "var(--sage)" : "var(--hpf-amber)",
                    fontFamily: "var(--app-font-sans)",
                    width: "fit-content",
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: provider.status === "approved" ? "var(--sage)" : "var(--hpf-amber)" }} />
                  {provider.status === "approved" ? "Profile active" : `Status: ${provider.status}`}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  No provider profile found. Complete your application to appear in member searches.
                </p>
                <Link
                  to="/provider/signup"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white no-underline"
                  style={{ background: "var(--navy)", fontFamily: "var(--app-font-sans)" }}
                >
                  Complete application →
                </Link>
              </div>
            )}
          </div>

          {/* Quick links & upcoming */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl p-6" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
              <h2 className="text-base font-semibold mb-4" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>Quick links</h2>
              <div className="flex flex-col gap-1">
                {[
                  { to: "/provider/leads", label: "Member leads" },
                  { to: "/provider/profile", label: "Edit profile" },
                  { to: "/modalities", label: "Browse modalities" },
                  { to: "/for-providers", label: "Provider resources" },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center justify-between py-2.5 text-sm no-underline border-b transition-colors hover:opacity-70"
                    style={{ color: "var(--navy)", borderColor: "rgba(27,45,79,0.06)", fontFamily: "var(--app-font-sans)" }}
                  >
                    {item.label}
                    <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ background: "rgba(27,45,79,0.03)", border: "1px solid rgba(27,45,79,0.08)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} style={{ color: "var(--hpf-amber)" }} />
                <p className="text-xs font-semibold" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>Founding Provider Offer</p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                0% platform commission for your first 90 days as a founding provider. Invite colleagues before spots fill up.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
