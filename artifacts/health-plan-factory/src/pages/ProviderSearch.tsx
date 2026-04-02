import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import { NPI_CATEGORIES, type NpiCategory } from "@/data/npiCategories";
import { fetchNPIByZipAndTaxonomy, type NPIProvider } from "@/lib/npiClient";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

function getStoredZip(): string {
  try {
    const raw = sessionStorage.getItem("hpf_intake");
    if (!raw) return "";
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return (parsed?.zipCode as string) || "";
  } catch {
    return "";
  }
}

function CostBar({ category }: { category: NpiCategory }) {
  return (
    <div style={{
      marginTop: "0.75rem",
      padding: "0.875rem 1rem",
      background: "rgba(212,34,126,0.04)",
      borderRadius: 10,
      border: "1px solid rgba(212,34,126,0.1)",
    }}>
      <p style={{
        fontSize: "0.65rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "var(--text-muted)",
        fontFamily: "var(--app-font-sans)",
        marginBottom: "0.5rem",
      }}>
        Typical Cost Ranges
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
        <CostRow label="Initial visit" range={category.costs.initial} />
        <CostRow label="Follow-up" range={category.costs.followup} />
        {category.costs.monthly && (
          <CostRow label="Monthly plan" range={category.costs.monthly} />
        )}
      </div>
      <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {category.hsaEligible && (
          <span style={{
            fontSize: "0.65rem",
            fontWeight: 600,
            padding: "0.15rem 0.5rem",
            borderRadius: 100,
            background: "rgba(125,181,92,0.12)",
            color: "var(--sage)",
            fontFamily: "var(--app-font-sans)",
          }}>
            💳 HSA/FSA Eligible
          </span>
        )}
      </div>
      <p style={{
        fontSize: "0.65rem",
        color: "var(--text-muted)",
        fontFamily: "var(--app-font-sans)",
        marginTop: "0.45rem",
        lineHeight: 1.5,
      }}>
        {category.costNote}
      </p>
    </div>
  );
}

function CostRow({ label, range }: { label: string; range: [number, number] }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
        {label}
      </span>
      <span style={{
        fontSize: "0.72rem",
        fontWeight: 600,
        color: "var(--hpf-pink)",
        fontFamily: "var(--app-font-mono)",
      }}>
        ${range[0]}–${range[1]}
      </span>
    </div>
  );
}

