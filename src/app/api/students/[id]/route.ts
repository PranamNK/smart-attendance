import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){const user=await requireRole(request,Role.ADMIN,Role.TEACHER,Role.STUDENT);if(!user)return unauthorized();const {id}=await params;const student=await db.student.findUnique({where:{id},include:{enrollments:true,records:true}});if(!student)return NextResponse.json({error:"Not found"},{status:404});if(user.role===Role.STUDENT&&student.userId!==user.id)return NextResponse.json({error:"Forbidden"},{status:403});return NextResponse.json({student});}
const patchSchema=z.object({fullName:z.string().min(1).optional(),usn:z.string().min(1).optional()}).strict();
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){const user=await requireRole(request,Role.ADMIN);if(!user)return unauthorized();const body=patchSchema.safeParse(await request.json());if(!body.success)return NextResponse.json({error:"Invalid update"},{status:400});const {id}=await params;const before=await db.student.findUnique({where:{id}});if(!before)return NextResponse.json({error:"Not found"},{status:404});const student=await db.student.update({where:{id},data:body.data});await db.attendanceAuditLog.create({data:{actorId:user.id,action:"STUDENT_UPDATED",metadata:{studentId:id,previous:{fullName:before.fullName,usn:before.usn},changed:body.data}}});return NextResponse.json({student});}
