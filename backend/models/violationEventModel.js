import mongoose from "mongoose";
import { randomUUID } from "crypto";

const violationEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      default: randomUUID,
      unique: true,
      sparse: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSession",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    examId: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        "NO_FACE_DETECTED",
        "MULTIPLE_FACES",
        "CELL_PHONE_DETECTED",
        "BOOK_DETECTED",
        "LAPTOP_DETECTED",
        "PROHIBITED_OBJECT",
        "PERSON_IN_BACKGROUND",
        "TAB_SWITCH",
        "WINDOW_BLUR",
        "FULLSCREEN_EXIT",
        "COPY_PASTE",
        "RIGHT_CLICK",
        "KEYBOARD_SHORTCUT",
        "GAZE_DEVIATION",
        "BACKGROUND_NOISE",
        "SPEECH_DETECTED",
        "EXAM_TERMINATED",
        "CAMERA_UNAVAILABLE",
      ],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1.0,
    },
    penaltyPoints: {
      type: Number,
      default: 0,
    },
    decisionStatus: {
      type: String,
      enum: ["SAFE", "WARNING", "REVIEW_REQUIRED", "VIOLATION_CONFIRMED", "TERMINATED"],
    },
    decisionReason: {
      type: String,
      default: "",
    },
    riskScoreBefore: { type: Number, min: 0, max: 100 },
    riskScoreAfter: { type: Number, min: 0, max: 100 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    description: {
      type: String,
      default: "",
    },
    evidencePath: {
      type: String,
      default: "",
    },
    evidenceStatus: {
      type: String,
      enum: ["PENDING", "CAPTURED", "UPLOADED", "FAILED", "NOT_APPLICABLE"],
      default: "NOT_APPLICABLE",
    },
    evidenceMimeType: {
      type: String,
      default: "",
    },
    evidenceSize: {
      type: Number,
      default: 0,
    },
    evidenceFailureReason: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

violationEventSchema.index({ sessionId: 1, eventType: 1 });
violationEventSchema.index({ examId: 1, studentId: 1 });

const ViolationEvent = mongoose.model("ViolationEvent", violationEventSchema);

export default ViolationEvent;
