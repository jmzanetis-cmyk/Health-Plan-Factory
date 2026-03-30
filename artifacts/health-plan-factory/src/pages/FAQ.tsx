import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const FAQS = [
  { q: "Is this medical advice?", a: "No. HealthPlanFactory is a wellness optimization platform — not a medical provider, diagnostic tool, or substitute for licensed healthcare. Always consult a qualified healthcare professional before beginning any wellness program." },
  { q: "How much does it cost to get started?", a: "Building your initial plan is completely free. You pay small unlock fees ($1–$3) only when you want to view a specific provider's contact information. A Plus membership ($9.99/month) unlocks unlimited reveals, journaling, routine building, and the AI accountability coach." },
  { q: "Can I use my HSA or FSA?", a: "Many services in your plan — including massage, acupuncture, physical therapy, and nutrition counseling — may qualify for HSA/FSA reimbursement. Eligibility is determined by your plan administrator. Our platform includes an HSA/FSA log to help you track spending." },
  { q: "How are providers vetted?", a: "Providers apply to be listed and agree to our provider standards. We collect credential information and license numbers. However, HealthPlanFactory does not independently verify credentials or guarantee outcomes. Always do your own due diligence before booking." },
  { q: "What's the difference between wellness and physician providers?", a: "Wellness providers include massage therapists, yoga instructors, nutritionists, personal trainers, and similar practitioners. Physician providers are licensed MDs, DOs, and NPs — often Direct Primary Care physicians who can order labs, prescribe, and write Letters of Medical Necessity." },
  { q: "What is the Founding Provider program?", a: "Founding Providers who join during our early access period pay zero platform commission on bookings for their first 90 days. After that, a small commission applies to bookings made through the platform." },
  { q: "What is the AI accountability coach?", a: "The AI coach is powered by Claude (Anthropic) and helps you stay on track with your wellness plan. It provides personalized encouragement, answers questions about your modalities, and helps you build habits. It is not a therapist or medical provider. All conversations include an emergency keyword interceptor that surfaces crisis resources if needed." },
  { q: "Is my health data private?", a: "We take privacy seriously. Your intake data, journal entries, and health information are used only to build and improve your plan. We do not sell personal health data to third parties. See our Privacy Policy for full details." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b cursor-pointer" style={{ borderColor: "rgba(27,45,79,0.1)" }} onClick={() => setOpen(!open)}>
      <div className="flex justify-between items-center py-5 gap-4">
        <h3 className="font-medium text-sm" style={{ color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>{q}</h3>
        {open ? <ChevronUp size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
      </div>
      {open && <p className="text-sm font-light leading-relaxed pb-5" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>{a}</p>}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-20" style={{ background: "var(--off-white)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="section-tag">FAQ</div>
        <h1 className="mb-10" style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2.5rem,5vw,4rem)", fontWeight: 700, color: "var(--navy)", letterSpacing: "-0.02em" }}>
          Frequently Asked Questions
        </h1>
        {FAQS.map((faq) => <FAQItem key={faq.q} q={faq.q} a={faq.a} />)}

        <div className="mt-10 rounded-xl p-6 text-sm" style={{ background: "var(--amber-pale)", border: "1px solid rgba(184,137,42,0.12)", color: "var(--navy)", fontFamily: "var(--app-font-sans)" }}>
          <strong style={{ color: "var(--hpf-amber)" }}>Still have questions?</strong> Reach out at{" "}
          <a href="mailto:hello@healthplanfactory.com" className="no-underline" style={{ color: "var(--hpf-amber)", textDecoration: "underline" }}>
            hello@healthplanfactory.com
          </a>
        </div>
      </div>
    </div>
  );
}
