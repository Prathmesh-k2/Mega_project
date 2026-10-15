// ─── Frontend Proctoring Configuration ──────────────────────────────────────

export const PROCTORING = {
  SCAN_INTERVAL_MS: 1500,
  MIN_CONFIDENCE: 0.5,
  NO_FACE_STRIKES: 2,
  DARK_FRAME_BRIGHTNESS: 15,
  COOLDOWN_MS: 8000,
  FULLSCREEN_MAX_EXITS: 3,
  FULLSCREEN_RECOVERY_SECONDS: 10,
  TERMINATE_SCORE: 70,

  WEIGHTS: {
    NO_FACE_DETECTED: 10,
    MULTIPLE_FACES: 30,
    CELL_PHONE_DETECTED: 25,
    BOOK_DETECTED: 15,
    PERSON_IN_BACKGROUND: 15,
    FULLSCREEN_EXIT: 15,
    TAB_SWITCH: 20,
    WINDOW_BLUR: 5,
    COPY_PASTE: 10,
    SPEECH_DETECTED: 20,
    GAZE_DEVIATION: 12,
  },

  META: {
    NO_FACE_DETECTED: {
      icon: '🙈',
      severity: 'HIGH',
      text: 'Your face is not visible. Sit in front of the camera.',
    },
    MULTIPLE_FACES: {
      icon: '👥',
      severity: 'CRITICAL',
      text: 'More than one person was detected.',
    },
    CELL_PHONE_DETECTED: {
      icon: '📱',
      severity: 'CRITICAL',
      text: 'A mobile phone was detected near you.',
    },
    BOOK_DETECTED: {
      icon: '📖',
      severity: 'HIGH',
      text: 'A book or notes were detected.',
    },
    PERSON_IN_BACKGROUND: {
      icon: '🧍',
      severity: 'HIGH',
      text: 'Another person was detected in the background.',
    },
    FULLSCREEN_EXIT: {
      icon: '🖥️',
      severity: 'HIGH',
      text: 'You left fullscreen mode.',
    },
    TAB_SWITCH: {
      icon: '🗂️',
      severity: 'MEDIUM',
      text: 'You switched to another tab.',
    },
    WINDOW_BLUR: {
      icon: '🪟',
      severity: 'LOW',
      text: 'The exam window lost focus.',
    },
    COPY_PASTE: {
      icon: '📋',
      severity: 'MEDIUM',
      text: 'Copy / paste is not allowed.',
    },
    SPEECH_DETECTED: {
      icon: '🎙️',
      severity: 'MEDIUM',
      text: 'Speech was detected.',
    },
  },

  // Event cooldowns (ms) — minimum time between same event type
  cooldowns: {
    NO_FACE_DETECTED:     8000,
    MULTIPLE_FACES:       8000,
    CELL_PHONE_DETECTED:  6000,
    BOOK_DETECTED:        8000,
    PERSON_IN_BACKGROUND: 8000,
    PROHIBITED_OBJECT:    8000,
    TAB_SWITCH:           5000,
    WINDOW_BLUR:          5000,
    FULLSCREEN_EXIT:      3000,
    COPY_PASTE:           5000,
    KEYBOARD_SHORTCUT:    5000,
    RIGHT_CLICK:          5000,
    GAZE_DEVIATION:       15000,
    BACKGROUND_NOISE:     15000,
    SPEECH_DETECTED:      15000,
    IDENTITY_MISMATCH:    30000,
  },

  // AI inference interval (ms)
  AI_INFERENCE_INTERVAL: 1500,

  // Evidence capture cooldown per type (ms)
  EVIDENCE_COOLDOWN: 15000,

  // Audio thresholds
  audio: {
    NOISE_THRESHOLD:  0.15,
    SPEECH_THRESHOLD: 0.30,
    ANALYSIS_INTERVAL: 2000,
  },

  // Gaze deviation
  gaze: {
    DEVIATION_DURATION: 3000,
    ANGLE_THRESHOLD: 25,
    CONFIRMATION_FRAMES: 3,
  },

  // Auto-termination score threshold
  TERMINATION_THRESHOLD: 70,
};

export default PROCTORING;
