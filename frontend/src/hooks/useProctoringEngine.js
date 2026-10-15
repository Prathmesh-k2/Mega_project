import { useCallback, useEffect, useRef, useState } from 'react';
import { PROCTORING as P } from '../config/proctoring';

const fsElement = () =>
  document.fullscreenElement || document.webkitFullscreenElement;

export default function useProctoringEngine({
  enabled = true,
  onTerminate,
  onLog,
}) {
  const [alert, setAlert] = useState(null);
  const [score, setScore] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);

  const scoreRef = useRef(0);
  const exitsRef = useRef(0);
  const armedRef = useRef(false);
  const terminatedRef = useRef(false);
  const lastFiredRef = useRef({});
  const onTerminateRef = useRef(onTerminate);
  const onLogRef = useRef(onLog);

  onTerminateRef.current = onTerminate;
  onLogRef.current = onLog;

  const terminate = useCallback((reason) => {
    if (terminatedRef.current) return;

    terminatedRef.current = true;

    setAlert({
      type: 'TERMINATED',
      reason,
      score: scoreRef.current,
    });

    onLogRef.current?.({
      eventType: 'EXAM_TERMINATED',
      reason,
      score: scoreRef.current,
      timestamp: new Date().toISOString(),
    });

    setTimeout(() => onTerminateRef.current?.(reason), 4000);
  }, []);

  const report = useCallback((eventType, extra = {}) => {
    if (terminatedRef.current) return;

    const now = Date.now();

    if (
      !extra.noCooldown &&
      now - (lastFiredRef.current[eventType] || 0) < P.COOLDOWN_MS
    ) {
      return;
    }

    lastFiredRef.current[eventType] = now;

    const points = P.WEIGHTS[eventType] ?? 5;

    scoreRef.current += points;
    setScore(scoreRef.current);

    onLogRef.current?.({
      eventType,
      points,
      totalScore: scoreRef.current,
      confidence: extra.confidence,
      source: extra.source,
      timestamp: new Date().toISOString(),
    });

    if (scoreRef.current >= P.TERMINATE_SCORE) {
      terminate(
        `Cheating score reached ${scoreRef.current}/${P.TERMINATE_SCORE}.`
      );
      return;
    }

    setAlert({
      type: eventType,
      points,
      score: scoreRef.current,
      description: extra.description,
      requireFullscreen: !!extra.requireFullscreen,
      fullscreenExits: extra.fullscreenExits,
    });
  }, [terminate]);

  // Call this in response to the user's Start Exam click.
  const enterFullscreen = useCallback(async () => {
    const el = document.documentElement;

    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }

      armedRef.current = true;
    } catch (e) {
      console.warn('[proctoring] fullscreen failed', e);
    }
  }, []);

  const dismissAlert = useCallback(() => {
    if (!terminatedRef.current) {
      setAlert(null);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const onFullscreenChange = () => {
      if (fsElement()) {
        armedRef.current = true;
        return;
      }

      if (!armedRef.current || terminatedRef.current) return;

      exitsRef.current += 1;
      const n = exitsRef.current;

      setFullscreenExits(n);

      if (n >= P.FULLSCREEN_MAX_EXITS) {
        report('FULLSCREEN_EXIT', {
          noCooldown: true,
          fullscreenExits: n,
        });

        terminate(`You left fullscreen ${n} times.`);
        return;
      }

      report('FULLSCREEN_EXIT', {
        noCooldown: true,
        requireFullscreen: true,
        fullscreenExits: n,
        description:
          `Warning ${n}/${P.FULLSCREEN_MAX_EXITS}: ` +
          'return to fullscreen or the exam will end.',
      });
    };

    const onVisibility = () => {
      if (document.hidden) report('TAB_SWITCH');
    };

    const onBlur = () => {
      if (!document.hidden) report('WINDOW_BLUR');
    };

    const onCopyPaste = (e) => {
      e.preventDefault();
      report('COPY_PASTE');
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopyPaste);
    document.addEventListener('paste', onCopyPaste);
    document.addEventListener('cut', onCopyPaste);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        onFullscreenChange
      );
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopyPaste);
      document.removeEventListener('paste', onCopyPaste);
      document.removeEventListener('cut', onCopyPaste);
    };
  }, [enabled, report, terminate]);

  return {
    alert,
    score,
    fullscreenExits,
    report,
    dismissAlert,
    enterFullscreen,
    terminate,
  };
}
