import { io } from "socket.io-client";
const socket = io("http://localhost:4000");

socket.on("connect", () => {
  console.log("connected", socket.id);

  socket.emit("registerUser", { userId: "68d55e5949079db3e6f3bb1a" }); // send userId after connection

  // you can send either roomId directly or an object with roomId property
  // socket.emit("joinRoom", "68ca4443e2b1a9e21f9d62e7");

  socket.emit("joinRoom", { roomId: "68d56e4bfa038b84241d4afe" });

  // send a message after joining
  // socket.emit("sendMessage", {
  //   roomId: "68ca4443e2b1a9e21f9d62e7",
  //   content: "hello from socket",
  //   attachments: []
  // });

  // send a message with a file attachment after joining
  setTimeout(() => {
    socket.emit("sendMessage", {
      roomId: "68d56e4bfa038b84241d4afe",
      content: "hola desde socket con archivo",
      targetLang:'en'
      // attachments: [
      //   {url:'http://localhost:4000/uploads/chat/1758190135609-user_68861866d2edec3f70f01c2f.jpg', name:'sample.jpg', type:'image'}
      // ]
    });
  }, 500);
//   socket.emit("updateTicketStatus", {
//   ticketId: "68d582e4d3232bca8c59e114",
//   status: "Resolved",
// });
// socket.on("ticketStatusUpdated", (ticket) => {
//   console.log("Ticket updated live:", ticket);
//   // update your UI list here
// });

});
// // Listen for new messages
socket.on("newMessage", (msg) => {
  console.log("new message from server", msg);
});
// import { translate } from '@vitalets/google-translate-api';


// (async () => {
//   const res = await translate("Hello world", { to: "es" });
//   console.log(res.text); // Should print: "Hola mundo"
// })();
