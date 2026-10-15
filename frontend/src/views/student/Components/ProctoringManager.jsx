/**
 * ProctoringManager — Orchestrates all proctoring monitors:
 *   - WebCam (TF.js COCO-SSD face/object detection on laptop camera)
 *   - BrowserMonitor (tab switch, fullscreen 3-strike, copy/paste)
 *   - AudioMonitor (background noise, speech)
 *   - ViolationAlert (premium warning popups + termination modal)
 *
 * Sends structured violation events to the backend API.
 * Enforces auto-termination on score threshold OR 3 fullscreen exits.
 */
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import {
  Shield as ShieldIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SafeIcon,
  Videocam as CameraIcon,
} from '@mui/icons-material';
import BrowserMonitor from './BrowserMonitor';
import AudioMonitor from './AudioMonitor';
import WebCam from './WebCam';
import ViolationAlert from '../../../components/shared/ViolationAlert';
import axiosInstance from '../../../axios';
import PROCTORING_CONFIG from '../../../config/proctoring';
import { toast } from 'react-toastify';
import { captureEvidence, isVisualEvidenceEvent } from '../../../services/evidenceCapture';

export default function ProctoringManager({
  sessionId,
  examId,
  webcamRef,
  mobileVideoRef,
  isActive,
  onTerminate,
  cheatingLog,
  updateCheatingLog,
  onFullscreenRecoveryChange,
}) {
  const [currentScore, setCurrentScore]           = useState(0);
  const [classification, setClassification]       = useState('SAFE');
  const [totalViolations, setTotalViolations]     = useState(0);
  const [isTerminated, setIsTerminated]           = useState(false);
  const [terminationReason, setTerminationReason] = useState('');
  const [violationCounts, setViolationCounts]     = useState({});
  const [latestViolation, setLatestViolation]     = useState(null);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [fullscreenRecoverySeconds, setFullscreenRecoverySeconds] = useState(0);
  const [cameraError, setCameraError] = useState('');

  const isTerminatedRef = useRef(false);  // ref for use inside closures
  const recoveryTimerRef = useRef(null);
  const recoveryDeadlineRef = useRef(0);
  const eventQueueRef = useRef([]);
  const flushingQueueRef = useRef(false);
  const outageNotifiedRef = useRef(false);
  const evidenceCooldownRef = useRef(new Map());

  const stopRecoveryTimer = useCallback(() => {
    if (recoveryTimerRef.current) {
      window.clearInterval(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
    recoveryDeadlineRef.current = 0;
    setFullscreenRecoverySeconds(0);
    onFullscreenRecoveryChange?.(false);
  }, [onFullscreenRecoveryChange]);

  // ── Utility: request fullscreen ──────────────────────────────────────
  const requestFullscreen = useCallback(() => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (_) {}
  }, []);

  // ── Core termination handler ─────────────────────────────────────────
  const terminate = useCallback((reason) => {
    if (isTerminatedRef.current) return;
    isTerminatedRef.current = true;
    setIsTerminated(true);
    setTerminationReason(reason);
    stopRecoveryTimer();
    // Exit fullscreen when terminated
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    // Delay navigation so the termination modal is visible
    setTimeout(() => {
      if (onTerminate) onTerminate(reason);
    }, 3200);
  }, [onTerminate, stopRecoveryTimer]);

  const flushEvents = useCallback(async () => {
    if (flushingQueueRef.current || !sessionId || !isActive || isTerminatedRef.current) return;
    flushingQueueRef.current = true;
    try {
      while (eventQueueRef.current.length > 0 && !isTerminatedRef.current) {
        const item = eventQueueRef.current[0];
        try {
          const response = await axiosInstance.post('/api/proctoring/events', item.payload, {
            withCredentials: true,
          });
          const data = response.data;
          const persistedViolation = data.violation;
          const source = item.payload.metadata?.cameraSource;
          const visualEvent = isVisualEvidenceEvent(item.payload.eventType);
          const evidenceAllowed = visualEvent || item.payload.eventType === 'BACKGROUND_NOISE';
          if (persistedViolation?._id && evidenceAllowed) {
            const lastCapture = evidenceCooldownRef.current.get(item.payload.eventType) || 0;
            if (Date.now() - lastCapture >= PROCTORING_CONFIG.EVIDENCE_COOLDOWN) {
              evidenceCooldownRef.current.set(item.payload.eventType, Date.now());
              try {
                const videoRef = source === 'mobile' ? mobileVideoRef : webcamRef;
                const blob = await captureEvidence(videoRef);
                const formData = new FormData();
                formData.append('evidence', blob, `${item.payload.eventId}.jpg`);
                formData.append('eventId', item.payload.eventId);
                formData.append('cameraSource', source || 'laptop');
                await axiosInstance.post('/api/proctoring/evidence/upload', formData, {
                  withCredentials: true,
                  headers: { 'Content-Type': 'multipart/form-data' },
                });
              } catch (evidenceError) {
                console.error('[Proctoring] Evidence capture/upload failed:', evidenceError);
                try {
                  await axiosInstance.patch('/api/proctoring/evidence/status', {
                    eventId: item.payload.eventId,
                    status: 'FAILED',
                    failureReason: evidenceError.message,
                  }, { withCredentials: true });
                } catch (statusError) {
                  console.error('[Proctoring] Evidence failure status could not be saved:', statusError);
                }
              }
            }
          }
          eventQueueRef.current.shift();
          outageNotifiedRef.current = false;
          const newScore = data.currentScore || 0;
          setCurrentScore(newScore);
          setClassification(data.classification || 'SAFE');
          setTotalViolations((prev) => prev + 1);
          setViolationCounts((prev) => ({
            ...prev,
            [item.violation.eventType]: (prev[item.violation.eventType] || 0) + 1,
          }));
          if (data.shouldTerminate) terminate(
            `Exam terminated: Malpractice threshold exceeded (score: ${Math.round(newScore)}/70).`,
          );
        } catch (error) {
          item.attempts += 1;
          if (item.attempts >= 3) eventQueueRef.current.shift();
          if (!outageNotifiedRef.current) {
            outageNotifiedRef.current = true;
            toast.error('Proctoring server unavailable. Monitoring continues and will retry.');
          }
          console.error('[Proctoring] Event save failed:', {
            eventId: item.payload.eventId,
            eventType: item.payload.eventType,
            status: error.response?.status,
          });
          break;
        }
      }
    } finally {
      flushingQueueRef.current = false;
    }
  }, [isActive, sessionId, terminate, mobileVideoRef, webcamRef]);

  const beginFullscreenRecovery = useCallback((count) => {
    if (isTerminatedRef.current || recoveryTimerRef.current) return;
    setFullscreenExitCount(count);
    recoveryDeadlineRef.current = Date.now() + PROCTORING_CONFIG.FULLSCREEN_RECOVERY_SECONDS * 1000;
    setFullscreenRecoverySeconds(PROCTORING_CONFIG.FULLSCREEN_RECOVERY_SECONDS);
    onFullscreenRecoveryChange?.(true);
    recoveryTimerRef.current = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((recoveryDeadlineRef.current - Date.now()) / 1000));
      setFullscreenRecoverySeconds(remaining);
      if (remaining === 0) {
        stopRecoveryTimer();
        terminate('Exam terminated: fullscreen was not restored within 10 seconds.');
      }
    }, 250);
  }, [onFullscreenRecoveryChange, stopRecoveryTimer, terminate]);

  const handleFullscreenRestored = useCallback(() => {
    if (recoveryTimerRef.current) {
      stopRecoveryTimer();
      void flushEvents();
    }
  }, [flushEvents, stopRecoveryTimer]);

  useEffect(() => () => {
    stopRecoveryTimer();
  }, [stopRecoveryTimer]);

  // ── Handle any violation from any monitor ────────────────────────────
  const handleViolation = useCallback(
    async (violation) => {
      if (!sessionId || !isActive || isTerminatedRef.current) return;

      // Update local fullscreen counter when BrowserMonitor fires FULLSCREEN_EXIT
      if (violation.eventType === 'FULLSCREEN_EXIT' && violation.metadata?.exitNumber) {
        setFullscreenExitCount(violation.metadata.exitNumber);
      }

      // Update latest violation for the ViolationAlert component
      setLatestViolation({ ...violation, _ts: Date.now() });

      const eventId = violation.eventId || `${sessionId}:${violation.eventType}:${violation._ts || Date.now()}`;
      if (eventQueueRef.current.some((item) => item.payload.eventId === eventId)) return;
      eventQueueRef.current.push({
        attempts: 0,
        violation,
        payload: {
          eventId,
          sessionId,
          eventType: violation.eventType,
          confidence: violation.confidence || 1.0,
          description: violation.description || '',
          metadata: {
            ...(violation.metadata || {}),
            cameraSource: violation.cameraSource || violation.metadata?.cameraSource || violation.metadata?.source,
            clientTimestamp: new Date().toISOString(),
          },
        },
      });
      if (eventQueueRef.current.length > 50) eventQueueRef.current.shift();
      void flushEvents();

      const typeMap = {
        NO_FACE_DETECTED: 'noFaceCount',
        MULTIPLE_FACES: 'multipleFaceCount',
        CELL_PHONE_DETECTED: 'cellPhoneCount',
        BOOK_DETECTED: 'prohibitedObjectCount',
        PERSON_IN_BACKGROUND: 'prohibitedObjectCount',
      };
      const logKey = typeMap[violation.eventType];
      if (logKey && updateCheatingLog) {
        updateCheatingLog({ ...cheatingLog, [logKey]: (cheatingLog[logKey] || 0) + 1, examId });
      }
    },
    [sessionId, isActive, cheatingLog, updateCheatingLog, examId, flushEvents],
  );

  // ── Listen for External Violations (Mobile Camera via custom DOM event) ──
  useEffect(() => {
    const handleExternalViolation = (e) => {
      if (e.detail && handleViolation) handleViolation(e.detail);
    };
    window.addEventListener('exam-violation', handleExternalViolation);
    return () => window.removeEventListener('exam-violation', handleExternalViolation);
  }, [handleViolation]);

  // ── Status helpers ────────────────────────────────────────────────────
  const getStatusColor = () => {
    if (isTerminated)            return 'error';
    if (classification === 'SAFE')    return 'success';
    if (classification === 'WARNING') return 'warning';
    return 'error';
  };

  const getStatusIcon = () => {
    if (classification === 'SAFE')    return <SafeIcon fontSize="small" />;
    if (classification === 'WARNING') return <WarningIcon fontSize="small" />;
    return <ErrorIcon fontSize="small" />;
  };

  // Fairness score: inverse of risk, clamped 0-100
  const fairnessScore = Math.max(0, 100 - Math.round(currentScore));

  return (
    <>
      {/* ── Invisible monitors ──────────────────────────────────── */}
      <BrowserMonitor
        onViolation={handleViolation}
        isActive={isActive && !isTerminated}
        onFullscreenExit={beginFullscreenRecovery}
        onFullscreenRestored={handleFullscreenRestored}
      />
      <AudioMonitor onViolation={handleViolation} isActive={isActive && !isTerminated} />

      {/* ── Violation popup alerts (top-right overlay) ──────────── */}
      <ViolationAlert
        violation={latestViolation}
        currentScore={currentScore}
        isTerminated={isTerminated}
        terminationReason={terminationReason}
        fullscreenExitCount={fullscreenExitCount}
        fullscreenRecoverySeconds={fullscreenRecoverySeconds}
        onReturnFullscreen={requestFullscreen}
      />

      {/* ── Laptop camera feed + AI ──────────────────────────────── */}
      <Box sx={{ width: '100%', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <CameraIcon sx={{ fontSize: '0.85rem', color: 'primary.main' }} />
          <Typography variant="caption" color="primary" fontWeight={700} fontSize="0.7rem">
            Laptop Camera
          </Typography>
        </Box>
        <WebCam
          webcamRef={webcamRef}
          onViolation={handleViolation}
          isActive={isActive && !isTerminated}
          onCameraReady={(stream) => {
            setCameraError('');
            if (process.env.NODE_ENV !== 'production') console.debug('[Proctoring] Camera initialized');
            stream?.getVideoTracks?.().forEach((track) => {
              track.onended = () => {
                const violation = {
                  eventType: 'NO_FACE_DETECTED',
                  confidence: 1,
                  description: 'Camera disconnected during the exam.',
                  metadata: { source: 'Laptop Webcam', reason: 'track-ended' },
                  _ts: Date.now(),
                };
                setCameraError('Camera disconnected. Reconnect it immediately to continue.');
                handleViolation(violation);
              };
            });
          }}
          onCameraError={(error) => {
            const message = error?.name === 'NotAllowedError'
              ? 'Camera permission was denied. Allow camera access to continue the exam.'
              : 'Camera could not be initialized. Please reconnect it and try again.';
            setCameraError(message);
            console.error('[Proctoring] Camera initialization failed:', error);
          }}
        />
        {cameraError && (
          <Typography variant="caption" color="error" role="alert">
            {cameraError}
          </Typography>
        )}

        {/* ── Status chips ────────────────────────────────────────── */}
        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1, gap: 0.5 }}>
          <Chip
            icon={<ShieldIcon />}
            label={`Integrity: ${fairnessScore}%`}
            color={getStatusColor()}
            size="small"
            sx={{ fontSize: '0.65rem' }}
          />
          <Chip
            icon={getStatusIcon()}
            label={classification}
            color={getStatusColor()}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.65rem' }}
          />
        </Stack>

        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5, gap: 0.5 }}>
          <Chip
            label={`Violations: ${totalViolations}`}
            color={totalViolations > 5 ? 'error' : totalViolations > 0 ? 'warning' : 'default'}
            size="small"
            sx={{ fontSize: '0.65rem' }}
          />
          <Chip
            icon={<WarningIcon />}
            label={`FS Exits: ${fullscreenExitCount}/${PROCTORING_CONFIG.FULLSCREEN_MAX_EXITS}`}
            color={fullscreenExitCount >= PROCTORING_CONFIG.FULLSCREEN_MAX_EXITS ? 'error' : fullscreenExitCount > 0 ? 'warning' : 'default'}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.65rem' }}
          />
        </Stack>

        {/* Violation type breakdown */}
        {totalViolations > 0 && (
          <Box sx={{ mt: 1, p: 1, border: '1px solid #ffcccc', borderRadius: 1, backgroundColor: '#fff5f5' }}>
            <Typography variant="caption" fontWeight="bold" color="error" display="block" mb={0.5}>
              Malpractice Log
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
              {Object.entries(violationCounts).map(([key, count]) =>
                count === 0 ? null : (
                  <Chip
                    key={key}
                    label={`${key.replace(/_/g, ' ')}: ${count}`}
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{ fontSize: '0.6rem', height: '20px' }}
                  />
                ),
              )}
            </Stack>
          </Box>
        )}
      </Box>
    </>
  );
}
