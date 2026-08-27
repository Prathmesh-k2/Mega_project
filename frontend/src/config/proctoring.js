// ─── Frontend Proctoring Configuration ──────────────────────────────────────
// Mirrors backend config for frontend use.

const PROCTORING_CONFIG = {
  // Event cooldowns (ms) — minimum time between same event type
  cooldowns: {
    NO_FACE_DETECTED:    10000,
    MULTIPLE_FACES:      10000,
    CELL_PHONE_DETECTED: 10000,
    BOOK_DETECTED:       10000,
    LAPTOP_DETECTED:     10000,
    PROHIBITED_OBJECT:   10000,
    TAB_SWITCH:          5000,
    WINDOW_BLUR:         5000,
    FULLSCREEN_EXIT:     5000,
    COPY_PASTE:          5000,
    KEYBOARD_SHORTCUT:   5000,
    GAZE_DEVIATION:      15000,
    BACKGROUND_NOISE:    15000,
    SPEECH_DETECTED:     15000,
  },

  // AI inference interval (ms)
  AI_INFERENCE_INTERVAL: 1500,

  // Min confidence to register detection
  MIN_CONFIDENCE: 0.50,

  // Evidence capture cooldown per type (ms)
  EVIDENCE_COOLDOWN: 15000,

  // Audio thresholds
  audio: {
    NOISE_THRESHOLD: 0.15,
    SPEECH_THRESHOLD: 0.30,
    ANALYSIS_INTERVAL: 2000,
  },

  // Gaze deviation
  gaze: {
    DEVIATION_DURATION: 3000, // ms of continuous deviation to trigger
    ANGLE_THRESHOLD: 25,
  },

  // Auto-termination score
  TERMINATION_THRESHOLD: 70,
};

export default PROCTORING_CONFIG;
