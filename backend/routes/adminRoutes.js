import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import {
  getDashboardStats,
  getAnalytics,
  getActiveMonitoring,
  getStudents,
  getStudentHistory,
  getAttemptDetails,
} from "../controllers/adminController.js";

const adminRoutes = express.Router();

// All admin routes require auth + teacher role
adminRoutes.use(protect);
adminRoutes.use(adminOnly);

adminRoutes.get("/dashboard", getDashboardStats);
adminRoutes.get("/analytics", getAnalytics);
adminRoutes.get("/active-sessions", getActiveMonitoring);
adminRoutes.get("/students", getStudents);
adminRoutes.get("/students/:studentId", getStudentHistory);
adminRoutes.get("/attempts/:sessionId", getAttemptDetails);

export default adminRoutes;
