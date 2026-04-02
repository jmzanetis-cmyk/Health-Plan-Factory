export interface ProviderRejectedEmailProps {
  displayName: string | null;
  providerName: string;
  rejectionReason?: string | null;
  reapplyUrl: string;
}

export function providerRejectedEmail(props: ProviderRejectedEmailProps): { subject: string; html: string } {
  const name = props.displayName ?? "there";
  const reasonBlock = props.rejectionReason
    ? `<div style="background:#fef3f3;border:1px solid rgba(192,57,43,0.15);border-radius:10px;padding:16px;margin:0 0 24px;">
        <p style="color:#c0392b;font-family:Arial,sans-serif;font-size:14px;margin:0 0 4px;font-weight:600;">Reason provided:</p>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:14px;margin:0;line-height:1.6;">${props.rejectionReason}</p>
       </div>`
    : "";
  return {
    subject: "Update on your Health Plan Factory provider application",
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f1;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f1;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(212,34,126,0.1);">
      <tr><td style="background:#d4227e;padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;font-weight:700;">Health Plan Factory</h1>
      </td></tr>
      <tr><td style="padding:40px;">
        <h2 style="color:#1b2d4f;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Hi ${name},</h2>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 16px;">
          Thank you for applying to list <strong>${props.providerName}</strong> on Health Plan Factory. After review, we were unable to approve this application at this time.
        </p>
        ${reasonBlock}
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 28px;">
          You're welcome to update your information and reapply. If you have questions, please reach out to our provider support team.
        </p>
        <div style="text-align:center;">
          <a href="${props.reapplyUrl}" style="display:inline-block;background:#1b2d4f;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Contact Support</a>
        </div>
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
