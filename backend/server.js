import express from "express";
import dotenv from "dotenv";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

// Route imports
import userRoutes from "./routes/userRoutes.js";
import examRoutes from "./routes/examRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import codingRoutes from "./routes/codingRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import proctoringRoutes from "./routes/proctoringRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

// Resolve .env from project root regardless of CWD
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
connectDB();
const app = express();
const port = process.env.PORT || 5000;

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" })); // Allow larger payloads for screenshots
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Logging Middleware ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (req.originalUrl.startsWith("/api/")) {
        console.log(
          `[${req.method}] ${req.originalUrl} → ${res.statusCode} (${duration}ms)`
        );
      }
    });
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/users", userRoutes);
app.use("/api/users", examRoutes);
app.use("/api/users", resultRoutes);
app.use("/api/coding", codingRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/proctoring", proctoringRoutes);
app.use("/api/admin", adminRoutes);

// ── Production Static Files ───────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const rootDir = path.resolve();
  app.use(express.static(path.join(rootDir, "/frontend/dist")));
  app.get("*", (req, res) =>
    res.sendFile(path.resolve(rootDir, "frontend", "dist", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("<h1>AI_Evalu8 API Server Running</h1>");
  });
}

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`\n🚀 AI_Evalu8 server running on http://localhost:${port}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}\n`);
});
