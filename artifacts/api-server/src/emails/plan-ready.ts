export interface PlanReadyEmailProps {
  displayName: string | null;
  planUrl: string;
  modalityCount: number;
  monthlyBudget: number;
}

export function planReadyEmail(props: PlanReadyEmailProps): { subject: string; html: string } {
  const name = props.displayName ?? "there";
  const budget = `$${props.monthlyBudget.toLocaleString()}`;
  return {
    subject: "Your personalized wellness plan is ready!",
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f6f1;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f1;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(27,45,79,0.08);">
      <tr><td style="background:#1b2d4f;padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;">Health Plan Factory</h1>
      </td></tr>
      <tr><td style="padding:40px;">
        <h2 style="color:#1b2d4f;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Your plan is ready, ${name}! 🎉</h2>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 20px;">
          Your AI-powered wellness plan includes <strong>${props.modalityCount} modalities</strong> tailored to your goals — all within your <strong>${budget}/month</strong> budget.
        </p>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 28px;">
          Review your recommendations, save the plan, and start booking sessions with local providers.
        </p>
        <a href="${props.planUrl}" style="display:inline-block;background:#3d6b52;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">View My Plan →</a>
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
