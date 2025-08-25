// routes/auth.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../controllers/auth.controller");

router.post("/register", auth.register);
router.post("/verify-email", auth.verifyEmail);
router.post("/verify-phone", auth.verifyPhone);
router.post("/login", auth.login);
router.get("/getOraganization", auth.getOrganizationUsers);

module.exports = router;1
