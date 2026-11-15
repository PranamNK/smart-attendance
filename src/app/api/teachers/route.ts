import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
export async function GET(request: NextRequest) { const user = await requireRole(request, Role.ADMIN); if (!user) return unauthorized(); return NextResponse.json({ teachers: await db.teacher.findMany({ include: { assignments: true }, orderBy: { displayName: "asc" } }) }); }
