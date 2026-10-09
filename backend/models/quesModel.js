import mongoose from "mongoose";

const questionSchema = mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    options: [
      {
        optionText: {
          type: String,
          required: true,
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
      },
    ],
    ansmarks: {
      type: Number,
      required: false,
      default: 0,
    },
    source: {
      type: String,
      enum: ["MANUAL", "AI"],
      default: "MANUAL",
    },
    difficulty: {
      type: String,
      default: "",
    },
    topic: {
      type: String,
      default: "",
    },
    examId: {
      type: String, // Use the same data type (String) as in the exam model
      required: true,
      // You can make examId required if it's always present
    },
  },
  {
    timestamps: true,
  }
);

const Question = mongoose.model("Question", questionSchema);
//83309
export default Question;
