/**
 * AudioMonitor — Uses Web Audio API to detect background noise
 * and speech during an exam.
 *
 * Non-visual component (no UI). Runs local audio analysis only —
 * no audio is uploaded or streamed.
 *
 * LIMITATIONS:
 * - Browser microphone permission required
 * - Cannot distinguish between student speech and external noise reliably
 * - Multiple voice detection is not reliably possible in the browser
 * - This is a probabilistic detection — false positives are possible
 */
import { useEffect, useRef, useCallback } from 'react';
import PROCTORING_CONFIG from '../../../config/proctoring';

const createEventId = () => (
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

export default function AudioMonitor({ onViolation, isActive }) {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const lastEventTime = useRef({});
  const activeFramesRef = useRef(0);

  const throttle = useCallback((eventType) => {
    const now = Date.now();
    const cooldown = PROCTORING_CONFIG.cooldowns[eventType] || 15000;
    const lastTime = lastEventTime.current[eventType] || 0;
    if (now - lastTime < cooldown) return false;
    lastEventTime.current[eventType] = now;
    return true;
  }, []);

  const emit = useCallback(
    (eventType, confidence, metadata = {}) => {
      if (!isActive) return;
      if (!throttle(eventType)) return;
      onViolation({
        eventId: createEventId(),
        eventType,
        confidence,
        description: `${eventType} detected by audio monitor`,
        cameraSource: 'microphone',
        metadata: { ...metadata, cameraSource: 'microphone' },
      });
    },
    [isActive, onViolation, throttle],
  );

  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    const startAudioMonitoring = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        // Periodic audio analysis
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);

        intervalRef.current = setInterval(() => {
          if (cancelled || !isActive) return;

          analyser.getFloatTimeDomainData(dataArray);

          // Calculate RMS (root mean square) amplitude
          let sumSquares = 0;
          for (let i = 0; i < bufferLength; i++) {
            sumSquares += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sumSquares / bufferLength);

          const { NOISE_THRESHOLD, SPEECH_THRESHOLD } = PROCTORING_CONFIG.audio;

          // RMS alone only measures loudness. Require several active frames
          // and a speech-like zero-crossing rate before labeling activity speech.
          let zeroCrossings = 0;
          for (let i = 1; i < bufferLength; i += 1) {
            if ((dataArray[i - 1] < 0) !== (dataArray[i] < 0)) zeroCrossings += 1;
          }
          const zeroCrossingRate = zeroCrossings / bufferLength;
          const speechLike = rms >= SPEECH_THRESHOLD
            && zeroCrossingRate >= 0.02
            && zeroCrossingRate <= 0.35;

          if (speechLike) {
            activeFramesRef.current += 1;
          } else {
            activeFramesRef.current = 0;
          }

          if (activeFramesRef.current >= 2) {
            const confidence = Math.min(1.0, rms / 0.5);
            emit('SPEECH_DETECTED', confidence, {
              rms: rms.toFixed(4),
              zeroCrossingRate: zeroCrossingRate.toFixed(4),
              sustainedFrames: activeFramesRef.current,
              note: 'Probable speech activity; review with other evidence.',
            });
          } else if (rms >= NOISE_THRESHOLD) {
            const confidence = Math.min(1.0, rms / 0.3);
            emit('BACKGROUND_NOISE', confidence, {
              rms: rms.toFixed(4),
              note: 'Microphone volume activity; not proof of speech or cheating.',
            });
          }
        }, PROCTORING_CONFIG.audio.ANALYSIS_INTERVAL);

        console.log('[AudioMonitor] Audio monitoring started');
      } catch (err) {
        console.warn('[AudioMonitor] Could not access microphone:', err.message);
        // Don't crash — microphone access is optional
      }
    };

    startAudioMonitoring();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      activeFramesRef.current = 0;
      console.log('[AudioMonitor] Audio monitoring stopped');
    };
  }, [isActive, emit]);

  return null;
}
