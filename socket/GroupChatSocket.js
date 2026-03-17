const ChatRoom = require("../models/groupChat.model");
const Message = require("../models/groupChatMessage.model");
const admin = require("firebase-admin");
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

        socket.on("sendMessage", async ({ roomId, content, attachments, replyTo }) => {

            const room = await ChatRoom.findById(roomId).populate("members");

            if (!room) return;

            //////////////////////////////////////////////////
            // SAVE MESSAGE
            //////////////////////////////////////////////////

            const message = await Message.create({
                room: roomId,
                sender: socket.userId,
                content,
                translatedContent: content,
                attachments,
                replyTo,
                readBy: [socket.userId]
            });

            //////////////////////////////////////////////////
            // EMIT MESSAGE
            //////////////////////////////////////////////////

            io.to(roomId).emit("newMessage", message);

            //////////////////////////////////////////////////
            // UPDATE CHAT LIST
            //////////////////////////////////////////////////

            for (const member of room.members) {

                const unreadCount = await Message.countDocuments({
                    room: roomId,
                    sender: { $ne: member._id },
                    readBy: { $ne: member._id }
                });

                io.to(member._id.toString()).emit("updateChatList", {
                    roomId,
                    lastMessage: message,
                    unreadCount
                });

            }

            //////////////////////////////////////////////////
            // SEND PUSH NOTIFICATION
            //////////////////////////////////////////////////

            for (const member of room.members) {

                if (member._id.toString() === socket.userId) continue;

                const isInRoom = userRooms.get(member._id?.toString())?.has(roomId);

                if (!isInRoom && member.fcmToken) {

                    await admin.messaging().send({
                        token: member.fcmToken,
                        data: {
                            type: "chat_message",
                            roomId: roomId.toString(),
                            message: content || "Attachment"
                        }
                    });

                }

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