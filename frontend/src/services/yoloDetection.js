const AI_API = "http://localhost:8000";

export async function detectFrame(video, camera = "laptop") {
  if (!video || video.readyState < 2 ||
      !video.videoWidth || !video.videoHeight) {
    return null;
  }

  // Resize frames to reduce network and inference load.
  const maxWidth = 640;
  const scale = Math.min(1, maxWidth / video.videoWidth);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.8);
  });

  if (!blob) {
    throw new Error("Could not capture camera frame");
  }

  const formData = new FormData();
  formData.append("file", blob, `${camera}.jpg`);

  const response = await fetch(
    `${AI_API}/detect?camera=${camera}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`AI detection failed: ${response.status}`);
  }

  return response.json();
}
