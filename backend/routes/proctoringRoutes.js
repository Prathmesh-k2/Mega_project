import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  logViolation,
  reviewProctoringEvent,
  logEvidence,
  getSessionViolations,
  getSessionReport,
  uploadEvidence,
  updateEvidenceStatus,
  getEvidence,
} from "../controllers/proctoringController.js";
import multer from "multer";
import fs from "fs";
import path from "path";

const tempEvidenceDirectory = path.resolve("backend/uploads/proctoring/tmp");
fs.mkdirSync(tempEvidenceDirectory, { recursive: true });
const evidenceUpload = multer({
  dest: tempEvidenceDirectory,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    callback(null, ["image/jpeg", "image/webp"].includes(file.mimetype));
  },
});

const proctoringRoutes = express.Router();

// All routes require authentication
proctoringRoutes.use(protect);

// Student — log violations during exam
proctoringRoutes.post("/events", logViolation);
proctoringRoutes.patch("/events/:eventId/review", reviewProctoringEvent);
proctoringRoutes.post("/evidence", logEvidence);
proctoringRoutes.post("/evidence/upload", evidenceUpload.single("evidence"), uploadEvidence);
proctoringRoutes.patch("/evidence/status", updateEvidenceStatus);
proctoringRoutes.get("/evidence/:eventId", getEvidence);

// Teacher / report viewing
proctoringRoutes.get("/sessions/:sessionId", getSessionViolations);
proctoringRoutes.get("/report/:sessionId", getSessionReport);

export default proctoringRoutes;
