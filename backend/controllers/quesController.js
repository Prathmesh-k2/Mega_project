import asyncHandler from "express-async-handler";
import Question from "../models/quesModel.js";

const getQuestionsByExamId = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  console.log("Question Exam id ", examId);

  if (!examId) {
    return res.status(400).json({ error: "examId is missing or invalid" });
  }

  const questions = await Question.find({ examId });
  console.log("Question Exam  ", questions);

  res.status(200).json(questions);
});

const createQuestion = asyncHandler(async (req, res) => {
  const { question, options, ansmarks, source, difficulty, topic, examId } = req.body;

  if (!examId) {
    return res.status(400).json({ error: "examId is missing or invalid" });
  }

  const newQuestion = new Question({
    question,
    options,
    ansmarks: ansmarks || 1,
    source: source || "MANUAL",
    difficulty: difficulty || "",
    topic: topic || "",
    examId,
  });

  const createdQuestion = await newQuestion.save();

  if (createdQuestion) {
    res.status(201).json(createdQuestion);
  } else {
    res.status(400);
    throw new Error("Invalid Question Data");
  }
});

const updateQuestion = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  const questionRecord = await Question.findById(questionId);

  if (!questionRecord) {
    res.status(404);
    throw new Error("Question not found");
  }

  Object.assign(questionRecord, req.body);
  const updatedQuestion = await questionRecord.save();
  res.status(200).json(updatedQuestion);
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const { questionId } = req.params;
  const questionRecord = await Question.findByIdAndDelete(questionId);

  if (!questionRecord) {
    res.status(404);
    throw new Error("Question not found");
  }

  res.status(200).json({ message: "Question deleted successfully" });
});

export { getQuestionsByExamId, createQuestion, updateQuestion, deleteQuestion };
