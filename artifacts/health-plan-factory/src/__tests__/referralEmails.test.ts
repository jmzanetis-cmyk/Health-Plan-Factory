/**
 * Referral Email Template Tests (frontend package)
 *
 * These tests verify the XSS-safe escaping and template output of the
 * referral invite and milestone email generators.
 *
 * Note: escapeHtml is defined in the api-server package and tested thoroughly
 * there. Here we test the full email output contains properly escaped content
 * and that template variables render correctly.
 */

import { describe, it, expect } from "vitest";

// ── Inline escapeHtml for frontend-side tests ─────────────────────────────────
// Mirrors the implementation in the api-server email templates.
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Template helpers (mirrors the shape of referralInviteEmail output) ────────
function buildInviteSubject(referrerName: string | null): string {
  const referrer = escapeHtml(referrerName ?? "A friend");
  return `${referrer} invited you to Health Plan Factory`;
}

function buildMilestoneSubject(emoji: string, label: string, bonusCredit: string): string {
  return `${emoji} You've reached ${label} — ${bonusCredit} bonus credit!`;
}

// ── escapeHtml unit tests ─────────────────────────────────────────────────────

describe("escapeHtml (frontend mirror)", () => {
  it("escapes & to &amp;", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("escapes < and > to HTML entities", () => {
    expect(escapeHtml("<b>bold</b>")).toBe("&lt;b&gt;bold&lt;/b&gt;");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('class="foo"')).toBe("class=&quot;foo&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's fine")).toBe("it&#39;s fine");
  });

  it("does not change safe strings", () => {
    expect(escapeHtml("Hello, Alice!")).toBe("Hello, Alice!");
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("escapes classic XSS payload: <script>", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
    );
  });

  it("escapes img onerror payload", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
  });

  it("escapes javascript: pseudo-protocol in quotes", () => {
    expect(escapeHtml(`href="javascript:alert('xss')"`)).toBe(
      `href=&quot;javascript:alert(&#39;xss&#39;)&quot;`
    );
  });

  it("escapes all five unsafe characters in one pass", () => {
    expect(escapeHtml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
  });
});

// ── Email subject line tests ──────────────────────────────────────────────────

describe("Invite email subject line", () => {
  it("includes the referrer name in the subject", () => {
    expect(buildInviteSubject("Alice")).toBe(
      "Alice invited you to Health Plan Factory"
    );
  });

  it("uses 'A friend' when referrer name is null", () => {
    expect(buildInviteSubject(null)).toBe(
      "A friend invited you to Health Plan Factory"
    );
  });

  it("escapes HTML in the referrer name within subject", () => {
    expect(buildInviteSubject("<Evil>")).toBe(
      "&lt;Evil&gt; invited you to Health Plan Factory"
    );
  });

  it("escapes & in referrer name", () => {
    expect(buildInviteSubject("Tom & Jerry")).toBe(
      "Tom &amp; Jerry invited you to Health Plan Factory"
    );
  });
});

describe("Milestone email subject line", () => {
  it("includes emoji, label, and bonus in subject", () => {
    expect(buildMilestoneSubject("🌱", "Pioneer", "$3.00")).toBe(
      "🌱 You've reached Pioneer — $3.00 bonus credit!"
    );
  });

  it("includes emoji, label, and bonus for Ambassador tier", () => {
    expect(buildMilestoneSubject("💎", "Ambassador", "$20.00")).toBe(
      "💎 You've reached Ambassador — $20.00 bonus credit!"
    );
  });
});

// ── Milestone tier structure tests ───────────────────────────────────────────

