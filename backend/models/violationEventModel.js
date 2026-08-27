import mongoose from "mongoose";

const violationEventSchema = new mongoose.Schema(
  {
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
    description: {
      type: String,
      default: "",
    },
    evidencePath: {
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
