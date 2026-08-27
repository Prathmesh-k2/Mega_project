import asyncHandler from "express-async-handler";
import ExamSession from "../models/examSessionModel.js";
import Exam from "../models/examModel.js";
import Question from "../models/quesModel.js";
import Result from "../models/resultModel.js";
import ViolationEvent from "../models/violationEventModel.js";
import { calculateFullScore } from "../services/ScoringEngine.js";

// @desc    Start a new exam session
// @route   POST /api/sessions/start
// @access  Private (student)
const startSession = asyncHandler(async (req, res) => {
  const { examId, deviceInfo } = req.body;
  const studentId = req.user._id;

  if (!examId) {
    res.status(400);
    throw new Error("examId is required");
  }

  // Check exam exists
  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  // Check for existing active session
  const existingSession = await ExamSession.findOne({
    examId,
    studentId,
    status: "ACTIVE",
  });

  if (existingSession) {
    // Return existing session (resume)
    const timeLeft = Math.max(
      0,
      Math.floor(
        (existingSession.serverDeadline.getTime() - Date.now()) / 1000
      )
    );
    return res.status(200).json({
      session: existingSession,
      timeLeftSeconds: timeLeft,
      resumed: true,
    });
  }

  // Calculate server deadline
  const durationMs = exam.duration * 60 * 1000; // duration is in minutes
  const serverDeadline = new Date(Date.now() + durationMs);

  const session = await ExamSession.create({
    examId,
    studentId,
    startTime: new Date(),
    serverDeadline,
    status: "ACTIVE",
    deviceInfo: deviceInfo || {},
    ipAddress:
      req.ip || req.connection?.remoteAddress || req.headers["x-forwarded-for"],
  });

  const timeLeft = Math.max(
    0,
    Math.floor((serverDeadline.getTime() - Date.now()) / 1000)
  );

  console.log(
    `[SESSION] Started session ${session._id} for student ${studentId} exam ${examId} (${exam.duration} min)`
  );

  res.status(201).json({
    session,
    timeLeftSeconds: timeLeft,
    resumed: false,
  });
});

// @desc    Get session status / time remaining
// @route   GET /api/sessions/:sessionId
// @access  Private
const getSession = asyncHandler(async (req, res) => {
  const session = await ExamSession.findById(req.params.sessionId).populate(
    "studentId",
    "name email"
  );

  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  const timeLeft = Math.max(
    0,
    Math.floor((session.serverDeadline.getTime() - Date.now()) / 1000)
  );

  // Auto-expire if deadline passed
  if (session.status === "ACTIVE" && timeLeft <= 0) {
    session.status = "EXPIRED";
    session.endTime = session.serverDeadline;
    await session.save();
  }

  res.status(200).json({
    session,
    timeLeftSeconds: timeLeft,
  });
});

// @desc    Auto-save answers during exam
// @route   PUT /api/sessions/:sessionId/autosave
// @access  Private
const autoSaveAnswers = asyncHandler(async (req, res) => {
  const { answers } = req.body;
  const session = await ExamSession.findById(req.params.sessionId);

  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  if (session.status !== "ACTIVE") {
    res.status(400);
    throw new Error("Session is no longer active");
  }

  // Merge answers
  if (answers && typeof answers === "object") {
    for (const [qId, answer] of Object.entries(answers)) {
      session.answers.set(qId, answer);
    }
    await session.save();
  }

  res.status(200).json({ success: true, message: "Answers auto-saved" });
});

// @desc    Submit exam (end session, calculate scores)
// @route   POST /api/sessions/:sessionId/submit
// @access  Private
const submitSession = asyncHandler(async (req, res) => {
  const { answers } = req.body;
  const session = await ExamSession.findById(req.params.sessionId);

  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  if (session.status !== "ACTIVE") {
    // Already submitted/terminated — return existing data
    return res.status(200).json({
      success: true,
      message: "Session already completed",
      session,
    });
  }

  // Save final answers
  if (answers && typeof answers === "object") {
    for (const [qId, answer] of Object.entries(answers)) {
      session.answers.set(qId, answer);
    }
  }

  // ── Calculate MCQ Result ────────────────────────────────────────────
  const questions = await Question.find({ examId: session.examId });
  let totalMarks = 0;
  let correctAnswers = 0;

  for (const question of questions) {
    const userAnswer = session.answers.get(question._id.toString());
    if (userAnswer) {
      const correctOption = question.options.find((opt) => opt.isCorrect);
      if (correctOption && correctOption._id.toString() === userAnswer) {
        totalMarks += question.ansmarks || 1;
        correctAnswers++;
      }
    }
  }

  const percentage =
    questions.length > 0 ? (correctAnswers / questions.length) * 100 : 0;

  // ── Calculate Proctoring Scores ─────────────────────────────────────
  const violations = await ViolationEvent.find({ sessionId: session._id });
  const scoring = calculateFullScore(violations);

  // ── Update Session ──────────────────────────────────────────────────
  session.endTime = new Date();
  session.status = "COMPLETED";
  session.eventScore = scoring.eventScore;
  session.aiScore = scoring.aiScore;
  session.hybridScore = scoring.hybridScore;
  session.fairnessScore = scoring.fairnessScore;
  session.totalPenalties = scoring.totalPenalties;
  session.totalViolations = violations.length;
  session.classification = scoring.classification;
  session.decisionReason = scoring.decisionReason;
  await session.save();

  // ── Create/update Result record ─────────────────────────────────────
  let result = await Result.findOne({
    examId: session.examId,
    userId: session.studentId,
  });

  if (result) {
    result.totalMarks = totalMarks;
    result.percentage = percentage;
    result.answers = session.answers;
    result.sessionId = session._id;
    await result.save();
  } else {
    result = await Result.create({
      examId: session.examId,
      userId: session.studentId,
      sessionId: session._id,
      answers: session.answers,
      totalMarks,
      percentage,
      showToStudent: false,
    });
  }

  console.log(
    `[SESSION] Submitted session ${session._id}: MCQ=${percentage.toFixed(
      1
    )}% | Fairness=${scoring.fairnessScore} | ${scoring.classification}`
  );

  res.status(200).json({
    success: true,
    session,
    result: {
      totalMarks,
      percentage,
      correctAnswers,
      totalQuestions: questions.length,
    },
    proctoring: scoring,
  });
});

