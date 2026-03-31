export type MagicLinkAction = "login" | "payment" | "appointment" | "accountability";

export interface MagicLinkEmailProps {
  displayName: string | null;
  action: MagicLinkAction;
  magicLinkUrl: string;
  expiresInMinutes: number;
}

const actionLabels: Record<MagicLinkAction, { title: string; cta: string; description: string }> = {
  login: {
    title: "Sign in to Health Plan Factory",
    cta: "Sign In →",
    description: "Click the button below to sign in instantly — no password needed.",
  },
  payment: {
    title: "Confirm your payment",
    cta: "Confirm Payment →",
    description: "Click the button below to confirm and complete your payment.",
  },
  appointment: {
    title: "Accept your appointment",
    cta: "Accept Appointment →",
    description: "Click the button below to confirm your upcoming wellness session.",
  },
  accountability: {
    title: "Complete your check-in",
    cta: "Check In Now →",
    description: "Click the button below to log your accountability check-in.",
  },
};

export function magicLinkEmail(props: MagicLinkEmailProps): { subject: string; html: string } {
  const name = props.displayName ?? "there";
  const labels = actionLabels[props.action];
  return {
    subject: labels.title,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f6f1;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f1;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(27,45,79,0.08);">
      <tr><td style="background:#1b2d4f;padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;">Health Plan Factory</h1>
      </td></tr>
      <tr><td style="padding:40px;">
        <h2 style="color:#1b2d4f;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Hi ${name},</h2>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 28px;">${labels.description}</p>
        <a href="${props.magicLinkUrl}" style="display:inline-block;background:#1b2d4f;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">${labels.cta}</a>
        <p style="color:#9ca3af;font-family:Arial,sans-serif;font-size:13px;margin:24px 0 0;">
          This link expires in ${props.expiresInMinutes} minutes and can only be used once. If you didn't request this, you can safely ignore this email.
        </p>
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
