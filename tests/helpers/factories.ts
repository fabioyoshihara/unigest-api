import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../src/database/client.ts";
import { courses, teachers } from "../../src/database/schema.ts";

export async function createTestCourse(suffix = randomUUID().slice(0, 6)) {
  const [course] = await db
    .insert(courses)
    .values({
      name: `Curso Teste Turma ${suffix}`,
      workloadHours: 2000,
      durationSemesters: 5,
      modality: "in_person",
      isActive: true,
    })
    .returning();

  return course;
}

export async function deleteTestCourse(courseId: string) {
  await db.delete(courses).where(eq(courses.id, courseId));
}

export async function createTestTeacher(
  suffix = randomUUID().slice(0, 6),
  digit = "77",
) {
  const numeric = String(Math.floor(100000000 + Math.random() * 900000000));
  const [teacher] = await db
    .insert(teachers)
    .values({
      name: `Prof. Teste Turma ${suffix}`,
      cpf: `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-${digit}`,
      email: `prof.turma.${suffix}@docente.test`,
      phone: "(11) 97000-0000",
      address: "Rua Vergueiro, 1000 - São Paulo, SP",
      employeeNumber: `TRM${suffix.toUpperCase()}`,
      degreeLevel: "master",
      isActive: true,
    })
    .returning();

  return teacher;
}

export async function deleteTestTeacher(teacherId: string) {
  await db.delete(teachers).where(eq(teachers.id, teacherId));
}