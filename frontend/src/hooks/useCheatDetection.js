import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { detectFrame } from '../services/yoloDetection';

/**
 * Optimized React Hook to perform object detection by polling the YOLO FastAPI backend.
 * 
 * @param {React.MutableRefObject} videoRef - Ref to the `<video>` element
 * @param {function} onViolation - Callback to trigger when a violation occurs
 * @param {boolean} isActive - Enables or disables the scanning loop
 * @param {string} sourceName - Identifier for logging
 */
export default function useCheatDetection(videoRef, onViolation, isActive = true, sourceName = 'Camera') {
  const [isLoaded, setIsLoaded] = useState(true); // YOLO is loaded on backend
  const cooldownsRef = useRef({});
  const isDetectingRef = useRef(false);

  useEffect(() => {
    let intervalId;

    async function scanFrame() {
      if (!isActive || isDetectingRef.current || !videoRef.current) return;
      
      const video = videoRef.current.video || videoRef.current;
      
      // Ensure video is playable and actually rendering frames (readyState >= 2)
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      try {
        isDetectingRef.current = true;
        // The camera prop determines the camera string for tracking
        const cameraLabel = sourceName.includes('Mobile') ? 'mobile' : 'laptop';
        const result = await detectFrame(video, cameraLabel);
        
        if (!result) return;
        
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

        // Send Violations based on the backend results
        if (result.phone_detected) {
            triggerViolationWithCooldown('CELL_PHONE_DETECTED', 0.95, `Cell phone spotted by ${sourceName} feed.`);
        }

        if (result.no_face) {
            triggerViolationWithCooldown('NO_FACE_DETECTED', 0.85, `Student absent or out of frame on ${sourceName} feed.`);
        }

        if (result.multiple_faces) {
            triggerViolationWithCooldown('MULTIPLE_FACES', 0.90, `Multiple people detected by ${sourceName} feed.`);
        }

      } catch (err) {
         if (!cooldownsRef.current['API_SCAN_ERROR']) { 
            console.error(`scanFrame error for ${sourceName}:`, err);
            cooldownsRef.current['API_SCAN_ERROR'] = true;
         }
      } finally {
        isDetectingRef.current = false;
      }
    }

    if (isActive) {
      // 1000ms polling rate
      intervalId = setInterval(scanFrame, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isActive, videoRef, onViolation, sourceName]);

  return { isLoaded };
}

