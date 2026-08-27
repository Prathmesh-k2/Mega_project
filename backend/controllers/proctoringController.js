import asyncHandler from "express-async-handler";
import ViolationEvent from "../models/violationEventModel.js";
import ExamSession from "../models/examSessionModel.js";
import PROCTORING_CONFIG from "../config/proctoring.js";
import { calculateFullScore } from "../services/ScoringEngine.js";

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
  } = req.body;

  if (!sessionId || !eventType) {
    res.status(400);
    throw new Error("sessionId and eventType are required");
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

  // Get penalty and severity from config
  const penaltyPoints = PROCTORING_CONFIG.penalties[eventType] || 0;
  const severity = PROCTORING_CONFIG.severity[eventType] || "LOW";

  // Create violation event
  const violation = await ViolationEvent.create({
    sessionId,
    studentId: session.studentId,
    examId: session.examId,
    eventType,
    severity,
    confidence: confidence || 1.0,
    penaltyPoints,
    description: description || `${eventType} detected`,
    evidencePath: evidencePath || "",
    metadata: metadata || {},
  });

  // Update session violation summary
  const summaryKey = getViolationSummaryKey(eventType);
  if (summaryKey) {
    session.violationSummary[summaryKey] =
      (session.violationSummary[summaryKey] || 0) + 1;
  }
  session.totalViolations = (session.totalViolations || 0) + 1;

  // Recalculate scores
  const allViolations = await ViolationEvent.find({ sessionId });
  const scoring = calculateFullScore(allViolations);

  session.eventScore = scoring.eventScore;
  session.aiScore = scoring.aiScore;
  session.hybridScore = scoring.hybridScore;
  session.fairnessScore = scoring.fairnessScore;
  session.totalPenalties = scoring.totalPenalties;
  session.classification = scoring.classification;
  session.decisionReason = scoring.decisionReason;

  await session.save();

  // Check auto-termination
  const shouldTerminate =
    PROCTORING_CONFIG.termination.ENABLED &&
    scoring.hybridScore >= PROCTORING_CONFIG.termination.SCORE_THRESHOLD;

  res.status(201).json({
    success: true,
    violation,
    currentScore: scoring.hybridScore,
    classification: scoring.classification,
    fairnessScore: scoring.fairnessScore,
    shouldTerminate,
  });
});

// @desc    Log evidence (screenshot URL) for a violation
// @route   POST /api/proctoring/evidence
// @access  Private
const logEvidence = asyncHandler(async (req, res) => {
  const { sessionId, eventType, evidenceUrl } = req.body;

  if (!sessionId || !eventType || !evidenceUrl) {
    res.status(400);
    throw new Error("sessionId, eventType, and evidenceUrl are required");
  }

  // Create violation with evidence
  const penaltyPoints = PROCTORING_CONFIG.penalties[eventType] || 0;
  const severity = PROCTORING_CONFIG.severity[eventType] || "MEDIUM";

  const violation = await ViolationEvent.create({
    sessionId,
    studentId: req.user._id,
    examId: req.body.examId || "",
    eventType,
    severity,
    confidence: req.body.confidence || 1.0,
    penaltyPoints: 0, // Evidence doesn't add extra penalty (the event already did)
    description: `Evidence captured for ${eventType}`,
    evidencePath: evidenceUrl,
  });

  res.status(201).json({ success: true, violation });
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
  const violationsBySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

  for (const v of violations) {
    violationsByType[v.eventType] = (violationsByType[v.eventType] || 0) + 1;
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
        totalViolations: violations.length,
        classification: session.classification,
        decisionReason: session.decisionReason,
      },
      violationsByType,
      violationsBySeverity,
      violations: violations.map((v) => ({
        eventType: v.eventType,
        timestamp: v.timestamp,
        severity: v.severity,
        confidence: v.confidence,
        penaltyPoints: v.penaltyPoints,
        description: v.description,
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
  getSessionViolations,
  getSessionReport,
};
