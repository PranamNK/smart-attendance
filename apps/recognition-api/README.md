# Recognition API integration scaffold

This service is an **integration boundary**, not a replacement face-recognition engine. It deliberately returns HTTP 503 until the existing Colab pipeline, weights, and gallery artifacts have been transferred and verified.

## Existing contract

- `GET /health` reports artifact readiness without exposing biometric data.
- `POST /attendance/analyze` accepts multipart field `image` (`image/jpeg`, `image/png`, or `image/webp`) and returns `AnalyzeResponse` from `app/contracts.py`.
- The service must return the application's immutable student UUID in `predicted_student_id`, not only a folder name, student name, or USN. Maintain the folder-name/USN/database-UUID mapping in the private manifest.
- Similarity is cosine similarity, not probability. The service must set `review_required` for uncertain margins, unknown faces, and duplicates. It must not finalize attendance.

## Required transfers from Google Colab / Google Drive

Copy these from `attendance_artifacts` to a private local/server directory (not Git):

1. `student_gallery_v1.npz` — reference vectors of 512 dimensions (the current export contains 65; the service derives the count instead of hardcoding it).
2. `student_gallery_manifest_v1.json` — the actual JSON written by the Colab `json.dump(manifest, ...)` cell, with its `students` entries. A `.ipynb` notebook is not a substitute for this file.
3. The exact RetinaFace, MobileFaceNet, and ArcFace weights used in Colab, if they are not automatically and reproducibly installed by the same Py-Feat configuration.
4. The tested Colab inference/preprocessing code: image decoding, detector initialization, landmark alignment, embedding extraction, normalization, cosine ranking, thresholding, margin logic, unknown handling, and duplicate handling.
5. A requirements lock or exported environment details matching **Py-Feat 2.1.5** and the known-working Python/CUDA/Torch versions.

Do not copy classroom images or raw embeddings into the Next.js `public/` directory. Keep artifacts private and restrict filesystem/service-account access.

## Configure

```powershell
cd apps/recognition-api
Copy-Item .env.example .env
```

Set absolute private paths in `.env`. Artifact files are ignored by Git through the parent ignore rules added for this service.

After copying the gallery and manifest, validate their structure before starting the API:

```powershell
python scripts/verify_artifacts.py
```

It checks for the expected `embeddings` array, exactly 65 reference vectors of 512 dimensions, finite values, and valid JSON. It does not run recognition.

## Current local status

The local NPZ was inspected successfully: it has 12 student keys, 65 finite 512-dimensional vectors, and each vector is L2-normalized. The required JSON manifest is currently missing; the artifacts directory instead contains `student_gallery_manifest_v1.ipynb`. Consequently identity-to-USN mapping and real service startup are correctly blocked.

The local machine currently has only Python 3.14 and no `py-feat`, `fastapi`, `pydantic-settings`, or `python-multipart` package installed. No Py-Feat model cache/weights were found. Do not use Python 3.14 as a substitute for the Colab environment without first proving the exact pipeline works there.

## Install a compatible service environment

Create a Python environment whose version and Torch/CUDA details match the working Colab runtime (record them there with `python --version` and `pip freeze`). For example, after installing a compatible Python interpreter locally:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

At first `Detectorv1` startup Py-Feat may download/cache its configured RetinaFace, MobileFaceNet, and ArcFace assets. If that fails, retain the exact error and copy/cache the assets using the same Py-Feat/PyTorch versions as Colab; do not replace them with alternative weights.

## After the artifacts arrive

1. Verify the gallery reports `[65, 512]` and that its manifest contains all 12 CSE-4B students.
2. Port the exact tested Colab pipeline into `app/inference.py`; do not substitute a new library or retrain the model.
3. Map the gallery identities to local MySQL `Student.id` values.
4. Run `python scripts/verify_artifacts.py`, then `uvicorn app.main:app --host 127.0.0.1 --port 8000`.
5. Confirm `/health` is operational and reproduce known Colab test images before enabling the Next.js FastAPI provider.

## Blocked status

The service cannot run inference until the model code, model weights, `student_gallery_v1.npz`, and `student_gallery_manifest_v1.json` are transferred and tested. This scaffold intentionally has no fallback or fabricated recognition output.
