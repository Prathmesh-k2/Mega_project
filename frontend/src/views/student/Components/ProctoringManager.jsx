/**
 * ProctoringManager — Orchestrates all proctoring monitors:
 *   - WebCam (COCO-SSD face/object detection) — existing component
 *   - BrowserMonitor (tab switch, fullscreen, copy/paste)
 *   - AudioMonitor (background noise, speech)
 *
 * Sends structured violation events to the backend API.
 * Checks for auto-termination.
 */
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Box, Chip, Stack, Typography, Alert } from '@mui/material';
import {
  Shield as ShieldIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SafeIcon,
} from '@mui/icons-material';
import BrowserMonitor from './BrowserMonitor';
import AudioMonitor from './AudioMonitor';
import WebCam from './WebCam';
import axiosInstance from '../../../axios';
import PROCTORING_CONFIG from '../../../config/proctoring';
import { UploadClient } from '@uploadcare/upload-client';

const uploadClient = new UploadClient({ publicKey: 'e69ab6e5db6d4a41760b' });

export default function ProctoringManager({
  sessionId,
  examId,
  webcamRef,
  isActive,
  onTerminate,
  cheatingLog,
  updateCheatingLog,
}) {
  const [currentScore, setCurrentScore] = useState(0);
  const [classification, setClassification] = useState('SAFE');
  const [totalViolations, setTotalViolations] = useState(0);
  const [isTerminated, setIsTerminated] = useState(false);
  const evidenceCooldown = useRef({});

  // ── Handle any violation from any monitor ─────────────────────────
  const handleViolation = useCallback(
    async (violation) => {
      if (!sessionId || !isActive || isTerminated) return;

      try {
        // Send to backend
        const response = await axiosInstance.post(
          '/api/proctoring/events',
          {
            sessionId,
            eventType: violation.eventType,
            confidence: violation.confidence || 1.0,
            description: violation.description || '',
            metadata: violation.metadata || {},
          },
          { withCredentials: true },
        );

        const data = response.data;

        if (data.success) {
          setCurrentScore(data.currentScore || 0);
          setClassification(data.classification || 'SAFE');
          setTotalViolations((prev) => prev + 1);

          // Update legacy cheating log context for backward compatibility
          const typeMap = {
            NO_FACE_DETECTED: 'noFaceCount',
            MULTIPLE_FACES: 'multipleFaceCount',
            CELL_PHONE_DETECTED: 'cellPhoneCount',
            BOOK_DETECTED: 'prohibitedObjectCount',
            LAPTOP_DETECTED: 'prohibitedObjectCount',
            PROHIBITED_OBJECT: 'prohibitedObjectCount',
          };
          const logKey = typeMap[violation.eventType];
          if (logKey && updateCheatingLog) {
            updateCheatingLog({
              ...cheatingLog,
              [logKey]: (cheatingLog[logKey] || 0) + 1,
              examId,
            });
          }

          // Capture evidence for high-severity events
          if (
            ['MULTIPLE_FACES', 'CELL_PHONE_DETECTED', 'NO_FACE_DETECTED'].includes(
              violation.eventType,
            )
          ) {
            captureEvidence(violation.eventType);
          }

          // Check auto-termination
          if (data.shouldTerminate) {
            setIsTerminated(true);
            if (onTerminate) {
              onTerminate('Exam terminated: Malpractice threshold exceeded');
            }
          }
        }
      } catch (error) {
        console.error('[ProctoringManager] Failed to log violation:', error.message);
      }
    },
    [sessionId, isActive, isTerminated, onTerminate, cheatingLog, updateCheatingLog, examId],
  );

  // ── Evidence Capture ──────────────────────────────────────────────
  const captureEvidence = useCallback(
    async (eventType) => {
      const now = Date.now();
      const lastCapture = evidenceCooldown.current[eventType] || 0;
      if (now - lastCapture < PROCTORING_CONFIG.EVIDENCE_COOLDOWN) return;
      evidenceCooldown.current[eventType] = now;

      const video = webcamRef?.current?.video;
      if (!video || video.readyState !== 4 || video.videoWidth === 0) return;

      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

        // Convert to file
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        const file = new File([u8arr], `evidence_${eventType}_${Date.now()}.jpg`, { type: mime });

        const result = await uploadClient.uploadFile(file);

        // Log evidence to backend
        await axiosInstance.post(
          '/api/proctoring/evidence',
          {
            sessionId,
            eventType,
            evidenceUrl: result.cdnUrl,
            examId,
            confidence: 1.0,
          },
          { withCredentials: true },
        );
      } catch (err) {
        console.warn('[ProctoringManager] Evidence capture failed:', err.message);
      }
    },
    [sessionId, webcamRef, examId],
  );

  // Status color/icon
  const getStatusColor = () => {
    if (classification === 'SAFE') return 'success';
    if (classification === 'WARNING') return 'warning';
    return 'error';
  };

  const getStatusIcon = () => {
    if (classification === 'SAFE') return <SafeIcon fontSize="small" />;
    if (classification === 'WARNING') return <WarningIcon fontSize="small" />;
    return <ErrorIcon fontSize="small" />;
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {/* WebCam & Invisible monitors */}
      <WebCam webcamRef={webcamRef} onViolation={handleViolation} />
      <BrowserMonitor onViolation={handleViolation} isActive={isActive && !isTerminated} />
      <AudioMonitor onViolation={handleViolation} isActive={isActive && !isTerminated} />

      {/* Status display */}
      <Box sx={{ p: 1 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
          <Chip
            icon={<ShieldIcon />}
            label={`Fairness: ${Math.max(0, 100 - currentScore)}`}
            color={getStatusColor()}
            size="small"
          />
          <Chip
            icon={getStatusIcon()}
            label={classification}
            color={getStatusColor()}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`Violations: ${totalViolations}`}
            color={totalViolations > 5 ? 'error' : totalViolations > 0 ? 'warning' : 'default'}
            size="small"
          />
        </Stack>

        {isTerminated && (
          <Alert severity="error" sx={{ mt: 1 }}>
            <strong>Exam Terminated</strong> — Your exam has been automatically ended due to
            excessive violations.
          </Alert>
        )}
      </Box>
    </Box>
  );
}
