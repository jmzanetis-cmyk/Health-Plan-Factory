import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@workspace/replit-auth-web";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const TIERS = [
  {
    tier: "Explorer",
    price: "Free",
    per: "forever",
    desc: "Build your plan free. Get your personalized wellness roadmap with estimated costs.",
    features: [
      "Full AI plan generation",
      "Personalized modality recommendations",
      "Estimated monthly cost breakdown",
      "Modality evidence library access",
      "Provider directory browsing",
      "Save & share your plan",
    ],
    cta: "Get started free",
    ctaHref: "/sign-up",
    featured: false,
    isPlus: false,
  },
  {
    tier: "Plus",
    price: "$9.99",
    per: "per month",
    desc: "Connect with real providers. Turn your plan into action with matched local providers.",
    features: [
      "Everything in Explorer",
      "Real matched local providers for every modality",
      "Full contact info — phone, website, booking",
      "AI accountability coach",
      "Routine & journal builder",
      "HSA/FSA spending log",
      "Progress tracking & insights",
    ],
    cta: "Start Plus",
    ctaHref: "/sign-up?plan=plus",
    featured: true,
    isPlus: true,
  },
  {
    tier: "Provider",
    price: "$29",
    per: "per month",
    desc: "Get discovered by members whose plans match your specialty.",
    features: [
      "Listing in provider directory",
      "Lead alerts for your modalities",
      "Booking calendar integration",
      "0% commission for first 90 days · 2% after",
    ],
    cta: "Apply as a provider",
    ctaHref: "/provider/signup",
    featured: false,
    isPlus: false,
  },
];

interface CheckoutResult {
  checkout_url?: string;
  subscription_price_cents: number;
  credit_applied_cents: number;
  amount_charged_cents: number;
  amount_charged_formatted: string;
  message?: string;
}

