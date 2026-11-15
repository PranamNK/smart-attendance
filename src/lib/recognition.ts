export type RecognitionCandidate = { studentId: string; similarity: number };
export type RecognitionFace = { faceId: string; bbox: [number, number, number, number]; predictedStudentId?: string; similarity?: number; alternatives: RecognitionCandidate[]; status: "MATCHED" | "REVIEW_REQUIRED" | "UNKNOWN" | "DUPLICATE" };
export interface RecognitionProvider { createPlaceholders(count: number): Promise<RecognitionFace[]> }

/** Demo mode creates neutral review placeholders only; it performs no AI inference. */
export class DemoRecognitionProvider implements RecognitionProvider {
  async createPlaceholders(count: number): Promise<RecognitionFace[]> {
    return Array.from({ length: count }, (_, index) => ({ faceId: `manual-face-${index + 1}`, bbox: [0, 0, 1, 1], alternatives: [], status: "UNKNOWN" as const }));
  }
}

/** Reserved for the verified FastAPI service; it has no local fallback. */
export class FastApiRecognitionProvider implements RecognitionProvider {
  async createPlaceholders(): Promise<RecognitionFace[]> { throw new Error("FastAPI recognition requires a classroom image."); }
  async analyze(image: Uint8Array, contentType: "image/jpeg" | "image/png" | "image/webp", students: { id: string; usn: string }[]): Promise<RecognitionFace[]> {
    const bytes = image.buffer.slice(image.byteOffset, image.byteOffset + image.byteLength) as ArrayBuffer;
    const form = new FormData(); form.append("image", new Blob([bytes], { type: contentType }), "classroom-image");
    const response = await fetch(`${process.env.RECOGNITION_API_URL ?? "http://127.0.0.1:8000"}/attendance/analyze`, { method: "POST", body: form, cache: "no-store" });
    const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.detail ?? "Recognition service request failed.");
    const ids = new Map(students.map((student) => [student.usn, student.id]));
    if (!Array.isArray(payload.faces)) throw new Error("Recognition service returned an invalid response.");
    return payload.faces.map((face: { face_id: string; bounding_box: { x: number; y: number; width: number; height: number }; predicted_usn?: string; similarity?: number; alternatives?: { usn: string; similarity: number }[]; status: RecognitionFace["status"] }) => ({ faceId: face.face_id, bbox: [face.bounding_box.x, face.bounding_box.y, face.bounding_box.width, face.bounding_box.height], predictedStudentId: face.predicted_usn ? ids.get(face.predicted_usn) : undefined, similarity: face.similarity, alternatives: (face.alternatives ?? []).flatMap((candidate) => ids.has(candidate.usn) ? [{ studentId: ids.get(candidate.usn)!, similarity: candidate.similarity }] : []), status: face.status }));
  }
}
export const recognitionProvider: RecognitionProvider = process.env.RECOGNITION_PROVIDER === "fastapi" ? new FastApiRecognitionProvider() : new DemoRecognitionProvider();
