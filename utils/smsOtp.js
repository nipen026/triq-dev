// const admin = require("firebase-admin");
// const twilio = require("twilio");

// const serviceAccount = require("../services/serviceAccountKey.json");

// // Initialize Firebase Admin only once
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount)
//   });
// }

// // Twilio setup
// const client = twilio(process.env.TWILLO_SID, process.env.TWILLO_ACCESS_TOKEN);

// const sendSMS = async (phoneNumber, otp) => {
//   try {
//     const message = await client.messages.create({
//       body: `Your OTP is ${otp}`,
//       from: "+19786789226", // Replace with your Twilio phone number
//       to: phoneNumber,
//     });

//     console.log("✅ SMS sent successfully:", message.sid);
//     return message.sid;
//   } catch (error) {
//     console.error("❌ Error sending SMS:", error.message);
//     throw error;
//   }
// };

// module.exports = sendSMS;

// var request = require('request');
// var options = {
// 'method': 'POST',
// 'url': 'https://cpaas.messagecentral.com/verification/v3/send?countryCode=91&customerId=C-8A37F23E5257494&senderId=UTOMOB&type=SMS&flowType=SMS&mobileNumber=8469838559&message=Welcome to Message Central. We are delighted to have you here! - Powered by U2opia',
// 'headers': {
// 'authToken': eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJDLThBMzdGMjNFNTI1NzQ5NCIsImlhdCI6MTc2NDczNjc2NiwiZXhwIjoxOTIyNDE2NzY2fQ.4dODr29-kQXzkDVQXGtGFALjLDupgutYEznWrj7vOClgYOyZCjh3_tfz8vQWUBAH_N7Mlulo4O_jH7mxMGOIlQ
// }
// };
// request(options, function (error, response) {
// if (error) throw new Error(error);
// console.log(response.body);
// });
const admin = require("firebase-admin");
const axios = require("axios");
const serviceAccount = require("../services/serviceAccountKey.json");

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const AUTH_TOKEN = process.env.AUTHTOKEN;     // JWT Token from MessageCentral
const CUSTOMER_ID = process.env.CUSTOMERID;   // C-xxxxxxx

const sendSMS = async (phoneNumber,countryCode) => {
  try {
    const cleanNumber = phoneNumber.replace("+", "");

    const url = `https://cpaas.messagecentral.com/verification/v3/send?countryCode=${countryCode}&customerId=${CUSTOMER_ID}&senderId=UTOMOB&flowType=SMS&mobileNumber=${cleanNumber}&otpLength=6`;

    const headers = {
      authToken: AUTH_TOKEN,
      accept: "application/json"
    };

    const response = await axios.post(url, {}, { headers });

    console.log("📨 SMS Sent Successfully:", response.data);
    return response.data;

  } catch (error) {
    console.error("❌ MessageCentral Error:", error.response?.data || error.message);
    throw error;
  }
};

module.exports = sendSMS;

