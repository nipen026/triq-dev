const getFlag = (countryCode) => {
  if (!countryCode) return null;
  const code = countryCode.toLowerCase(); // flag-icons files are lowercase
  return `/flags/${code}.svg`; // public URL
};

module.exports = { getFlag };
