import { Link } from "react-router-dom";
import { CheckCircle, Star, Users, TrendingUp, Shield, Clock } from "lucide-react";

const LISTING_PRICE = "$29/month";

const benefits = [
  {
    icon: <Users size={20} />,
    title: "High-intent members",
    desc: "Members find you after building a plan that already includes your modality — the highest intent possible.",
  },
  {
    icon: <TrendingUp size={20} />,
    title: "Grow your practice",
    desc: "Get discovered by wellness-focused members actively looking for providers like you. No cold outreach needed.",
  },
  {
    icon: <Star size={20} />,
    title: "Founding Provider Program",
    desc: "Early providers get 0% commission on all platform bookings for the first 90 days. Limited spots available.",
  },
  {
    icon: <Shield size={20} />,
    title: "Verified listing",
    desc: "Your credentials are reviewed by our team, building trust with members before they even reach out.",
  },
  {
    icon: <Clock size={20} />,
    title: "Easy to manage",
    desc: "Update your availability, pricing, and specialties any time from your provider dashboard.",
  },
  {
    icon: <CheckCircle size={20} />,
    title: "HSA/FSA visibility",
    desc: "Members can filter for providers who accept HSA and FSA payments — get found by those who need you most.",
  },
];

const steps = [
  { num: "01", title: "Create your profile", desc: "Tell us about your practice, modalities, location, and credentials." },
  { num: "02", title: "Pay the listing fee", desc: `A simple ${LISTING_PRICE} subscription keeps your profile active and your leads flowing.` },
  { num: "03", title: "Pending review", desc: "Our team reviews your credentials and activates your listing within 1–2 business days." },
  { num: "04", title: "Start receiving leads", desc: "Members with matching wellness plans can view your profile and reach out directly." },
];

const faqs = [
  {
    q: "How much does it cost to list my practice?",
    a: `The listing fee is ${LISTING_PRICE}. This covers your active profile, lead visibility, and dashboard access. There is no commission on bookings for the first 90 days as part of our Founding Provider Program.`,
  },
  {
    q: "How long does approval take?",
    a: "Our team reviews submitted profiles within 1–2 business days. You'll receive an email confirmation when your listing goes live.",
  },
  {
    q: "What happens if my application is rejected?",
    a: "If we can't approve your application, we'll let you know why. Common reasons include incomplete credentials or a mismatch with our current modality catalog. You're always welcome to reapply.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel your listing subscription at any time from your provider dashboard. Your profile will remain active until the end of the billing period.",
  },
  {
    q: "What modalities are supported?",
    a: "We support a wide range of evidence-based wellness modalities including massage therapy, acupuncture, chiropractic care, yoga, nutrition counseling, functional medicine, and more. Browse our Modalities catalog to see the full list.",
  },
];

