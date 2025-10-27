const admin = require("firebase-admin");
const twilio = require("twilio");

const serviceAccount = require("../services/serviceAccountKey.json");

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Twilio setup
const client = twilio(process.env.TWILLO_SID, process.env.TWILLO_ACCESS_TOKEN);

const sendSMS = async (phoneNumber, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: "+19786789226", // Replace with your Twilio phone number
      to: phoneNumber,
    });

    console.log("✅ SMS sent successfully:", message.sid);
    return message.sid;
  } catch (error) {
    console.error("❌ Error sending SMS:", error.message);
    throw error;
  }
};

module.exports = sendSMS;
