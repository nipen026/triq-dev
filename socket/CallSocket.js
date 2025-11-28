const { Server } = require("socket.io");
const User = require("../models/user.model");
const Room = require("../models/room.model");
const Profile = require("../models/profile.model");
const admin = require("firebase-admin");
const { getFlagWithCountryCode } = require("../utils/flagHelper");


module.exports = (io) => {
    let onlineUsers = new Map(); // userId -> socketId

    io.on("connection", (socket) => {
        console.log("Socket Connected:", socket.id);

        // Register user to socket
        socket.on("register", (userId) => {
            socket.userId = userId;
            onlineUsers.set(userId, socket.id);
            console.log("User Registered:", userId);
        });

        socket.on("call-event", async (data) => {
            try {
                const { type, room_id, send_to } = data; // receiver user id
                const senderId = socket.userId;         // current logged in user

                if (!send_to) return console.log("❌ send_to missing");
                if (!senderId) return console.log("❌ Sender not registered");

                // Fetch sender details
                const room = await Room.findOne({roomName:room_id}).select('token')
                const senderUser = await User.findById(senderId)
                    .select("fullName countryCode fcmToken");

                const senderProfile = await Profile.findOne({ user: senderId })
                    .select("profileImage");

                const send_from = {
                    name: senderUser?.fullName,
                    user_id: senderId,
                    profile_pic: senderProfile?.profileImage || '',
                    flag: getFlagWithCountryCode(senderUser?.countryCode),
                    roomToken:room.token
                };
                console.log(send_from,"send_from");
                
                // Send socket event to receiver if online
                const receiverSocket = onlineUsers.get(send_to);
                if (receiverSocket) {
                    io.to(receiverSocket).emit("call-event", {
                        type,
                        room_id,
                        send_from
                    });
                    console.log(`📤 Socket Sent to ${send_to} =>`, type);
                } else {
                    console.log("⚠ Receiver offline -> sending push only");
                }

                const receiverUser = await User.findById(send_to).select("fcmToken fullName");

                if (!receiverUser?.fcmToken) return;

                // -----------------------------
                // 🔥 FCM PUSH NOTIFICATIONS
                // -----------------------------
                const message = {
                    token: receiverUser.fcmToken, // single token
                    notification: {
                        title:
                            type === "call-request" ? "Incoming Call" :
                            type === "call-accepted" ? "Call Accepted" :
                            type === "call-rejected" ? "Call Rejected" : "",
                        body:
                            type === "call-request" ? `${send_from.name} is calling you` :
                            type === "call-accepted" ? `${send_from.name} accepted your call` :
                            `${send_from.name} rejected your call`,
                    },
                    data: { type, room_id, ...send_from }
                };

                await admin.messaging().send(message);
                console.log("📨 FCM Sent:", type);

            } catch (error) {
                console.error("Socket Error:", error);
            }
        });

        // Disconnect event
        socket.on("disconnect", () => {
            for (const [uid, sid] of onlineUsers.entries()) {
                if (sid === socket.id) onlineUsers.delete(uid);
            }
            console.log("Socket Disconnected:", socket.id);
        });
    });

    return io;
}

