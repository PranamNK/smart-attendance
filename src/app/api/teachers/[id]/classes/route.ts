import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const user = await requireRole(request, Role.ADMIN, Role.TEACHER); if (!user) return unauthorized(); const { id } = await params; const teacher = await db.teacher.findUnique({ where: { id }, include: { assignments: { include: { class: true, subject: true } } } }); if (!teacher) return NextResponse.json({ error: "Not found" }, { status: 404 }); if (user.role === Role.TEACHER && teacher.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 }); return NextResponse.json({ teacher, assignments: teacher.assignments }); }
