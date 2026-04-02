export interface ReviewNudgeEmailProps {
  displayName: string | null;
  providerName: string;
  providerId: string;
  reviewUrl: string;
}

export function reviewNudgeEmail(props: ReviewNudgeEmailProps): { subject: string; html: string } {
  const name = props.displayName ?? "there";
  return {
    subject: `How was your session with ${props.providerName}?`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f6f1;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f1;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(212,34,126,0.08);">
      <tr><td style="background:linear-gradient(135deg,#d4227e,#e02040);padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;">Health Plan Factory</h1>
      </td></tr>
      <tr><td style="padding:40px;">
        <h2 style="color:#d4227e;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">How was your session? ⭐</h2>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 20px;">
          Hi ${name}, your session with <strong>${props.providerName}</strong> has passed.
          We'd love to hear how it went! Your review helps other members make informed decisions.
        </p>
        <div style="background:rgba(212,34,126,0.04);border:1px solid rgba(212,34,126,0.12);border-radius:10px;padding:20px;margin-bottom:28px;text-align:center;">
          <p style="color:#d4227e;font-family:Georgia,serif;font-size:18px;font-weight:700;margin:0 0 6px;">${props.providerName}</p>
          <p style="color:#6b7280;font-family:Arial,sans-serif;font-size:14px;margin:0;">Rate 1–5 stars and leave a short review</p>
        </div>
        <a href="${props.reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4227e,#e02040);color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Leave a Review →</a>
        <p style="color:#9ca3af;font-family:Arial,sans-serif;font-size:13px;margin:24px 0 0;">
          Reviews are visible to all members and help build a trusted wellness community.
        </p>
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid rgba(212,34,126,0.06);text-align:center;">
        <p style="color:#9ca3af;font-family:Arial,sans-serif;font-size:12px;margin:0;">© Health Plan Factory</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  };
}
