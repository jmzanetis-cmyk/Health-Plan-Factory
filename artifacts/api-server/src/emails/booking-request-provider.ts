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

interface BookingRequestProviderProps {
  providerName: string;
  memberName: string | null;
  memberEmail: string;
  contactEmail: string | null;
  goal: string | null;
  requestedModality: string | null;
  message: string;
  note: string | null;
  appUrl: string;
}

export function bookingRequestProviderEmail(props: BookingRequestProviderProps): { subject: string; html: string } {
  const providerFirst = props.providerName.split(" ")[0].replace(/[\r\n\t\x00-\x1F]/g, "").trim();
  const memberFirst = props.memberName
    ? props.memberName.split(" ")[0].replace(/[\r\n\t\x00-\x1F]/g, "").trim()
    : "";
  const displayName = props.memberName ?? "A Health Plan Factory member";
  const replyEmail = props.contactEmail || props.memberEmail;
  // Include both modality and goal in subject when available; fallback gracefully
  const subjectParts = [props.requestedModality, props.goal].filter(Boolean);
  const subjectContext = subjectParts.length > 0 ? subjectParts.join(" · ") : null;

  return {
    subject: `A new client wants to book with you — ${displayName}${subjectContext ? `, ${subjectContext}` : ""}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Booking Request</title>
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
              A new client wants to book with you
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 18px;font-size:15px;color:${DEEP};font-family:Arial,sans-serif;line-height:1.6;">
              Hi ${escHtml(providerFirst || props.providerName)},
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:${DEEP};font-family:Arial,sans-serif;line-height:1.6;">
              A new client wants to book with you through Health Plan Factory. Here are their details:
            </p>

            <!-- Member info card -->
            <table cellpadding="0" cellspacing="0" width="100%" style="background:#fdf5f9;border:1.5px solid rgba(212,34,126,0.15);border-radius:12px;overflow:hidden;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${PINK};font-family:Arial,sans-serif;">Client name</p>
                  <p style="margin:0 0 14px;font-size:18px;font-weight:700;color:${NAVY};font-family:Georgia,serif;">
                    ${escHtml(displayName)}
                  </p>
                  <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${PINK};font-family:Arial,sans-serif;">Contact email</p>
                  <p style="margin:0 0 14px;font-size:14px;color:${DEEP};font-family:Arial,sans-serif;">
                    <a href="mailto:${escHtml(replyEmail)}" style="color:${PINK};text-decoration:none;">${escHtml(replyEmail)}</a>
                  </p>
                  ${props.requestedModality ? `
                  <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${PINK};font-family:Arial,sans-serif;">Requested modality</p>
                  <p style="margin:0 0 14px;font-size:14px;color:${DEEP};font-family:Arial,sans-serif;">${escHtml(props.requestedModality)}</p>
                  ` : ""}
                  ${props.goal ? `
                  <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${PINK};font-family:Arial,sans-serif;">Wellness goal</p>
                  <p style="margin:0;font-size:14px;color:${DEEP};font-family:Arial,sans-serif;">${escHtml(props.goal)}</p>
                  ` : ""}
                </td>
              </tr>
            </table>

            <!-- Message -->
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${PINK};font-family:Arial,sans-serif;">
              Their message
            </p>
            <div style="background:#f8f6f1;border-left:3px solid ${PINK};border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:${props.note ? "24px" : "0"};">
              <p style="margin:0;font-size:14px;color:${DEEP};font-family:Arial,sans-serif;line-height:1.65;white-space:pre-wrap;">${escHtml(props.message)}</p>
            </div>

            ${props.note ? `
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${PINK};font-family:Arial,sans-serif;">
              Additional note
            </p>
            <div style="background:#f8f6f1;border-left:3px solid rgba(212,34,126,0.3);border-radius:0 8px 8px 0;padding:14px 18px;">
              <p style="margin:0;font-size:14px;color:${DEEP};font-family:Arial,sans-serif;line-height:1.65;white-space:pre-wrap;">${escHtml(props.note)}</p>
            </div>
            ` : ""}
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 36px 28px;">
            <p style="margin:0 0 16px;font-size:14px;color:#6b7280;font-family:Arial,sans-serif;line-height:1.6;">
              Reply directly to <strong>${escHtml(replyEmail)}</strong> to schedule a session.
              This request was submitted through Health Plan Factory — you're under no obligation to accept.
            </p>
            <a href="mailto:${escHtml(replyEmail)}" style="display:inline-block;background:${PINK};color:white;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;font-family:Arial,sans-serif;">
              Reply to ${escHtml(memberFirst || displayName)} →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #f0ece6;">
            <p style="margin:0;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif;line-height:1.6;">
              You received this because a member found your listing on Health Plan Factory.
              Questions? Contact us at <a href="mailto:support@healthplanfactory.com" style="color:${PINK};text-decoration:none;">support@healthplanfactory.com</a>
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
