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

describe("PATCH /api/v1/classes/:id", () => {
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

  it("should update only sent fields and unassign teacher when teacherId is null", async () => {
    const suffix = randomUUID().slice(0, 6);
    const course = await createTestCourse(suffix);
    const teacher = await createTestTeacher(suffix, "75");
    createdCourseIds.push(course.id);
    createdTeacherIds.push(teacher.id);

    const [inserted] = await db
      .insert(classes)
      .values({
        courseId: course.id,
        teacherId: teacher.id,
        description: `Turma Parcial ${suffix}`,
        semester: "1",
        year: 2026,
        scheduleTime: "19:00:00",
        room: `Sala1-${suffix}`,
      })
      .returning();

    createdClassIds.push(inserted.id);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/classes/${inserted.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        teacherId: null,
        room: `LabNova-${suffix}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Class updated" });

    const [updated] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, inserted.id));

    expect(updated.teacherId).toBeNull();
    expect(updated.room).toBe(`LabNova-${suffix}`);
    expect(updated.courseId).toBe(course.id);
    expect(updated.description).toBe(inserted.description);
    expect(updated.year).toBe(2026);
  });

  it("should return 400 when body is empty", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/classes/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 when teacherId references a non-existent teacher", async () => {
    const suffix = randomUUID().slice(0, 6);
    const course = await createTestCourse(suffix);
    createdCourseIds.push(course.id);

    const [inserted] = await db
      .insert(classes)
      .values({
        courseId: course.id,
        description: `Turma Patch FK ${suffix}`,
        semester: "1",
        year: 2026,
        scheduleTime: "19:00:00",
        room: `Sala-${suffix}`,
      })
      .returning();

    createdClassIds.push(inserted.id);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/classes/${inserted.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        teacherId: randomUUID(),
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: "Invalid courseId or teacherId.",
    });
  });

  it("should return 404 when class ID does not exist", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/classes/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        room: "Sala 404",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/classes/${randomUUID()}`,
      payload: {
        room: "Sala 401",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});