const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-10">
    <h2 className="text-base font-semibold mb-3" style={{ color: "var(--hpf-pink)" }}>{title}</h2>
    <div className="text-sm font-light leading-relaxed" style={{ color: "var(--text-secondary)" }}>{children}</div>
  </div>
);

const P = ({ children }: { children: React.ReactNode }) => <p className="mb-3">{children}</p>;

export default function Support() {
  return (
    <div
      className="min-h-screen py-20 px-6"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--hpf-pink)" }}>
            Support
          </p>
          <h1
            className="text-4xl md:text-5xl font-light mb-6"
            style={{ fontFamily: "var(--font-serif)", color: "var(--text-primary)" }}
          >
            We're here to help.
          </h1>
          <p className="text-base font-light leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Health Plan Factory is a small team. We read every message and respond within one business day.
          </p>
        </div>

        <Section title="Email support">
          <P>
            For questions about your plan, account, billing, or anything else, email us at{" "}
            <a
              href="mailto:support@healthplanfactory.com"
              style={{ color: "var(--hpf-pink)", textDecoration: "underline" }}
            >
              support@healthplanfactory.com
            </a>
            . Include your account email so we can pull up your plan quickly.
          </P>
          <P>Response time: within 1 business day, usually faster.</P>
        </Section>

        <Section title="Common questions">
          <P>
            <strong style={{ color: "var(--text-primary)" }}>How do I cancel my Plus subscription?</strong>
            <br />
            On iPhone: Settings → Apple ID → Subscriptions → Health Plan Factory → Cancel. Your Plus access
            continues until the end of the current billing period.
          </P>
          <P>
            <strong style={{ color: "var(--text-primary)" }}>Can I change my wellness goals or budget?</strong>
            <br />
            Yes — go to your Plan tab, tap "Update my plan," and complete the intake again. Your history is
            preserved.
          </P>
          <P>
            <strong style={{ color: "var(--text-primary)" }}>Is my health data shared with providers?</strong>
            <br />
            No. Your Apple Health data stays on your device. We only use aggregated metrics (steps, sleep
            totals, energy) to update your wellness score — we never share identifiable health data with
            providers or third parties.
          </P>
          <P>
            <strong style={{ color: "var(--text-primary)" }}>Does Health Plan Factory replace my doctor?</strong>
            <br />
            No. We're a wellness planning tool, not a medical provider. Always consult a licensed healthcare
            professional for medical advice, diagnosis, or treatment.
          </P>
        </Section>

        <Section title="Privacy &amp; legal">
          <P>
            <a href="/privacy" style={{ color: "var(--hpf-pink)", textDecoration: "underline" }}>
              Privacy Policy
            </a>
            {" · "}
            <a href="/terms" style={{ color: "var(--hpf-pink)", textDecoration: "underline" }}>
              Terms of Use
            </a>
          </P>
        </Section>

        <div
          className="text-xs font-light mt-16"
          style={{ color: "var(--text-tertiary, rgba(255,255,255,0.25))" }}
        >
          Health Plan Factory · Hoboken, NJ · support@healthplanfactory.com
        </div>
      </div>
    </div>
  );
}
