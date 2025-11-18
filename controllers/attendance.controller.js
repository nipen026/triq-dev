const Attendance = require("../models/attendance.model");

// exports.checkIn = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { time, location, note , type} = req.body;

//     const today = new Date().toISOString().split("T")[0];

//     // Check if already checked in
//     const todayRecord = await Attendance.findOne({ user: userId, date: today });

//     if (todayRecord && todayRecord.checkIn) {
//       return res.status(400).json({ status: 0, message: "Already Checked In" });
//     }

//     const newRecord = await Attendance.findOneAndUpdate(
//       { user: userId, date: today },
//       {
//         user: userId,
//         date: today,
//         checkIn: time,
//         locationIn: location,
//         noteIn: note,
//         status: type,
//       },
//       { upsert: true, new: true }
//     );

//     res.json({ status: 1, message: "Checked In Successfully", data: newRecord });
//   } catch (err) {
//     res.status(500).json({ status: 0, error: err.message });
//   }
// };

// exports.checkOut = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { time, location, note } = req.body;

//     const today = new Date().toISOString().split("T")[0];

//     const todayRecord = await Attendance.findOne({ user: userId, date: today });

//     if (!todayRecord || !todayRecord.checkIn) {
//       return res.status(400).json({ status: 0, message: "Check-In Required First" });
//     }

//     if (todayRecord.checkOut) {
//       return res.status(400).json({ status: 0, message: "Already Checked Out" });
//     }

//     todayRecord.checkOut = time;
//     todayRecord.locationOut = location;
//     todayRecord.noteOut = note;

//     await todayRecord.save();

//     res.json({ status: 1, message: "Checked Out Successfully", data: todayRecord });
//   } catch (err) {
//     res.status(500).json({ status: 0, error: err.message });
//   }
// };

function calculateMinutes(start, end) {
  const convert = (t) => {
    const [time, modifier] = t.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (modifier === "PM" && h !== 12) h += 12;
    if (modifier === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  return convert(end) - convert(start);
}


exports.attendanceAction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, time, location, note } = req.body;

    const today = new Date().toISOString().split("T")[0];
    let record = await Attendance.findOne({ user: userId, date: today });

    if (!record) {
      record = await Attendance.create({ user: userId, date: today });
    }

    // ---------------------- CHECK-IN ----------------------
    if (type === "checkin") {
      if (record.checkIn)
        return res.status(400).json({ status: 0, message: "Already Checked In" });

      record.checkIn = time;
      record.locationIn = location;
      record.noteIn = note;
      record.status = "Present";
    }

    // ---------------------- BREAK-IN ----------------------
    if (type === "breakin") {
      // must check-in first
      if (!record.checkIn)
        return res.status(400).json({ status: 0, message: "Check-In Required" });

      // check if last break is still open
      const last = record.breaks[record.breaks.length - 1];
      if (last && !last.breakOut)
        return res.status(400).json({ status: 0, message: "Previous break not closed" });

      record.breaks.push({ breakIn: time });
    }

    // ---------------------- BREAK-OUT ----------------------
    if (type === "breakout") {
      const last = record.breaks[record.breaks.length - 1];
      if (!last || last.breakOut)
        return res.status(400).json({ status: 0, message: "No active break" });

      last.breakOut = time;

      // calculate break minutes
      const diff = calculateMinutes(last.breakIn, last.breakOut);
      record.totalBreakMinutes += diff;
    }

    // ---------------------- CHECK-OUT ----------------------
    if (type === "checkout") {
      if (!record.checkIn)
        return res.status(400).json({ status: 0, message: "Check-In Required" });

      if (record.checkOut)
        return res.status(400).json({ status: 0, message: "Already Checked Out" });

      record.checkOut = time;
      record.locationOut = location;
      record.noteOut = note;

      // Calculate today's total working minutes
      const totalMinutes = calculateMinutes(record.checkIn, record.checkOut);
      record.totalWorkMinutes = totalMinutes - record.totalBreakMinutes;
    }

    await record.save();

    res.json({
      status: 1,
      message: `${type.toUpperCase()} successful`,
      data: record
    });

  } catch (err) {
    res.status(500).json({ status: 0, error: err.message });
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split("T")[0];

    const todayRecord = await Attendance.findOne({ user: userId, date: today });

    const month = new Date().toISOString().slice(0, 7);

    const monthRecords = await Attendance.find({
      user: userId,
      date: { $regex: `^${month}` }
    });

    const present = monthRecords.filter(r => r.status === "Present").length;
    const absent = monthRecords.filter(r => r.status === "Absent").length;
    const leave = monthRecords.filter(r => r.status === "Leave").length;

    res.json({
      status: 1,
      data: {
        today: todayRecord,
        todaySummary: todayRecord
          ? {
              checkIn: todayRecord.checkIn,
              checkOut: todayRecord.checkOut,
              breaks: todayRecord.breaks,
              totalWork: todayRecord.totalWorkMinutes,
              totalBreak: todayRecord.totalBreakMinutes,
            }
          : null,

        monthly: { present, absent, leave }
      }
    });

  } catch (err) {
    res.status(500).json({ status: 0, error: err.message });
  }
};


exports.getDayDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.params; // 2025-03-15

    const record = await Attendance.findOne({ user: userId, date });

    res.json({ status: 1, data: record || {} });
  } catch (err) {
    res.status(500).json({ status: 0, error: err.message });
  }
};
exports.getMonthlyAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.params; // Format: 2025-03

    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    const records = await Attendance.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    res.json({ status: 1, data: records });
  } catch (err) {
    res.status(500).json({ status: 0, error: err.message });
  }
};

