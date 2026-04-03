import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const navy = "#2C2825";
const amber = "#E02040";
const sage = "#7DB55C";

interface Modality {
  id: string;
  name: string;
  emoji: string;
  category: string;
  evidenceLevel: "Strong" | "Moderate" | "Emerging" | null;
  costLow: number;
  costHigh: number;
  hsaEligible: boolean;
  lmnEligible: boolean;
  conditions: string[];
  description: string;
  isActive: boolean;
  evidenceSummary: string | null;
  metaDescription: string | null;
}

const EVIDENCE_BADGE: Record<string, { bg: string; color: string }> = {
  Strong: { bg: "rgba(125,181,92,0.12)", color: sage },
  Moderate: { bg: "rgba(224,32,64,0.12)", color: amber },
  Emerging: { bg: "rgba(91,155,213,0.12)", color: "#5b9bd5" },
};

const CATEGORY_LABEL: Record<string, string> = {
  manual: "Manual Therapy",
  movement: "Movement",
  "mind-body": "Mind-Body",
  nutrition: "Nutrition",
  medical: "Medical",
  telehealth: "Telehealth",
};

export default function Modalities() {
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`${BASE}/api/modalities?isActive=true`)
      .then((r) => r.json())
      .then((data: Modality[]) => {
        setModalities(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = ["all", ...Array.from(new Set(modalities.map((m) => m.category)))];
  const filtered = filter === "all" ? modalities : modalities.filter((m) => m.category === filter);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": { "@id": "https://healthplanfactory.com/" } },
          { "@type": "ListItem", "position": 2, "name": "Modalities", "item": { "@id": "https://healthplanfactory.com/modalities" } },
        ],
      },
      {
        "@type": "ItemList",
        "name": "Wellness Modalities Evidence Library",
        "description": "Every wellness modality rated by research evidence, cross-referenced with health conditions and budget.",
        "url": "https://healthplanfactory.com/modalities",
        "numberOfItems": modalities.length,
        "itemListElement": modalities.map((m, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": m.name,
          "url": `https://healthplanfactory.com/modalities/${m.id}`,
          "description": m.metaDescription ?? m.description,
        })),
      },
    ],
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--warm-white)" }}>
      <Helmet>
        <title>Wellness Modalities Evidence Library | Health Plan Factory</title>
        <meta name="description" content="Browse 20+ evidence-rated wellness modalities — massage, acupuncture, nutrition, yoga, and more — with HSA eligibility, cost ranges, and provider matching." />
        <meta property="og:title" content="Wellness Modalities Evidence Library | Health Plan Factory" />
        <meta property="og:description" content="Every wellness modality rated by research evidence and matched to your budget and conditions." />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>
      </Helmet>

      {/* Hero */}
      <div style={{ background: navy }} className="px-6 py-10 md:py-16">
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          {/* Breadcrumb */}
          <nav style={{ marginBottom: 20, display: "flex", gap: 6, alignItems: "center", fontFamily: "var(--app-font-sans)", fontSize: 13 }}>
            <Link to="/" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Home</Link>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
            <span style={{ color: "rgba(255,255,255,0.9)" }}>Modalities</span>
          </nav>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(224,32,64,0.15)", border: "1px solid rgba(224,32,64,0.3)", borderRadius: 20, padding: "4px 14px", marginBottom: 16 }}>
            <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 700, color: "#e84d65", textTransform: "uppercase", letterSpacing: "0.07em" }}>Evidence Library</span>
          </div>
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 700, color: "white", letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            {modalities.length > 0 ? modalities.length : 20} Evidence-Led Modalities
          </h1>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 17, color: "rgba(255,255,255,0.65)", maxWidth: 560, lineHeight: 1.6, margin: 0 }}>
            Every modality rated by research evidence and cross-referenced with your health conditions and budget.
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ background: "white", borderBottom: "1px solid rgba(212,34,126,0.08)", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", display: "flex", gap: 4, overflowX: "auto" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "14px 16px",
                fontFamily: "var(--app-font-sans)",
                fontSize: 13,
                fontWeight: filter === cat ? 700 : 500,
                color: filter === cat ? navy : "var(--text-secondary)",
                borderBottom: filter === cat ? `2px solid ${navy}` : "2px solid transparent",
                whiteSpace: "nowrap",
                textTransform: cat === "all" ? "none" : "none",
              }}
            >
              {cat === "all" ? "All" : CATEGORY_LABEL[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px 80px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <Loader2 size={28} className="animate-spin" style={{ color: navy }} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {filtered.map((m) => {
              const badge = EVIDENCE_BADGE[m.evidenceLevel ?? "Emerging"];
              return (
                <Link
                  key={m.id}
                  to={`/modalities/${m.id}`}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div
                    style={{
                      background: "white",
                      border: "1px solid rgba(212,34,126,0.08)",
                      borderRadius: 14,
                      padding: "24px 20px",
                      height: "100%",
                      transition: "box-shadow 0.15s, transform 0.15s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(212,34,126,0.1)";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                      (e.currentTarget as HTMLDivElement).style.transform = "none";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <span style={{ fontSize: 32 }}>{m.emoji}</span>
                      {badge && (
                        <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, fontFamily: "var(--app-font-sans)", whiteSpace: "nowrap" }}>
                          {m.evidenceLevel}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: 18, fontWeight: 700, color: navy, margin: "0 0 8px" }}>
                      {m.name}
                    </h3>

                    <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", margin: "0 0 16px", lineHeight: 1.5 }}>
                      {m.description}
                    </p>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                      <span style={{ fontFamily: "var(--app-font-mono, 'DM Mono', monospace)", fontSize: 12, color: navy, background: "rgba(212,34,126,0.06)", padding: "3px 8px", borderRadius: 6 }}>
                        ${m.costLow}–${m.costHigh}/mo
                      </span>
                      {m.hsaEligible && (
                        <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, color: sage, background: "rgba(125,181,92,0.1)", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>
                          HSA/FSA
                        </span>
                      )}
                      <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, color: "var(--text-muted)", background: "rgba(0,0,0,0.04)", padding: "3px 8px", borderRadius: 6 }}>
                        {CATEGORY_LABEL[m.category] ?? m.category}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 4, color: amber, fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 600 }}>
                      Read evidence summary <ArrowRight size={13} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div style={{ marginTop: 60, padding: "40px 32px", background: navy, borderRadius: 16, textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 26, color: "white", margin: "0 0 12px" }}>
            Ready to build your personalized plan?
          </h2>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, color: "rgba(255,255,255,0.65)", marginBottom: 24 }}>
            Answer a few questions and get a plan from these modalities tailored to your goals and budget.
          </p>
          <Link
            to="/sign-up"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: amber, color: "white", padding: "13px 28px", borderRadius: 10, fontFamily: "var(--app-font-sans)", fontWeight: 700, fontSize: 15, textDecoration: "none" }}
          >
            Build my plan free <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
