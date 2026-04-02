const PINK = "#D4227E";
const NAVY = "#1a2a3a";
const DEEP = "#2C2825";

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface BookingRequestMemberProps {
  memberName: string | null;
  providerName: string;
  message: string;
  appUrl: string;
}

export function bookingRequestMemberEmail(props: BookingRequestMemberProps): { subject: string; html: string } {
  const firstName = props.memberName
    ? props.memberName.split(" ")[0].replace(/[\r\n\t\x00-\x1F]/g, "").trim()
    : "";

  return {
    subject: `Your booking request was sent to ${escHtml(props.providerName)}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Booking Request Sent</title>
</head>
<body style="margin:0;padding:0;background:#f8f6f1;font-family:Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8f6f1;padding:32px 0;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" width="600" style="background:white;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${PINK} 0%,#E02040 100%);padding:28px 36px;">
            <p style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:700;color:white;letter-spacing:-0.3px;">
              Health Plan Factory
            </p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);font-family:Arial,sans-serif;">
              Your booking request was sent
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 18px;font-size:15px;color:${DEEP};font-family:Arial,sans-serif;line-height:1.6;">
              Hi ${escHtml(firstName || "there")},
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:${DEEP};font-family:Arial,sans-serif;line-height:1.6;">
              Great news — your booking request has been sent to <strong>${escHtml(props.providerName)}</strong>.
              They'll reach out directly to your email address to schedule your session.
            </p>

            <!-- What happens next card -->
            <table cellpadding="0" cellspacing="0" width="100%" style="background:#fdf5f9;border:1.5px solid rgba(212,34,126,0.15);border-radius:12px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 14px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${PINK};font-family:Arial,sans-serif;">
                    What happens next
                  </p>
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:${DEEP};font-family:Arial,sans-serif;line-height:1.5;">
                        <span style="color:${PINK};font-weight:700;margin-right:8px;">1.</span>
                        ${escHtml(props.providerName)} reviews your request
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:${DEEP};font-family:Arial,sans-serif;line-height:1.5;">
                        <span style="color:${PINK};font-weight:700;margin-right:8px;">2.</span>
                        They contact you directly by email to arrange a session
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:14px;color:${DEEP};font-family:Arial,sans-serif;line-height:1.5;">
                        <span style="color:${PINK};font-weight:700;margin-right:8px;">3.</span>
                        Log your session in Health Plan Factory to track your progress
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Message recap -->
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${PINK};font-family:Arial,sans-serif;">
              Message you sent
            </p>
            <div style="background:#f8f6f1;border-left:3px solid ${PINK};border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:28px;">
              <p style="margin:0;font-size:14px;color:${DEEP};font-family:Arial,sans-serif;line-height:1.65;white-space:pre-wrap;">${escHtml(props.message)}</p>
            </div>

            <!-- CTA -->
            <a href="${props.appUrl}/providers" style="display:inline-block;background:${PINK};color:white;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;font-family:Arial,sans-serif;margin-bottom:24px;">
              Browse more providers →
            </a>

            <p style="margin:0;font-size:13px;color:#6b7280;font-family:Arial,sans-serif;line-height:1.6;">
              Keep building your wellness routine. Your plan is waiting for you in the app.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #f0ece6;">
            <p style="margin:0;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;line-height:1.6;">
              You submitted this booking request through Health Plan Factory.
              If you have questions, contact us at <a href="mailto:support@healthplanfactory.com" style="color:${PINK};text-decoration:none;">support@healthplanfactory.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}
