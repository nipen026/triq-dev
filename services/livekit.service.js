const { AccessToken } = require("livekit-server-sdk");

const generateLivekitToken = async (roomName, identity, name) => {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Missing LiveKit API credentials");
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    ttl: "10m",
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  return token;
};

module.exports = { generateLivekitToken };