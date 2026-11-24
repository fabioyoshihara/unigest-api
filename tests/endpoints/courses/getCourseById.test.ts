import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { courses } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("GET /api/v1/courses/:courseId", () => {
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

  it("should return 200 and course details when active course exists", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [inserted] = await db
      .insert(courses)
      .values({
        name: `Arquitetura de Software ${suffix}`,
        workloadHours: 2400,
        durationSemesters: 6,
        modality: "hybrid",
        isActive: true,
      })
      .returning();

    createdCourseIds.push(inserted.id);

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/courses/${inserted.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toHaveProperty("course");
    expect(body.course).toMatchObject({
      id: inserted.id,
      name: inserted.name,
      workloadHours: 2400,
      durationSemesters: 6,
      modality: "hybrid",
      isActive: true,
    });
  });

  it("should return 404 when course is inactive", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [inactiveCourse] = await db
      .insert(courses)
      .values({
        name: `Curso Inativo ${suffix}`,
        workloadHours: 1600,
        durationSemesters: 4,
        modality: "online",
        isActive: false,
      })
      .returning();

    createdCourseIds.push(inactiveCourse.id);

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/courses/${inactiveCourse.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "Course not found.",
    });
  });

  it("should return 404 when course ID does not exist", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/courses/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 400 when courseId parameter is not a valid UUID", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/courses/id-invalido",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/courses/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
  });
});