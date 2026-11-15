import { RecognitionStatus, ReviewAction, Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";

const schema = z.object({ action: z.nativeEnum(ReviewAction), studentId: z.string().uuid().optional(), note: z.string().max(500).optional() }).superRefine((value, ctx) => { if ((value.action === ReviewAction.CONFIRM || value.action === ReviewAction.CHANGE_IDENTITY) && !value.studentId) ctx.addIssue({ code: "custom", message: "studentId is required" }); });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(request, Role.TEACHER); if (!user) return unauthorized();
  const input = schema.safeParse(await request.json()); if (!input.success) return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  const { id } = await params;
  const detection = await db.faceDetection.findUnique({ where: { id }, include: { session: { include: { teacher: true, class: { include: { enrollments: true } } } } } });
  if (!detection || detection.session.teacher.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (detection.session.confirmedAt) return NextResponse.json({ error: "Session already confirmed" }, { status: 409 });
  if (input.data.studentId && !detection.session.class.enrollments.some((entry) => entry.studentId === input.data.studentId)) return NextResponse.json({ error: "Student is not enrolled in this class" }, { status: 400 });
  const duplicate = input.data.studentId ? await db.recognitionReview.findFirst({ where: { detection: { sessionId: detection.sessionId }, resolvedStudentId: input.data.studentId, NOT: { detectionId: id } } }) : null;
  if (duplicate) return NextResponse.json({ error: "Student is already assigned to another placeholder." }, { status: 409 });
  const status = input.data.action === ReviewAction.MARK_UNKNOWN ? RecognitionStatus.UNKNOWN : RecognitionStatus.MATCHED;
  const review = await db.$transaction(async (tx) => { await tx.faceDetection.update({ where: { id }, data: { status } }); const result = await tx.recognitionReview.upsert({ where: { detectionId: id }, update: { reviewerId: user.id, action: input.data.action, resolvedStudentId: input.data.studentId ?? null, note: input.data.note ?? null }, create: { detectionId: id, reviewerId: user.id, action: input.data.action, resolvedStudentId: input.data.studentId ?? null, note: input.data.note ?? null } }); await tx.attendanceAuditLog.create({ data: { sessionId: detection.sessionId, actorId: user.id, action: "DETECTION_REVIEWED", metadata: { detectionId: id, action: input.data.action, studentId: input.data.studentId ?? null } } }); return result; });
  return NextResponse.json({ review });
}
