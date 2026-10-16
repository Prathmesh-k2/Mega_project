// ─── Scoring Engine ─────────────────────────────────────────────────────────
// Calculates event-based penalty score, AI behavior score, and hybrid fusion.
// Classifies sessions as SAFE / WARNING / MALPRACTICE.

import PROCTORING_CONFIG from "../config/proctoring.js";
import { isConfirmedViolation } from "./ProctoringPolicy.js";

/**
 * Calculate total penalty from an array of violation events.
 * Returns a value 0–100 (clamped).
 */
export function calculateEventScore(violations) {
  if (!violations || violations.length === 0) return 0;

  let totalPenalty = 0;
  for (const v of violations.filter(isConfirmedViolation)) {
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
  const timestamps = violations
    .map((v) => new Date(v.timestamp).getTime())
    .filter(Number.isFinite);
  if (timestamps.length >= 2) {
    const durationMs = Math.max(...timestamps) - Math.min(...timestamps);
    const durationMin = Math.max(durationMs / 60000, 1);
    const vpm = violations.length / durationMin;
    // 0-2 vpm = low, 5+ vpm = high
    frequencyScore = Math.min(100, (vpm / 5) * 100);
  } else {
    frequencyScore = Math.min(100, violations.length * 15);
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

export function deduplicateEvents(events = []) {
  const seen = new Set();
  return events.filter((event) => {
    const key = event.eventId || event._id?.toString();
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function classifyStatus(hybridScore, violations = []) {
  const { SAFE_MAX, WARNING_MAX, ADMIN_REVIEW_MAX } = PROCTORING_CONFIG.decision;

  let status, threshold, reason;

  // Build specific reason for violations
  const types = {};
  let fullscreenExitCount = 0;
  for (const v of violations.filter(isConfirmedViolation)) {
    types[v.eventType] = (types[v.eventType] || 0) + 1;
    if (v.eventType === 'FULLSCREEN_EXIT') fullscreenExitCount++;
  }
  const topTypes = Object.entries(types)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => `${type}(${count})`)
    .join(", ");

  const generatedReason = `Activities detected: ${topTypes}`;

  // Rule: At three full-screen exits, explicitly overwrite score -> 60 and policy -> ELIMINATION
  if (fullscreenExitCount >= 3) {
      status = "MALPRACTICE"; 
      threshold = 60;
      reason = "Explicit Exam Policy Violation: Exited Fullscreen 3+ Times";
  } else if (hybridScore <= SAFE_MAX) {
    status = "SAFE";
    threshold = SAFE_MAX;
    reason = "No significant suspicious activities detected";
  } else if (hybridScore <= WARNING_MAX) {
    status = "WARNING";
    threshold = WARNING_MAX;
    reason = `Repeated suspicious activities detected: ${topTypes}`;
  } else if (hybridScore <= ADMIN_REVIEW_MAX) {
    status = "ADMIN_REVIEW";
    threshold = ADMIN_REVIEW_MAX;
    reason = `Admin Review Required: ${generatedReason}`;
  } else {
    status = "MALPRACTICE";
    threshold = 60;
    reason = "Severe and/or repeated cheating behaviors detected";
  }

  return {
    status,
    score: (fullscreenExitCount >= 3) ? Math.max(60, hybridScore) : hybridScore,
    threshold,
    reason,
  };
}

/**
 * Full scoring pipeline: takes violations array, returns complete scoring result.
 */
export function calculateFullScore(violations) {
  const uniqueEvents = deduplicateEvents(violations);
  const confirmedViolations = uniqueEvents.filter(isConfirmedViolation);
  const eventScore = calculateEventScore(confirmedViolations);
  const aiScore = calculateAIBehaviorScore(confirmedViolations);
  const hybridScore = calculateHybridScore(eventScore, aiScore);
  const decision = classifyStatus(hybridScore, uniqueEvents);

  return {
    eventScore,
    aiScore,
    hybridScore: decision.score,
    fairnessScore: calculateFairnessScore(decision.score),
    totalViolations: confirmedViolations.length,
    totalPenalties: confirmedViolations.reduce(
      (sum, v) => sum + (v.penaltyPoints || 0),
      0
    ),
    classification: decision.status,
    decisionReason: decision.reason,
    decision,
  };
}
