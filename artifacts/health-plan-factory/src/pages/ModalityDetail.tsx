import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Loader2,
  Printer,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const navy = "#2C2825";
const amber = "#E02040";
const sage = "#7DB55C";

interface ModalityRow {
  id: string;
  name: string;
  emoji: string;
  category: string;
  evidenceLevel: "Strong" | "Moderate" | "Emerging" | null;
  costLow: number;
  costHigh: number;
  typicalFrequency: string;
  hsaEligible: boolean;
  lmnEligible: boolean;
  conditions: string[];
  description: string;
  evidenceSummary: string | null;
  metaDescription: string | null;
  relatedModalities: string[];
}

const CATEGORY_LABEL: Record<string, string> = {
  manual: "Manual Therapy",
  movement: "Movement & Exercise",
  "mind-body": "Mind-Body",
  nutrition: "Nutrition",
  medical: "Medical",
  telehealth: "Telehealth",
};

const CONDITION_LABEL: Record<string, string> = {
  "back-pain": "Back pain",
  "neck-pain": "Neck pain",
  stress: "Stress",
  anxiety: "Anxiety",
  sleep: "Sleep issues",
  "poor-flexibility": "Low flexibility",
  sedentary: "Sedentary lifestyle",
  digestive: "Digestive health",
  "recovery-needs": "Recovery",
  "no-group": "Prefers solo",
  "no-chiro": "No chiropractic",
  "no-needles": "No needles",
  "mobility-limits": "Mobility limits",
  "no-hiit": "No HIIT",
  "pregnancy-safe": "Pregnancy-safe",
};

const EVIDENCE_DETAIL: Record<string, { color: string; bg: string; border: string; icon: typeof CheckCircle2; description: string }> = {
  Strong: {
    color: sage,
    bg: "rgba(125,181,92,0.07)",
    border: "rgba(125,181,92,0.25)",
    icon: CheckCircle2,
    description: "Multiple randomized controlled trials and systematic reviews support the effectiveness of this modality.",
  },
  Moderate: {
    color: amber,
    bg: "rgba(224,32,64,0.07)",
    border: "rgba(224,32,64,0.25)",
    icon: Info,
    description: "Clinical studies and observational research show promising results, though larger trials are ongoing.",
  },
  Emerging: {
    color: "#5b9bd5",
    bg: "rgba(91,155,213,0.07)",
    border: "rgba(91,155,213,0.25)",
    icon: AlertCircle,
    description: "Early-stage and observational data show potential; well-designed trials are still accumulating.",
  },
};

const PROVIDER_TIPS: Record<string, string[]> = {
  manual: [
    "Verify licensure in your state (LMT, DC, LAc, etc.)",
    "Ask about their approach to your specific condition",
    "Request an initial assessment before committing to a package",
    "Look for NCBTMB, ACA, or NCCAOM credentials",
  ],
  movement: [
    "Ask about certifications (NASM, ACE, NSCA, Balanced Body)",
    "Confirm experience with your specific goals or limitations",
    "Start with a trial session before a long-term commitment",
    "Group classes are more affordable; private sessions offer personalization",
  ],
  "mind-body": [
    "Look for certified MBSR instructors or trained meditation teachers",
    "Many effective programs are available digitally at low cost",
    "Consistent practice matters more than session length",
    "Apps like Headspace or Calm can supplement in-person instruction",
  ],
  nutrition: [
    "An RD (Registered Dietitian) has medical licensure; a nutritionist may not",
    "Ask if they bill insurance or accept HSA/FSA payments",
    "Look for specialty training matching your condition (e.g., GI, sports)",
    "Virtual appointments are widely available and highly effective",
  ],
  medical: [
    "Verify the provider is licensed and in good standing",
    "Ask about LMN (Letter of Medical Necessity) capabilities for HSA reimbursement",
    "Understand co-pays, deductibles, and out-of-pocket maximums",
    "DPC physicians often offer flat-fee memberships with no per-visit cost",
  ],
  telehealth: [
    "Confirm they are licensed in your state",
    "Ask about platform security and HIPAA compliance",
    "Virtual-first providers often have shorter wait times",
    "Check if sessions count toward your deductible or HSA eligibility",
  ],
};

