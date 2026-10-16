const REVIEW_EVENTS = new Set([
  "CELL_PHONE_DETECTED",
  "NO_FACE_DETECTED",
  "MULTIPLE_FACES",
  "BOOK_DETECTED",
  "PROHIBITED_OBJECT",
  "PERSON_IN_BACKGROUND",
  "GAZE_DEVIATION",
]);

const WARNING_EVENTS = new Set([
  "CAMERA_UNAVAILABLE",
  "BACKGROUND_NOISE",
  "SPEECH_DETECTED",
  "TAB_SWITCH",
  "WINDOW_BLUR",
  "FULLSCREEN_EXIT",
  "COPY_PASTE",
  "RIGHT_CLICK",
  "KEYBOARD_SHORTCUT",
]);

/** Classifies a signal; perception is never treated as proof by itself. */
export function classifyProctoringEvent(eventType, { examSettings = {} } = {}) {
  if (eventType === "EXAM_TERMINATED") {
    return { status: "TERMINATED", reason: "The exam session was terminated by an explicit policy action." };
  }

  if (eventType === "BOOK_DETECTED") {
    if (examSettings.roughPaperAllowed !== false) {
      return { status: "SAFE", reason: "Rough paper is permitted for this exam." };
    }
    return { status: "REVIEW_REQUIRED", reason: "Possible paper or printed material needs human verification under this exam's policy." };
  }

  if (REVIEW_EVENTS.has(eventType)) {
    if (eventType === "CELL_PHONE_DETECTED") {
      return { status: "REVIEW_REQUIRED", reason: "A phone-like object needs verification; the camera feed cannot establish device identity." };
    }
    return { status: "REVIEW_REQUIRED", reason: "This camera or behavior signal is uncertain and needs human verification." };
  }

  if (WARNING_EVENTS.has(eventType)) {
    return { status: "WARNING", reason: "A monitoring or browser signal was recorded; it is not a confirmed cheating violation." };
  }

  return { status: "SAFE", reason: "No actionable violation is defined for this event." };
}

export function isConfirmedViolation(event) {
  // Events written before decisionStatus existed retain their legacy score.
  return event?.decisionStatus
    ? event.decisionStatus === "VIOLATION_CONFIRMED"
    : (event?.penaltyPoints || 0) > 0;
}
