import { useState } from "react";

const BASE = import.meta.env.BASE_URL;

const NAVY = "#1a2e4a";
const AMBER = "#b8892a";
const AMBER_PALE = "#fdf5e6";
const OFF_WHITE = "#f4f2ee";
const MUTED = "#8496b0";
const BODY_TEXT = "#4a5e7a";

const paragraphs = [
  "A few years ago, I woke up one morning and couldn't move my left leg. Not slowly — just couldn't. Sciatica had arrived overnight and decided to stay for what felt like forever. What followed was one of the most frustrating experiences of my life — not because of the pain, but because of how completely on my own I felt trying to fix it.",
  "I tried everything. Massage therapy first — it helped, for a day or two. Then acupuncture, which I was skeptical about and which surprised me. Then steroid injections, which my doctor recommended and which gave me three weeks of relief before the pain came roaring back. Decompression therapy at a chiropractor's office, twice a week for a month. Regular chiropractic adjustments. Ice. Heat. Stretching routines I found on YouTube at 2am. Supplements I read about in forums. I spent thousands of dollars and months of my life trying things one at a time, hoping something would stick.",
  "That question is why HealthPlanFactory exists. I built it because I was that person — throwing money and time at a problem with no roadmap, no system, and no one to tell me whether what I was doing made any sense together. Not as a replacement for doctors. My physicians were essential. But as a way to organize the space between appointments — the wellness decisions that are mine to make, fitted to what I can actually afford.",
  "I want every person dealing with chronic pain, or anxiety, or low energy, or any of the hundred things that fall outside what insurance covers — to have a starting point that makes sense. A plan built around them. Evidence-ranked. Budget-fitted. And if possible, booked and tracked in the same place they found it.",
  "HealthPlanFactory is that plan. I hope it helps you the way I wish something had helped me.",
];

const pullQuote =
  "It eventually went away. But I always wondered — what if I had a more calculated approach from the start? What if someone had looked at my specific situation, my budget, my goals, and told me: start here, in this order, at this frequency? Would I have gotten there faster? With less money spent? With less time lost?";

export function FounderLetterSection() {
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
            &ldquo;{pullQuote}&rdquo;
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
            borderRadius: 1,
            margin: "2.5rem 0",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            alignItems: "flex-start",
          }}
        >
          <FounderAvatar />

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
              Founder, HealthPlanFactory &middot; Zanetis Holdings LLC
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

function FounderAvatar() {
  const [imgFailed, setImgFailed] = useState(false);
  const src = `${BASE}founder.jpg`;

  return (
    <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
      {!imgFailed && (
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
          onError={() => setImgFailed(true)}
        />
      )}
      {imgFailed && (
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: NAVY,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
      )}
    </div>
  );
}
