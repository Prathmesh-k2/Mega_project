import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import {
  saveResult,
  getResultsByExamId,
  getUserResults,
  toggleResultVisibility,
  getAllResults,
} from "../controllers/resultController.js";

const resultRoutes = express.Router();

// All routes are protected
resultRoutes.use(protect);

// Save result
resultRoutes.post("/results", saveResult);

// Phase 1: teacher-only for all-results / by-exam / visibility toggle
resultRoutes.get("/results/all", adminOnly, getAllResults);
resultRoutes.get("/results/exam/:examId", adminOnly, getResultsByExamId);

// Get results for current user
resultRoutes.get("/results/user", getUserResults);

resultRoutes.put(
  "/results/:resultId/toggle-visibility",
  adminOnly,
  toggleResultVisibility
);

export default resultRoutes;
