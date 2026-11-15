"""Faithful adapter for the Detectorv1 calls and matching strategy in the Colab notebook."""
import tempfile
from pathlib import Path
import numpy as np
from .contracts import BoundingBox, Candidate, FaceResult, RecognitionStatus
from .gallery import Gallery

class InferenceNotReady(RuntimeError): pass
class ColabPipelineAdapter:
 def __init__(self,gallery:Gallery,match_threshold:float,margin_threshold:float):
  self.gallery,self.match_threshold,self.margin_threshold=gallery,match_threshold,margin_threshold
  try:
   import torch
   from feat.detector import Detectorv1
   self.detector=Detectorv1(face_model="retinaface",landmark_model="mobilefacenet",au_model=None,emotion_model=None,identity_model="arcface",gaze_model=None,device="cuda" if torch.cuda.is_available() else "cpu")
  except Exception as error: raise InferenceNotReady(f"Py-Feat 2.1.5 Detectorv1 initialization failed: {error}") from error
 def analyze(self,image_bytes:bytes,suffix:str)->list[FaceResult]:
  handle=tempfile.NamedTemporaryFile(suffix=suffix,delete=False); handle.write(image_bytes); handle.close()
  try: result=self.detector.detect(handle.name,data_type="image",progress_bar=False)
  except Exception as error: raise ValueError(f"Py-Feat could not process the image: {error}") from error
  finally: Path(handle.name).unlink(missing_ok=True)
  if result is None or len(result)==0: return []
  columns=[f"Identity_{index}" for index in range(1,513)]
  if not all(column in result.columns for column in columns): raise InferenceNotReady("Py-Feat result did not contain ArcFace Identity_1 through Identity_512 columns.")
  faces=[]
  for index,(_,row) in enumerate(result.iterrows(),start=1):
   query=row[columns].to_numpy(dtype=np.float32); norm=np.linalg.norm(query)
   if not np.isfinite(query).all() or not np.isfinite(norm) or norm<1e-8: continue
   query=query/norm; scores=[]
   for student in self.gallery.students.values():
    similarities=student.embeddings@query; top=np.sort(similarities)[-min(3,len(similarities)):]; scores.append((student.usn,float(np.mean(top))))
   scores.sort(key=lambda item:item[1],reverse=True); best_usn,best_score=scores[0]; second_usn,second_score=scores[1]; margin=best_score-second_score; unknown=best_score<self.match_threshold; review=unknown or margin<self.margin_threshold
   faces.append(FaceResult(face_id=f"face-{index}",bounding_box=BoundingBox(x=max(0,int(row["FaceRectX"])),y=max(0,int(row["FaceRectY"])),width=max(1,int(row["FaceRectWidth"])),height=max(1,int(row["FaceRectHeight"]))),predicted_usn=None if unknown else best_usn,similarity=best_score,alternatives=[Candidate(usn=second_usn,similarity=second_score)],similarity_margin=margin,status=RecognitionStatus.UNKNOWN if unknown else RecognitionStatus.REVIEW_REQUIRED if review else RecognitionStatus.MATCHED,unknown=unknown,duplicate_warning=False,review_required=review))
  grouped={}
  for face in faces:
   if face.predicted_usn: grouped.setdefault(face.predicted_usn,[]).append(face)
  for predicted in grouped.values():
   if len(predicted)>1:
    for face in predicted: face.status=RecognitionStatus.DUPLICATE; face.duplicate_warning=True; face.review_required=True
  return faces
