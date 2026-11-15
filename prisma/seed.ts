import bcrypt from "bcryptjs";
import { PrismaClient, AssignmentKind, AttendanceStatus, Role, SessionStatus } from "@prisma/client";

const prisma = new PrismaClient();
const students = [
  ["Demo Student 01", "DEMO2024CS001"], ["Demo Student 02", "DEMO2024CS002"],
  ["Demo Student 03", "DEMO2024CS003"], ["Demo Student 04", "DEMO2024CS004"],
  ["Demo Student 05", "DEMO2024CS005"], ["Demo Student 06", "DEMO2024CS006"],
  ["Demo Student 07", "DEMO2024CS007"], ["Demo Student 08", "DEMO2024CS008"],
  ["Demo Student 09", "DEMO2024CS009"], ["Demo Student 10", "DEMO2024CS010"],
  ["Demo Student 11", "DEMO2024CS011"], ["Demo Student 12", "DEMO2024CS012"]
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(process.env.DEV_SEED_PASSWORD ?? "ChangeMe!2026", 12);
  const department = await prisma.department.upsert({ where: { code: "CSE" }, update: { name: "Computer Science and Engineering" }, create: { code: "CSE", name: "Computer Science and Engineering" } });
  const semester = await prisma.semester.upsert({ where: { number: 4 }, update: {}, create: { number: 4 } });
  const section = await prisma.section.upsert({ where: { name: "B" }, update: {}, create: { name: "B" } });
  const classRoom = await prisma.class.upsert({ where: { identifier: "CSE-4B" }, update: { academicBatch: "2024", departmentId: department.id, semesterId: semester.id, sectionId: section.id }, create: { identifier: "CSE-4B", academicBatch: "2024", departmentId: department.id, semesterId: semester.id, sectionId: section.id } });
  const subject = await prisma.subject.upsert({ where: { code: "AIML-LAB" }, update: { name: "AIML Lab" }, create: { code: "AIML-LAB", name: "AIML Lab" } });
  await prisma.user.upsert({ where: { email: "admin@local.invalid" }, update: { role: Role.ADMIN }, create: { email: "admin@local.invalid", passwordHash, role: Role.ADMIN } });
  const teacherUser = await prisma.user.upsert({ where: { email: "teacher1@local.invalid" }, update: { role: Role.TEACHER }, create: { email: "teacher1@local.invalid", passwordHash, role: Role.TEACHER } });
  const teacher = await prisma.teacher.upsert({ where: { userId: teacherUser.id }, update: { displayName: "Teacher1", departmentId: department.id }, create: { userId: teacherUser.id, displayName: "Teacher1", departmentId: department.id } });
  await prisma.teacherAssignment.upsert({ where: { teacherId_classId_subjectId_kind: { teacherId: teacher.id, classId: classRoom.id, subjectId: subject.id, kind: AssignmentKind.SUBJECT_INSTRUCTOR } }, update: {}, create: { teacherId: teacher.id, classId: classRoom.id, subjectId: subject.id, kind: AssignmentKind.SUBJECT_INSTRUCTOR } });
  // Class-teacher rows use the same subject solely to satisfy the nullable unique key consistently.
  await prisma.teacherAssignment.upsert({ where: { teacherId_classId_subjectId_kind: { teacherId: teacher.id, classId: classRoom.id, subjectId: subject.id, kind: AssignmentKind.CLASS_TEACHER } }, update: {}, create: { teacherId: teacher.id, classId: classRoom.id, subjectId: subject.id, kind: AssignmentKind.CLASS_TEACHER } });
  const seededStudents = [];
  for (const [fullName, usn] of students) {
    const email = `${usn.toLowerCase()}@local.invalid`;
    const user = await prisma.user.upsert({ where: { email }, update: { role: Role.STUDENT }, create: { email, passwordHash, role: Role.STUDENT } });
    const student = await prisma.student.upsert({ where: { usn }, update: { fullName, userId: user.id, departmentId: department.id }, create: { fullName, usn, userId: user.id, departmentId: department.id } });
    await prisma.classEnrollment.upsert({ where: { classId_studentId: { classId: classRoom.id, studentId: student.id } }, update: { labBatch: "B2 BATCH" }, create: { classId: classRoom.id, studentId: student.id, labBatch: "B2 BATCH" } });
    await prisma.studentFaceProfile.upsert({ where: { studentId: student.id }, update: {}, create: { studentId: student.id, status: "NOT_ENROLLED" } });
    seededStudents.push(student);
  }
  const heldAt = new Date("2026-11-03T09:00:00.000Z");
  const session = await prisma.attendanceSession.upsert({ where: { classId_subjectId_heldAt_slot: { classId: classRoom.id, subjectId: subject.id, heldAt, slot: "Lab 1" } }, update: {}, create: { classId: classRoom.id, subjectId: subject.id, teacherId: teacher.id, heldAt, slot: "Lab 1", status: SessionStatus.CONFIRMED, confirmedAt: heldAt } });
  for (const student of seededStudents) await prisma.attendanceRecord.upsert({ where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } }, update: {}, create: { sessionId: session.id, studentId: student.id, status: AttendanceStatus.PRESENT } });
  console.info(`Seeded CSE-4B: ${seededStudents.length} students. Development password is set through DEV_SEED_PASSWORD.`);
}
main().finally(() => prisma.$disconnect());
