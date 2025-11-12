const express = require("express");
const router = express.Router();
const {
  addExternalContact,
  getDepartmentalContacts,
  searchContacts
} = require("../controllers/contact.controller")
const auth = require("../middleware/auth.middleware");

router.post("/add",auth, addExternalContact);
router.get("/getDepartmentalContacts",auth, getDepartmentalContacts);
router.get("/searchContacts",auth, searchContacts);

module.exports = router;
