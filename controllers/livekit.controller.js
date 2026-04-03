const Room = require("../models/room.model");
const User = require("../models/user.model");
const Sound = require("../models/sound.model");
const Profile = require("../models/profile.model");
const ChatRoom = require("../models/chatRoom.model");
const GroupChat = require("../models/groupChat.model");
const admin = require("../config/firebase");
const { generateLivekitToken } = require("../services/livekit.service");
const { getIO } = require("../socket/socketInstance");
const { getFlagWithCountryCode } = require("../utils/flagHelper");

exports.createSession = async (req, res) => {
  try {
    const {
      roomName,
      identity,
      name,
      users,
      callType = "video",
      eventType = "call-request",
      isGroupCall = false
    } = req.body;
    console.log(req.body, "createSession body");
    if (!roomName) {
      return res.status(400).json({ error: "roomName is required" });
    }

    const userId =
      identity || `user_${Math.random().toString(36).substring(2, 9)}`;

    const token = await generateLivekitToken(roomName, userId, name || userId);

    let room = await Room.findOne({ roomName });

    if (!room) {
      room = await Room.create({
        roomName,
        createdBy: userId,
        token,
        users,
        callType,
        eventType,
        isGroupCall
      });
    } else {
      room.token = token;
      room.eventType = eventType;
      room.users = users;
      room.isGroupCall = isGroupCall;
      await room.save();
    }

    let receivers = [];
    let senderUser = null;
    let groupName = "";

    //---------------------------------------
    // ✅ GROUP CALL
    //---------------------------------------
    if (isGroupCall) {
      const group = await GroupChat.findById(roomName).populate("members");

      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      senderUser = await User.findById(users).select("fullName countryCode");
      groupName = group.groupName;

      if (!users) {
        return res.status(400).json({ error: "Sender user missing" });
      }

      receivers = group.members
        .map(m => String(m._id))
        .filter(id => id && id !== String(users));
    }

    //---------------------------------------
    // ✅ 1-to-1 CALL
    //---------------------------------------
    else {
      const chatRoom = await ChatRoom.findById(roomName).populate(
        "organisation processor"
      );

      if (!chatRoom) {
        return res.status(404).json({ error: "Chat room not found" });
      }

      const receiverId =
        users === String(chatRoom.organisation._id)
          ? String(chatRoom.processor._id)
          : String(chatRoom.organisation._id);

      senderUser =
        users === String(chatRoom.organisation._id)
          ? chatRoom.organisation
          : chatRoom.processor;

      receivers = [receiverId];
    }

    //---------------------------------------
    // ✅ SOCKET EMIT
    //---------------------------------------
    const io = getIO();

    receivers.forEach((receiverId) => {
      io.to(receiverId).emit("incoming-call", {
        eventType,
        roomName,
        callType,
        token,
        isGroupCall,
        groupName,
        sender_name: senderUser?.fullName || "User",
        flag: getFlagWithCountryCode(senderUser?.countryCode)
      });
    });

    console.log("📞 SOCKET SENT TO:", receivers);

    //---------------------------------------
    // ✅ PUSH NOTIFICATIONS
    //---------------------------------------
    if (eventType === "call-request") {
      const usersData = await User.find({
        _id: { $in: receivers }
      }).select("fullName fcmToken countryCode");

      const profile = await Profile.findOne({ user: users });

      for (const receiver of usersData) {
        if (!receiver.fcmToken) continue;

        const soundData =
          (await Sound.findOne({
            user: receiver._id,
            type: callType === "audio" ? "voice_call" : "video_call"
          })) || { soundName: "bell" };

        try {
          // await admin.messaging().send({
          //   token: receiver.fcmToken,
          //   data: {
          //     title: `${senderUser?.fullName} is calling`,
          //     body: `Incoming ${callType} call`,
          //     eventType,
          //     room_id: roomName,
          //     callType,
          //     isGroupCall: isGroupCall ? "true" : "false",
          //     groupName,
          //     name: senderUser?.fullName || "",
          //     profile_pic: profile?.profileImage || "",
          //     flag: getFlagWithCountryCode(senderUser?.countryCode),
          //     roomToken: token,
          //     screenName:
          //       callType === "video"
          //         ? "video_call_view"
          //         : "audio_call_view",
          //     sound: soundData.soundName
          //   }
          // });
          await admin.messaging().send({
            token: receiver.fcmToken,

            notification: {
              title: `${senderUser?.fullName} is calling`,
              body: `Incoming ${callType} call`
            },

            data: {
              eventType,
              room_id: roomName,
              callType,
              isGroupCall: isGroupCall ? "true" : "false",
              groupName,
              name: senderUser?.fullName || "",
              profile_pic: profile?.profileImage || "",
              flag: getFlagWithCountryCode(senderUser?.countryCode),
              roomToken: token,
              screenName: callType === "video"
                ? "video_call_view"
                : "audio_call_view",
              sound: soundData.soundName
            },

            android: {
              priority: "high"
            }
          });
        } catch (err) {
          console.log("❌ FCM ERROR:", err.message);
        }
      }
    }

    //---------------------------------------
    return res.json({
      status: 1,
      message: "Livekit session created",
      token,
      eventType,
      identity: userId,
      callType,
      isGroupCall,
      livekitUrl: process.env.LIVEKIT_URL
    });

  } catch (err) {
    console.error("❌ LIVEKIT ERROR:", err);
    return res.status(500).json({
      status: 0,
      error: err.message
    });
  }
};