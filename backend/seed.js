import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

// Resolve .env from root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ─── Models ────────────────────────────────────────────────────────────────
import User from "./models/userModel.js";
import Exam from "./models/examModel.js";
import Question from "./models/quesModel.js";
import Result from "./models/resultModel.js";
import CheatingLog from "./models/cheatingLogModel.js";

// ─── Connect ────────────────────────────────────────────────────────────────
await mongoose.connect(process.env.MONGO_URL);
console.log("✅ MongoDB Connected");

// ─── Clear existing data ────────────────────────────────────────────────────
await Promise.all([
  User.deleteMany({}),
  Exam.deleteMany({}),
  Question.deleteMany({}),
  Result.deleteMany({}),
  CheatingLog.deleteMany({}),
]);
console.log("🗑️  Cleared existing data");

// ─── Users ──────────────────────────────────────────────────────────────────
const hashPwd = (pwd) => bcrypt.hashSync(pwd, 10);

const teacherUser = await User.create({
  name: "Prof. Sharma",
  email: "teacher@proctoai.com",
  password: hashPwd("teacher123"),
  role: "teacher",
});

const students = await User.insertMany([
  { name: "Ravi Kumar",    email: "ravi@student.com",    password: hashPwd("student123"), role: "student" },
  { name: "Priya Mehta",  email: "priya@student.com",   password: hashPwd("student123"), role: "student" },
  { name: "Amit Shah",    email: "amit@student.com",    password: hashPwd("student123"), role: "student" },
  { name: "Sneha Patil",  email: "sneha@student.com",   password: hashPwd("student123"), role: "student" },
  { name: "Karan Joshi",  email: "karan@student.com",   password: hashPwd("student123"), role: "student" },
]);
console.log(`👤 Created 1 teacher + ${students.length} students`);

// ─── Past Exams ─────────────────────────────────────────────────────────────
const exam1Id = uuidv4();
const exam2Id = uuidv4();
const exam3Id = uuidv4();

const exams = await Exam.insertMany([
  {
    examName: "Data Structures - Mid Semester",
    totalQuestions: 5,
    duration: 60,
    liveDate: new Date("2025-03-10T09:00:00"),
    deadDate: new Date("2025-03-10T10:00:00"),
    examId: exam1Id,
  },
  {
    examName: "Operating Systems - Final",
    totalQuestions: 5,
    duration: 90,
    liveDate: new Date("2025-05-20T14:00:00"),
    deadDate: new Date("2025-05-20T15:30:00"),
    examId: exam2Id,
  },
  {
    examName: "Computer Networks - Unit Test",
    totalQuestions: 5,
    duration: 45,
    liveDate: new Date("2025-07-05T10:00:00"),
    deadDate: new Date("2025-07-05T10:45:00"),
    examId: exam3Id,
  },
]);
console.log(`📋 Created ${exams.length} past exams`);

