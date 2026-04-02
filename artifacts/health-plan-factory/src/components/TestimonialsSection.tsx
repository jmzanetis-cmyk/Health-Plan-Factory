import { useState, useEffect } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  goal: string | null;
  quote: string;
  stars: number;
}

function StarRow({ count }: { count: number }) {
  return (
    <span style={{ color: "var(--hpf-crimson)", letterSpacing: "1px", fontSize: "0.85rem" }}>
      {"★".repeat(Math.max(0, Math.min(5, count)))}
    </span>
  );
}

export function TestimonialsSection({ sectionTag = "From early members" }: { sectionTag?: string }) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/testimonials`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (Array.isArray(data?.testimonials)) setTestimonials(data.testimonials);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section
        className="px-6 md:px-12 py-16"
        style={{ background: "var(--warm-white)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl p-6 animate-pulse"
                style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)", height: 180 }}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) return null;

  return (
    <section
      className="px-6 md:px-12 py-16"
      style={{ background: "var(--warm-white)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-xl mb-2" style={{ color: "var(--hpf-crimson)", letterSpacing: "2px" }}>
            ★★★★★
          </div>
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {sectionTag}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.slice(0, 6).map((t) => (
            <div
              key={t.id}
              className="rounded-2xl p-6 transition-all hover:-translate-y-0.5"
              style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)" }}
            >
              <div className="mb-3">
                <StarRow count={t.stars} />
              </div>
              <blockquote
                className="text-base font-normal italic leading-relaxed mb-5"
                style={{ fontFamily: "var(--app-font-serif)", color: "var(--hpf-pink)" }}
              >
                "{t.quote}"
              </blockquote>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                  style={{ background: "var(--parchment)", border: "1.5px solid rgba(212,34,126,0.1)", color: "var(--hpf-pink)" }}
                >
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--hpf-pink)" }}>{t.name}</p>
                  {(t.location || t.goal) && (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {t.location ?? t.goal}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
