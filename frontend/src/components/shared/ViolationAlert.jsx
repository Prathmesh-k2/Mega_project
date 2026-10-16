/**
 * ViolationAlert — Premium animated warning overlay for exam violations.
 *
 * Shows a visually prominent banner every time a cheating event is detected.
 * Includes: violation type icon, description, current score, auto-dismiss timer.
 * Shows a final TERMINATED modal when the exam ends forcibly.
 */
import React, { useEffect, useState, useCallback } from 'react';

// ── Violation metadata (icon, color, label) ───────────────────────────────────
const VIOLATION_META = {
  NO_FACE_DETECTED:     { icon: '👤', color: '#f59e0b', label: 'Face Not Detected' },
  MULTIPLE_FACES:       { icon: '👥', color: '#ef4444', label: 'Multiple People Detected' },
  CELL_PHONE_DETECTED:  { icon: '📱', color: '#ef4444', label: 'Phone Detected' },
  BOOK_DETECTED:        { icon: '📚', color: '#f59e0b', label: 'Prohibited Material' },
  PERSON_IN_BACKGROUND: { icon: '🧑', color: '#f59e0b', label: 'Person in Background' },
  TAB_SWITCH:           { icon: '🔀', color: '#8b5cf6', label: 'Tab Switch Detected' },
  WINDOW_BLUR:          { icon: '🔍', color: '#6366f1', label: 'Window Focus Lost' },
  FULLSCREEN_EXIT:      { icon: '🖥️', color: '#f59e0b', label: 'Exited Fullscreen' },
  COPY_PASTE:           { icon: '📋', color: '#8b5cf6', label: 'Copy/Paste Attempt' },
  KEYBOARD_SHORTCUT:    { icon: '⌨️', color: '#6366f1', label: 'Prohibited Shortcut' },
  SPEECH_DETECTED:      { icon: '🔊', color: '#f59e0b', label: 'Voice Detected' },
  BACKGROUND_NOISE:     { icon: '🔉', color: '#6366f1', label: 'Background Noise' },
  RIGHT_CLICK:          { icon: '🖱️', color: '#6366f1', label: 'Right Click Blocked' },
};

const DEFAULT_META = { icon: '⚠️', color: '#f59e0b', label: 'Violation Detected' };

// ── Individual alert banner ───────────────────────────────────────────────────
function AlertBanner({ alert, onDismiss }) {
  const [progress, setProgress] = useState(100);
  const meta = VIOLATION_META[alert.eventType] || DEFAULT_META;
  const AUTO_DISMISS = 5000;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onDismiss(alert.id);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [alert.id, onDismiss]);

  return (
    <div style={styles.banner}>
      {/* Left accent bar */}
      <div style={{ ...styles.accentBar, backgroundColor: meta.color }} />

      {/* Icon */}
      <div style={{ ...styles.iconWrap, backgroundColor: meta.color + '22' }}>
        <span style={styles.icon}>{meta.icon}</span>
      </div>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.header}>
          <span style={{ ...styles.label, color: meta.color }}>{meta.label}</span>
          <span style={styles.badge}>{alert.decisionStatus || 'WARNING'}</span>
        </div>
        <p style={styles.description}>{alert.description}</p>
        <div style={styles.footer}>
          <span style={styles.scoreText}>
            Risk Score: <strong style={{ color: alert.score > 50 ? '#ef4444' : '#f59e0b' }}>
              {Math.round(alert.score || 0)}
            </strong> / 70
          </span>
          {alert.fullscreenCount !== undefined && (
            <span style={{
              ...styles.fsCounter,
              color: alert.fullscreenCount >= 3 ? '#ef4444' : '#f59e0b'
            }}>
              Fullscreen exits: {alert.fullscreenCount}/3
            </span>
          )}
        </div>
      </div>

      {/* Dismiss button */}
      <button style={styles.closeBtn} onClick={() => onDismiss(alert.id)}>✕</button>

      {/* Progress bar */}
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressBar, width: `${progress}%`, backgroundColor: meta.color }} />
      </div>
    </div>
  );
}

// ── Termination Modal ─────────────────────────────────────────────────────────
function TerminationModal({ reason }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalIcon}>🚫</div>
        <h1 style={styles.modalTitle}>EXAM TERMINATED</h1>
        <p style={styles.modalReason}>{reason}</p>
        <p style={styles.modalSub}>
          Your session has been recorded and flagged for review. You will be redirected shortly.
        </p>
        <div style={styles.modalBar} />
      </div>
    </div>
  );
}

// ── Fullscreen Warning Banner ─────────────────────────────────────────────────
function FullscreenWarning({ count, secondsRemaining, onReturnFullscreen }) {
  if (!count || count <= 0) return null;
  return (
    <div style={styles.fsWarning}>
      <span style={styles.fsIcon}>🖥️</span>
      <div>
        <strong>Fullscreen Required!</strong>
        <br />
        <span style={{ fontSize: '0.8rem' }}>
          Fullscreen exit {count}/3. Return within{' '}
          <strong>{secondsRemaining}s</strong> to continue. Repeated exits may require review.
        </span>
      </div>
      <button type="button" style={styles.fsBtn} onClick={onReturnFullscreen}>
        Return to Fullscreen
      </button>
    </div>
  );
}

