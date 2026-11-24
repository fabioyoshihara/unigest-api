import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { courses } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("PATCH /api/v1/courses/:id", () => {
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

  it("should update only sent fields and preserve the rest", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [inserted] = await db
      .insert(courses)
      .values({
        name: `Curso Parcial ${suffix}`,
        workloadHours: 2000,
        durationSemesters: 5,
        modality: "in_person",
        isActive: false,
      })
      .returning();

    createdCourseIds.push(inserted.id);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/courses/${inserted.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        workloadHours: 2400,
        isActive: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Course updated" });

    const [updated] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, inserted.id));

    expect(updated.workloadHours).toBe(2400);
    expect(updated.isActive).toBe(true);
    expect(updated.name).toBe(inserted.name);
    expect(updated.durationSemesters).toBe(5);
    expect(updated.modality).toBe("in_person");
  });

  it("should return 400 when body is empty", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/courses/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 404 when course ID does not exist", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/courses/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        workloadHours: 1800,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/courses/${randomUUID()}`,
      payload: {
        workloadHours: 1800,
      },
    });

    expect(response.statusCode).toBe(401);
  });
});