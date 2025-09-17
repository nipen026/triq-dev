const http = require("http");
const app = require("./app");
const socket = require("./socket/socketInstance");

const server = http.createServer(app);

// init socket.io
const io = socket.init(server);

// load your socket event handlers
require("./socket/chatSocket")(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
