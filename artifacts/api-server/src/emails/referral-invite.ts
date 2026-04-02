export interface ReferralInviteEmailProps {
  referrerName: string | null;
  referralCode: string;
  signupUrl: string;
  personalNote?: string | null;
}

export function referralInviteEmail(props: ReferralInviteEmailProps): { subject: string; html: string } {
  const referrer = props.referrerName ?? "A friend";
  const noteHtml = props.personalNote
    ? `<div style="background:#fdf4f9;border-left:4px solid #D4227E;border-radius:4px;padding:16px 20px;margin-bottom:24px;">
        <p style="color:#2C2825;font-family:Arial,sans-serif;font-size:14px;font-style:italic;line-height:1.6;margin:0;">"${props.personalNote.replace(/"/g, "&quot;")}"</p>
        <p style="color:#6b7280;font-family:Arial,sans-serif;font-size:12px;margin:8px 0 0;">— ${referrer}</p>
      </div>`
    : "";

  return {
    subject: `${referrer} invited you to Health Plan Factory`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f5f2;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f5f2;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(212,34,126,0.08);">
      <tr><td style="background:linear-gradient(135deg,#D4227E 0%,#b81c6a 100%);padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;">Health Plan Factory</h1>
        <p style="color:rgba(255,255,255,0.8);font-family:Arial,sans-serif;font-size:14px;margin:6px 0 0;">Wellness, optimized for you</p>
      </td></tr>
      <tr><td style="padding:40px;">
        <h2 style="color:#2C2825;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">${referrer} wants you to join!</h2>
        ${noteHtml}
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 20px;">
          You've been invited to Health Plan Factory — the AI-powered wellness planning tool that builds personalized health plans combining holistic and conventional care.
        </p>
        <div style="background:rgba(212,34,126,0.04);border:1.5px solid rgba(212,34,126,0.15);border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
          <p style="color:#6b7280;font-family:Arial,sans-serif;font-size:13px;font-weight:600;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.06em;">Your referral code</p>
          <p style="color:#2C2825;font-family:monospace;font-size:24px;font-weight:700;letter-spacing:0.1em;margin:0;">${props.referralCode}</p>
        </div>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 28px;">
          Sign up and get <strong style="color:#D4227E;">$3 in free credits</strong> to unlock your first wellness modality.
        </p>
        <div style="text-align:center;">
          <a href="${props.signupUrl}" style="display:inline-block;background:#D4227E;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">Join Health Plan Factory →</a>
        </div>
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid rgba(212,34,126,0.06);text-align:center;">
        <p style="color:#9ca3af;font-family:Arial,sans-serif;font-size:12px;margin:0;">© Health Plan Factory · Wellness, optimized for you</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  };
}
