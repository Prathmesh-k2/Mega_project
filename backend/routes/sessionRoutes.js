import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  startSession,
  getSession,
  autoSaveAnswers,
  submitSession,
  terminateSession,
  getActiveSessions,
  getAllSessions,
} from "../controllers/sessionController.js";

const sessionRoutes = express.Router();

// All routes require authentication
sessionRoutes.use(protect);

// Student routes
sessionRoutes.post("/start", startSession);
sessionRoutes.get("/:sessionId", getSession);
sessionRoutes.put("/:sessionId/autosave", autoSaveAnswers);
sessionRoutes.post("/:sessionId/submit", submitSession);
sessionRoutes.post("/:sessionId/terminate", terminateSession);

// Teacher routes
sessionRoutes.get("/", getAllSessions);
sessionRoutes.get("/list/active", getActiveSessions);

export default sessionRoutes;
