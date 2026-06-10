import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

/**
 * Sends a branded OTP email with a 6-digit code.
 */
export async function sendOTPEmail(
  email: string,
  name: string,
  otpCode: string
): Promise<void> {
  const firstName = name?.split(' ')[0] || 'there';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your SONIVAULT OTP</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="max-width:500px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#4f6ef7;border-radius:12px;padding:12px 20px;">
                    <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:2px;">SV</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="color:#f0f0f5;font-size:20px;font-weight:700;letter-spacing:1px;">SONIVAULT</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#13131a;border:1px solid #1e1e2a;border-radius:16px;padding:40px 36px;">

              <!-- Heading -->
              <h1 style="margin:0 0 8px;color:#f0f0f5;font-size:24px;font-weight:700;">
                Your verification code
              </h1>
              <p style="margin:0 0 32px;color:#6b6b7a;font-size:15px;line-height:1.5;">
                Hi ${firstName}, use the code below to sign in to SONIVAULT.
              </p>

              <!-- OTP Code -->
              <div style="background-color:#0a0a0f;border:1px solid #1e1e2a;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
                <span style="font-size:48px;font-weight:800;color:#4f6ef7;letter-spacing:16px;font-family:'Courier New',monospace;">
                  ${otpCode}
                </span>
              </div>

              <!-- Warning -->
              <div style="background-color:#f59e0b1a;border:1px solid #f59e0b33;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
                <p style="margin:0;color:#f59e0b;font-size:13px;">
                  ⏱ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
                </p>
              </div>

              <p style="margin:0;color:#6b6b7a;font-size:13px;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email.
                Someone may have entered your email address by mistake.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;color:#3a3a4a;font-size:12px;">
                © ${new Date().getFullYear()} SONIVAULT · Your personal secure document vault
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `SONIVAULT <${process.env.EMAIL_SERVER_USER}>`,
    to: email,
    subject: `${otpCode} is your SONIVAULT verification code`,
    html,
    text: `Your SONIVAULT verification code is: ${otpCode}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
  });
}
