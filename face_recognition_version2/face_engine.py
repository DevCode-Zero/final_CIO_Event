"""
face_engine.py
Face detection and embedding using InsightFace for accurate face recognition.
"""

import cv2
import numpy as np
from config import DET_SIZE, CTX_ID, INSIGHTFACE_MODEL


class Face:
    """Simple class to hold face data"""
    def __init__(self):
        self.bbox = None
        self.embedding = None


class FaceEngine:
    _instance = None
    _insightface_app = None
    _fallback_cascade = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        print("[FaceEngine] Loading InsightFace...")
        
        try:
            from insightface.app import FaceAnalysis
            self._insightface_app = FaceAnalysis(
                name=INSIGHTFACE_MODEL,
                providers=['CPUExecutionProvider']
            )
            self._insightface_app.prepare(ctx_id=CTX_ID, det_size=DET_SIZE)
            print(f"[FaceEngine] Loaded InsightFace ({INSIGHTFACE_MODEL})")
        except Exception as e:
            print(f"[FaceEngine] InsightFace failed: {e}")
            print("[FaceEngine] Falling back to OpenCV...")
            self._load_fallback()
        
        self._initialized = True
        print("[FaceEngine] Ready.")

    def _load_fallback(self):
        """Load OpenCV cascade as fallback"""
        cascade_files = [
            'haarcascade_frontalface_default.xml',
            'haarcascade_frontalface_alt.xml', 
            'haarcascade_frontalface_alt2.xml',
        ]
        
        for casc in cascade_files:
            try:
                self._fallback_cascade = cv2.CascadeClassifier(
                    cv2.data.haarcascades + casc
                )
                if not self._fallback_cascade.empty():
                    print(f"[FaceEngine] Fallback loaded: {casc}")
                    break
            except:
                continue

    def get_faces(self, img: np.ndarray) -> list:
        """Detect all faces in image."""
        if img is None or img.size == 0:
            return []
        
        if self._insightface_app is not None:
            return self._get_faces_insightface(img)
        else:
            return self._get_faces_fallback(img)

    def _get_faces_insightface(self, img: np.ndarray) -> list:
        """Use InsightFace for detection"""
        try:
            results = self._insightface_app.get(img)
            faces = []
            for r in results:
                face = Face()
                face.bbox = np.array([r.bbox[0], r.bbox[1], r.bbox[2], r.bbox[3]])
                face.embedding = r.embedding
                faces.append(face)
            faces.sort(key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]), reverse=True)
            return faces
        except Exception as e:
            print(f"[FaceEngine] InsightFace detection error: {e}")
            return self._get_faces_fallback(img)

    def _get_faces_fallback(self, img: np.ndarray) -> list:
        """Fallback to OpenCV cascade"""
        if self._fallback_cascade is None or self._fallback_cascade.empty():
            return []
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        
        faces = self._fallback_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        results = []
        for (x, y, w, h) in faces:
            face = Face()
            face.bbox = np.array([x, y, x + w, y + h])
            face.embedding = self._get_simple_embedding(img, face.bbox)
            results.append(face)
        
        results.sort(key=lambda f: _face_area(f), reverse=True)
        return results

    def get_largest_face(self, img: np.ndarray):
        """Return largest face."""
        faces = self.get_faces(img)
        return faces[0] if faces else None

    def embed_image(self, img: np.ndarray) -> np.ndarray | None:
        """Get embedding for largest face."""
        face = self.get_largest_face(img)
        if face is None:
            return None
        return face.embedding

    def embed_crop(self, crop: np.ndarray) -> np.ndarray | None:
        """Get embedding for face crop."""
        if crop is None or crop.size == 0:
            return None
        
        if self._insightface_app is not None:
            try:
                emb = self._insightface_app.get(crop)
                if len(emb) > 0:
                    return emb[0].embedding
            except:
                pass
        
        crop = cv2.resize(crop, (128, 128))
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist.flatten()
        hist = hist / (hist.sum() + 1e-7)
        
        embedding = np.zeros(512, dtype=np.float32)
        embedding[:len(hist)] = hist
        
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        return embedding

    def _get_simple_embedding(self, img: np.ndarray, bbox: np.ndarray) -> np.ndarray:
        """Create simple embedding from face region."""
        x1, y1, x2, y2 = map(int, bbox)
        
        face_img = img[y1:y2, x1:x2]
        face_img = cv2.resize(face_img, (128, 128))
        
        gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
        
        hist = cv2.calcHist([gray], [0], None, [128], [0, 256])
        hist = hist.flatten()
        
        stats = [
            gray.mean(), gray.std(),
            gray.min(), gray.max(),
        ]
        stats = np.array(stats, dtype=np.float32)
        
        embedding = np.concatenate([hist, stats])
        
        if len(embedding) < 512:
            embedding = np.pad(embedding, (0, 512 - len(embedding)))
        
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        return embedding


def _face_area(face) -> float:
    x1, y1, x2, y2 = face.bbox
    return (x2 - x1) * (y2 - y1)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity."""
    return float(np.dot(a, b))