import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";
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

// Phase 1: put /list/active and / before /:sessionId so "list" is not treated as an id
// Phase 1: teacher-only on session list endpoints
sessionRoutes.post("/start", startSession);
sessionRoutes.get("/list/active", adminOnly, getActiveSessions);
sessionRoutes.get("/", adminOnly, getAllSessions);

// Session-scoped student routes
sessionRoutes.get("/:sessionId", getSession);
sessionRoutes.put("/:sessionId/autosave", autoSaveAnswers);
sessionRoutes.post("/:sessionId/submit", submitSession);
sessionRoutes.post("/:sessionId/terminate", terminateSession);

export default sessionRoutes;
