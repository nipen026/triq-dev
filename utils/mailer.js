const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App password, not normal password
  },
});

async function sendMail(to, subject, html, text = "") {
  try {
    const info = await transporter.sendMail({
      from: `"TRIQ" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
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
