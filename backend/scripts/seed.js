/**
 * Seed Script — Development Data
 * Creates admin, sample students, exams, and questions.
 *
 * Usage: node backend/scripts/seed.js
 *
 * WARNING: This clears existing data. Only use in development.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import User from "../models/userModel.js";
import Exam from "../models/examModel.js";
import Question from "../models/quesModel.js";

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/proctoai";

async function seed() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to MongoDB for seeding...");

    // ── Clear old data ────────────────────────────────────────────────
    await User.deleteMany({});
    await Exam.deleteMany({});
    await Question.deleteMany({});
    console.log("Cleared existing users, exams, and questions.");

    // ── Create Users ──────────────────────────────────────────────────
    const admin = await User.create({
      name: "Admin Teacher",
      email: "admin@aieval8.com",
      password: "admin123",
      role: "teacher",
      isVerified: true,
      isApproved: true,
    });

    const student1 = await User.create({
      name: "Alice Student",
      email: "alice@student.com",
      password: "student123",
      role: "student",
      isVerified: true,
      isApproved: true,
    });

    const student2 = await User.create({
      name: "Bob Student",
      email: "bob@student.com",
      password: "student123",
      role: "student",
      isVerified: true,
      isApproved: true,
    });

    console.log("Created users: admin, alice, bob");

    // ── Create Exams ──────────────────────────────────────────────────
    const now = new Date();
    const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const exam1 = await Exam.create({
      examName: "Data Structures & Algorithms",
      totalQuestions: 5,
      duration: 30,
      liveDate: now,
      deadDate: oneMonthLater,
    });

    const exam2 = await Exam.create({
      examName: "Operating Systems Fundamentals",
      totalQuestions: 5,
      duration: 25,
      liveDate: now,
      deadDate: oneMonthLater,
    });

    const exam3 = await Exam.create({
      examName: "Database Management Systems",
      totalQuestions: 5,
      duration: 20,
      liveDate: now,
      deadDate: oneMonthLater,
    });

    console.log("Created 3 exams");

    // ── Create Questions — Exam 1: DSA ────────────────────────────────
    const dsaQuestions = [
      {
        question: "What is the time complexity of binary search?",
        options: [
          { optionText: "O(n)", isCorrect: false },
          { optionText: "O(log n)", isCorrect: true },
          { optionText: "O(n²)", isCorrect: false },
          { optionText: "O(1)", isCorrect: false },
        ],
        ansmarks: 2,
        examId: exam1.examId,
      },
      {
        question: "Which data structure uses FIFO (First In, First Out)?",
        options: [
          { optionText: "Stack", isCorrect: false },
          { optionText: "Queue", isCorrect: true },
          { optionText: "Tree", isCorrect: false },
          { optionText: "Graph", isCorrect: false },
        ],
        ansmarks: 2,
        examId: exam1.examId,
      },
      {
        question: "What is the worst-case time complexity of QuickSort?",
        options: [
          { optionText: "O(n log n)", isCorrect: false },
          { optionText: "O(n)", isCorrect: false },
          { optionText: "O(n²)", isCorrect: true },
          { optionText: "O(log n)", isCorrect: false },
        ],
        ansmarks: 2,
        examId: exam1.examId,
      },
      {
        question: "Which traversal visits nodes level by level in a tree?",
        options: [
          { optionText: "Inorder", isCorrect: false },
          { optionText: "Preorder", isCorrect: false },
          { optionText: "Postorder", isCorrect: false },
          { optionText: "Level-order (BFS)", isCorrect: true },
        ],
        ansmarks: 2,
        examId: exam1.examId,
      },
      {
        question: "A balanced BST with n nodes has height of approximately:",
        options: [
          { optionText: "O(n)", isCorrect: false },
          { optionText: "O(log n)", isCorrect: true },
          { optionText: "O(√n)", isCorrect: false },
          { optionText: "O(n²)", isCorrect: false },
        ],
        ansmarks: 2,
        examId: exam1.examId,
      },
    ];

    // ── Create Questions — Exam 2: OS ─────────────────────────────────
    const osQuestions = [
      {
        question: "Which scheduling algorithm may cause starvation?",
        options: [
          { optionText: "Round Robin", isCorrect: false },
          { optionText: "FCFS", isCorrect: false },
          { optionText: "Priority Scheduling", isCorrect: true },
          { optionText: "SJF", isCorrect: false },
        ],
        ansmarks: 2,
        examId: exam2.examId,
      },
      {
        question: "What is a deadlock?",
        options: [
          { optionText: "A process that runs forever", isCorrect: false },
          { optionText: "A set of processes each waiting for a resource held by another", isCorrect: true },
          { optionText: "A fast context switch", isCorrect: false },
          { optionText: "An I/O error", isCorrect: false },
        ],
        ansmarks: 2,
        examId: exam2.examId,
      },
      {
        question: "Which memory management technique uses pages and frames?",
        options: [
          { optionText: "Segmentation", isCorrect: false },
          { optionText: "Paging", isCorrect: true },
          { optionText: "Swapping", isCorrect: false },
          { optionText: "Contiguous allocation", isCorrect: false },
        ],
        ansmarks: 2,
        examId: exam2.examId,
      },
      {
        question: "What is the purpose of a semaphore in OS?",
        options: [
          { optionText: "Memory allocation", isCorrect: false },
          { optionText: "Process synchronization", isCorrect: true },
          { optionText: "Disk scheduling", isCorrect: false },
          { optionText: "File management", isCorrect: false },
        ],
        ansmarks: 2,
        examId: exam2.examId,
      },
      {
        question: "The Belady's anomaly is associated with which page replacement algorithm?",
        options: [
          { optionText: "LRU", isCorrect: false },
          { optionText: "Optimal", isCorrect: false },
          { optionText: "FIFO", isCorrect: true },
          { optionText: "LFU", isCorrect: false },
        ],
        ansmarks: 2,
        examId: exam2.examId,
      },
    ];

    // ── Create Questions — Exam 3: DBMS ───────────────────────────────
    const dbmsQuestions = [
      {
        question: "Which normal form eliminates transitive dependencies?",
        options: [
          { optionText: "1NF", isCorrect: false },
          { optionText: "2NF", isCorrect: false },
          { optionText: "3NF", isCorrect: true },
          { optionText: "BCNF", isCorrect: false },
        ],
        ansmarks: 2,
        examId: exam3.examId,
      },
      {
        question: "What does ACID stand for in database transactions?",
        options: [
          { optionText: "Atomicity, Consistency, Isolation, Durability", isCorrect: true },
          { optionText: "Association, Consolidation, Integration, Data", isCorrect: false },
          { optionText: "Atomicity, Concurrency, Isolation, Dependency", isCorrect: false },
          { optionText: "Access, Control, Identity, Data", isCorrect: false },
        ],
        ansmarks: 2,
        examId: exam3.examId,
      },
      {
        question: "Which SQL command is used to remove a table from the database?",
        options: [
          { optionText: "DELETE", isCorrect: false },
          { optionText: "REMOVE", isCorrect: false },
          { optionText: "DROP", isCorrect: true },
          { optionText: "TRUNCATE", isCorrect: false },
        ],
        ansmarks: 2,
        examId: exam3.examId,
      },
      {
        question: "A foreign key in a table refers to the _____ of another table.",
        options: [
          { optionText: "Foreign key", isCorrect: false },
          { optionText: "Primary key", isCorrect: true },
          { optionText: "Candidate key", isCorrect: false },
          { optionText: "Super key", isCorrect: false },
        ],
        ansmarks: 2,
        examId: exam3.examId,
      },
      {
        question: "Which type of join returns all rows from both tables?",
        options: [
          { optionText: "INNER JOIN", isCorrect: false },
          { optionText: "LEFT JOIN", isCorrect: false },
          { optionText: "RIGHT JOIN", isCorrect: false },
          { optionText: "FULL OUTER JOIN", isCorrect: true },
        ],
        ansmarks: 2,
        examId: exam3.examId,
      },
    ];

    await Question.insertMany([...dsaQuestions, ...osQuestions, ...dbmsQuestions]);
    console.log("Created 15 questions (5 per exam)");

    // ── Summary ───────────────────────────────────────────────────────
    console.log("\n═══════════════════════════════════════════");
    console.log("  SEED DATA CREATED SUCCESSFULLY");
    console.log("═══════════════════════════════════════════");
    console.log("\n  Test Credentials:");
    console.log("  ─────────────────");
    console.log("  Admin:     admin@aieval8.com / admin123");
    console.log("  Student 1: alice@student.com / student123");
    console.log("  Student 2: bob@student.com   / student123");
    console.log("\n  Exams Created:");
    console.log("  ──────────────");
    console.log(`  1. ${exam1.examName} (${exam1.examId})`);
    console.log(`  2. ${exam2.examName} (${exam2.examId})`);
    console.log(`  3. ${exam3.examName} (${exam3.examId})`);
    console.log("═══════════════════════════════════════════\n");

    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }
}

seed();
