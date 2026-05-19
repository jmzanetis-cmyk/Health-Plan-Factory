const EFFECTIVE_DATE = "May 2026";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-10">
    <h2 className="text-base font-semibold mb-3" style={{ color: "var(--hpf-deep)" }}>{title}</h2>
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

export default function Terms() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-20" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="section-tag">Legal</div>
        <h1 className="mb-4" style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2.2rem,4vw,3.5rem)", fontWeight: 700, color: "var(--hpf-deep)", letterSpacing: "-0.02em" }}>
          Terms of Service
        </h1>
        <p className="text-sm mb-10" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
          Effective: {EFFECTIVE_DATE}
        </p>

        <div style={{ fontFamily: "var(--app-font-sans)" }}>

          <Section title="1. About Health Plan Factory">
            <P>
              Health Plan Factory, LLC ("Health Plan Factory," "we," "us," or "our") operates a wellness optimization platform at healthplanfactory.com and in the Health Plan Factory mobile application (together, the "Platform"). The Platform helps individuals build personalized wellness plans, discover matched providers, and track progress toward health goals.
            </P>
            <P>
              By creating an account or using the Platform, you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Platform.
            </P>
          </Section>

          <Section title="2. Eligibility">
            <P>
              You must be at least 18 years old to use the Platform. By using the Platform, you represent and warrant that you are 18 or older and have the legal capacity to enter into a binding agreement. The Platform is not intended for use by anyone under 18.
            </P>
          </Section>

          <Section title="3. NOT MEDICAL ADVICE — Please Read">
            <P>
              <strong>HEALTH PLAN FACTORY IS A WELLNESS OPTIMIZATION PLATFORM, NOT A MEDICAL PROVIDER, DIAGNOSTIC TOOL, OR HEALTHCARE SERVICE.</strong>
            </P>
            <P>
              Nothing on the Platform — including wellness plans, modality recommendations, AI coaching responses, provider matches, or any other content — constitutes medical advice, diagnosis, or treatment. Use of the Platform does not create a physician-patient relationship, therapist-client relationship, or any other licensed healthcare relationship.
            </P>
            <P>
              <strong>Always consult a qualified, licensed healthcare professional before starting any new wellness program, making changes to an existing health regimen, or making decisions about your health.</strong> Recommendations on this Platform are for informational and educational purposes only.
            </P>
            <P>
              Health Plan Factory is not a HIPAA-covered entity. If you require HIPAA-compliant services, please seek a licensed healthcare provider.
            </P>
          </Section>

          <Section title="4. Account Responsibilities">
            <P>You agree to:</P>
            <UL items={[
              "Provide accurate, current, and complete information when creating your account and completing the health intake.",
              "Keep your login credentials confidential and not share them with others.",
              "Notify us immediately at support@healthplanfactory.com if you suspect unauthorized access to your account.",
              "Accept responsibility for all activity that occurs under your account.",
            ]} />
            <P>We reserve the right to terminate accounts that provide false or misleading information.</P>
          </Section>

          <Section title="5. Subscriptions and Payment">
            <P><strong>Free tier.</strong> You may use the Platform's core features — completing the health intake, generating a wellness plan, and browsing matched providers — at no charge.</P>
            <P><strong>Plus subscription.</strong> A Plus subscription ($9.99/month or $99/year) unlocks full provider contact details, the AI accountability coach, daily journaling, routine builder, progress tracking, HSA/FSA spending log with LMN workflow, direct provider messaging, and unlimited plan revisions.</P>
            <P><strong>Auto-renewal.</strong> Subscriptions automatically renew at the end of each billing period unless canceled before the renewal date. You authorize us to charge your payment method on file for each renewal.</P>
            <P><strong>Cancellation.</strong> You may cancel your Plus subscription at any time through your account settings or by contacting support@healthplanfactory.com. Cancellation takes effect at the end of the current billing period; you retain Plus access until that date.</P>
            <P><strong>Employer plans.</strong> Employer accounts are billed per-seat at rates agreed in a separate order form. Employer billing terms are governed by the applicable order form.</P>
            <P>All payments are processed by Stripe. By providing payment information, you agree to Stripe's terms of service.</P>
          </Section>

          <Section title="6. Refund Policy">
            <P>
              We do not offer refunds for partial billing periods. If you cancel a monthly subscription, you retain access through the end of the month you paid for; no refund is issued for unused days. If you cancel an annual subscription, no refund is issued for the remaining months.
            </P>
            <P>
              Exceptions may be made at our sole discretion for billing errors or technical failures that prevented access. Contact support@healthplanfactory.com within 7 days of the charge in question.
            </P>
          </Section>

          <Section title="7. Prohibited Uses">
            <P>You agree not to:</P>
            <UL items={[
              "Use the Platform for any unlawful purpose or in violation of any applicable law or regulation.",
              "Impersonate any person or entity or misrepresent your affiliation with any person or entity.",
              "Attempt to gain unauthorized access to any part of the Platform, our servers, or any connected systems.",
              "Scrape, crawl, or systematically extract data from the Platform without our written permission.",
              "Use the Platform to transmit spam, malicious code, or unsolicited commercial communications.",
              "Reverse-engineer, decompile, or disassemble any part of the Platform.",
              "Use AI coaching or wellness plan features to provide or seek medical diagnoses or treatment plans.",
              "Resell, sublicense, or commercially exploit any part of the Platform without our written consent.",
            ]} />
          </Section>

          <Section title="8. Provider Relationships">
            <P>
              Health Plan Factory facilitates discovery of and connection to wellness providers. We do not employ providers, endorse specific providers, or guarantee the quality, safety, or outcomes of any provider's services.
            </P>
            <P>
              Any relationship you enter into with a provider — including appointments, payments, and services rendered — is solely between you and that provider. Health Plan Factory is not a party to any such relationship and is not liable for any disputes, injuries, or dissatisfaction arising from provider services.
            </P>
            <P>
              Provider matching is based on location, modality, and plan fit. It does not constitute a referral, endorsement, or recommendation that any specific provider is appropriate for your medical needs.
            </P>
          </Section>

          <Section title="9. AI Accountability Coach">
            <P>
              The AI accountability coach is powered by a large language model (Anthropic's Claude). Coaching responses are generated automatically and are not reviewed by a licensed professional before delivery.
            </P>
            <P>
              The coach is designed for wellness motivation, habit formation, and plan adherence. <strong>It is not a therapist, counselor, psychologist, or licensed healthcare provider.</strong> Do not use the coach as a substitute for mental health treatment or crisis support. If you are experiencing a mental health emergency, contact 988 (Suicide and Crisis Lifeline) or your local emergency services.
            </P>
          </Section>

          <Section title="10. Intellectual Property">
            <P>
              All content, design, code, trademarks, and intellectual property on the Platform are owned by Health Plan Factory, LLC or our licensors. You may not reproduce, distribute, or create derivative works without our express written permission.
            </P>
            <P>
              <strong>You own your content.</strong> Journal entries, progress logs, and other content you create on the Platform remain yours. By submitting content to the Platform, you grant us a limited, non-exclusive license to store, process, and display it solely for the purpose of providing the service to you.
            </P>
          </Section>

          <Section title="11. Disclaimer of Warranties">
            <P>
              THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </P>
            <P>
              We do not warrant that the Platform will be uninterrupted, error-free, or that wellness recommendations will produce any particular health outcome. Wellness results vary by individual.
            </P>
          </Section>

          <Section title="12. Limitation of Liability">
            <P>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, HEALTH PLAN FACTORY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, GOODWILL, OR HEALTH OUTCOMES, ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM.
            </P>
            <P>
              OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATED TO THESE TERMS OR THE PLATFORM SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) $100.
            </P>
          </Section>

          <Section title="13. Indemnification">
            <P>
              You agree to indemnify, defend, and hold harmless Health Plan Factory, LLC and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorneys' fees) arising out of (a) your use of the Platform, (b) your violation of these Terms, or (c) your violation of any rights of a third party.
            </P>
          </Section>

          <Section title="14. Governing Law">
            <P>
              These Terms are governed by the laws of the State of New Jersey, without regard to its conflict-of-law principles. Any legal action arising out of or related to these Terms shall be brought exclusively in the state or federal courts located in New Jersey, and you consent to personal jurisdiction in those courts.
            </P>
          </Section>

          <Section title="15. Dispute Resolution">
            <P>
              Before filing any legal claim, you agree to contact us at legal@healthplanfactory.com and give us 30 days to attempt to resolve the dispute informally.
            </P>
            <P>
              If the dispute is not resolved informally, any claim shall be resolved by binding arbitration administered by the American Arbitration Association under its Consumer Arbitration Rules, except that either party may seek injunctive or other equitable relief in a court of competent jurisdiction. Arbitration shall take place in New Jersey or remotely.
            </P>
            <P>
              You waive the right to participate in any class action lawsuit or class-wide arbitration against Health Plan Factory.
            </P>
          </Section>

          <Section title="16. Termination">
            <P>
              We may suspend or terminate your account at any time, with or without notice, for violations of these Terms, fraudulent activity, or any other reason at our discretion. You may close your account at any time through account settings.
            </P>
            <P>
              Upon termination, your right to use the Platform ceases immediately. Sections 3, 10, 11, 12, 13, 14, and 15 survive termination.
            </P>
          </Section>

          <Section title="17. Changes to These Terms">
            <P>
              We may update these Terms from time to time. If we make material changes, we will notify you by email at least 14 days before the updated Terms take effect. Continued use of the Platform after the effective date constitutes acceptance of the updated Terms.
            </P>
          </Section>

          <Section title="18. Contact">
            <P>
              For legal questions, contact us at:<br />
              <strong>legal@healthplanfactory.com</strong><br />
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
