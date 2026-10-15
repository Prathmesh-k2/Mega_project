import asyncHandler from "express-async-handler";
import ExamSession from "../models/examSessionModel.js";
import ViolationEvent from "../models/violationEventModel.js";
import Exam from "../models/examModel.js";
import User from "../models/userModel.js";
import Result from "../models/resultModel.js";
import CheatingLog from "../models/cheatingLogModel.js";
import mongoose from "mongoose";
import Question from "../models/quesModel.js";

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (teacher)
const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalStudents,
    totalTeachers,
    totalExams,
    totalResults,
    totalSessions,
    activeSessions,
    completedSessions,
    terminatedSessions,
    reviewSessions,
  ] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "teacher", isApproved: true }),
    Exam.countDocuments(),
    Result.countDocuments(),
    ExamSession.countDocuments(),
    ExamSession.countDocuments({ status: "ACTIVE" }),
    ExamSession.countDocuments({ status: "COMPLETED" }),
    ExamSession.countDocuments({ status: "TERMINATED" }),
    ExamSession.countDocuments({
      classification: { $in: ["ADMIN_REVIEW", "MALPRACTICE"] },
    }),
  ]);

  // Classification counts
  const [safeSessions, warningSessions, malpracticeSessions] =
    await Promise.all([
      ExamSession.countDocuments({ classification: "SAFE" }),
      ExamSession.countDocuments({ classification: "WARNING" }),
      ExamSession.countDocuments({ classification: "MALPRACTICE" }),
    ]);

  // Average fairness score
  const fairnessAgg = await ExamSession.aggregate([
    {
      $match: {
        status: { $in: ["COMPLETED", "TERMINATED"] },
      },
    },
    {
      $group: {
        _id: null,
        avgFairness: { $avg: "$fairnessScore" },
        avgHybrid: { $avg: "$hybridScore" },
      },
    },
  ]);

  const avgFairnessScore =
    fairnessAgg.length > 0 ? Math.round(fairnessAgg[0].avgFairness) : 100;
  const avgHybridScore =
    fairnessAgg.length > 0 ? Math.round(fairnessAgg[0].avgHybrid) : 0;

  // Total violations
  const totalViolations = await ViolationEvent.countDocuments();

  // Recent sessions
  const recentSessions = await ExamSession.find()
    .populate("studentId", "name email")
    .sort({ createdAt: -1 })
    .limit(10);

  const recentResults = await Result.find()
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  const resultExamIds = [...new Set(recentResults.map((result) => result.examId).filter(Boolean))];
  const resultExams = await Exam.find({ examId: { $in: resultExamIds } })
    .select("examId examName")
    .lean();
  const resultExamNames = new Map(resultExams.map((exam) => [exam.examId, exam.examName]));

  res.status(200).json({
    stats: {
      totalStudents,
      totalTeachers,
      totalExams,
      totalResults,
      totalAttempts: totalSessions,
      totalSessions,
      activeSessions,
      completedSessions,
      terminatedSessions,
      reviewSessions,
      safeSessions,
      warningSessions,
      malpracticeSessions,
      avgFairnessScore,
      avgHybridScore,
      totalViolations,
    },
    recentSessions,
    recentResults: recentResults.map((result) => ({
      ...result,
      examName: resultExamNames.get(result.examId) || result.examId || "Unknown exam",
    })),
  });
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // @desc Get paginated student accounts and attempt summaries
  // @route GET /api/admin/students
