const { AccessToken } = require("livekit-server-sdk");

const generateLivekitToken = (roomName, identity, name) => {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Missing LiveKit API credentials");
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return at.toJwt();
};

module.exports = { generateLivekitToken };
