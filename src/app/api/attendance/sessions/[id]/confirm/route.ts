import { AttendanceStatus, Role, SessionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { finalStatuses, hasDuplicateAssignments, unresolvedReviewCount } from "@/lib/attendance-workflow";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(request, Role.TEACHER); if (!user) return unauthorized();
  const { id } = await params;
  const session = await db.attendanceSession.findUnique({ where: { id }, include: { teacher: true, detections: { include: { review: true } }, class: { include: { enrollments: true } } } });
  if (!session || session.teacher.userId !== user.id) return NextResponse.json({ error: "Session unavailable" }, { status: 403 });
  if (session.status === SessionStatus.CONFIRMED) return NextResponse.json({ error: "Attendance is already confirmed" }, { status: 409 });
  const reviews = session.detections.map((detection) => detection.review ? { resolvedStudentId: detection.review.resolvedStudentId } : null);
  if (unresolvedReviewCount(reviews)) return NextResponse.json({ error: "Every placeholder must be assigned or marked unknown before confirmation." }, { status: 409 });
  if (hasDuplicateAssignments(reviews)) return NextResponse.json({ error: "A student cannot be assigned to more than one placeholder." }, { status: 409 });
  const statuses = finalStatuses(session.class.enrollments, reviews); const presentStudentIds = statuses.filter((entry) => entry.status === "PRESENT").map((entry) => entry.studentId);
  await db.$transaction(async (tx) => {
    for (const entry of statuses) await tx.attendanceRecord.upsert({ where: { sessionId_studentId: { sessionId: id, studentId: entry.studentId } }, update: { status: entry.status === "PRESENT" ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT, isManual: true }, create: { sessionId: id, studentId: entry.studentId, status: entry.status === "PRESENT" ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT, isManual: true } });
    await tx.attendanceSession.update({ where: { id }, data: { status: SessionStatus.CONFIRMED, confirmedAt: new Date() } });
    await tx.attendanceAuditLog.create({ data: { sessionId: id, actorId: user.id, action: "ATTENDANCE_CONFIRMED", metadata: { presentCount: presentStudentIds.length } } });
  });
  return NextResponse.json({ ok: true, presentCount: presentStudentIds.length, absentCount: session.class.enrollments.length - presentStudentIds.length });
}
