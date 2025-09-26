// utils/emailOtp.js
const nodemailer = require("nodemailer");

const sendEmailOTP = async (email, otp) => {
console.log(otp);
    
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // App password, not normal password
    },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}`,
  });
};

module.exports = sendEmailOTP;
