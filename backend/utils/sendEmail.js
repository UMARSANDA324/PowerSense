import nodemailer from "nodemailer";

/**
 * Utility to send emails using nodemailer
 * All emails are automatically branded with the official Litha template
 */

/**
 * Wraps email body content in the official Litha branded HTML template
 * with the L logo header and branded footer.
 */
const wrapInLithaTemplate = (bodyHtml) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 24px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <tr>
      <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
        <table align="center" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background-color: #2563eb; width: 40px; height: 40px; border-radius: 10px; text-align: center; vertical-align: middle;">
              <span style="color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 900; line-height: 40px;">L</span>
            </td>
            <td style="padding-left: 12px; font-size: 20px; font-weight: 800; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; vertical-align: middle;">
              Litha
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px; color: #334155; font-size: 15px; line-height: 1.7;">
        ${bodyHtml}
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 500;">
          Litha &copy; ${new Date().getFullYear()} &middot; Kano State Grid Intelligence
        </p>
      </td>
    </tr>
  </table>
</div>
</body>
</html>
  `.trim();
};

const sendEmail = async (options) => {
  console.log(`Creating transporter for ${process.env.EMAIL_SERVICE}...`);
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Force sender name to "Litha"
  const rawFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER || "noreply@litha.app";
  const emailAddress = rawFrom.includes("<") ? rawFrom.match(/<(.+)>/)?.[1] || rawFrom : rawFrom;
  const fromHeader = `"Litha" <${emailAddress}>`;

  // Build branded HTML from whatever content is provided
  let bodyHtml = options.html || "";
  if (!bodyHtml && options.message) {
    // Convert plain text to HTML paragraphs
    bodyHtml = options.message
      .split("\n")
      .map(line => `<p style="margin: 0 0 8px 0;">${line}</p>`)
      .join("");
  }

  // Wrap in the Litha template (skip if already wrapped)
  const finalHtml = bodyHtml.includes("Litha &copy;")
    ? bodyHtml
    : wrapInLithaTemplate(bodyHtml);

  const mailOptions = {
    from: fromHeader,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: finalHtml,
  };

  console.log(`[Email] Attempting to send to ${options.email} via ${process.env.EMAIL_SERVICE}`);
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] ✅ Success: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Email] ❌ Failed to send to ${options.email}`);
    console.error(`[Email] Error Code: ${error.code}`);
    console.error(`[Email] Error Message: ${error.message}`);
    throw error;
  }
};

export default sendEmail;
