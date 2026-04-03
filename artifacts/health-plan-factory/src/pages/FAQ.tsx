import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b cursor-pointer" style={{ borderColor: "rgba(212,34,126,0.1)" }} onClick={() => setOpen(!open)}>
      <div className="flex justify-between items-center py-5 gap-4">
        <h3 className="font-medium text-sm" style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>{q}</h3>
        {open ? <ChevronUp size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
      </div>
      {open && <p className="text-sm font-light leading-relaxed pb-5" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>{a}</p>}
    </div>
  );
}

export default function FAQ() {
  const { t } = useTranslation();

  const FAQS = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
    { q: t("faq.q6"), a: t("faq.a6") },
    { q: t("faq.q7"), a: t("faq.a7") },
    { q: t("faq.q8"), a: t("faq.a8") },
  ];

  return (
    <div className="min-h-screen px-6 md:px-12 py-20" style={{ background: "var(--off-white)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="section-tag">{t("faq.tag")}</div>
        <h1 className="mb-10" style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2.5rem,5vw,4rem)", fontWeight: 700, color: "var(--hpf-deep)", letterSpacing: "-0.02em" }}>
          {t("faq.headline")}
        </h1>
        {FAQS.map((faq) => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}

        <div className="mt-10 rounded-xl p-6 text-sm" style={{ background: "var(--crimson-pale)", border: "1px solid rgba(224,32,64,0.12)", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}>
          <strong style={{ color: "var(--hpf-crimson)" }}>Still have questions?</strong> Reach out at{" "}
          <a href="mailto:hello@healthplanfactory.com" className="no-underline" style={{ color: "var(--hpf-crimson)", textDecoration: "underline" }}>
            hello@healthplanfactory.com
          </a>
        </div>
      </div>
    </div>
  );
}
