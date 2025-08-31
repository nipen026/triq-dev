const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

/**
 * Send email
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text fallback
 */
async function sendMail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"TRIQ" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: text || "",
      html,
    });

    console.log("✅ Mail sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Mail error:", error);
    throw error;
  }
}

module.exports = sendMail;
