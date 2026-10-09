import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { toast } from 'react-toastify';

/**
 * A highly optimized generic React Hook to perform COCO-SSD object detection
 * continuously at 1 Frame Per Second (1 FPS) on ANY video feed.
 * 
 * @param {React.MutableRefObject} videoRef - Ref to the `<video>` element
 * @param {function} onViolation - Callback to trigger when a violation occurs
 * @param {boolean} isActive - Enables or disables the scanning loop to save battery
 * @param {string} sourceName - Identifier for logging (e.g. 'Laptop Camera', 'Mobile Camera')
 */
export default function useCheatDetection(videoRef, onViolation, isActive = true, sourceName = 'Camera') {
  const [model, setModel] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const loadingRef = useRef(false);
  const cooldownsRef = useRef({});
  
  useEffect(() => {
    async function loadModel() {
      if (loadingRef.current) return;
      loadingRef.current = true;
      try {
        console.log(`[${sourceName}] Loading TensorFlow COCO-SSD Model...`);
        // We explicitly set backend to webgl for fast hardware acceleration
        await tf.setBackend('webgl');
        await tf.ready();
        
        const loadedModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        setModel(loadedModel);
        setIsLoaded(true);
        console.log(`[${sourceName}] TensorFlow AI Model Ready.`);
        
        // Debug Toast
        toast.success(`AI Proctoring Active for ${sourceName}`, { autoClose: 2000, position: 'bottom-right' });
      } catch (err) {
        console.error(`[${sourceName}] Failed to load TensorFlow. Retrying without webgl...`, err);
        // Fallback gracefully instead of failing entirely
        try {
          await tf.setBackend('cpu');
          await tf.ready();
          const loadedModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
          setModel(loadedModel);
          setIsLoaded(true);
          console.log(`[${sourceName}] TensorFlow AI Model Ready (CPU Fallback).`);
          toast.success(`AI Proctoring Active for ${sourceName} (CPU)`, { autoClose: 2000, position: 'bottom-right' });
        } catch (fbErr) {
          console.error(`[${sourceName}] Complete failure loading TensorFlow:`, fbErr);
          toast.error(`Fatal AI Error on ${sourceName}: ${fbErr.message}`);
        }
      } finally {
        loadingRef.current = false;
      }
    }

    if (!model && !loadingRef.current) {
      loadModel();
    }
  }, [model, sourceName]);

  useEffect(() => {
    let intervalId;

    async function scanFrame() {
      if (!isActive || !model || !videoRef.current) return;
      
      const video = videoRef.current.video || videoRef.current;
      
      // Ensure video is playable and actually rendering frames
      if (video.readyState !== 4 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      try {
        const predictions = await model.detect(video);
        
        let personCount = 0;
        let cellPhoneDetected = false;
        
        for (const p of predictions) {
            if (p.class === 'person') personCount++;
            if (p.class === 'cell phone') cellPhoneDetected = true;
        }

        const now = Date.now();
        const COOLDOWN_MS = 5000; // 5 seconds cooldown per event type
        
        const triggerViolationWithCooldown = (eventType, confidence, description) => {
            const lastTime = cooldownsRef.current[eventType] || 0;
            if (now - lastTime > COOLDOWN_MS) {
                cooldownsRef.current[eventType] = now;
                onViolation({
                    eventType,
                    confidence,
                    description,
                    metadata: { source: sourceName }
                });
            }
        };

        // Send Violations based on thresholds
        if (cellPhoneDetected) {
            triggerViolationWithCooldown('CELL_PHONE_DETECTED', 0.95, `Cell phone spotted by ${sourceName} feed.`);
        }

        if (personCount === 0) {
            triggerViolationWithCooldown('NO_FACE_DETECTED', 0.85, `Student absent or out of frame on ${sourceName} feed.`);
        }

        if (personCount > 1) {
            triggerViolationWithCooldown('MULTIPLE_FACES', 0.90, `Multiple people detected by ${sourceName} feed.`);
        }

      } catch (err) {
         // Silently catch tfjs errors (e.g. disposed tensors, unrendered frames)
         // Actually, let's log them to trace why it fails
         if (!cooldownsRef.current['TF_SCAN_ERROR']) { // log once
            console.error(`scanFrame error for ${sourceName}:`, err);
            cooldownsRef.current['TF_SCAN_ERROR'] = true;
         }
      }
    }

    if (isActive && isLoaded) {
      // 1000ms = 1 FPS. Sufficient for cheating detection while saving massive CPU.
      intervalId = setInterval(scanFrame, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, isLoaded, model, videoRef, onViolation, sourceName]);

  return { isLoaded };
}
