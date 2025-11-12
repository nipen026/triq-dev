const express = require("express");
const router = express.Router();
const {
  addExternalContact,
  getDepartmentalContacts,
  searchContacts,
  getAllContacts,
  sendExternalEmployeeRequest
} = require("../controllers/contact.controller")
const auth = require("../middleware/auth.middleware");

router.post("/add",auth, addExternalContact);
router.get("/getDepartmentalContacts",auth, getDepartmentalContacts);
router.get("/searchContacts",auth, searchContacts);
router.get("/getAllContact/:type",auth, getAllContacts);
router.post("/sendExternalEmployeeRequest",auth, sendExternalEmployeeRequest);

module.exports = router;
