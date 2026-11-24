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

describe("GET /api/v1/classes/:id", () => {
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

  it("should return 200 and class details when valid UUID exists", async () => {
    const suffix = randomUUID().slice(0, 6);
    const course = await createTestCourse(suffix);
    const teacher = await createTestTeacher(suffix, "73");
    createdCourseIds.push(course.id);
    createdTeacherIds.push(teacher.id);

    const [inserted] = await db
      .insert(classes)
      .values({
        courseId: course.id,
        teacherId: teacher.id,
        description: `Turma Detalhe ${suffix}`,
        semester: "1",
        year: 2026,
        scheduleTime: "10:00:00",
        room: `Lab-${suffix}`,
        isActive: true,
      })
      .returning();

    createdClassIds.push(inserted.id);

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/classes/${inserted.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      id: inserted.id,
      courseId: course.id,
      teacherId: teacher.id,
      description: inserted.description,
      semester: "1",
      year: 2026,
      scheduleTime: "10:00:00",
      room: `Lab-${suffix}`,
      isActive: true,
    });
    expect(typeof body.createdAt).toBe("string");
    expect(typeof body.updatedAt).toBe("string");
  });

  it("should return 404 when class ID does not exist", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/classes/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "Class not found, verify ID and try again",
    });
  });

  it("should return 400 when ID parameter is not a valid UUID", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/classes/id-invalido",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/classes/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
  });
});