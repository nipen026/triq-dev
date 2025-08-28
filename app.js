// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const machineRoutes = require("./routes/machine.routes");
const customerRoutes = require("./routes/customer.routes");
const path = require("path");
const app = express();
connectDB();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/machines", machineRoutes);
app.use("/api/customers", customerRoutes);
app.use(
  "/api/flags",
  express.static(path.join(__dirname, "node_modules/flag-icons/flags/4x3"))
);
module.exports = app;