export default function ModalityDetail() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [modality, setModality] = useState<ModalityRow | null>(null);
  const [relatedModalities, setRelatedModalities] = useState<ModalityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetch(`${BASE}/api/modalities/${slug}`)
      .then(async (r) => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return; }
        const data: ModalityRow = await r.json();
        setModality(data);
        setLoading(false);
        // Fetch related modalities
        if (data.relatedModalities?.length) {
          const related = await Promise.all(
            data.relatedModalities.slice(0, 3).map((id) =>
              fetch(`${BASE}/api/modalities/${id}`).then((r) => r.ok ? r.json() : null)
            )
          );
          setRelatedModalities(related.filter(Boolean) as ModalityRow[]);
        }
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: navy }} />
      </div>
    );
  }

  if (notFound || !modality) {
    return (
      <div style={{ maxWidth: 560, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 28, color: navy }}>{t("modalityDetail.notFound")}</h2>
        <p style={{ fontFamily: "var(--app-font-sans)", color: "var(--text-secondary)", marginBottom: 24 }}>
          We couldn't find that modality. Browse our full evidence library below.
        </p>
        <Link to="/modalities" style={{ color: navy, fontFamily: "var(--app-font-sans)", fontWeight: 700 }}>← Back to Modalities</Link>
      </div>
    );
  }

  const evidenceConfig = EVIDENCE_DETAIL[modality.evidenceLevel ?? "Emerging"];
  const EvidenceIcon = evidenceConfig.icon;
  const providerTips = PROVIDER_TIPS[modality.category] ?? PROVIDER_TIPS.manual;

  const ogDescription = modality.metaDescription ?? modality.description;

  const pageUrl = `https://healthplanfactory.com/modalities/${modality.id}`;

  const faqPairs = [
    {
      q: `Is ${modality.name} HSA or FSA eligible?`,
      a: modality.hsaEligible
        ? `${modality.name} is generally eligible for HSA/FSA reimbursement when accompanied by a Letter of Medical Necessity (LMN) from a licensed physician. ${modality.lmnEligible ? "Health Plan Factory can help you obtain an LMN through our DPC physician network." : ""}`
        : `${modality.name} is not typically reimbursable through HSA/FSA without an LMN from a licensed physician. A Letter of Medical Necessity may unlock reimbursement in some cases.`,
    },
    {
      q: `How much does ${modality.name} cost per month?`,
      a: `Typical monthly cost for ${modality.name} ranges from $${modality.costLow} to $${modality.costHigh}. Frequency is typically ${modality.typicalFrequency}. Costs vary by location, provider credentials, and session length.`,
    },
    {
      q: `What is the evidence level for ${modality.name}?`,
      a: modality.evidenceLevel === "Strong"
        ? `${modality.name} has Strong evidence: multiple randomized controlled trials and systematic reviews support its effectiveness.`
        : modality.evidenceLevel === "Moderate"
        ? `${modality.name} has Moderate evidence: clinical studies and observational research show promising results, though larger trials are ongoing.`
        : `${modality.name} has Emerging evidence: early-stage and observational data show potential, and well-designed trials are still accumulating.`,
    },
    ...(modality.evidenceSummary
      ? [{
          q: `What conditions can ${modality.name} help with?`,
          a: modality.evidenceSummary.split("\n\n")[0] ?? modality.evidenceSummary,
        }]
      : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": { "@id": "https://healthplanfactory.com/" } },
          { "@type": "ListItem", "position": 2, "name": "Modalities", "item": { "@id": "https://healthplanfactory.com/modalities" } },
          { "@type": "ListItem", "position": 3, "name": modality.name, "item": { "@id": pageUrl } },
        ],
      },
      {
        "@type": "MedicalWebPage",
        "name": `${modality.name} — ${t("modalityDetail.evidenceSummary")}`,
        "description": ogDescription,
        "url": pageUrl,
        "inLanguage": "en-US",
        "about": { "@type": "MedicalTherapy", "name": modality.name },
        "publisher": {
          "@type": "Organization",
          "name": "Health Plan Factory",
          "url": "https://healthplanfactory.com",
        },
      },
      {
        "@type": "FAQPage",
        "mainEntity": faqPairs.map(({ q, a }) => ({
          "@type": "Question",
          "name": q,
          "acceptedAnswer": { "@type": "Answer", "text": a },
        })),
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>{`${modality.name} — ${t("modalityDetail.evidenceSummary")} | Health Plan Factory`}</title>
        <meta name="description" content={ogDescription} />
        <meta property="og:title" content={`${modality.name} — ${t("modalityDetail.evidenceSummary")} | Health Plan Factory`} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${modality.name} | Health Plan Factory`} />
        <meta name="twitter:description" content={ogDescription} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* ── Print styles ──────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-section { break-inside: avoid; }
          body { color: #000 !important; background: #fff !important; }
          nav, header, footer { display: none !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "var(--warm-white)" }}>
        {/* Hero */}
        <div className="no-print" style={{ background: navy, padding: "48px 24px 40px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {/* Breadcrumb */}
            <nav style={{ marginBottom: 20, display: "flex", gap: 6, alignItems: "center", fontFamily: "var(--app-font-sans)", fontSize: 13 }}>
              <Link to="/" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Home</Link>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
              <Link to="/modalities" style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}>Modalities</Link>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
              <span style={{ color: "rgba(255,255,255,0.9)" }}>{modality.name}</span>
            </nav>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
              <span style={{ fontSize: 52, lineHeight: 1 }}>{modality.emoji}</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ background: evidenceConfig.bg, border: `1px solid ${evidenceConfig.border}`, color: evidenceConfig.color, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20, fontFamily: "var(--app-font-sans)" }}>
                    {modality.evidenceLevel} Evidence
                  </span>
                  <span style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", fontSize: 12, padding: "3px 10px", borderRadius: 20, fontFamily: "var(--app-font-sans)" }}>
                    {CATEGORY_LABEL[modality.category] ?? modality.category}
                  </span>
                </div>
                <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 700, color: "white", margin: 0, letterSpacing: "-0.02em" }}>
                  {modality.name}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
          {/* Printable section header */}
          <div className="print-section" style={{ display: "none" }} ref={printRef}>
            <div style={{ borderBottom: "2px solid #D4227E", paddingBottom: 16, marginBottom: 24 }}>
              <h1 style={{ fontFamily: "serif", fontSize: 28, margin: "0 0 4px", color: "#D4227E" }}>{modality.emoji} {modality.name}</h1>
              <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{t("modalityDetail.evidenceSummary")} — Health Plan Factory | healthplanfactory.com</p>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 36 }}>
            {[
              { label: "Typical cost", value: `$${modality.costLow}–$${modality.costHigh}/mo` },
              { label: "Frequency", value: modality.typicalFrequency },
              { label: "HSA/FSA eligible", value: modality.hsaEligible ? "Often yes" : "Typically no" },
              { label: "Evidence level", value: modality.evidenceLevel ?? "Emerging" },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)", borderRadius: 12, padding: "16px 18px" }}>
                <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>{label}</p>
                <p style={{ fontFamily: "var(--app-font-mono, 'DM Mono', monospace)", fontSize: 15, fontWeight: 600, color: navy, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Evidence level banner */}
          <div className="print-section" style={{ background: evidenceConfig.bg, border: `1px solid ${evidenceConfig.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 32, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <EvidenceIcon size={18} style={{ color: evidenceConfig.color, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 700, color: evidenceConfig.color, margin: "0 0 4px" }}>
                {modality.evidenceLevel} Evidence
              </p>
              <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                {evidenceConfig.description}
              </p>
            </div>
          </div>

          {/* Evidence summary */}
          <section className="print-section" style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 22, color: navy, margin: "0 0 16px" }}>{t("modalityDetail.evidenceSummary")}</h2>
            {modality.evidenceSummary ? (
              <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.75 }}>
                {modality.evidenceSummary.split("\n\n").map((paragraph, i) => (
                  <p key={i} style={{ margin: "0 0 16px" }}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, color: "var(--text-muted)" }}>
                Evidence summary coming soon.
              </p>
            )}
          </section>

          {/* Conditions chip list */}
          {modality.conditions?.length > 0 && (
            <section className="print-section" style={{ marginBottom: 40 }}>
              <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 22, color: navy, margin: "0 0 16px" }}>{t("modalityDetail.conditionsHelp")}</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {modality.conditions.map((c) => (
                  <span
                    key={c}
                    style={{
                      fontFamily: "var(--app-font-sans)",
                      fontSize: 13,
                      color: navy,
                      background: "rgba(212,34,126,0.07)",
                      border: "1px solid rgba(212,34,126,0.12)",
                      padding: "5px 12px",
                      borderRadius: 20,
                    }}
                  >
                    {CONDITION_LABEL[c] ?? c}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* HSA/FSA note */}
          <section className="print-section" style={{ marginBottom: 40, background: modality.hsaEligible ? "rgba(125,181,92,0.06)" : "rgba(224,32,64,0.06)", border: `1px solid ${modality.hsaEligible ? "rgba(125,181,92,0.2)" : "rgba(224,32,64,0.2)"}`, borderRadius: 12, padding: "20px 22px" }}>
            <h3 style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 700, color: modality.hsaEligible ? sage : amber, margin: "0 0 8px" }}>
              HSA / FSA Eligibility
            </h3>
            {modality.hsaEligible ? (
              <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                {modality.name} is generally eligible for HSA/FSA reimbursement when accompanied by a Letter of Medical Necessity (LMN) from a licensed physician.
                {modality.lmnEligible && " Health Plan Factory can help you obtain an LMN through our DPC physician network."}
              </p>
            ) : (
              <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
                {modality.name} is not typically reimbursable through HSA/FSA without an LMN. A physician-issued Letter of Medical Necessity may unlock reimbursement in some cases.
              </p>
            )}
            {modality.lmnEligible && (
              <Link
                to="/hsa-unlock"
                className="no-print"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontFamily: "var(--app-font-sans)", fontSize: 13, fontWeight: 700, color: sage, textDecoration: "none" }}
              >
                Learn how to unlock HSA reimbursement <ArrowRight size={13} />
              </Link>
            )}
          </section>

          {/* What to look for in a provider */}
          <section className="print-section" style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 22, color: navy, margin: "0 0 16px" }}>{t("modalityDetail.providerTips")}</h2>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {providerTips.map((tip) => (
                <li key={tip} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55 }}>
                  <span style={{ color: sage, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          {/* Share with doctor / Print CTA */}
          <section className="print-section no-print" style={{ marginBottom: 48, background: "white", border: "1px solid rgba(212,34,126,0.08)", borderRadius: 14, padding: "24px 28px" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: 18, color: navy, margin: "0 0 8px" }}>Share with your doctor</h3>
                <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: "0 0 16px", lineHeight: 1.5 }}>
                  Print a one-page evidence summary formatted for clinical conversations. Includes evidence level, conditions, cost range, and the HPF disclaimer.
                </p>
                <button
                  onClick={handlePrint}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, background: navy, color: "white", border: "none", padding: "10px 20px", borderRadius: 9, fontFamily: "var(--app-font-sans)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  <Printer size={15} /> Print / Save as PDF
                </button>
              </div>
              <div style={{ padding: "16px 20px", background: "rgba(212,34,126,0.04)", borderRadius: 10, fontSize: 11, fontFamily: "var(--app-font-sans)", color: "var(--text-muted)", maxWidth: 220, lineHeight: 1.5 }}>
                <strong>Disclaimer:</strong> Health Plan Factory is a wellness referral platform, not a medical provider. This summary is educational and not a substitute for professional medical advice.
              </div>
            </div>
          </section>

          {/* Print-only disclaimer */}
          <div style={{ display: "none", marginTop: 32, paddingTop: 16, borderTop: "1px solid #ddd", fontSize: 11, color: "#888", fontFamily: "sans-serif" }} className="print-only">
            Health Plan Factory is a wellness referral platform, not a medical provider. This evidence summary is educational only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider. healthplanfactory.com
          </div>

          {/* Find a provider CTA */}
          <section className="no-print" style={{ marginBottom: 48, background: navy, borderRadius: 14, padding: "28px 32px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <MapPin size={32} style={{ color: amber, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: 20, color: "white", margin: "0 0 6px" }}>Find a {modality.name} provider near you</h3>
              <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0 }}>
                Browse vetted providers in our network, filtered for {modality.name}.
              </p>
            </div>
            <Link
              to={`/discover?modality=${modality.id}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: amber, color: "white", padding: "11px 22px", borderRadius: 9, fontFamily: "var(--app-font-sans)", fontWeight: 700, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Find providers <ArrowRight size={14} />
            </Link>
          </section>

          {/* Related modalities */}
          {relatedModalities.length > 0 && (
            <section className="no-print">
              <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 22, color: navy, margin: "0 0 20px" }}>Related Modalities</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                {relatedModalities.map((rel) => (
                  <Link
                    key={rel.id}
                    to={`/modalities/${rel.id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)", borderRadius: 12, padding: "18px 16px", transition: "box-shadow 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(212,34,126,0.08)"}
                      onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}
                    >
                      <span style={{ fontSize: 26, display: "block", marginBottom: 10 }}>{rel.emoji}</span>
                      <h4 style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 700, color: navy, margin: "0 0 4px" }}>{rel.name}</h4>
                      <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, color: amber, margin: 0, fontWeight: 600 }}>
                        {rel.evidenceLevel} evidence →
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Back link */}
          <div className="no-print" style={{ marginTop: 48 }}>
            <Link to="/modalities" style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: navy, textDecoration: "none", fontWeight: 600 }}>
              ← Back to Evidence Library
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
