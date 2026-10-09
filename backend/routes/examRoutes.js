import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import {
  createExam,
  DeleteExamById,
  getExams,
  updateExam,
  publishExam,
  getExamById,
  generateAIQuestions
} from "../controllers/examController.js";
import {
  createQuestion,
  getQuestionsByExamId,
  updateQuestion,
  deleteQuestion,
} from "../controllers/quesController.js";
import {
  getCheatingLogsByExamId,
  saveCheatingLog,
} from "../controllers/cheatingLogController.js";

const examRoutes = express.Router();

// Phase 1: teacher-only on create/delete/questions/cheat-log reads; students may list & take exams
examRoutes.route("/exam").get(protect, getExams).post(protect, adminOnly, createExam);

// Define literal/static paths BEFORE wildcard params
examRoutes.route("/exam/questions").post(protect, adminOnly, createQuestion);
examRoutes.route("/exam/questions/:examId").get(protect, getQuestionsByExamId);

// Define wildcard parameter routes LAST
examRoutes.route("/exam/:examId")
  .get(protect, getExamById)
  .put(protect, adminOnly, updateExam)
  .post(protect, adminOnly, DeleteExamById);
examRoutes.route("/exam/:examId/publish").post(protect, adminOnly, publishExam);
examRoutes.route("/exam/:examId/ai-generate").post(protect, adminOnly, generateAIQuestions);

examRoutes.route("/questions/:questionId")
  .put(protect, adminOnly, updateQuestion)
  .delete(protect, adminOnly, deleteQuestion);

examRoutes.route("/cheatingLogs/:examId").get(protect, adminOnly, getCheatingLogsByExamId);
examRoutes.route("/cheatingLogs/").post(protect, saveCheatingLog);

export default examRoutes;
