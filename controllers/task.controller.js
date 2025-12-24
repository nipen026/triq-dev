const Task = require("../models/task.model");

// ✅ Create Task
exports.createTask = async (req, res) => {
    const user = req.user; // Get the authenticated user
    try {
        const {
            title,
            description,
            startDateTime,
            endDateTime,
            priority,
            webUrl,
            assignTo,
        } = req.body;

        // Save uploaded image filenames
        const media = req.files ? req.files.map((file) => file.filename) : [];

        const task = await Task.create({
            title,
            description,
            media,
            startDateTime,
            endDateTime,
            priority,
            webUrl,
            assignTo,
            user: user.id, // Associate task with the authenticated user
        });

        res.status(201).json({ success: true, message: "Task created", task });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ✅ Get All Tasks
exports.getTasks = async (req, res) => {
  const user = req.user; // authenticated user

  try {
    // Get pagination params (default page=1, limit=10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const tab = req.query.tab;
    const status = req.query.status;
    // Calculate skip value
    const skip = (page - 1) * limit;

    // Fetch paginated tasks
    const [tasks, total] = await Promise.all([
      Task.find({ user: user.id, isActive: true, priority:status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments({ user: user.id, isActive: true }),
    ]);

    res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalTasks: total,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


// ✅ Get Task by ID
exports.getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task)
            return res.status(404).json({ success: false, message: "Task not found" });
        res.status(200).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ✅ Update Task (with optional new images)
exports.updateTask = async (req, res) => {
    try {
        const existingTask = await Task.findById(req.params.id);
        if (!existingTask)
            return res.status(404).json({ success: false, message: "Task not found" });

        const newMedia = req.files ? req.files.map((f) => f.filename) : [];
        const media = [...existingTask.media, ...newMedia];

        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            { ...req.body, media },
            { new: true }
        );

        res.status(200).json({ success: true, task: updatedTask });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ✅ Delete Task
exports.deleteTask = async (req, res) => {
    try {
        const taskData = await Task.findOne({ _id: req.params.id });
        if (!taskData) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }
        taskData.isActive = false;
        await taskData.save();
        res.status(200).json({ success: true, message: "Task deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
