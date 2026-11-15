import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await requireRole(request, Role.TEACHER); if (!user) return unauthorized();
  const teacher = await db.teacher.findUnique({ where: { userId: user.id } }); if (!teacher) return NextResponse.json({ error: "Teacher profile missing" }, { status: 404 });
  const assignments = await db.teacherAssignment.findMany({ where: { teacherId: teacher.id }, include: { class: true, subject: true } });
  return NextResponse.json({ assignments });
}
