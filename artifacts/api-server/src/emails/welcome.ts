export interface WelcomeEmailProps {
  displayName: string | null;
  loginUrl: string;
}

export function welcomeEmail(props: WelcomeEmailProps): { subject: string; html: string } {
  const name = props.displayName ?? "there";
  return {
    subject: "Welcome to Health Plan Factory!",
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f6f1;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f1;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(27,45,79,0.08);">
      <tr><td style="background:#1b2d4f;padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;font-weight:700;">Health Plan Factory</h1>
      </td></tr>
      <tr><td style="padding:40px;">
        <h2 style="color:#1b2d4f;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Welcome, ${name}!</h2>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 20px;">
          You've taken the first step toward a healthier life. Health Plan Factory helps you build a personalized wellness plan combining the best of holistic and conventional care.
        </p>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 28px;">
          Complete your health intake to get your first AI-powered plan recommendation.
        </p>
        <a href="${props.loginUrl}" style="display:inline-block;background:#1b2d4f;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Get Started →</a>
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid rgba(27,45,79,0.06);text-align:center;">
        <p style="color:#9ca3af;font-family:Arial,sans-serif;font-size:12px;margin:0;">© Health Plan Factory. You're receiving this because you signed up.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  };
}
