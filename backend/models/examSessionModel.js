import mongoose from "mongoose";

const examSessionSchema = new mongoose.Schema(
  {
    examId: {
      type: String,
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    serverDeadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "TERMINATED", "EXPIRED"],
      default: "ACTIVE",
    },
    deviceInfo: {
      userAgent: String,
      platform: String,
      screenResolution: String,
    },
    ipAddress: {
      type: String,
    },
    // ── Proctoring Scores ─────────────────────────────────────────────────
    eventScore: {
      type: Number,
      default: 0,
    },
    aiScore: {
      type: Number,
      default: 0,
    },
    hybridScore: {
      type: Number,
      default: 0,
    },
    fairnessScore: {
      type: Number,
      default: 100,
    },
    totalPenalties: {
      type: Number,
      default: 0,
    },
    // ── Decision ──────────────────────────────────────────────────────────
    classification: {
      type: String,
      enum: ["SAFE", "WARNING", "MALPRACTICE", "PENDING"],
      default: "PENDING",
    },
    decisionReason: {
      type: String,
      default: "",
    },
    // ── Violation Summary ─────────────────────────────────────────────────
    totalViolations: {
      type: Number,
      default: 0,
    },
    violationSummary: {
      noFaceCount: { type: Number, default: 0 },
      multipleFaceCount: { type: Number, default: 0 },
      cellPhoneCount: { type: Number, default: 0 },
      prohibitedObjectCount: { type: Number, default: 0 },
      tabSwitchCount: { type: Number, default: 0 },
      windowBlurCount: { type: Number, default: 0 },
      fullscreenExitCount: { type: Number, default: 0 },
      copyPasteCount: { type: Number, default: 0 },
      gazeDeviationCount: { type: Number, default: 0 },
      audioViolationCount: { type: Number, default: 0 },
    },
    // ── Exam Answers (auto-saved) ─────────────────────────────────────────
    answers: {
      type: Map,
      of: String,
      default: new Map(),
    },
    // ── Termination Info ──────────────────────────────────────────────────
    terminatedAt: {
      type: Date,
    },
    terminationReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index: one active session per student per exam
examSessionSchema.index(
  { examId: 1, studentId: 1, status: 1 },
  { unique: false }
);

const ExamSession = mongoose.model("ExamSession", examSessionSchema);

export default ExamSession;