// ─── Questions ───────────────────────────────────────────────────────────────
// Exam 1 – Data Structures
await Question.insertMany([
  {
    question: "What is the time complexity of binary search?",
    options: [
      { optionText: "O(n)", isCorrect: false },
      { optionText: "O(log n)", isCorrect: true },
      { optionText: "O(n²)", isCorrect: false },
      { optionText: "O(1)", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam1Id,
  },
  {
    question: "Which data structure uses LIFO order?",
    options: [
      { optionText: "Queue", isCorrect: false },
      { optionText: "Array", isCorrect: false },
      { optionText: "Stack", isCorrect: true },
      { optionText: "Linked List", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam1Id,
  },
  {
    question: "Which of the following is NOT a stable sorting algorithm?",
    options: [
      { optionText: "Merge Sort", isCorrect: false },
      { optionText: "Quick Sort", isCorrect: true },
      { optionText: "Bubble Sort", isCorrect: false },
      { optionText: "Insertion Sort", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam1Id,
  },
  {
    question: "In a binary tree, the maximum number of nodes at level l is?",
    options: [
      { optionText: "2^l", isCorrect: true },
      { optionText: "2^(l-1)", isCorrect: false },
      { optionText: "l²", isCorrect: false },
      { optionText: "2l", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam1Id,
  },
  {
    question: "What is the worst-case time complexity of Quick Sort?",
    options: [
      { optionText: "O(n log n)", isCorrect: false },
      { optionText: "O(n)", isCorrect: false },
      { optionText: "O(n²)", isCorrect: true },
      { optionText: "O(log n)", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam1Id,
  },
]);

// Exam 2 – Operating Systems
await Question.insertMany([
  {
    question: "What does CPU scheduling aim to maximize?",
    options: [
      { optionText: "Waiting time", isCorrect: false },
      { optionText: "CPU utilization", isCorrect: true },
      { optionText: "Context switches", isCorrect: false },
      { optionText: "Idle time", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam2Id,
  },
  {
    question: "Which page replacement algorithm suffers from Belady's anomaly?",
    options: [
      { optionText: "LRU", isCorrect: false },
      { optionText: "Optimal", isCorrect: false },
      { optionText: "FIFO", isCorrect: true },
      { optionText: "LFU", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam2Id,
  },
  {
    question: "A process in deadlock is one that is:",
    options: [
      { optionText: "Running but not making progress", isCorrect: false },
      { optionText: "Waiting indefinitely for resources held by others", isCorrect: true },
      { optionText: "In ready queue", isCorrect: false },
      { optionText: "Finished execution", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam2Id,
  },
  {
    question: "Which OS scheduling algorithm gives minimum average waiting time?",
    options: [
      { optionText: "FCFS", isCorrect: false },
      { optionText: "Round Robin", isCorrect: false },
      { optionText: "SJF", isCorrect: true },
      { optionText: "Priority", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam2Id,
  },
  {
    question: "Thrashing in OS occurs when:",
    options: [
      { optionText: "CPU is idle", isCorrect: false },
      { optionText: "Too many processes are in memory causing excessive paging", isCorrect: true },
      { optionText: "Disk is full", isCorrect: false },
      { optionText: "A process finishes execution", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam2Id,
  },
]);

// Exam 3 – Computer Networks
await Question.insertMany([
  {
    question: "Which layer of OSI model is responsible for routing?",
    options: [
      { optionText: "Transport", isCorrect: false },
      { optionText: "Data Link", isCorrect: false },
      { optionText: "Network", isCorrect: true },
      { optionText: "Session", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam3Id,
  },
  {
    question: "TCP is a __________ protocol.",
    options: [
      { optionText: "Connectionless", isCorrect: false },
      { optionText: "Connection-oriented", isCorrect: true },
      { optionText: "Unreliable", isCorrect: false },
      { optionText: "Broadcast", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam3Id,
  },
  {
    question: "What is the default port for HTTPS?",
    options: [
      { optionText: "80", isCorrect: false },
      { optionText: "21", isCorrect: false },
      { optionText: "443", isCorrect: true },
      { optionText: "8080", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam3Id,
  },
  {
    question: "Which protocol resolves IP addresses to MAC addresses?",
    options: [
      { optionText: "DNS", isCorrect: false },
      { optionText: "DHCP", isCorrect: false },
      { optionText: "ARP", isCorrect: true },
      { optionText: "RARP", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam3Id,
  },
  {
    question: "The maximum size of an IP address in IPv4 is:",
    options: [
      { optionText: "16 bits", isCorrect: false },
      { optionText: "32 bits", isCorrect: true },
      { optionText: "64 bits", isCorrect: false },
      { optionText: "128 bits", isCorrect: false },
    ],
    ansmarks: 2,
    examId: exam3Id,
  },
]);
console.log("❓ Created questions for all 3 exams");

// ─── Results ──────────────────────────────────────────────────────────────────
// Helper: create result for a student
const makeResult = (examId, userId, answersMap, marks, total, pct) => ({
  examId,
  userId,
  answers: new Map(Object.entries(answersMap)),
  totalMarks: marks,
  percentage: pct,
  showToStudent: true,
  totalScore: total,
  feedback: pct >= 80 ? "Excellent performance!" : pct >= 60 ? "Good effort, keep it up!" : "Needs more practice.",
  gradedBy: teacherUser._id,
  gradedAt: new Date(),
});

await Result.insertMany([
  // Exam 1 results
  makeResult(exam1Id, students[0]._id, { q1: "O(log n)", q2: "Stack", q3: "Quick Sort", q4: "2^l", q5: "O(n²)" }, 10, 10, 100),
  makeResult(exam1Id, students[1]._id, { q1: "O(log n)", q2: "Stack", q3: "Merge Sort", q4: "2^l", q5: "O(n²)" }, 8, 8, 80),
  makeResult(exam1Id, students[2]._id, { q1: "O(n)",    q2: "Queue", q3: "Quick Sort", q4: "2^l", q5: "O(n²)" }, 6, 6, 60),
  makeResult(exam1Id, students[3]._id, { q1: "O(log n)", q2: "Stack", q3: "Quick Sort", q4: "l²",  q5: "O(n log n)" }, 6, 6, 60),
  makeResult(exam1Id, students[4]._id, { q1: "O(1)",    q2: "Array", q3: "Merge Sort", q4: "2^l", q5: "O(n²)" }, 4, 4, 40),

  // Exam 2 results
  makeResult(exam2Id, students[0]._id, { q1: "CPU utilization", q2: "FIFO", q3: "Waiting indefinitely for resources held by others", q4: "SJF", q5: "Too many processes are in memory causing excessive paging" }, 10, 10, 100),
  makeResult(exam2Id, students[1]._id, { q1: "CPU utilization", q2: "LRU",  q3: "Waiting indefinitely for resources held by others", q4: "SJF", q5: "Too many processes are in memory causing excessive paging" }, 8, 8, 80),
  makeResult(exam2Id, students[2]._id, { q1: "Waiting time",    q2: "FIFO", q3: "In ready queue", q4: "FCFS", q5: "Too many processes are in memory causing excessive paging" }, 4, 4, 40),
  makeResult(exam2Id, students[3]._id, { q1: "CPU utilization", q2: "FIFO", q3: "Waiting indefinitely for resources held by others", q4: "Round Robin", q5: "CPU is idle" }, 6, 6, 60),

  // Exam 3 results
  makeResult(exam3Id, students[0]._id, { q1: "Network", q2: "Connection-oriented", q3: "443", q4: "ARP", q5: "32 bits" }, 10, 10, 100),
  makeResult(exam3Id, students[1]._id, { q1: "Network", q2: "Connection-oriented", q3: "80",  q4: "ARP", q5: "32 bits" }, 8, 8, 80),
  makeResult(exam3Id, students[2]._id, { q1: "Transport", q2: "Connectionless", q3: "443", q4: "DNS", q5: "32 bits" }, 4, 4, 40),
]);
console.log("📊 Created results for students");

// ─── Cheating Logs ────────────────────────────────────────────────────────────
await CheatingLog.insertMany([
  {
    noFaceCount: 3,
    multipleFaceCount: 1,
    cellPhoneCount: 0,
    prohibitedObjectCount: 0,
    examId: exam1Id,
    email: students[2].email,
    username: students[2].name,
    screenshots: [
      { url: "https://placeholder.com/noface1.jpg", type: "noFace",       detectedAt: new Date("2025-03-10T09:15:00") },
      { url: "https://placeholder.com/noface2.jpg", type: "noFace",       detectedAt: new Date("2025-03-10T09:30:00") },
      { url: "https://placeholder.com/multi1.jpg",  type: "multipleFace", detectedAt: new Date("2025-03-10T09:45:00") },
    ],
  },
  {
    noFaceCount: 0,
    multipleFaceCount: 0,
    cellPhoneCount: 2,
    prohibitedObjectCount: 1,
    examId: exam2Id,
    email: students[4].email,
    username: students[4].name,
    screenshots: [
      { url: "https://placeholder.com/phone1.jpg",   type: "cellPhone",         detectedAt: new Date("2025-05-20T14:20:00") },
      { url: "https://placeholder.com/phone2.jpg",   type: "cellPhone",         detectedAt: new Date("2025-05-20T14:40:00") },
      { url: "https://placeholder.com/object1.jpg",  type: "prohibitedObject",  detectedAt: new Date("2025-05-20T15:00:00") },
    ],
  },
  {
    noFaceCount: 1,
    multipleFaceCount: 2,
    cellPhoneCount: 1,
    prohibitedObjectCount: 0,
    examId: exam3Id,
    email: students[2].email,
    username: students[2].name,
    screenshots: [
      { url: "https://placeholder.com/noface3.jpg", type: "noFace",       detectedAt: new Date("2025-07-05T10:10:00") },
      { url: "https://placeholder.com/multi2.jpg",  type: "multipleFace", detectedAt: new Date("2025-07-05T10:20:00") },
    ],
  },
]);
console.log("🚨 Created cheating logs");

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n✅ Seeding complete!\n");
console.log("─────────────────────────────────────");
console.log("🔑 Login Credentials:");
console.log("   Teacher  → teacher@proctoai.com  / teacher123");
console.log("   Student1 → ravi@student.com      / student123");
console.log("   Student2 → priya@student.com     / student123");
console.log("   Student3 → amit@student.com      / student123");
console.log("   Student4 → sneha@student.com     / student123");
console.log("   Student5 → karan@student.com     / student123");
console.log("─────────────────────────────────────\n");

await mongoose.disconnect();
process.exit(0);
