# PROJECT SYNOPSIS

## 1. Project Title
**ProctoAI: Dual-Camera Automated AI Online Examination Proctoring System**

---

## 2. Project Category & Domain
* **Category:** Artificial Intelligence & Full-Stack Web Application (MERN + FastAPI AI Microservice)
* **Domain:** EdTech, Computer Vision, Real-Time Video Streaming, Automated Invigilation

---

## 3. Abstract / Executive Summary
With the rapid acceleration of remote education, online assessments, and certification programs, maintaining academic integrity in unproctored or remotely proctored settings has become a critical challenge. Traditional online proctoring solutions suffer from major vulnerabilities: single-webcam blind spots (students hiding mobile devices or cheat sheets next to their screens), invasive third-party software, high bandwidth overheads, and the need for expensive human proctors.

**ProctoAI** is an advanced, automated, dual-camera AI-powered online examination proctoring system. It combines a robust **MERN stack** (MongoDB, Express.js, React.js, Node.js) web application with an ultra-fast **Python FastAPI** microservice powered by **YOLO11 (Ultralytics)** and **WebRTC real-time peer-to-peer streaming**. 

The system leverages:
1. **Primary Laptop/Webcam Stream:** Continuously tracks the student's frontal face, gaze direction, posture, and facial presence.
2. **Secondary Mobile Phone Stream:** Linked seamlessly via QR-code WebRTC signaling, positioned at a 45° side angle to monitor the student’s desk, hands, laptop keyboard, and peripheral environment.
3. **High-Speed AI Inference Engine:** Uses YOLO11 neural network models to instantly detect multiple persons, absence of the candidate, and unauthorized objects (smartphones, electronic devices, books).
4. **Real-Time Proctoring Pipeline:** Automated real-time violation warnings (toasts), risk scoring, secure snapshot evidence logging, and an interactive Teacher Audit Dashboard with verifiable cheat logs.

---

## 4. Problem Statement
Online remote examinations face significant integrity risks:
* **Blind Spots in Single-Camera Systems:** A single front webcam cannot capture what is happening on the desk, under the monitor, or on a handheld smartphone.
* **Scalability Bottlenecks:** Human invigilators can supervise at most 5–10 students concurrently, making large-scale institutional exams expensive and error-prone.
* **Delayed Anomaly Detection:** Post-exam forensic review wastes significant instructor time and fails to deter active cheating during the session.
* **Intrusive Software:** Many existing proctoring tools require kernel-level intrusive installs that raise student privacy and OS compatibility concerns.

---

## 5. Objectives of the Project
* **Eliminate Monitoring Blind Spots:** Implement a zero-install dual-camera setup (laptop webcam + mobile camera via WebRTC QR code pairing).
* **Automate Real-Time Cheating Detection:** Leverage the YOLO11 deep learning model to flag:
  * Cell phone usage / prohibited objects.
  * Multiple faces in the frame (impersonation or unauthorized assistance).
  * Candidate absence (face not visible / empty seat).
* **Comprehensive Role-Based Portals:** Provide segregated workflows for Students (exam taking, timer, camera streams, warning alerts) and Teachers (exam creation, question authoring, student performance analytics, cheat log review).
* **Automated Evidence Logging & Risk Scoring:** Capture timestamped photographic evidence of each detected anomaly and compute a composite risk score for post-exam review.
* **Low-Latency & Resource-Efficient Architecture:** Decouple exam business logic (Node/Express/MongoDB) from computer vision processing (FastAPI/YOLO11) to achieve sub-second inference without lagging student test interfaces.

---

## 6. Proposed System Architecture & Workflow

