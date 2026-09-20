import express from "express";
import {
  submitCodingAnswer,
  createCodingQuestion,
  getCodingQuestions,
  getCodingQuestion,
  getCodingQuestionsByExamId,
} from "../controllers/codingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

// Protected routes (require authentication)
router.use(protect);

// Student routes
router.post("/submit", submitCodingAnswer);
router.get("/questions/exam/:examId", getCodingQuestionsByExamId);

// Phase 1: teacher-only — create/list coding questions
router.post("/question", adminOnly, createCodingQuestion);
router.get("/questions", adminOnly, getCodingQuestions);
router.get("/questions/:id", adminOnly, getCodingQuestion);

export default router;
