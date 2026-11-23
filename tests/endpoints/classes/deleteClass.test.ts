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
} from "../../helpers/factories.ts";

describe("DELETE /api/v1/classes/:id", () => {
  let auth: Awaited<ReturnType<typeof createAuthenticatedSession>>;
  const createdClassIds: string[] = [];
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
    while (createdCourseIds.length > 0) {
      await deleteTestCourse(createdCourseIds.pop()!);
    }
  });

  afterAll(async () => {
    await auth.cleanup();
    await server.close();
  });

  it("should logically deactivate an active class and return 200", async () => {
    const suffix = randomUUID().slice(0, 6);
    const course = await createTestCourse(suffix);
    createdCourseIds.push(course.id);

    const [inserted] = await db
      .insert(classes)
      .values({
        courseId: course.id,
        description: `Turma Excluir ${suffix}`,
        semester: "1",
        year: 2026,
        scheduleTime: "19:00:00",
        room: `SalaDel-${suffix}`,
        isActive: true,
      })
      .returning();

    createdClassIds.push(inserted.id);

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/classes/${inserted.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Class deleted" });

    const [updated] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, inserted.id));

    expect(updated).toBeDefined();
    expect(updated.isActive).toBe(false);
  });

  it("should return 404 when class is already inactive or does not exist", async () => {
    const suffix = randomUUID().slice(0, 6);
    const course = await createTestCourse(suffix);
    createdCourseIds.push(course.id);

    const [inactiveClass] = await db
      .insert(classes)
      .values({
        courseId: course.id,
        description: `Turma Ja Inativa ${suffix}`,
        semester: "2",
        year: 2026,
        scheduleTime: "21:00:00",
        room: `SalaIna-${suffix}`,
        isActive: false,
      })
      .returning();

    createdClassIds.push(inactiveClass.id);

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/classes/${inactiveClass.id}`,
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
      method: "DELETE",
      url: "/api/v1/classes/id-invalido",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/classes/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
  });
});