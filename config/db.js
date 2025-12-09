// config/db.js
const mongoose = require("mongoose");
const nodeEnv = process.env.NODE_ENV
const connectDB = async () => {
  try {
    await mongoose.connect(nodeEnv == 'DEV' ? process.env.MONGO_URI : process.env.LIVE_MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB error", err);
    process.exit(1);
  }
};

module.exports = connectDB;
