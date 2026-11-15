import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { signSession } from "@/lib/auth";
const bodySchema=z.object({email:z.string().email(),password:z.string().min(1)});
export async function POST(request:NextRequest){const parsed=bodySchema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid credentials"},{status:400});const user=await db.user.findUnique({where:{email:parsed.data.email}});if(!user||!(await bcrypt.compare(parsed.data.password,user.passwordHash)))return NextResponse.json({error:"Invalid email or password"},{status:401});const token=await signSession({id:user.id,email:user.email,role:user.role});const response=NextResponse.json({user:{email:user.email,role:user.role}});response.cookies.set("attendance_session",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*8});return response;}
