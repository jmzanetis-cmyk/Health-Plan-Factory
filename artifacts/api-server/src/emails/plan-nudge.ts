export interface PlanNudgeEmailProps {
  displayName: string | null;
  topModalities: Array<{ emoji: string; name: string }>;
  monthlyBudget: number;
  nearbyProviderCount: number;
  planUrl: string;
  upgradeUrl: string;
  unsubscribeUrl: string;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function planNudgeEmail(props: PlanNudgeEmailProps): { subject: string; html: string } {
  const name = escHtml(props.displayName ?? "there");
  const budget = `$${props.monthlyBudget.toLocaleString()}`;
  const providerLine = props.nearbyProviderCount > 0
    ? `${props.nearbyProviderCount} matched provider${props.nearbyProviderCount === 1 ? "" : "s"} near you are`
    : "Vetted local providers are";

  const modalityPills = props.topModalities
    .slice(0, 3)
    .map((m) => `<span style="display:inline-block;background:rgba(212,34,126,0.08);border:1px solid rgba(212,34,126,0.15);border-radius:999px;padding:5px 14px;font-family:Arial,sans-serif;font-size:13px;color:#2C2825;margin:4px;">${escHtml(m.emoji)} ${escHtml(m.name)}</span>`)
    .join("");

  return {
    subject: `${providerLine} waiting for you, ${props.displayName ? props.displayName.split(" ")[0] : "there"}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Matched Providers Are Waiting</title>
</head>
<body style="margin:0;padding:0;background:#f8f6f1;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f1;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(212,34,126,0.08);max-width:600px;">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#2C2825 0%,#1a2a3a 100%);padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:22px;margin:0 0 4px;font-weight:700;">Health Plan Factory</h1>
        <p style="color:rgba(255,255,255,0.6);font-family:Arial,sans-serif;font-size:13px;margin:0;">Your providers are waiting</p>
      </td></tr>

      <!-- Greeting -->
      <tr><td style="padding:36px 40px 20px;">
        <h2 style="color:#2C2825;font-family:Georgia,serif;font-size:22px;margin:0 0 14px;font-weight:700;">
          ${name}, your plan is just one step away.
        </h2>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;margin:0 0 16px;">
          You built a ${budget}/month wellness plan — but haven't connected with any providers yet.
          ${providerLine} ready to book sessions for your plan:
        </p>
        <div style="margin:0 0 8px;">
          ${modalityPills}
        </div>
      </td></tr>

      <!-- Stats row -->
      <tr><td style="padding:0 40px 28px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:120px;background:rgba(212,34,126,0.05);border:1px solid rgba(212,34,126,0.12);border-radius:12px;padding:18px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#D4227E;line-height:1;">${props.nearbyProviderCount > 0 ? props.nearbyProviderCount : "10+"}</div>
            <div style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280;margin-top:4px;">Matched providers</div>
          </div>
          <div style="flex:1;min-width:120px;background:rgba(212,34,126,0.05);border:1px solid rgba(212,34,126,0.12);border-radius:12px;padding:18px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#D4227E;line-height:1;">$0</div>
            <div style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280;margin-top:4px;">Unlock fee with Plus</div>
          </div>
          <div style="flex:1;min-width:120px;background:rgba(212,34,126,0.05);border:1px solid rgba(212,34,126,0.12);border-radius:12px;padding:18px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;color:#D4227E;line-height:1;">14</div>
            <div style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280;margin-top:4px;">Day free trial</div>
          </div>
        </div>
      </td></tr>

      <!-- Value prop -->
      <tr><td style="padding:0 40px 28px;">
        <div style="background:#f8f6f1;border-radius:12px;padding:20px 24px;">
          <p style="color:#2C2825;font-family:Arial,sans-serif;font-size:14px;font-weight:600;margin:0 0 10px;">What Plus unlocks for you:</p>
          <ul style="margin:0;padding-left:20px;color:#4a5568;font-family:Arial,sans-serif;font-size:13px;line-height:2;">
            <li>Full contact info for every matched provider</li>
            <li>Direct booking through the platform</li>
            <li>AI accountability coach &amp; routine builder</li>
            <li>HSA/FSA spending log per session</li>
            <li>Progress tracking &amp; wellness score</li>
          </ul>
        </div>
      </td></tr>

      <!-- Primary CTA -->
      <tr><td style="padding:0 40px 12px;text-align:center;">
        <a href="${props.upgradeUrl}" style="display:inline-block;background:#D4227E;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;padding:15px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">
          Upgrade to Plus — Start 14-Day Free Trial →
        </a>
      </td></tr>

      <!-- Secondary CTA -->
      <tr><td style="padding:0 40px 32px;text-align:center;">
        <a href="${props.planUrl}" style="display:inline-block;color:#D4227E;font-family:Arial,sans-serif;font-size:13px;font-weight:500;text-decoration:underline;">
          View my plan first →
        </a>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:24px 40px;border-top:1px solid rgba(212,34,126,0.08);text-align:center;">
        <p style="color:#9ca3af;font-family:Arial,sans-serif;font-size:12px;margin:0 0 6px;">
          © Health Plan Factory · You're receiving this because you created a wellness plan.
        </p>
        <p style="color:#9ca3af;font-family:Arial,sans-serif;font-size:12px;margin:0;">
          <a href="${props.unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Manage email preferences</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
  };
}