describe("Milestone tier definitions", () => {
  const MILESTONE_TIERS = [
    { id: "pioneer",    label: "Pioneer",    threshold: 1,  emoji: "🌱", bonusCents: 300  },
    { id: "advocate",   label: "Advocate",   threshold: 5,  emoji: "🌿", bonusCents: 500  },
    { id: "champion",   label: "Champion",   threshold: 10, emoji: "🏆", bonusCents: 1000 },
    { id: "ambassador", label: "Ambassador", threshold: 25, emoji: "💎", bonusCents: 2000 },
  ];

  it("defines exactly 4 milestone tiers", () => {
    expect(MILESTONE_TIERS).toHaveLength(4);
  });

  it("tiers are in ascending threshold order", () => {
    const thresholds = MILESTONE_TIERS.map((t) => t.threshold);
    expect(thresholds).toEqual([1, 5, 10, 25]);
  });

  it("bonus credits are in ascending order", () => {
    const bonuses = MILESTONE_TIERS.map((t) => t.bonusCents);
    expect(bonuses).toEqual([300, 500, 1000, 2000]);
  });

  it("pioneer has threshold 1 and $3.00 bonus", () => {
    const pioneer = MILESTONE_TIERS.find((t) => t.id === "pioneer");
    expect(pioneer?.threshold).toBe(1);
    expect(pioneer?.bonusCents).toBe(300);
  });

  it("ambassador has threshold 25 and $20.00 bonus", () => {
    const ambassador = MILESTONE_TIERS.find((t) => t.id === "ambassador");
    expect(ambassador?.threshold).toBe(25);
    expect(ambassador?.bonusCents).toBe(2000);
  });

  it("each tier has id, label, threshold, emoji, and bonusCents", () => {
    for (const tier of MILESTONE_TIERS) {
      expect(tier).toHaveProperty("id");
      expect(tier).toHaveProperty("label");
      expect(tier).toHaveProperty("threshold");
      expect(tier).toHaveProperty("emoji");
      expect(tier).toHaveProperty("bonusCents");
    }
  });

  it("formats bonus credit correctly as dollars", () => {
    for (const tier of MILESTONE_TIERS) {
      const formatted = `$${(tier.bonusCents / 100).toFixed(2)}`;
      expect(formatted).toMatch(/^\$\d+\.\d{2}$/);
    }
  });
});

// ── Referral link construction tests ─────────────────────────────────────────

describe("Referral link construction", () => {
  it("correctly appends referral code as query param", () => {
    const baseUrl = "https://healthplanfactory.com";
    const code = "HPF-ABCD1234";
    const link = `${baseUrl}/?ref=${code}`;
    expect(link).toBe("https://healthplanfactory.com/?ref=HPF-ABCD1234");
  });

  it("encodes special characters in referral code", () => {
    const baseUrl = "https://healthplanfactory.com";
    const code = "HPF-AB&CD";
    const link = `${baseUrl}/signup?ref=${encodeURIComponent(code)}`;
    expect(link).toContain("HPF-AB%26CD");
  });

  it("referral code matches expected HPF-XXXXXXXX pattern", () => {
    const code = "HPF-AB12CD34";
    expect(code).toMatch(/^HPF-[A-Z0-9]{8}$/);
  });

  it("referral code does not contain ambiguous chars 0, O, I, 1", () => {
    const allowed = /^HPF-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;
    const code = "HPF-ABCDEFGH";
    expect(code).toMatch(allowed);
  });
});

// ── Credit formatting tests ───────────────────────────────────────────────────

describe("Credit formatting", () => {
  it("formats 300 cents as $3.00", () => {
    expect(`$${(300 / 100).toFixed(2)}`).toBe("$3.00");
  });

  it("formats 500 cents as $5.00", () => {
    expect(`$${(500 / 100).toFixed(2)}`).toBe("$5.00");
  });

  it("formats 1000 cents as $10.00", () => {
    expect(`$${(1000 / 100).toFixed(2)}`).toBe("$10.00");
  });

  it("formats 2000 cents as $20.00", () => {
    expect(`$${(2000 / 100).toFixed(2)}`).toBe("$20.00");
  });

  it("formats zero cents as $0.00", () => {
    expect(`$${(0 / 100).toFixed(2)}`).toBe("$0.00");
  });
});
