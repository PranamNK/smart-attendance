import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(request, Role.ADMIN, Role.TEACHER); if (!user) return unauthorized();
  const { id } = await params;
  const classRoom = await db.class.findUnique({ where: { id }, include: { department: true, semester: true, section: true, enrollments: true, assignments: { include: { teacher: true, subject: true } } } });
  if (!classRoom) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === Role.TEACHER && !classRoom.assignments.some((assignment) => assignment.teacher.userId === user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ class: classRoom });
}
