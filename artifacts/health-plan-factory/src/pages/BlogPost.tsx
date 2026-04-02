import { useParams, Link } from "react-router-dom";
import { getBlogPost, blogPosts, formatPublishDate } from "@/data/blogPosts";
import { ArrowLeft, Calendar, Clock, ArrowRight } from "lucide-react";
import NotFound from "@/pages/not-found";

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

function renderBody(body: string) {
  const lines = body.trim().split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={key++}
          style={{
            fontFamily: "var(--app-font-serif)",
            fontSize: "clamp(1.3rem, 2.2vw, 1.6rem)",
            fontWeight: 700,
            color: "var(--hpf-deep)",
            letterSpacing: "-0.015em",
            marginTop: "2.5rem",
            marginBottom: "0.75rem",
          }}
        >
          {line.replace("## ", "")}
        </h2>
      );
    } else if (line.startsWith("- **")) {
      const match = line.match(/^- \*\*(.+?)\*\*[:\s—–-]*(.*)/);
      if (match) {
        elements.push(
          <li
            key={key++}
            className="flex items-start gap-2 text-sm font-light leading-relaxed"
            style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", marginBottom: "0.4rem" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
              style={{ background: "var(--hpf-pink)" }}
            />
            <span>
              <strong style={{ color: "var(--hpf-deep)", fontWeight: 600 }}>{match[1]}</strong>
              {match[2] ? ` — ${match[2]}` : ""}
            </span>
          </li>
        );
      }
    } else if (line.startsWith("- ")) {
      elements.push(
        <li
          key={key++}
          className="flex items-start gap-2 text-sm font-light leading-relaxed"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", marginBottom: "0.4rem" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
            style={{ background: "var(--hpf-pink)" }}
          />
          <span dangerouslySetInnerHTML={{ __html: line.replace("- ", "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} style={{ marginBottom: "0.5rem" }} />);
    } else {
      const html = line
        .replace(/\*\*(.+?)\*\*/g, "<strong style=\"color:var(--hpf-deep);font-weight:600\">$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");
      elements.push(
        <p
          key={key++}
          className="text-sm font-light leading-relaxed"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--app-font-sans)", marginBottom: "0.75rem" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
  }

  return elements;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = getBlogPost(slug ?? "");

  if (!post) return <NotFound />;

  const others = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2);
  const catStyle = categoryStyle(post.category);

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>

      {/* ── HERO ── */}
      <section
        className="px-6 md:px-12 py-16"
        style={{ background: "var(--hpf-pink)", position: "relative", overflow: "hidden" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="max-w-3xl mx-auto relative z-10">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-xs font-semibold no-underline mb-8"
            style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--app-font-sans)" }}
          >
            <ArrowLeft size={14} />
            All Articles
          </Link>

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.25)", fontFamily: "var(--app-font-sans)" }}
            >
              {post.category}
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--app-font-sans)" }}>
              <Calendar size={12} />
              {formatPublishDate(post.publishDate)}
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--app-font-sans)" }}>
              <Clock size={12} />
              {post.readingTimeMin} min read
            </span>
          </div>

          <h1
            className="mb-4 leading-tight"
            style={{ fontFamily: "var(--app-font-serif)", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}
          >
            {post.title}
          </h1>

          <p
            className="leading-relaxed text-sm"
            style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--app-font-sans)", fontWeight: 300, maxWidth: 560 }}
          >
            {post.excerpt}
          </p>
        </div>
      </section>

      {/* ── CONTENT AREA ── */}
      <div className="px-6 md:px-12 py-14 max-w-5xl mx-auto flex flex-col lg:flex-row gap-12">

        {/* Main content */}
        <article className="flex-1 min-w-0">
          <div
            className="rounded-2xl px-8 py-10"
            style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)", boxShadow: "0 2px 12px rgba(212,34,126,0.04)" }}
          >
            <div className="text-4xl mb-6 text-center">{post.coverEmoji}</div>
            <div>{renderBody(post.body)}</div>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="lg:w-72 flex-shrink-0 flex flex-col gap-6">

          {/* CTA */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--hpf-pink)", boxShadow: "0 4px 20px rgba(212,34,126,0.2)" }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--app-font-sans)" }}
            >
              Ready to start?
            </p>
            <h3
              className="mb-3 leading-tight"
              style={{ fontFamily: "var(--app-font-serif)", fontSize: "1.15rem", fontWeight: 700, color: "white", letterSpacing: "-0.01em" }}
            >
              Build your personalized wellness plan — free.
            </h3>
            <p
              className="text-xs font-light leading-relaxed mb-5"
              style={{ color: "rgba(255,255,255,0.65)", fontFamily: "var(--app-font-sans)" }}
            >
              Answer 7 quick questions. Get a budget-optimized plan matched to real providers near you.
            </p>
            <Link
              to="/sign-up"
              className="block text-center no-underline rounded-lg px-5 py-3 text-sm font-semibold"
              style={{ background: "white", color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
            >
              Build my plan free →
            </Link>
          </div>

          {/* Related posts */}
          {others.length > 0 && (
            <div
              className="rounded-2xl p-6"
              style={{ background: "white", border: "1px solid rgba(212,34,126,0.08)", boxShadow: "0 2px 12px rgba(212,34,126,0.04)" }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: "var(--text-muted)", fontFamily: "var(--app-font-mono)" }}
              >
                More Articles
              </p>
              <div className="flex flex-col gap-4">
                {others.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    className="block no-underline group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{p.coverEmoji}</span>
                      <div>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-1"
                          style={{
                            background: categoryStyle(p.category).bg,
                            color: categoryStyle(p.category).text,
                            border: `1px solid ${categoryStyle(p.category).border}`,
                            fontFamily: "var(--app-font-sans)",
                          }}
                        >
                          {p.category}
                        </span>
                        <p
                          className="text-sm font-medium leading-snug"
                          style={{ color: "var(--hpf-deep)", fontFamily: "var(--app-font-serif)" }}
                        >
                          {p.title}
                        </p>
                        <span
                          className="inline-flex items-center gap-1 text-xs mt-1"
                          style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
                        >
                          Read <ArrowRight size={11} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back link */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium no-underline"
            style={{ color: "var(--hpf-pink)", fontFamily: "var(--app-font-sans)" }}
          >
            <ArrowLeft size={14} />
            Back to all articles
          </Link>
        </aside>
      </div>
    </div>
  );
}
