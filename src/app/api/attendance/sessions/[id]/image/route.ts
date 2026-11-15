import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Role, SessionStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 10 * 1024 * 1024;
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(request, Role.TEACHER); if (!user) return unauthorized();
  const { id } = await params; const session = await db.attendanceSession.findUnique({ where: { id }, include: { teacher: true } });
  if (!session || session.teacher.userId !== user.id || session.status === SessionStatus.CONFIRMED) return NextResponse.json({ error: "Session unavailable" }, { status: 403 });
  const form = await request.formData(); const file = form.get("image");
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size > maxBytes) return NextResponse.json({ error: "Use JPEG, PNG, or WebP up to 10 MB." }, { status: 400 });
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const directory = path.join(process.cwd(), "private-uploads", "attendance"); await mkdir(directory, { recursive: true });
  const filename = `${id}-${randomUUID()}.${extension}`; await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  const imageRef = `private://attendance/${filename}`; const expiresAt = new Date(Date.now() + Number(process.env.FACE_IMAGE_RETENTION_DAYS ?? 30) * 86400000);
  await db.attendanceSession.update({ where: { id }, data: { imageRef, imageExpiresAt: expiresAt } });
  return NextResponse.json({ imageRef, expiresAt });
}
