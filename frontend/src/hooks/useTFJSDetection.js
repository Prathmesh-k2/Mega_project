/**
 * Browser proctoring inference.
 *
 * COCO-SSD detects objects (phone, book, people). It is not a face or gaze
 * model, so MediaPipe FaceLandmarker handles face count and head direction.
 */
import { useCallback, useEffect, useRef } from 'react';
import { PROCTORING as P } from '../config/proctoring';

let objectModel = null;
let objectModelPromise = null;
let faceModel = null;
let faceModelPromise = null;

const log = (...args) => {
  if (process.env.NODE_ENV !== 'production') console.debug('[Proctoring]', ...args);
};

const createEventId = () => (
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
);

async function getObjectModel() {
  if (objectModel) return objectModel;
  if (!objectModelPromise) {
    objectModelPromise = (async () => {
      const [cocoSsdModule] = await Promise.all([
        import('@tensorflow-models/coco-ssd'),
        import('@tensorflow/tfjs'),
      ]);
      const cocoSsd = cocoSsdModule.default || cocoSsdModule;
      objectModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      log('AI model loaded (COCO-SSD)');
      return objectModel;
    })().catch((error) => {
      objectModelPromise = null;
      console.error('[Proctoring] COCO-SSD model failed to load:', error);
      return null;
    });
  }
  return objectModelPromise;
}

async function getFaceModel() {
  if (faceModel) return faceModel;
  if (!faceModelPromise) {
    faceModelPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm',
      );
      faceModel = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 3,
        outputFaceBlendshapes: false,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
      log('AI model loaded (MediaPipe FaceLandmarker)');
      return faceModel;
    })().catch((error) => {
      faceModelPromise = null;
      console.error('[Proctoring] FaceLandmarker failed to load:', error);
      return null;
    });
  }
  return faceModelPromise;
}

const EVENT_COOLDOWNS = {
  NO_FACE_DETECTED: 8000,
  MULTIPLE_FACES: 8000,
  CELL_PHONE_DETECTED: 6000,
  BOOK_DETECTED: 8000,
  PERSON_IN_BACKGROUND: 8000,
  GAZE_DEVIATION: 15000,
};

export default function useTFJSDetection(videoRef, onViolation, isActive = true, sourceName = 'Camera') {
  const lastEventRef = useRef({});
  const confirmingRef = useRef({ noFace: 0, gaze: 0 });
  const runningRef = useRef(false);
  const onViolationRef = useRef(onViolation);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const trigger = useCallback((eventType, confidence, description, metadata = {}) => {
    const now = Date.now();
    const cooldown = EVENT_COOLDOWNS[eventType] || P.COOLDOWN_MS;
    if (now - (lastEventRef.current[eventType] || 0) < cooldown) return;
    lastEventRef.current[eventType] = now;
    log('Violation triggered:', eventType, confidence);
    onViolationRef.current?.({
      eventId: createEventId(),
      eventType,
      confidence,
      description,
      cameraSource: sourceName.toLowerCase().includes('mobile') ? 'mobile' : 'laptop',
      metadata: {
        source: sourceName,
        cameraSource: sourceName.toLowerCase().includes('mobile') ? 'mobile' : 'laptop',
        ...metadata,
        timestamp: new Date().toISOString(),
      },
      _ts: now,
    });
  }, [sourceName]);

  useEffect(() => {
    if (!isActive) return undefined;
    let cancelled = false;
    let intervalId;

    void Promise.all([getObjectModel(), getFaceModel()]).then(() => {
      if (!cancelled) log('Detection pipeline ready');
    });

    const runDetection = async () => {
      if (cancelled || runningRef.current) return;
      const video = videoRef?.current?.video ?? videoRef?.current;
      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;

      runningRef.current = true;
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 640 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create inference canvas');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const [objects, faces] = await Promise.all([
          getObjectModel().then((model) => (model ? model.detect(canvas) : [])),
          getFaceModel().then((model) => (
            model ? model.detectForVideo(video, performance.now()) : null
          )),
        ]);
        if (cancelled) return;

        const detected = objects.filter((item) => item.score >= P.MIN_CONFIDENCE);
        log('Predictions:', detected);
        const people = detected.filter((item) => item.class === 'person');
        const faceCount = faces?.faceLandmarks?.length ?? null;

        if (faceCount !== null) {
          if (faceCount === 0) confirmingRef.current.noFace += 1;
          else confirmingRef.current.noFace = 0;
          if (confirmingRef.current.noFace >= P.NO_FACE_STRIKES) {
            trigger('NO_FACE_DETECTED', 0.9, `No face visible on ${sourceName}.`, {
              confirmationFrames: confirmingRef.current.noFace,
            });
          }
          if (faceCount > 1) {
            trigger('MULTIPLE_FACES', Math.min(0.99, 0.75 + faceCount * 0.05),
              `${faceCount} faces detected on ${sourceName}.`, { faceCount });
          }

          const landmarks = faces?.faceLandmarks?.[0];
          if (landmarks) {
            const nose = landmarks[1];
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            const eyeMidX = (leftEye.x + rightEye.x) / 2;
            const eyeDistance = Math.max(Math.abs(rightEye.x - leftEye.x), 0.001);
            const yaw = Math.abs((nose.x - eyeMidX) / eyeDistance) * 90;
            const eyeMidY = (leftEye.y + rightEye.y) / 2;
            const pitch = (nose.y - eyeMidY) / eyeDistance * 90;
            const deviated = yaw >= P.gaze.ANGLE_THRESHOLD || pitch >= P.gaze.ANGLE_THRESHOLD;
            confirmingRef.current.gaze = deviated ? confirmingRef.current.gaze + 1 : 0;
            if (confirmingRef.current.gaze >= P.gaze.CONFIRMATION_FRAMES) {
              trigger('GAZE_DEVIATION', 0.75, 'Sustained head direction deviation detected.', {
                yaw: Math.round(yaw),
                pitch: Math.round(pitch),
                confirmationFrames: confirmingRef.current.gaze,
              });
            }
          }
        } else if (people.length === 0) {
          confirmingRef.current.noFace += 1;
          if (confirmingRef.current.noFace >= P.NO_FACE_STRIKES) {
            trigger('NO_FACE_DETECTED', 0.8, `No person visible on ${sourceName}.`);
          }
        }

        const classes = new Set(detected.map((item) => item.class));
        const phone = detected.find((item) => item.class === 'cell phone');
        if (phone) trigger('CELL_PHONE_DETECTED', phone.score,
          `Mobile phone detected by ${sourceName}. Phones are prohibited.`);
        const book = detected.find((item) => item.class === 'book');
        if (book) trigger('BOOK_DETECTED', book.score,
          `Reference material detected by ${sourceName}.`);
        if (people.length >= 2 && faceCount === null) {
          trigger('MULTIPLE_FACES', Math.min(0.97, 0.75 + people.length * 0.05),
            `${people.length} people detected by ${sourceName}.`);
        }
        if (classes.has('laptop') || classes.has('tv') || classes.has('monitor')) {
          trigger('BOOK_DETECTED', 0.7, `Secondary screen detected by ${sourceName}.`);
        }
      } catch (error) {
        console.error('[Proctoring] Detection error:', error);
      } finally {
        runningRef.current = false;
      }
    };

    intervalId = window.setInterval(runDetection, P.SCAN_INTERVAL_MS);
    void runDetection();
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      runningRef.current = false;
    };
  }, [isActive, trigger, videoRef, sourceName]);
}
