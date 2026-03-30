export default function Privacy() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-20" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="section-tag">Legal</div>
        <h1 className="mb-8" style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2.2rem,4vw,3.5rem)", fontWeight: 700, color: "var(--navy)", letterSpacing: "-0.02em" }}>
          Privacy Policy
        </h1>
        <div style={{ fontFamily: "var(--app-font-sans)" }}>
          {[
            { title: "Information We Collect", body: "We collect information you provide during signup and onboarding (name, email, health goals, budget preferences), usage data (pages visited, features used), and payment information (processed securely by Stripe — we never store your card number)." },
            { title: "How We Use Your Information", body: "We use your information to generate and personalize your wellness plan, match you with relevant providers, power the AI accountability coach, process payments, and improve the platform. We do not sell your personal health information to third parties." },
            { title: "Health Information", body: "Health-related information you share (conditions, goals, symptoms) is used solely to personalize your experience on this platform. This information is treated with the highest level of care. HealthPlanFactory is not a HIPAA-covered entity, but we apply privacy protections aligned with HIPAA principles to your health data." },
            { title: "Data Sharing", body: "We share limited information with: providers you explicitly unlock and contact; Stripe for payment processing; Anthropic for AI coaching functionality (conversation context only); and service providers who help us operate the platform, under strict data processing agreements." },
            { title: "Your Rights", body: "You may request access to, correction of, or deletion of your personal data at any time by contacting us at privacy@healthplanfactory.com. We will respond within 30 days." },
            { title: "Data Security", body: "We use industry-standard encryption and security practices to protect your data. All connections are encrypted via TLS. Passwords are hashed using bcrypt." },
            { title: "Contact", body: "Questions about this policy? Email us at privacy@healthplanfactory.com." },
          ].map((section) => (
            <div key={section.title} className="mb-8">
              <h2 className="text-base font-semibold mb-2" style={{ color: "var(--navy)" }}>{section.title}</h2>
              <p className="text-sm font-light leading-relaxed" style={{ color: "var(--text-secondary)" }}>{section.body}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-8 pt-4" style={{ color: "var(--text-muted)", borderTop: "1px solid rgba(27,45,79,0.1)" }}>
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
