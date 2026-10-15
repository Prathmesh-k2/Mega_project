const VISUAL_EVENTS = new Set([
  'NO_FACE_DETECTED',
  'MULTIPLE_FACES',
  'CELL_PHONE_DETECTED',
  'BOOK_DETECTED',
  'PERSON_IN_BACKGROUND',
  'PROHIBITED_OBJECT',
]);

export const isVisualEvidenceEvent = (eventType) => VISUAL_EVENTS.has(eventType);

const getVideoElement = (videoRef) => {
  const value = videoRef?.current;
  return value?.video || value;
};

export const captureEvidence = (videoRef, { quality = 0.72, maxWidth = 640, maxBytes = 2 * 1024 * 1024 } = {}) => {
  const video = getVideoElement(videoRef);
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    throw new Error('Camera frame is not ready for evidence capture');
  }

  const scale = Math.min(1, maxWidth / video.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Evidence canvas is unavailable');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Camera frame could not be encoded'));
        return;
      }
      if (blob.size > maxBytes) {
        reject(new Error('Evidence image exceeds the upload size limit'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', quality);
  });
};
