import nodemailer from "nodemailer";

/**
 * Utility to send emails using nodemailer
 */
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

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
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
