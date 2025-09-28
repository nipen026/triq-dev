const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profile.controller");
const auth = require("../middleware/auth.middleware"); // JWT or session middleware

router.post("/create-profile", auth, profileController.createProfile);
router.get("/get-profile", auth, profileController.getProfile);
router.put("/update-profile", auth, profileController.updateProfile);
router.delete("/delete-profile", auth, profileController.deleteProfile);

module.exports = router;
