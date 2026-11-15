import importlib.util
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

@unittest.skipUnless(importlib.util.find_spec("fastapi") and importlib.util.find_spec("pydantic_settings"), "FastAPI dependencies are not installed")
class ApiContractTests(unittest.TestCase):
 def test_health_reports_blocked_when_manifest_is_missing(self):
  from app.main import health
  response=health()
  self.assertFalse(response.gallery_ready)
  self.assertFalse(response.inference_ready)
  self.assertEqual(response.status,"blocked")
