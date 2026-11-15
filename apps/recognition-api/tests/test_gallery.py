import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
from app.gallery import EXPECTED_STUDENTS, GalleryUnavailable, load_gallery
class GalleryTests(unittest.TestCase):
 def write_valid(self,root):
  arrays={}; students=[]
  for index,(name,usn) in enumerate(EXPECTED_STUDENTS.items()):
   key=f"student_{index}"; values=np.zeros((1,512),dtype=np.float32); values[0,index]=1; arrays[key]=values; students.append({"gallery_key":key,"name":name,"usn":usn})
  np.savez(root/"gallery.npz",**arrays); (root/"manifest.json").write_text(json.dumps({"version":1,"students":students}),encoding="utf-8")
 def test_loads_exact_roster_and_dynamic_count(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder); self.write_valid(root); gallery=load_gallery(root/"gallery.npz",root/"manifest.json")
   self.assertEqual(len(gallery.students),12); self.assertEqual(gallery.embedding_count,12)
 def test_rejects_non_normalized_embeddings(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder); self.write_valid(root)
   with np.load(root/"gallery.npz") as archive: arrays={key:archive[key] for key in archive.files}
   arrays["student_0"]=np.ones((1,512),dtype=np.float32); np.savez(root/"gallery.npz",**arrays)
   with self.assertRaisesRegex(GalleryUnavailable,"L2-normalized"): load_gallery(root/"gallery.npz",root/"manifest.json")
 def test_rejects_missing_manifest(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder); self.write_valid(root)
   with self.assertRaisesRegex(GalleryUnavailable,"Manifest file is missing"): load_gallery(root/"gallery.npz",root/"none.json")
if __name__=="__main__": unittest.main()
