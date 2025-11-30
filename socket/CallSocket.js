const { Server } = require("socket.io");
const User = require("../models/user.model");
const Room = require("../models/room.model");          // Livekit room model
const Profile = require("../models/profile.model");
const Sound = require('../models/sound.model');
const admin = require("firebase-admin");
const ChatRoom = require('../models/chatRoom.model');  // Chat table model
const { getFlagWithCountryCode } = require("../utils/flagHelper");


module.exports = (io) => {


    io.on("connection", socket => {
        console.log("✅ Call Socket connected:", socket.id);
        // Register user session ================================
        socket.on("register", (userId) => {
            socket.userId = userId;
            socket.join(userId);
            console.log("🟢 Registered in room:", userId);
        });




        socket.on("call-event", async ({eventType, room_id, callType = "video" }) => {
            try {
                console.log(eventType, room_id, callType, "type, room_id, callType");

                const senderId = socket.userId;
                if (!senderId) return console.log("❌ Unregistered Sender");

                const room = await Room.findOne({ roomName: room_id }).select("token");
                console.log(room, "room");

                const chatRoom = await ChatRoom.findById(room_id).populate("organisation processor");
                if (!chatRoom) return console.log("❌ ChatRoom Not Found");

                // AUTO GET RECEIVER
                const receiverId =
                    senderId === String(chatRoom.organisation._id)
                        ? String(chatRoom.processor._id)
                        : String(chatRoom.organisation._id);

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

                if (eventType === 'call-request') {
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
                // } else {
                //     console.log("❌ No FCM Token found for receiver");
                // }


                // } else console.log("📵 Receiver Offline — Push Only");

            } catch (err) {
                console.log("❌ CALL ERROR:", err);
            }
        });
        // On disconnect ======================================
        socket.on("disconnect", () => {
            console.log("🔴 User Disconnected:", socket.userId);
        });
    });

    return io;
};
