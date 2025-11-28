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

  // Grant must be a plain object in latest SDK
  const grant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  };

  at.addGrant(grant);

  return at.toJwt();
};

module.exports = { generateLivekitToken };
