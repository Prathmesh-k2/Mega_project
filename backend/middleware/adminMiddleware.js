import asyncHandler from "express-async-handler";

/**
 * Middleware to ensure the user has the "teacher" role.
 * Must be used after the `protect` middleware.
 */
const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "teacher") {
    next();
  } else {
    res.status(403);
    throw new Error("Access denied. Admin/Teacher privileges required.");
  }
});

export { adminOnly };
