// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const machineRoutes = require("./routes/machine.routes");
const customerRoutes = require("./routes/customer.routes");
const machineSupplierRoute = require("./routes/machineSupplier.routes");
const ticketRoutes = require("./routes/ticket.routes");
const servicePricingRoutes = require("./routes/servicePricing.routes");
const ChatRoutes = require("./routes/chat.route");
const profileRoutes = require("./routes/profile.route");
const reportRoutes = require("./routes/report.routes");
const notificationRoutes = require("./routes/notification.route");
const taskRoutes = require("./routes/task.routes");
const soundRoutes = require("./routes/sound.routes");
const departmentRoutes = require("./routes/department.routes");
const designationRoutes = require("./routes/designation.routes");
const employeeRoutes = require("./routes/employee.routes");
const contactRoutes = require("./routes/contact.routes");
const contactChatRoutes = require("./routes/contactChat.routes");
const AttendanceRoutes = require("./routes/attendance.routes");
const employeeProfileRoutes = require("./routes/employeeProfile.routes");
const approvalRoutes = require("./routes/approval.route");
const expenseRoutes = require("./routes/expense.routes");
const employeeCustomerRoutes = require("./routes/employeeCustomer.routes");
const reportingRoutes = require("./routes/reporting.routes");
const fieldWorkRoutes = require("./routes/fieldwork.routes");
const LiveKitRoutes = require("./routes/livekit.routes");
const StripeRoutes = require("./routes/stripe.routes");
const path = require("path");

const app = express();

// DB + middleware
connectDB();
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/machines", machineRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/machinesupplier", machineSupplierRoute);
app.use("/api/ticket", ticketRoutes);
app.use("/api/servicePricing", servicePricingRoutes);
app.use("/api/chat", ChatRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/notification",notificationRoutes)
app.use("/api/task",taskRoutes );
app.use("/api/notificationsound",soundRoutes );
app.use("/api/department",departmentRoutes);
app.use("/api/designation",designationRoutes);
app.use("/api/employee",employeeRoutes);
app.use("/api/contact",contactRoutes);
app.use("/api/contactChat",contactChatRoutes);
app.use("/api/attendance",AttendanceRoutes);
app.use("/api/employeeProfile",employeeProfileRoutes);
app.use("/api/approval",approvalRoutes);
app.use("/api/expense",expenseRoutes);
app.use("/api/employeeCustomer",employeeCustomerRoutes);
app.use("/api/reporting",reportingRoutes);
app.use("/api/fieldwork",fieldWorkRoutes);
app.use("/api/livekit", LiveKitRoutes);
app.use("/api/stripe", StripeRoutes);


// Static
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded files

app.use(
  "/flags",
  express.static(path.join(__dirname, "node_modules/flag-icons/flags/4x3"))
);

// Stripe Webhook route
app.post("/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  StripeRoutes
);
module.exports = app;
