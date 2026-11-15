import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(request, Role.ADMIN, Role.TEACHER, Role.STUDENT); if (!user) return unauthorized();
  const { id } = await params;
  const session = await db.attendanceSession.findUnique({ where: { id }, include: { teacher: true, subject: true, class: { include: { enrollments: { include: { student: true } } } }, detections: { include: { review: true } }, records: { include: { student: true } } } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === Role.TEACHER && session.teacher.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (user.role === Role.STUDENT && !session.records.some((record) => record.student.userId === user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ session });
}
