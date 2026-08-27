// ─── Scoring Engine ─────────────────────────────────────────────────────────
// Calculates event-based penalty score, AI behavior score, and hybrid fusion.
// Classifies sessions as SAFE / WARNING / MALPRACTICE.

import PROCTORING_CONFIG from "../config/proctoring.js";

/**
 * Calculate total penalty from an array of violation events.
 * Returns a value 0–100 (clamped).
 */
export function calculateEventScore(violations) {
  if (!violations || violations.length === 0) return 0;

  let totalPenalty = 0;
  for (const v of violations) {
    totalPenalty += v.penaltyPoints || 0;
  }
  // Clamp to 0–100
  return Math.min(100, Math.max(0, totalPenalty));
}

/**
 * Calculate AI Behavior Score (rule/feature-based).
 * Analyzes patterns across violations rather than summing raw penalties.
 * Returns 0–100 where higher = more suspicious.
 *
 * This is designed so a GRU/temporal model can replace it later.
 */
export function calculateAIBehaviorScore(violations) {
  if (!violations || violations.length === 0) return 0;

  const weights = PROCTORING_CONFIG.aiBehavior;

  // ── Feature 1: Frequency (violations per minute) ──────────────────
  let frequencyScore = 0;
  if (violations.length >= 2) {
    const timestamps = violations.map((v) => new Date(v.timestamp).getTime());
    const durationMs = Math.max(timestamps) - Math.min(timestamps);
    const durationMin = Math.max(durationMs / 60000, 1);
    const vpm = violations.length / durationMin;
    // 0-2 vpm = low, 5+ vpm = high
    frequencyScore = Math.min(100, (vpm / 5) * 100);
  } else {
    frequencyScore = violations.length * 15;
  }

  // ── Feature 2: Severity distribution ──────────────────────────────
  const severityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const v of violations) {
    severityCounts[v.severity] = (severityCounts[v.severity] || 0) + 1;
  }
  const severityScore = Math.min(
    100,
    severityCounts.LOW * 5 +
      severityCounts.MEDIUM * 15 +
      severityCounts.HIGH * 30 +
      severityCounts.CRITICAL * 50
  );

  // ── Feature 3: Average confidence ─────────────────────────────────
  const avgConfidence =
    violations.reduce((sum, v) => sum + (v.confidence || 0.5), 0) /
    violations.length;
  const confidenceScore = avgConfidence * 100;

  // ── Feature 4: Event diversity (how many different event types) ────
  const uniqueTypes = new Set(violations.map((v) => v.eventType));
  // More diverse = more suspicious (indicates systematic cheating)
  const diversityScore = Math.min(100, (uniqueTypes.size / 5) * 100);

  // ── Feature 5: Repetition (repeated violations of same type) ──────
  const typeCounts = {};
  for (const v of violations) {
    typeCounts[v.eventType] = (typeCounts[v.eventType] || 0) + 1;
  }
  const maxRepeat = Math.max(...Object.values(typeCounts));
  const repetitionScore = Math.min(100, (maxRepeat / 3) * 100);

  // ── Weighted combination ──────────────────────────────────────────
  const score =
    frequencyScore * weights.frequencyWeight +
    severityScore * weights.severityWeight +
    confidenceScore * weights.confidenceWeight +
    diversityScore * weights.diversityWeight +
    repetitionScore * weights.repetitionWeight;

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Hybrid Score Fusion: combines event score and AI behavior score.
 * Returns 0–100.
 */
export function calculateHybridScore(eventScore, aiScore) {
  const { eventWeight, aiWeight } = PROCTORING_CONFIG.scoring;
  const hybrid = eventScore * eventWeight + aiScore * aiWeight;
  return Math.min(100, Math.max(0, Math.round(hybrid)));
}

/**
 * Calculate fairness score: inverse of hybrid cheating score.
 * Returns 0–100 where 100 = completely fair.
 */
export function calculateFairnessScore(hybridScore) {
  return Math.max(0, 100 - hybridScore);
}

/**
 * Decision Engine: classify session based on hybrid score.
 * Returns { status, score, threshold, reason }.
 */
export function classifyStatus(hybridScore, violations = []) {
  const { SAFE_MAX, WARNING_MAX } = PROCTORING_CONFIG.decision;

  let status, threshold, reason;

  if (hybridScore <= SAFE_MAX) {
    status = "SAFE";
    threshold = SAFE_MAX;
    reason = "No significant suspicious activities detected";
  } else if (hybridScore <= WARNING_MAX) {
    status = "WARNING";
    threshold = WARNING_MAX;

    // Build specific reason
    const types = {};
    for (const v of violations) {
      types[v.eventType] = (types[v.eventType] || 0) + 1;
    }
    const topTypes = Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, count]) => `${type}(${count})`)
      .join(", ");
    reason = `Repeated suspicious activities detected: ${topTypes}`;
  } else {
    status = "MALPRACTICE";
    threshold = 70;
    reason = "Severe and/or repeated cheating behaviors detected";
  }

  return {
    status,
    score: hybridScore,
    threshold,
    reason,
  };
}

/**
 * Full scoring pipeline: takes violations array, returns complete scoring result.
 */
export function calculateFullScore(violations) {
  const eventScore = calculateEventScore(violations);
  const aiScore = calculateAIBehaviorScore(violations);
  const hybridScore = calculateHybridScore(eventScore, aiScore);
  const fairnessScore = calculateFairnessScore(hybridScore);
  const decision = classifyStatus(hybridScore, violations);

  return {
    eventScore,
    aiScore,
    hybridScore,
    fairnessScore,
    totalPenalties: violations.reduce(
      (sum, v) => sum + (v.penaltyPoints || 0),
      0
    ),
    classification: decision.status,
    decisionReason: decision.reason,
    decision,
  };
}
