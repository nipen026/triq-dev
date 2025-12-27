const Task = require("../models/task.model");
const User = require("../models/user.model");
const Sound = require("../models/sound.model");
const Employee = require("../models/employee.model");
const admin = require("firebase-admin");
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
            assignTo: assignTo,
            user: user.id, // Associate task with the authenticated user
        });

        res.status(201).json({ success: true, message: "Task created", task });
        const employeeData = await Employee.findById(assignTo);
        if (!employeeData) {
            return res.status(404).json({ success: false, message: "Assigned employee not found" });
        }

        const receiverUser = await User.findById(employeeData.linkedUser);

        // 3️⃣ Send Notification
        if (receiverUser?.fcmToken) {
            try {
                const soundData = await Sound.findOne({
                    type: "alert",
                    user: receiverUser.id,
                });

                const dynamicSoundName = soundData?.soundName || "default";

                // ✅ Notification content
                const notification = {
                    title: "New Task Assigned",
                    body: `${user.name} assigned you a task: ${title}`,
                };

                await admin.messaging().sendEachForMulticast({
                    tokens: [receiverUser.fcmToken],

                    data: {
                        title: notification.title,
                        body: notification.body,
                        type: "task_assigned",
                        taskId: String(task._id),
                        senderId: String(user.id),
                        soundName: dynamicSoundName,
                    },

                    android: {
                        priority: "high",
                        notification: {
                            sound: dynamicSoundName,
                        },
                    },

                    apns: {
                        headers: { "apns-priority": "10" },
                        payload: {
                            aps: {
                                alert: notification,
                                sound: `${dynamicSoundName}.aiff`,
                                "content-available": 1,
                                "mutable-content": 1,
                            },
                        },
                    },
                });
            } catch (err) {
                console.error("❌ FCM Error:", err.message);
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ✅ Get All Tasks
exports.getTasks = async (req, res) => {
    const user = req.user;

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const tab = req.query.tab || "mytask"; // mytask |  assignedtask
        const status = req.query.status || "all";

        const skip = (page - 1) * limit;

        const priorityFilter =
            status === "all"
                ? { $in: ["Low", "Medium", "High"] }
                : status.charAt(0).toUpperCase() + status.slice(1);

        // 🧠 CORE LOGIC
        let query = {
            isActive: true,
            priority: priorityFilter,
        };

        if (tab === "mytask") {
            // Tasks assigned TO me
            query.assignTo = user.id;
        } else if (tab === "assignedtask") {
            // Tasks created BY me
            query.user = user.id;
        }

        const [tasks, total] = await Promise.all([
            Task.find(query)
                .populate("assignTo", "name")
                .populate("user", "name")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            Task.countDocuments(query),
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
