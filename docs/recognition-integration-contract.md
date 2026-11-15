# Next.js to recognition-service contract

## Current Next.js interface inspection

`src/lib/recognition.ts` now retains the demo placeholder provider and adds a server-only FastAPI adapter. The FastAPI adapter accepts private image bytes and an enrolled-student USN-to-database-ID mapping.

```ts
interface RecognitionProvider {
  createPlaceholders(count: number): Promise<RecognitionFace[]>
}
```

The FastAPI adapter is invoked server-side by the attendance analysis route after loading the teacher-uploaded private image. It maps returned USNs to local Student IDs before persistence.

## Required future adapter change

The implemented FastAPI adapter uses this server-only request shape:

```ts
type AnalyzeAttendanceInput = {
  image: Uint8Array;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  students: { id: string; usn: string }[];
};
```

The Next.js server route sends the image as multipart form field `image` to `POST {RECOGNITION_API_URL}/attendance/analyze`. It validates the response, maps the returned `predicted_usn` to local `Student.id`, and persists detections only after teacher review.

## FastAPI response mapping

| FastAPI field | Next.js field | Notes |
| --- | --- | --- |
| `face_id` | `faceId` | Stable within a single analysis request. |
| `bounding_box` | `bbox` | Convert `{x,y,width,height}` to `[x,y,width,height]` if retaining the current UI type. |
| `predicted_usn` | `predictedStudentId` | The Next.js server maps USN to a local database UUID. |
| `similarity` | `similarity` | Cosine similarity, never display as certainty. |
| `alternatives` | `alternatives` | Top candidate alternatives only. |
| `similarity_margin` | derived review state | Compare using institution-approved policy. |
| `status` | `status` | `MATCHED`, `REVIEW_REQUIRED`, `UNKNOWN`, or `DUPLICATE`. |

No raw embedding, model path, or private image-storage reference belongs in the browser response.
