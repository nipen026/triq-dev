const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userRoles = req.user.roles; // from auth middleware

    const hasRole = userRoles.some(role =>
      allowedRoles.includes(role)
    );

    if (!hasRole)
      return res.status(403).json({ message: "Access denied: insufficient permissions" });

    next();
  };
};

module.exports = allowRoles;
