export default function Terms() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-20" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="section-tag">Legal</div>
        <h1 className="mb-8" style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2.2rem,4vw,3.5rem)", fontWeight: 700, color: "var(--hpf-deep)", letterSpacing: "-0.02em" }}>
          Terms of Service
        </h1>
        <div style={{ fontFamily: "var(--app-font-sans)" }}>
          {[
            { title: "1. Acceptance", body: "By using HealthPlanFactory, you agree to these Terms of Service. If you do not agree, do not use the platform." },
            { title: "2. Eligibility", body: "You must be at least 18 years old to use this platform. By using HealthPlanFactory, you represent that you are 18 or older." },
            { title: "3. Not Medical Advice", body: "As detailed in our Platform Disclaimer, HealthPlanFactory does not provide medical advice. Your use of the platform does not create any healthcare provider relationship." },
            { title: "4. Account Responsibilities", body: "You are responsible for maintaining the security of your account credentials and for all activity that occurs under your account. Notify us immediately if you suspect unauthorized access." },
            { title: "5. Payment Terms", body: "Provider unlock fees are charged at the time of unlock. Subscription fees are charged monthly or annually as selected. All charges are processed by Stripe. Subscriptions may be canceled at any time; no refunds are issued for partial billing periods." },
            { title: "6. Provider Relationships", body: "HealthPlanFactory facilitates discovery of providers but is not a party to any relationship between you and a provider. Any disputes with providers are between you and the provider." },
            { title: "7. Intellectual Property", body: "All content, design, and code of the HealthPlanFactory platform is the property of HealthPlanFactory and may not be reproduced without permission." },
            { title: "8. Termination", body: "We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent, harmful, or illegal activity." },
            { title: "9. Changes", body: "We may update these Terms at any time. Continued use of the platform after changes constitutes acceptance of the updated Terms." },
            { title: "10. Contact", body: "Questions? Email legal@healthplanfactory.com." },
          ].map((section) => (
            <div key={section.title} className="mb-8">
              <h2 className="text-base font-semibold mb-2" style={{ color: "var(--hpf-deep)" }}>{section.title}</h2>
              <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-secondary)" }}>{section.body}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-8 pt-4" style={{ color: "var(--text-muted)", borderTop: "1px solid rgba(212,34,126,0.1)" }}>
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
