import { classifyStatus, calculateFullScore, calculateEventScore } from '../services/ScoringEngine.js';
import PROCTORING_CONFIG from '../config/proctoring.js';

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
});
