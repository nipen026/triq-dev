const Room = require("../models/room.model");
const User = require("../models/user.model");
const Sound = require("../models/sound.model");
const Profile = require('../models/profile.model');
const { generateLivekitToken } = require("../services/livekit.service");
const { getIO } = require("../socket/socketInstance");
const ChatRoom = require('../models/chatRoom.model');
const admin = require("../config/firebase");
const { getFlagWithCountryCode } = require("../utils/flagHelper");

exports.createSession = async (req, res) => {
  try {
    const { roomName, identity, name, users = "", callType = "video", eventType = "call-request" } = req.body;
    if (!roomName) return res.status(400).json({ error: "roomName is required" });

    const userId = identity || `user_${Math.random().toString(36).substring(2, 9)}`;

    const token = await generateLivekitToken(roomName, userId, name || userId);

    // FIX ❗ Find room by roomName, NOT _id
    let room = await Room.findOne({ roomName });

    if (!room) {
      room = await Room.create({
        roomName,
        createdBy: userId,
        token,
        users,
        callType,
        eventType
      });
    } else {
      room.eventType = eventType;
      room.users = users;
      await room.save();
    }

    const chatRoom = await ChatRoom.findById(roomName).populate("organisation processor");
    if (!chatRoom) return console.log("❌ ChatRoom Not Found");

    // AUTO DETECT CALL RECEIVER
    const receiverId =
      users === String(chatRoom.organisation._id)
        ? String(chatRoom.processor._id)
        : String(chatRoom.organisation._id);

    const senderUser =
      users === String(chatRoom.organisation._id) ? chatRoom.organisation : chatRoom.processor;
    const receiverUser =
      users === String(chatRoom.organisation._id) ? chatRoom.processor : chatRoom.organisation;

    // If receiver online -> emit socket event directly
    // const socketId = global.onlineUsers.get(receiverId);

    // if (receiverId && eventType === "call_request") {
    const io = getIO();
    io.to(receiverId).emit("incoming-call", {
      eventType,
      roomName,
      callType,
      token,
      sender_name: senderUser.fullName,
      receiver_name: receiverUser.fullName,
      flag: getFlagWithCountryCode(senderUser.countryCode),
      user: users
    });
    const senderId = senderUser;
    if (!senderId) return console.log("❌ Unregistered Sender");





    if (!chatRoom) return console.log("❌ ChatRoom Not Found");

    // AUTO GET RECEIVER


    const sender = await User.findById(senderId).select("fullName countryCode");
    const profile = await Profile.findOne({ user: senderId }).select("profileImage");
    const userID = await User.findOne({ _id: receiverId });
    console.log(userID)
    const payload = {
      eventType,
      room_id,
      user_id: receiverId,
      name: sender.fullName,
      sender_name: senderId === String(chatRoom.organisation._id) ? String(chatRoom.organisation.fullName) : String(chatRoom.processor.fullName),
      receiver_name: senderId === String(chatRoom.organisation._id) ? String(chatRoom.processor.fullName) : String(chatRoom.organisation.fullName),
      profile_pic: profile?.profileImage || "",
      flag: getFlagWithCountryCode(sender.countryCode),
      callType,
      roomToken: room?.token
    };
    const receiverData = await User.findById(receiverId).select("fcmToken fullName");
    // 🔥 EMIT CALL TO RECEIVER ONLY
    // if (global.onlineUsers.has(receiverId)) {  
    io.to(receiverId).emit("call-event", payload);
    console.log("📞 CALL SENTTT →", receiverId);

    console.log(receiverData, eventType, "receiver");

    if (eventType == 'call-request') {
      console.log('hello');

      const userSound = await Sound.findOne({
        user: receiverId,
        type: callType === "audio" ? "voice_call" : "video_call"
      }) || { soundName: "bell" };

      const notify = {
        tokens: [receiverData.fcmToken],
        data: {
          ...payload,
          title: `${sender.fullName} is calling`,
          body: `Incoming ${callType} call`,
          screenName: callType === "video" ? "video_call_view" : "audio_call_view",
          sound: userSound.soundName
        },
        android: { priority: "high" },
        apns: {
          payload: {
            aps: {
              sound: `${userSound.soundName}.aiff`,
              "content-available": 1,
              "mutable-content": 1
            }
          }
        }
      };
      console.log(notify, "notify");

      await admin.messaging().sendEachForMulticast(notify);
      console.log(`📨 PUSH SENT → ${receiverData.fullName}`);
    }
    console.log("📞 Incoming Call Sent via WebSocket →", receiverId);
    // }

    // Always send Notification (even if offline)
    // const receiver = await User.findById(receiverId).select("fcmToken fullName");
    // if (receiver?.fcmToken) {
    //   const payload = {
    //     token: receiver.fcmToken,   // FIX 🔥 token only (not tokens)
    //     notification: {
    //       title: `${senderUser.fullName} is calling`,
    //       body: `Incoming ${callType.toUpperCase()} Call`,
    //     },
    //     data: {
    //       roomName,
    //       callType,
    //       token,
    //       eventType: "call_request"
    //     }
    //   };

    //   await admin.messaging().send(payload);
    //   console.log("📨 Push Notification Delivered →", receiver.fullName);
    // }

    return res.json({
      status: 1,
      message: "Livekit session created",
      token,
      eventType,
      identity: userId,
      callType,
      livekitUrl: process.env.LIVEKIT_URL
    });

  } catch (err) {
    console.error("LIVEKIT ERROR:", err);
    return res.status(500).json({ status: 0, error: err.message });
  }
};
