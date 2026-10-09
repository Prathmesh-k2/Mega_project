import asyncHandler from "express-async-handler";
import Exam from "./../models/examModel.js";
import Question from "./../models/quesModel.js";

// @desc Get all exams
// @route GET /api/exams/exam
const getExams = asyncHandler(async (req, res) => {
  const exams = await Exam.find().populate("createdBy", "name email");
  res.status(200).json(exams);
});

// @desc Create a new exam
// @route POST /api/exams/exam
const createExam = asyncHandler(async (req, res) => {
  const {
    examName,
    subject,
    description,
    creationMode,
    totalQuestions,
    duration,
    liveDate,
    deadDate,
    settings,
  } = req.body;

  if (!examName || !subject) {
    res.status(400);
    throw new Error("Exam Name and Subject are required.");
  }

  const exam = new Exam({
    examName,
    subject,
    description: description || "",
    creationMode: creationMode || "MANUAL",
    totalQuestions: Number(totalQuestions) || 0,
    duration: Number(duration) || 0,
    liveDate: liveDate || new Date(),
    deadDate: deadDate || new Date(Date.now() + 86400000), // +1 day default
    settings: settings || {},
    status: "DRAFT",
    createdBy: req.user?._id, 
  });

  const createdExam = await exam.save();
  res.status(201).json(createdExam);
});

// @desc Update an exam
// @route PUT /api/exams/exam/:examId
const updateExam = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const exam = await Exam.findOne({ examId });

  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  if (exam.createdBy && req.user && exam.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You do not have permission to update this exam.");
  }

  // Extract totalQuestions parsing to Number
  if (req.body.totalQuestions) {
    req.body.totalQuestions = Number(req.body.totalQuestions);
  }
  if (req.body.duration) {
    req.body.duration = Number(req.body.duration);
  }

  Object.assign(exam, req.body);
  const updatedExam = await exam.save();
  res.status(200).json(updatedExam);
});

// @desc Publish an exam
// @route POST /api/exams/exam/:examId/publish
const publishExam = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const exam = await Exam.findOne({ examId });

  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  if (exam.createdBy && req.user && exam.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You do not have permission to publish this exam.");
  }

  // Validate publish requirements
  if (!exam.examName || !exam.subject) {
    res.status(400);
    throw new Error("Exam name and subject are required to publish.");
  }
  if (!exam.duration || exam.duration <= 0) {
    res.status(400);
    throw new Error("Duration must be greater than 0.");
  }
  if (!exam.liveDate || !exam.deadDate || new Date(exam.deadDate) <= new Date(exam.liveDate)) {
    res.status(400);
    throw new Error("End date/time must be after start date/time.");
  }

  // Check questions
  const questions = await Question.find({ examId: exam.examId });
  if (!questions || questions.length === 0) {
    res.status(400);
    throw new Error("At least one question is required to publish an exam.");
  }

  let actualMarks = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.options || q.options.length !== 4) {
      res.status(400);
      throw new Error(`Question ${i+1} must have exactly 4 options.`);
    }
    const correctOptions = q.options.filter(o => o.isCorrect === true);
    if (correctOptions.length !== 1) {
      res.status(400);
      throw new Error(`Question ${i+1} must have exactly one correct answer.`);
    }
    if (q.ansmarks <= 0) {
      res.status(400);
      throw new Error(`Question ${i+1} must have positive marks.`);
    }
    actualMarks += q.ansmarks;
  }

  if (questions.length !== exam.totalQuestions) {
     res.status(400);
     throw new Error(`Total questions mismatch. Exam expects ${exam.totalQuestions}, but found ${questions.length}. Please update exam settings.`);
  }

  exam.totalMarks = actualMarks;
  exam.status = "PUBLISHED";
  const publishedExam = await exam.save();
  res.status(200).json(publishedExam);
});

// @desc Get Exam Details
// @route GET /api/exams/exam/:examId
const getExamById = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }
  res.status(200).json(exam);
});

// @desc Generate AI Questions using Groq API
// @route POST /api/exams/exam/:examId/ai-generate
const generateAIQuestions = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const { topic, difficulty, numberOfQuestions, marksPerQuestion } = req.body;

  const exam = await Exam.findOne({ examId });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }

  // Ensure authorized teacher
  if (exam.createdBy && req.user && exam.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You do not have permission to generate questions for this exam.");
  }

  if (!topic || !numberOfQuestions || !marksPerQuestion) {
    res.status(400);
    throw new Error("Missing AI configuration inputs (topic, numberOfQuestions, marksPerQuestion).");
  }

  // Dynamic import of groqService because it's in another file
  const { groqCompletionWithRetry } = await import("../services/groqService.js");

  const systemPrompt = `You are an expert exam question generator for the subject "${exam.subject}".
Respond ONLY in valid JSON format. Provide exactly ${numberOfQuestions} Multiple Choice Questions.
Each question must have exactly 4 options. There must be exactly one correct answer matching one of the options textually.
The structure must be:
{
  "questions": [
    {
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctAnswer": "...",
      "marks": ${marksPerQuestion},
      "difficulty": "${difficulty || 'medium'}",
      "topic": "${topic}"
    }
  ]
}`;

  const userPrompt = `Generate the examination questions on the topic: ${topic}. Format as JSON.`;

  try {
    const questions = await groqCompletionWithRetry(systemPrompt, userPrompt, numberOfQuestions);
    res.status(200).json({ questions });
  } catch (error) {
    res.status(500);
    throw new Error(error.message || "Unable to generate valid questions. Please try again.");
  }
});

const DeleteExamById = asyncHandler(async (req, res) => {
  const { examId } = req.params;
  const exam = await Exam.findOneAndDelete({ examId: examId });
  if (!exam) {
    res.status(404);
    throw new Error("Exam not found");
  }
  console.log("deleted exam", exam);
  res.status(200).json(exam);
});

export { getExams, createExam, updateExam, publishExam, getExamById, generateAIQuestions, DeleteExamById };
