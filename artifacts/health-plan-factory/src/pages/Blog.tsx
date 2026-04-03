import { Link } from "react-router-dom";
import { blogPosts, formatPublishDate } from "@/data/blogPosts";
import { Calendar, Clock, ArrowRight } from "lucide-react";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "HSA / FSA": { bg: "var(--sage-pale)", text: "var(--sage)", border: "rgba(107,153,99,0.2)" },
  "Wellness Science": { bg: "rgba(91,155,213,0.08)", text: "#5b9bd5", border: "rgba(91,155,213,0.2)" },
  "Getting Started": { bg: "var(--crimson-pale)", text: "var(--hpf-crimson)", border: "rgba(224,32,64,0.15)" },
  "Healthcare Models": { bg: "rgba(212,34,126,0.06)", text: "var(--hpf-pink)", border: "rgba(212,34,126,0.15)" },
  "Sleep Health": { bg: "rgba(120,80,200,0.07)", text: "#7850c8", border: "rgba(120,80,200,0.2)" },
};

function categoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS["Getting Started"];
}

export default function Blog() {
  const sorted = [...blogPosts].sort(
    (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
  );
  const [featured, ...rest] = sorted;

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>

      {/* ── HERO ── */}
      <section
        className="relative px-6 md:px-12 py-10 md:py-20"
        style={{ background: "var(--off-white)", borderBottom: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(212,34,126,0.05) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="section-tag">Wellness Hub</div>
          <h1
            className="mb-4 leading-tight"
            style={{
              fontFamily: "var(--app-font-serif)",
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--hpf-deep)",
            }}
          >
            The{" "}
            <em style={{ color: "var(--hpf-crimson)" }}>HealthPlanFactory</em>
            <br />
            Blog
          </h1>
          <p
            className="max-w-xl leading-relaxed"
            style={{ fontSize: "1.05rem", fontWeight: 300, color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)" }}
          >
            Evidence-based wellness education — HSA/FSA guides, modality deep-dives, and practical advice for building a health plan that fits your life.
          </p>
        </div>
      </section>

      <section className="px-6 md:px-12 py-16 max-w-4xl mx-auto">

        {/* ── FEATURED POST ── */}
        {featured && (
          <div className="mb-14">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-5"
              style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-mono)" }}
            >
              Featured Article
            </p>
            <Link
              to={`/blog/${featured.slug}`}
              className="block no-underline rounded-2xl overflow-hidden group"
              style={{
                background: "white",
                border: "1px solid rgba(212,34,126,0.1)",
                boxShadow: "0 4px 24px rgba(212,34,126,0.06)",
              }}
            >
              {/* Cover band */}
              <div
                className="px-8 py-10 flex items-center justify-center"
                style={{ background: "var(--hpf-pink)", minHeight: 120 }}
              >
                <span style={{ fontSize: "3.5rem" }}>{featured.coverEmoji}</span>
              </div>

              <div className="px-8 py-7">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: categoryStyle(featured.category).bg,
                      color: categoryStyle(featured.category).text,
                      border: `1px solid ${categoryStyle(featured.category).border}`,
                      fontFamily: "var(--app-font-sans)",
                    }}
                  >
                    {featured.category}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                    <Calendar size={12} />
                    {formatPublishDate(featured.publishDate)}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                    <Clock size={12} />
                    {featured.readingTimeMin} min read
                  </span>
                </div>

                <h2
                  className="mb-3 leading-tight group-hover:text-opacity-80 transition-colors"
                  style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 700, color: "var(--hpf-deep)", letterSpacing: "-0.015em" }}
                >
                  {featured.title}
                </h2>

                <p
                  className="mb-5 leading-relaxed text-sm"
                  style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", fontWeight: 300 }}
                >
                  {featured.excerpt}
                </p>

                <span
                  className="inline-flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
                >
                  Read article <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          </div>
        )}

        {/* ── REST OF POSTS ── */}
        {rest.length > 0 && (
          <>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-6"
              style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-mono)" }}
            >
              All Articles
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rest.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="block no-underline rounded-xl overflow-hidden group"
                  style={{
                    background: "white",
                    border: "1px solid rgba(212,34,126,0.08)",
                    boxShadow: "0 2px 12px rgba(212,34,126,0.04)",
                  }}
                >
                  {/* Mini cover */}
                  <div
                    className="px-6 py-6 flex items-center justify-center"
                    style={{ background: "var(--off-white)", borderBottom: "1px solid rgba(212,34,126,0.06)", minHeight: 80 }}
                  >
                    <span style={{ fontSize: "2.5rem" }}>{post.coverEmoji}</span>
                  </div>

                  <div className="px-6 py-5">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: categoryStyle(post.category).bg,
                          color: categoryStyle(post.category).text,
                          border: `1px solid ${categoryStyle(post.category).border}`,
                          fontFamily: "var(--app-font-sans)",
                        }}
                      >
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                        <Clock size={11} />
                        {post.readingTimeMin} min
                      </span>
                    </div>

                    <h3
                      className="mb-2 leading-snug"
                      style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.05rem", fontWeight: 700, color: "var(--hpf-deep)", letterSpacing: "-0.01em" }}
                    >
                      {post.title}
                    </h3>

                    <p
                      className="text-xs leading-relaxed mb-4"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)", fontWeight: 300 }}
                    >
                      {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-sans)" }}>
                        {formatPublishDate(post.publishDate)}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold"
                        style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
                      >
                        Read <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── CTA ── */}
      <section
        className="px-6 md:px-12 py-16"
        style={{ background: "var(--off-white)", borderTop: "1px solid rgba(212,34,126,0.08)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-2xl px-8 py-10 flex flex-col md:flex-row items-center gap-8"
            style={{ background: "var(--hpf-pink)", boxShadow: "0 8px 30px rgba(212,34,126,0.2)" }}
          >
            <div className="flex-1">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--app-font-sans)" }}
              >
                Put it into practice
              </p>
              <h3
                className="mb-2 leading-tight"
                style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 700, color: "white", letterSpacing: "-0.015em" }}
              >
                Ready to build your personalized wellness plan?
              </h3>
              <p
                className="text-sm font-light"
                style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--app-font-sans)" }}
              >
                Free to start. Budget-first. Matched to real providers in your area.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                to="/sign-up"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg text-sm font-semibold no-underline"
                style={{ background: "white", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", whiteSpace: "nowrap" }}
              >
                Build my plan free →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
