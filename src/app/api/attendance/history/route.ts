import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await requireRole(request, Role.ADMIN, Role.TEACHER, Role.STUDENT); if (!user) return unauthorized();
  if (user.role === Role.STUDENT) {
    const student = await db.student.findUnique({ where: { userId: user.id } }); if (!student) return NextResponse.json({ error: "Student profile missing" }, { status: 404 });
    const records = await db.attendanceRecord.findMany({ where: { studentId: student.id, session: { status: "CONFIRMED" } }, include: { session: { include: { subject: true, class: true } } }, orderBy: { session: { heldAt: "desc" } } });
    return NextResponse.json({ records });
  }
  const where = user.role === Role.TEACHER ? { teacher: { userId: user.id } } : {};
  const sessions = await db.attendanceSession.findMany({ where, include: { subject: true, class: true, records: true }, orderBy: { heldAt: "desc" } });
  return NextResponse.json({ sessions });
}
