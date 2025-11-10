const express = require("express");
const router = express.Router();
const {
  addDesignation,
  getAllDesignation
} = require("../controllers/designation.controller")
const auth = require("../middleware/auth.middleware");

router.post("/add",auth, addDesignation);
router.get("/getAllDesignation",auth, getAllDesignation);

module.exports = router;
