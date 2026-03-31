export interface AccountabilityNudgeEmailProps {
  displayName: string | null;
  weeklySessionCount: number;
  currentStreak: number;
  daysSinceLastSession: number | null;
  dashboardUrl: string;
  type: "weekly-summary" | "streak-at-risk";
}

export function accountabilityNudgeEmail(props: AccountabilityNudgeEmailProps): { subject: string; html: string } {
  const name = props.displayName ?? "there";
  const isStreakRisk = props.type === "streak-at-risk";

  const subject = isStreakRisk
    ? `Don't lose your ${props.currentStreak}-day streak!`
    : `Your weekly wellness summary`;

  const headline = isStreakRisk
    ? `Your streak is at risk, ${name}!`
    : `Weekly summary, ${name}`;

  const message = isStreakRisk
    ? `You haven't logged a session in ${props.daysSinceLastSession ?? "several"} day(s). Log one today to keep your ${props.currentStreak}-day streak alive!`
    : `You logged <strong>${props.weeklySessionCount} sessions</strong> this week. ${props.currentStreak > 0 ? `Your current streak is <strong>${props.currentStreak} days</strong> — keep it up!` : "Start building your streak by logging a session today."}`;

  return {
    subject,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f6f1;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f1;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(27,45,79,0.08);">
      <tr><td style="background:${isStreakRisk ? "#b8892a" : "#1b2d4f"};padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;">Health Plan Factory</h1>
      </td></tr>
      <tr><td style="padding:40px;">
        <h2 style="color:#1b2d4f;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">${headline}</h2>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 28px;">${message}</p>
        <a href="${props.dashboardUrl}" style="display:inline-block;background:#1b2d4f;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Log a Session →</a>
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid rgba(27,45,79,0.06);text-align:center;">
        <p style="color:#9ca3af;font-family:Arial,sans-serif;font-size:12px;margin:0;">© Health Plan Factory</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  };
}
