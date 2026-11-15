import { Role } from "@prisma/client";
import { NextRequest,NextResponse } from "next/server";
import { db } from "@/lib/db";import {requireRole,unauthorized} from "@/lib/auth";
export async function GET(request:NextRequest){const u=await requireRole(request,Role.ADMIN,Role.TEACHER);if(!u)return unauthorized();return NextResponse.json({classes:await db.class.findMany({include:{department:true,semester:true,section:true}})});}
