
import io
import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO

app = FastAPI(title="AI Exam Proctoring Detection API")

# Replace with your actual React frontend origin in production.
FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN", "http://localhost:5173"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Downloads pretrained YOLO11 nano weights on first use.
model = YOLO("yolo11n.pt")

# Use labels exposed by the loaded weights instead of assuming class IDs. The
# standard YOLO11n COCO weights include person, cell phone, laptop, keyboard,
# mouse, book, TV, and remote; absent labels are simply unavailable.
TARGET_LABELS = {
    "person", "cell phone", "laptop", "keyboard", "mouse", "book", "tv", "remote"
}
MODEL_NAMES = model.names if isinstance(model.names, dict) else dict(enumerate(model.names))
TARGET_CLASSES = {
    class_id: label
    for class_id, label in MODEL_NAMES.items()
    if label in TARGET_LABELS
}


@app.get("/health")
def health():
    return {"status": "ok", "model": "yolo11n.pt", "available_labels": list(TARGET_CLASSES.values())}


@app.post("/detect")
async def detect(
    file: UploadFile = File(...),
    camera: str = "laptop",
):
    if camera not in {"laptop", "mobile"}:
        raise HTTPException(
            status_code=400,
            detail="camera must be laptop or mobile",
        )

    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(
            status_code=415,
            detail="Upload a JPEG, PNG, or WebP image",
        )

    # Limit uploaded frame size to 5 MB.
    raw = await file.read(5 * 1024 * 1024 + 1)

    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large")

    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Invalid image")

    try:
        results = model.predict(
            source=image,
            imgsz=640,
            conf=0.40,
            classes=list(TARGET_CLASSES.keys()),
            verbose=False,
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Object detection failed",
        )

    detections = []

    for result in results:
        for box in result.boxes:
            class_id = int(box.cls.item())
            confidence = float(box.conf.item())
            x1, y1, x2, y2 = map(
                float, box.xyxy[0].tolist()
            )

            detections.append({
                "label": TARGET_CLASSES[class_id],
                "confidence": round(confidence, 3),
                "box": {
                    "x1": round(x1, 1),
                    "y1": round(y1, 1),
                    "x2": round(x2, 1),
                    "y2": round(y2, 1),
                },
                "camera": camera,
            })

    person_count = sum(1 for item in detections if item["label"] == "person")
    phone_candidates = [item for item in detections if item["label"] == "cell phone"]

    return {
        "camera": camera,
        "image_width": image.width,
        "image_height": image.height,
        "phone_detected": bool(phone_candidates),
        "phone_candidate_count": len(phone_candidates),
        # Person detection is not face verification; retained as null for old clients.
        "multiple_faces": None,
        "no_face": None,
        "person_count": person_count,
        "detections": detections,
    }
