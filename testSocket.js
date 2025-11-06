import { io } from "socket.io-client";
const socket = io("http://localhost:4000");

socket.on("connect", () => {
// //   console.log("connected", socket.id);

  socket.emit("registerUser", { userId: "68e49358a5636fb13ca2f291" }); // send userId after connection

// //   // you can send either roomId directly or an object with roomId property
  // socket.emit("joinRoom", "68ca4443e2b1a9e21f9d62e7");

  socket.emit("joinRoom", { roomId: "6904c4e53afdb902cc60fba0" });

// //   // send a message after joining
  // socket.emit("sendMessage", {
  //   roomId: "6904c4e53afdb902cc60fba0",
  //   content: "नमस्ते, आप कैसे हैं?",
  //   attachments: []
  // });

// //   // send a message with a file attachment after joining
  setTimeout(() => {
    socket.emit("sendMessage", {
      roomId: "6904c4e53afdb902cc60fba0",
      content: "hola desde socket con archivo",
      // attachments: [
      //   {url:'http://localhost:4000/uploads/chat/1758190135609-user_68861866d2edec3f70f01c2f.jpg', name:'sample.jpg', type:'image'}
      // ]
    });
  }, 500);
// // //   socket.emit("updateTicketStatus", {
// // //   ticketId: "68d582e4d3232bca8c59e114",
// // //   status: "Resolved",
// // // });
// socket.on("ticketStatusUpdated", (ticket) => {
//   console.log("Ticket updated live:", ticket);
//   // update your UI list here
// });

});
// // // // Listen for new messages
socket.on("newMessage", (msg) => {
  console.log("new message from server", msg);
});

socket.on("updateChatList", (updatedChat) => {
  console.log("Chat list updated:", updatedChat);
});
// // // import { translate } from '@vitalets/google-translate-api';


// // // (async () => {
// // //   const res = await translate("Hello world", { to: "es" });
// // //   console.log(res.text); // Should print: "Hola mundo"
// // // })();
// const {translate} = require('@vitalets/google-translate-api');

// async function run() {
//   try {
//     const res = await translate('नमस्ते, आप कैसे हैं?', { to: 'zh-CN' });
//     console.log('Translated:', res.text); // 👉 "你好，你好吗？"
//   } catch (err) {
//     console.error('Translation error:', err);
//   }
// }

// run();


