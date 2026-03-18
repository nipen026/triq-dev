const ChatRoom = require("../models/groupChat.model");
const Message = require("../models/groupChatMessage.model");
const Profile = require("../models/profile.model");
const Sound = require("../models/sound.model");
const User = require("../models/user.model");
const admin = require("firebase-admin");
const { translate } = require("@vitalets/google-translate-api");
module.exports = (io) => {

    const onlineUsers = new Map();
    const userRooms = new Map();

    io.on("connection", (socket) => {

        console.log("Socket connected", socket.id);

        //////////////////////////////////////////////////
        // REGISTER USER
        //////////////////////////////////////////////////

        socket.on("registerUser", ({ userId }) => {

            socket.userId = userId;

            onlineUsers.set(userId, socket.id);

            socket.join(userId);

            console.log("User registered:", userId);

        });


        //////////////////////////////////////////////////
        // JOIN ROOM
        //////////////////////////////////////////////////

        socket.on("joinRoom", async ({ roomId }) => {

            const room = await ChatRoom.findById(roomId);

            if (!room) return;

            if (!room.members.includes(socket.userId)) {
                return socket.emit("error", { message: "Not member of this room" });
            }

            socket.join(roomId);

            if (!userRooms.has(socket.userId)) {
                userRooms.set(socket.userId, new Set());
            }

            userRooms.get(socket.userId).add(roomId);

            //////////////////////////////////////////////////
            // MARK MESSAGES READ
            //////////////////////////////////////////////////

            await Message.updateMany(
                {
                    room: roomId,
                    sender: { $ne: socket.userId },
                    readBy: { $ne: socket.userId }
                },
                {
                    $push: { readBy: socket.userId }
                }
            );

        });


        //////////////////////////////////////////////////
        // SEND MESSAGE
        //////////////////////////////////////////////////

        // socket.on("sendMessage", async ({ roomId, content, attachments, replyTo }) => {

        //     const room = await ChatRoom.findById(roomId).populate("members");

        //     if (!room) return;

        //     //////////////////////////////////////////////////
        //     // SAVE MESSAGE
        //     //////////////////////////////////////////////////

        //     const message = await Message.create({
        //         room: roomId,
        //         sender: socket.userId,
        //         content,
        //         translatedContent: content,
        //         attachments,
        //         replyTo,
        //         readBy: [socket.userId]
        //     });

        //     //////////////////////////////////////////////////
        //     // EMIT MESSAGE
        //     //////////////////////////////////////////////////

        //     io.to(roomId).emit("newMessage", message);

        //     //////////////////////////////////////////////////
        //     // UPDATE CHAT LIST
        //     //////////////////////////////////////////////////

        //     for (const member of room.members) {

        //         const unreadCount = await Message.countDocuments({
        //             room: roomId,
        //             sender: { $ne: member._id },
        //             readBy: { $ne: member._id }
        //         });

        //         io.to(member._id.toString()).emit("updateChatList", {
        //             roomId,
        //             lastMessage: message,
        //             unreadCount
        //         });

        //     }

        //     //////////////////////////////////////////////////
        //     // SEND PUSH NOTIFICATION
        //     //////////////////////////////////////////////////

        //     for (const member of room.members) {

        //         if (member._id.toString() === socket.userId) continue;

        //         const isInRoom = userRooms.get(member._id?.toString())?.has(roomId);

        //         if (!isInRoom && member.fcmToken) {

        //             await admin.messaging().send({
        //                 token: member.fcmToken,
        //                 data: {
        //                     type: "chat_message",
        //                     roomId: roomId.toString(),
        //                     message: content || "Attachment"
        //                 }
        //             });

        //         }

        //     }

        // });
        socket.on("sendMessage", async ({ roomId, content, attachments, replyTo }) => {
            try {
                if (!socket.userId || !roomId) return;

                const room = await ChatRoom.findById(roomId).populate("members");
                if (!room) return;

                //////////////////////////////////////////////////
                // 🔹 SAVE ORIGINAL MESSAGE
                //////////////////////////////////////////////////

                const message = await Message.create({
                    room: roomId,
                    sender: socket.userId,
                    content,
                    attachments,
                    replyTo: replyTo || null,
                    readBy: [socket.userId],
                });

                //////////////////////////////////////////////////
                // 🔹 PROCESS EACH MEMBER (TRANSLATION + NOTIFICATION)
                //////////////////////////////////////////////////

                for (const member of room.members) {

                    const memberId = member._id.toString();

                    // skip sender
                    if (memberId === socket.userId) continue;

                    //////////////////////////////////////////////////
                    // 🔹 GET USER LANGUAGE
                    //////////////////////////////////////////////////

                    const profile = await Profile.findOne({ user: memberId });
                    const targetLang = profile?.chatLanguage || "en";

                    //////////////////////////////////////////////////
                    // 🔹 TRANSLATE MESSAGE
                    //////////////////////////////////////////////////

                    let translatedText = content;

                    if (content && targetLang) {
                        try {
                            const result = await translate(content, { to: targetLang });
                            translatedText = result.text;
                        } catch (err) {
                            console.warn("Translation failed:", err.message);
                        }
                    }

                    //////////////////////////////////////////////////
                    // 🔹 EMIT MESSAGE (PER USER)
                    //////////////////////////////////////////////////

                    io.to(memberId).emit("newMessage", {
                        ...message.toObject(),
                        translatedContent: translatedText
                    });

                    //////////////////////////////////////////////////
                    // 🔹 UNREAD COUNT
                    //////////////////////////////////////////////////

                    const unreadCount = await Message.countDocuments({
                        room: roomId,
                        sender: { $ne: memberId },
                        readBy: { $ne: memberId }
                    });

                    io.to(memberId).emit("updateChatList", {
                        roomId,
                        lastMessage: {
                            ...message.toObject(),
                            translatedContent: translatedText
                        },
                        unreadCount
                    });

                    //////////////////////////////////////////////////
                    // 🔹 PUSH NOTIFICATION (ONLY IF OFFLINE)
                    //////////////////////////////////////////////////

                    const isInRoom = userRooms.get(memberId)?.has(roomId);

                    if (!isInRoom && member.fcmToken) {

                        const soundData = await Sound.findOne({
                            type: "chat",
                            user: memberId
                        });

                        const soundName = soundData?.soundName || "default";

                        const senderUser = await User.findById(socket.userId);

                        const pushPayload = {
                            token: member.fcmToken,

                            data: {
                                type: "group_chat",
                                title: `${senderUser?.fullName || "User"} (Group)`,
                                body: translatedText || "Attachment",
                                roomId: roomId.toString(),
                                sound: soundName,
                            },

                            android: {
                                priority: "high"
                            },

                            apns: {
                                headers: { "apns-priority": "10" },
                                payload: {
                                    aps: {
                                        sound: `${soundName}.aiff`,
                                        "content-available": 1,
                                        "mutable-content": 1
                                    }
                                }
                            }
                        };

                        const response = await admin.messaging().sendEachForMulticast({
                            tokens: [member.fcmToken],
                            data: pushPayload.data,
                            android: pushPayload.android,
                            apns: pushPayload.apns
                        });
                        console.log(response,"response");
                        
                        response.responses.forEach(async (res, idx) => {
                            if (!res.success) {
                                const errorCode = res.error.code;

                                if (
                                    errorCode === "messaging/registration-token-not-registered" ||
                                    errorCode === "messaging/invalid-registration-token"
                                ) {
                                    await User.findByIdAndUpdate(memberId, {
                                        $unset: { fcmToken: "" }
                                    });
                                }
                            }
                        });
                    }
                }

                //////////////////////////////////////////////////
                // 🔹 EMIT TO ROOM (FOR REALTIME USERS)
                //////////////////////////////////////////////////

                io.to(roomId).emit("newMessage", {
                    ...message.toObject(),
                    translatedContent: content // sender version
                });

            } catch (err) {
                console.error("Group sendMessage error:", err);
            }
        });
        //////////////////////////////////////////////////
        // MESSAGE SEEN
        //////////////////////////////////////////////////

        socket.on("seenMessage", async ({ messageId }) => {

            await Message.updateOne(
                { _id: messageId },
                {
                    $push: {
                        seenBy: {
                            user: socket.userId,
                            time: new Date()
                        }
                    }
                }
            );

        });

        //////////////////////////////////////////////////
        // REACTION
        //////////////////////////////////////////////////

        socket.on("reactMessage", async ({ messageId, emoji }) => {

            const message = await Message.findById(messageId);

            message.reactions = message.reactions.filter(
                r => r.user.toString() !== socket.userId
            );

            message.reactions.push({
                user: socket.userId,
                emoji
            });

            await message.save();

            io.to(message.room.toString()).emit("messageReactionUpdated", {
                messageId,
                reactions: message.reactions
            });

        });

        //////////////////////////////////////////////////
        // TYPING
        //////////////////////////////////////////////////

        socket.on("typing", ({ roomId }) => {

            socket.to(roomId).emit("userTyping", {
                userId: socket.userId
            });

        });

        //////////////////////////////////////////////////
        // DISCONNECT
        //////////////////////////////////////////////////

        socket.on("disconnect", () => {

            if (socket.userId) {

                onlineUsers.delete(socket.userId);

                userRooms.delete(socket.userId);

            }

            console.log("Socket disconnected");

        });

    });
};