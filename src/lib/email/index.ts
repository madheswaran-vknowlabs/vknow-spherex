import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL || "VKnow SphereX <notifications@vknowlabs.com>";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

interface EmailPayload {
  to: string;
  subject: string;
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
}

export async function sendNotificationEmail(payload: EmailPayload) {
  const { to, subject, title, message, actionText = "Open in SphereX", actionUrl } = payload;
  const fullActionUrl = actionUrl
    ? actionUrl.startsWith("http")
      ? actionUrl
      : `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${actionUrl}`
    : process.env.NEXTAUTH_URL || "http://localhost:3000";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #00b0ef; padding: 24px; text-align: left; }
    .brand-title { color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .brand-sub { color: #e0f6fd; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
    .body { padding: 28px 24px; }
    .title { font-size: 17px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .btn { display: inline-block; background-color: #00b0ef; color: #ffffff !important; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 10px; text-align: center; }
    .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand-title">VKnow SphereX</div>
      <div class="brand-sub">TRACKER</div>
    </div>
    <div class="body">
      <h2 class="title">${title}</h2>
      <p class="text">${message.replace(/\n/g, "<br>")}</p>
      <div>
        <a href="${fullActionUrl}" class="btn">${actionText}</a>
      </div>
    </div>
    <div class="footer">
      Automated notification from VKnow SphereX TRACKER.<br>
      © ${new Date().getFullYear()} VKnow Labs. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;

  if (!resend) {
    console.log(`[EMAIL SIMULATED] To: ${to} | Subject: "${subject}" | Action: ${fullActionUrl}`);
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: resendFrom,
      to,
      subject,
      html: htmlContent,
    });
    return { success: true, id: data.data?.id };
  } catch (error: any) {
    console.error("Resend Email Delivery Error:", error);
    return { success: false, error: error.message };
  }
}
