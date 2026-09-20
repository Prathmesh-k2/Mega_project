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
import { adminOnly } from "../middleware/adminMiddleware.js";

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

// Phase 1: teacher-only — students get 403 on approval APIs
userRoutes.get("/pending", protect, adminOnly, getPendingUsers);
userRoutes.put("/approve/:id", protect, adminOnly, approveUser);
userRoutes.delete("/reject/:id", protect, adminOnly, rejectUser);

export default userRoutes;
