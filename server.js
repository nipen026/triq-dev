const http = require("http");
const app = require("./app");
const socket = require("./socket/socketInstance");

const server = http.createServer(app);

// initialize socket.io
const io = socket.init(server);

// ✅ attach io to every request AFTER it's initialized
app.use((req, res, next) => {
  req.io = io;
  next();
});

// load socket event handlers
require("./socket/chatSocket")(io);
require("./socket/contactChatSocket")(io);
require("./socket/CallSocket")(io);
require("./cron/ticketStatusUpdater");

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
