// controllers/contactChat.controller.js
const ContactChatRoom = require("../models/contactChatRoom.model");
const ContactChatMessage = require("../models/contactChatMessage.model");
const Employee = require('../models/employee.model');
const User = require("../models/user.model");

// ✅ Create or fetch chat room
exports.createChatRoom = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { receiverId } = req.body;

        if (!receiverId) {
            return res.status(400).json({ status: 0, message: "Receiver ID is required" });
        }

        // 1️⃣ Get the receiver employee
        const receiverEmployee = await Employee.findById(receiverId)
            .populate("department designation");
        if (!receiverEmployee) {
            return res.status(404).json({ status: 0, message: "Receiver employee not found" });
        }

        // 2️⃣ Get linked user (assuming chat uses User model IDs)
        const userData = await User.findOne({
            fullName: receiverEmployee.name,
            email: receiverEmployee.email,
        });

        if (!userData) {
            return res.status(404).json({ status: 0, message: "Linked user not found" });
        }

        // 3️⃣ Check if chat room already exists
        let existingRoom = await ContactChatRoom.findOne({
            $or: [
                { employee_sender: senderId, employee_receiver: userData._id },
                { employee_sender: userData._id, employee_receiver: senderId },
            ],
        });

        if (existingRoom) {
            return res.status(200).json({
                status: 1,
                message: "Chat room already exists",
                data: existingRoom,
            });
        }

        // 4️⃣ Create new chat room
        const newRoom = await ContactChatRoom.create({
            employee_sender: senderId,
            employee_receiver: userData._id,
        });

        return res.status(201).json({
            status: 1,
            message: "Chat room created successfully",
            data: newRoom,
        });
    } catch (error) {
        console.error("Error creating chat room:", error);
        res.status(500).json({ status: 0, message: "Server error", error: error.message });
    }
};

/**
 * ✅ GET Chat Room (if exists)
 * This just fetches the existing room between sender & receiver
 */
exports.getChatRoom = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { receiverId } = req.params;

        if (!receiverId) {
            return res.status(400).json({ status: 0, message: "Receiver ID is required" });
        }

        // 1️⃣ Find receiver employee
        const receiverEmployee = await Employee.findById(receiverId)
            .populate("department designation");

        if (!receiverEmployee) {
            return res.status(404).json({ status: 0, message: "Receiver employee not found" });
        }

        // 2️⃣ Find linked user
        const userData = await User.findOne({
            fullName: receiverEmployee.name,
            email: receiverEmployee.email,
        });

        if (!userData) {
            return res.status(404).json({ status: 0, message: "Linked user not found" });
        }

        // 3️⃣ Find existing chat room
        const existingRoom = await ContactChatRoom.findOne({
            $or: [
                { employee_sender: senderId, employee_receiver: userData._id },
                { employee_sender: userData._id, employee_receiver: senderId },
            ],
        });

        if (!existingRoom) {
            return res.status(404).json({
                status: 0,
                message: "No chat room found between these users",
            });
        }

        return res.status(200).json({
            status: 1,
            message: "Chat room fetched successfully",
            data: existingRoom,
        });
    } catch (error) {
        console.error("Error fetching chat room:", error);
        res.status(500).json({ status: 0, message: "Server error", error: error.message });
    }
};

exports.getChatMessages = async (req, res) => {
    try {
        const { roomId } = req.params;

        // Pagination setup
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // 1️⃣ Find the chat room
        const room = await ContactChatRoom.findById(roomId)
            .populate("employee_sender", "fullName email profileImage")
            .populate("employee_receiver", "fullName email profileImage");

        if (!room) {
            return res.status(404).json({ status: 0, message: "Chat room not found" });
        }

        // 2️⃣ Fetch paginated messages (newest first)
        const messages = await ContactChatMessage.find({ chatRoom: roomId })
            .populate("sender", "fullName email profileImage")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // 3️⃣ Count total for pagination metadata
        const total = await ContactChatMessage.countDocuments({ chatRoom: roomId });

        // 4️⃣ Format messages if needed (example: include senderType)
        const formattedMessages = messages.map((msg) => ({
            ...msg.toObject(),
            senderType:
                msg.sender?._id.toString() === room.employee_sender?._id.toString()
                    ? "sender"
                    : "receiver",
        }));

        // 5️⃣ Send response
        return res.status(200).json({
            status: true,
            message: "Messages fetched successfully",
            page,
            limit,
            total,
            data: formattedMessages,
        });
    } catch (error) {
        console.error("Error fetching contact chat messages:", error);
        res
            .status(500)
            .json({ status: 0, message: "Server error", error: error.message });
    }
};


exports.getUserChatRooms = async (req, res) => {
    try {
        const userId = req.user.id;

        const rooms = await ContactChatRoom.find({
            $or: [{ employee_sender: userId }, { employee_receiver: userId }],
        })
            .populate("employee_sender", "fullName profileImage email")
            .populate("employee_receiver", "fullName profileImage email")
            .sort({ updatedAt: -1 });

        res.status(200).json({
            status: 1,
            message: "Chat rooms fetched successfully",
            data: rooms,
        });
    } catch (error) {
        console.error("Error fetching chat rooms:", error);
        res.status(500).json({ status: 0, message: "Server error", error: error.message });
    }
};
