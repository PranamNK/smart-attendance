import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized } from "@/lib/auth";
export async function GET(request:NextRequest){const user=await getSession(request);return user?NextResponse.json({user}):unauthorized();}
