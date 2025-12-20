// utils/emailOtp.js
const nodemailer = require("nodemailer");

const sendEmailOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.in",
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_APP_PASSWORD,
    },
  });

  await transporter.verify();

  await transporter.sendMail({
    from: `"TRIQ" <${process.env.ZOHO_EMAIL}>`,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}`,
  });
};

module.exports = sendEmailOTP;
