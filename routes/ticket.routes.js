const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload.midlleware");
const ticketController = require("../controllers/ticket.controller");
const auth = require("../middleware/auth.middleware");

// Create Ticket (Processor only)
router.post("/create", auth, upload.array("ticketImages", 10), ticketController.createTicket);

// Get all tickets (role-based)
router.get("/getAll", auth, ticketController.getTickets);

// Get ticket by ID
router.get("/getById/:id", auth, ticketController.getTicketById);
router.put("/update/:id", auth, ticketController.updateTicket);
router.put("/delete/:id", auth, ticketController.DeleteTicket);


module.exports = router;
