const { AccessToken, RoomGrant } = require("livekit-server-sdk");

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

  const grant = new RoomGrant({
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  at.addGrant(grant);

  // Optional: expiry
  // at.ttl = 60 * 60; // 1 hour

  return at.toJwt();
};

module.exports = { generateLivekitToken };
