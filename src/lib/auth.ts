import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
const key = new TextEncoder().encode(process.env.JWT_SECRET ?? "development-only-secret-change-me");
export type SessionUser = { id: string; role: Role; email: string };
export async function signSession(user: SessionUser) { return new SignJWT(user).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(key); }
export async function getSession(request: NextRequest): Promise<SessionUser | null> { const token = request.cookies.get("attendance_session")?.value; if (!token) return null; try { return (await jwtVerify(token, key)).payload as unknown as SessionUser; } catch { return null; } }
export function unauthorized() { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }
export async function requireRole(request: NextRequest, ...roles: Role[]) { const user = await getSession(request); return user && roles.includes(user.role) ? user : null; }
