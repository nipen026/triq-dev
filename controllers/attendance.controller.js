const Attendance = require("../models/attendance.model");
const Employee = require("../models/employee.model");


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
      if (!last.breakOut) {
        showBreakIn = false;
      }
      // break ended → allow Break-In again
      else {
        showBreakIn = true;
      }
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
    let showCheckIn = false;
    let showCheckOut = false;
    let showBreakIn = false;
    let showBreakOut = false;
    const todayRecord = await Attendance.findOne({ user: userId, date: today });


    if (!todayRecord || !todayRecord.checkIn) {
      // Not checked-in yet
      showCheckIn = true;
    }
    else if (todayRecord.checkIn && !todayRecord.checkOut) {

      const lastBreak =
        todayRecord.breaks?.[todayRecord.breaks.length - 1];

      const breakOpen = lastBreak && !lastBreak.breakOut;

      showCheckOut = true;

      if (breakOpen) {
        showBreakOut = true;
      } else {
        showBreakIn = true;
      }
    }
    const month = new Date().toISOString().slice(0, 7);

    const monthRecords = await Attendance.find({
      user: userId,
      date: { $regex: `^${month}` }
    });

    const present = monthRecords.filter(r => r.status === "Present").length;
    const absent = monthRecords.filter(r => r.status === "Absent").length;
    const leave = monthRecords.filter(r => r.status === "Leave").length;
    let formatted = null;
    if (todayRecord) {
      formatted = todayRecord?.toObject();
      formatted.showCheckIn = showCheckIn;
    }
    const employeeData = await Employee.findOne({ linkedUser: userId });
    res.json({
      status: 1,
      data: {
        today: formatted,
        profilePhoto: employeeData.profilePhoto,
       
        todaySummary: todayRecord
          ? {
            checkIn: todayRecord.checkIn,
            checkOut: todayRecord.checkOut,
            breaks: todayRecord.breaks,
            totalWork: todayRecord.totalWorkMinutes,
            totalBreak: todayRecord.totalBreakMinutes,
            showCheckIn: showCheckIn,
            showBreakIn: showBreakIn,
            showCheckOut: showCheckOut,
            showBreakOut: showBreakOut,
          }
          : null,

        monthly: { present, absent, leave, late: 0 },
        ticketSummary: { waiting: 0, progress: 0, hold: 0 },
        task: { myTasks: 0, assignedTask: 0 },
        permission: {
          serviceDepartment: { view: true, edit: true },
          accessLevel: { view: true, edit: true },
          machineOperation: { view: true, edit: true },
          ticketManagement: { view: true, edit: true },
          approvalAuthority: { view: true, edit: true },
          reportAccess: { view: true, edit: true },
          myTeams: { view: true, edit: true },
          piInvoice: { view: true, edit: true },
          expenseReport: { view: true, edit: true },
          fieldWork: { view: true, edit: true },
          followUps: { view: true, edit: true },
          myCustomer: { view: true, edit: true },
          feedbackAndRating: { view: true, edit: true },
          installationTracker: { view: true, edit: true },
        }
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

