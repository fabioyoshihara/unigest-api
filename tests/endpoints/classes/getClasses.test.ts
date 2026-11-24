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

describe("GET /api/v1/classes", () => {
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

  it("should return 200 and list both active and inactive classes", async () => {
    const suffix = randomUUID().slice(0, 6);
    const course = await createTestCourse(suffix);
    const teacher = await createTestTeacher(suffix, "72");
    createdCourseIds.push(course.id);
    createdTeacherIds.push(teacher.id);

    const [activeClass] = await db
      .insert(classes)
      .values({
        courseId: course.id,
        teacherId: teacher.id,
        description: `Turma Ativa ${suffix}`,
        semester: "1",
        year: 2026,
        scheduleTime: "19:00:00",
        room: `A-${suffix}`,
        isActive: true,
      })
      .returning();

    const [inactiveClass] = await db
      .insert(classes)
      .values({
        courseId: course.id,
        teacherId: null,
        description: `Turma Inativa ${suffix}`,
        semester: "2",
        year: 2026,
        scheduleTime: "21:00:00",
        room: `B-${suffix}`,
        isActive: false,
      })
      .returning();

    createdClassIds.push(activeClass.id, inactiveClass.id);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/classes",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    const body = response.json() as Array<Record<string, unknown>>;

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(body)).toBe(true);

    const foundActive = body.find((c) => c.id === activeClass.id);
    const foundInactive = body.find((c) => c.id === inactiveClass.id);

    expect(foundActive).toMatchObject({
      id: activeClass.id,
      courseId: course.id,
      teacherId: teacher.id,
      description: activeClass.description,
      semester: "1",
      year: 2026,
      isActive: true,
    });
    expect(typeof foundActive?.createdAt).toBe("string");
    expect(typeof foundActive?.updatedAt).toBe("string");

    expect(foundInactive).toMatchObject({
      id: inactiveClass.id,
      teacherId: null,
      isActive: false,
    });
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/classes",
    });

    expect(response.statusCode).toBe(401);
  });
});