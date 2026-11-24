import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { courses } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("POST /api/v1/courses", () => {
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

  it("should create a valid course and return 201 with courseId", async () => {
    const suffix = randomUUID().slice(0, 6);
    const payload = {
      name: `Sistemas para Internet ${suffix}`,
      workloadHours: 2400,
      durationSemesters: 5,
      modality: "online" as const,
      isActive: true,
    };

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/courses",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload,
    });

    const body = response.json();
    if (body.courseId) {
      createdCourseIds.push(body.courseId);
    }

    expect(response.statusCode).toBe(201);
    expect(body).toHaveProperty("courseId");
    expect(typeof body.courseId).toBe("string");

    const [saved] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, body.courseId));

    expect(saved).toBeDefined();
    expect(saved.name).toBe(payload.name);
    expect(saved.workloadHours).toBe(2400);
    expect(saved.durationSemesters).toBe(5);
    expect(saved.modality).toBe("online");
    expect(saved.isActive).toBe(true);
  });

  it("should return 400 when required fields or modality are invalid", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/courses",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        name: "",
        workloadHours: 0,
        durationSemesters: 0,
        modality: "invalid_modality",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const suffix = randomUUID().slice(0, 6);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/courses",
      payload: {
        name: `Curso Sem Token ${suffix}`,
        workloadHours: 1600,
        durationSemesters: 4,
        modality: "in_person",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});