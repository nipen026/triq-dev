  const axios = require("axios");

  async function convertCurrency(amount, from, to) {
    if (from === to) return amount;

    const res = await axios.get("https://api.exchangerate.host/convert", {
      params: {
        from,
        to,
        amount,
        places: 2,        
        source: "ecb"    
      }
    }); 
    
    if (!res.data || !res.data.result) {
      throw new Error("Currency conversion failed");
    }

    return res.data.result;
  }

  module.exports = { convertCurrency };
