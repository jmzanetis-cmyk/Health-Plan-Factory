import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { FileText, DollarSign, Stethoscope, CheckCircle, ArrowRight, Info } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const navy = "#1b2d4f";
const amber = "#b8892a";
const sage = "#3d6b52";

interface EligibleModality {
  id: string;
  name: string;
  emoji: string;
  category: string;
  costLow: number;
  costHigh: number;
  description: string;
}

const sectionStyle = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "0 24px",
};

export default function LmnGuide() {
  const [eligibleModalities, setEligibleModalities] = useState<EligibleModality[]>([]);

  useEffect(() => {
    document.title = "HSA/FSA & Letter of Medical Necessity (LMN) Guide | Health Plan Factory";
    const meta = document.querySelector("meta[name='description']");
    if (meta) {
      meta.setAttribute(
        "content",
        "Learn how a Letter of Medical Necessity (LMN) from a Direct Primary Care physician can unlock HSA/FSA reimbursement for massage, physical therapy, yoga, and acupuncture — potentially saving hundreds per year.",
      );
    }

    fetch(`${BASE}/api/lmn/eligible-modalities`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.modalities)) setEligibleModalities(d.modalities);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ background: "var(--warm-white)", minHeight: "100vh" }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${navy} 0%, #243d66 100%)`, color: "white", padding: "72px 24px 64px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(184,137,42,0.18)", border: "1px solid rgba(184,137,42,0.35)", borderRadius: 20, padding: "6px 16px", marginBottom: 24 }}>
            <DollarSign size={14} color={amber} />
            <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 600, color: amber, letterSpacing: "0.06em", textTransform: "uppercase" }}>HSA/FSA Savings Guide</span>
          </div>
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 700, margin: "0 0 20px", lineHeight: 1.2 }}>
            Unlock HSA/FSA Reimbursement for Wellness with a Letter of Medical Necessity
          </h1>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 17, opacity: 0.85, margin: "0 0 32px", lineHeight: 1.6, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            Most people don't know that massage, physical therapy, yoga, acupuncture, and other wellness services may qualify for tax-free HSA/FSA reimbursement — when supported by an LMN from a physician.
          </p>
          <Link
            to="/onboarding"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: amber,
              color: "white",
              padding: "14px 28px",
              borderRadius: 10,
              fontFamily: "var(--app-font-sans)",
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Build My Wellness Plan
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* What is an LMN */}
      <section style={{ padding: "64px 24px 48px" }}>
        <div style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `rgba(27,45,79,0.08)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={20} color={navy} />
            </div>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 26, fontWeight: 700, color: navy, margin: 0 }}>What is a Letter of Medical Necessity?</h2>
          </div>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 16px" }}>
            A Letter of Medical Necessity (LMN) is a signed document from a licensed physician that certifies a specific wellness service is medically necessary for your condition or health goals. When your HSA or FSA administrator receives an LMN, eligible services that might otherwise be denied become reimbursable.
          </p>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
            The IRS allows HSA/FSA reimbursement for services that are primarily for treatment of a medical condition — an LMN from your physician is the documentation that makes this possible.
          </p>
          <div style={{ background: "rgba(184,137,42,0.07)", border: "1px solid rgba(184,137,42,0.2)", borderRadius: 10, padding: "14px 18px", marginTop: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Info size={16} color={amber} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: navy }}>Disclaimer:</strong> Health Plan Factory is a wellness referral platform, not a medical provider. We do not write, review, or guarantee LMNs. Always consult your physician and HSA/FSA administrator regarding eligibility. Tax rules vary; consult a tax professional for advice.
            </p>
          </div>
        </div>
      </section>

      {/* Which modalities may qualify */}
      <section style={{ padding: "48px 24px", background: "white" }}>
        <div style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `rgba(61,107,82,0.08)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={20} color={sage} />
            </div>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 26, fontWeight: 700, color: navy, margin: 0 }}>Wellness Modalities That May Qualify with an LMN</h2>
          </div>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, color: "var(--text-muted)", marginBottom: 28, lineHeight: 1.6 }}>
            These are modalities that physicians commonly support with LMNs for HSA/FSA reimbursement. Eligibility depends on your specific medical situation and HSA/FSA plan.
          </p>
          {eligibleModalities.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {eligibleModalities.map((m) => (
                <div key={m.id} style={{ border: "1px solid rgba(27,45,79,0.08)", borderRadius: 12, padding: "18px 20px", background: "var(--warm-white)" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{m.emoji}</div>
                  <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 4 }}>{m.name}</div>
                  <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                    ${m.costLow}–${m.costHigh}/mo estimated
                  </div>
                  <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {m.description.slice(0, 100)}{m.description.length > 100 ? "…" : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {[
                { emoji: "💆", name: "Massage Therapy", desc: "Often prescribed for chronic pain, muscle tension, and recovery." },
                { emoji: "🏃", name: "Physical Therapy", desc: "Widely supported for injury recovery, chronic pain, and mobility." },
                { emoji: "🧘", name: "Yoga Therapy", desc: "May qualify for anxiety, chronic pain, and mental health conditions." },
                { emoji: "🪡", name: "Acupuncture", desc: "Supported for chronic pain, migraines, and certain conditions." },
                { emoji: "🧠", name: "Mental Health Counseling", desc: "Broadly HSA/FSA eligible and often LMN-supported." },
                { emoji: "🍃", name: "Naturopathy", desc: "May qualify with documented medical necessity." },
              ].map((m) => (
                <div key={m.name} style={{ border: "1px solid rgba(27,45,79,0.08)", borderRadius: 12, padding: "18px 20px", background: "var(--warm-white)" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{m.emoji}</div>
                  <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 4 }}>{m.name}</div>
                  <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{m.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How DPC physicians work */}
      <section style={{ padding: "64px 24px" }}>
        <div style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `rgba(27,45,79,0.08)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Stethoscope size={20} color={navy} />
            </div>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 26, fontWeight: 700, color: navy, margin: 0 }}>How Direct Primary Care Physicians Help</h2>
          </div>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 24px" }}>
            Direct Primary Care (DPC) physicians operate outside traditional insurance networks, which means they typically have more time for comprehensive, personalized care. Because DPC doctors develop deep familiarity with your health history, they are well-positioned to document when wellness services are medically necessary for you specifically.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
            {[
              { title: "Unlimited visits", desc: "Flat monthly fee with no per-visit copays — more time with your doctor." },
              { title: "Personalized care", desc: "DPC physicians know your history well enough to support LMN documentation." },
              { title: "Written LMNs", desc: "DPC physicians can write LMNs for qualifying wellness services in your plan." },
              { title: "Telehealth included", desc: "Many DPC physicians offer telehealth — get your LMN without leaving home." },
            ].map((item) => (
              <div key={item.title} style={{ border: "1px solid rgba(27,45,79,0.08)", borderRadius: 12, padding: "18px 20px", background: "white" }}>
                <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, fontWeight: 700, color: navy, marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works step by step */}
      <section style={{ padding: "48px 24px 64px", background: "white" }}>
        <div style={sectionStyle}>
          <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 26, fontWeight: 700, color: navy, marginBottom: 32, textAlign: "center" }}>How to Get Your LMN in 4 Steps</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {[
              { step: "1", title: "Build your personalized wellness plan", desc: "Use Health Plan Factory to create a plan based on your goals, conditions, and budget. The plan identifies which of your modalities may be LMN-eligible." },
              { step: "2", title: "Connect with a DPC physician through HPF", desc: "Browse vetted DPC providers on Health Plan Factory. Your plan shows an LMN callout for physicians who can help unlock reimbursement for your specific items." },
              { step: "3", title: "Request your LMN", desc: "After connecting with a DPC physician, HPF auto-creates a pre-filled draft message you can send to your physician requesting an LMN for your plan's eligible services." },
              { step: "4", title: "Submit to your HSA/FSA administrator", desc: "Once your physician writes the LMN, submit it with your receipts to your HSA/FSA administrator. HPF tracks your sessions and flags eligible ones with an 'LMN on file' badge." },
            ].map((item) => (
              <div key={item.step} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: navy, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--app-font-sans)", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{item.step}</div>
                <div>
                  <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, fontWeight: 700, color: navy, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontFamily: "var(--app-font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "72px 24px", background: `linear-gradient(135deg, ${navy} 0%, #243d66 100%)`, textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 700, color: "white", margin: "0 0 16px" }}>
            See How Much Your Plan Could Save with an LMN
          </h2>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, color: "rgba(255,255,255,0.8)", margin: "0 0 32px", lineHeight: 1.6 }}>
            Build a free personalized wellness plan in 3 minutes. We'll show you exactly which modalities in your plan may be LMN-eligible and estimate your potential annual HSA/FSA savings.
          </p>
          <Link
            to="/onboarding"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: amber,
              color: "white",
              padding: "14px 28px",
              borderRadius: 10,
              fontFamily: "var(--app-font-sans)",
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Build My Plan — Free
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
