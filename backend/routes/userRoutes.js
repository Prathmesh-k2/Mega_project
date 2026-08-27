import express from "express";
import {
  authUser,
  getUserProfile,
  logoutUser,
  registerUser,
  updateUserProfile,
  sendOtp,
  getPendingUsers,
  approveUser,
  rejectUser,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const userRoutes = express.Router();

// Public routes
userRoutes.post("/send-otp", sendOtp);
userRoutes.post("/auth", authUser);
userRoutes.post("/logout", logoutUser);
userRoutes.post("/", registerUser);
userRoutes.post("/register", registerUser);

// Protected profile routes
userRoutes
  .route("/profile")
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Teacher/Admin — user approval routes (protected)
userRoutes.get("/pending", protect, getPendingUsers);
userRoutes.put("/approve/:id", protect, approveUser);
userRoutes.delete("/reject/:id", protect, rejectUser);

export default userRoutes;
