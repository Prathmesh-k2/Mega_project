// ─── Centralized Proctoring Configuration ───────────────────────────────────
// All AI proctoring thresholds, penalty points, cooldowns, and scoring weights.
// Import this wherever proctoring config is needed — never hard-code values.

const PROCTORING_CONFIG = {
  // ── Penalty Points per Event Type ──────────────────────────────────────────
  penalties: {
    TAB_SWITCH:           10,
    WINDOW_BLUR:          5,
    FULLSCREEN_EXIT:      100,
    NO_FACE_DETECTED:     10,
    MULTIPLE_FACES:       25,
    CELL_PHONE_DETECTED:  25,
    BOOK_DETECTED:        15,
    LAPTOP_DETECTED:      15,
    PROHIBITED_OBJECT:    15,
    GAZE_DEVIATION:       10,
    BACKGROUND_NOISE:     5,
    SPEECH_DETECTED:      10,
    COPY_PASTE:           10,
    RIGHT_CLICK:          5,
    KEYBOARD_SHORTCUT:    10,
  },

  // ── Severity Mapping ──────────────────────────────────────────────────────
  severity: {
    TAB_SWITCH:           'MEDIUM',
    WINDOW_BLUR:          'LOW',
    FULLSCREEN_EXIT:      'HIGH',
    NO_FACE_DETECTED:     'MEDIUM',
    MULTIPLE_FACES:       'HIGH',
    CELL_PHONE_DETECTED:  'HIGH',
    BOOK_DETECTED:        'MEDIUM',
    LAPTOP_DETECTED:      'MEDIUM',
    PROHIBITED_OBJECT:    'MEDIUM',
    GAZE_DEVIATION:       'LOW',
    BACKGROUND_NOISE:     'LOW',
    SPEECH_DETECTED:      'MEDIUM',
    COPY_PASTE:           'MEDIUM',
    RIGHT_CLICK:          'LOW',
    KEYBOARD_SHORTCUT:    'MEDIUM',
  },

  // ── Decision Thresholds ───────────────────────────────────────────────────
  decision: {
    SAFE_MAX:             29,   // 0–29 → SAFE
    WARNING_MAX:          69,   // 30–69 → WARNING
    // 70–100 → MALPRACTICE
  },

  // ── Hybrid Score Weights ──────────────────────────────────────────────────
  scoring: {
    eventWeight:          0.6,
    aiWeight:             0.4,
  },

  // ── AI Behavior Score Feature Weights ─────────────────────────────────────
  aiBehavior: {
    frequencyWeight:      0.25,
    severityWeight:       0.30,
    confidenceWeight:     0.15,
    diversityWeight:      0.15,
    repetitionWeight:     0.15,
  },

  // ── Cooldowns & Intervals (seconds) ───────────────────────────────────────
  cooldowns: {
    EVENT_COOLDOWN:       10,   // Min seconds between same event type
    EVIDENCE_COOLDOWN:    15,   // Min seconds between evidence captures per type
    AI_INFERENCE_INTERVAL: 1,   // Seconds between AI inference frames
  },

  // ── AI Confidence Thresholds ──────────────────────────────────────────────
  confidence: {
    MIN_DETECTION:        0.50, // Minimum confidence to register a detection
    HIGH_CONFIDENCE:      0.80, // High-confidence detection
  },

  // ── Gaze Monitoring ───────────────────────────────────────────────────────
  gaze: {
    DEVIATION_DURATION:   3,    // Seconds of continuous deviation to trigger event
    ANGLE_THRESHOLD:      25,   // Degrees off-center to consider deviation
  },

  // ── Audio Monitoring ──────────────────────────────────────────────────────
  audio: {
    NOISE_THRESHOLD:      0.15, // RMS amplitude threshold for background noise
    SPEECH_THRESHOLD:     0.30, // RMS amplitude threshold for speech detection
    ANALYSIS_INTERVAL:    2,    // Seconds between audio analysis
  },

  // ── Auto-Termination ──────────────────────────────────────────────────────
  termination: {
    ENABLED:              true,
    SCORE_THRESHOLD:      70,   // Score at which exam auto-terminates
  },

  // ── OTP Config ────────────────────────────────────────────────────────────
  otp: {
    EXPIRY_SECONDS:       300,  // 5 minutes
    RESEND_COOLDOWN:      60,   // 1 minute between resends
    MAX_ATTEMPTS:         5,
  },
};

export default PROCTORING_CONFIG;
