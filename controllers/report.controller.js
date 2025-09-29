const sendMail = require("../utils/mailer");
const User = require("../models/user.model");

exports.reportProblem = async (req, res) => {
    try {
        const { title, description } = req.body;
        const {id} = req.user;
        const user = await User.findById(id);
        const email = user?.email;
        const phone = user?.phone;
        const name = user?.fullName;
        if (!title || !description) {
            return res.status(400).json({ msg: "Title and description are required" });
        }

        // await sendReportMail({ title, description, email, phone, name });
        await sendMail({
            to: process.env.EMAIL_USER,
            subject: "Report Issue",
            html: `
          <h2>📢 New Problem Reported</h2>
    <p><b>Title:</b> ${title}</p>
    <p><b>Description:</b><br/>${description}</p>
    <hr/>
    <h3>Reporter Details:</h3>
    <p><b>Name:</b> ${name || "N/A"}</p>
    <p><b>Email:</b> ${email || "N/A"}</p>
    <p><b>Phone:</b> ${phone || "N/A"}</p>
    <hr/>
    <small>Sent automatically from the Help & Support form.</small>
        `,
        });
        res.status(200).json({ msg: "Report submitted successfully" });
    } catch (error) {
        console.error("Report error:", error);
        res.status(500).json({ msg: "Failed to send report", error: error.message });
    }
};


exports.SendFeedback = async (req, res) => {
  try {
    const { mail,feedback } = req.body; // take feedback message from request
    const { id } = req.user;       // user info comes from JWT
    const user = await User.findById(id);

    if (!feedback) {
      return res.status(400).json({ msg: "Feedback is required" });
    }

    const phone = user?.phone;
    const name = user?.fullName;

    await sendMail({
      to: process.env.EMAIL_USER, // your receiving email
      subject: "📢 New Feedback Received",
      html: `
        <h2>New Feedback Submitted</h2>
        <p><b>Feedback:</b></p>
        <p>${feedback}</p>
        <hr/>
        <h3>User Details:</h3>
        <p><b>Name:</b> ${name || "N/A"}</p>
        <p><b>Email:</b> ${mail || "N/A"}</p>
        <p><b>Phone:</b> ${phone || "N/A"}</p>
        <hr/>
        <small>Sent automatically from the Feedback form.</small>
      `,
    });

    res.status(200).json({ msg: "Feedback submitted successfully" });
  } catch (error) {
    console.error("Feedback error:", error);
    res.status(500).json({ msg: "Failed to send feedback", error: error.message });
  }
};

