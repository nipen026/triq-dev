const { Server } = require("socket.io");
const User = require("../models/user.model");
const Room = require("../models/room.model");          // Livekit room model
const Profile = require("../models/profile.model");
const Sound = require('../models/sound.model');
const admin = require("firebase-admin");
const ChatRoom = require('../models/chatRoom.model');  // Chat table model
const { getFlagWithCountryCode } = require("../utils/flagHelper");


module.exports = (io) => {
    global.onlineUsers = new Map();


    io.on("connection", socket => {

        // Register user session ================================
        socket.on("register", userId => {
            socket.userId = userId;
            global.onlineUsers.set(userId, socket.id);
        });


        // CALL EVENT ===========================================
        // socket.on("call-event", async ({ type, room_id, callType = "video",users }) => {
        //     try {
        //         const senderId = users;
        //         if (!senderId) return console.log("❌ Sender Not Registered");

        //         // Fetch Livekit token from room table
        //         const room = await Room.findOne({ roomName: room_id }).select("token");

        //         // Fetch chat participants
        //         const chatRoomData = await ChatRoom.findById(room_id)
        //             .populate("organisation processor");

        //         if (!chatRoomData) return console.log("❌ Chat Room Not Found");

        //         // Auto detect receiver (sender ≠ receiver)
        //         const receiverId =
        //             senderId === String(chatRoomData.organisation._id)
        //                 ? String(chatRoomData.processor._id)
        //                 : String(chatRoomData.organisation._id);

        //         // Fetch sender data
        //         const sender = await User.findById(senderId).select("fullName countryCode");
        //         const senderProfile = await Profile.findOne({ user: senderId }).select("profileImage");

        //         // Payload sent to receiver
        //         const payload_from_sender = {
        //             type,
        //             room_id,
        //             user_id: senderId,
        //             name: sender.fullName,
        //             profile_pic: senderProfile?.profileImage || "",
        //             flag: getFlagWithCountryCode(sender.countryCode),
        //             callType,
        //             roomToken: room?.token || null
        //         };

        //         // ================== SOCKET EMIT ==========================
        //         if (global.onlineUsers.has(receiverId)) {
        //             io.to(global.onlineUsers.get(receiverId)).emit("call-event", payload_from_sender);
        //             console.log(`📞 CALL SENT → ${receiverId}`);
        //         } else {
        //             console.log("📵 Receiver offline — sending push only");
        //         }


        //         // ================== PUSH NOTIFICATION ======================
        //         const receiver = await User.findById(receiverId).select("fcmToken fullName");

        //         if (receiver?.fcmToken) {
        //             const userSound = await Sound.findOne({
        //                 user: receiverId,
        //                 type: callType === "audio" ? "voice_call" : "video_call"
        //             }) || { soundName: "bell" };

        //             const notify = {
        //                 token: receiver.fcmToken,
        //                 data: {
        //                     ...payload_from_sender,
        //                     title: `${sender.fullName} is calling`,
        //                     body: `Incoming ${callType} call`,
        //                     screen: callType === "video" ? "video_call_view" : "audio_call_view",
        //                     sound: userSound.soundName
        //                 },
        //                 android: { priority: "high" },
        //                 apns: {
        //                     payload: {
        //                         aps: {
        //                             sound: `${userSound.soundName}.aiff`,
        //                             "content-available": 1,
        //                             "mutable-content": 1
        //                         }
        //                     }
        //                 }
        //             };

        //             await admin.messaging().send(notify);
        //             console.log(`📨 PUSH SENT → ${receiver.fullName}`);
        //         }

        //     } catch (err) {
        //         console.log("❌ CALL-EVENT ERROR:", err);
        //     }
        // });

        socket.on("call-event", async ({ type, room_id, callType = "video" }) => {
            try {
                const senderId = socket.userId;                 // FIXED
                if (!senderId) return console.log("❌ Unregistered Sender");

                const room = await Room.findOne({ roomName: room_id }).select("token");
                const chatRoom = await ChatRoom.findById(room_id).populate("organisation processor");
                if (!chatRoom) return console.log("❌ ChatRoom Not Found");

                // AUTO GET RECEIVER
                const receiverId =
                    senderId === String(chatRoom.organisation._id)
                        ? String(chatRoom.processor._id)
                        : String(chatRoom.organisation._id);

                const sender = await User.findById(senderId).select("fullName countryCode");
                const profile = await Profile.findOne({ user: senderId }).select("profileImage");

                const payload = {
                    type,
                    room_id,
                    user_id: senderId,
                    name: sender.fullName,
                    profile_pic: profile?.profileImage || "",
                    flag: getFlagWithCountryCode(sender.countryCode),
                    callType,
                    roomToken: room?.token || null
                };

                // 🔥 EMIT CALL TO RECEIVER ONLY
                if (global.onlineUsers.has(receiverId)) {
                    io.to(global.onlineUsers.get(receiverId)).emit("call-event", payload);
                    console.log("📞 CALL SENT →", receiverId);
                    const receiver = await User.find({_id:receiverId}).select("fcmToken fullName");
                    console.log(receiver,"receiver")
                    if (receiver?.fcmToken) {
                        const userSound = await Sound.findOne({
                            user: receiverId,
                            type: callType === "audio" ? "voice_call" : "video_call"
                        }) || { soundName: "bell" };

                        const notify = {
                            token: receiver.fcmToken,
                            data: {
                                ...payload_from_sender,
                                title: `${sender.fullName} is calling`,
                                body: `Incoming ${callType} call`,
                                screen: callType === "video" ? "video_call_view" : "audio_call_view",
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

                        await admin.messaging().send(notify);
                        console.log(`📨 PUSH SENT → ${receiver.fullName}`);
                    }


                } else console.log("📵 Receiver Offline — Push Only");

            } catch (err) {
                console.log("❌ CALL ERROR:", err);
            }
        });
        // On disconnect ======================================
        socket.on("disconnect", () => {
            global.onlineUsers.forEach((s, id) => {
                if (s === socket.id) global.onlineUsers.delete(id);
            });
        });
    });

    return io;
};
