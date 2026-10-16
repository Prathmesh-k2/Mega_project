import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const examSchema = mongoose.Schema(
  {
    examName: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    creationMode: {
      type: String,
      enum: ["MANUAL", "AI"],
      default: "MANUAL",
    },
    examType: {
      type: String,
      default: "MCQ", // "MCQ" for this phase
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      required: true,
    },
    liveDate: {
      type: Date,
      required: true,
    },
    deadDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "LIVE", "CLOSED"],
      default: "DRAFT",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    settings: {
      shuffleQuestions: { type: Boolean, default: false },
      shuffleOptions: { type: Boolean, default: false },
      negativeMarking: { type: Boolean, default: false },
      negativeMarks: { type: Number, default: 0 },
      oneAttempt: { type: Boolean, default: true },
      roughPaperAllowed: { type: Boolean, default: true },
    },
    // Define examId field with UUID generation
    examId: {
      type: String,
      default: uuidv4, // Generate a new UUID for each document
      unique: true, // Ensure uniqueness of UUIDs
    },
  },
  {
    timestamps: true,
  }
);

const Exam = mongoose.model("Exam", examSchema);

export default Exam;
