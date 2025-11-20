const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadExpense.middleware");
const auth = require("../middleware/auth.middleware");

const {
    createExpense,
    getAllExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense
} = require("../controllers/expense.controller");

router.post("/create", auth, upload.array("attachments", 10), createExpense);

router.get("/list", auth, getAllExpenses);

router.get("/:id", auth, getExpenseById);

router.put("/:id", auth, upload.array("attachments", 10), updateExpense);

router.delete("/:id", auth, deleteExpense);

module.exports = router;
