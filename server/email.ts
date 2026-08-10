/**
 * Email helper — sends transactional emails via Resend.
 * Used for password reset emails and invite notifications.
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "BusinessCadence <noreply@businesscadence.com>";

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: "Reset your BusinessCadence password",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background-color:#0A1929;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A1929;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://businesscadence.com/manus-storage/business-cadence-heart-email_bad58bc7.png"
                   alt="BusinessCadence" height="60" width="60" style="height:60px;width:60px;display:block;" />
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.05);border:1px solid rgba(94,234,212,0.2);border-radius:16px;padding:40px;">
              <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 8px 0;">Reset your password</h1>
              <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 24px 0;">Hi ${name},</p>
              <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin:0 0 32px 0;">
                We received a request to reset your BusinessCadence password. Click the button below to choose a new password.
                This link expires in <strong style="color:#5EEAD4;">1 hour</strong>.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}"
                       style="display:inline-block;background-color:#5EEAD4;color:#0F2440;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.01em;">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:32px 0 0 0;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email. Your password won't change.
              </p>
              <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:16px 0 0 0;word-break:break-all;">
                Or copy this link: ${resetUrl}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;">
                BusinessCadence — Private access for clients only
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error("[sendPasswordResetEmail] Resend error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[sendPasswordResetEmail] Unexpected error:", err);
    return false;
  }
}

export async function sendPartnerSetupInviteEmail({
  toEmail,
  toName,
  inviteUrl,
  fromName,
}: {
  toEmail: string;
  toName: string;
  inviteUrl: string;
  fromName: string;
}): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: toEmail,
      subject: `${fromName} invited you to set up BusinessCadence`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A1929;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A1929;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <img src="https://businesscadence.com/manus-storage/business-cadence-heart-email_bad58bc7.png"
                 alt="BusinessCadence" height="60" width="60" style="height:60px;width:60px;display:block;" />
          </td>
        </tr>
        <tr>
          <td style="background-color:rgba(255,255,255,0.05);border:1px solid rgba(94,234,212,0.2);border-radius:16px;padding:40px;">
            <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0 0 16px 0;">
              Hi ${toName} — you're invited!
            </h1>
            <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin:0 0 16px 0;">
              ${fromName} just subscribed to BusinessCadence and wants you to set up your shared business profile.
              Tap the button below to get started — it only takes a few minutes.
            </p>
            <p style="color:rgba(255,255,255,0.4);font-size:13px;line-height:1.6;margin:0 0 32px 0;">
              Once you complete setup, you'll both have full access — no separate payment needed.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${inviteUrl}"
                     style="display:inline-block;background:linear-gradient(135deg,#5EEAD4,#0D9488);color:#0F2440;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;">
                    Set Up Our Business →
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:24px 0 0 0;word-break:break-all;">
              Or copy this link: ${inviteUrl}
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:24px;">
            <p style="color:rgba(255,255,255,0.25);font-size:11px;margin:0;">
              BusinessCadence · Built for couples who own businesses together
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
    if (error) { console.error("[sendPartnerSetupInviteEmail] Resend error:", error); return false; }
    return true;
  } catch (err) {
    console.error("[sendPartnerSetupInviteEmail] Unexpected error:", err);
    return false;
  }
}
