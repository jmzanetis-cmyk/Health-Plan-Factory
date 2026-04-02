export interface ProviderApprovedEmailProps {
  displayName: string | null;
  providerName: string;
  dashboardUrl: string;
}

export function providerApprovedEmail(props: ProviderApprovedEmailProps): { subject: string; html: string } {
  const name = props.displayName ?? "there";
  return {
    subject: "Congratulations! Your provider listing has been approved",
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f1;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f1;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(212,34,126,0.1);">
      <tr><td style="background:linear-gradient(135deg,#d4227e 0%,#e02040 100%);padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;font-weight:700;">Health Plan Factory</h1>
        <p style="color:rgba(255,255,255,0.8);font-family:Arial,sans-serif;font-size:13px;margin:8px 0 0;">For Providers</p>
      </td></tr>
      <tr><td style="padding:40px;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-block;width:56px;height:56px;background:#f0faf5;border-radius:50%;line-height:56px;font-size:28px;">✓</div>
        </div>
        <h2 style="color:#d4227e;font-family:Georgia,serif;font-size:22px;margin:0 0 12px;text-align:center;">You're approved, ${name}!</h2>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 16px;text-align:center;">
          Your listing for <strong>${props.providerName}</strong> is now live on Health Plan Factory.
        </p>
        <div style="background:#fdf5f9;border:1px solid rgba(212,34,126,0.12);border-radius:12px;padding:20px;margin:0 0 28px;">
          <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:14px;margin:0 0 8px;font-weight:600;">What happens next:</p>
          <ul style="color:#4a5568;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;margin:0;padding-left:20px;">
            <li>Members searching for your specialties can now find your profile</li>
            <li>Log into your Provider Dashboard to manage your listing and view leads</li>
            <li>Update your availability, bio, and pricing at any time</li>
          </ul>
        </div>
        <div style="text-align:center;">
          <a href="${props.dashboardUrl}" style="display:inline-block;background:#d4227e;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;text-decoration:none;">Go to My Dashboard →</a>
        </div>
      </td></tr>
      <tr><td style="padding:24px 40px;border-top:1px solid rgba(212,34,126,0.06);text-align:center;">
        <p style="color:#9ca3af;font-family:Arial,sans-serif;font-size:12px;margin:0;">© Health Plan Factory · You're receiving this because you applied as a provider.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  };
}
