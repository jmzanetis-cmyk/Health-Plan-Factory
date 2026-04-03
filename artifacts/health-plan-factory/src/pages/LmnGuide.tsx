import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, DollarSign, Stethoscope, CheckCircle, ArrowRight, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const navy = "#2C2825";
const amber = "#E02040";
const sage = "#7DB55C";

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
  const { t } = useTranslation();
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

  const dpcItems = [
    { title: t("lmnGuide.dpc0Title"), desc: t("lmnGuide.dpc0Desc") },
    { title: t("lmnGuide.dpc1Title"), desc: t("lmnGuide.dpc1Desc") },
    { title: t("lmnGuide.dpc2Title"), desc: t("lmnGuide.dpc2Desc") },
    { title: t("lmnGuide.dpc3Title"), desc: t("lmnGuide.dpc3Desc") },
  ];

  const lmnSteps = [
    { step: "1", title: t("lmnGuide.step0Title"), desc: t("lmnGuide.step0Desc") },
    { step: "2", title: t("lmnGuide.step1Title"), desc: t("lmnGuide.step1Desc") },
    { step: "3", title: t("lmnGuide.step2Title"), desc: t("lmnGuide.step2Desc") },
    { step: "4", title: t("lmnGuide.step3Title"), desc: t("lmnGuide.step3Desc") },
  ];

  const defaultModalities = [
    { emoji: "💆", name: t("lmnGuide.defaultMod0Name"), desc: t("lmnGuide.defaultMod0Desc") },
    { emoji: "🏃", name: t("lmnGuide.defaultMod1Name"), desc: t("lmnGuide.defaultMod1Desc") },
    { emoji: "🧘", name: t("lmnGuide.defaultMod2Name"), desc: t("lmnGuide.defaultMod2Desc") },
    { emoji: "🪡", name: t("lmnGuide.defaultMod3Name"), desc: t("lmnGuide.defaultMod3Desc") },
    { emoji: "🧠", name: t("lmnGuide.defaultMod4Name"), desc: t("lmnGuide.defaultMod4Desc") },
    { emoji: "🍃", name: t("lmnGuide.defaultMod5Name"), desc: t("lmnGuide.defaultMod5Desc") },
  ];

  return (
    <div style={{ background: "var(--warm-white)", minHeight: "100vh" }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${navy} 0%, #1a1816 100%)`, color: "white", padding: "72px 24px 64px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(224,32,64,0.18)", border: "1px solid rgba(224,32,64,0.35)", borderRadius: 20, padding: "6px 16px", marginBottom: 24 }}>
            <DollarSign size={14} color={amber} />
            <span style={{ fontFamily: "var(--app-font-sans)", fontSize: 12, fontWeight: 600, color: amber, letterSpacing: "0.06em", textTransform: "uppercase" }}>{t("lmnGuide.badge")}</span>
          </div>
          <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 700, margin: "0 0 20px", lineHeight: 1.2 }}>
            {t("lmnGuide.heroH1")}
          </h1>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 17, opacity: 0.85, margin: "0 0 32px", lineHeight: 1.6, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            {t("lmnGuide.heroP")}
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
            {t("lmnGuide.buildPlanBtn")}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* What is an LMN */}
      <section style={{ padding: "64px 24px 48px" }}>
        <div style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `rgba(212,34,126,0.08)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={20} color={navy} />
            </div>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 26, fontWeight: 700, color: navy, margin: 0 }}>{t("lmnGuide.whatIsH2")}</h2>
          </div>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 16px" }}>
            {t("lmnGuide.whatIsP1")}
          </p>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
            {t("lmnGuide.whatIsP2")}
          </p>
          <div style={{ background: "rgba(224,32,64,0.07)", border: "1px solid rgba(224,32,64,0.2)", borderRadius: 10, padding: "14px 18px", marginTop: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Info size={16} color={amber} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
              {t("lmnGuide.disclaimer")}
            </p>
          </div>
        </div>
      </section>

      {/* Which modalities may qualify */}
      <section style={{ padding: "48px 24px", background: "white" }}>
        <div style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `rgba(125,181,92,0.08)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={20} color={sage} />
            </div>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 26, fontWeight: 700, color: navy, margin: 0 }}>{t("lmnGuide.qualifyH2")}</h2>
          </div>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 15, color: "var(--text-muted)", marginBottom: 28, lineHeight: 1.6 }}>
            {t("lmnGuide.qualifyP")}
          </p>
          {eligibleModalities.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {eligibleModalities.map((m) => (
                <div key={m.id} style={{ border: "1px solid rgba(212,34,126,0.08)", borderRadius: 12, padding: "18px 20px", background: "var(--warm-white)" }}>
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
              {defaultModalities.map((m) => (
                <div key={m.name} style={{ border: "1px solid rgba(212,34,126,0.08)", borderRadius: 12, padding: "18px 20px", background: "var(--warm-white)" }}>
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
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: `rgba(212,34,126,0.08)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Stethoscope size={20} color={navy} />
            </div>
            <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 26, fontWeight: 700, color: navy, margin: 0 }}>{t("lmnGuide.dpcH2")}</h2>
          </div>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 24px" }}>
            {t("lmnGuide.dpcP")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
            {dpcItems.map((item) => (
              <div key={item.title} style={{ border: "1px solid rgba(212,34,126,0.08)", borderRadius: 12, padding: "18px 20px", background: "white" }}>
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
          <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: 26, fontWeight: 700, color: navy, marginBottom: 32, textAlign: "center" }}>{t("lmnGuide.stepsH2")}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {lmnSteps.map((item) => (
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
      <section style={{ padding: "72px 24px", background: `linear-gradient(135deg, ${navy} 0%, #1a1816 100%)`, textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 700, color: "white", margin: "0 0 16px" }}>
            {t("lmnGuide.ctaH2")}
          </h2>
          <p style={{ fontFamily: "var(--app-font-sans)", fontSize: 16, color: "rgba(255,255,255,0.8)", margin: "0 0 32px", lineHeight: 1.6 }}>
            {t("lmnGuide.ctaP")}
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
            {t("lmnGuide.ctaBtn")}
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
