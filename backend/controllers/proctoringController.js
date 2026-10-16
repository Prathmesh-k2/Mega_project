import asyncHandler from "express-async-handler";
import ViolationEvent from "../models/violationEventModel.js";
import ExamSession from "../models/examSessionModel.js";
import Exam from "../models/examModel.js";
import PROCTORING_CONFIG from "../config/proctoring.js";
import { calculateFullScore } from "../services/ScoringEngine.js";
import { classifyProctoringEvent } from "../services/ProctoringPolicy.js";
import { isConfirmedViolation } from "../services/ProctoringPolicy.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const evidenceDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../uploads/proctoring",
);
fs.mkdirSync(evidenceDirectory, { recursive: true });

// @desc    Log a violation event
// @route   POST /api/proctoring/events
// @access  Private (student during exam)
const logViolation = asyncHandler(async (req, res) => {
  const {
    sessionId,
    eventType,
    confidence,
    description,
    evidencePath,
    metadata,
    eventId,
  } = req.body;

  if (!sessionId || !eventType) {
    res.status(400);
    throw new Error("sessionId and eventType are required");
  }
  const validEventTypes = ViolationEvent.schema.path("eventType").enumValues;
  if (!validEventTypes.includes(eventType)) {
    res.status(400);
    throw new Error("Unsupported proctoring event type");
  }

  if (eventId) {
    const existing = await ViolationEvent.findOne({ eventId });
    if (existing) {
      const scoring = calculateFullScore(await ViolationEvent.find({ sessionId }));
      return res.status(200).json({
        success: true,
        duplicate: true,
        violation: existing,
        currentScore: scoring.hybridScore,
        classification: scoring.classification,
        fairnessScore: scoring.fairnessScore,
        shouldTerminate: false,
      });
    }
  }

  // Verify session is active
  const session = await ExamSession.findById(sessionId);
  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }
  if (session.status !== "ACTIVE") {
    return res.status(200).json({
      success: true,
      message: "Session no longer active, event ignored",
    });
  }

  const exam = await Exam.findOne({ examId: session.examId }).select("settings").lean();
  const decision = classifyProctoringEvent(eventType, { examSettings: exam?.settings || {} });
  const sourceValues = new Set(["laptop", "mobile", "browser", "microphone"]);
  const providedSource = metadata?.cameraSource || metadata?.source;
  const cameraSource = sourceValues.has(providedSource) ? providedSource : "unknown";
  const confidenceValue = Number(confidence);
  const eventConfidence = Number.isFinite(confidenceValue)
    ? Math.min(1, Math.max(0, confidenceValue))
    : 0;
  const riskScoreBefore = session.hybridScore || 0;
  const penaltyPoints = decision.status === "VIOLATION_CONFIRMED"
    ? (PROCTORING_CONFIG.penalties[eventType] || 0)
    : 0;
  const severity = decision.status === "REVIEW_REQUIRED"
    ? (PROCTORING_CONFIG.severity[eventType] || "MEDIUM")
    : (PROCTORING_CONFIG.severity[eventType] || "LOW");

  // Create violation event
  const violation = await ViolationEvent.create({
    sessionId,
    eventId,
    studentId: session.studentId,
    examId: session.examId,
    eventType,
    severity,
    confidence: eventConfidence,
    penaltyPoints,
    description: description || `${eventType} detected`,
    decisionStatus: decision.status,
    decisionReason: decision.reason,
    riskScoreBefore,
    evidencePath: evidencePath || "",
    evidenceStatus: ["NO_FACE_DETECTED", "MULTIPLE_FACES", "CELL_PHONE_DETECTED", "BOOK_DETECTED", "PERSON_IN_BACKGROUND", "PROHIBITED_OBJECT", "BACKGROUND_NOISE"].includes(eventType)
      ? "PENDING"
      : "NOT_APPLICABLE",
    metadata: { ...(metadata || {}), cameraSource },
  });

  // Update session violation summary
  const summaryKey = getViolationSummaryKey(eventType);
  if (summaryKey) {
    session.violationSummary[summaryKey] =
      (session.violationSummary[summaryKey] || 0) + 1;
  }

  // Recalculate scores
  const allViolations = await ViolationEvent.find({ sessionId });
  const scoring = calculateFullScore(allViolations);
  const pendingReviewCount = allViolations.filter((event) => event.decisionStatus === "REVIEW_REQUIRED").length;

  session.eventScore = scoring.eventScore;
  session.aiScore = scoring.aiScore;
  session.hybridScore = scoring.hybridScore;
  session.fairnessScore = scoring.fairnessScore;
  session.totalPenalties = scoring.totalPenalties;
  session.totalViolations = scoring.totalViolations;
  session.classification = pendingReviewCount > 0 && scoring.classification === "SAFE"
    ? "ADMIN_REVIEW"
    : scoring.classification;
  session.decisionReason = pendingReviewCount > 0
    ? `${pendingReviewCount} unverified signal(s) need human review; no penalty was applied.`
    : scoring.decisionReason;
  session.reviewExplanation = "";
  session.reviewExplanationGeneratedAt = undefined;

  await session.save();
  violation.riskScoreAfter = scoring.hybridScore;
  await violation.save();

  // Check auto-termination
  const shouldTerminate =
    PROCTORING_CONFIG.termination.ENABLED &&
    scoring.hybridScore >= PROCTORING_CONFIG.termination.SCORE_THRESHOLD;

  if (shouldTerminate) {
    session.status = "TERMINATED";
    session.terminatedAt = new Date();
    session.terminationReason = "Exam terminated: Malpractice threshold exceeded";
    await session.save();
  }

  const payload = {
    success: true,
    violation,
    currentScore: scoring.hybridScore,
    classification: session.classification,
    decisionStatus: decision.status,
    decisionReason: decision.reason,
    riskScoreBefore,
    riskScoreAfter: scoring.hybridScore,
    fairnessScore: scoring.fairnessScore,
    shouldTerminate,
  };

  // Emit real-time authoritative update to admin UI
  if (req.io) {
    req.io.to('admin-monitoring').emit('proctoring-update', {
        ...payload,
        session: {
           id: session._id,
           status: session.status,
           decisionReason: session.decisionReason,
           studentId: session.studentId,
           examId: session.examId,
           totalViolations: session.totalViolations,
           fullscreenExitCount: session.violationSummary?.fullscreenExitCount || 0
        }
    });
  }

  res.status(201).json(payload);
});

