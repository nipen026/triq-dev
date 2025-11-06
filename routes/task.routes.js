const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadTask.middleware");
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require("../controllers/task.controller");
const auth = require("../middleware/auth.middleware");
// Multer handles multiple files (e.g., media[] array)
router.post("/create-task",auth, upload.array("media", 5), createTask);
router.get("/getAllTask", auth,getTasks);
router.get("/getTaskById/:id", getTaskById);
router.put("/updateTask/:id", upload.array("media", 5), updateTask);
router.delete("/deleteTask/:id", deleteTask);

module.exports = router;
