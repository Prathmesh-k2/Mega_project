/**
 * WebCam — Laptop webcam component with TF.js COCO-SSD cheating detection.
 * Uses browser-native AI (no Python server needed).
 */
import React, { useRef } from 'react';
import Webcam from 'react-webcam';
import { Box, Card } from '@mui/material';
import useTFJSDetection from '../../../hooks/useTFJSDetection';

export default function WebCam({ webcamRef, onViolation, isActive = true, onCameraError, onCameraReady }) {
  const internalWebcamRef = useRef(null);
  const actualWebcamRef = webcamRef || internalWebcamRef;

  // TF.js COCO-SSD detection on laptop camera feed
  useTFJSDetection(actualWebcamRef, onViolation, isActive, 'Laptop Webcam');

  return (
    <Box>
      <Card
        variant="outlined"
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: '8px',
          border: isActive ? '2px solid #4caf50' : '2px solid #666',
        }}
      >
        <Webcam
          ref={actualWebcamRef}
          onUserMedia={onCameraReady}
          onUserMediaError={onCameraError}
          audio={false}
          muted
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: 'user',
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
        {/* Live indicator */}
        {isActive && (
          <Box
            sx={{
              position: 'absolute',
              top: 6,
              left: 6,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(0,0,0,0.6)',
              borderRadius: '4px',
              px: 0.8,
              py: 0.3,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#ef4444',
                animation: 'pulse 1.5s ease infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.3 },
                },
              }}
            />
            <Box component="span" sx={{ fontSize: '0.6rem', color: 'white', fontWeight: 700, letterSpacing: 1 }}>
              LIVE
            </Box>
          </Box>
        )}
      </Card>
    </Box>
  );
}
