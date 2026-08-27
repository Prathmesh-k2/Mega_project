import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  logViolation,
  logEvidence,
  getSessionViolations,
  getSessionReport,
} from "../controllers/proctoringController.js";

const proctoringRoutes = express.Router();

// All routes require authentication
proctoringRoutes.use(protect);

// Student — log violations during exam
proctoringRoutes.post("/events", logViolation);
proctoringRoutes.post("/evidence", logEvidence);

// Teacher / report viewing
proctoringRoutes.get("/sessions/:sessionId", getSessionViolations);
proctoringRoutes.get("/report/:sessionId", getSessionReport);

export default proctoringRoutes;
