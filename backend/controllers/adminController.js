import asyncHandler from "express-async-handler";
import ExamSession from "../models/examSessionModel.js";
import ViolationEvent from "../models/violationEventModel.js";
import Exam from "../models/examModel.js";
import User from "../models/userModel.js";
import Result from "../models/resultModel.js";
import CheatingLog from "../models/cheatingLogModel.js";

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (teacher)
const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalStudents,
    totalExams,
    totalSessions,
    activeSessions,
    completedSessions,
    terminatedSessions,
  ] = await Promise.all([
    User.countDocuments({ role: "student", isApproved: true }),
    Exam.countDocuments(),
    ExamSession.countDocuments(),
    ExamSession.countDocuments({ status: "ACTIVE" }),
    ExamSession.countDocuments({ status: "COMPLETED" }),
    ExamSession.countDocuments({ status: "TERMINATED" }),
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

  res.status(200).json({
    stats: {
      totalStudents,
      totalExams,
      totalSessions,
      activeSessions,
      completedSessions,
      terminatedSessions,
      safeSessions,
      warningSessions,
      malpracticeSessions,
      avgFairnessScore,
      avgHybridScore,
      totalViolations,
    },
    recentSessions,
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
          Math.floor((s.serverDeadline.getTime() - Date.now()) / 1000)
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

export { getDashboardStats, getAnalytics, getActiveMonitoring };