function ProviderCard({
  provider,
  modalityId,
  onSave,
  onInsight,
  insightText,
  insightLoading,
}: {
  provider: NPIProvider;
  modalityId: string;
  onSave: (p: NPIProvider) => void;
  onInsight: (p: NPIProvider) => void;
  insightText?: string;
  insightLoading?: boolean;
}) {
  const initials = provider.name
    .replace(/,.*$/, "")
    .trim()
    .split(/\s+/)
    .filter((w) => /[A-Z]/i.test(w[0]))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div style={{
      background: "white",
      borderRadius: 14,
      border: "1px solid rgba(212,34,126,0.08)",
      overflow: "hidden",
      transition: "box-shadow 0.2s",
    }}>
      <div style={{ padding: "1.1rem 1.1rem 0.75rem" }}>
        <div style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--hpf-pink) 0%, var(--hpf-crimson) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "white",
            fontWeight: 700,
            fontSize: "0.95rem",
            fontFamily: "var(--app-font-sans)",
          }}>
            {initials || "?"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--hpf-deep)",
              lineHeight: 1.25,
              marginBottom: "0.2rem",
            }}>
              {provider.name}
            </p>
            {provider.specialty && (
              <p style={{
                fontSize: "0.72rem",
                color: "var(--text-secondary)",
                fontFamily: "var(--app-font-sans)",
                marginBottom: "0.4rem",
              }}>
                {provider.specialty}
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              <span style={{
                fontSize: "0.63rem",
                fontWeight: 600,
                padding: "0.15rem 0.5rem",
                borderRadius: 100,
                background: "rgba(59,130,246,0.1)",
                color: "#1d4ed8",
                fontFamily: "var(--app-font-sans)",
              }}>
                ✓ NPI Verified
              </span>
              {provider.hsaEligible && (
                <span style={{
                  fontSize: "0.63rem",
                  fontWeight: 600,
                  padding: "0.15rem 0.5rem",
                  borderRadius: 100,
                  background: "rgba(125,181,92,0.12)",
                  color: "var(--sage)",
                  fontFamily: "var(--app-font-sans)",
                }}>
                  💳 HSA/FSA Eligible
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {provider.address && (
            <p style={{
              fontSize: "0.72rem",
              color: "var(--text-secondary)",
              fontFamily: "var(--app-font-sans)",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.35rem",
            }}>
              <span>📍</span>
              <span>{[provider.address, provider.city, provider.state, provider.zip].filter(Boolean).join(", ")}</span>
            </p>
          )}
          {provider.phone && (
            <p style={{
              fontSize: "0.72rem",
              fontFamily: "var(--app-font-sans)",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}>
              <span>📞</span>
              <a
                href={`tel:${provider.phone.replace(/\D/g, "")}`}
                style={{ color: "var(--hpf-pink)", textDecoration: "none", fontWeight: 600 }}
              >
                {provider.phone}
              </a>
            </p>
          )}
          <p style={{
            fontSize: "0.62rem",
            color: "var(--text-muted)",
            fontFamily: "var(--app-font-mono)",
          }}>
            NPI #{provider.npi}
          </p>
        </div>
      </div>

      {insightText && (
        <div style={{
          margin: "0 1.1rem 0.75rem",
          padding: "0.75rem",
          background: "rgba(212,34,126,0.04)",
          border: "1px solid rgba(212,34,126,0.1)",
          borderRadius: 10,
        }}>
          <p style={{ fontSize: "0.73rem", color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6 }}>
            💡 {insightText}
          </p>
        </div>
      )}

      <div style={{
        padding: "0.75rem 1.1rem",
        borderTop: "1px solid rgba(212,34,126,0.05)",
        display: "flex",
        gap: "0.6rem",
        flexWrap: "wrap",
      }}>
        <button
          type="button"
          onClick={() => onSave(provider)}
          style={{
            padding: "0.45rem 0.875rem",
            borderRadius: 8,
            background: "var(--hpf-pink)",
            color: "white",
            fontSize: "0.75rem",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--app-font-sans)",
          }}
        >
          🔖 Save Provider
        </button>
        <button
          type="button"
          disabled={!!insightLoading}
          onClick={() => onInsight(provider)}
          style={{
            padding: "0.45rem 0.875rem",
            borderRadius: 8,
            background: insightText ? "rgba(212,34,126,0.08)" : "rgba(212,34,126,0.06)",
            color: "var(--hpf-crimson)",
            fontSize: "0.75rem",
            fontWeight: 600,
            border: "1px solid rgba(212,34,126,0.15)",
            cursor: insightLoading ? "wait" : "pointer",
            fontFamily: "var(--app-font-sans)",
          }}
        >
          {insightLoading ? "Loading…" : insightText ? "✓ AI Insight" : "💡 AI Insight"}
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: "white",
      borderRadius: 14,
      border: "1px solid rgba(212,34,126,0.06)",
      padding: "1.1rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.6rem",
    }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: i === 1 ? 20 : 14,
            borderRadius: 6,
            background: "rgba(212,34,126,0.06)",
            width: i === 1 ? "65%" : i === 2 ? "45%" : "80%",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

export default function ProviderSearch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const initZip = searchParams.get("zip") || getStoredZip();
  const initModality = searchParams.get("modality") || "";

  const [zip, setZip] = useState(initZip);
  const [selectedModality, setSelectedModality] = useState(initModality);
  const [providers, setProviders] = useState<NPIProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [searched, setSearched] = useState(false);
  const [insights, setInsights] = useState<Record<string, string>>({});
  const [insightLoading, setInsightLoading] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState("");

  const category = selectedModality ? NPI_CATEGORIES[selectedModality] : null;
  const npiEntries = Object.entries(NPI_CATEGORIES);

  const runSearch = useCallback(async (modalityKey: string, zipVal: string) => {
    const cat = NPI_CATEGORIES[modalityKey];
    if (!cat || !zipVal) return;

    setLoading(true);
    setErrorMsg("");
    setProviders([]);
    setSearched(true);

    try {
      const results = await fetchNPIByZipAndTaxonomy(zipVal, cat.taxonomy, cat.hsaEligible, cat.taxonomyDesc);
      setProviders(results);
      if (results.length === 0) {
        setErrorMsg(
          `No ${cat.label} found in the NPI Registry near ZIP ${zipVal.slice(0, 5)}. Try a nearby ZIP code.`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setErrorMsg(msg || "Could not reach the provider registry. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initModality && initZip) {
      runSearch(initModality, initZip);
    }
  }, []);

  function handleSearch() {
    if (!selectedModality) {
      setErrorMsg("Please select a provider category.");
      return;
    }
    if (!zip || zip.replace(/\D/g, "").length < 5) {
      setErrorMsg("Please enter a valid 5-digit ZIP code.");
      return;
    }
    runSearch(selectedModality, zip);
  }

  async function handleInsight(provider: NPIProvider) {
    const key = provider.npi;
    if (insights[key] || insightLoading === key) return;
    setInsightLoading(key);
    try {
      const res = await fetch(`${BASE}/api/providers/insight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          providerName: provider.name,
          specialty: provider.specialty,
          city: provider.city,
          state: provider.state,
          modalityId: selectedModality,
          hsaEligible: provider.hsaEligible,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { insight?: string };
        if (data.insight) {
          setInsights((prev) => ({ ...prev, [key]: data.insight! }));
        }
      }
    } catch {
      // silently fail — no error shown for insight
    } finally {
      setInsightLoading(null);
    }
  }

  async function handleSave(provider: NPIProvider) {
    if (!isAuthenticated) {
      navigate("/sign-up");
      return;
    }
    setSaveToast(`${provider.name.split(",")[0]} saved to bookmarks!`);
    setTimeout(() => setSaveToast(""), 3000);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--warm-white)" }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {saveToast && (
        <div style={{
          position: "fixed",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--hpf-deep)",
          color: "white",
          padding: "0.75rem 1.25rem",
          borderRadius: 10,
          fontSize: "0.8rem",
          fontWeight: 600,
          fontFamily: "var(--app-font-sans)",
          zIndex: 1000,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}>
          🔖 {saveToast}
        </div>
      )}

      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "2rem 1.25rem 4rem",
      }}>
        <div style={{ marginBottom: "1.75rem" }}>
          <Link
            to="/providers"
            style={{
              fontSize: "0.78rem",
              color: "var(--text-muted)",
              fontFamily: "var(--app-font-sans)",
              textDecoration: "none",
            }}
          >
            ← Provider Directory
          </Link>
          <h1 style={{
            fontFamily: "var(--app-font-serif)",
            fontSize: "clamp(1.6rem, 3vw, 2.25rem)",
            fontWeight: 800,
            color: "var(--hpf-deep)",
            marginTop: "0.5rem",
            marginBottom: "0.35rem",
          }}>
            Find Licensed Providers Near You
          </h1>
          <p style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            fontFamily: "var(--app-font-sans)",
            lineHeight: 1.6,
          }}>
            Real practitioners verified by the federal NPI Registry — covering 8 wellness modalities.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: "1.75rem",
          alignItems: "start",
        }}
          className="npi-grid"
        >
          <style>{`
            @media (max-width: 700px) {
              .npi-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>

          {/* ── Sidebar ── */}
          <aside style={{
            background: "white",
            borderRadius: 16,
            border: "1px solid rgba(212,34,126,0.08)",
            padding: "1.25rem",
            position: "sticky",
            top: "1rem",
          }}>
            <label style={{
              display: "block",
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--text-muted)",
              fontFamily: "var(--app-font-sans)",
              marginBottom: "0.4rem",
            }}>
              Your ZIP Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 10001"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                borderRadius: 8,
                border: "1.5px solid rgba(212,34,126,0.2)",
                fontSize: "0.9rem",
                fontFamily: "var(--app-font-mono)",
                color: "var(--hpf-deep)",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: "0.35rem",
              }}
            />
            <p style={{
              fontSize: "0.65rem",
              color: "var(--text-muted)",
              fontFamily: "var(--app-font-sans)",
              marginBottom: "1.25rem",
            }}>
              Searches within the exact ZIP (NPI Registry is ZIP-exact)
            </p>

            <label style={{
              display: "block",
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "var(--text-muted)",
              fontFamily: "var(--app-font-sans)",
              marginBottom: "0.6rem",
            }}>
              Provider Category
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1rem" }}>
              {npiEntries.map(([id, cat]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSelectedModality(id);
                    setSearched(false);
                    setProviders([]);
                    setErrorMsg("");
                  }}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: 8,
                    border: selectedModality === id
                      ? "1.5px solid var(--hpf-pink)"
                      : "1px solid rgba(212,34,126,0.12)",
                    background: selectedModality === id
                      ? "rgba(212,34,126,0.06)"
                      : "transparent",
                    color: selectedModality === id ? "var(--hpf-pink)" : "var(--text-secondary)",
                    fontSize: "0.78rem",
                    fontWeight: selectedModality === id ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: "var(--app-font-sans)",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {category && <CostBar category={category} />}

            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "1rem",
                padding: "0.7rem",
                borderRadius: 10,
                background: "var(--hpf-pink)",
                color: "white",
                fontSize: "0.875rem",
                fontWeight: 700,
                border: "none",
                cursor: loading ? "wait" : "pointer",
                fontFamily: "var(--app-font-sans)",
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? "Searching…" : "Search Providers"}
            </button>
          </aside>

          {/* ── Results ── */}
          <main>
            {!searched && !loading && (
              <div style={{
                background: "white",
                borderRadius: 16,
                border: "1px solid rgba(212,34,126,0.08)",
                padding: "3rem 2rem",
                textAlign: "center",
              }}>
                <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.75rem" }}>🔍</span>
                <p style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "var(--hpf-deep)",
                  fontFamily: "var(--app-font-serif)",
                  marginBottom: "0.4rem",
                }}>
                  Select a category and enter your ZIP
                </p>
                <p style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  fontFamily: "var(--app-font-sans)",
                }}>
                  Results come directly from the federal NPI Registry — real licensed practitioners, no ads.
                </p>
              </div>
            )}

            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {errorMsg && !loading && (
              <div style={{
                background: "white",
                borderRadius: 16,
                border: "1px solid rgba(212,34,126,0.1)",
                padding: "2rem",
                textAlign: "center",
              }}>
                <p style={{
                  fontSize: "0.875rem",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--app-font-sans)",
                  lineHeight: 1.65,
                }}>
                  {errorMsg}
                </p>
              </div>
            )}

            {!loading && !errorMsg && providers.length > 0 && (
              <>
                <p style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  fontFamily: "var(--app-font-sans)",
                  marginBottom: "0.875rem",
                }}>
                  Showing <strong style={{ color: "var(--hpf-deep)" }}>{providers.length}</strong> licensed {category?.label.toLowerCase()} in ZIP {zip.slice(0, 5)}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                  {providers.map((p) => (
                    <ProviderCard
                      key={p.npi}
                      provider={p}
                      modalityId={selectedModality}
                      onSave={handleSave}
                      onInsight={handleInsight}
                      insightText={insights[p.npi]}
                      insightLoading={insightLoading === p.npi}
                    />
                  ))}
                </div>
                <p style={{
                  marginTop: "1.25rem",
                  fontSize: "0.65rem",
                  color: "var(--text-muted)",
                  fontFamily: "var(--app-font-sans)",
                  textAlign: "center",
                  lineHeight: 1.6,
                }}>
                  Data sourced from the CMS NPI Registry — public record under 45 CFR § 162.410. Phone numbers are published public data.
                </p>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