const reviewProctoringEvent = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const allowedStatuses = new Set(["SAFE", "WARNING", "REVIEW_REQUIRED", "VIOLATION_CONFIRMED"]);
  if (!allowedStatuses.has(status)) {
    res.status(400);
    throw new Error("A valid review status is required");
  }
  if (!["teacher", "admin"].includes(req.user?.role)) {
    res.status(403);
    throw new Error("Only a teacher or admin may review proctoring events");
  }

  const event = await ViolationEvent.findOne({ eventId: req.params.eventId });
  if (!event || !["REVIEW_REQUIRED", "WARNING"].includes(event.decisionStatus)) {
    res.status(404);
    throw new Error("Reviewable proctoring event not found");
  }
  const [session, exam] = await Promise.all([
    ExamSession.findById(event.sessionId),
    Exam.findOne({ examId: event.examId }).select("createdBy"),
  ]);
  if (!session) {
    res.status(404);
    throw new Error("Exam session not found");
  }
  if (req.user.role === "teacher" && exam?.createdBy && exam.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You cannot review events for another teacher's exam");
  }

  const riskScoreBefore = session.hybridScore || 0;
  event.decisionStatus = status;
  event.decisionReason = String(reason || "").slice(0, 1000)
    || (status === "VIOLATION_CONFIRMED" ? "Confirmed by an authorized reviewer." : "Reviewed; no cheating penalty applied.");
  event.penaltyPoints = status === "VIOLATION_CONFIRMED"
    ? (PROCTORING_CONFIG.penalties[event.eventType] || 0)
    : 0;
  event.reviewedBy = req.user._id;
  event.reviewedAt = new Date();
  event.riskScoreBefore = riskScoreBefore;
  await event.save();

  const events = await ViolationEvent.find({ sessionId: session._id });
  const scoring = calculateFullScore(events);
  const pendingCount = events.filter((item) => item.decisionStatus === "REVIEW_REQUIRED").length;
  session.eventScore = scoring.eventScore;
  session.aiScore = scoring.aiScore;
  session.hybridScore = scoring.hybridScore;
  session.fairnessScore = scoring.fairnessScore;
  session.totalPenalties = scoring.totalPenalties;
  session.totalViolations = scoring.totalViolations;
  if (session.status !== "TERMINATED") {
    session.classification = pendingCount > 0 && scoring.classification === "SAFE"
      ? "ADMIN_REVIEW"
      : scoring.classification;
    session.decisionReason = pendingCount > 0
      ? `${pendingCount} unverified signal(s) need human review; no penalty was applied.`
      : event.decisionReason;
  }
  session.reviewExplanation = "";
  session.reviewExplanationGeneratedAt = undefined;
  await session.save();
  event.riskScoreAfter = scoring.hybridScore;
  await event.save();

  res.status(200).json({ success: true, event, session, scoring });
});

