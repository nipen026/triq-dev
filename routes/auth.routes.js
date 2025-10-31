// routes/auth.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../controllers/auth.controller");
const verifyToken = require("../middleware/auth.middleware");
router.post("/register", auth.register);
router.post("/verify-email", auth.verifyOtp);
router.post("/send-otp", auth.sendOtp);
router.post("/verify-phone", auth.verifyPhone);
router.post("/login", auth.login);
router.get("/getOraganization", auth.getOrganizationUsers);
router.get("/search-organization-user", verifyToken, auth.searchOrganizationUser);
router.post("/logout",verifyToken, auth.logout);
router.post("/forgot-password", auth.forgotPassword);
router.post("/verify-forgot-otp", auth.verifyForgotOTP);
router.post("/reset-password", auth.resetPassword);
router.post("/send-verify-email", auth.sendVerifyEmail);
router.get("/auto-verify", auth.autoVerify);


module.exports = router;
