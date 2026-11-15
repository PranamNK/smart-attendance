from fastapi import FastAPI, File, HTTPException, UploadFile
from .config import settings
from .contracts import AnalyzeResponse, HealthResponse
from .gallery import GalleryUnavailable, load_gallery
from .inference import ColabPipelineAdapter, InferenceNotReady

app=FastAPI(title="Smart Attendance Recognition API",version="0.2.0")
def get_adapter()->ColabPipelineAdapter:
 return ColabPipelineAdapter(load_gallery(settings.recognition_gallery_path,settings.recognition_manifest_path),settings.match_threshold,settings.review_margin_threshold)
@app.get("/health",response_model=HealthResponse)
def health()->HealthResponse:
 try: gallery=load_gallery(settings.recognition_gallery_path,settings.recognition_manifest_path)
 except GalleryUnavailable as error: return HealthResponse(status="blocked",gallery_ready=False,inference_ready=False,detail=str(error))
 try: get_adapter()
 except InferenceNotReady as error: return HealthResponse(status="blocked",gallery_ready=True,inference_ready=False,embedding_count=gallery.embedding_count,detail=str(error))
 return HealthResponse(status="ready",gallery_ready=True,inference_ready=True,embedding_count=gallery.embedding_count)
@app.post("/attendance/analyze",response_model=AnalyzeResponse)
async def analyze_attendance(image:UploadFile=File(...))->AnalyzeResponse:
 if image.content_type not in {"image/jpeg","image/png","image/webp"}: raise HTTPException(status_code=415,detail="Only JPEG, PNG, and WebP classroom images are accepted.")
 contents=await image.read(settings.max_upload_bytes+1)
 if len(contents)>settings.max_upload_bytes: raise HTTPException(status_code=413,detail="Classroom image exceeds the configured upload limit.")
 suffix={"image/jpeg":".jpg","image/png":".png","image/webp":".webp"}[image.content_type]
 try: adapter=get_adapter(); faces=adapter.analyze(contents,suffix)
 except GalleryUnavailable as error: raise HTTPException(status_code=503,detail=str(error)) from error
 except InferenceNotReady as error: raise HTTPException(status_code=503,detail=str(error)) from error
 except ValueError as error: raise HTTPException(status_code=422,detail=str(error)) from error
 gallery=load_gallery(settings.recognition_gallery_path,settings.recognition_manifest_path)
 return AnalyzeResponse(faces=faces,gallery_version=str(gallery.manifest.get("version","unknown")))