// @desc    Log evidence (screenshot URL) for a violation
// @route   POST /api/proctoring/evidence
// @access  Private
const logEvidence = asyncHandler(async (req, res) => {
  const { eventId, evidenceUrl } = req.body;
  if (!eventId || !evidenceUrl) {
    res.status(400);
    throw new Error("eventId and evidenceUrl are required");
  }
  const violation = await ViolationEvent.findOne({ eventId });
  if (!violation) {
    res.status(404);
    throw new Error("Proctoring event not found");
  }
  const session = await ExamSession.findById(violation.sessionId);
  if (!session || session.studentId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Evidence update is not authorized");
  }
  violation.evidencePath = String(evidenceUrl);
  violation.evidenceStatus = "UPLOADED";
  await violation.save();
  res.status(200).json({ success: true, violation });
});

const uploadEvidence = asyncHandler(async (req, res) => {
    const { eventId, cameraSource } = req.body;
    if (!eventId || !req.file) {
      res.status(400);
      throw new Error("eventId and an evidence image are required");
    }
    const event = await ViolationEvent.findOne({ eventId });
    if (!event) {
      res.status(404);
      throw new Error("Proctoring event not found");
    }
    const session = await ExamSession.findById(event.sessionId);
    const isOwner = session?.studentId?.toString() === req.user._id.toString();
    if (!isOwner || session.status !== "ACTIVE") {
      res.status(403);
      throw new Error("Evidence upload is not authorized for this attempt");
    }
    if (event.evidenceStatus === "UPLOADED" && event.evidencePath) {
      return res.status(200).json({ success: true, duplicate: true, event });
    }

    const extension = req.file.mimetype === "image/webp" ? ".webp" : ".jpg";
    const filename = `${event._id}${extension}`;
    const destination = path.join(evidenceDirectory, filename);
    fs.renameSync(req.file.path, destination);
    event.evidencePath = `/api/proctoring/evidence/${event.eventId}`;
    event.evidenceStatus = "UPLOADED";
    event.evidenceMimeType = req.file.mimetype;
    event.evidenceSize = req.file.size;
    event.evidenceFailureReason = "";
    event.metadata = { ...(event.metadata || {}), cameraSource: cameraSource || event.metadata?.cameraSource };
    await event.save();
    res.status(201).json({ success: true, event });
});

const updateEvidenceStatus = asyncHandler(async (req, res) => {
    const { eventId, status, failureReason } = req.body;
    if (!eventId || !["FAILED", "PENDING"].includes(status)) {
      res.status(400);
      throw new Error("eventId and a valid evidence status are required");
    }
    const event = await ViolationEvent.findOne({ eventId });
    if (!event) {
      res.status(404);
      throw new Error("Proctoring event not found");
    }
    const session = await ExamSession.findById(event.sessionId);
    if (!session || session.studentId.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Evidence status update is not authorized");
    }
    event.evidenceStatus = status;
    event.evidenceFailureReason = String(failureReason || "").slice(0, 500);
    await event.save();
    res.status(200).json({ success: true, event });
});

