/**
 * BrowserMonitor — Detects tab switching, window blur, fullscreen exit,
 * copy/paste, and keyboard shortcuts during an exam.
 *
 * Non-visual component (no UI) — just attaches event listeners.
 */
import { useEffect, useRef, useCallback } from 'react';
import PROCTORING_CONFIG from '../../../config/proctoring';

export default function BrowserMonitor({ onViolation, isActive }) {
  const lastEventTime = useRef({});
  const fullscreenRequested = useRef(false);

  const throttle = useCallback(
    (eventType) => {
      const now = Date.now();
      const cooldown = PROCTORING_CONFIG.cooldowns[eventType] || 5000;
      const lastTime = lastEventTime.current[eventType] || 0;
      if (now - lastTime < cooldown) return false;
      lastEventTime.current[eventType] = now;
      return true;
    },
    [],
  );

  const emit = useCallback(
    (eventType, metadata = {}) => {
      if (!isActive) return;
      if (!throttle(eventType)) return;
      onViolation({
        eventType,
        confidence: 1.0,
        description: `${eventType} detected by browser monitor`,
        metadata,
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

    // ── Fullscreen Exit ────────────────────────────────────────────
    const handleFullscreenChange = () => {
      if (
        fullscreenRequested.current &&
        !document.fullscreenElement &&
        !document.webkitFullscreenElement
      ) {
        emit('FULLSCREEN_EXIT', { exitedAt: new Date().toISOString() });
      }
    };

    // ── Copy / Paste / Cut ─────────────────────────────────────────
    const handleCopy = (e) => {
      e.preventDefault();
      emit('COPY_PASTE', { action: 'copy' });
    };
    const handlePaste = (e) => {
      e.preventDefault();
      emit('COPY_PASTE', { action: 'paste' });
    };
    const handleCut = (e) => {
      e.preventDefault();
      emit('COPY_PASTE', { action: 'cut' });
    };

    // ── Context Menu (Right Click) ─────────────────────────────────
    const handleContextMenu = (e) => {
      e.preventDefault();
      emit('RIGHT_CLICK');
    };

    // ── Keyboard Shortcuts ─────────────────────────────────────────
    const handleKeyDown = (e) => {
      // Detect suspicious shortcuts
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (['c', 'v', 'x', 'tab', 'p', 'a', 'f', 'u'].includes(key)) {
          e.preventDefault();
          emit('KEYBOARD_SHORTCUT', {
            key: `${e.ctrlKey ? 'Ctrl' : 'Cmd'}+${e.key}`,
          });
        }
      }
      // Alt key combos
      if (e.altKey && e.key === 'Tab') {
        // Note: Alt+Tab usually isn't reliably caught, but we try
        emit('KEYBOARD_SHORTCUT', { key: 'Alt+Tab' });
      }
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        emit('KEYBOARD_SHORTCUT', { key: 'F12' });
      }
    };

    // ── Request Fullscreen ─────────────────────────────────────────
    const requestFullscreen = () => {
      try {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          el.requestFullscreen().then(() => {
            fullscreenRequested.current = true;
          }).catch(() => {});
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
          fullscreenRequested.current = true;
        }
      } catch (err) {
        console.warn('Fullscreen request failed:', err);
      }
    };

    // Attach listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Request fullscreen on mount
    requestFullscreen();

    // Cleanup
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

      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      fullscreenRequested.current = false;
    };
  }, [isActive, emit]);

  // No UI — this is a headless monitoring component
  return null;
}
