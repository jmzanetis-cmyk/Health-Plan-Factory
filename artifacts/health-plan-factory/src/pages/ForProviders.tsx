import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function ForProviders() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <div className="px-6 md:px-12 py-10 md:py-20" style={{ background: "var(--off-white)", borderBottom: "1px solid rgba(212,34,126,0.08)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="section-tag">{t("forProviders.tag")}</div>
            <h1 style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2.2rem,4vw,3.5rem)", fontWeight: 700, color: "var(--hpf-deep)", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
              {t("forProviders.hero.headline")}
            </h1>
            <p className="text-sm font-light leading-relaxed mb-6" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
              {t("forProviders.hero.sub")}
            </p>
            <div className="flex gap-3">
              <Link
                to="/list-your-practice"
                className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-semibold text-white no-underline"
                style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
              >
                {t("forProviders.hero.cta")}
              </Link>
              <Link
                to="/provider/signup"
                className="inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium no-underline"
                style={{ background: "transparent", border: "1.5px solid rgba(212,34,126,0.2)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
              >
                {t("forProviders.hero.cta2")}
              </Link>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(212,34,126,0.08)", background: "white" }}>
            <div className="p-6" style={{ background: "linear-gradient(135deg, var(--hpf-pink) 0%, var(--hpf-pink-mid) 100%)" }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ background: "rgba(255,255,255,0.15)" }}>
                  S
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Sarah K., LMT</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Licensed Massage Therapist · Denver, CO</p>
                  <p className="text-xs" style={{ color: "var(--crimson-light)" }}>★★★★★ 4.9</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { k: "Modality", v: "Massage Therapy" },
                  { k: "Session rate", v: "$75 / 60 min" },
                  { k: "HSA/FSA accepted", v: "Yes, with LMN" },
                  { k: "New patient leads", v: "12 this month" },
                ].map((row) => (
                  <div key={row.k} className="flex justify-between text-xs">
                    <span style={{ color: "var(--text-muted)" }}>{row.k}</span>
                    <span className="font-medium" style={{ color: "var(--hpf-pink)" }}>{row.v}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg text-xs" style={{ background: "var(--crimson-pale)", border: "1px solid rgba(224,32,64,0.12)", color: "var(--hpf-crimson)" }}>
                <span>🎉</span>
                <span><strong style={{ color: "var(--hpf-pink)" }}>Founding Provider</strong> — 0% commission for 90 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 style={{ fontFamily: "var(--app-font-serif)", fontSize: "2rem", fontWeight: 700, color: "var(--hpf-deep)", marginBottom: "2rem" }}>
            {t("forProviders.benefits.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: "🎯", key: "highIntent" },
              { icon: "📅", key: "booking" },
              { icon: "🏭", key: "founding" },
            ].map((b) => (
              <div key={b.key} className="rounded-xl p-5" style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}>
                <div className="text-2xl mb-3">{b.icon}</div>
                <h3 className="font-semibold text-sm mb-2" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
                  {t(`forProviders.benefits.${b.key}.title`)}
                </h3>
                <p className="text-xs font-light leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
                  {t(`forProviders.benefits.${b.key}.desc`)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/list-your-practice"
              className="inline-flex items-center px-8 py-3.5 rounded-lg text-sm font-semibold text-white no-underline"
              style={{ background: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              {t("forProviders.cta")}
            </Link>
            <p className="text-xs mt-3" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
              {t("forProviders.ctaSub")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