const getEvidence = asyncHandler(async (req, res) => {
    const event = await ViolationEvent.findOne({ eventId: req.params.eventId });
    if (!event || !event.evidencePath || event.evidenceStatus !== "UPLOADED") {
      res.status(404);
      throw new Error("Evidence not available");
    }
    const session = await ExamSession.findById(event.sessionId);
    const isOwner = session?.studentId?.toString() === req.user._id.toString();
    const isAdmin = ["teacher", "admin"].includes(req.user.role);
    if (!isOwner && !isAdmin) {
      res.status(403);
      throw new Error("Evidence access denied");
    }
    const extension = event.evidenceMimeType === "image/webp" ? ".webp" : ".jpg";
    const filePath = path.join(evidenceDirectory, `${event._id}${extension}`);
    if (!fs.existsSync(filePath)) {
      res.status(404);
      throw new Error("Evidence file is missing");
    }
    res.type(event.evidenceMimeType || "image/jpeg").sendFile(filePath);
});

// @desc    Get all violations for a session
// @route   GET /api/proctoring/sessions/:sessionId
// @access  Private
const getSessionViolations = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await ExamSession.findById(sessionId).populate(
    "studentId",
    "name email"
  );

  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  const violations = await ViolationEvent.find({ sessionId }).sort({
    timestamp: 1,
  });

  const scoring = calculateFullScore(violations);

  res.status(200).json({
    session,
    violations,
    scoring,
    totalViolations: violations.length,
  });
});

