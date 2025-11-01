
const { getCountryCallingCode, getCountries, parsePhoneNumberFromString } = require("libphonenumber-js");

const getFlag = (countryCode) => {
  if (!countryCode) return null;
  const code = countryCode.toLowerCase(); // flag-icons files are lowercase
  return `/flags/${code}.svg`; // public URL
};

module.exports = { getFlag };



const getFlagWithCountryCode = (countryCodeOrPhone) => {
  if (!countryCodeOrPhone) return null;

  try {
    // Normalize input (remove spaces)
    const input = countryCodeOrPhone.trim();

    // Case 1️⃣: Input is a full phone number (+919876543210)
    const phoneNumber = parsePhoneNumberFromString(input);
    if (phoneNumber && phoneNumber.country) {
      const isoCode = phoneNumber.country.toLowerCase();
      return isoCode; // e.g. "in"
    }

    // Case 2️⃣: Input is only a calling code (+91, +1, +44)
    if (input.startsWith("+")) {
      const numericCode = input.replace("+", "");
      for (const country of getCountries()) {
        const callingCode = getCountryCallingCode(country);
        if (callingCode === numericCode) {
          // return country.toLowerCase();
          return `/flags/${country.toLowerCase()}.svg`; // e.g. "in"
        }
      }
    }

    // Case 3️⃣: Already an ISO code (e.g. "IN")
    if (/^[A-Za-z]{2}$/.test(input)) {
      return input.toLowerCase();
    }

    return null;
  } catch (err) {
    console.error("Error getting flag:", err.message);
    return null;
  }
};

module.exports = { getFlag, getFlagWithCountryCode };
