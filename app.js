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


// Static
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded files

app.use(
  "/api/flags",
  express.static(path.join(__dirname, "node_modules/flag-icons/flags/4x3"))
);

module.exports = app;