// ── Main ViolationAlert Component ─────────────────────────────────────────────
let alertIdCounter = 0;

export default function ViolationAlert({
  violation,           // latest violation object or null
  currentScore,        // numeric score
  isTerminated,        // boolean
  terminationReason,   // string
  fullscreenExitCount, // number
  fullscreenRecoverySeconds = 0,
  onReturnFullscreen,  // callback to re-enter fullscreen
}) {
  const [alerts, setAlerts] = useState([]);

  // Add new alert whenever a violation fires (keyed by timestamp so same type re-fires)
  useEffect(() => {
    if (!violation || !violation._ts) return;
    const id = ++alertIdCounter;
    const newAlert = {
      id,
      ...violation,
      score: currentScore,
      fullscreenCount: violation.eventType === 'FULLSCREEN_EXIT' ? fullscreenExitCount : undefined,
    };
    setAlerts((prev) => [newAlert, ...prev].slice(0, 4)); // max 4 stacked
  }, [violation?._ts]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <>
      {/* Stacked alert banners — top-right corner */}
      <div style={styles.alertStack}>
        {alerts.map((alert) => (
          <AlertBanner key={alert.id} alert={alert} onDismiss={dismiss} />
        ))}
      </div>

      {/* Fullscreen sticky warning */}
      {fullscreenExitCount > 0 && fullscreenRecoverySeconds > 0 && !document.fullscreenElement && (
        <FullscreenWarning
          count={fullscreenExitCount}
          secondsRemaining={fullscreenRecoverySeconds}
          onReturnFullscreen={onReturnFullscreen}
        />
      )}

      {/* Termination modal (blocks everything) */}
      {isTerminated && <TerminationModal reason={terminationReason} />}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  alertStack: {
    position: 'fixed',
    top: '80px',
    right: '20px',
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '380px',
    width: '100%',
    pointerEvents: 'none',
  },

  banner: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px',
    padding: '14px 16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    animation: 'slideInRight 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    pointerEvents: 'all',
    backdropFilter: 'blur(12px)',
  },

  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '4px',
    borderRadius: '12px 0 0 12px',
  },

  iconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  icon: {
    fontSize: '22px',
  },

  content: {
    flex: 1,
    minWidth: 0,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },

  label: {
    fontWeight: 700,
    fontSize: '0.85rem',
    letterSpacing: '0.3px',
  },

  badge: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '4px',
    letterSpacing: '0.8px',
  },

  description: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: '0.78rem',
    margin: '0 0 6px 0',
    lineHeight: '1.4',
  },

  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  scoreText: {
    fontSize: '0.72rem',
    color: 'rgba(255,255,255,0.55)',
  },

  fsCounter: {
    fontSize: '0.72rem',
    fontWeight: 600,
  },

  closeBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.2s',
  },

  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: 'rgba(255,255,255,0.08)',
  },

  progressBar: {
    height: '100%',
    transition: 'width 0.05s linear',
    borderRadius: '0 0 12px 12px',
  },

  // ── Fullscreen warning ─────────────────────────────────────────
  fsWarning: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99998,
    background: 'linear-gradient(90deg, #7c2d12, #b91c1c)',
    color: 'white',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    animation: 'slideDown 0.3s ease',
  },

  fsIcon: {
    fontSize: '24px',
  },

  fsBtn: {
    marginLeft: 'auto',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85rem',
    transition: 'background 0.2s',
  },

  // ── Termination modal ──────────────────────────────────────────
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
    animation: 'fadeIn 0.3s ease',
  },

  modal: {
    background: 'linear-gradient(145deg, #1a0a0a, #2d0a0a)',
    border: '2px solid #ef4444',
    borderRadius: '24px',
    padding: '48px 56px',
    textAlign: 'center',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 0 80px rgba(239, 68, 68, 0.3), 0 32px 64px rgba(0,0,0,0.6)',
    animation: 'scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  modalIcon: {
    fontSize: '72px',
    marginBottom: '16px',
    filter: 'drop-shadow(0 0 20px rgba(239,68,68,0.6))',
  },

  modalTitle: {
    color: '#ef4444',
    fontSize: '2rem',
    fontWeight: 900,
    letterSpacing: '3px',
    margin: '0 0 16px',
    textShadow: '0 0 30px rgba(239,68,68,0.5)',
  },

  modalReason: {
    color: '#fca5a5',
    fontSize: '1rem',
    marginBottom: '12px',
    lineHeight: '1.6',
  },

  modalSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '0.82rem',
    marginBottom: '24px',
  },

  modalBar: {
    height: '4px',
    background: 'linear-gradient(90deg, #ef4444, #dc2626)',
    borderRadius: '2px',
    animation: 'shrinkBar 3s linear forwards',
  },
};

// Inject keyframes once
if (typeof document !== 'undefined') {
  const styleId = 'violation-alert-keyframes';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(120%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes slideDown {
        from { transform: translateY(-100%); }
        to   { transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0.7); opacity: 0; }
        to   { transform: scale(1);   opacity: 1; }
      }
      @keyframes shrinkBar {
        from { width: 100%; }
        to   { width: 0%; }
      }
    `;
    document.head.appendChild(style);
  }
}
