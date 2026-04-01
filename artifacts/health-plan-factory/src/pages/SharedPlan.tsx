import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface ShareModality {
  name: string;
  emoji: string;
}

interface SharedPlanData {
  shareToken: string;
  shareGoal: string | null;
  shareModalities: ShareModality[];
  budget: number;
  totalMonthlyCost: number;
  budgetUtilization: number;
  createdAt: string;
}

function ShareCard({ data, signupUrl }: { data: SharedPlanData; signupUrl: string }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, var(--hpf-pink) 0%, var(--hpf-crimson) 100%)",
      borderRadius: 24,
      padding: "2rem",
      color: "white",
      maxWidth: 460,
      margin: "0 auto",
      boxShadow: "0 20px 60px rgba(212,34,126,0.3)",
    }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <p style={{
          fontSize: "0.65rem",
          fontFamily: "var(--app-font-mono)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.65)",
          marginBottom: "0.4rem",
        }}>
          Health Plan Factory
        </p>
        <h1 style={{
          fontFamily: "var(--app-font-serif)",
          fontSize: "clamp(1.4rem, 4vw, 1.85rem)",
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: "0.35rem",
        }}>
          {data.shareGoal
            ? `My wellness plan for ${data.shareGoal}`
            : "My personalized wellness plan"}
        </h1>
        <p style={{
          fontSize: "0.8rem",
          color: "rgba(255,255,255,0.7)",
          fontFamily: "var(--app-font-sans)",
        }}>
          Evidence-based · ${data.totalMonthlyCost}/mo within ${data.budget} budget
        </p>
      </div>

      {data.shareModalities.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{
            fontSize: "0.6rem",
            fontFamily: "var(--app-font-mono)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)",
            marginBottom: "0.75rem",
          }}>
            Top modalities
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {data.shareModalities.map((m, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                background: "rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "0.625rem 0.875rem",
              }}>
                <span style={{ fontSize: "1.25rem" }}>{m.emoji}</span>
                <span style={{
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  fontFamily: "var(--app-font-sans)",
                }}>
                  {m.name}
                </span>
                <span style={{
                  marginLeft: "auto",
                  fontSize: "0.65rem",
                  fontFamily: "var(--app-font-mono)",
                  color: "rgba(255,255,255,0.55)",
                  fontWeight: 500,
                }}>
                  #{i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.15)",
        paddingTop: "1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.75rem",
      }}>
        <div>
          <p style={{
            fontSize: "0.68rem",
            color: "rgba(255,255,255,0.6)",
            fontFamily: "var(--app-font-sans)",
          }}>
            Generate your own
          </p>
          <p style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            fontFamily: "var(--app-font-sans)",
          }}>
            healthplanfactory.com
          </p>
        </div>
        <a
          href={signupUrl}
          style={{
            padding: "0.6rem 1.25rem",
            borderRadius: 10,
            background: "white",
            color: "var(--hpf-pink)",
            fontWeight: 700,
            fontSize: "0.8rem",
            textDecoration: "none",
            fontFamily: "var(--app-font-sans)",
          }}
        >
          Get My Plan →
        </a>
      </div>
    </div>
  );
}

export default function SharedPlan() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref");

  const [data, setData] = useState<SharedPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareToken) { setNotFound(true); setLoading(false); return; }
    fetch(`${BASE}/api/plans/shared/${shareToken}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error("Failed to load shared plan");
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [shareToken]);

  const signupUrl = ref
    ? `${BASE}/sign-up?ref=${encodeURIComponent(ref)}`
    : `${BASE}/onboarding`;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--warm-white)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>Loading...</p>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--warm-white)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <span style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>🔍</span>
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.75rem", fontWeight: 700, color: "var(--hpf-deep)", marginBottom: "0.75rem" }}>
            Plan not found
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", marginBottom: "1.5rem" }}>
            This shared plan link may have expired or the plan was removed.
          </p>
          <Link
            to="/onboarding"
            style={{
              padding: "0.875rem 1.75rem",
              borderRadius: 10,
              background: "var(--hpf-pink)",
              color: "white",
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
              fontFamily: "var(--app-font-sans)",
            }}
          >
            Create Your Own Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--warm-white)" }}>
      <header style={{
        background: "white",
        borderBottom: "1px solid rgba(212,34,126,0.07)",
        padding: "1.25rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Logo />
        <Link
          to={signupUrl}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 8,
            background: "var(--hpf-pink)",
            color: "white",
            fontWeight: 600,
            fontSize: "0.8rem",
            textDecoration: "none",
            fontFamily: "var(--app-font-sans)",
          }}
        >
          Get My Plan
        </Link>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <p style={{
            fontSize: "0.7rem",
            fontFamily: "var(--app-font-mono)",
            color: "var(--hpf-crimson)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "0.5rem",
          }}>
            Shared with you
          </p>
          <h2 style={{
            fontFamily: "var(--app-font-serif)",
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: 700,
            color: "var(--hpf-pink)",
            lineHeight: 1.2,
            marginBottom: "0.75rem",
          }}>
            Someone shared their wellness plan
          </h2>
          <p style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            fontFamily: "var(--app-font-sans)",
            lineHeight: 1.65,
            maxWidth: 440,
            margin: "0 auto",
          }}>
            Health Plan Factory generates personalized, evidence-based wellness roadmaps in minutes — matching your goals, budget, and health needs.
          </p>
        </div>

        <ShareCard data={data} signupUrl={signupUrl} />

        <div style={{
          marginTop: "2.5rem",
          textAlign: "center",
          padding: "2rem",
          borderRadius: 20,
          background: "white",
          border: "1px solid rgba(212,34,126,0.08)",
        }}>
          <p style={{
            fontSize: "0.7rem",
            fontFamily: "var(--app-font-mono)",
            color: "var(--hpf-crimson)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "0.75rem",
          }}>
            Ready to get yours?
          </p>
          <h3 style={{
            fontFamily: "var(--app-font-serif)",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--hpf-pink)",
            lineHeight: 1.2,
            marginBottom: "0.75rem",
          }}>
            Build your personalized<br />wellness roadmap
          </h3>
          <p style={{
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            fontFamily: "var(--app-font-sans)",
            lineHeight: 1.65,
            marginBottom: "1.25rem",
          }}>
            Takes 3 minutes · Evidence-based modalities · HSA/FSA guidance included
          </p>
          {ref && (
            <p style={{
              fontSize: "0.75rem",
              color: "var(--hpf-crimson)",
              fontFamily: "var(--app-font-sans)",
              fontWeight: 600,
              marginBottom: "1rem",
            }}>
              🎁 Referral discount applied at sign-up
            </p>
          )}
          <Link
            to={signupUrl}
            style={{
              display: "inline-block",
              padding: "0.875rem 2rem",
              borderRadius: 10,
              background: "var(--hpf-pink)",
              color: "white",
              fontWeight: 700,
              fontSize: "0.9rem",
              textDecoration: "none",
              fontFamily: "var(--app-font-sans)",
            }}
          >
            Start for Free →
          </Link>
        </div>
      </main>
    </div>
  );
}
