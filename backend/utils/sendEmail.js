import nodemailer from "nodemailer";

/**
 * Utility to send emails using nodemailer
 */
const sendEmail = async (options) => {
  console.log(`Creating transporter for ${process.env.EMAIL_SERVICE}...`);
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
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

  console.log(`Sending email to ${options.email}...`);
  try {
    await transporter.sendMail(mailOptions);
    console.log("Email transport successful.");
  } catch (error) {
    console.error("Transporter sendMail Error:", error);
    throw error;
  }
};

export default sendEmail;
