const { parsePhoneNumberFromString } = require("libphonenumber-js");

// Detect country from phone number
function getCountryFromPhone(phoneNumber) {
  try {
    const phoneObj = parsePhoneNumberFromString(phoneNumber);
    if (phoneObj && phoneObj.country) {
      return phoneObj.country; // e.g. "US", "IN"
    }
    return null;
  } catch (err) {
    return null;
  }
}

module.exports = { getCountryFromPhone };
