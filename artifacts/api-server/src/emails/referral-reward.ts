export interface ReferralRewardEmailProps {
  referrerName: string | null;
  referredName: string | null;
  creditAmountFormatted: string;
  dashboardUrl: string;
}

export function referralRewardEmail(props: ReferralRewardEmailProps): { subject: string; html: string } {
  const name = props.referrerName ?? "there";
  const referred = props.referredName ?? "your friend";
  return {
    subject: `You earned ${props.creditAmountFormatted} — ${referred} joined Health Plan Factory!`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f6f1;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f1;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(27,45,79,0.08);">
      <tr><td style="background:#1b2d4f;padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;">Health Plan Factory</h1>
      </td></tr>
      <tr><td style="padding:40px;">
        <h2 style="color:#1b2d4f;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Your referral paid off, ${name}!</h2>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 20px;">
          Great news — ${referred} has joined Health Plan Factory and generated their first wellness plan. As a thank-you, you've just earned <strong>${props.creditAmountFormatted} in credits</strong> toward your next modality unlock.
        </p>
        <div style="background:rgba(184,137,42,0.06);border:1px solid rgba(184,137,42,0.2);border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
          <p style="color:#6b7280;font-family:Arial,sans-serif;font-size:13px;font-weight:600;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.06em;">Credits Earned</p>
          <p style="color:#b8892a;font-family:Georgia,serif;font-size:28px;font-weight:700;margin:0;">${props.creditAmountFormatted}</p>
        </div>
        <a href="${props.dashboardUrl}" style="display:inline-block;background:#1b2d4f;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Go to My Dashboard →</a>
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
