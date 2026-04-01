export interface WeeklyDigestEmailProps {
  displayName: string | null;
  wellnessScoreThisWeek: number | null;
  wellnessScoreLastWeek: number | null;
  habitsCompleted: number;
  habitsPlanned: number;
  upcomingSessions: Array<{ modalityName: string; sessionDate: Date }>;
  aiMotivationalTip: string;
  topGoal: string | null;
  dashboardUrl: string;
  profileUrl?: string;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function weeklyDigestEmail(props: WeeklyDigestEmailProps): { subject: string; html: string } {
  const name = escHtml(props.displayName ?? "there");
  const profileUrl = props.profileUrl ?? props.dashboardUrl.replace(/\/dashboard$/, "/profile");

  const scoreDelta =
    props.wellnessScoreThisWeek != null && props.wellnessScoreLastWeek != null
      ? props.wellnessScoreThisWeek - props.wellnessScoreLastWeek
      : null;

  const scoreDisplay =
    props.wellnessScoreThisWeek != null
      ? `${props.wellnessScoreThisWeek}/10`
      : "—";

  const scoreTrendLabel =
    scoreDelta == null
      ? ""
      : scoreDelta > 0
      ? `▲ ${scoreDelta > 0 ? "+" : ""}${scoreDelta.toFixed(1)} from last week`
      : scoreDelta < 0
      ? `▼ ${Math.abs(scoreDelta).toFixed(1)} from last week`
      : "→ Same as last week";

  const scoreTrendColor =
    scoreDelta == null ? "#6b7280" : scoreDelta >= 0 ? "#16a34a" : "#dc2626";

  const habitRate =
    props.habitsPlanned > 0
      ? Math.round((props.habitsCompleted / props.habitsPlanned) * 100)
      : 0;

  const habitBar = Math.min(habitRate, 100);

  const upcomingSessionsHtml =
    props.upcomingSessions.length === 0
      ? `<p style="color:#6b7280;font-family:Arial,sans-serif;font-size:14px;margin:0;font-style:italic;">No upcoming sessions scheduled.</p>`
      : props.upcomingSessions
          .slice(0, 3)
          .map((s) => {
            const dateStr = new Date(s.sessionDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });
            return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(27,45,79,0.04);border-radius:8px;margin-bottom:8px;">
          <span style="font-size:18px;">📅</span>
          <div>
            <div style="font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:#1b2d4f;">${escHtml(s.modalityName)}</div>
            <div style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280;">${escHtml(dateStr)}</div>
          </div>
        </div>`;
          })
          .join("");

  const goalLine = props.topGoal
    ? `<p style="color:#6b7280;font-family:Arial,sans-serif;font-size:13px;margin:0 0 6px;">Goal: <strong style="color:#1b2d4f;">${escHtml(props.topGoal)}</strong></p>`
    : "";

  return {
    subject: `Your weekly wellness digest, ${name} 🌿`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Weekly Wellness Digest</title>
</head>
<body style="margin:0;padding:0;background:#f8f6f1;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f1;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(27,45,79,0.08);max-width:600px;">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#1b2d4f 0%,#243d68 100%);padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:22px;margin:0 0 6px;font-weight:700;">Health Plan Factory</h1>
        <p style="color:rgba(255,255,255,0.75);font-family:Arial,sans-serif;font-size:13px;margin:0;">Weekly Wellness Digest</p>
      </td></tr>

      <!-- Greeting -->
      <tr><td style="padding:32px 40px 16px;">
        <h2 style="color:#1b2d4f;font-family:Georgia,serif;font-size:20px;margin:0 0 8px;font-weight:700;">Good morning, ${name}! 👋</h2>
        ${goalLine}
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;margin:0;">
          Here's your personalized wellness summary for the week.
        </p>
      </td></tr>

      <!-- Wellness Score -->
      <tr><td style="padding:0 40px 24px;">
        <div style="background:rgba(27,45,79,0.04);border-radius:12px;padding:20px 24px;border:1px solid rgba(27,45,79,0.08);">
          <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;margin-bottom:10px;">Wellness Score</div>
          <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;">
            <span style="font-family:Georgia,serif;font-size:36px;font-weight:700;color:#1b2d4f;">${scoreDisplay}</span>
            ${scoreDelta != null ? `<span style="font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:${scoreTrendColor};">${scoreTrendLabel}</span>` : ""}
          </div>
        </div>
      </td></tr>

      <!-- Habit Completions -->
      <tr><td style="padding:0 40px 24px;">
        <div style="background:rgba(27,45,79,0.04);border-radius:12px;padding:20px 24px;border:1px solid rgba(27,45,79,0.08);">
          <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;margin-bottom:10px;">Habits This Week</div>
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:12px;">
            <span style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#1b2d4f;">${props.habitsCompleted}</span>
            <span style="font-family:Arial,sans-serif;font-size:14px;color:#6b7280;">of ${props.habitsPlanned} sessions completed</span>
          </div>
          <div style="background:#e5e7eb;border-radius:999px;height:8px;overflow:hidden;">
            <div style="background:linear-gradient(90deg,#1b2d4f,#2d5490);height:100%;width:${habitBar}%;border-radius:999px;transition:width 0.3s;"></div>
          </div>
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280;margin-top:6px;">${habitRate}% completion rate</div>
        </div>
      </td></tr>

      <!-- Upcoming Sessions -->
      <tr><td style="padding:0 40px 24px;">
        <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;margin-bottom:10px;">Upcoming Sessions</div>
        ${upcomingSessionsHtml}
      </td></tr>

      <!-- AI Motivational Tip -->
      <tr><td style="padding:0 40px 28px;">
        <div style="background:linear-gradient(135deg,rgba(27,45,79,0.06) 0%,rgba(27,45,79,0.03) 100%);border-left:4px solid #1b2d4f;border-radius:0 12px 12px 0;padding:20px 24px;">
          <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#1b2d4f;margin-bottom:10px;">✨ Your AI Coach Says</div>
          <p style="color:#2d3748;font-family:Georgia,serif;font-size:15px;line-height:1.7;margin:0;font-style:italic;">"${escHtml(props.aiMotivationalTip)}"</p>
        </div>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:0 40px 36px;text-align:center;">
        <a href="${props.dashboardUrl}" style="display:inline-block;background:#1b2d4f;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;text-decoration:none;">
          View My Dashboard →
        </a>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:24px 40px;border-top:1px solid rgba(27,45,79,0.06);text-align:center;">
        <p style="color:#9ca3af;font-family:Arial,sans-serif;font-size:12px;margin:0 0 6px;">
          © Health Plan Factory. You're receiving this because you subscribed to weekly digests.
        </p>
        <p style="color:#9ca3af;font-family:Arial,sans-serif;font-size:12px;margin:0;">
          <a href="${profileUrl}" style="color:#9ca3af;text-decoration:underline;">Manage email preferences</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
  };
}
