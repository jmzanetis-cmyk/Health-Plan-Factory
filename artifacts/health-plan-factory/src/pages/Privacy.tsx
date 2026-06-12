const EFFECTIVE_DATE = "May 2026";

const Section = ({ title, color = "var(--hpf-pink)", children }: { title: string; color?: string; children: React.ReactNode }) => (
  <div className="mb-10">
    <h2 className="text-base font-semibold mb-3" style={{ color }}>{title}</h2>
    <div className="text-sm font-light leading-relaxed" style={{ color: "var(--text-secondary)" }}>{children}</div>
  </div>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3">{children}</p>
);

const UL = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-5 mb-3 space-y-1">
    {items.map((item, i) => <li key={i}>{item}</li>)}
  </ul>
);

export default function Privacy() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-20" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="section-tag">Legal</div>
        <h1 className="mb-4" style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2.2rem,4vw,3.5rem)", fontWeight: 700, color: "var(--hpf-deep)", letterSpacing: "-0.02em" }}>
          Privacy Policy
        </h1>
        <p className="text-sm mb-10" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          Effective: {EFFECTIVE_DATE}
        </p>

        <div style={{ fontFamily: "var(--app-font-sans)" }}>

          <Section title="1. Who We Are">
            <P>
              Health Plan Factory, LLC ("Health Plan Factory," "we," "us," or "our") operates the website at healthplanfactory.com and the Health Plan Factory mobile application (together, the "Platform"). This Privacy Policy describes how we collect, use, and share information about you when you use the Platform.
            </P>
            <P>
              By using the Platform, you agree to the practices described in this policy. If you do not agree, please discontinue use.
            </P>
          </Section>

          <Section title="2. Information We Collect">
            <P><strong>Account and profile information.</strong> When you create an account, we collect your name, email address, and authentication credentials. Authentication is handled via our identity provider (Replit Auth or GitHub OAuth); we do not store passwords.</P>
            <P><strong>Health intake data.</strong> During onboarding and plan generation, you provide information about your wellness goals, health conditions, monthly budget, modality preferences, and HSA/FSA status. This information is used solely to generate your personalized wellness plan.</P>
            <P><strong>Apple HealthKit data (iOS only).</strong> With your permission, we read the following data types from Apple Health: step count, sleep analysis, active energy burned, and mindfulness session minutes. We use this data to update your wellness score and personalize plan recommendations. See Section 5 for HealthKit-specific disclosures.</P>
            <P><strong>Journal entries and progress logs.</strong> Content you enter in the journal and accountability features (text, mood ratings, routine completions) is stored on our servers and linked to your account.</P>
            <P><strong>Usage data.</strong> We collect information about how you use the Platform — screens viewed, features used, session duration, and interactions — to improve the product and inform AI coaching context.</P>
            <P><strong>Diagnostic data.</strong> We use Sentry for crash reporting. Crash reports may include device type, OS version, app version, and a stack trace. Crash reports are not linked to your identity.</P>
            <P><strong>Payment data.</strong> Payment processing is handled entirely by Stripe. We do not see or store your card number, bank account details, or other payment credentials. We receive only a confirmation of payment and a subscription status flag.</P>
          </Section>

          <Section title="3. How We Use Your Information">
            <UL items={[
              "Generate and personalize your wellness plan based on your intake responses.",
              "Match you with relevant local providers for each modality in your plan.",
              "Power the AI accountability coach and provide coaching responses in context.",
              "Update your wellness score and habit-tracking progress.",
              "Send transactional emails (plan ready, account updates, magic login links) via Resend.",
              "Send SMS notifications if you opt in, via Twilio.",
              "Process your subscription and manage your billing status.",
              "Detect and prevent fraud, abuse, and security incidents.",
              "Analyze aggregate, anonymized usage patterns to improve the Platform.",
              "Comply with legal obligations.",
            ]} />
            <P>We do not sell your personal information or health data to third parties. We do not use your health data for advertising.</P>
          </Section>

          <Section title="4. AI-Generated Recommendations">
            <P>
              Wellness plan recommendations are generated by a rule-based AI engine that weighs your intake responses against a clinical evidence database. Coaching responses are generated by Anthropic's Claude model using your plan and conversation history as context.
            </P>
            <P>
              <strong>AI-generated content is not medical advice.</strong> Health Plan Factory is not a licensed healthcare provider. Recommendations are for wellness and educational purposes only. Always consult a qualified healthcare professional before making decisions about your health.
            </P>
            <P>
              To power AI coaching, relevant portions of your conversation history and plan summary are transmitted to Anthropic's API. Anthropic processes this data under a data processing agreement and does not train models on API inputs by default.
            </P>
          </Section>

          <Section title="5. Apple HealthKit">
            <P>
              Health Plan Factory requests permission to read the following HealthKit data types: step count, sleep analysis, active energy burned, and mindfulness session minutes.
            </P>
            <P>
              <strong>We do not write data to Apple Health.</strong> We do not sell HealthKit data. We do not use HealthKit data for advertising or share it with data brokers. HealthKit data is used only to update your wellness score and personalize your plan recommendations, as disclosed in the iOS permission dialog.
            </P>
            <P>
              Aggregate values derived from HealthKit data (e.g., "average step count this week") may be transmitted to our servers to update your wellness score. Raw HealthKit records are processed on-device and are not transmitted off-device.
            </P>
          </Section>

          <Section title="6. How We Share Your Information">
            <P>We share your information only in the following circumstances:</P>
            <UL items={[
              "Stripe — payment processing and subscription management.",
              "Supabase — database hosting and authentication infrastructure. Your data is stored on Supabase's servers under a data processing agreement.",
              "Anthropic — AI coaching responses. Conversation context is transmitted to Anthropic's API. Anthropic does not train on API data by default.",
              "Resend — transactional email delivery.",
              "Twilio — SMS notifications (only if you opt in).",
              "Sentry — crash reporting (diagnostic data only, not linked to identity).",
              "Apple — HealthKit integration operates under Apple's HealthKit agreements and developer program agreements.",
              "Providers — if you contact a provider through the Platform, limited profile information (name, plan summary) may be shared with that provider at your direction.",
              "Law enforcement or regulators — if required by applicable law, court order, or to protect the rights and safety of our users or the public.",
              "Business transfers — in connection with a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.",
            ]} />
          </Section>

          <Section title="7. Data Retention">
            <P>
              We retain your account data and health information for as long as your account is active. If you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal or financial compliance purposes (e.g., Stripe transaction records).
            </P>
            <P>
              Journal entries and progress logs are deleted with your account. Anonymized, aggregate data derived from your usage (e.g., aggregate wellness score distributions) may be retained indefinitely.
            </P>
          </Section>

          <Section title="8. Your Rights and Choices">
            <P>Depending on your location, you may have the following rights regarding your personal data:</P>
            <UL items={[
              "Access — request a copy of the personal data we hold about you.",
              "Correction — request correction of inaccurate data.",
              "Deletion — request deletion of your account and associated personal data.",
              "Portability — request your data in a machine-readable format.",
              "Opt-out of communications — unsubscribe from marketing emails at any time via the unsubscribe link. Transactional emails (magic login links, plan notifications) are required for the service to function.",
              "HealthKit — revoke HealthKit permissions at any time in iOS Settings → Privacy & Security → Health → Health Plan Factory.",
            ]} />
            <P>
              To exercise any of these rights, email us at <strong>privacy@healthplanfactory.com</strong>. We will respond within 30 days.
            </P>
          </Section>

          <Section title="9. Children's Privacy">
            <P>
              Health Plan Factory is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us with personal information, please contact us at privacy@healthplanfactory.com and we will delete it promptly.
            </P>
          </Section>

          <Section title="10. Security">
            <P>
              All data is transmitted over TLS. Data is stored on Supabase's infrastructure, which uses encryption at rest. We use access controls, logging, and security monitoring to protect against unauthorized access.
            </P>
            <P>
              No security system is impenetrable. If you discover a potential security issue, please report it responsibly to security@healthplanfactory.com.
            </P>
          </Section>

          <Section title="11. Third-Party Service Providers">
            <P>We use the following third-party service providers to operate the Platform. Each provider processes only the data necessary to deliver their service and is bound by a data processing agreement or equivalent contractual obligation:</P>
            <UL items={[
              "Stripe (United States) — payment processing and subscription management. Stripe is PCI-DSS Level 1 certified.",
              "Supabase (United States) — database hosting and user authentication.",
              "Anthropic (United States) — AI coaching responses powered by the Claude API.",
              "Resend (United States) — transactional email delivery.",
              "Twilio (United States) — SMS notifications (only if you opt in).",
              "Sentry (United States) — crash reporting and error monitoring.",
              "Apple (United States) — HealthKit integration and iOS app distribution.",
            ]} />
          </Section>

          <Section title="12. Changes to This Policy">
            <P>
              We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email (to the address on your account) or by displaying a notice on the Platform at least 14 days before the change takes effect. Your continued use of the Platform after the effective date constitutes acceptance of the updated policy.
            </P>
          </Section>

          <Section title="13. Contact">
            <P>
              For privacy-related questions or requests, contact us at:<br />
              <strong>privacy@healthplanfactory.com</strong><br />
              Health Plan Factory, LLC<br />
              New Jersey, United States
            </P>
          </Section>

        </div>
        <p className="text-xs mt-8 pt-4" style={{ color: "var(--text-muted)", borderTop: "1px solid rgba(212,34,126,0.1)", fontFamily: "var(--app-font-sans)" }}>
          Last updated: {EFFECTIVE_DATE}
        </p>
      </div>
    </div>
  );
}