```
+-----------------------------------------------------------------------------------+
|                                STUDENT DEVICE                                     |
|                                                                                   |
|  [Laptop Webcam] ------> React Frontend (Exam Interface + WebRTC Client)          |
|                               ^                                                   |
|                               | (P2P WebRTC Video Stream via QR Code)             |
|                               v                                                   |
|  [Mobile Camera] ------> Mobile Browser (WebRTC Streamer)                         |
+-------------------------------|---------------------------------------------------+
                                |
                                | Frame Snapshots (Base64/Multipart)
                                v
               +----------------------------------+
               |        FASTAPI AI SERVICE        |
               |     (Python 3.10+, YOLO11)       |
               |----------------------------------|
               | - Multi-Person Detection         |
               | - Cell Phone Detection           |
               | - Candidate Absence Detection    |
               | - Confidence Filtering & BBoxes  |
               +----------------+-----------------+
                                |
                                | Detection Results (JSON)
                                v
+-----------------------------------------------------------------------------------+
|                           MERN PLATFORM BACKEND                                   |
|                                                                                   |
|  Node.js / Express Server <------------> MongoDB Database                         |
|  - JWT Authentication                     - Users (Student / Teacher)             |
|  - Exam & Question Management             - Exams & Questions                     |
|  - Exam Sessions & Submissions            - Cheat Logs & Violation Events         |
|  - Real-Time Socket.io Alert Signaling    - Evidence Storage                      |
+-----------------------------------------------------------------------------------+
                                |
                                v
+-----------------------------------------------------------------------------------+
|                            TEACHER / ADMIN PORTAL                                 |
|  - Real-Time Candidate Monitoring Grid                                            |
|  - Interactive Cheat Log Dashboard with Photographic Evidence                     |
|  - Automatic Exam Results & Integrity Scorecard                                   |
+-----------------------------------------------------------------------------------+
```

### End-to-End Operational Workflow
1. **Teacher Setup:** Teacher logs into the portal, creates an exam, configures timing, sets instructions, and adds questions (MCQs / Coding / Short questions).
2. **Student Authentication & Pre-Check:** The student logs into the portal, selects their assigned exam, grants browser camera/microphone permissions, and is presented with a QR code.
3. **Mobile Camera Pairing:** The student scans the QR code with their mobile phone camera, opening a lightweight WebRTC streaming webpage that feeds video into the student's exam session without requiring app store downloads.
4. **Active Exam & AI Monitoring:**
   * The exam timer starts, displaying questions one by one or in a grid.
   * At regular sampling intervals (e.g., every 3 to 5 seconds), video frames from both cameras are sent to the FastAPI detection endpoint (`/detect`).
   * YOLO11 runs object detection on the frames.
5. **Violation Handling & Warning System:**
   * If a cell phone is spotted, multiple people appear, or the student leaves the seat, the frontend issues a live toast warning and records an incident.
   * The violation event, camera source, timestamp, and snapshot are stored in MongoDB.
   * If violations exceed the threshold, the session can auto-terminate.
6. **Submission & Teacher Audit:**
   * The student submits the exam (or auto-submits on timeout).
   * The teacher reviews candidate scores alongside their Cheat Log Dashboard, inspecting timestamped photo snapshots of all flagged violations.

---

## 7. Key Modules & Functional Description

| Module Name | Description & Capabilities |
| :--- | :--- |
| **1. Authentication & RBAC Module** | Secure JWT-based login and registration with distinct permissions for Students and Teachers; protected routes, encrypted passwords (bcryptjs), and session management. |
| **2. Exam Management Module** | Authoring interface for teachers to create exams, customize passing marks, configure timers, add multiple-choice and descriptive questions, and publish exams. |
| **3. Dual-Camera WebRTC Streaming** | WebRTC peer-to-peer connection establishment using Socket.io signaling. Enables real-time desk/side camera streaming from any standard smartphone browser. |
| **4. AI Vision & Inference Module** | Ultralytics YOLO11 model wrapped in a high-concurrency FastAPI microservice. Performs object detection (cell phones, persons), detects empty seats, and outputs bounding boxes. |
| **5. Violation & Risk Scoring Engine** | Aggregates violation events, logs timestamps, classifies risk severity (Minor, Moderate, Critical), and alerts students in real-time. |
| **6. Teacher Audit & Cheat Log Dashboard** | Interactive dashboard providing teachers with a chronological log of candidate infractions, previewable evidence snapshots, and overall candidate integrity ratings. |
| **7. Student Assessment Interface** | Clean, distraction-free examination screen equipped with countdown timers, dynamic question navigation, and real-time dual-camera preview widgets. |

