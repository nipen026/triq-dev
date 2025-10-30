const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profile.controller");
const auth = require("../middleware/auth.middleware"); // JWT or session middleware
const upload = require("../middleware/uploadProfileImage.middleware");

// Profile routes
// All routes are protected and require authentication
router.post("/create-profile", auth, upload.single("profileImage"), profileController.createProfile);
router.get("/get-profile", auth, profileController.getProfile);
router.get("/get-profiledetails/:id", profileController.getProfileDetail);
router.put("/update-profile", auth, upload.single("profileImage"), profileController.updateProfile);
router.delete("/delete-profile", auth, profileController.deleteProfile);

module.exports = router;
