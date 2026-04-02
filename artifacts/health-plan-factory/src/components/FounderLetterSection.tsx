const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

const NAVY = "#1a2e4a";
const AMBER = "#b8892a";
const AMBER_PALE = "#fdf5e6";
const OFF_WHITE = "#f4f2ee";
const MUTED = "#8496b0";
const BODY_TEXT = "#4a5e7a";

const paragraphs = [
  "When I turned 38, I realized I had no idea what my health insurance actually covered. I'd been paying into it for years \u2014 and when I finally needed it, I felt completely lost. The deductible was higher than I remembered. The network didn't include my doctor. The plan that looked cheapest on paper cost me thousands in a single year.",
  "I spent the next six months talking to benefits consultants, reading CMS data exports, and building spreadsheets I never wanted to build. Eventually something clicked: the math behind choosing a health plan isn't magic \u2014 it's just rarely explained in plain English. Nobody sits you down and walks you through it.",
  "That's what HealthPlanFactory does. It takes your real numbers \u2014 your income, your household, your state, the providers you actually see \u2014 and works out which plan saves you the most money over a full year, not just which one has the lowest premium.",
  "Since launching the beta, I've watched families save an average of $4,200 a year just by switching to a plan they already had access to. Not a secret plan. Not a hack. Just the right one, chosen with the right information.",
  "I built this for the version of me who sat in that waiting room, staring at an EOB, wishing someone had just helped me think it through.",
];

const pullQuote =
  `What if I had a more calculated approach \u2014 one that looked at my actual prescriptions, my preferred doctors, and my realistic out-of-pocket exposure \u2014 before I ever clicked \u201cenroll\u201d?`;

export function FounderLetterSection() {
  const founderImageSrc = `${BASE}/assets/founder.jpg`;

  return (
    <section style={{ background: OFF_WHITE }}>
      <style>{`
        .founder-letter-inner {
          max-width: 720px;
          margin: 0 auto;
          padding: 5rem;
        }
        .founder-pull-quote {
          padding-left: 1.25rem;
        }
        @media (max-width: 480px) {
          .founder-letter-inner {
            padding: 3rem 1.5rem;
          }
          .founder-pull-quote {
            padding-left: 1rem;
          }
        }
      `}</style>
      <div className="founder-letter-inner">
        <p
          style={{
            fontFamily: "var(--app-font-sans)",
            fontWeight: 600,
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: AMBER,
            marginBottom: "0.75rem",
          }}
        >
          Why I built this
        </p>

        <h2
          style={{
            fontFamily: "var(--app-font-serif)",
            fontWeight: 700,
            fontStyle: "italic",
            fontSize: "clamp(2rem, 4vw, 3rem)",
            color: NAVY,
            lineHeight: 1.2,
            marginBottom: "2.5rem",
          }}
        >
          A letter from the founder.
        </h2>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {paragraphs.slice(0, 2).map((text, i) => (
            <p
              key={i}
              style={{
                fontFamily: "var(--app-font-sans)",
                fontWeight: 300,
                fontSize: "1rem",
                color: BODY_TEXT,
                lineHeight: 1.9,
                textIndent: "2rem",
                marginBottom: "1.25rem",
              }}
            >
              {text}
            </p>
          ))}

          <blockquote
            className="founder-pull-quote"
            style={{
              borderLeft: `3px solid ${AMBER}`,
              background: AMBER_PALE,
              paddingTop: "1rem",
              paddingBottom: "1rem",
              paddingRight: "1rem",
              fontFamily: "var(--app-font-serif)",
              fontWeight: 600,
              fontStyle: "italic",
              fontSize: "1.1rem",
              color: NAVY,
              textIndent: 0,
              marginBottom: "1.25rem",
            }}
          >
            \u201c{pullQuote}\u201d
          </blockquote>

          {paragraphs.slice(2).map((text, i) => (
            <p
              key={i + 2}
              style={{
                fontFamily: "var(--app-font-sans)",
                fontWeight: 300,
                fontSize: "1rem",
                color: BODY_TEXT,
                lineHeight: 1.9,
                textIndent: "2rem",
                marginBottom: "1.25rem",
              }}
            >
              {text}
            </p>
          ))}
        </div>

        <hr
          style={{
            width: 48,
            height: 2,
            background: AMBER,
            border: "none",
            margin: "2.5rem 0",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
          <ImageWithFallback src={founderImageSrc} />

          <div>
            <p
              style={{
                fontFamily: "var(--app-font-serif)",
                fontWeight: 700,
                fontStyle: "italic",
                fontSize: "1.3rem",
                color: NAVY,
                marginBottom: "0.25rem",
              }}
            >
              Jordan Zanetis
            </p>
            <p
              style={{
                fontFamily: "var(--app-font-sans)",
                fontWeight: 400,
                fontSize: "0.82rem",
                color: MUTED,
                marginBottom: "0.15rem",
              }}
            >
              Founder, HealthPlanFactory \u00b7 Zanetis Holdings LLC
            </p>
            <p
              style={{
                fontFamily: "var(--app-font-sans)",
                fontWeight: 300,
                fontSize: "0.78rem",
                color: MUTED,
              }}
            >
              Somerset, NJ
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ImageWithFallback({ src }: { src: string }) {
  return (
    <div style={{ position: "relative", width: 72, height: 72 }}>
      <img
        src={src}
        alt="Jordan Zanetis"
        width={72}
        height={72}
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
        }}
        onError={(e) => {
          const img = e.currentTarget;
          img.style.display = "none";
          const fallback = img.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = "flex";
        }}
      />
      <div
        style={{
          display: "none",
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: NAVY,
          alignItems: "center",
          justifyContent: "center",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--app-font-serif)",
            fontWeight: 700,
            fontSize: "1.4rem",
            color: OFF_WHITE,
            lineHeight: 1,
          }}
        >
          JZ
        </span>
      </div>
    </div>
  );
}