// @desc    Terminate exam (malpractice auto-termination)
// @route   POST /api/sessions/:sessionId/terminate
// @access  Private
const terminateSession = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const session = await ExamSession.findById(req.params.sessionId);

  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  if (session.status !== "ACTIVE") {
    return res
      .status(200)
      .json({ success: true, message: "Session already ended" });
  }

  // Calculate final scores
  const violations = await ViolationEvent.find({ sessionId: session._id });
  const scoring = calculateFullScore(violations);

  session.status = "TERMINATED";
  session.endTime = new Date();
  session.terminatedAt = new Date();
  session.terminationReason = reason || "Malpractice threshold exceeded";
  session.eventScore = scoring.eventScore;
  session.aiScore = scoring.aiScore;
  session.hybridScore = scoring.hybridScore;
  session.fairnessScore = scoring.fairnessScore;
  session.totalPenalties = scoring.totalPenalties;
  session.totalViolations = violations.length;
  session.classification = "MALPRACTICE";
  session.decisionReason = reason || "Automatic termination due to malpractice";
  await session.save();

  // Also save as result
  const questions = await Question.find({ examId: session.examId });
  let totalMarks = 0;
  let correctAnswers = 0;

  for (const question of questions) {
    const userAnswer = session.answers.get(question._id.toString());
    if (userAnswer) {
      const correctOption = question.options.find((opt) => opt.isCorrect);
      if (correctOption && correctOption._id.toString() === userAnswer) {
        totalMarks += question.ansmarks || 1;
        correctAnswers++;
      }
    }
  }

  const percentage =
    questions.length > 0 ? (correctAnswers / questions.length) * 100 : 0;

  await Result.findOneAndUpdate(
    { examId: session.examId, userId: session.studentId },
    {
      examId: session.examId,
      userId: session.studentId,
      sessionId: session._id,
      answers: session.answers,
      totalMarks,
      percentage,
      showToStudent: false,
    },
    { upsert: true, new: true }
  );

  // Create termination violation event
  await ViolationEvent.create({
    sessionId: session._id,
    studentId: session.studentId,
    examId: session.examId,
    eventType: "EXAM_TERMINATED",
    severity: "CRITICAL",
    confidence: 1.0,
    penaltyPoints: 0,
    description: session.terminationReason,
  });

  console.log(
    `[SESSION] TERMINATED session ${session._id}: ${session.terminationReason}`
  );

  res.status(200).json({
    success: true,
    message: "Exam terminated",
    session,
    proctoring: scoring,
  });
});

// @desc    Get active sessions for an exam (admin)
// @route   GET /api/sessions/active
// @access  Private (teacher)
const getActiveSessions = asyncHandler(async (req, res) => {
  const sessions = await ExamSession.find({ status: "ACTIVE" })
    .populate("studentId", "name email")
    .sort({ startTime: -1 });

  // Add time-left to each
  const enriched = sessions.map((s) => ({
    ...s.toObject(),
    timeLeftSeconds: Math.max(
      0,
      Math.floor((s.serverDeadline.getTime() - Date.now()) / 1000)
    ),
  }));

  res.status(200).json(enriched);
});

// @desc    Get all sessions (with optional filters)
// @route   GET /api/sessions
// @access  Private (teacher)
const getAllSessions = asyncHandler(async (req, res) => {
  const { examId, status } = req.query;
  const filter = {};
  if (examId) filter.examId = examId;
  if (status) filter.status = status;

  const sessions = await ExamSession.find(filter)
    .populate("studentId", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json(sessions);
});

export {
  startSession,
  getSession,
  autoSaveAnswers,
  submitSession,
  terminateSession,
  getActiveSessions,
  getAllSessions,
};
