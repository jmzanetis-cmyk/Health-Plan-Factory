export default function Contact() {
  return (
    <div className="min-h-screen px-6 md:px-12 py-20" style={{ background: "var(--warm-white)" }}>
      <div className="max-w-xl mx-auto">
        <div className="section-tag">Get in touch</div>
        <h1 className="mb-4" style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(2.2rem,4vw,3.5rem)", fontWeight: 700, color: "var(--navy)", letterSpacing: "-0.02em" }}>
          Contact Us
        </h1>
        <p className="text-sm font-light leading-relaxed mb-10" style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}>
          Questions, feedback, or provider inquiries — we'd love to hear from you.
        </p>
        <div className="grid grid-cols-1 gap-4">
          {[
            { label: "General inquiries", email: "hello@healthplanfactory.com" },
            { label: "Provider partnerships", email: "providers@healthplanfactory.com" },
            { label: "Privacy & data requests", email: "privacy@healthplanfactory.com" },
            { label: "Legal", email: "legal@healthplanfactory.com" },
          ].map((item) => (
            <div key={item.email} className="rounded-xl p-5" style={{ background: "white", border: "1px solid rgba(27,45,79,0.08)" }}>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>{item.label}</p>
              <a href={`mailto:${item.email}`} className="text-sm font-medium no-underline" style={{ color: "var(--hpf-amber)", fontFamily: "var(--app-font-sans)" }}>{item.email}</a>
            </div>
          ))}
        </div>
        <div className="mt-8 p-4 rounded-lg text-xs leading-relaxed" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#7f1d1d", fontFamily: "var(--app-font-sans)" }}>
          <strong style={{ color: "#dc2626" }}>In a crisis?</strong> Do not contact us — call <strong>911</strong> for emergencies or <strong>988</strong> for mental health crisis support.
        </div>
      </div>
    </div>
  );
}