// @desc    Get proctoring report for a session
// @route   GET /api/proctoring/report/:sessionId
// @access  Private
const getSessionReport = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await ExamSession.findById(sessionId).populate(
    "studentId",
    "name email"
  );

  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  const violations = await ViolationEvent.find({ sessionId }).sort({
    timestamp: 1,
  });

  // Get exam info
  const exam = await (await import("../models/examModel.js")).default.findOne({
    examId: session.examId,
  });

  // Get result
  const result = await (
    await import("../models/resultModel.js")
  ).default.findOne({
    examId: session.examId,
    userId: session.studentId,
  });

  // Violation type summary
  const violationsByType = {};
  const signalsByDecision = {};
  const violationsBySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

  for (const v of violations) {
    const decisionStatus = v.decisionStatus || (v.penaltyPoints > 0 ? "VIOLATION_CONFIRMED" : "WARNING");
    signalsByDecision[decisionStatus] = (signalsByDecision[decisionStatus] || 0) + 1;
    if (isConfirmedViolation(v)) {
      violationsByType[v.eventType] = (violationsByType[v.eventType] || 0) + 1;
    }
    violationsBySeverity[v.severity] =
      (violationsBySeverity[v.severity] || 0) + 1;
  }

  // Evidence screenshots
  const evidence = violations
    .filter((v) => v.evidencePath)
    .map((v) => ({
      eventType: v.eventType,
      timestamp: v.timestamp,
      url: v.evidencePath,
      severity: v.severity,
    }));

  const explanationFacts = {
    sessionStatus: session.status,
    terminationReason: session.terminationReason || "",
    classification: session.classification,
    decisionReason: session.decisionReason,
    score: session.hybridScore,
    penalties: session.totalPenalties,
    examRules: { roughPaperAllowed: exam?.settings?.roughPaperAllowed !== false },
    events: violations.map((event) => ({
      type: event.eventType,
      timestamp: event.timestamp,
      camera: event.metadata?.cameraSource || "unknown",
      confidence: event.confidence,
      decision: event.decisionStatus || (event.penaltyPoints > 0 ? "VIOLATION_CONFIRMED" : "WARNING"),
      reason: event.decisionReason || "Legacy event; no reviewer decision was stored.",
      penaltyPoints: event.penaltyPoints || 0,
      evidenceAvailable: Boolean(event.evidencePath),
    })),
  };
  if (!session.reviewExplanation && violations.length) {
    try {
      const { explainProctoringReview } = await import("../services/groqService.js");
      session.reviewExplanation = await explainProctoringReview(explanationFacts);
      if (session.reviewExplanation) {
        session.reviewExplanationGeneratedAt = new Date();
        await session.save();
      }
    } catch (error) {
      console.warn("Groq review explanation unavailable; using deterministic summary:", error.message);
    }
  }
  const reviewExplanation = session.reviewExplanation ||
    `${session.status === "TERMINATED" ? `The exam was terminated: ${session.terminationReason || "no reason was stored"}.` : `Exam status: ${session.status}.`} ${session.totalViolations || 0} confirmed violation(s), ${session.totalPenalties || 0} penalty point(s). ${signalsByDecision.REVIEW_REQUIRED || 0} event(s) require human review. ${session.decisionReason || "No additional decision reason was stored."}`;

  res.status(200).json({
    report: {
      student: session.studentId,
      exam: exam
        ? { name: exam.examName, duration: exam.duration, examId: exam.examId }
        : null,
      session: {
        id: session._id,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        terminationReason: session.terminationReason || "",
        duration: session.endTime
          ? Math.round(
              (new Date(session.endTime) - new Date(session.startTime)) / 1000
            )
          : null,
      },
      result: result
        ? {
            totalMarks: result.totalMarks,
            percentage: result.percentage,
          }
        : null,
      proctoring: {
        eventScore: session.eventScore,
        aiScore: session.aiScore,
        hybridScore: session.hybridScore,
        fairnessScore: session.fairnessScore,
        totalPenalties: session.totalPenalties,
        totalViolations: session.totalViolations,
        classification: session.classification,
        decisionReason: session.decisionReason,
      },
      violationsByType,
      signalsByDecision,
      reviewExplanation,
      violationsBySeverity,
      violations: violations.map((v) => ({
        eventType: v.eventType,
        eventId: v.eventId,
        timestamp: v.timestamp,
        severity: v.severity,
        confidence: v.confidence,
        penaltyPoints: v.penaltyPoints,
        decisionStatus: v.decisionStatus || (v.penaltyPoints > 0 ? "VIOLATION_CONFIRMED" : "WARNING"),
        decisionReason: v.decisionReason || "Legacy event; no reviewer decision was stored.",
        riskScoreBefore: v.riskScoreBefore,
        riskScoreAfter: v.riskScoreAfter,
        description: v.description,
        metadata: v.metadata,
        evidencePath: v.evidencePath,
        evidenceStatus: v.evidenceStatus,
      })),
      evidence,
      generatedAt: new Date(),
    },
  });
});

// Helper — maps eventType to violationSummary key
function getViolationSummaryKey(eventType) {
  const map = {
    NO_FACE_DETECTED: "noFaceCount",
    MULTIPLE_FACES: "multipleFaceCount",
    CELL_PHONE_DETECTED: "cellPhoneCount",
    BOOK_DETECTED: "prohibitedObjectCount",
    LAPTOP_DETECTED: "prohibitedObjectCount",
    PROHIBITED_OBJECT: "prohibitedObjectCount",
    PERSON_IN_BACKGROUND: "prohibitedObjectCount",
    TAB_SWITCH: "tabSwitchCount",
    WINDOW_BLUR: "windowBlurCount",
    FULLSCREEN_EXIT: "fullscreenExitCount",
    COPY_PASTE: "copyPasteCount",
    GAZE_DEVIATION: "gazeDeviationCount",
    BACKGROUND_NOISE: "audioViolationCount",
    SPEECH_DETECTED: "audioViolationCount",
  };
  return map[eventType] || null;
}

export {
  logViolation,
  logEvidence,
  uploadEvidence,
  reviewProctoringEvent,
  updateEvidenceStatus,
  getEvidence,
  getSessionViolations,
  getSessionReport,
};
