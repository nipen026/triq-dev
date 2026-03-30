const Room = require("../models/room.model");
const User = require("../models/user.model");
const Sound = require("../models/sound.model");
const Profile = require("../models/profile.model");
const { generateLivekitToken } = require("../services/livekit.service");
const { getIO } = require("../socket/socketInstance");
const ChatRoom = require("../models/chatRoom.model");
const GroupChat = require("../models/groupChat.model"); // ✅ NEW
const admin = require("../config/firebase");
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
      isGroupCall = false // ✅ NEW FLAG
    } = req.body;

    if (!roomName) {
      return res.status(400).json({ error: "roomName is required" });
    }

    //--------------------------------------------------
    // 🔹 USER ID
    //--------------------------------------------------
    const userId =
      identity || `user_${Math.random().toString(36).substring(2, 9)}`;

    //--------------------------------------------------
    // 🔹 GENERATE TOKEN
    //--------------------------------------------------
    const token = await generateLivekitToken(
      roomName,
      userId,
      name || userId
    );

    //--------------------------------------------------
    // 🔹 CREATE / UPDATE ROOM
    //--------------------------------------------------
    let room = await Room.findOne({ roomName });

    if (!room) {
      room = await Room.create({
        roomName,
        createdBy: userId,
        token,
        users,
        callType,
        eventType,
        isGroupCall // ✅ STORE FLAG
      });
    } else {
      room.eventType = eventType;
      room.users = users;
      room.token = token;
      room.isGroupCall = isGroupCall;
      await room.save();
    }

    //--------------------------------------------------
    // 🔹 FIND CHAT / GROUP
    //--------------------------------------------------
    let chatRoom = null;
    let groupChat = null;

    if (isGroupCall) {
      groupChat = await GroupChat.findById(roomName).populate("members");

      if (!groupChat) {
        return res.status(404).json({
          status: 0,
          message: "Group chat not found"
        });
      }
    } else {
      chatRoom = await ChatRoom.findById(roomName).populate(
        "organisation processor"
      );

      if (!chatRoom) {
        return res.status(404).json({
          status: 0,
          message: "Chat room not found"
        });
      }
    }

    //--------------------------------------------------
    // 🔹 FIND RECEIVERS
    //--------------------------------------------------
    let receivers = [];

    if (isGroupCall) {
      receivers = groupChat.members
        .map((m) => m._id.toString())
        .filter((id) => id !== users); // exclude caller
    } else {
      const receiverId =
        users === String(chatRoom.organisation._id)
          ? String(chatRoom.processor._id)
          : String(chatRoom.organisation._id);

      receivers = [receiverId];
    }

    //--------------------------------------------------
    // 🔹 SOCKET EMIT
    //--------------------------------------------------
    const io = getIO();

    let senderUser = null;

    if (isGroupCall) {
      senderUser = await User.findById(users).select(
        "fullName countryCode"
      );
    } else {
      senderUser =
        users === String(chatRoom.organisation._id)
          ? chatRoom.organisation
          : chatRoom.processor;
    }

    receivers.forEach((receiverId) => {
      io.to(receiverId).emit("incoming-call", {
        eventType,
        roomName,
        callType,
        token,
        isGroupCall,
        groupName: groupChat?.groupName || null,
        sender_name: senderUser?.fullName || "User",
        flag: getFlagWithCountryCode(senderUser?.countryCode)
      });
    });

    console.log("📞 SOCKET SENT TO:", receivers);

    //--------------------------------------------------
    // 🔹 PUSH NOTIFICATIONS
    //--------------------------------------------------
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
          await admin.messaging().sendEach({
            token: receiver.fcmToken,
            data: {
              title: `${senderUser?.fullName || "User"} is calling`,
              body: `Incoming ${callType} call`,
              eventType,
              room_id: roomName,
              user_id: receiver._id.toString(),
              name: senderUser?.fullName || "",
              profile_pic: profile?.profileImage || "",
              flag: getFlagWithCountryCode(senderUser?.countryCode),
              callType,
              isGroupCall: isGroupCall ? "true" : "false",
              groupName: groupChat?.groupName || "",
              roomToken: room?.token,
              screenName:
                callType === "video"
                  ? "video_call_view"
                  : "audio_call_view",
              sound: soundData.soundName
            }
          });

        } catch (fcmError) {
          console.error(`❌ FCM ERROR for user ${receiver._id}:`, fcmError.message);

          // 🔥 AUTO CLEAN INVALID TOKEN
          if (fcmError.message.includes("Requested entity was not found")) {
            await User.findByIdAndUpdate(receiver._id, {
              $unset: { fcmToken: "" }
            });
            console.log(`🧹 Removed invalid FCM token for user ${receiver._id}`);
          }
        }

        console.log("📨 PUSH SENT TO:", receivers);
      }

      //--------------------------------------------------
      // 🔹 RESPONSE
      //--------------------------------------------------
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
    }
    } catch (err) {
      console.error("❌ LIVEKIT ERROR:", err);

      return res.status(500).json({
        status: 0,
        error: err.message
      });
    }
  };