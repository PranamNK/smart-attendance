"""Validate transferred Colab artifacts without requiring FastAPI dependencies."""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.gallery import GalleryUnavailable, load_gallery

root = Path(__file__).resolve().parents[1]
gallery_path = Path(os.getenv("RECOGNITION_GALLERY_PATH", root / "artifacts" / "student_gallery_v1.npz"))
manifest_path = Path(os.getenv("RECOGNITION_MANIFEST_PATH", root / "artifacts" / "student_gallery_manifest_v1.json"))
try:
    gallery = load_gallery(gallery_path, manifest_path)
except GalleryUnavailable as error:
    print("ARTIFACTS INVALID OR INCOMPLETE")
    print(f"- {error}")
    raise SystemExit(1)
print("ARTIFACTS VALID")
print(f"- Students: {len(gallery.students)}")
print(f"- Embeddings: {gallery.embedding_count} x 512")
print(f"- Gallery version: {gallery.manifest.get('version', 'unknown')}")
print("- This verifies artifacts only; /health checks model initialization.")
