import { Role } from "@prisma/client";
import { NextRequest,NextResponse } from "next/server";
import { db } from "@/lib/db";import {requireRole,unauthorized} from "@/lib/auth";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){const u=await requireRole(request,Role.ADMIN,Role.TEACHER);if(!u)return unauthorized();const {id}=await params;const students=await db.classEnrollment.findMany({where:{classId:id},include:{student:{include:{faceProfile:true}}}});return NextResponse.json({students});}
