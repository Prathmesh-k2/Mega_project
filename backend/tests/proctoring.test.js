import { classifyStatus, calculateFullScore, calculateEventScore } from '../services/ScoringEngine.js';
import PROCTORING_CONFIG from '../config/proctoring.js';
import { classifyProctoringEvent } from '../services/ProctoringPolicy.js';

describe("ScoringEngine", () => {
  beforeEach(() => {
    // Reset config assumptions if needed
    PROCTORING_CONFIG.decision.SAFE_MAX = 29;
    PROCTORING_CONFIG.decision.WARNING_MAX = 49;
    PROCTORING_CONFIG.decision.ADMIN_REVIEW_MAX = 59;
  });

  test("Should classify as SAFE when hybrid score is low", () => {
    const res = classifyStatus(15, []);
    expect(res.status).toBe("SAFE");
    expect(res.score).toBe(15);
  });

  test("Should classify as WARNING when hybrid score is exactly at warning threshold", () => {
    const res = classifyStatus(30, []);
    expect(res.status).toBe("WARNING");
    expect(res.score).toBe(30);
  });

  test("Should classify as ADMIN_REVIEW when hybrid score is 50", () => {
    const res = classifyStatus(50, []);
    expect(res.status).toBe("ADMIN_REVIEW");
    expect(res.score).toBe(50);
  });

  test("Should classify as MALPRACTICE inherently above ADMIN_REVIEW", () => {
    const res = classifyStatus(60, []);
    expect(res.status).toBe("MALPRACTICE");
    expect(res.score).toBe(60);
  });

  test("Should instantly terminate regardless of low hybrid score if 3 FULLSCREEN_EXITs occurred", () => {
    const violations = [
      { eventType: "FULLSCREEN_EXIT", penaltyPoints: 20 },
      { eventType: "FULLSCREEN_EXIT", penaltyPoints: 20 },
      { eventType: "FULLSCREEN_EXIT", penaltyPoints: 20 }
    ];
    // Normally 3 * 20 = 60 purely event score. But even if AI score was 0,
    // let's say hybrid score computed to 36.
    const res = classifyStatus(36, violations);
    
    // The hard override must force it to MALPRACTICE and 60
    expect(res.status).toBe("MALPRACTICE");
    expect(res.score).toBe(60);
  });

  test("calculateFullScore Pipeline validates proper penalty aggregation", () => {
    const violations = [
      { eventType: "NO_FACE_DETECTED", severity: "MEDIUM", penaltyPoints: 10, confidence: 1 },
      { eventType: "MULTIPLE_FACES", severity: "HIGH", penaltyPoints: 25, confidence: 0.9 }
    ];

    const result = calculateFullScore(violations);
    expect(result.totalPenalties).toBe(35);
    expect(result.eventScore).toBe(35);
    // Since hybrid calculation merges AI behavior, the final score will be somewhat balanced
    expect(result.hybridScore).toBeGreaterThan(0);
    expect(result.fairnessScore).toBe(100 - result.hybridScore);
  });

  test("permitted workspace objects and paper add no penalty", () => {
    for (const eventType of ["LAPTOP_DETECTED", "BOOK_DETECTED", "KEYBOARD_DETECTED", "MOUSE_DETECTED", "PEN_DETECTED", "HAND_MOVEMENT", "TYPING"]) {
      const result = classifyProctoringEvent(eventType, { examSettings: { roughPaperAllowed: true } });
      expect(result.status).toBe("SAFE");
    }
  });

  test("paper prohibited by exam policy requires review, not automatic penalty", () => {
    expect(classifyProctoringEvent("BOOK_DETECTED", { examSettings: { roughPaperAllowed: false } }).status).toBe("REVIEW_REQUIRED");
    const score = calculateFullScore([{ eventType: "BOOK_DETECTED", decisionStatus: "REVIEW_REQUIRED", penaltyPoints: 0, confidence: 0.9 }]);
    expect(score.totalPenalties).toBe(0);
    expect(score.totalViolations).toBe(0);
  });

  test("phone-like objects are ambiguous and require review", () => {
    expect(classifyProctoringEvent("CELL_PHONE_DETECTED").status).toBe("REVIEW_REQUIRED");
  });

  test("a single low-confidence phone signal requires review without penalty", () => {
    const decision = classifyProctoringEvent("CELL_PHONE_DETECTED");
    const score = calculateFullScore([{ eventId: "low-phone", eventType: "CELL_PHONE_DETECTED", decisionStatus: decision.status, penaltyPoints: 0, confidence: 0.51 }]);
    expect(decision.status).toBe("REVIEW_REQUIRED");
    expect(score.totalViolations).toBe(0);
    expect(score.totalPenalties).toBe(0);
    expect(score.classification).toBe("SAFE");
  });

  test("warnings and camera loss do not contribute to penalty score", () => {
    const events = [
      { eventType: "BACKGROUND_NOISE", decisionStatus: "WARNING", penaltyPoints: 5, confidence: 1 },
      { eventType: "CAMERA_UNAVAILABLE", decisionStatus: "WARNING", penaltyPoints: 0, confidence: 0 },
    ];
    const score = calculateFullScore(events);
    expect(score.totalPenalties).toBe(0);
    expect(score.totalViolations).toBe(0);
    expect(score.classification).toBe("SAFE");
  });

  test("replayed event IDs are only counted once", () => {
    const event = { eventId: "same-event", eventType: "TAB_SWITCH", decisionStatus: "VIOLATION_CONFIRMED", penaltyPoints: 20, severity: "MEDIUM", confidence: 0.9, timestamp: new Date() };
    const score = calculateFullScore([event, { ...event }]);
    expect(score.totalViolations).toBe(1);
    expect(score.totalPenalties).toBe(20);
  });

  test("only confirmed fullscreen events affect the legacy three-exit override", () => {
    const pending = Array.from({ length: 3 }, () => ({ eventType: "FULLSCREEN_EXIT", decisionStatus: "WARNING", penaltyPoints: 0 }));
    expect(calculateFullScore(pending).classification).toBe("SAFE");
    const confirmed = Array.from({ length: 3 }, () => ({ eventType: "FULLSCREEN_EXIT", penaltyPoints: 20 }));
    expect(calculateFullScore(confirmed).classification).toBe("MALPRACTICE");
  });
});
