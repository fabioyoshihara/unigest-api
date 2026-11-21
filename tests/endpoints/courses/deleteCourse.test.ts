import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../../src/index.ts";
import { db } from "../../../src/database/client.ts";
import { courses } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("DELETE /api/v1/courses/:id", () => {
  let auth: Awaited<ReturnType<typeof createAuthenticatedSession>>;
  const createdCourseIds: string[] = [];

  beforeAll(async () => {
    await server.ready();
    auth = await createAuthenticatedSession();
  });

  afterEach(async () => {
    while (createdCourseIds.length > 0) {
      const id = createdCourseIds.pop()!;
      await db.delete(courses).where(eq(courses.id, id));
    }
  });

  afterAll(async () => {
    await auth.cleanup();
    await server.close();
  });

  it("should logically deactivate a course and return 200", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [course] = await db
      .insert(courses)
      .values({
        name: `Curso Para Excluir ${suffix}`,
        workloadHours: 1600,
        durationSemesters: 4,
        modality: "hybrid",
      })
      .returning();

    createdCourseIds.push(course.id);

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/courses/${course.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      message: "Course successfully deactivated.",
      courseId: course.id,
    });

    const [updatedCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, course.id));

    expect(updatedCourse).toBeDefined();
    expect(updatedCourse.isActive).toBe(false);
  });

  it("should return 404 when course ID does not exist", async () => {
    const nonExistentId = randomUUID();

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/courses/${nonExistentId}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "Course not found.",
    });
  });

  it("should return 400 when ID parameter is not a valid UUID", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: "/api/v1/courses/uuid-invalido",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/courses/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
  });
});