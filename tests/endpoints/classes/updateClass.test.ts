import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { classes } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";
import {
  createTestCourse,
  deleteTestCourse,
  createTestTeacher,
  deleteTestTeacher,
} from "../../helpers/factories.ts";

describe("PUT /api/v1/classes/:id", () => {
  let auth: Awaited<ReturnType<typeof createAuthenticatedSession>>;
  const createdClassIds: string[] = [];
  const createdTeacherIds: string[] = [];
  const createdCourseIds: string[] = [];

  beforeAll(async () => {
    await server.ready();
    auth = await createAuthenticatedSession();
  });

  afterEach(async () => {
    while (createdClassIds.length > 0) {
      const id = createdClassIds.pop()!;
      await db.delete(classes).where(eq(classes.id, id));
    }
    while (createdTeacherIds.length > 0) {
      await deleteTestTeacher(createdTeacherIds.pop()!);
    }
    while (createdCourseIds.length > 0) {
      await deleteTestCourse(createdCourseIds.pop()!);
    }
  });

  afterAll(async () => {
    await auth.cleanup();
    await server.close();
  });

  it("should replace class fields and set omitted teacherId to null", async () => {
    const suffix = randomUUID().slice(0, 6);
    const courseA = await createTestCourse(`${suffix}a`);
    const courseB = await createTestCourse(`${suffix}b`);
    const teacher = await createTestTeacher(suffix, "74");
    createdCourseIds.push(courseA.id, courseB.id);
    createdTeacherIds.push(teacher.id);

    const [inserted] = await db
      .insert(classes)
      .values({
        courseId: courseA.id,
        teacherId: teacher.id,
        description: `Turma Original ${suffix}`,
        semester: "1",
        year: 2026,
        scheduleTime: "19:00:00",
        room: `SalaA-${suffix}`,
      })
      .returning();

    createdClassIds.push(inserted.id);

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/classes/${inserted.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        courseId: courseB.id,
        description: `Turma Substituida ${suffix}`,
        semester: "2",
        year: 2027,
        scheduleTime: "20:30:00",
        room: `SalaB-${suffix}`,
        isActive: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Class updated" });

    const [updated] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, inserted.id));

    expect(updated.courseId).toBe(courseB.id);
    expect(updated.teacherId).toBeNull();
    expect(updated.description).toBe(`Turma Substituida ${suffix}`);
    expect(updated.semester).toBe("2");
    expect(updated.year).toBe(2027);
    expect(updated.scheduleTime).toBe("20:30:00");
    expect(updated.room).toBe(`SalaB-${suffix}`);
  });

  it("should return 400 when courseId or teacherId is invalid foreign key", async () => {
    const suffix = randomUUID().slice(0, 6);
    const course = await createTestCourse(suffix);
    createdCourseIds.push(course.id);

    const [inserted] = await db
      .insert(classes)
      .values({
        courseId: course.id,
        description: `Turma FK ${suffix}`,
        semester: "1",
        year: 2026,
        scheduleTime: "19:00:00",
        room: `Sala-${suffix}`,
      })
      .returning();

    createdClassIds.push(inserted.id);

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/classes/${inserted.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        courseId: randomUUID(),
        description: `Turma FK Falha ${suffix}`,
        semester: "1",
        year: 2026,
        scheduleTime: "19:00:00",
        room: `Sala-${suffix}`,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: "Invalid courseId or teacherId.",
    });
  });

  it("should return 404 when class ID does not exist", async () => {
    const suffix = randomUUID().slice(0, 6);
    const course = await createTestCourse(suffix);
    createdCourseIds.push(course.id);

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/classes/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        courseId: course.id,
        description: "Turma Inexistente",
        semester: "1",
        year: 2026,
        scheduleTime: "19:00:00",
        room: "Sala 99",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "Class not found, verify ID and try again",
    });
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/classes/${randomUUID()}`,
      payload: {
        courseId: randomUUID(),
        description: "Turma Sem Token",
        semester: "1",
        year: 2026,
        scheduleTime: "19:00:00",
        room: "Sala 101",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});