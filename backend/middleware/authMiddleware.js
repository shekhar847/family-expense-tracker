const authMiddleware = (req, res, next) => {
  const user_id = req.body.user_id || req.params.user_id;
  if (!user_id) {
    return res.status(401).json({ message: "Unauthorized — user_id missing" });
  }
  next();
};

module.exports = authMiddleware;