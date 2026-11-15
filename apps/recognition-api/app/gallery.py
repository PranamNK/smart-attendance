"""Private loader for the exact gallery exported by the Colab notebook."""
import json
from dataclasses import dataclass
from pathlib import Path
import numpy as np

EXPECTED_STUDENTS = {
 "KALYANPUR RITHVIKCHANDRA NAYAK":"4SF24CS077", "KOUSHIK BHAGEERATH NAIK":"4SF24CS085", "MAHAMMAD SHIHAN":"4SF24CS098", "MANTHAN B SHETTY":"4SF24CS102", "NIHAL N S":"4SF24CS122", "OMKAR G N":"4SF24CS128", "PAVAN K":"4SF24CS132", "PRANAM N KOTIAN":"4SF24CS140", "R V BHUVAN":"4SF24CS155", "RAHUL PRAVEEN SHETTY":"4SF24CS158", "RAJATH NAYAK":"4SF24CS162", "RISHON DINESH":"4SF24CS169"}
@dataclass(frozen=True)
class StudentGallery: name:str; usn:str; embeddings:np.ndarray
@dataclass(frozen=True)
class Gallery: students:dict[str,StudentGallery]; manifest:dict; embedding_count:int
class GalleryUnavailable(RuntimeError): pass
def load_gallery(gallery_path:Path, manifest_path:Path)->Gallery:
 if not gallery_path.is_file(): raise GalleryUnavailable(f"Gallery file is missing: {gallery_path}")
 if not manifest_path.is_file(): raise GalleryUnavailable(f"Manifest file is missing: {manifest_path}")
 try:
  with np.load(gallery_path,allow_pickle=False) as archive: arrays={key:archive[key].astype(np.float32,copy=False) for key in archive.files}
  manifest=json.loads(manifest_path.read_text(encoding="utf-8"))
 except (OSError,ValueError,json.JSONDecodeError) as error: raise GalleryUnavailable(f"Unable to load gallery artifacts: {error}") from error
 entries=manifest.get("students") if isinstance(manifest,dict) else None
 if not isinstance(entries,list): raise GalleryUnavailable("Manifest must contain a 'students' list.")
 students={}; seen_usns=set()
 for entry in entries:
  if not isinstance(entry,dict): raise GalleryUnavailable("Manifest contains an invalid student entry.")
  key,name,usn=entry.get("gallery_key"),entry.get("name"),entry.get("usn")
  if not all(isinstance(value,str) and value for value in (key,name,usn)): raise GalleryUnavailable("Each manifest student needs gallery_key, name, and usn.")
  if key not in arrays: raise GalleryUnavailable(f"Manifest key '{key}' is absent from NPZ gallery.")
  values=arrays[key]
  if values.ndim!=2 or values.shape[1]!=512: raise GalleryUnavailable(f"Gallery '{key}' must have shape [n, 512], got {values.shape}.")
  if not len(values): raise GalleryUnavailable(f"Gallery '{key}' has no embeddings.")
  if not np.isfinite(values).all(): raise GalleryUnavailable(f"Gallery '{key}' contains non-finite embeddings.")
  if not np.allclose(np.linalg.norm(values,axis=1),1.0,atol=1e-4): raise GalleryUnavailable(f"Gallery '{key}' contains embeddings that are not L2-normalized.")
  if key in students or usn in seen_usns: raise GalleryUnavailable("Gallery keys and USNs must be unique.")
  students[key]=StudentGallery(name=name,usn=usn,embeddings=values); seen_usns.add(usn)
 if set(arrays)!=set(students): raise GalleryUnavailable("NPZ keys and manifest gallery_key values differ.")
 if {student.name:student.usn for student in students.values()}!=EXPECTED_STUDENTS: raise GalleryUnavailable("Manifest does not map exactly to the expected 12-student CSE-4B roster.")
 return Gallery(students=students,manifest=manifest,embedding_count=sum(len(student.embeddings) for student in students.values()))
