// routes/auth.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../controllers/auth.controller");
const verifyToken = require("../middleware/auth.middleware");
router.post("/register", auth.register);
router.post("/verify-email", auth.verifyEmail);
router.post("/verify-phone", auth.verifyPhone);
router.post("/login", auth.login);
router.get("/getOraganization", auth.getOrganizationUsers);
router.get("/search-organization-user", verifyToken, auth.searchOrganizationUser);

module.exports = router;
