const GroupChat = require("../models/groupChat.model");
const mongoose = require("mongoose");
const Message = require("../models/message.model");

exports.createGroupChat = async (req, res) => {
  try {

    const user = req.user; // logged user
    const { members, ticket, organisation } = req.body;

    if (!members || members.length === 0) {
      return res.status(400).json({
        message: "Members are required"
      });
    }

    // ensure valid ObjectIds
    const validMembers = members.filter(id =>
      mongoose.Types.ObjectId.isValid(id)
    );

    const allMembers = [...new Set([...validMembers, user.id])];

    const chatRoom = await GroupChat.create({
      ticket: ticket || null,
      members: allMembers,
      createdBy: user.id,
      organisation: organisation || null
    });

    res.status(201).json({
      message: "Group chat created successfully",
      chatRoom
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserChatRooms = async (req, res) => {

  try {

    const userId = req.user.id;

    const rooms = await GroupChat.find({
      members: userId
    })
      .populate("members", "fullName email")
      .populate("createdBy", "fullName")
      .populate("ticket", "ticketNumber status")
      .sort({ updatedAt: -1 });

    const chatList = [];

    for (const room of rooms) {

      const lastMessage = await Message.findOne({ room: room._id })
        .sort({ createdAt: -1 });

      const unreadCount = await Message.countDocuments({
        room: room._id,
        sender: { $ne: userId },
        readBy: { $ne: userId }
      });

      chatList.push({
        room,
        lastMessage,
        unreadCount
      });

    }

    res.json({
      message: "Chat rooms fetched",
      chats: chatList
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};
exports.addMembersToGroup = async (req, res) => {
  try {

    const userId = req.user.id;
    const { groupId } = req.params;
    const { members } = req.body;

    //--------------------------------------------------
    // 🔹 VALIDATION
    //--------------------------------------------------

    if (!members || members.length === 0) {
      return res.status(400).json({
        message: "Members are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({
        message: "Invalid groupId"
      });
    }

    //--------------------------------------------------
    // 🔹 FIND GROUP
    //--------------------------------------------------

    const group = await GroupChat.findById(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found"
      });
    }

    //--------------------------------------------------
    // 🔹 PERMISSION CHECK (IMPORTANT)
    //--------------------------------------------------

    // Only creator can add (you can customize later)
    // if (group.createdBy.toString() !== userId) {
    //   return res.status(403).json({
    //     message: "Only group creator can add members"
    //   });
    // }

    //--------------------------------------------------
    // 🔹 FILTER VALID IDS
    //--------------------------------------------------

    const validMembers = members.filter(id =>
      mongoose.Types.ObjectId.isValid(id)
    );

    //--------------------------------------------------
    // 🔹 REMOVE EXISTING MEMBERS (NO DUPLICATE)
    //--------------------------------------------------

    const newMembers = validMembers.filter(
      id => !group.members.includes(id)
    );

    if (newMembers.length === 0) {
      return res.status(400).json({
        message: "All users are already in group"
      });
    }

    //--------------------------------------------------
    // 🔹 UPDATE GROUP
    //--------------------------------------------------

    group.members.push(...newMembers);
    await group.save();

    //--------------------------------------------------
    // 🔹 SYSTEM MESSAGE (OPTIONAL BUT BEST)
    //--------------------------------------------------

    await Message.create({
      room: group._id,
      sender: userId,
      content: `Added ${newMembers.length} member(s)`,
      type: "system"
    });

    //--------------------------------------------------
    // 🔹 RESPONSE
    //--------------------------------------------------

    const updatedGroup = await GroupChat.findById(groupId)
      .populate("members", "fullName email")
      .populate("createdBy", "fullName");
// rename
// io.to(groupId).emit("groupUpdated", {
//   groupId,
//   name
// });
    res.json({
      message: "Members added successfully",
      addedCount: newMembers.length,
      group: updatedGroup
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

exports.renameGroup = async (req, res) => {
  try {

    const userId = req.user.id;
    const { groupId } = req.params;
    const { name } = req.body;

    //--------------------------------------------------
    // 🔹 VALIDATION
    //--------------------------------------------------

    if (!name || name.trim() === "") {
      return res.status(400).json({
        message: "Group name is required"
      });
    }

    const group = await GroupChat.findById(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found"
      });
    }

    //--------------------------------------------------
    // 🔹 PERMISSION CHECK
    //--------------------------------------------------

    if (group.createdBy.toString() !== userId) {
      return res.status(403).json({
        message: "Only group creator can rename"
      });
    }

    //--------------------------------------------------
    // 🔹 UPDATE NAME
    //--------------------------------------------------

    const oldName = group.groupName || "Group";
    group.groupName = name;
    await group.save();

    //--------------------------------------------------
    // 🔹 SYSTEM MESSAGE
    //--------------------------------------------------

    await Message.create({
      room: group._id,
      sender: userId,
      content: `Group renamed from "${oldName}" to "${name}"`,
      type: "system"
    });
// io.to(groupId).emit("memberLeft", {
//   groupId,
//   userId
// });
    res.json({
      message: "Group renamed successfully",
      group
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};
exports.leaveGroup = async (req, res) => {
  try {

    const userId = req.user.id;
    const { groupId } = req.params;

    //--------------------------------------------------
    // 🔹 FIND GROUP
    //--------------------------------------------------

    const group = await GroupChat.findById(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found"
      });
    }

    //--------------------------------------------------
    // 🔹 CHECK MEMBER
    //--------------------------------------------------

    const isMember = group.members.some(
      m => m.toString() === userId
    );

    if (!isMember) {
      return res.status(400).json({
        message: "You are not in this group"
      });
    }

    //--------------------------------------------------
    // 🔹 REMOVE USER
    //--------------------------------------------------

    group.members = group.members.filter(
      m => m.toString() !== userId
    );

    //--------------------------------------------------
    // 🔹 HANDLE CREATOR LEAVE
    //--------------------------------------------------

    if (group.createdBy.toString() === userId) {

      if (group.members.length > 0) {
        // assign new creator (first member)
        group.createdBy = group.members[0];
      } else {
        // no members → delete group
        await GroupChat.findByIdAndDelete(groupId);

        return res.json({
          message: "Group deleted (no members left)"
        });
      }
    }

    await group.save();

    //--------------------------------------------------
    // 🔹 SYSTEM MESSAGE
    //--------------------------------------------------

    await Message.create({
      room: group._id,
      sender: userId,
      content: "A member left the group",
      type: "system"
    });

    res.json({
      message: "You left the group successfully"
    });

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};