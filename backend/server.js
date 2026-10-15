import express from "express";
import dotenv from "dotenv";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";

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
    origin: "*",
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
  
  // Expose Socket.IO to routes
  req.io = io;
  
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

// ── WebRTC Signaling & Socket.IO ──────────────────────────────────────────────
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const sessions = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie?.split("jwt=")[1]?.split(";")[0];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      
      // Admins/Teachers join the secure monitoring room
      if (decoded.role === "admin" || decoded.role === "teacher") {
        socket.join("admin-monitoring");
      } else {
        socket.join(`student_${decoded.userId || decoded.id}`);
      }
    } catch (err) {
      console.warn("Socket JWT Error:", err.message);
    }
  }
  
  next();
});

io.on("connection", (socket) => {
  console.log("Socket Connected:", socket.id);

  // Laptop requests a QR token for its exam session.
  socket.on("create-mobile-token", ({ sessionId }) => {
    const token = randomUUID();
    sessions.set(token, {
      sessionId: sessionId || "pending",
      laptopSocketId: socket.id,
      mobileSocketId: null,
      expiresAt: Date.now() + 5 * 60 * 1000
    });
    socket.emit("mobile-token-created", { token });
  });

  // Phone scans the QR and joins the matching session.
  socket.on("join-mobile-camera", ({ token }) => {
    const session = sessions.get(token);

    if (!session || Date.now() > session.expiresAt) {
      socket.emit("camera-error", "Invalid or expired QR code.");
      return;
    }

    if (session.mobileSocketId) {
      socket.emit("camera-error", "A mobile camera is already connected.");
      return;
    }

    session.mobileSocketId = socket.id;

    socket.emit("mobile-camera-joined", {
      sessionId: session.sessionId
    });

    io.to(session.laptopSocketId).emit("mobile-camera-connected", {
      sessionId: session.sessionId
    });
  });

  // Mobile sends WebRTC offer to laptop.
  socket.on("webrtc-offer", ({ token, offer }) => {
    const s = sessions.get(token);
    if (s && socket.id === s.mobileSocketId) {
      io.to(s.laptopSocketId).emit("webrtc-offer", { token, offer });
    }
  });

  // Laptop sends WebRTC answer to mobile.
  socket.on("webrtc-answer", ({ token, answer }) => {
    const s = sessions.get(token);
    if (s && socket.id === s.laptopSocketId && s.mobileSocketId) {
      io.to(s.mobileSocketId).emit("webrtc-answer", { token, answer });
    }
  });

  // Forward ICE candidates to establish the media connection.
  socket.on("webrtc-ice", ({ token, candidate }) => {
    const s = sessions.get(token);
    if (!s) return;

    if (socket.id === s.laptopSocketId && s.mobileSocketId) {
      io.to(s.mobileSocketId).emit("webrtc-ice", { candidate });
    } else if (socket.id === s.mobileSocketId) {
      io.to(s.laptopSocketId).emit("webrtc-ice", { candidate });
    }
  });

  socket.on("disconnect", () => {
    for (const [token, s] of sessions) {
      if (s.laptopSocketId === socket.id) {
        sessions.delete(token);
      } else if (s.mobileSocketId === socket.id) {
        s.mobileSocketId = null;
        io.to(s.laptopSocketId).emit("mobile-camera-disconnected");
      }
    }
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`\n🚀 AI_Evalu8 server + sockets running on http://0.0.0.0:${port}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}\n`);
});
