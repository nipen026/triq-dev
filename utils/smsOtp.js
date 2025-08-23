const admin = require("firebase-admin");

/**
 * Sends OTP to a mobile number using Firebase's SMS gateway
 * Note: Firebase Admin SDK doesn't directly support sending SMS manually,
 * so this is a simulated version for your case.
 */
const sendSMS = async (phoneNumber, otp) => {
  // You will need a third-party provider like Twilio, MSG91, etc.
  // Since Firebase Admin doesn't support sending SMS OTP directly from server,
  // you either:
  // - use Firebase Client SDK (signInWithPhoneNumber on frontend)
  // - or use a custom SMS provider here.

  // Simulating SMS via console.log
  console.log(`Sending SMS OTP to ${phoneNumber}: ${otp}`);

  // If using Twilio or similar, replace with actual SMS send code
};

module.exports = sendSMS;
