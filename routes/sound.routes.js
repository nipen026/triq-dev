const express = require("express");
const router = express.Router();
const {
  addSound,
  getAllSounds,
  updateSound
} = require("../controllers/sound.controller");
const auth = require("../middleware/auth.middleware");

router.post("/add",auth, addSound);
router.get("/getSound",auth, getAllSounds);
router.put("/updateSound/:id",auth,updateSound );

module.exports = router;
