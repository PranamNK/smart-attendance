import { RecognitionStatus, Role, SessionStatus } from "@prisma/client";
import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { FastApiRecognitionProvider, recognitionProvider } from "@/lib/recognition";
import { requireRole, unauthorized } from "@/lib/auth";

const bodySchema = z.object({ sessionId: z.string().uuid(), placeholderCount: z.number().int().min(0).max(30) });

export async function POST(request: NextRequest) {
  const user = await requireRole(request, Role.TEACHER);
  if (!user) return unauthorized();
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Invalid demo review request" }, { status: 400 });
  const session = await db.attendanceSession.findUnique({ where: { id: body.data.sessionId }, include: { teacher: true, class: { include: { enrollments: { include: { student: true } } } } } });
  if (!session || session.teacher.userId !== user.id) return NextResponse.json({ error: "Session unavailable" }, { status: 403 });
  if (session.status === SessionStatus.CONFIRMED) return NextResponse.json({ error: "Confirmed sessions cannot be changed" }, { status: 409 });
  let placeholders;
  try {
    if (process.env.RECOGNITION_PROVIDER === "fastapi") {
      if (!session.imageRef?.startsWith("private://attendance/")) return NextResponse.json({ error: "Upload a classroom image before running FastAPI recognition." }, { status: 400 });
      const filename = path.basename(session.imageRef); const extension = path.extname(filename).toLowerCase(); const contentType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
      const image = await readFile(path.join(process.cwd(), "private-uploads", "attendance", filename));
      placeholders = await new FastApiRecognitionProvider().analyze(image, contentType, session.class.enrollments.map((entry) => ({ id: entry.student.id, usn: entry.student.usn })));
    } else placeholders = await recognitionProvider.createPlaceholders(body.data.placeholderCount);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Recognition service unavailable" }, { status: 503 }); }
  await db.$transaction(async (tx) => {
    await tx.faceDetection.deleteMany({ where: { sessionId: session.id } });
    if (placeholders.length) await tx.faceDetection.createMany({ data: placeholders.map((face) => ({ sessionId: session.id, faceKey: face.faceId, bbox: face.bbox, status: face.status as RecognitionStatus })) });
    await tx.attendanceSession.update({ where: { id: session.id }, data: { status: SessionStatus.REVIEW_REQUIRED } });
    await tx.attendanceAuditLog.create({ data: { sessionId: session.id, actorId: user.id, action: "DEMO_PLACEHOLDERS_CREATED", metadata: { count: placeholders.length, provider: "demo" } } });
  });
  const detections = await db.faceDetection.findMany({ where: { sessionId: session.id }, orderBy: { faceKey: "asc" } });
  if (process.env.RECOGNITION_PROVIDER === "fastapi") {
    for (const detection of detections) { const face = placeholders.find((item) => item.faceId === detection.faceKey); if (face) await db.faceRecognitionResult.create({ data: { detectionId: detection.id, predictedStudentId: face.predictedStudentId, similarity: face.similarity, secondBestStudentId: face.alternatives[0]?.studentId, secondBestSimilarity: face.alternatives[0]?.similarity, margin: face.similarity != null && face.alternatives[0] ? face.similarity - face.alternatives[0].similarity : null, duplicateWarning: face.status === "DUPLICATE" } }); }
    return NextResponse.json({ provider: "fastapi", disclaimer: "Real model results require teacher review; attendance is not finalized automatically.", detections });
  }
  return NextResponse.json({ provider: "demo", disclaimer: "Manual placeholders only. No AI face detection or recognition was performed.", detections });
}