---

## 8. Technology Stack Specification

* **Frontend:**
  * React.js (Component-based Single Page Application)
  * Redux Toolkit (Predictable global state management)
  * Material-UI & Emotion (Modern, responsive UI components)
  * WebRTC API (Peer-to-peer browser video streaming)
  * React-Webcam (Hardware webcam capture)
  * React-Toastify & SweetAlert2 (Dynamic alerts and violation toasts)
  * Axios (REST API communication)
* **Main Application Backend:**
  * Node.js & Express.js (RESTful API architecture)
  * MongoDB & Mongoose (Schema-driven NoSQL database)
  * JSON Web Tokens (JWT) & bcryptjs (Authentication and cryptographic hashing)
  * Socket.io (WebSocket signaling and real-time event broadcasting)
* **AI Computer Vision Service:**
  * Python 3.10+
  * FastAPI & Uvicorn (Asynchronous high-throughput microservice)
  * YOLO11 (Ultralytics state-of-the-art real-time object detection)
  * Pillow (PIL) & NumPy (High-speed frame decoding and pre-processing)

---

## 9. Hardware and Software Requirements

### Hardware Requirements
* **Candidate Workstation:**
  * Standard PC/Laptop with working web camera and microphone.
  * Processor: Intel Core i3 (4th Gen) / AMD Ryzen 3 or higher.
  * RAM: Minimum 4 GB (8 GB recommended).
  * Secondary Camera: Any Android or iOS smartphone with a modern web browser.
* **Server Environment (Development / Demo):**
  * Multi-core CPU (Intel i5/i7 or AMD Ryzen 5/7).
  * Optional: NVIDIA GPU with CUDA support for accelerated batch inference (CPU inference supported via YOLO11 nano).
  * Storage: 20 GB free disk space.

### Software Requirements
* **Operating Systems:** Windows 10/11, macOS, or Ubuntu Linux.
* **Runtime Environments:** Node.js (v18.x or v20.x LTS), Python (v3.10+).
* **Database:** MongoDB Community Server or MongoDB Atlas Cloud.
* **Browsers:** Google Chrome (v100+), Mozilla Firefox (v100+), Microsoft Edge, Apple Safari.

---

## 10. Key Innovations & Differentiators
1. **Dual-Perspective Proctoring Without App Installs:** Eliminates blind spots by using the student's existing mobile phone over standard WebRTC without requiring specialized native apps.
2. **Next-Generation YOLO11 Architecture:** Leverages the latest YOLO11 neural network providing higher mAP (mean Average Precision) and lower latency compared to older Haar Cascades or legacy YOLOv3/v4 models.
3. **Decoupled Microservice Design:** High-compute AI processing runs independently on FastAPI, ensuring the Node.js application server remains lightweight and responsive.
4. **Verifiable Audit Trail:** Cheating claims are backed by timestamped camera snapshot evidence, eliminating false-accusation disputes between students and educators.

---

## 11. Demo Presentation Highlights (For Viva / Evaluation)
* **Live Dual-Stream Demonstration:** Show laptop front camera and paired smartphone side camera actively streaming on the exam screen.
* **Live Detection Showcase:**
  * Bring a smartphone into view -> Instant toast notification: *"Cell Phone Detected"*.
  * Introduce a second person -> Instant toast notification: *"Multiple Faces Detected"*.
  * Step out of the camera view -> Instant toast notification: *"No Face Detected / Candidate Missing"*.
* **Live Cheat Log Verification:** Open the Teacher Dashboard immediately after the exam to display the recorded violation events, confidence ratings, and photo evidence.
