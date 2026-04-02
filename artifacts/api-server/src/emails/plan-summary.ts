export interface PlanSummaryEmailProps {
  displayName: string | null;
  topModalities: Array<{ emoji: string; name: string; estimatedMonthlyCost: number; frequency: string }>;
  monthlyBudget: number;
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

export function planSummaryEmail(props: PlanSummaryEmailProps): { subject: string; html: string } {
  const name = escHtml(props.displayName ?? "there");
  const budget = `$${props.monthlyBudget.toLocaleString()}`;

  const modalityRows = props.topModalities
    .slice(0, 3)
    .map(
      (m) => `
      <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:rgba(212,34,126,0.04);border-radius:10px;margin-bottom:10px;border:1px solid rgba(212,34,126,0.1);">
        <span style="font-size:24px;flex-shrink:0;">${escHtml(m.emoji)}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-family:Georgia,serif;font-size:15px;font-weight:700;color:#2C2825;margin-bottom:2px;">${escHtml(m.name)}</div>
          <div style="font-family:Arial,sans-serif;font-size:12px;color:#6b7280;">${escHtml(m.frequency)} · ~$${m.estimatedMonthlyCost}/mo</div>
        </div>
        <div style="flex-shrink:0;background:#D4227E;color:white;font-family:Arial,sans-serif;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;">
          In your plan
        </div>
      </div>`,
    )
    .join("");

  const firstName = props.displayName
    ? props.displayName.split(" ")[0].replace(/[\r\n\t\x00-\x1F]/g, "").trim()
    : "";

  return {
    subject: `${firstName ? firstName + ", your" : "Your"} wellness plan is ready — here's what's inside`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Wellness Plan Summary</title>
</head>
<body style="margin:0;padding:0;background:#f8f6f1;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f1;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(212,34,126,0.08);max-width:600px;">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#D4227E 0%,#a8185f 100%);padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:22px;margin:0 0 4px;font-weight:700;">Health Plan Factory</h1>
        <p style="color:rgba(255,255,255,0.75);font-family:Arial,sans-serif;font-size:13px;margin:0;">Your personalized wellness plan</p>
      </td></tr>

      <!-- Greeting -->
      <tr><td style="padding:36px 40px 20px;">
        <h2 style="color:#2C2825;font-family:Georgia,serif;font-size:22px;margin:0 0 12px;font-weight:700;">
          Hey ${name} 👋 — don't lose momentum.
        </h2>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;margin:0;">
          You built a personalized wellness plan with a ${budget}/month budget — that's a real step forward.
          Here's a quick look at your top recommendations:
        </p>
      </td></tr>

      <!-- Modality cards -->
      <tr><td style="padding:0 40px 24px;">
        ${modalityRows || `<p style="color:#6b7280;font-family:Arial,sans-serif;font-size:14px;font-style:italic;margin:0;">Your plan modalities are ready to view.</p>`}
      </td></tr>

      <!-- Mid-CTA -->
      <tr><td style="padding:0 40px 28px;">
        <div style="background:rgba(212,34,126,0.05);border-left:4px solid #D4227E;border-radius:0 12px 12px 0;padding:18px 20px;">
          <p style="color:#2C2825;font-family:Arial,sans-serif;font-size:14px;font-weight:600;margin:0 0 6px;">
            💡 Next step: find matched providers near you
          </p>
          <p style="color:#6b7280;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;margin:0;">
            Upgrade to Plus to unlock full contact details and book sessions directly with vetted local providers — all within your plan.
          </p>
        </div>
      </td></tr>

      <!-- Primary CTA -->
      <tr><td style="padding:0 40px 16px;text-align:center;">
        <a href="${props.planUrl}" style="display:inline-block;background:#D4227E;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;padding:15px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">
          View My Full Plan →
        </a>
      </td></tr>

      <!-- Secondary CTA -->
      <tr><td style="padding:0 40px 32px;text-align:center;">
        <a href="${props.upgradeUrl}" style="display:inline-block;background:transparent;color:#D4227E;font-family:Arial,sans-serif;font-size:13px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;border:1.5px solid rgba(212,34,126,0.3);">
          Upgrade to Plus — Unlock All Providers
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