export default function ListYourPractice() {
  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      {/* Hero */}
      <div
        className="px-6 md:px-12 py-12 md:py-20"
        style={{ background: "linear-gradient(135deg, #d4227e 0%, #e02040 100%)" }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: "rgba(255,255,255,0.15)", color: "white", fontFamily: "var(--app-font-sans)" }}>
            ✦ Founding Provider Program — 0% commission for 90 days
          </div>
          <h1
            className="mb-6"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(2.2rem,5vw,4rem)",
              fontWeight: 700,
              color: "white",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            List your practice.<br />Reach members who want what you offer.
          </h1>
          <p
            className="text-lg mb-10 mx-auto"
            style={{ color: "rgba(255,255,255,0.85)", fontFamily: "var(--app-font-sans)", maxWidth: "580px", lineHeight: 1.6 }}
          >
            Health Plan Factory connects wellness providers with high-intent members who have already decided they need your specialty. Start at <strong style={{ color: "white" }}>{LISTING_PRICE}</strong> — cancel anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/provider/signup"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold no-underline transition-all"
              style={{ background: "white", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
            >
              Get Started — {LISTING_PRICE} →
            </Link>
            <Link
              to="/modalities"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-medium no-underline transition-all"
              style={{ background: "rgba(255,255,255,0.12)", color: "white", fontFamily: "var(--app-font-sans)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              Browse modalities
            </Link>
          </div>
        </div>
      </div>

      {/* Social proof bar */}
      <div style={{ background: "white", borderBottom: "1px solid rgba(212,34,126,0.06)" }}>
        <div className="px-6 md:px-12 py-5 max-w-4xl mx-auto flex flex-wrap gap-6 justify-center md:justify-between items-center">
          {[
            { val: "500+", label: "Active providers" },
            { val: "10k+", label: "Members with plans" },
            { val: "4.9★", label: "Provider satisfaction" },
            { val: "1–2 days", label: "Approval time" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-bold" style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}>{s.val}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="px-6 md:px-12 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="section-tag">How it works</p>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-deep)" }}>
              From application to first lead in 2 days
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-4"
                  style={{ background: "var(--hpf-pink)", color: "white", fontFamily: "var(--app-font-sans)" }}
                >
                  {step.num}
                </div>
                <h3 className="font-semibold text-sm mb-2" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                  {step.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="px-6 md:px-12 py-16" style={{ background: "white" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-tag">Why providers choose us</p>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-deep)" }}>
              Everything you need to grow your practice
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="p-6 rounded-2xl"
                style={{ background: "var(--warm-white)", border: "1px solid rgba(212,34,126,0.08)" }}
              >
                <div className="mb-3" style={{ color: "var(--hpf-pink)" }}>{b.icon}</div>
                <h3 className="font-semibold text-sm mb-2" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                  {b.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="px-6 md:px-12 py-20">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-10">
            <p className="section-tag">Pricing</p>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-deep)" }}>
              Simple, transparent pricing
            </h2>
          </div>
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "white", border: "2px solid rgba(212,34,126,0.15)", boxShadow: "0 8px 40px rgba(212,34,126,0.08)" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
              style={{ background: "rgba(212,34,126,0.08)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
              Founding Provider Offer
            </div>
            <p style={{ fontFamily: "var(--app-font-serif)", fontSize: "3rem", fontWeight: 700, color: "var(--hpf-pink)", lineHeight: 1 }}>
              $29
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>/ month · cancel anytime</p>
            <ul className="text-sm text-left flex flex-col gap-3 mb-8">
              {[
                "Active provider listing",
                "Unlimited lead views",
                "Provider dashboard access",
                "Credential verification badge",
                "0% commission for first 90 days",
                "HSA/FSA provider badge",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  <CheckCircle size={14} style={{ color: "var(--sage)", flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/provider/signup"
              className="block w-full py-4 rounded-xl text-sm font-semibold text-white no-underline text-center"
              style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              List My Practice →
            </Link>
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              Payment collected after your profile is submitted. Listing goes live after admin approval.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="px-6 md:px-12 py-16" style={{ background: "white" }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-tag">FAQ</p>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-deep)" }}>
              Common questions
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl p-5"
                style={{ background: "var(--warm-white)", border: "1px solid rgba(212,34,126,0.06)" }}
              >
                <p className="text-sm font-semibold mb-2" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                  {faq.q}
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", lineHeight: 1.6 }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div
        className="px-6 md:px-12 py-20 text-center"
        style={{ background: "linear-gradient(135deg, #d4227e 0%, #e02040 100%)" }}
      >
        <div className="max-w-2xl mx-auto">
          <h2
            className="mb-4"
            style={{ fontFamily: "var(--app-font-serif)", fontSize: "2.2rem", fontWeight: 700, color: "white" }}
          >
            Ready to grow your practice?
          </h2>
          <p className="mb-8 text-base" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "var(--app-font-sans)" }}>
            Join hundreds of wellness providers already connecting with motivated members. Start today for just {LISTING_PRICE}.
          </p>
          <Link
            to="/provider/signup"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl text-base font-semibold no-underline"
            style={{ background: "white", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
          >
            Apply as a Provider →
          </Link>
        </div>
      </div>
    </div>
  );
}
