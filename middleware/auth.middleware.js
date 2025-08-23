const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token)
    return res.status(403).json({ message: "No token provided" });

  const realToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;

  jwt.verify(realToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(401).json({ message: "Unauthorized: Invalid token" });

    req.user = decoded; // contains { id, roles }
    next();
  });
};

module.exports = verifyToken;