const getStudents = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const search = String(req.query.search || "").trim();
    const filter = { role: "student" };
    if (req.query.status === "approved") filter.isApproved = true;
    if (req.query.status === "pending") filter.isApproved = false;
    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: expression }, { email: expression }];
    }

    const [total, students] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("name email isApproved isVerified createdAt")
        .sort({ name: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const ids = students.map((student) => student._id);
    const summaries = await ExamSession.aggregate([
      { $match: { studentId: { $in: ids } } },
      {
        $group: {
          _id: "$studentId",
          totalAttempts: { $sum: 1 },
          completedAttempts: {
            $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
          },
          latestActivity: { $max: { $ifNull: ["$endTime", "$startTime"] } },
        },
      },
    ]);
    const summaryByStudent = new Map(
      summaries.map((summary) => [summary._id.toString(), summary]),
    );

    res.status(200).json({
      students: students.map((student) => ({
        ...student,
        status: student.isApproved ? "approved" : "pending",
        ...(summaryByStudent.get(student._id.toString()) || {
          totalAttempts: 0,
          completedAttempts: 0,
          latestActivity: null,
        }),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
});

const getStudentHistory = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    if (!mongoose.isValidObjectId(studentId)) {
      res.status(400);
      throw new Error("Invalid student id");
    }
    const student = await User.findOne({ _id: studentId, role: "student" })
      .select("name email isApproved isVerified createdAt")
      .lean();
    if (!student) {
      res.status(404);
      throw new Error("Student not found");
    }

    const attempts = await ExamSession.find({ studentId }).sort({ startTime: -1 }).lean();
    const examIds = [...new Set(attempts.map((attempt) => attempt.examId))];
    const [exams, results, eventCounts] = await Promise.all([
      Exam.find({ examId: { $in: examIds } }).select("examId examName totalMarks duration").lean(),
      Result.find({ userId: studentId }).select("sessionId examId totalMarks totalScore percentage createdAt").lean(),
      ViolationEvent.aggregate([
        { $match: { studentId: new mongoose.Types.ObjectId(studentId) } },
        { $group: { _id: "$sessionId", count: { $sum: 1 }, latest: { $max: "$timestamp" } } },
      ]),
    ]);
    const examById = new Map(exams.map((exam) => [exam.examId, exam]));
    const resultBySession = new Map(results.filter((result) => result.sessionId).map((result) => [result.sessionId.toString(), result]));
    const eventsBySession = new Map(eventCounts.map((entry) => [entry._id.toString(), entry]));

    res.status(200).json({
      student,
      attempts: attempts.map((attempt) => ({
        ...attempt,
        exam: examById.get(attempt.examId) || null,
        result: resultBySession.get(attempt._id.toString()) || null,
        proctoring: eventsBySession.get(attempt._id.toString()) || { count: 0, latest: null },
      })),
    });
});

const getAttemptDetails = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    if (!mongoose.isValidObjectId(sessionId)) {
      res.status(400);
      throw new Error("Invalid attempt id");
    }
    const session = await ExamSession.findById(sessionId)
      .populate("studentId", "name email isApproved isVerified")
      .lean();
    if (!session) {
      res.status(404);
      throw new Error("Exam attempt not found");
    }
    const [exam, result, violations] = await Promise.all([
      Exam.findOne({ examId: session.examId }).lean(),
      Result.findOne({ sessionId: session._id }).lean(),
      ViolationEvent.find({ sessionId: session._id }).sort({ timestamp: -1 }).lean(),
    ]);
    const questions = await Question.find({ examId: session.examId })
      .select("question options ansmarks")
      .lean();
    const answers = session.answers instanceof Map
      ? Object.fromEntries(session.answers)
      : (session.answers || {});
    res.status(200).json({
      attempt: {
        ...session,
        exam,
        result,
        answers,
        questions,
        violations,
        evidence: violations.filter((violation) => Boolean(violation.evidencePath)),
      },
});
});

// @desc    Get analytics data
// @route   GET /api/admin/analytics
// @access  Private (teacher)
const getAnalytics = asyncHandler(async (req, res) => {
  // Violations by type
  const violationsByType = await ViolationEvent.aggregate([
    { $group: { _id: "$eventType", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Violations by severity
  const violationsBySeverity = await ViolationEvent.aggregate([
    { $group: { _id: "$severity", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Classification distribution
  const classificationDist = await ExamSession.aggregate([
    { $match: { classification: { $ne: "PENDING" } } },
    { $group: { _id: "$classification", count: { $sum: 1 } } },
  ]);

  // Average scores by exam
  const scoresByExam = await ExamSession.aggregate([
    { $match: { status: { $in: ["COMPLETED", "TERMINATED"] } } },
    {
      $group: {
        _id: "$examId",
        avgFairness: { $avg: "$fairnessScore" },
        avgHybrid: { $avg: "$hybridScore" },
        totalSessions: { $sum: 1 },
        totalViolations: { $sum: "$totalViolations" },
      },
    },
  ]);

  // Enrich with exam names
  const exams = await Exam.find();
  const examMap = {};
  exams.forEach((e) => {
    examMap[e.examId] = e.examName;
  });

  const enrichedScoresByExam = scoresByExam.map((s) => ({
    ...s,
    examName: examMap[s._id] || s._id,
  }));

  // Violations over time (last 30 days, grouped by day)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const violationsTimeline = await ViolationEvent.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Average confidence by event type
  const confidenceByType = await ViolationEvent.aggregate([
    {
      $group: {
        _id: "$eventType",
        avgConfidence: { $avg: "$confidence" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  // Top students with most violations
  const topViolators = await ExamSession.aggregate([
    { $match: { totalViolations: { $gt: 0 } } },
    {
      $group: {
        _id: "$studentId",
        totalViolations: { $sum: "$totalViolations" },
        avgFairness: { $avg: "$fairnessScore" },
        sessionsCount: { $sum: 1 },
      },
    },
    { $sort: { totalViolations: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "student",
      },
    },
    { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        totalViolations: 1,
        avgFairness: 1,
        sessionsCount: 1,
        "student.name": 1,
        "student.email": 1,
      },
    },
  ]);

  res.status(200).json({
    violationsByType,
    violationsBySeverity,
    classificationDist,
    scoresByExam: enrichedScoresByExam,
    violationsTimeline,
    confidenceByType,
    topViolators,
  });
});

// @desc    Get active monitoring sessions
// @route   GET /api/admin/active-sessions
// @access  Private (teacher)
const getActiveMonitoring = asyncHandler(async (req, res) => {
  const sessions = await ExamSession.find({ status: "ACTIVE" })
    .populate("studentId", "name email")
    .sort({ startTime: -1 });

  const enriched = await Promise.all(
    sessions.map(async (s) => {
      const exam = await Exam.findOne({ examId: s.examId });
      const latestViolation = await ViolationEvent.findOne({
        sessionId: s._id,
      }).sort({ timestamp: -1 });

      return {
        ...s.toObject(),
        examName: exam?.examName || "Unknown",
        timeLeftSeconds: Math.max(
          0,
          s.serverDeadline
            ? Math.floor((new Date(s.serverDeadline).getTime() - Date.now()) / 1000)
            : 0
        ),
        latestViolation: latestViolation
          ? {
              eventType: latestViolation.eventType,
              timestamp: latestViolation.timestamp,
              severity: latestViolation.severity,
            }
          : null,
      };
    })
  );

  res.status(200).json(enriched);
});

export {
  getDashboardStats,
  getAnalytics,
  getActiveMonitoring,
  getStudents,
  getStudentHistory,
  getAttemptDetails,
};