export default function Pricing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [creditsCents, setCreditsCents] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutModal, setCheckoutModal] = useState<CheckoutResult | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`${BASE}/api/credits/mine`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: { unusedCreditsCents: number }) => {
        if (typeof data?.unusedCreditsCents === "number") setCreditsCents(data.unusedCreditsCents);
      })
      .catch(() => {});
  }, [user]);

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
      toast({
        title: "Checkout unavailable",
        description: "Unable to start checkout. Please try again or contact support.",
        variant: "destructive",
      });
      setCheckoutModal(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
      {/* ── Subscription Checkout Modal ── */}
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
            style={{ background: "white", borderRadius: 16, padding: "1.75rem", maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(212,34,126,0.22)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.15rem", fontWeight: 700, color: "var(--hpf-deep)", marginBottom: "1rem" }}>
              Upgrade to Plus
            </h3>

            <div style={{ background: "rgba(212,34,126,0.03)", borderRadius: 10, padding: "1rem", marginBottom: "1rem", border: "1px solid rgba(212,34,126,0.08)" }}>
              <div className="flex justify-between text-sm mb-1" style={{ fontFamily: "var(--app-font-sans)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Monthly subscription</span>
                <span style={{ color: "var(--hpf-pink)", fontWeight: 600 }}>
                  ${(checkoutModal.subscription_price_cents / 100).toFixed(2)}/mo
                </span>
              </div>
              {checkoutModal.credit_applied_cents > 0 && (
                <div className="flex justify-between text-sm mb-1" style={{ fontFamily: "var(--app-font-sans)" }}>
                  <span style={{ color: "var(--hpf-crimson)", fontWeight: 600 }}>🎁 Referral credit applied</span>
                  <span style={{ color: "var(--hpf-crimson)", fontWeight: 700 }}>
                    −${(checkoutModal.credit_applied_cents / 100).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 mt-1" style={{ borderTop: "1px solid rgba(212,34,126,0.08)", fontFamily: "var(--app-font-sans)" }}>
                <span style={{ color: "var(--hpf-pink)", fontWeight: 700 }}>Due today</span>
                <span style={{ color: checkoutModal.amount_charged_cents === 0 ? "var(--sage)" : "var(--hpf-pink)", fontWeight: 700 }}>
                  {checkoutModal.amount_charged_cents === 0 ? "Free" : checkoutModal.amount_charged_formatted}
                </span>
              </div>
            </div>

            <p className="text-xs mb-4" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6 }}>
              Cancel anytime. Referral credit is applied as a discount on your first month.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setCheckoutModal(null)}
                style={{ flex: 1, padding: "0.7rem", borderRadius: 10, background: "transparent", color: "var(--hpf-pink)", fontWeight: 600, fontSize: "0.85rem", border: "1.5px solid rgba(212,34,126,0.15)", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCheckout}
                style={{ flex: 2, padding: "0.7rem", borderRadius: 10, background: "var(--hpf-crimson)", color: "white", fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: "pointer", fontFamily: "var(--app-font-sans)" }}
              >
                Proceed to payment →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 md:px-12 py-10 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-tag justify-center">Pricing</div>
            <h1
              className="mb-4"
              style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2.5rem,5vw,4rem)", fontWeight: 700, color: "var(--hpf-deep)", letterSpacing: "-0.02em" }}
            >
              Build your plan free.{" "}
              <em style={{ color: "var(--hpf-crimson)" }}>Connect with providers with Plus.</em>
            </h1>
            <p className="text-sm font-light max-w-md mx-auto leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              Explorer members get a full personalized plan with cost estimates — free. Plus members get real, matched local providers for every modality in their plan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {TIERS.map((tier) => (
              <div
                key={tier.tier}
                className="rounded-2xl p-8 relative"
                style={tier.featured ? { background: "var(--hpf-deep)", boxShadow: "0 16px 48px rgba(44,40,37,0.30)" } : { background: "white", border: "1px solid rgba(44,40,37,0.08)" }}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-white whitespace-nowrap" style={{ background: "var(--hpf-crimson)" }}>
                    Most Popular
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: tier.featured ? "rgba(255,255,255,0.4)" : "var(--text-muted)" }}>{tier.tier}</p>
                <div className="leading-none mb-1" style={{ fontFamily: "var(--app-font-serif)", fontSize: "3rem", fontWeight: 700, color: tier.featured ? "white" : "var(--hpf-pink)" }}>{tier.price}</div>
                <p className="text-xs font-light mb-3" style={{ color: tier.featured ? "rgba(255,255,255,0.4)" : "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{tier.per}</p>
                <p className="text-xs font-light leading-relaxed mb-5 pb-5" style={{ color: tier.featured ? "rgba(255,255,255,0.5)" : "var(--text-secondary)", borderBottom: tier.featured ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(212,34,126,0.08)", fontFamily: "var(--app-font-sans)" }}>{tier.desc}</p>
                <ul className="flex flex-col mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 py-2 text-xs font-light border-b" style={{ color: tier.featured ? "rgba(255,255,255,0.65)" : "var(--text-secondary)", borderColor: tier.featured ? "rgba(255,255,255,0.1)" : "rgba(212,34,126,0.08)", fontFamily: "var(--app-font-sans)" }}>
                      <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: tier.featured ? "var(--crimson-light)" : "var(--sage)" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {tier.isPlus ? (
                  <div>
                    <button
                      onClick={handlePlusCheckout}
                      disabled={checkoutLoading}
                      className="block w-full text-center py-3.5 rounded-lg text-sm font-semibold text-white"
                      style={{ background: "var(--hpf-crimson)", fontFamily: "var(--app-font-sans)", border: "none", cursor: checkoutLoading ? "wait" : "pointer", opacity: checkoutLoading ? 0.7 : 1 }}
                    >
                      {checkoutLoading ? "Loading…" : tier.cta}
                    </button>
                    {user && creditsCents > 0 && (
                      <p className="text-center mt-2 text-xs font-semibold" style={{ color: "var(--hpf-crimson)" }}>
                        🎁 ${(creditsCents / 100).toFixed(2)} referral credit will be applied to your first month
                      </p>
                    )}
                  </div>
                ) : (
                  <Link to={tier.ctaHref} className="block w-full text-center py-3.5 rounded-lg text-sm font-semibold text-white no-underline" style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                    {tier.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Comparison callout */}
          <div className="rounded-xl p-6" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
            <h3 className="font-semibold mb-4 text-sm text-center" style={{ color: "var(--hpf-deep)", fontFamily: "var(--app-font-sans)" }}>
              Explorer vs. Plus — what's different?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div style={{ padding: "1rem", borderRadius: 10, background: "rgba(212,34,126,0.03)", border: "1px solid rgba(212,34,126,0.08)" }}>
                <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Explorer (Free)</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6 }}>
                  Full AI plan generation with personalized modality recommendations and estimated monthly costs. The plan is real and valuable — you see exactly which modalities fit your goals and budget. Provider cards are shown but contact details are not revealed.
                </p>
              </div>
              <div style={{ padding: "1rem", borderRadius: 10, background: "rgba(212,34,126,0.04)", border: "1.5px solid rgba(212,34,126,0.18)" }}>
                <p className="text-xs font-bold mb-2" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Plus ($9.99/mo)</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6 }}>
                  Your plan is fully assembled with real, matched local providers for every modality. See phone numbers, websites, and book sessions directly — no per-provider fees, ever. Referral credits apply as a discount on your first month.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
