import express from "express";

import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
import {
  createExam,
  DeleteExamById,
  getExams,
} from "../controllers/examController.js";
import {
  createQuestion,
  getQuestionsByExamId,
} from "../controllers/quesController.js";
import {
  getCheatingLogsByExamId,
  saveCheatingLog,
} from "../controllers/cheatingLogController.js";

const examRoutes = express.Router();

// Phase 1: teacher-only on create/delete/questions/cheat-log reads; students may list & take exams
examRoutes
  .route("/exam")
  .get(protect, getExams)
  .post(protect, adminOnly, createExam);

examRoutes.route("/exam/questions").post(protect, adminOnly, createQuestion);
examRoutes.route("/exam/questions/:examId").get(protect, getQuestionsByExamId);
examRoutes
  .route("/cheatingLogs/:examId")
  .get(protect, adminOnly, getCheatingLogsByExamId);
examRoutes.route("/cheatingLogs/").post(protect, saveCheatingLog);
examRoutes.route("/exam/:examId").post(protect, adminOnly, DeleteExamById);

export default examRoutes;
