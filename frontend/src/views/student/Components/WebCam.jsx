import React, { useRef } from 'react';
import Webcam from 'react-webcam';
import { Box, Card } from '@mui/material';
import useCheatDetection from '../../../hooks/useCheatDetection';

export default function WebCam({ webcamRef, onViolation }) {
  const internalWebcamRef = useRef(null);
  const actualWebcamRef = webcamRef || internalWebcamRef;

  // Initialize unified 1 FPS background AI cheating detection
  useCheatDetection(actualWebcamRef, onViolation, true, 'Laptop Webcam');

  return (
    <Box>
      <Card variant="outlined" sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <Webcam
          ref={actualWebcamRef}
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
          }}
        />
      </Card>
    </Box>
  );
}
