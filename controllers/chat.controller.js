const ChatRoom = require("../models/chatRoom.model");
const Message = require("../models/message.model");
const { getIO } = require("../socket/socketInstance");
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
      .populate('organisation', 'fullName email')
      .populate('processor', 'fullName email')
      .populate('ticket');

    // now map the rooms so that only “other side” user is returned as `chatWith`
    const formatted = rooms.map(room => {
      const chatWith =
        currentRole === 'organization' ? room.processor : room.organisation;

      return {
        _id: room._id,
        ticket: room.ticket,
        chatWith, // the other party’s info
        // optionally you can still include both ids if you want
        // organisation: room.organisation._id,
        // processor: room.processor._id
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


// 🔹 GET /api/chat/messages/:roomId
exports.getMessages = async (req, res) => {
  const messages = await Message.find({ room: req.params.roomId })
    .populate("sender", "fullName email")
    .sort({ createdAt: 1 });
  res.json(messages);
};

// 🔹 POST /api/chat/messages
exports.sendMessage = async (req, res) => {
  let attachments = [];
  if (req.files && req.files.length > 0) {
    attachments = req.files.map((f) => ({
      url: `/uploads/chat/${f.filename}`,
      type: f.mimetype.includes("image")
        ? "image"
        : f.mimetype.includes("video")
        ? "video"
        : "document",
    }));
  }

  const senderId = req.body.senderId;

  const message = await Message.create({
    room: req.body.roomId,
    sender: senderId,
    content: req.body.content,
    attachments,
  });

  // broadcast via socket.io
  const io = getIO();
  io.to(req.body.roomId).emit("newMessage", message);

  res.status(201).json(message);
};