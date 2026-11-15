# DEMO and FASTAPI recognition modes

Set one of these in the root `.env`:

```env
RECOGNITION_PROVIDER="demo"
```

`demo` is the default development mode. A teacher enters the number of visible faces, then the system creates neutral placeholders (`manual-face-1`, etc.). The teacher manually associates each placeholder with an enrolled student or marks it unknown. It does not detect a face, identify a person, calculate an embedding, or produce a similarity score.

```env
RECOGNITION_PROVIDER="fastapi"
RECOGNITION_API_URL="http://127.0.0.1:8000"
```

`fastapi` remains blocked until the Google Colab artifacts and exact tested inference pipeline have been transferred and verified. The current Next.js endpoint deliberately returns HTTP 503 rather than substituting demo data in this mode.
