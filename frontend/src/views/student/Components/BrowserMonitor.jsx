/**
 * BrowserMonitor — Detects tab switching, window blur, fullscreen exit (3-strike),
 * copy/paste, right-click and keyboard shortcuts during an exam.
 *
 * Non-visual component (no UI) — just attaches event listeners.
 *
 * FULLSCREEN 3-STRIKE RULE:
 *   Each exit increments an internal counter.
 *   At 3 exits → emits FULLSCREEN_LIMIT_REACHED which triggers exam termination.
 */
import { useEffect, useRef, useCallback } from 'react';
import PROCTORING_CONFIG from '../../../config/proctoring';

const MAX_FULLSCREEN_EXITS = PROCTORING_CONFIG.FULLSCREEN_MAX_EXITS || 3;
const createEventId = () => (
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

export default function BrowserMonitor({
  onViolation,
  isActive,
  onFullscreenExit,
  onFullscreenRestored,
}) {
  const lastEventTime = useRef({});
  const fullscreenExitCount = useRef(0);

  const throttle = useCallback((eventType) => {
    const now = Date.now();
    const cooldown = PROCTORING_CONFIG.cooldowns[eventType] || 5000;
    const lastTime = lastEventTime.current[eventType] || 0;
    if (now - lastTime < cooldown) return false;
    lastEventTime.current[eventType] = now;
    return true;
  }, []);

  const emit = useCallback(
    (eventType, metadata = {}) => {
      if (!isActive) return;
      if (!throttle(eventType)) return;
      onViolation({
        eventId: createEventId(),
        eventType,
        confidence: 1.0,
        description: getDescription(eventType, metadata),
        cameraSource: 'browser',
        metadata: { ...metadata, cameraSource: 'browser' },
      });
    },
    [isActive, onViolation, throttle],
  );

  useEffect(() => {
    if (!isActive) return;

    // ── Tab Switching ──────────────────────────────────────────────
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        emit('TAB_SWITCH', { hiddenAt: new Date().toISOString() });
      }
    };

    // ── Window Blur ────────────────────────────────────────────────
    const handleBlur = () => {
      emit('WINDOW_BLUR', { blurredAt: new Date().toISOString() });
    };

    // ── Fullscreen Exit (3-strike) ─────────────────────────────────
    const handleFullscreenChange = () => {
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFullscreen && isActive) {
        fullscreenExitCount.current += 1;
        const count = fullscreenExitCount.current;

        emit('FULLSCREEN_EXIT', {
          exitedAt: new Date().toISOString(),
          exitNumber: count,
          maxAllowed: MAX_FULLSCREEN_EXITS,
        });

        onFullscreenExit?.(count);
      } else if (isFullscreen) {
        onFullscreenRestored?.();
      }
    };

    // ── Copy / Paste / Cut ─────────────────────────────────────────
    const handleCopy = (e) => { e.preventDefault(); emit('COPY_PASTE', { action: 'copy' }); };
    const handlePaste = (e) => { e.preventDefault(); emit('COPY_PASTE', { action: 'paste' }); };
    const handleCut = (e) => { e.preventDefault(); emit('COPY_PASTE', { action: 'cut' }); };

    // ── Context Menu (Right Click) ─────────────────────────────────
    const handleContextMenu = (e) => {
      e.preventDefault();
      emit('RIGHT_CLICK');
    };

    // ── Keyboard Shortcuts ─────────────────────────────────────────
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (['c', 'v', 'x', 'tab', 'p', 'a', 'f', 'u'].includes(key)) {
          e.preventDefault();
          emit('KEYBOARD_SHORTCUT', { key: `${e.ctrlKey ? 'Ctrl' : 'Cmd'}+${e.key}` });
        }
      }
      if (e.altKey && e.key === 'Tab') {
        emit('KEYBOARD_SHORTCUT', { key: 'Alt+Tab' });
      }
      if (e.key === 'F12') {
        e.preventDefault();
        emit('KEYBOARD_SHORTCUT', { key: 'F12' });
      }
      // Escape key tries to exit fullscreen — re-enter immediately
      if (e.key === 'Escape') {
        e.preventDefault();
      }
    };

    // Attach all listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isActive, emit, onFullscreenExit, onFullscreenRestored]);

  return null;
}

function getDescription(eventType, metadata) {
  switch (eventType) {
    case 'TAB_SWITCH':        return 'You switched to another tab. This has been recorded.';
    case 'WINDOW_BLUR':       return 'Exam window lost focus. Stay on the exam page.';
    case 'FULLSCREEN_EXIT':   return `Fullscreen exit #${metadata.exitNumber}/${metadata.maxAllowed}. Return immediately!`;
    case 'COPY_PASTE':        return `${metadata.action || 'Copy/Paste'} is not allowed during the exam.`;
    case 'RIGHT_CLICK':       return 'Right-clicking is disabled during the exam.';
    case 'KEYBOARD_SHORTCUT': return `Prohibited keyboard shortcut detected: ${metadata.key}`;
    default:                  return `${eventType} detected during exam.`;
  }
}
