import React, { useRef, useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';
import Webcam from 'react-webcam';
import { drawRect } from './utilities';
import { Box, Card } from '@mui/material';

export default function WebCam({ onViolation, webcamRef }) {
  const internalWebcamRef = useRef(null);
  const actualWebcamRef = webcamRef || internalWebcamRef;
  const canvasRef = useRef(null);
  const [lastDetectionTime, setLastDetectionTime] = useState({});
  const handleDetection = async (type) => {
    const now = Date.now();
    const lastTime = lastDetectionTime[type] || 0;

    // Throttle events to avoid spamming
    if (now - lastTime >= 3000) {
      setLastDetectionTime((prev) => ({ ...prev, [type]: now }));
      
      const mappedType = type === 'noFace' ? 'NO_FACE_DETECTED' :
                         type === 'multipleFace' ? 'MULTIPLE_FACES' :
                         type === 'cellPhone' ? 'CELL_PHONE_DETECTED' :
                         type === 'prohibitedObject' ? 'PROHIBITED_OBJECT' : type;

      if (onViolation) {
        onViolation({
          eventType: mappedType,
          confidence: 1.0,
          description: `${mappedType} detected by AI`,
        });
      }
    }
  };

  const runCoco = async () => {
    try {
      const net = await cocossd.load();
      console.log('AI model loaded.');
      setInterval(() => detect(net), 1000);
    } catch (error) {
      console.error('Error loading model:', error);
    }
  };

  const detect = async (net) => {
    if (actualWebcamRef.current && actualWebcamRef.current.video && actualWebcamRef.current.video.readyState === 4) {
      const video = actualWebcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      actualWebcamRef.current.video.width = videoWidth;
      actualWebcamRef.current.video.height = videoHeight;
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      try {
        const obj = await net.detect(video);
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        drawRect(obj, ctx);

        let person_count = 0;
        let faceDetected = false;

        obj.forEach((element) => {
          const detectedClass = element.class;
          console.log('Detected:', detectedClass);

          if (detectedClass === 'cell phone') handleDetection('cellPhone');
          if (detectedClass === 'book' || detectedClass === 'laptop')
            handleDetection('prohibitedObject');
          if (detectedClass === 'person') {
            faceDetected = true;
            person_count++;
            if (person_count > 1) handleDetection('multipleFace');
          }
        });

        if (!faceDetected) handleDetection('noFace');
      } catch (error) {
        console.error('Error during detection:', error);
      }
    }
  };

  useEffect(() => {
    runCoco();
  }, []);

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
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 10,
          }}
        />
      </Card>
    </Box>
  );
}
