const ChatRoom = require("../models/chatRoom.model");
const Message = require("../models/message.model");
const { getIO } = require("../socket/socketInstance");
const { getFlagWithCountryCode } = require("../utils/flagHelper");
// 🔹 POST /api/chat/rooms  → create a chat room manually
exports.createChatRoomForTicket = async (req, res) => {
    try {
        const { ticketId, organisationId, processorId } = req.body;
        if (!ticketId || !organisationId || !processorId) {
            return res
                .status(400)
                .json({ message: "ticketId, organisationId, processorId are required" });
        }

        let room = await ChatRoom.findOne({ ticket: ticketId });
        if (room) {
            return res.status(200).json({ message: "Room already exists", room });
        }

        room = await ChatRoom.create({
            ticket: ticketId,
            organisation: organisationId,
            processor: processorId,
        });

        res.status(201).json({ message: "Chat room created", room });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 🔹 GET /api/chat/rooms/:ticketId
exports.getRoomByTicket = async (req, res) => {
    const room = await ChatRoom.findOne({ ticket: req.params.ticketId })
        .populate("organisation", "fullName email")
        .populate("processor", "fullName email");
    if (!room) return res.status(404).json({ message: "Chat room not found" });
    res.json(room);
};

// 🔹 GET /api/chat/rooms (all chats for logged-in user)
exports.getAllChats = async (req, res) => {
    try {
        const userId = req.user.id;
        const roles = req.user.roles; // array like ['processor'] or ['organization']

        let query = {};
        let currentRole;

        if (roles.includes('organization')) {
            currentRole = 'organization';
            query.organisation = userId;
        } else if (roles.includes('processor')) {
            currentRole = 'processor';
            query.processor = userId;
        } else {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        // fetch all rooms
        const rooms = await ChatRoom.find(query)
            .populate('organisation', 'fullName email countryCode')
            .populate('processor', 'fullName email countryCode')
            .populate('ticket');

        // now map the rooms so that only “other side” user is returned as `chatWith`
        const formatted = await Promise.all(
      rooms.map(async (room) => {
        const chatWith =
          currentRole === "organization" ? room.processor : room.organisation;

        // ✅ Add flag dynamically (no response structure change)
        const flag = getFlagWithCountryCode(chatWith?.countryCode);

        const unreadCount = await Message.countDocuments({
          room: room._id,
          sender: { $ne: userId },
          readBy: { $ne: userId }
        });

        return {
          _id: room._id,
          ticket: room.ticket,
          chatWith: {
            ...chatWith._doc, // retain existing fields
            flag // 🏳️ added here
          },
          unreadCount
        };
      })
    );

    res.json(formatted);


        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};


// 🔹 GET /api/chat/messages/:roomId
// GET /api/chat/messages/:roomId?page=1&limit=20
exports.getMessages = async (req, res) => {
  try {
    // page/limit from query, defaults:
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const skip = (page - 1) * limit;

    // fetch paginated messages newest first
    const messages = await Message.find({ room: req.params.roomId })
      .populate("sender", "fullName email") // newest first
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // optionally total count for UI
    const total = await Message.countDocuments({ room: req.params.roomId });
     const room = await ChatRoom.findById(req.params.roomId).populate("ticket");
    if (!room) return res.status(404).json({ message: "Room not found" });
    console.log(room);
    
    const isResolvedTicket = room.ticket?.status === "Resolved";
const formattedMessages = messages.map((msg) => ({
      ...msg.toObject(),
      isResolvedTicket,
    }));
    res.json({
      page,
      limit,
      total,
      messages:formattedMessages
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


// 🔹 POST /api/chat/messages
exports.sendMessage = async (req, res) => {


    const senderId = req.body.senderId;

    const message = await Message.create({
        room: req.body.roomId,
        sender: senderId,
        content: req.body.content,
        attachments: req.body.attachments || [],
    });

    // broadcast via socket.io
    const io = getIO();
    io.to(req.body.roomId).emit("newMessage", message);

    res.status(201).json(message);
};