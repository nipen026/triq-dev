// // const nodemailer = require("nodemailer");

// // const transporter = nodemailer.createTransport({
// //   service: "gmail",
// //   auth: {
// //     user: process.env.EMAIL_USER,
// //     pass: process.env.EMAIL_PASS, // App password, not normal password
// //   },
// // });

// // async function sendMail(to, subject, html, text = "") {
// //   try {
// //     const info = await transporter.sendMail({
// //       from: `"TRIQ" <${process.env.EMAIL_USER}>`,
// //       to,
// //       subject,
// //       text,
// //       html,
// //     });

// //     console.log("✅ Mail sent: %s", info.messageId);
// //     return info;
// //   } catch (error) {
// //     console.error("❌ Mail error:", error);
// //     throw error;
// //   }
// // }


// // module.exports = sendMail;
// const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");

// const ses = new SESv2Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// async function sendMail(to, subject, html, text = "") {
//   try {
//    const params = {
//     Destination: { ToAddresses: [to] },
//     Content: {
//       Simple: {
//         Subject: { Data: subject },
//         Body: { Html: { Data: html } },
//       },
//     },
//     FromEmailAddress: process.env.SES_EMAIL_FROM,
//   };

//     console.log("✅ Mail sent: %s",to);
//    return await ses.send(new SendEmailCommand(params));
//   } catch (error) {
//     console.error("❌ Mail error:", error);
//     throw error;
//   } 
// }
// module.exports = sendMail;

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465, // use 587 if secure:false
  secure: true, // true for 465, false for 587
  auth: {
    user: process.env.ZOHO_EMAIL, // example: noreply@yourdomain.com
    pass: process.env.ZOHO_APP_PASSWORD, // Zoho App Password
  },
});

async function sendMail(to, subject, html, text = "") {
  try {
    const info = await transporter.sendMail({
      from: `"TRIQ" <${process.env.ZOHO_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });

    console.log("✅ Mail sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Mail error:", error);
    throw error;
  }
}

module.exports = sendMail;


