const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    date: { type: String, required: true },  // YYYY-MM-DD

    checkIn: { type: String },
    checkOut: { type: String },

    breaks: [
      {
        breakIn: String,
        breakOut: String
      }
    ],

    totalBreakMinutes: { type: Number, default: 0 },
    totalWorkMinutes: { type: Number, default: 0 },

    locationIn: String,
    locationOut: String,

    noteIn: String,
    noteOut: String,

    status: { type: String }, // Present / Absent / Leave
  },
  { timestamps: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
