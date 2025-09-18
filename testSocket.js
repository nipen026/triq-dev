import { io } from "socket.io-client";
const socket = io("http://localhost:4000");

socket.on("connect", () => {
  console.log("connected", socket.id);

  socket.emit("registerUser", { userId: "68c515db66e6b3dee33126c3" }); // send userId after connection

  // you can send either roomId directly or an object with roomId property
  // socket.emit("joinRoom", "68ca4443e2b1a9e21f9d62e7");

  socket.emit("joinRoom", { roomId: "68ca4443e2b1a9e21f9d62e7" });

  // send a message after joining
  // socket.emit("sendMessage", {
  //   roomId: "68ca4443e2b1a9e21f9d62e7",
  //   content: "hello from socket",
  //   attachments: []
  // });

  // send a message with a file attachment after joining
  setTimeout(() => {
    socket.emit("sendMessage", {
      roomId: "68ca4443e2b1a9e21f9d62e7",
      content: "hello from socket with file",
      attachments: [
        {url:'http://localhost:4000/uploads/chat/1758190135609-user_68861866d2edec3f70f01c2f.jpg', name:'sample.jpg', type:'image'}
      ]
    });
  }, 500);
});
// Listen for new messages
socket.on("newMessage", (msg) => {
  console.log("new message from server", msg);
});