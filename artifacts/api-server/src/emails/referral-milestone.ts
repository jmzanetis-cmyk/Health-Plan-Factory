interface ReferralMilestoneEmailProps {
  referrerName: string | null | undefined;
  milestoneName: string;
  milestoneEmoji: string;
  bonusCredit: string;
  totalRewardedCount: number;
  dashboardUrl: string;
}

export function referralMilestoneEmail({
  referrerName,
  milestoneName,
  milestoneEmoji,
  bonusCredit,
  totalRewardedCount,
  dashboardUrl,
}: ReferralMilestoneEmailProps): { subject: string; html: string } {
  const name = referrerName ?? "there";
  const subject = `${milestoneEmoji} You've reached ${milestoneName} — ${bonusCredit} bonus credit!`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation"
        style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#D4227E 0%,#b81c6a 100%);padding:32px 40px;text-align:center;">
            <div style="font-size:48px;margin-bottom:8px;">${milestoneEmoji}</div>
            <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0;letter-spacing:-0.5px;">
              Milestone Unlocked!
            </h1>
            <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:8px 0 0;">
              You've earned the <strong>${milestoneName}</strong> badge
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#2C2825;font-size:16px;margin:0 0 20px;">Hi ${name},</p>
            <p style="color:#4a5568;font-size:15px;line-height:1.6;margin:0 0 24px;">
              You've hit <strong>${totalRewardedCount} rewarded referral${totalRewardedCount !== 1 ? "s" : ""}</strong> — a real milestone
              in building the HealthPlanFactory community. As a thank-you, we're adding a
              <strong style="color:#D4227E;">${bonusCredit} bonus credit</strong> to your account.
            </p>

            <!-- Reward callout -->
            <div style="background:#fdf4f9;border:1.5px solid rgba(212,34,126,0.18);border-radius:12px;padding:20px;margin-bottom:28px;text-align:center;">
              <p style="color:#2C2825;font-size:14px;font-weight:600;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.06em;">Bonus Credit Added</p>
              <p style="color:#D4227E;font-size:32px;font-weight:700;margin:0;">${bonusCredit}</p>
              <p style="color:#6b8499;font-size:13px;margin:4px 0 0;">Applied automatically to your next modality unlock or upgrade</p>
            </div>

            <p style="color:#4a5568;font-size:15px;line-height:1.6;margin:0 0 28px;">
              Keep sharing your referral link — more milestones and bigger bonuses await as you grow your network.
            </p>

            <div style="text-align:center;margin-bottom:28px;">
              <a href="${dashboardUrl}"
                style="display:inline-block;background:#D4227E;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;">
                View My Referral Dashboard
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f5f2;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
            <p style="color:#9aabb8;font-size:12px;margin:0;">
              HealthPlanFactory · Wellness, optimized for you<br>
              You're receiving this because you earned a referral milestone.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
