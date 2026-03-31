export interface PaymentDueEmailProps {
  displayName: string | null;
  amountFormatted: string;
  dueDate?: string;
  dashboardUrl: string;
}

export function paymentDueEmail(props: PaymentDueEmailProps): { subject: string; html: string } {
  const name = props.displayName ?? "there";
  return {
    subject: `Payment reminder: ${props.amountFormatted} due`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8f6f1;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f1;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid rgba(27,45,79,0.08);">
      <tr><td style="background:#1b2d4f;padding:32px 40px;text-align:center;">
        <h1 style="color:#ffffff;font-family:Georgia,serif;font-size:24px;margin:0;">Health Plan Factory</h1>
      </td></tr>
      <tr><td style="padding:40px;">
        <h2 style="color:#1b2d4f;font-family:Georgia,serif;font-size:20px;margin:0 0 16px;">Payment reminder, ${name}</h2>
        <div style="background:rgba(220,53,53,0.04);border:1px solid rgba(220,53,53,0.15);border-radius:10px;padding:20px;margin-bottom:24px;">
          <p style="color:#1b2d4f;font-family:Arial,sans-serif;font-size:28px;font-weight:700;margin:0;">${props.amountFormatted}</p>
          ${props.dueDate ? `<p style="color:#6b7280;font-family:Arial,sans-serif;font-size:14px;margin:6px 0 0;">Due: ${props.dueDate}</p>` : ""}
        </div>
        <p style="color:#4a5568;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 28px;">
          You have an outstanding balance on your account. Please visit your dashboard to review and complete your payment.
        </p>
        <a href="${props.dashboardUrl}" style="display:inline-block;background:#1b2d4f;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Pay Now →</a>
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
