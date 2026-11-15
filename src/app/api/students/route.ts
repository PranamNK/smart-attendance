import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
export async function GET(request:NextRequest){const user=await requireRole(request,Role.ADMIN,Role.TEACHER);if(!user)return unauthorized();const students=await db.student.findMany({include:{faceProfile:true,enrollments:{include:{class:true}}},orderBy:{fullName:"asc"}});return NextResponse.json({students});}
