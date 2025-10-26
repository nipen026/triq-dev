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
router.get("/getticket/:status", auth, ticketController.getTicketsByStatus);
router.get("/getTicketSummary/:id", auth, ticketController.getSummary);
router.post("/report/:id", auth, ticketController.reportTicket);
router.get("/getReviewTickets", auth, ticketController.getResolvedTickets);
router.post("/rateFeedback/:id", auth, ticketController.updateTicketRating);


module.exports = router;
