export interface SessionConfirmedEmailProps {
  displayName: string | null;
  modalityName: string;
  sessionDate: string | null;
  note: string | null;
  progressUrl: string;
}

export function sessionConfirmedEmail(props: SessionConfirmedEmailProps): { subject: string; html: string } {
  const name = props.displayName ?? "there";
  const dateStr = props.sessionDate
    ? new Date(props.sessionDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "today";
  return {
    subject: `Session logged: ${props.modalityName} on ${dateStr}`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f6f1;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f1;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(27,45,79,0.08);">
      <tr><td style="background:#1b2d4f;padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;">Health Plan Factory</h1>
      </td></tr>
      <tr><td style="padding:40px;">
        <h2 style="color:#1b2d4f;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Session logged, ${name}! ✓</h2>
        <div style="background:rgba(27,45,79,0.04);border:1px solid rgba(27,45,79,0.08);border-radius:10px;padding:20px;margin-bottom:24px;">
          <p style="color:#1b2d4f;font-family:Arial,sans-serif;font-size:18px;font-weight:700;margin:0 0 4px;">${props.modalityName}</p>
          <p style="color:#6b7280;font-family:Arial,sans-serif;font-size:14px;margin:0;">${dateStr}</p>
          ${props.note ? `<p style="color:#4a5568;font-family:Arial,sans-serif;font-size:14px;margin:12px 0 0;font-style:italic;">"${props.note}"</p>` : ""}
        </div>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 28px;">
          Great work! Your session has been recorded. Keep tracking your progress to build momentum on your wellness plan.
        </p>
        <a href="${props.progressUrl}" style="display:inline-block;background:#1b2d4f;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">View My Progress →</a>
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
