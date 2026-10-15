# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## ProctoAI: Automated AI-Powered Online Examination Proctoring System
**Document Version:** 1.0.0  
**Standard:** IEEE Std 830-1998 Compliant  
**Project:** ProctoAI-MERN with Dual-Camera AI Invigilation  
**Date:** October 2026  

---

## TABLE OF CONTENTS
1. [Introduction](#1-introduction)
   - 1.1 Purpose
   - 1.2 Document Conventions
   - 1.3 Intended Audience & Reading Suggestions
   - 1.4 Product Scope
   - 1.5 References
2. [Overall Description](#2-overall-description)
   - 2.1 Product Perspective
   - 2.2 System Architecture
   - 2.3 Product Functions & Features Summary
   - 2.4 User Classes and Characteristics
   - 2.5 Operating Environment
   - 2.6 Design and Implementation Constraints
   - 2.7 Assumptions and Dependencies
3. [External Interface Requirements](#3-external-interface-requirements)
   - 3.1 User Interfaces
   - 3.2 Hardware Interfaces
   - 3.3 Software Interfaces
   - 3.4 Communications Interfaces
4. [System Features & Functional Requirements](#4-system-features--functional-requirements)
   - 4.1 Authentication and Role-Based Authorization
   - 4.2 Exam & Question Authoring (Teacher)
   - 4.3 Student Examination Engine & Active Test Environment
   - 4.4 WebRTC Dual-Camera Pairing Subsystem
   - 4.5 Computer Vision & YOLO11 Cheating Detection Pipeline
   - 4.6 Violation Logging & Evidence Capture
   - 4.7 Teacher Audit & Cheat Log Dashboard
   - 4.8 Automated Scoring & Result Management
5. [Non-Functional Requirements (NFRs)](#5-non-functional-requirements-nfrs)
   - 5.1 Performance Requirements
   - 5.2 Safety Requirements
   - 5.3 Security Requirements
   - 5.4 Software Quality Attributes (Reliability, Availability, Maintainability, Usability)
6. [Data Model & Database Design](#6-data-model--database-design)
   - 6.1 Entity-Relationship (ER) Overview
   - 6.2 Schema Definitions
7. [Use Cases & Behavioral Models](#7-use-cases--behavioral-models)
   - 7.1 Primary Use Case Specifications
   - 7.2 Activity Diagrams & Workflow Sequences
8. [Verification, Validation & Acceptance Criteria](#8-verification-validation--acceptance-criteria)

---

## 1. INTRODUCTION

### 1.1 Purpose
This Software Requirements Specification (SRS) document details the complete functional and non-functional requirements for the **ProctoAI Automated Exam Proctoring System (AEPS)**. It serves as the formal contractual and technical reference for developers, quality assurance testers, educational administrators, and evaluators during project demonstrations and deployments.

### 1.2 Document Conventions
- **Must / Shall:** Indicates mandatory requirements.
- **Should:** Indicates recommended capabilities.
- **May:** Indicates optional enhancements.
- **Acronyms:**
  - **AEPS:** Automated Exam Proctoring System
  - **MERN:** MongoDB, Express.js, React.js, Node.js
  - **YOLO:** You Only Look Once (Ultralytics object detection architecture)
  - **WebRTC:** Web Real-Time Communication
  - **JWT:** JSON Web Token
  - **RBAC:** Role-Based Access Control

### 1.3 Intended Audience & Reading Suggestions
This document is designed for:
- **System Evaluators & Project Reviewers:** To verify alignment with requirements during demonstrations.
- **Software Developers:** For implementation architecture, API endpoints, and schemas.
- **Instructors / Administrators:** For understanding proctoring capabilities, integrity safeguards, and audit trails.

### 1.4 Product Scope
ProctoAI is an intelligent, dual-camera online examination integrity platform. It replaces costly, fallible human proctoring by automating continuous visual monitoring during online tests. By combining frontal laptop webcams with synchronized smartphone desk cameras (paired via QR-code WebRTC connections), ProctoAI analyzes video frames using YOLO11 deep neural networks to detect cell phones, unauthorized individuals, and candidate absence in real time.

### 1.5 References
- IEEE Std 830-1998: IEEE Recommended Practice for Software Requirements Specifications.
- Ultralytics YOLO11 Documentation (https://docs.ultralytics.com).
- W3C WebRTC 1.0: Real-Time Communication Between Browsers.
- RFC 7519: JSON Web Token (JWT) Standards.

---

## 2. OVERALL DESCRIPTION

### 2.1 Product Perspective
ProctoAI is a distributed multi-tier client-server web system consisting of:
1. **Frontend Presentation Tier (React.js):** Responsive Single Page Application (SPA) serving Student, Teacher, and Mobile streaming interfaces.
2. **Application & Business Logic Tier (Node.js & Express.js):** Handles authentication, exam schemas, question banks, session lifecycles, and result computation.
3. **AI Vision Microservice (Python FastAPI & YOLO11):** High-speed asynchronous inference engine that evaluates camera frames for proctoring violations.
4. **Data Persistence Tier (MongoDB):** Document database storing user accounts, exam contents, violation logs, and audit snapshots.

```
+----------------------------------------------------------------------------------+
|                              PROCTOAI ARCHITECTURE                               |
+----------------------------------------------------------------------------------+
|                                                                                  |
|  [Student Laptop Browser] <--- WebRTC P2P Video ---> [Mobile Phone Browser]      |
|           |                                                                      |
|           | REST API / WebSockets                                                |
|           +---------------------------+                                          |
|           |                           |                                          |
|           v                           v                                          |
|   [Node.js / Express Backend]   [FastAPI AI Engine (YOLO11)]                     |
|           |                           |                                          |
|           +------------+--------------+                                          |
|                        |                                                         |
|                        v                                                         |
|               [MongoDB Database]                                                 |
|                        ^                                                         |
|                        | REST API                                                |
|               [Teacher Dashboard]                                                |
|                                                                                  |
+----------------------------------------------------------------------------------+
```

### 2.2 System Architecture
- **Stateless RESTful APIs:** For resource management and exam operations.
- **Real-Time WebRTC Peer Connection:** For low-latency mobile camera streaming with minimal server bandwidth.
- **Microservice Decoupling:** Heavy deep-learning inference is isolated in Python to prevent blocking the Node.js event loop.

### 2.3 Product Functions & Features Summary
- **Authentication & Role Segregation:** Student and Teacher distinct access portals.
- **Exam Management:** Question authoring (MCQs, coding challenges), time constraints, and scoring thresholds.
- **Dual-Camera Surveillance:** Synchronized primary (front) and secondary (desk/side) video feeds.
- **YOLO11 AI Anomaly Detection:**
  - Cell phone and unauthorized electronic device detection.
  - Multi-person detection (detects secondary helpers/collaborators).
  - Absence detection (candidate leaving workstation).
- **Proctoring Feedback Loop:** Real-time on-screen toast warnings and automated violation logging.
- **Teacher Cheat Log Review:** Complete timeline of flagged incidents with verifiable photo snapshots.

### 2.4 User Classes and Characteristics
1. **Student (Examinee):**
   - User taking an assigned test.
   - Requires only a standard web browser, webcam, and smartphone camera.
   - Receives immediate feedback on rule infractions.
2. **Teacher (Instructor / Evaluator):**
   - Creates and schedules exams, authors questions, and sets passing criteria.
   - Monitors live candidate status and audits recorded cheating incidents with photographic evidence.
3. **System Administrator:**
   - Manages institutional settings, seeds initial accounts, and maintains server configurations.

### 2.5 Operating Environment
- **Client Devices:** Laptops / Desktops running Google Chrome, Firefox, or Edge; Smartphones running Android Chrome or iOS Safari.
- **Application Server:** Node.js v18.x+, Express.js v4.x.
- **AI Engine:** Python 3.10+, FastAPI, PyTorch / TorchVision, Ultralytics YOLO11.
- **Database:** MongoDB 6.x+ (Local or Atlas).

### 2.6 Design and Implementation Constraints
- **Hardware Agnostic:** Must operate on standard consumer webcams and phone cameras without proprietary hardware.
- **Zero Client Install:** Strictly browser-based via standard WebRTC and HTML5 APIs; no executable (.exe/.dmg) installation needed.
- **Inference Latency:** Frame inference must execute in under 200ms per frame to support real-time feedback.

### 2.7 Assumptions and Dependencies
- Student workstations possess an active internet connection (minimum 2 Mbps upstream).
- Student grants browser camera and microphone permissions when prompted.
- The mobile device and laptop must be able to establish WebRTC P2P signaling.

---

## 3. EXTERNAL INTERFACE REQUIREMENTS

### 3.1 User Interfaces
- **UI-1: Authentication Screen:** Responsive login/signup interface styled with Material-UI, with email/password validation and role switching.
- **UI-2: Teacher Portal:**
  - Navigation drawer with Exam Creation, Active Exams, Cheat Log Dashboard, and Student Results.
  - Question Builder: Dynamic form to input question title, description, options, correct answers, and point allocations.
- **UI-3: Student Exam Room:**
  - Central question viewport with progress bar and answer selector.
  - Top bar featuring real-time countdown timer and exam details.
  - Side/Overlay widgets rendering:
    - Primary Webcam live preview.
    - Secondary Mobile Camera live preview (WebRTC).
  - Floating Toast Notification container for real-time violation warnings.
- **UI-4: Mobile Streamer Page:**
  - Lightweight, responsive camera capture page accessed by scanning the pairing QR code.
  - Displays streaming status (*Connected / Transmitting*) and video viewfinder.
- **UI-5: Cheat Log Audit Dashboard:**
  - Tabular and card view of flagged violations per student.
  - Modal viewer displaying full-resolution snapshot, bounding boxes, detection timestamp, camera source, and confidence metric.

### 3.2 Hardware Interfaces
- **Laptop/Desktop Webcam:** Interfaced via HTML5 `navigator.mediaDevices.getUserMedia()`.
- **Mobile Device Camera:** Interfaced via mobile browser WebRTC stream.

### 3.3 Software Interfaces
- **FastAPI AI Server (`http://localhost:8000`):**
  - `POST /detect`: Accepts multipart/form-data image frame with camera identifier parameter (`laptop` or `mobile`). Returns JSON detection objects.
  - `GET /health`: Health check endpoint returning model status.
- **Node.js Express Server (`http://localhost:5000`):**
  - `POST /api/users/login`, `POST /api/users/register`: Auth and JWT distribution.
  - `GET /api/exam`, `POST /api/exam`: Exam CRUD operations.
  - `POST /api/sessions/violations`: Logs proctoring violations and evidence image URLs.
  - `GET /api/sessions/cheat-logs/:examId`: Retrieves teacher audit logs.

### 3.4 Communications Interfaces
- **HTTP/HTTPS:** For standard RESTful transactions.
- **WebRTC (RTCPeerConnection):** For direct peer-to-peer audio/video streaming from phone to desktop.
- **WebSocket / Socket.io:** For WebRTC signaling handshake (SDP offer/answer and ICE candidate exchange).

---

## 4. SYSTEM FEATURES & FUNCTIONAL REQUIREMENTS

### 4.1 Authentication and Role-Based Authorization
- **FR-1.1:** The system shall allow users to log in using valid email and password credentials.
- **FR-1.2:** Passwords must be hashed using `bcryptjs` with a minimum salt work factor of 10 prior to database storage.
- **FR-1.3:** Upon successful authentication, the server shall issue a signed JSON Web Token (JWT) containing user ID, role (`student` or `teacher`), and expiration time.
- **FR-1.4:** Protected API routes must validate the JWT in the `Authorization: Bearer <token>` header; unauthenticated requests shall be rejected with HTTP 401 Unauthorized.
- **FR-1.5:** Student users must be restricted from accessing teacher-only administrative routes (HTTP 403 Forbidden).

### 4.2 Exam & Question Authoring (Teacher)
- **FR-2.1:** Teachers shall be able to create new examinations specifying title, duration (in minutes), instructions, total marks, and passing percentage.
- **FR-2.2:** Teachers shall be able to add multiple questions per exam, including multiple-choice questions (options, correct answer index) and coding challenges.
- **FR-2.3:** Teachers shall be able to edit, delete, or activate/deactivate created examinations.

### 4.3 Student Examination Engine & Active Test Environment
- **FR-3.1:** Students shall be able to view a list of published examinations available for their account.
- **FR-3.2:** The exam interface shall display an accurate synchronized countdown timer.
- **FR-3.3:** When the timer reaches `00:00:00`, the system must automatically lock the test and submit the student's current responses.
- **FR-3.4:** Students can navigate between questions, bookmark questions for review, and submit their responses manually.

### 4.4 WebRTC Dual-Camera Pairing Subsystem
- **FR-4.1:** Prior to exam launch, the system shall generate a unique session pairing token represented as a QR code on the student's laptop screen.
- **FR-4.2:** Scanning the QR code with a smartphone camera shall open the pairing URL in the mobile browser.
- **FR-4.3:** The mobile client shall capture the mobile camera stream (`facingMode: 'environment'`) and transmit it via WebRTC to the laptop client.
- **FR-4.4:** The exam interface shall render both primary and secondary feeds simultaneously on the student's screen.

### 4.5 Computer Vision & YOLO11 Cheating Detection Pipeline
- **FR-5.1:** The frontend shall sample frames from both camera streams at configurable intervals (default: 3 seconds).
- **FR-5.2:** Frames shall be packaged and transmitted to the FastAPI `/detect` endpoint.
- **FR-5.3:** The YOLO11 neural network shall detect target classes with a minimum confidence threshold of 0.40:
  - Class `0` (`person`): Tracks count of individuals in the frame.
  - Class `67` (`cell phone`): Detects presence of smartphones.
- **FR-5.4:** The AI engine shall compute anomaly flags:
  - `phone_detected = true`: If one or more cell phones are detected.
  - `multiple_faces = true`: If `person_count > 1`.
  - `no_face = true`: If `person_count == 0`.
- **FR-5.5:** The detection response shall include bounding box coordinates (`x1, y1, x2, y2`) and confidence scores.

### 4.6 Violation Logging & Evidence Capture
- **FR-6.1:** When an anomaly flag is returned as `true`, the frontend shall trigger an immediate visual toast notification to warn the student.
- **FR-6.2:** The system shall capture the triggering frame snapshot and submit a violation record to the backend.
- **FR-6.3:** Each violation record must include: `studentId`, `examId`, `violationType`, `cameraSource` (`laptop` or `mobile`), `confidence`, `timestamp`, and `snapshotUrl`.
- **FR-6.4:** If consecutive violations exceed the administrator threshold (e.g., 5 critical infractions), the exam session shall be locked or auto-submitted.

### 4.7 Teacher Audit & Cheat Log Dashboard
- **FR-7.1:** Teachers shall have access to an interactive Cheat Log Dashboard filtered by exam and student.
- **FR-7.2:** The dashboard shall display total violation counts categorized by type (Phone, Multi-Person, Absence).
- **FR-7.3:** Teachers shall be able to click on any violation event to inspect the photographic snapshot along with bounding boxes highlighting the infraction.

### 4.8 Automated Scoring & Result Management
- **FR-8.1:** Upon exam submission, the system shall evaluate student answers against registered answer keys and calculate the total score.
- **FR-8.2:** The result record shall store score, percentage, passing status, completion timestamp, and proctoring integrity summary.

---

## 5. NON-FUNCTIONAL REQUIREMENTS (NFRs)

### 5.1 Performance Requirements
- **NFR-1.1 Inference Speed:** The FastAPI YOLO11 inference pipeline must process an uploaded frame within 150ms on standard hardware.
- **NFR-1.2 UI Responsiveness:** Exam question transitions and answer selections must register in under 50ms without UI freezing during background frame uploads.
- **NFR-1.3 WebRTC Latency:** The secondary camera stream latency from mobile to desktop must remain below 300ms over local WiFi / 4G connections.

### 5.2 Safety Requirements
- **NFR-2.1 Data Loss Prevention:** Student answer selections must be persistently cached locally (e.g., in Redux/localStorage) so that temporary network disconnects do not cause loss of work.

### 5.3 Security Requirements
- **NFR-3.1 Credential Protection:** All user passwords must be hashed using salted bcrypt hashes; plain text passwords must never be stored or logged.
- **NFR-3.2 Stateless JWT Tokens:** JWTs must expire after a configurable duration (default: 24 hours) and be signed with a strong secret key.
- **NFR-3.3 File Upload Restrictions:** The `/detect` endpoint must validate MIME types (`image/jpeg`, `image/png`, `image/webp`) and enforce a strict 5 MB file size limit to prevent buffer overflow or DoS attacks.

### 5.4 Software Quality Attributes
- **Reliability:** The system shall maintain 99.5% uptime during examination windows.
- **Availability:** Web portals must be accessible via standard browsers without platform-specific extensions.
- **Usability:** Clean, accessible user interface with high contrast, legible typography, and clear visual cues for test countdowns and proctoring statuses.
- **Maintainability:** Modular architecture separating client, server, and AI microservices, allowing independent updates and scalability.

---

## 6. DATA MODEL & DATABASE DESIGN

### 6.1 Entity-Relationship (ER) Overview
The database uses MongoDB schemas representing Users, Exams, Questions, Exam Sessions, Violation Events, and Results.

### 6.2 Schema Definitions

#### 1. User Schema (`User`)
```javascript
{
  _id: ObjectId,
  name: String (Required),
  email: String (Required, Unique, Indexed),
  password: String (Required, Hashed),
  role: String (Enum: ['student', 'teacher', 'admin'], Default: 'student'),
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. Exam Schema (`Exam`)
```javascript
{
  _id: ObjectId,
  title: String (Required),
  description: String,
  teacherId: ObjectId (Ref: 'User'),
  durationMinutes: Number (Required),
  totalMarks: Number,
  passPercentage: Number (Default: 40),
  questions: [ObjectId (Ref: 'Question')],
  isActive: Boolean (Default: true),
  createdAt: Date
}
```

#### 3. Question Schema (`Question`)
```javascript
{
  _id: ObjectId,
  examId: ObjectId (Ref: 'Exam'),
  questionText: String (Required),
  options: [String],
  correctOptionIndex: Number (Required),
  marks: Number (Default: 1),
  questionType: String (Enum: ['mcq', 'coding', 'descriptive'])
}
```

#### 4. Exam Session Schema (`ExamSession`)
```javascript
{
  _id: ObjectId,
  examId: ObjectId (Ref: 'Exam'),
  studentId: ObjectId (Ref: 'User'),
  startTime: Date,
  endTime: Date,
  status: String (Enum: ['in_progress', 'completed', 'terminated']),
  riskScore: Number (Default: 0),
  violationsCount: Number (Default: 0)
}
```

#### 5. Cheating Log / Violation Event Schema (`ViolationEvent`)
```javascript
{
  _id: ObjectId,
  sessionId: ObjectId (Ref: 'ExamSession'),
  examId: ObjectId (Ref: 'Exam'),
  studentId: ObjectId (Ref: 'User'),
  violationType: String (Enum: ['CELL_PHONE_DETECTED', 'MULTIPLE_FACES', 'NO_FACE_DETECTED', 'TAB_SWITCH']),
  cameraSource: String (Enum: ['laptop', 'mobile']),
  confidence: Number,
  snapshotUrl: String,
  detectedBoxes: [{
    label: String,
    confidence: Number,
    box: { x1: Number, y1: Number, x2: Number, y2: Number }
  }],
  timestamp: Date (Default: Date.now)
}
```

#### 6. Result Schema (`Result`)
```javascript
{
  _id: ObjectId,
  examId: ObjectId (Ref: 'Exam'),
  studentId: ObjectId (Ref: 'User'),
  score: Number,
  totalMarks: Number,
  percentage: Number,
  isPassed: Boolean,
  submittedAt: Date,
  answers: [{
    questionId: ObjectId,
    selectedOption: Number
  }]
}
```

---

## 7. USE CASES & BEHAVIORAL MODELS

### 7.1 Primary Use Cases

#### Use Case UC-1: Student Takes Exam with Dual-Camera AI Proctoring
- **Primary Actor:** Student
- **Preconditions:** Student is logged in; an active exam is scheduled.
- **Main Flow:**
  1. Student navigates to the exam portal and clicks "Start Exam".
  2. System requests camera permissions and displays a WebRTC pairing QR code.
  3. Student scans the QR code on smartphone, establishing dual-camera video feeds.
  4. System renders the test page; timer begins countdown.
  5. Student answers questions. In the background, frames from laptop and phone cameras are evaluated by YOLO11.
  6. If no infractions occur, student completes questions and clicks "Submit Exam".
  7. System computes marks and displays submission confirmation.
- **Alternate Flow (Infraction Detected):**
  - 5a. YOLO11 detects a mobile phone or additional person.
  - 5b. System displays an on-screen warning toast alert to the student.
  - 5c. System uploads a frame snapshot and logs a violation event to MongoDB.
  - 5d. Student corrects behavior; exam resumes. If infractions exceed threshold, exam is auto-terminated.

#### Use Case UC-2: Teacher Audits Cheating Incidents
- **Primary Actor:** Teacher
- **Preconditions:** Teacher is authenticated; exams have completed sessions.
- **Main Flow:**
  1. Teacher selects an exam from the Teacher Dashboard.
  2. Teacher clicks "Cheat Log Dashboard".
  3. System renders a list of participating students with their aggregate violation counts.
  4. Teacher selects a student to view chronological violation cards.
  5. Teacher views high-resolution camera snapshots with highlighted bounding boxes.
  6. Teacher confirms or dismisses infractions and marks the final grade accordingly.

---

## 8. VERIFICATION, VALIDATION & ACCEPTANCE CRITERIA

| Test ID | Test Scenario | Expected Outcome | Verification Status |
| :--- | :--- | :--- | :--- |
| **TC-01** | User Authentication | Valid credentials return JWT and redirect to corresponding role dashboard. | Verified |
| **TC-02** | WebRTC Mobile Stream | Scanning QR code opens stream and renders secondary angle on desktop. | Verified |
| **TC-03** | Phone Detection | Holding a smartphone in either camera frame flags `phone_detected: true` and triggers alert toast. | Verified |
| **TC-04** | Multiple Person Detection | Second individual entering frame flags `multiple_faces: true` and registers log. | Verified |
| **TC-05** | Candidate Absence | Student leaving camera view flags `no_face: true` after threshold interval. | Verified |
| **TC-06** | Timer Expiration | Exam locks and auto-submits when remaining time reaches `00:00:00`. | Verified |
| **TC-07** | Cheat Log Dashboard | All logged violations display with accurate timestamps, camera tags, and photo evidence. | Verified |

---

*End of Software Requirements Specification Document.*
