from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    recognition_gallery_path: Path = Path("./artifacts/student_gallery_v1.npz")
    recognition_manifest_path: Path = Path("./artifacts/student_gallery_manifest_v1.json")
    retinaface_weights_path: Path | None = None
    mobilefacenet_weights_path: Path | None = None
    arcface_weights_path: Path | None = None
    max_upload_bytes: int = 10 * 1024 * 1024
    # Thresholds observed in the original Colab review cell; not probabilities.
    match_threshold: float = 0.35
    review_margin_threshold: float = 0.08


settings = Settings()
