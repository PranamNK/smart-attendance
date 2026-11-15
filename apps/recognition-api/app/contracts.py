from enum import Enum
from pydantic import BaseModel,Field
class RecognitionStatus(str,Enum): MATCHED="MATCHED"; REVIEW_REQUIRED="REVIEW_REQUIRED"; UNKNOWN="UNKNOWN"; DUPLICATE="DUPLICATE"
class BoundingBox(BaseModel): x:int=Field(ge=0); y:int=Field(ge=0); width:int=Field(gt=0); height:int=Field(gt=0)
class Candidate(BaseModel): usn:str; similarity:float=Field(ge=-1,le=1)
class FaceResult(BaseModel): face_id:str; bounding_box:BoundingBox; face_crop_ref:str|None=None; predicted_usn:str|None=None; similarity:float|None=Field(default=None,ge=-1,le=1); alternatives:list[Candidate]=Field(default_factory=list); similarity_margin:float|None=Field(default=None,ge=0,le=2); status:RecognitionStatus; unknown:bool; duplicate_warning:bool; review_required:bool
class AnalyzeResponse(BaseModel): pipeline:str="py-feat-2.1.5-retinaface-mobilefacenet-arcface"; gallery_version:str|None=None; faces:list[FaceResult]
class HealthResponse(BaseModel): status:str; gallery_ready:bool; inference_ready:bool; detail:str|None=None; embedding_count:int|None=None
